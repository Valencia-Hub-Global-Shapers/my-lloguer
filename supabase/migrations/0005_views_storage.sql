-- ---------------------------------------------------------------------------
-- Public-safe views (security definer: expose only safe columns, bypass RLS
-- intentionally). Exact location is NEVER included.
-- ---------------------------------------------------------------------------
create or replace view public.public_listings
with (security_invoker = false) as
select
  id,
  type,
  status,
  price,
  neighborhood,
  municipality,
  public_lat,
  public_lng,
  flatmates,
  preferred_gender,
  description,
  available_from,
  bills_included,
  deposit,
  room_type,
  pets,
  smokers,
  tenant_pref,
  contact_external,
  contact_whatsapp,
  bathrooms,
  bedrooms,
  views_count,
  photos,
  publisher_kind,
  agency_label,
  owner_id,
  published_version,
  created_at
from listings
where status = 'approved' and (expires_at is null or expires_at > now());

create or replace view public.public_profiles
with (security_invoker = false) as
select id, full_name, avatar_url
from profiles;

grant select on public.public_listings to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: listing-photos bucket. Public read; owner-scoped writes by folder
-- prefix: listing-photos/<owner_id>/<listing_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy listing_photos_public_read on storage.objects
  for select using (bucket_id = 'listing-photos');

create policy listing_photos_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'listing-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy listing_photos_owner_update on storage.objects
  for update using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy listing_photos_owner_delete on storage.objects
  for delete using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
