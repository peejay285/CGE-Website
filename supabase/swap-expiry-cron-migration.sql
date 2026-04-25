-- ════════════════════════════════════════════════════════════════════════════
-- Schedule the swap-expiry sweep with pg_cron
--
-- The expire_stale_swap_proposals() function (defined in the Tier 3
-- migration) marks any non-terminal proposal whose expires_at has passed
-- as 'expired'. This file enables pg_cron and schedules the sweep nightly
-- at 03:00 UTC.
--
-- Notes:
--   - pg_cron has to be enabled at the Supabase project level. On the
--     free tier you may need to flip it on under
--     Database → Extensions → pg_cron in the dashboard before this
--     migration will succeed.
--   - The schedule key 'expire-stale-swaps' is unique. Re-running this
--     file is safe (the cron.unschedule call is wrapped to ignore the
--     'job not found' case).
--   - To verify the schedule, run:
--       SELECT * FROM cron.job WHERE jobname = 'expire-stale-swaps';
--   - To run it on demand:
--       SELECT expire_stale_swap_proposals();
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop the existing schedule if present, so this file is idempotent.
DO $$ BEGIN
  PERFORM cron.unschedule('expire-stale-swaps');
EXCEPTION WHEN OTHERS THEN
  -- 'job not found' or any other error — safe to ignore on first run.
  NULL;
END $$;

SELECT cron.schedule(
  'expire-stale-swaps',
  '0 3 * * *',  -- nightly at 03:00 UTC
  $$SELECT expire_stale_swap_proposals();$$
);
