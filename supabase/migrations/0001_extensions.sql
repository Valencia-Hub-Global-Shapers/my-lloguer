create extension if not exists postgis;
create extension if not exists pgcrypto;

-- pg_cron is optional locally; expiry also runs lazily via public read filters.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron extension not available, skipping';
end $$;
