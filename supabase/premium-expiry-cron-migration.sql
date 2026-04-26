-- ════════════════════════════════════════════════════════════════════════════
-- Premium subscription expiry sweep
--
-- Mirrors expire_stale_swap_proposals — when premium_expires_at passes,
-- the user's premium_tier is flipped back to 'free' and the corresponding
-- premium_subscriptions row is marked 'cancelled'. Runs nightly at 03:15
-- UTC (15 min after the swap-expiry sweep so they don't both wake up at
-- the same minute).
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.expire_lapsed_premium_tiers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  -- Mark the subscription rows as cancelled when their period_end has passed.
  UPDATE premium_subscriptions
  SET status = 'cancelled'
  WHERE status = 'active' AND period_end < NOW();

  -- Flip the profile back to free if no still-active subscription remains.
  WITH demoted AS (
    UPDATE profiles
    SET premium_tier = 'free'
    WHERE premium_tier = 'premium'
      AND (premium_expires_at IS NULL OR premium_expires_at < NOW())
    RETURNING 1
  )
  SELECT COUNT(*) INTO affected FROM demoted;
  RETURN affected;
END;
$$;

DO $$ BEGIN
  PERFORM cron.unschedule('expire-lapsed-premium');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'expire-lapsed-premium',
  '15 3 * * *',
  $$SELECT expire_lapsed_premium_tiers();$$
);
