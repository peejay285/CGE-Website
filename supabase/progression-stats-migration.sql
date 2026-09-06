-- ═══════════════════════════════════════════════════════════════════
-- PROGRESSION STATS (Deep Dive E2 — "winning changes nothing")
-- Before this migration NOTHING ever wrote profiles.wins / losses /
-- points / tournament_count: the leaderboard (points > 0) stayed
-- empty forever and a champion's player card still said Rookie,
-- 0 wins. These triggers make the database the single authoritative
-- writer of progression, on state transitions only (idempotent, with
-- reversal when a completed match is reopened after a dispute).
--
-- Point values (tune freely later — documented here on purpose):
--   match win +20 · match played (loss) +5 · tournament completed +10
--   tournament champion +100
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ── A) Match completion → wins / losses / points ───────────────────
create or replace function public.apply_match_result_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uuid_re constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  int_re constant text := '^\d+$';
begin
  -- Solo winner / loser (participant ids are uuids-as-text)
  if new.winner_id is not null and new.winner_id ~* uuid_re then
    update public.profiles
      set wins = coalesce(wins, 0) + 1,
          points = coalesce(points, 0) + 20
      where id = new.winner_id::uuid;
  end if;
  if new.loser_id is not null and new.loser_id ~* uuid_re then
    update public.profiles
      set losses = coalesce(losses, 0) + 1,
          points = coalesce(points, 0) + 5
      where id = new.loser_id::uuid;
  end if;

  -- Team winner / loser (participant ids are team ids-as-text):
  -- credit the whole roster.
  if new.winner_id is not null and new.winner_id ~ int_re then
    update public.profiles p
      set wins = coalesce(p.wins, 0) + 1,
          points = coalesce(p.points, 0) + 20
      from public.team_members tm
      where tm.team_id = new.winner_id::int
        and tm.user_id = p.id;
  end if;
  if new.loser_id is not null and new.loser_id ~ int_re then
    update public.profiles p
      set losses = coalesce(p.losses, 0) + 1,
          points = coalesce(p.points, 0) + 5
      from public.team_members tm
      where tm.team_id = new.loser_id::int
        and tm.user_id = p.id;
  end if;

  return new;
end;
$$;

-- Reversal: a completed match reopened (dispute upheld) takes its
-- stats back, so re-completing with a different winner stays honest.
create or replace function public.revert_match_result_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uuid_re constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  int_re constant text := '^\d+$';
begin
  if old.winner_id is not null and old.winner_id ~* uuid_re then
    update public.profiles
      set wins = greatest(coalesce(wins, 0) - 1, 0),
          points = greatest(coalesce(points, 0) - 20, 0)
      where id = old.winner_id::uuid;
  end if;
  if old.loser_id is not null and old.loser_id ~* uuid_re then
    update public.profiles
      set losses = greatest(coalesce(losses, 0) - 1, 0),
          points = greatest(coalesce(points, 0) - 5, 0)
      where id = old.loser_id::uuid;
  end if;
  if old.winner_id is not null and old.winner_id ~ int_re then
    update public.profiles p
      set wins = greatest(coalesce(p.wins, 0) - 1, 0),
          points = greatest(coalesce(p.points, 0) - 20, 0)
      from public.team_members tm
      where tm.team_id = old.winner_id::int
        and tm.user_id = p.id;
  end if;
  if old.loser_id is not null and old.loser_id ~ int_re then
    update public.profiles p
      set losses = greatest(coalesce(p.losses, 0) - 1, 0),
          points = greatest(coalesce(p.points, 0) - 5, 0)
      from public.team_members tm
      where tm.team_id = old.loser_id::int
        and tm.user_id = p.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_match_result_stats on public.tournament_matches;
create trigger trg_match_result_stats
  after update on public.tournament_matches
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function public.apply_match_result_stats();

drop trigger if exists trg_match_result_revert on public.tournament_matches;
create trigger trg_match_result_revert
  after update on public.tournament_matches
  for each row
  when (old.status = 'completed' and new.status is distinct from 'completed')
  execute function public.revert_match_result_stats();

-- ── B) Tournament completion → tournament_count + points ───────────
create or replace function public.apply_tournament_completion_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uuid_re constant text :=
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  int_re constant text := '^\d+$';
  v_free boolean := coalesce(new.entry_fee, 0) = 0;
  v_final record;
begin
  -- Solo participants: everyone who actually held a valid entry.
  update public.profiles p
    set tournament_count = coalesce(p.tournament_count, 0) + 1,
        points = coalesce(p.points, 0) + 10
    where p.id in (
      select r.user_id
      from public.tournament_registrations r
      where r.tournament_id = new.id
        and (r.payment_status = 'paid' or v_free)
    );

  -- Team participants: every roster member of a validly entered team.
  update public.profiles p
    set tournament_count = coalesce(p.tournament_count, 0) + 1,
        points = coalesce(p.points, 0) + 10
    from public.team_members tm
    join public.tournament_team_registrations ttr
      on ttr.team_id = tm.team_id
    where ttr.tournament_id = new.id
      and (ttr.payment_status = 'paid' or v_free)
      and tm.user_id = p.id;

  -- Champion bonus from the final completed match.
  select winner_id into v_final
    from public.tournament_matches
    where tournament_id = new.id
      and status = 'completed'
      and winner_id is not null
    order by round desc, match_number desc
    limit 1;

  if found and v_final.winner_id is not null then
    if v_final.winner_id ~* uuid_re then
      update public.profiles
        set points = coalesce(points, 0) + 100
        where id = v_final.winner_id::uuid;
    elsif v_final.winner_id ~ int_re then
      update public.profiles p
        set points = coalesce(p.points, 0) + 100
        from public.team_members tm
        where tm.team_id = v_final.winner_id::int
          and tm.user_id = p.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tournament_completion_stats on public.tournaments;
create trigger trg_tournament_completion_stats
  after update on public.tournaments
  for each row
  when (new.status = 'completed' and old.status is distinct from 'completed')
  execute function public.apply_tournament_completion_stats();

commit;

notify pgrst, 'reload schema';

-- Sanity checks (run separately):
--   select tgname from pg_trigger where tgrelid = 'public.tournament_matches'::regclass;
--   select tgname from pg_trigger where tgrelid = 'public.tournaments'::regclass;
