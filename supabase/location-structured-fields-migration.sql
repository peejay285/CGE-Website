-- ════════════════════════════════════════════════════════════════════════════
-- Structured Location Fields (PR #2 — location capture & state filter)
--
-- Adds `location_state` and `location_city` columns to both `profiles` and
-- `marketplace_listings`. These are the structured fields that drive the
-- marketplace state filter.
--
-- The existing free-text `location` column on marketplace_listings is left
-- alone for backward compatibility with rows that pre-date this migration.
-- Going forward, the listing form should write the structured fields and
-- can derive a display string from them. The free-text column may be
-- deprecated once all rows have structured values.
--
-- This is the v1 location surface (state-level only, all 36 + FCT). The
-- v2 surface (browser geolocation + distance sort + lat/long columns) is
-- planned but deferred.
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. profiles ─────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_state TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_city TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_location_state ON profiles(location_state);

-- ── 2. marketplace_listings ─────────────────────────────────────────────────
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS location_state TEXT;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS location_city TEXT;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_location_state
  ON marketplace_listings(location_state);

-- ── 3. Constrain to Nigerian states + FCT ───────────────────────────────────
-- Both columns are nullable for backward compatibility. The CHECK only fires
-- when a value is present, so legacy NULL rows are unaffected.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_location_state_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_location_state_check
      CHECK (location_state IS NULL OR location_state IN (
        'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
        'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
        'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
        'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
        'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
      ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_listings_location_state_check'
  ) THEN
    ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_location_state_check
      CHECK (location_state IS NULL OR location_state IN (
        'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
        'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
        'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
        'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
        'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
      ));
  END IF;
END $$;

-- ── 4. handle_new_user — propagate location from signup metadata ────────────
-- Original definition is in migration.sql. This replaces it with a version
-- that also captures location_state and location_city from raw_user_meta_data
-- (set by the signup form via supabase.auth.signUp options.data).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone, location_state, location_city)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    NEW.raw_user_meta_data->>'location_state',
    NEW.raw_user_meta_data->>'location_city'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
