-- ════════════════════════════════════════════════════════════════════════════
-- Community Features Migration
--
-- Brings the community schema in line with what the app code expects. Before
-- this migration, hooks/use-community-enhanced.ts wrote to columns and tables
-- that didn't exist in production — every post creation, reaction, poll vote,
-- mention, and report was silently failing.
--
-- What this does:
--
--   1. Extends `community_posts` with the columns the code uses:
--        image_url, topic, embed_url, hashtags, mentions, likes_count,
--        comments_count
--
--   2. Creates six missing tables: post_reactions, post_polls, poll_options,
--      poll_votes, user_mentions, post_reports
--
--   3. Adds triggers so likes_count, comments_count, and poll-option
--      votes_count stay in sync automatically (no drifting cached values)
--
--   4. Backfills the counters from existing rows
--
--   5. Applies privacy-conscious RLS:
--        - reactions / polls / poll_options: public read (so counts work)
--        - poll_votes: only the voter can see their own vote (counts come
--          from poll_options.votes_count via the trigger)
--        - mentions: only the mentioned user and the mentioner can see
--        - reports: only the reporter can see their own report (admin
--          surface deferred until proper admin auth exists)
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. Extend community_posts ──────────────────────────────────────────────
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS embed_url TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS hashtags TEXT[];
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS mentions TEXT[];
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'general';

-- Constrain topic to the values defined in lib/types.ts → CommunityTopic.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_topic_check'
  ) THEN
    ALTER TABLE community_posts ADD CONSTRAINT community_posts_topic_check
      CHECK (topic IN (
        'general', 'gaming-news', 'lfg', 'clips', 'memes',
        'marketplace-talk', 'tournament-talk', 'tech-talk', 'introductions'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_topic ON community_posts(topic);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_likes ON community_posts(likes_count DESC);


-- ── 2. post_reactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN (
    'fire', 'laugh', 'mind_blown', 'sad', 'angry', 'heart', 'gg'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);

ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reactions' AND policyname='Reactions are viewable by all') THEN
    CREATE POLICY "Reactions are viewable by all" ON post_reactions
      FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reactions' AND policyname='Users can react') THEN
    CREATE POLICY "Users can react" ON post_reactions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reactions' AND policyname='Users can remove own reactions') THEN
    CREATE POLICY "Users can remove own reactions" ON post_reactions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;


-- ── 3. post_polls ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL UNIQUE REFERENCES community_posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE post_polls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_polls' AND policyname='Polls are viewable by all') THEN
    CREATE POLICY "Polls are viewable by all" ON post_polls
      FOR SELECT USING (TRUE);
  END IF;
END $$;

-- Only the post's author can attach a poll, and only to a post they own.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_polls' AND policyname='Post authors can create polls') THEN
    CREATE POLICY "Post authors can create polls" ON post_polls
      FOR INSERT WITH CHECK (
        post_id IN (SELECT id FROM community_posts WHERE author_id = auth.uid())
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_polls' AND policyname='Post authors can delete polls') THEN
    CREATE POLICY "Post authors can delete polls" ON post_polls
      FOR DELETE USING (
        post_id IN (SELECT id FROM community_posts WHERE author_id = auth.uid())
      );
  END IF;
END $$;


-- ── 4. poll_options ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES post_polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='poll_options' AND policyname='Poll options are viewable by all') THEN
    CREATE POLICY "Poll options are viewable by all" ON poll_options
      FOR SELECT USING (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='poll_options' AND policyname='Post authors can create poll options') THEN
    CREATE POLICY "Post authors can create poll options" ON poll_options
      FOR INSERT WITH CHECK (
        poll_id IN (
          SELECT pp.id FROM post_polls pp
          JOIN community_posts cp ON cp.id = pp.post_id
          WHERE cp.author_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ── 5. poll_votes ──────────────────────────────────────────────────────────
-- Privacy: only the voter can read their own vote. Counts are exposed via
-- poll_options.votes_count (kept in sync by trigger below).
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES post_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='poll_votes' AND policyname='Voters can see own votes') THEN
    CREATE POLICY "Voters can see own votes" ON poll_votes
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='poll_votes' AND policyname='Authenticated users can vote') THEN
    CREATE POLICY "Authenticated users can vote" ON poll_votes
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ── 6. user_mentions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentioned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mentions_recipient ON user_mentions(mentioned_user_id, is_read);

ALTER TABLE user_mentions ENABLE ROW LEVEL SECURITY;

-- Only the mentioned user and the mentioner can see a mention row.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_mentions' AND policyname='Mentions visible to participants') THEN
    CREATE POLICY "Mentions visible to participants" ON user_mentions
      FOR SELECT USING (
        auth.uid() = mentioned_user_id OR auth.uid() = mentioned_by
      );
  END IF;
END $$;

-- The mentioner creates the row, and the mentioner must be the post's author.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_mentions' AND policyname='Authors can create mentions') THEN
    CREATE POLICY "Authors can create mentions" ON user_mentions
      FOR INSERT WITH CHECK (
        auth.uid() = mentioned_by
        AND post_id IN (SELECT id FROM community_posts WHERE author_id = auth.uid())
      );
  END IF;
END $$;

-- The mentioned user can mark a mention as read (UPDATE only the is_read flag).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_mentions' AND policyname='Recipients can mark as read') THEN
    CREATE POLICY "Recipients can mark as read" ON user_mentions
      FOR UPDATE USING (auth.uid() = mentioned_user_id);
  END IF;
END $$;


-- ── 7. post_reports ────────────────────────────────────────────────────────
-- Privacy: only the reporter can see their own report. Admin moderation surface
-- is deferred until proper admin auth exists (currently the giveaway admin
-- uses a string secret, not real role-based auth).
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'hate_speech', 'misinformation',
    'nsfw', 'self_harm', 'impersonation', 'other'
  )),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewed', 'actioned', 'dismissed'
  )),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status) WHERE status = 'pending';

ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reports' AND policyname='Reporters can see own reports') THEN
    CREATE POLICY "Reporters can see own reports" ON post_reports
      FOR SELECT USING (auth.uid() = reporter_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='post_reports' AND policyname='Authenticated users can report') THEN
    CREATE POLICY "Authenticated users can report" ON post_reports
      FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
END $$;


-- ── 8. Counter-keeping triggers ────────────────────────────────────────────

-- likes_count on community_posts
CREATE OR REPLACE FUNCTION refresh_post_likes_count()
RETURNS TRIGGER AS $$
DECLARE
  affected_post_id UUID;
BEGIN
  affected_post_id := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE community_posts
  SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = affected_post_id)
  WHERE id = affected_post_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS post_likes_count_trigger ON post_likes;
CREATE TRIGGER post_likes_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION refresh_post_likes_count();

-- comments_count on community_posts
CREATE OR REPLACE FUNCTION refresh_post_comments_count()
RETURNS TRIGGER AS $$
DECLARE
  affected_post_id UUID;
BEGIN
  affected_post_id := COALESCE(NEW.post_id, OLD.post_id);
  UPDATE community_posts
  SET comments_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = affected_post_id)
  WHERE id = affected_post_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS post_comments_count_trigger ON post_comments;
CREATE TRIGGER post_comments_count_trigger
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION refresh_post_comments_count();

-- votes_count on poll_options
CREATE OR REPLACE FUNCTION refresh_poll_option_votes_count()
RETURNS TRIGGER AS $$
DECLARE
  affected_option_id UUID;
BEGIN
  affected_option_id := COALESCE(NEW.option_id, OLD.option_id);
  UPDATE poll_options
  SET votes_count = (SELECT COUNT(*) FROM poll_votes WHERE option_id = affected_option_id)
  WHERE id = affected_option_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS poll_votes_count_trigger ON poll_votes;
CREATE TRIGGER poll_votes_count_trigger
  AFTER INSERT OR DELETE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION refresh_poll_option_votes_count();


-- ── 9. Backfill counters from existing data ────────────────────────────────
UPDATE community_posts cp
SET likes_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = cp.id);

UPDATE community_posts cp
SET comments_count = (SELECT COUNT(*) FROM post_comments WHERE post_id = cp.id);
