-- ════════════════════════════════════════════════════════════════════════════
-- Baseline: undocumented tables (marketplace + community)
--
-- Captures the live schema for tables that exist in production but were
-- created via the Supabase dashboard and never saved as a migration.
-- Reproduces the live state faithfully — bugs and all. Idempotent.
--
-- ── KNOWN ISSUES (preserved here, do NOT fix in this file) ──────────────────
--
--   1. swap_proposals has TWO SELECT policies: a restrictive one
--      ("Users can view their proposals" — proposer or listing owner) and
--      a permissive one ("proposals_select" — USING TRUE). RLS combines
--      with OR, so the permissive policy wins. **All swap proposals,
--      including the personal `message` field, are readable by anyone
--      with the anon key.** PRIVACY BUG — fix in a follow-up PR.
--
--   2. swap_proposals has duplicate INSERT policies ("Users can create
--      proposals" + "proposals_insert"). Identical effect, harmless noise.
--
--   3. swap_proposals has no DELETE policy. Proposers cannot withdraw a
--      proposal once submitted.
--
--   4. listing_saves and swap_proposals have nullable FK columns
--      (listing_id, user_id, proposer_id, offered_listing_id). They should
--      be NOT NULL — without it, the UNIQUE constraints don't behave as
--      expected when nulls are present.
--
--   5. post_bookmarks.user_id references profiles(id) but
--      listing_saves.user_id and swap_proposals.proposer_id reference
--      auth.users(id). Functionally equivalent (profiles.id = auth.users.id)
--      but inconsistent.
--
-- ── SIX TABLES ARE STILL MISSING ────────────────────────────────────────────
--
-- These are referenced by hooks/use-community-enhanced.ts but do NOT exist
-- in the live database, so the code paths fail silently:
--   post_reactions, post_polls, poll_options, poll_votes,
--   user_mentions, post_reports
-- Decide separately whether to build the tables or remove the dead code.
-- ════════════════════════════════════════════════════════════════════════════


-- ── listing_saves ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  listing_id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT listing_saves_pkey PRIMARY KEY (id),
  CONSTRAINT listing_saves_listing_id_user_id_key UNIQUE (listing_id, user_id),
  CONSTRAINT listing_saves_listing_id_fkey FOREIGN KEY (listing_id)
    REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  CONSTRAINT listing_saves_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE listing_saves ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'listing_saves' AND policyname = 'Anyone can view saves counts'
  ) THEN
    CREATE POLICY "Anyone can view saves counts" ON listing_saves
      FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'listing_saves' AND policyname = 'Authenticated users can save'
  ) THEN
    CREATE POLICY "Authenticated users can save" ON listing_saves
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'listing_saves' AND policyname = 'Users can unsave'
  ) THEN
    CREATE POLICY "Users can unsave" ON listing_saves
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;


-- ── post_bookmarks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT post_bookmarks_pkey PRIMARY KEY (id),
  CONSTRAINT post_bookmarks_post_id_user_id_key UNIQUE (post_id, user_id),
  CONSTRAINT post_bookmarks_post_id_fkey FOREIGN KEY (post_id)
    REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT post_bookmarks_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES profiles(id) ON DELETE CASCADE
);

ALTER TABLE post_bookmarks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_bookmarks' AND policyname = 'bookmarks_select'
  ) THEN
    CREATE POLICY "bookmarks_select" ON post_bookmarks
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_bookmarks' AND policyname = 'bookmarks_insert'
  ) THEN
    CREATE POLICY "bookmarks_insert" ON post_bookmarks
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_bookmarks' AND policyname = 'bookmarks_delete'
  ) THEN
    CREATE POLICY "bookmarks_delete" ON post_bookmarks
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ── swap_proposals ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swap_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  listing_id UUID,
  proposer_id UUID,
  offered_listing_id UUID,
  message TEXT,
  status TEXT DEFAULT 'pending'::text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT swap_proposals_pkey PRIMARY KEY (id),
  CONSTRAINT swap_proposals_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  CONSTRAINT swap_proposals_listing_id_proposer_id_offered_listing_id_key
    UNIQUE (listing_id, proposer_id, offered_listing_id),
  CONSTRAINT swap_proposals_listing_id_fkey FOREIGN KEY (listing_id)
    REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  CONSTRAINT swap_proposals_offered_listing_id_fkey FOREIGN KEY (offered_listing_id)
    REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  CONSTRAINT swap_proposals_proposer_id_fkey FOREIGN KEY (proposer_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE swap_proposals ENABLE ROW LEVEL SECURITY;

-- See known-issue (1) above: this policy is broader than intended and
-- effectively makes the table publicly readable.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'swap_proposals' AND policyname = 'proposals_select'
  ) THEN
    CREATE POLICY "proposals_select" ON swap_proposals
      FOR SELECT USING (TRUE);
  END IF;
END $$;

-- Restrictive SELECT policy — currently neutered by `proposals_select` above.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'swap_proposals' AND policyname = 'Users can view their proposals'
  ) THEN
    CREATE POLICY "Users can view their proposals" ON swap_proposals
      FOR SELECT USING (
        proposer_id = auth.uid()
        OR listing_id IN (
          SELECT id FROM marketplace_listings WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Two equivalent INSERT policies (see known-issue 2 above).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'swap_proposals' AND policyname = 'Users can create proposals'
  ) THEN
    CREATE POLICY "Users can create proposals" ON swap_proposals
      FOR INSERT WITH CHECK (proposer_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'swap_proposals' AND policyname = 'proposals_insert'
  ) THEN
    CREATE POLICY "proposals_insert" ON swap_proposals
      FOR INSERT WITH CHECK (auth.uid() = proposer_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'swap_proposals' AND policyname = 'Listing owners can update proposal status'
  ) THEN
    CREATE POLICY "Listing owners can update proposal status" ON swap_proposals
      FOR UPDATE USING (
        listing_id IN (
          SELECT id FROM marketplace_listings WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
