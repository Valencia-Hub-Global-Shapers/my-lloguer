-- Table-level privileges for API roles. Row access is still governed by RLS.
grant usage on schema public to anon, authenticated;

grant select on neighborhoods to anon, authenticated;

grant select, insert, update on listings to authenticated;
grant select, update on profiles to authenticated;
grant select, insert on moderation_events to authenticated;
grant select on listing_views to authenticated;
