alter table profiles enable row level security;
alter table listings enable row level security;
alter table moderation_events enable row level security;
alter table listing_views enable row level security;
alter table neighborhoods enable row level security;

-- profiles: self + admin only. Public display data goes through public_profiles view.
create policy profiles_select on profiles
  for select using (auth.uid() = id or public.is_admin());

create policy profiles_update on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- listings: owner (all statuses) + admin. Public reads go through public_listings view.
create policy listings_select on listings
  for select using (auth.uid() = owner_id or public.is_admin());

create policy listings_insert on listings
  for insert with check (auth.uid() = owner_id and status in ('pending', 'draft'));

create policy listings_update on listings
  for update using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

-- No delete policy: soft-delete only (status = 'deleted').

-- moderation_events: listing owner sees own listing history; admin sees all.
create policy moderation_events_select on moderation_events
  for select using (
    public.is_admin()
    or exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

create policy moderation_events_insert on moderation_events
  for insert with check (
    actor_id = auth.uid()
    and (
      public.is_admin()
      or exists (select 1 from listings l where l.id = listing_id and l.owner_id = auth.uid())
    )
  );

-- listing_views: admin read only. Writes only via increment_listing_view() (security definer).
create policy listing_views_select on listing_views
  for select using (public.is_admin());

-- neighborhoods: public lookup table.
create policy neighborhoods_select on neighborhoods
  for select using (true);
