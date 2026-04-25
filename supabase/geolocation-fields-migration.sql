-- ════════════════════════════════════════════════════════════════════════════
-- Geolocation Fields (PR #2 follow-up)
--
-- Adds lat/long columns to `profiles` and `marketplace_listings` so we can
-- offer "near me" sort. Plus a SQL helper for Haversine distance calculation
-- (the actual sort happens client-side in the v1 surface — this function is
-- here for future use if we want to push it down to the database).
--
-- Coordinates are optional. The location_state column from the previous
-- migration is what drives state filtering; lat/long are only used when the
-- user grants browser/device geolocation.
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_geo
  ON marketplace_listings(location_lat, location_lng)
  WHERE location_lat IS NOT NULL;

-- Distance in kilometres using the Haversine formula. Returns NULL if either
-- side is missing coordinates. Available in case future queries want to push
-- distance sort to the database; the v1 surface sorts client-side.
CREATE OR REPLACE FUNCTION haversine_km(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE SQL IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE
    WHEN lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN NULL
    ELSE 2 * 6371 * ASIN(SQRT(
      POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
      COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
      POWER(SIN(RADIANS(lng2 - lng1) / 2), 2)
    ))
  END
$$;

-- Update handle_new_user to also pick up coords from signup metadata if the
-- client passed them (the auth modal asks for coords via navigator.geolocation
-- before submitting).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    id, full_name, phone, location_state, location_city,
    location_lat, location_lng
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    NEW.raw_user_meta_data->>'location_state',
    NEW.raw_user_meta_data->>'location_city',
    (NEW.raw_user_meta_data->>'location_lat')::DOUBLE PRECISION,
    (NEW.raw_user_meta_data->>'location_lng')::DOUBLE PRECISION
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
