-- ════════════════════════════════════════════════════════════════════════════
-- Swap Matches — swap_for_tags baseline + indexes
--
-- Supports hooks/use-swap-matches.ts ("people who want what you have"):
--   SELECT ... FROM marketplace_listings
--   WHERE status = 'active'
--     AND user_id != :me
--     AND listing_type IN ('swap', 'sell_or_swap')
--     AND swap_for_tags IS NOT NULL AND swap_for_tags != '{}'
--   ORDER BY created_at DESC LIMIT 60;
--
-- NOTE: swap_for_tags exists in production (added via the Supabase dashboard)
-- but was never captured in a migration — migration.sql creates
-- marketplace_listings without it. The ADD COLUMN below baselines it so this
-- file also works on a fresh database.
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Baseline the column (no-op in production where it already exists) ────
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS swap_for_tags TEXT[] DEFAULT '{}';

-- ── 2. Partial index for the swap-candidate scan ────────────────────────────
-- Matches the exact WHERE + ORDER BY of the candidate query above, so the
-- scan stays cheap as the listings table grows.
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_swap_candidates
  ON marketplace_listings (created_at DESC)
  WHERE status = 'active' AND listing_type IN ('swap', 'sell_or_swap');

-- ── 3. GIN index on the tag array ───────────────────────────────────────────
-- Not used by the current client-side matcher, but makes future server-side
-- tag queries (.overlaps() / .contains() on swap_for_tags) index-friendly.
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_swap_for_tags
  ON marketplace_listings USING GIN (swap_for_tags);
