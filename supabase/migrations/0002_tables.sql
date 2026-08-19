-- Enums
create type listing_type as enum ('room', 'full_flat');
create type listing_status as enum ('draft', 'pending', 'approved', 'rejected', 'expired', 'deleted');
create type gender_pref as enum ('any', 'female', 'male', 'non_binary');
create type room_type as enum ('single', 'double', 'shared');
create type tenant_pref as enum ('any', 'students', 'workers');
create type moderation_action as enum ('submitted', 'approved', 'rejected', 'edited', 'deactivated', 'deleted', 'republished');

-- Profiles (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  role_hint text check (role_hint in ('publisher', 'seeker')),
  created_at timestamptz not null default now()
);

-- Listings
create table listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  type listing_type not null,
  status listing_status not null default 'pending',
  price int not null check (price > 0),
  neighborhood text,
  municipality text not null default 'València',
  -- Exact point. NEVER exposed via public views/API.
  location geography(Point, 4326) not null,
  -- Truncated to ~100m grid at write time (trigger). Safe to expose.
  public_lat numeric(7, 4) not null,
  public_lng numeric(7, 4) not null,
  flatmates int check (flatmates >= 0),
  preferred_gender gender_pref not null default 'any',
  description text not null default '',
  available_from date,
  bills_included boolean not null default false,
  deposit int check (deposit >= 0),
  room_type room_type,
  pets boolean not null default false,
  smokers boolean not null default false,
  tenant_pref tenant_pref not null default 'any',
  contact_external text,
  contact_whatsapp text,
  bathrooms int check (bathrooms >= 0),
  bedrooms int check (bedrooms >= 0),
  views_count int not null default 0,
  photos text[] not null default '{}',
  publisher_kind text not null default 'private' check (publisher_kind in ('private', 'agency')),
  agency_label text,
  expires_at timestamptz,
  approved_at timestamptz,
  published_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint listings_contact_required check (contact_whatsapp is not null or contact_external is not null),
  constraint listings_bedrooms_required_for_flat check (type = 'room' or bedrooms is not null),
  constraint listings_room_type_required_for_room check (type = 'full_flat' or room_type is not null)
);

create index listings_public_idx on listings (status, expires_at) where status = 'approved';
create index listings_location_gix on listings using gist (location);
create index listings_owner_idx on listings (owner_id, status);

-- Moderation history (append-only)
create table moderation_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  actor_id uuid not null references profiles (id),
  action moderation_action not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint moderation_events_reject_comment check (action <> 'rejected' or comment is not null)
);

create index moderation_events_listing_idx on moderation_events (listing_id, created_at desc);

-- Raw view events, deduped per viewer/day via viewer_hash
create table listing_views (
  id bigint generated always as identity primary key,
  listing_id uuid not null references listings (id) on delete cascade,
  viewer_hash text not null,
  created_at timestamptz not null default now()
);

create unique index listing_views_dedupe_idx on listing_views (listing_id, viewer_hash);

-- Neighborhood lookup (seeded)
create table neighborhoods (
  id bigint generated always as identity primary key,
  name_es text not null,
  name_ca text not null,
  name_en text not null,
  slug text not null unique,
  center geography(Point, 4326) not null,
  lat numeric generated always as (st_y(center::geometry)) stored,
  lng numeric generated always as (st_x(center::geometry)) stored,
  municipality text not null
);

create index neighborhoods_center_gix on neighborhoods using gist (center);
