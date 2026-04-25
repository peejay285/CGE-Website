-- ════════════════════════════════════════════════════════════════════════════
-- Swap Proposals Privacy Fix
--
-- Drops the public-read policy on swap_proposals. Before this fix, anyone
-- with the anon key could read every swap proposal in the database —
-- including the personal `message` field — because of two contradictory
-- SELECT policies combined with OR:
--
--   - "proposals_select"             USING (TRUE)                    ← public
--   - "Users can view their proposals" USING (proposer or listing owner) ← intended
--
-- Dropping the broad policy lets the restrictive one take effect, so only
-- the proposer and the listing owner can see a proposal.
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "proposals_select" ON swap_proposals;

-- Sanity check: the restrictive policy must still exist after this runs,
-- otherwise the table will have NO SELECT policy and nothing can read it.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'swap_proposals'
      AND policyname = 'Users can view their proposals'
  ) THEN
    RAISE EXCEPTION
      'Restrictive SELECT policy "Users can view their proposals" is missing — '
      'do NOT apply this migration until that policy exists, or the table '
      'will become unreadable.';
  END IF;
END $$;
