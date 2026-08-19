-- ---------------------------------------------------------------------------
-- is_admin(): stable helper to avoid per-row subqueries in policies/triggers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user(): copy auth.users data into profiles on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger listings_set_updated_at
  before update on listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Snap public coords to a ~100m grid at write time (never at read time)
-- ---------------------------------------------------------------------------
create or replace function public.snap_public_coords()
returns trigger
language plpgsql
as $$
begin
  new.public_lat := round(st_y(new.location::geometry)::numeric, 3);
  new.public_lng := round(st_x(new.location::geometry)::numeric, 3);
  return new;
end;
$$;

create trigger listings_snap_public_coords
  before insert or update of location on listings
  for each row execute function public.snap_public_coords();

-- ---------------------------------------------------------------------------
-- Prevent privilege escalation: only admins may change is_admin
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_admin_flag()
returns trigger
language plpgsql
as $$
begin
  -- auth.uid() is null for trusted contexts (service role, seeds, SQL console)
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'not_allowed';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_flag
  before update on profiles
  for each row execute function public.guard_profile_admin_flag();

-- ---------------------------------------------------------------------------
-- Listing transition enforcement for owners (admins bypass).
--  - Owner editing an approved listing  => back to pending (+ 'edited' event)
--  - Owner status changes are restricted to a small allowlist (+ events)
--  - Owners can never touch moderation/counter fields
-- ---------------------------------------------------------------------------
create or replace function public.enforce_listing_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  content_changed boolean;
begin
  -- Internal security-definer functions (view counter, expiry) bypass the guard
  if current_setting('mylloguer.internal', true) = '1' then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- Owners may not reassign or touch counters/moderation fields
  new.owner_id := old.owner_id;
  new.views_count := old.views_count;
  new.approved_at := old.approved_at;
  new.expires_at := old.expires_at;
  new.published_version := old.published_version;

  content_changed :=
       new.type is distinct from old.type
    or new.price is distinct from old.price
    or new.location is distinct from old.location
    or new.description is distinct from old.description
    or new.photos is distinct from old.photos
    or new.flatmates is distinct from old.flatmates
    or new.preferred_gender is distinct from old.preferred_gender
    or new.available_from is distinct from old.available_from
    or new.bills_included is distinct from old.bills_included
    or new.deposit is distinct from old.deposit
    or new.room_type is distinct from old.room_type
    or new.pets is distinct from old.pets
    or new.smokers is distinct from old.smokers
    or new.tenant_pref is distinct from old.tenant_pref
    or new.contact_external is distinct from old.contact_external
    or new.contact_whatsapp is distinct from old.contact_whatsapp
    or new.bathrooms is distinct from old.bathrooms
    or new.bedrooms is distinct from old.bedrooms
    or new.municipality is distinct from old.municipality
    or new.neighborhood is distinct from old.neighborhood;

  if new.status is distinct from old.status then
    -- Allowlisted owner transitions
    if old.status = 'approved' and new.status = 'draft' then
      insert into moderation_events (listing_id, actor_id, action)
      values (old.id, auth.uid(), 'deactivated');
    elsif old.status in ('draft', 'rejected', 'expired') and new.status = 'pending' then
      new.published_version := old.published_version + 1;
      insert into moderation_events (listing_id, actor_id, action)
      values (old.id, auth.uid(), 'republished');
    elsif old.status in ('pending', 'draft') and new.status = 'pending' then
      null; -- no-op resubmit while already pending
    elsif new.status = 'deleted' and old.status <> 'deleted' then
      new.deleted_at := now();
      insert into moderation_events (listing_id, actor_id, action)
      values (old.id, auth.uid(), 'deleted');
    else
      raise exception 'invalid_status_transition';
    end if;
  elsif old.status = 'approved' and content_changed then
    -- Editing a live listing sends it back to moderation
    new.status := 'pending';
    new.approved_at := null;
    new.expires_at := null;
    new.published_version := old.published_version + 1;
    insert into moderation_events (listing_id, actor_id, action)
    values (old.id, auth.uid(), 'edited');
  end if;

  return new;
end;
$$;

create trigger listings_enforce_transitions
  before update on listings
  for each row execute function public.enforce_listing_transitions();

-- ---------------------------------------------------------------------------
-- View counting with per-day dedupe. Callable by anon; rate-limited upstream.
-- ---------------------------------------------------------------------------
create or replace function public.increment_listing_view(p_listing_id uuid, p_viewer_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into listing_views (listing_id, viewer_hash)
  values (p_listing_id, p_viewer_hash)
  on conflict (listing_id, viewer_hash) do nothing;

  if found then
    perform set_config('mylloguer.internal', '1', true);
    update listings set views_count = views_count + 1 where id = p_listing_id;
  end if;
end;
$$;

grant execute on function public.increment_listing_view(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Expiry: approved => expired once expires_at passes. Run by cron and/or lazily.
-- ---------------------------------------------------------------------------
create or replace function public.expire_listings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  perform set_config('mylloguer.internal', '1', true);
  update listings
  set status = 'expired'
  where status = 'approved' and expires_at is not null and expires_at < now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
