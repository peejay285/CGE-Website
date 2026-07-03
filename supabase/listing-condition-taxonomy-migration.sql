-- ════════════════════════════════════════════════════════════════════════════
-- Listing Condition Taxonomy (Nigerian market / Jiji pattern)
--
-- CURRENT SHAPE: marketplace_listings.condition is free-text
-- (`condition TEXT NOT NULL`, created in migration.sql) with NO check
-- constraint. Values written by the old UI enum were:
--   'New', 'Used - Like New', 'Used - Good', 'Used - Fair'
--
-- CANONICAL VALUES going forward (written by the listing form, rendered via
-- lib/constants.ts getConditionConfig — keep both in sync):
--   'brand_new'    → "Brand New"    (sealed or unused)
--   'foreign_used' → "Foreign Used" (imported second-hand, UK/US used)
--   'local_used'   → "Local Used"   (used within Nigeria)
--
-- MAPPING of legacy values (data-preserving; every row keeps a meaningful
-- condition):
--   'New'             → 'brand_new'
--   'Used - Like New' → 'local_used'   (sold and used locally; "foreign used"
--   'Used - Good'     → 'local_used'    is a provenance claim we can't infer
--   'Used - Fair'     → 'local_used'    retroactively, so all legacy used
--                                        tiers map to local_used)
--
-- Because the column is already free text, no DDL is required — this is a
-- DML-only normalization. No CHECK constraint is added on purpose: the app
-- normalizes unknown legacy values at render time, and a constraint would
-- brick inserts if any other historic value exists in production.
--
-- Run this in the Supabase SQL Editor. Idempotent — the UPDATEs only touch
-- rows still holding legacy values, so re-running is a no-op.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Normalize legacy "new" values ────────────────────────────────────────
UPDATE marketplace_listings
SET condition = 'brand_new'
WHERE condition IN ('New', 'new', 'Brand New');

-- ── 2. Normalize legacy "used" values ───────────────────────────────────────
UPDATE marketplace_listings
SET condition = 'local_used'
WHERE condition IN (
  'Used - Like New',
  'Used - Good',
  'Used - Fair',
  'Used',
  'used',
  'Local Used'
);

-- ── 3. Normalize any pre-existing display-cased foreign used values ─────────
UPDATE marketplace_listings
SET condition = 'foreign_used'
WHERE condition IN ('Foreign Used', 'foreign used');
