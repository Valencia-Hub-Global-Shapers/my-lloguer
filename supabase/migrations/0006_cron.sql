-- Hourly expiry job. Skipped silently when pg_cron is unavailable (local dev).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('expire-listings-hourly', '0 * * * *', 'select public.expire_listings()');
  end if;
exception when others then
  raise notice 'could not schedule expiry cron: %', sqlerrm;
end $$;
