-- ════════════════════════════════════════════════════════════════════════════
-- Auto-inherit lat/long on marketplace_listings from the seller's profile
--
-- Closes the "listings have no coords" gap so distance sort works without
-- requiring every listing form to capture geolocation. The trigger only
-- fires when the new row's coords are NULL — explicit per-listing coords
-- (set by a future "use my current location" button) are preserved.
--
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- Note: the seller column on marketplace_listings is `user_id` (not
-- seller_id, despite some older code aliasing it that way via PostgREST
-- foreign-key constraint names).
CREATE OR REPLACE FUNCTION inherit_listing_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_lat IS NULL OR NEW.location_lng IS NULL THEN
    SELECT location_lat, location_lng
    INTO NEW.location_lat, NEW.location_lng
    FROM profiles
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS inherit_listing_coords_trigger ON marketplace_listings;
CREATE TRIGGER inherit_listing_coords_trigger
  BEFORE INSERT ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION inherit_listing_coords();

-- Backfill existing listings that have a seller with coords but no own coords.
UPDATE marketplace_listings l
SET
  location_lat = p.location_lat,
  location_lng = p.location_lng
FROM profiles p
WHERE p.id = l.user_id
  AND l.location_lat IS NULL
  AND p.location_lat IS NOT NULL;
