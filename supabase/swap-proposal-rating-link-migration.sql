-- ════════════════════════════════════════════════════════════════════════════
-- Link seller_ratings to swap_proposals
--
-- Goal: enforce at the database layer that swap-linked ratings can only be
-- created by an actual party to an actual completed swap. Closes the gaming
-- vector where two users could mutually 5-star each other without a real
-- transaction.
--
-- Today this is enforced for status = 'accepted' (the current terminal-success
-- state). When the Tier 3 escrow state machine ships and adds a real
-- 'completed' status, update the trigger below — search for "TIER-3-TODO".
--
-- Run this in the Supabase SQL Editor after trust-system-migration.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Add the FK column ────────────────────────────────────────────────────
-- Nullable so legacy purchase-style ratings (no proposal) keep working.
ALTER TABLE seller_ratings
  ADD COLUMN IF NOT EXISTS swap_proposal_id UUID
  REFERENCES swap_proposals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seller_ratings_swap_proposal
  ON seller_ratings(swap_proposal_id);

-- One rating per party per swap proposal.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_seller_ratings_proposal_reviewer
  ON seller_ratings(swap_proposal_id, reviewer_id)
  WHERE swap_proposal_id IS NOT NULL;

-- ── 2. Validation trigger ───────────────────────────────────────────────────
-- For every NEW seller_ratings row where swap_proposal_id is set, enforce:
--   a) The proposal exists and is in a terminal-success state.
--   b) The reviewer is one of the two parties (proposer of the swap, or
--      owner of the listing being proposed against).
--   c) The seller_id (target of the rating) is the OTHER party.
--   d) is_swap is auto-set to TRUE so the column stays consistent.
--
-- If swap_proposal_id is NULL, the row is treated as a legacy/purchase rating
-- and these checks are skipped.
CREATE OR REPLACE FUNCTION validate_swap_linked_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_proposal_status TEXT;
  v_proposer_id UUID;
  v_listing_owner_id UUID;
  v_listing_id UUID;
  v_offered_listing_id UUID;
BEGIN
  -- Skip validation for legacy/purchase ratings.
  IF NEW.swap_proposal_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pull the proposal and the owner of the listing it targets.
  SELECT
    sp.status,
    sp.proposer_id,
    sp.listing_id,
    sp.offered_listing_id,
    ml.seller_id
  INTO
    v_proposal_status,
    v_proposer_id,
    v_listing_id,
    v_offered_listing_id,
    v_listing_owner_id
  FROM swap_proposals sp
  JOIN marketplace_listings ml ON ml.id = sp.listing_id
  WHERE sp.id = NEW.swap_proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Swap proposal % not found', NEW.swap_proposal_id;
  END IF;

  -- (a) Terminal-success state check.
  -- TIER-3-TODO: when escrow ships, replace 'accepted' with 'completed'.
  IF v_proposal_status <> 'accepted' THEN
    RAISE EXCEPTION
      'Cannot rate swap proposal % — status is %, must be accepted (or completed once escrow ships)',
      NEW.swap_proposal_id, v_proposal_status;
  END IF;

  -- (b) + (c) Reviewer and seller_id must be the two parties, in either direction.
  IF NEW.reviewer_id = v_proposer_id AND NEW.seller_id = v_listing_owner_id THEN
    -- Proposer rating the listing owner. The rating's listing_id should be
    -- the original listing being proposed against.
    IF NEW.listing_id <> v_listing_id THEN
      RAISE EXCEPTION
        'Rating listing_id % does not match the swap proposal''s listing_id %',
        NEW.listing_id, v_listing_id;
    END IF;

  ELSIF NEW.reviewer_id = v_listing_owner_id AND NEW.seller_id = v_proposer_id THEN
    -- Listing owner rating the proposer. The rating's listing_id should be
    -- the offered listing.
    IF NEW.listing_id <> v_offered_listing_id THEN
      RAISE EXCEPTION
        'Rating listing_id % does not match the swap proposal''s offered_listing_id %',
        NEW.listing_id, v_offered_listing_id;
    END IF;

  ELSE
    RAISE EXCEPTION
      'Reviewer % and seller % are not the two parties of swap proposal %',
      NEW.reviewer_id, NEW.seller_id, NEW.swap_proposal_id;
  END IF;

  -- (d) Keep is_swap consistent with the FK.
  NEW.is_swap := TRUE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_swap_linked_rating_trigger ON seller_ratings;
CREATE TRIGGER validate_swap_linked_rating_trigger
  BEFORE INSERT ON seller_ratings
  FOR EACH ROW
  EXECUTE FUNCTION validate_swap_linked_rating();
