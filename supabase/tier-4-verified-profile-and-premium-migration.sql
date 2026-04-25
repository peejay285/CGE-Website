-- ════════════════════════════════════════════════════════════════════════════
-- Tier 4 — Verified profile (manual ID review) + Premium tier
--
-- Schema for the last layer of the trust ladder. Two intertwined surfaces:
--
--   1. ID verification submissions — a user uploads their ID + supporting
--      docs to Supabase Storage, an admin reviews via /admin/verifications,
--      approval flips profiles.is_id_verified = TRUE and (if appropriate)
--      profiles.premium_tier = 'premium'.
--
--   2. Premium tier — paid subscription that unlocks the verified review
--      pathway plus per-listing perks (higher image limits, priority
--      placement, featured swap matches). Driven by Paystack + the existing
--      webhook (extended in this PR to handle 'premium' purpose).
--
-- Includes a real admin auth foundation: profiles.is_admin BOOLEAN. New
-- /admin/* routes use this; the legacy giveaway admin (string secret) is
-- left alone for now and should be migrated separately.
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. profiles columns ─────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_id_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMPTZ;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_tier TEXT NOT NULL DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_premium_tier_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_premium_tier_check
      CHECK (premium_tier IN ('free', 'premium'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON profiles(premium_tier) WHERE premium_tier = 'premium';


-- ── 2. id_verification_submissions ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS id_verification_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_document_url TEXT NOT NULL,
  supporting_doc_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_id_verifications_user
  ON id_verification_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_id_verifications_pending
  ON id_verification_submissions(status, submitted_at)
  WHERE status = 'pending';

ALTER TABLE id_verification_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename = 'id_verification_submissions'
      AND policyname = 'Users can see own submissions') THEN
    CREATE POLICY "Users can see own submissions"
      ON id_verification_submissions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename = 'id_verification_submissions'
      AND policyname = 'Users can submit own verification') THEN
    CREATE POLICY "Users can submit own verification"
      ON id_verification_submissions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename = 'id_verification_submissions'
      AND policyname = 'Admins can see all submissions') THEN
    CREATE POLICY "Admins can see all submissions"
      ON id_verification_submissions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename = 'id_verification_submissions'
      AND policyname = 'Admins can review submissions') THEN
    CREATE POLICY "Admins can review submissions"
      ON id_verification_submissions FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
        )
      );
  END IF;
END $$;


-- ── 3. premium_subscriptions ────────────────────────────────────────────────
-- One row per successful Paystack payment for a premium subscription. The
-- profiles.premium_expires_at is the most recent period_end; this table is
-- the audit log.

CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_reference TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_subs_user
  ON premium_subscriptions(user_id);

ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename = 'premium_subscriptions'
      AND policyname = 'Users can see own subscriptions') THEN
    CREATE POLICY "Users can see own subscriptions"
      ON premium_subscriptions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;
-- INSERT/UPDATE only via the webhook (service role bypasses RLS), so no
-- write policies for end-users.


-- ── 4. Storage bucket for ID docs ───────────────────────────────────────────
-- Private bucket. Owners can read their own files; admins can read any.

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', FALSE)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Users can upload verification docs to own folder'
  ) THEN
    CREATE POLICY "Users can upload verification docs to own folder"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Users can read own verification docs'
  ) THEN
    CREATE POLICY "Users can read own verification docs"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'verification-docs'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Admins can read all verification docs'
  ) THEN
    CREATE POLICY "Admins can read all verification docs"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'verification-docs'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
        )
      );
  END IF;
END $$;


-- ── 5. Helper trigger — flip is_id_verified on approval ────────────────────
-- When an admin sets a submission's status to 'approved', mirror that to
-- the profile in one atomic operation (avoids forgetting in app code).

CREATE OR REPLACE FUNCTION sync_id_verification_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status, '') <> 'approved' THEN
    UPDATE profiles
    SET is_id_verified = TRUE, id_verified_at = NOW()
    WHERE id = NEW.user_id;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_id_verification_to_profile_trigger
  ON id_verification_submissions;
CREATE TRIGGER sync_id_verification_to_profile_trigger
  BEFORE UPDATE ON id_verification_submissions
  FOR EACH ROW
  EXECUTE FUNCTION sync_id_verification_to_profile();
