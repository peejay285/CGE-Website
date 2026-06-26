-- ================================================================
-- Event- & tournament-linked community threads
-- ----------------------------------------------------------------
-- Lets a community post be associated with an event or a tournament so
-- the event/tournament pages can show a scoped discussion thread.
-- Posts still appear in the main feed; these columns just enable the
-- per-entity view. ON DELETE SET NULL keeps posts if the entity is
-- removed (they simply unlink). Idempotent.
-- ================================================================

alter table public.community_posts
  add column if not exists event_id integer references public.events(id) on delete set null,
  add column if not exists tournament_id integer references public.tournaments(id) on delete set null;

create index if not exists idx_community_posts_event
  on public.community_posts(event_id)
  where event_id is not null;

create index if not exists idx_community_posts_tournament
  on public.community_posts(tournament_id)
  where tournament_id is not null;
