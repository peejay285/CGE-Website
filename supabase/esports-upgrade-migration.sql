-- ============================================
-- CGE Esports Platform Upgrade Migration
-- Adds: brackets, matches, teams, check-ins,
--        achievements, series, stream links
-- Run this in the Supabase SQL Editor
-- ============================================

-- ─── FIX: Add missing columns to tournaments ──
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS filled integer DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS stream_url text;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS series_id integer;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS team_size integer DEFAULT 1; -- 1 = solo, 2+ = team
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS check_in_required boolean DEFAULT false;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS check_in_opens_minutes integer DEFAULT 30;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS bracket_type text; -- 'single_elimination', 'double_elimination', 'round_robin', 'swiss'
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS max_team_size integer DEFAULT 1;

-- Allow creators to manage tournaments
CREATE POLICY "Creators can update own tournaments"
  ON tournaments FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete own tournaments"
  ON tournaments FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "Authenticated users can create tournaments"
  ON tournaments FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow registrations to be viewable by tournament hosts
CREATE POLICY "Tournament host can view registrations"
  ON tournament_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_registrations.tournament_id
      AND t.created_by = auth.uid()
    )
  );

-- Allow users to unregister
CREATE POLICY "Users can delete own registrations"
  ON tournament_registrations FOR DELETE
  USING (auth.uid() = user_id);

-- ─── TOURNAMENT SERIES ──────────────────────────
-- Recurring tournament series (e.g. "CGE Weekly FC 26 Cup")
CREATE TABLE IF NOT EXISTS tournament_series (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text,
  game text NOT NULL,
  format text NOT NULL,
  platform text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly', -- 'weekly', 'biweekly', 'monthly'
  entry_fee integer NOT NULL DEFAULT 0,
  prize_template text, -- e.g. "₦50,000"
  slots integer NOT NULL DEFAULT 16,
  rules text,
  team_size integer DEFAULT 1,
  stream_url text,
  image_url text,
  created_by uuid REFERENCES auth.users NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tournament_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Series are viewable by everyone" ON tournament_series FOR SELECT USING (true);
CREATE POLICY "Creators can manage series" ON tournament_series FOR ALL USING (auth.uid() = created_by);

-- Link tournaments to series
ALTER TABLE tournaments ADD CONSTRAINT fk_tournaments_series
  FOREIGN KEY (series_id) REFERENCES tournament_series(id) ON DELETE SET NULL;

-- ─── TEAMS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id serial PRIMARY KEY,
  name text NOT NULL,
  tag text UNIQUE, -- clan tag, e.g. "CGE"
  logo_url text,
  captain_id uuid REFERENCES auth.users NOT NULL,
  description text,
  game text, -- primary game
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON teams FOR INSERT WITH CHECK (auth.uid() = captain_id);
CREATE POLICY "Captains can update own teams" ON teams FOR UPDATE USING (auth.uid() = captain_id);
CREATE POLICY "Captains can delete own teams" ON teams FOR DELETE USING (auth.uid() = captain_id);

CREATE TABLE IF NOT EXISTS team_members (
  id serial PRIMARY KEY,
  team_id integer REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  role text NOT NULL DEFAULT 'member', -- 'captain', 'co-captain', 'member'
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members are viewable by everyone" ON team_members FOR SELECT USING (true);
CREATE POLICY "Captains can manage members" ON team_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM teams t WHERE t.id = team_members.team_id AND t.captain_id = auth.uid())
  );
CREATE POLICY "Users can leave teams" ON team_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can join teams" ON team_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Team tournament registrations
CREATE TABLE IF NOT EXISTS tournament_team_registrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id integer REFERENCES tournaments(id) NOT NULL,
  team_id integer REFERENCES teams(id) NOT NULL,
  registered_by uuid REFERENCES auth.users NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  paystack_reference text,
  registered_at timestamptz DEFAULT now(),
  UNIQUE(tournament_id, team_id)
);

ALTER TABLE tournament_team_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team registrations viewable by everyone" ON tournament_team_registrations FOR SELECT USING (true);
CREATE POLICY "Captains can register teams" ON tournament_team_registrations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams t WHERE t.id = tournament_team_registrations.team_id AND t.captain_id = auth.uid())
  );

-- ─── CHECK-IN SYSTEM ────────────────────────────
-- Players must check in before tournament starts
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false;
ALTER TABLE tournament_registrations ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
ALTER TABLE tournament_team_registrations ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false;
ALTER TABLE tournament_team_registrations ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

-- ─── BRACKET & MATCHES ─────────────────────────
CREATE TABLE IF NOT EXISTS tournament_matches (
  id serial PRIMARY KEY,
  tournament_id integer REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  round integer NOT NULL, -- 1 = first round, 2 = quarters, etc.
  match_number integer NOT NULL, -- position within the round
  bracket_position text, -- 'winners', 'losers' (for double elim)

  -- Participants (either user_id for solo or team_id for team)
  participant1_id text, -- uuid or team_id as string
  participant2_id text,
  participant1_name text,
  participant2_name text,
  participant1_seed integer,
  participant2_seed integer,

  -- Scores
  participant1_score integer,
  participant2_score integer,

  -- Result
  winner_id text,
  loser_id text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'bye', 'disputed'

  -- Score reporting
  reported_by text, -- who reported the score
  reported_at timestamptz,
  confirmed_by text, -- opponent confirms (or admin)
  confirmed_at timestamptz,

  -- Next match link (for bracket progression)
  next_match_id integer REFERENCES tournament_matches(id),
  next_match_slot integer, -- 1 or 2 (which slot the winner goes to)

  -- Loser bracket link (for double elimination)
  loser_next_match_id integer REFERENCES tournament_matches(id),
  loser_next_match_slot integer,

  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are viewable by everyone" ON tournament_matches FOR SELECT USING (true);
CREATE POLICY "Tournament host can manage matches" ON tournament_matches FOR ALL
  USING (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_matches.tournament_id AND t.created_by = auth.uid())
  );

-- Participants can report scores on their own matches
CREATE POLICY "Participants can update match scores" ON tournament_matches FOR UPDATE
  USING (
    auth.uid()::text = participant1_id OR auth.uid()::text = participant2_id
  );

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON tournament_matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_matches_status ON tournament_matches(status);

-- ─── MATCH DISPUTES ─────────────────────────────
CREATE TABLE IF NOT EXISTS match_disputes (
  id serial PRIMARY KEY,
  match_id integer REFERENCES tournament_matches(id) ON DELETE CASCADE NOT NULL,
  reported_by uuid REFERENCES auth.users NOT NULL,
  reason text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'dismissed'
  resolved_by uuid REFERENCES auth.users,
  resolution text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE match_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Disputes viewable by participants and host" ON match_disputes FOR SELECT USING (true);
CREATE POLICY "Participants can create disputes" ON match_disputes FOR INSERT WITH CHECK (auth.uid() = reported_by);

-- ─── ACHIEVEMENTS & BADGES ──────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY, -- e.g. 'first_win', 'tournament_champion', '10_streak'
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL, -- emoji or icon name
  category text NOT NULL DEFAULT 'general', -- 'general', 'tournament', 'social', 'milestone'
  points integer NOT NULL DEFAULT 10,
  rarity text NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are viewable by everyone" ON achievements FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS player_achievements (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  achievement_id text REFERENCES achievements(id) NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  tournament_id integer REFERENCES tournaments(id), -- context (which tournament unlocked it)
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements are viewable by everyone" ON player_achievements FOR SELECT USING (true);

-- ─── PLAYER FOLLOWERS ───────────────────────────
CREATE TABLE IF NOT EXISTS player_follows (
  follower_id uuid REFERENCES auth.users NOT NULL,
  following_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE player_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are viewable by everyone" ON player_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON player_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON player_follows FOR DELETE USING (auth.uid() = follower_id);

-- ─── SEED ACHIEVEMENTS ──────────────────────────
INSERT INTO achievements (id, title, description, icon, category, points, rarity) VALUES
  ('first_tournament', 'First Steps', 'Register for your first tournament', '🎮', 'tournament', 10, 'common'),
  ('first_win', 'Victor', 'Win your first tournament match', '⚔️', 'tournament', 20, 'common'),
  ('first_champion', 'Champion', 'Win a tournament', '🏆', 'tournament', 100, 'epic'),
  ('three_tournaments', 'Regular', 'Compete in 3 tournaments', '🎯', 'tournament', 30, 'common'),
  ('ten_tournaments', 'Veteran', 'Compete in 10 tournaments', '🎖️', 'tournament', 50, 'rare'),
  ('win_streak_3', 'On Fire', 'Win 3 matches in a row', '🔥', 'tournament', 40, 'rare'),
  ('win_streak_5', 'Unstoppable', 'Win 5 matches in a row', '💥', 'tournament', 80, 'epic'),
  ('win_streak_10', 'Legendary', 'Win 10 matches in a row', '👑', 'tournament', 200, 'legendary'),
  ('host_tournament', 'Organizer', 'Host your first tournament', '📋', 'social', 25, 'common'),
  ('host_5_tournaments', 'Event Master', 'Host 5 tournaments', '🎪', 'social', 75, 'rare'),
  ('team_creator', 'Squad Leader', 'Create a team', '🛡️', 'social', 15, 'common'),
  ('team_win', 'Team Player', 'Win a team tournament', '🤝', 'social', 60, 'rare'),
  ('perfect_check_in', 'Always Ready', 'Check in on time for 5 consecutive tournaments', '✅', 'milestone', 35, 'rare'),
  ('top_3_leaderboard', 'Elite', 'Reach top 3 on the leaderboard', '📊', 'milestone', 150, 'epic'),
  ('first_dispute_resolved', 'Fair Play', 'Have a dispute resolved in your favour', '⚖️', 'general', 20, 'common'),
  ('community_supporter', 'Supporter', 'Follow 10 players', '❤️', 'social', 15, 'common'),
  ('series_regular', 'Series Regular', 'Compete in 5 events of the same series', '🔄', 'milestone', 50, 'rare'),
  ('grand_slam', 'Grand Slam', 'Win tournaments in 3 different games', '🌟', 'milestone', 200, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- ─── ENHANCED PROFILE FIELDS ────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favourite_game text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id integer REFERENCES teams(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS follower_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tournament_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS achievement_count integer DEFAULT 0;

-- ─── PERFORMANCE INDEXES ────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_player_achievements_user ON player_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_player_follows_follower ON player_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_player_follows_following ON player_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_series ON tournaments(series_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX IF NOT EXISTS idx_match_disputes_match ON match_disputes(match_id);
