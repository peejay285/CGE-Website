-- ════════════════════════════════════════════════════════════════════════════
-- CGE Marketplace Trust System Migration
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Seller Ratings Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5),
  speed_rating INTEGER CHECK (speed_rating >= 1 AND speed_rating <= 5),
  review TEXT,
  is_swap BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_ratings_seller ON seller_ratings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_ratings_created ON seller_ratings(created_at DESC);

ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Ratings are viewable by all') THEN
    CREATE POLICY "Ratings are viewable by all" ON seller_ratings FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create ratings') THEN
    CREATE POLICY "Users can create ratings" ON seller_ratings FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
  END IF;
END $$;

-- ── 2. Seller Verifications Table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_verified BOOLEAN DEFAULT FALSE,
  phone_verified_at TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ DEFAULT NOW(),
  id_verified BOOLEAN DEFAULT FALSE,
  id_verified_at TIMESTAMPTZ,
  verification_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Verifications are viewable by all') THEN
    CREATE POLICY "Verifications are viewable by all" ON seller_verifications FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own verifications') THEN
    CREATE POLICY "Users can update own verifications" ON seller_verifications FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own verifications') THEN
    CREATE POLICY "Users can insert own verifications" ON seller_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 3. Add trust columns to profiles table ──────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_listings INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_swaps INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'new';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- ── 4. Auto-create verification record on signup ────────────────────────────
-- This trigger creates a seller_verifications row when a profile is created
CREATE OR REPLACE FUNCTION create_seller_verification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO seller_verifications (user_id, email_verified, email_verified_at)
  VALUES (NEW.id, TRUE, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_verification ON profiles;
CREATE TRIGGER on_profile_created_verification
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_seller_verification();

-- ── 5. Auto-update seller stats when a rating is created ────────────────────
CREATE OR REPLACE FUNCTION update_seller_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    avg_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM seller_ratings WHERE seller_id = NEW.seller_id
    ),
    rating_count = (
      SELECT COUNT(*) FROM seller_ratings WHERE seller_id = NEW.seller_id
    ),
    trust_level = CASE
      WHEN (SELECT COUNT(*) FROM seller_ratings WHERE seller_id = NEW.seller_id) >= 10
        AND (SELECT AVG(rating) FROM seller_ratings WHERE seller_id = NEW.seller_id) >= 4.0
        THEN 'power'
      WHEN (SELECT COUNT(*) FROM seller_ratings WHERE seller_id = NEW.seller_id) >= 3
        AND (SELECT AVG(rating) FROM seller_ratings WHERE seller_id = NEW.seller_id) >= 3.5
        THEN 'trusted'
      WHEN (SELECT COUNT(*) FROM seller_ratings WHERE seller_id = NEW.seller_id) >= 1
        THEN 'verified'
      ELSE 'new'
    END
  WHERE id = NEW.seller_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_rating_created ON seller_ratings;
CREATE TRIGGER on_rating_created
  AFTER INSERT ON seller_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_stats();

-- ── 6. Create verification records for existing users ───────────────────────
INSERT INTO seller_verifications (user_id, email_verified, email_verified_at)
SELECT id, TRUE, created_at FROM profiles
WHERE id NOT IN (SELECT user_id FROM seller_verifications)
ON CONFLICT (user_id) DO NOTHING;
