-- Add location field to marketplace_listings
-- Allows sellers to specify where they're listing from (city/state in Nigeria)

ALTER TABLE marketplace_listings
ADD COLUMN IF NOT EXISTS location text DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN marketplace_listings.location IS 'Seller-specified location, e.g. "Bonny Island", "Lagos", "Port Harcourt"';
