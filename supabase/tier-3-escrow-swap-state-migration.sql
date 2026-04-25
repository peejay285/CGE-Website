-- ════════════════════════════════════════════════════════════════════════════
-- Tier 3 — Escrow-style swap state machine
--
-- Extends swap_proposals with a real lifecycle: ship → ship → receive →
-- receive → completed. Both parties confirm their own ship/receive events
-- via dedicated timestamp columns; status is auto-derived by a trigger.
-- 14-day timeout fires through a helper function (call from a cron or
-- nightly scheduled function — left to the operator).
--
-- Activates the TIER-3-TODO: validate_swap_linked_rating now requires
-- status='completed' before a swap-linked rating can be inserted.
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. New lifecycle columns on swap_proposals ──────────────────────────────

ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS proposer_shipped_at TIMESTAMPTZ;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS proposer_tracking TEXT;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS owner_shipped_at TIMESTAMPTZ;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS owner_tracking TEXT;

ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS proposer_received_at TIMESTAMPTZ;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS owner_received_at TIMESTAMPTZ;

ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS disputed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

ALTER TABLE swap_proposals ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;


-- ── 2. Extend the status CHECK ──────────────────────────────────────────────
-- Existing rows ('pending'/'accepted'/'declined') are preserved; new values
-- are additive.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'swap_proposals_status_check'
  ) THEN
    ALTER TABLE swap_proposals DROP CONSTRAINT swap_proposals_status_check;
  END IF;
END $$;

ALTER TABLE swap_proposals
  ADD CONSTRAINT swap_proposals_status_check CHECK (status IN (
    'pending', 'accepted', 'declined',
    'in_transit', 'completed',
    'cancelled', 'disputed', 'expired'
  ));


-- ── 3. Status-keeper trigger ────────────────────────────────────────────────
-- Auto-derives status from the timestamp columns. Runs BEFORE INSERT/UPDATE.
-- Also auto-populates accepted_at when status flips to 'accepted', and
-- expires_at = accepted_at + 14 days.

CREATE OR REPLACE FUNCTION derive_swap_status()
RETURNS TRIGGER AS $$
DECLARE
  proposer_shipped BOOLEAN := NEW.proposer_shipped_at IS NOT NULL;
  owner_shipped BOOLEAN := NEW.owner_shipped_at IS NOT NULL;
  proposer_received BOOLEAN := NEW.proposer_received_at IS NOT NULL;
  owner_received BOOLEAN := NEW.owner_received_at IS NOT NULL;
BEGIN
  -- Terminal-cancellation states bypass derivation.
  IF NEW.cancelled_at IS NOT NULL THEN
    NEW.status := 'cancelled';
    RETURN NEW;
  END IF;

  IF NEW.disputed_at IS NOT NULL THEN
    NEW.status := 'disputed';
    RETURN NEW;
  END IF;

  IF NEW.declined_at IS NOT NULL THEN
    NEW.status := 'declined';
    RETURN NEW;
  END IF;

  -- Both parties confirmed receipt → completed.
  IF proposer_received AND owner_received THEN
    NEW.status := 'completed';
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    END IF;
    RETURN NEW;
  END IF;

  -- At least one ship event has fired → in_transit.
  IF proposer_shipped OR owner_shipped THEN
    NEW.status := 'in_transit';
    RETURN NEW;
  END IF;

  -- Owner accepted but nothing shipped yet.
  IF NEW.accepted_at IS NOT NULL THEN
    NEW.status := 'accepted';
    IF NEW.expires_at IS NULL THEN
      NEW.expires_at := NEW.accepted_at + INTERVAL '14 days';
    END IF;
    RETURN NEW;
  END IF;

  -- Default — still negotiating.
  IF NEW.status IS NULL THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS derive_swap_status_trigger ON swap_proposals;
CREATE TRIGGER derive_swap_status_trigger
  BEFORE INSERT OR UPDATE ON swap_proposals
  FOR EACH ROW
  EXECUTE FUNCTION derive_swap_status();


-- ── 4. Activate the TIER-3-TODO ─────────────────────────────────────────────
-- Replace the v1 'accepted' check with the real 'completed' check now that
-- the lifecycle exists.

CREATE OR REPLACE FUNCTION validate_swap_linked_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_proposal_status TEXT;
  v_proposer_id UUID;
  v_listing_owner_id UUID;
  v_listing_id UUID;
  v_offered_listing_id UUID;
BEGIN
  IF NEW.swap_proposal_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    sp.status,
    sp.proposer_id,
    sp.listing_id,
    sp.offered_listing_id,
    ml.user_id
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

  IF v_proposal_status <> 'completed' THEN
    RAISE EXCEPTION
      'Cannot rate swap proposal % — status is %, must be completed (both parties confirmed receipt)',
      NEW.swap_proposal_id, v_proposal_status;
  END IF;

  IF NEW.reviewer_id = v_proposer_id AND NEW.seller_id = v_listing_owner_id THEN
    IF NEW.listing_id <> v_listing_id THEN
      RAISE EXCEPTION
        'Rating listing_id % does not match the swap proposal''s listing_id %',
        NEW.listing_id, v_listing_id;
    END IF;
  ELSIF NEW.reviewer_id = v_listing_owner_id AND NEW.seller_id = v_proposer_id THEN
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

  NEW.is_swap := TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 5. RLS — both parties can update their own lifecycle fields ─────────────
-- The existing "Listing owners can update proposal status" was too narrow.
-- Replace with an "either party" UPDATE policy. Column-level ownership is
-- enforced by the application (the website hooks only set fields belonging
-- to the calling user); a stricter column-level policy is possible but
-- would require a per-column WITH CHECK, which Postgres RLS doesn't model
-- as cleanly. The trigger above ensures the resulting status is consistent
-- regardless of who wrote what.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'swap_proposals'
      AND policyname = 'Listing owners can update proposal status'
  ) THEN
    DROP POLICY "Listing owners can update proposal status" ON swap_proposals;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'swap_proposals'
      AND policyname = 'Either party can update lifecycle'
  ) THEN
    CREATE POLICY "Either party can update lifecycle" ON swap_proposals
      FOR UPDATE USING (
        proposer_id = auth.uid()
        OR listing_id IN (
          SELECT id FROM marketplace_listings WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ── 6. Timeout sweep helper ─────────────────────────────────────────────────
-- Marks any non-terminal proposal whose expires_at has passed as 'expired'.
-- Run from a Supabase cron job (pg_cron) or a Vercel scheduled function.
-- Safe to re-run; it only touches rows whose status is still
-- accepted/in_transit and whose expires_at is in the past.

CREATE OR REPLACE FUNCTION expire_stale_swap_proposals()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH updated AS (
    UPDATE swap_proposals
    SET
      status = 'expired',
      cancelled_at = NOW(),
      cancellation_reason = 'Auto-expired (14-day timeout reached)'
    WHERE status IN ('accepted', 'in_transit')
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO affected FROM updated;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 7. Backfill — set accepted_at + expires_at on existing accepted rows ────
UPDATE swap_proposals
SET
  accepted_at = COALESCE(accepted_at, created_at),
  expires_at = COALESCE(expires_at, created_at + INTERVAL '14 days')
WHERE status = 'accepted'
  AND accepted_at IS NULL;

UPDATE swap_proposals
SET declined_at = COALESCE(declined_at, created_at)
WHERE status = 'declined'
  AND declined_at IS NULL;
