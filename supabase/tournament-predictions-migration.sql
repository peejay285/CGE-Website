-- ================================================================
-- Tournament predictions (Twitch-style channel points betting)
-- ----------------------------------------------------------------
-- Free-to-play crowd predictions on tournaments, staked with
-- PLATFORM POINTS ONLY (profiles.points). No naira anywhere in this
-- system and points are never cashable.
--
-- Adds:
--   1. tournament_predictions — one question per tournament at a time
--      (Twitch's throttle: at most one 'open'/'locked' prediction per
--      tournament, enforced by a partial unique index + advisory lock).
--   2. prediction_stakes — one stake per user per prediction,
--      10..10,000 points, no edits after placing.
--   3. RPCs for the full lifecycle: create → stake → lock → settle
--      (or cancel + refund). profiles.points is write-protected from
--      clients (see security-hardening migration), so ALL point
--      movement happens inside these SECURITY DEFINER functions.
--
-- Payout maths (documented once here, implemented in settle):
--   * Losing pool = sum of stakes on non-winning options.
--   * Each winner receives their own stake back PLUS
--       floor(losing_pool * their_stake / winning_pool).
--   * Flooring means the credited winnings can sum to slightly less
--     than the losing pool; the leftover points are intentionally
--     left unallocated (they simply vanish from circulation — points
--     are free platform currency, so no reconciliation is needed).
--   * If NOBODY staked the winning option, every stake is refunded
--     in full (same behaviour as Twitch's "no winners" outcome).
--
-- Tournament-cancel interaction (DESIGN DECISION):
--   The existing cancel_tournament RPC (tournament-cancellation-
--   refunds-migration.sql) is NOT modified or reproduced here —
--   duplicating its body would silently drift if the original is ever
--   patched. Instead we take the simpler safe path:
--     * place_prediction_stake refuses stakes once the tournament is
--       'cancelled' or 'completed', so no new points can enter a
--       prediction on a dead tournament.
--     * Hosts/admins cancel the prediction manually via
--       cancel_tournament_prediction (full refund) — the manage UI
--       surfaces this whenever the tournament is cancelled. Settling
--       remains allowed too (e.g. the result was already known).
--   Until they do, staked points are simply frozen — nothing can be
--   lost because settle/cancel are the only exits and both pay out.
--
-- Run after tournament-cancellation-refunds-migration.sql and
-- security-hardening-profiles-bookings-storage-migration.sql.
-- Idempotent.
-- ================================================================

-- ─── 1. Tables ───────────────────────────────────────────────────

create table if not exists public.tournament_predictions (
  id uuid default gen_random_uuid() primary key,
  tournament_id integer references public.tournaments(id) on delete cascade not null,
  question text not null,
  -- Array of {id: text, label: text}, 2–6 entries (validated in the RPC).
  options jsonb not null,
  status text not null default 'open'
    check (status in ('open', 'locked', 'settled', 'cancelled')),
  winning_option text,
  created_by uuid references auth.users not null,
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  settled_at timestamptz
);

create index if not exists idx_tournament_predictions_tournament
  on public.tournament_predictions(tournament_id);

-- Twitch's throttle: at most ONE open/locked prediction per tournament.
-- The create RPC also checks this, but the partial unique index makes
-- it race-proof at the database level.
create unique index if not exists uniq_active_prediction_per_tournament
  on public.tournament_predictions(tournament_id)
  where status in ('open', 'locked');

create table if not exists public.prediction_stakes (
  id uuid default gen_random_uuid() primary key,
  prediction_id uuid references public.tournament_predictions(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  option_id text not null,
  points integer not null check (points >= 10 and points <= 10000),
  created_at timestamptz not null default now(),
  -- One stake per user per prediction — no edits, no top-ups.
  unique(prediction_id, user_id)
);

create index if not exists idx_prediction_stakes_prediction
  on public.prediction_stakes(prediction_id);
create index if not exists idx_prediction_stakes_user
  on public.prediction_stakes(user_id);

-- ─── 2. RLS: public read, RPC-only writes ────────────────────────

alter table public.tournament_predictions enable row level security;
alter table public.prediction_stakes enable row level security;

-- Pool totals are part of the fun — everyone (including signed-out
-- visitors) can see the prediction and all stakes.
drop policy if exists "Predictions are viewable by everyone" on public.tournament_predictions;
create policy "Predictions are viewable by everyone"
  on public.tournament_predictions for select
  using (true);

drop policy if exists "Prediction stakes are viewable by everyone" on public.prediction_stakes;
create policy "Prediction stakes are viewable by everyone"
  on public.prediction_stakes for select
  using (true);

-- No INSERT/UPDATE/DELETE policies: every write goes through the
-- SECURITY DEFINER RPCs below. Explicit revokes (matching the
-- security-hardening style) so a future permissive policy can't
-- reopen direct writes either.
revoke insert, update, delete on table public.tournament_predictions from anon, authenticated;
revoke insert, update, delete on table public.prediction_stakes from anon, authenticated;

-- ─── 3. Helper: host-or-admin check ──────────────────────────────

create or replace function public.can_manage_tournament_prediction(p_prediction_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_predictions pr
    join public.tournaments t on t.id = pr.tournament_id
    where pr.id = p_prediction_id
      and t.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
$$;

-- ─── 4. create_tournament_prediction ─────────────────────────────
-- Host (tournaments.created_by) or admin opens a prediction. The
-- tournament must not be completed/cancelled, and there must be no
-- other open/locked prediction for it.

create or replace function public.create_tournament_prediction(
  p_tournament_id integer,
  p_question text,
  p_options jsonb
)
returns public.tournament_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_is_admin boolean;
  v_question text;
  v_count integer;
  v_item jsonb;
  v_id text;
  v_label text;
  v_ids text[] := '{}';
  v_clean jsonb := '[]'::jsonb;
  v_row public.tournament_predictions;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = 'P0001';
  end if;

  v_question := nullif(btrim(coalesce(p_question, '')), '');
  if v_question is null then
    raise exception 'A prediction question is required' using errcode = 'P0001';
  end if;

  -- Validate the options shape: jsonb array of 2–6 objects with
  -- unique non-empty text ids and non-empty labels.
  if p_options is null or jsonb_typeof(p_options) <> 'array' then
    raise exception 'Options must be a JSON array' using errcode = 'P0001';
  end if;

  v_count := jsonb_array_length(p_options);
  if v_count < 2 or v_count > 6 then
    raise exception 'Predictions need between 2 and 6 options' using errcode = 'P0001';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_options)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Each option must be an object with id and label' using errcode = 'P0001';
    end if;
    v_id := btrim(coalesce(v_item->>'id', ''));
    v_label := btrim(coalesce(v_item->>'label', ''));
    if v_id = '' or v_label = '' then
      raise exception 'Each option needs a non-empty id and label' using errcode = 'P0001';
    end if;
    if v_id = any(v_ids) then
      raise exception 'Option ids must be unique' using errcode = 'P0001';
    end if;
    v_ids := array_append(v_ids, v_id);
    v_clean := v_clean || jsonb_build_array(jsonb_build_object('id', v_id, 'label', v_label));
  end loop;

  -- Serialise concurrent creates for the same tournament.
  perform pg_advisory_xact_lock(
    hashtextextended('tournament-prediction|' || p_tournament_id::text, 0)
  );

  select * into v_tournament
    from public.tournaments
    where id = p_tournament_id;

  if v_tournament.id is null then
    raise exception 'Tournament not found' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  ) into v_is_admin;

  if not v_is_admin and v_tournament.created_by is distinct from auth.uid() then
    raise exception 'Only the tournament host or an admin can open a prediction'
      using errcode = 'P0001';
  end if;

  if v_tournament.status in ('completed', 'cancelled') then
    raise exception 'Predictions cannot be opened on a completed or cancelled tournament'
      using errcode = 'P0001';
  end if;

  -- One open/locked prediction per tournament (Twitch throttle).
  if exists (
    select 1 from public.tournament_predictions
    where tournament_id = p_tournament_id
      and status in ('open', 'locked')
  ) then
    raise exception 'This tournament already has an active prediction — settle or cancel it first'
      using errcode = 'P0001';
  end if;

  insert into public.tournament_predictions (tournament_id, question, options, created_by)
  values (p_tournament_id, v_question, v_clean, auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

-- ─── 5. place_prediction_stake ───────────────────────────────────
-- Any signed-in user (including tournament participants — points are
-- free platform currency, so this is harmless) stakes 10..10,000
-- points on one option while the prediction is 'open'. The deduction
-- from profiles.points and the stake insert are atomic: any raised
-- exception rolls both back.

create or replace function public.place_prediction_stake(
  p_prediction_id uuid,
  p_option_id text,
  p_points integer
)
returns public.prediction_stakes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prediction public.tournament_predictions;
  v_tournament_status text;
  v_updated integer;
  v_row public.prediction_stakes;
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = 'P0001';
  end if;

  if p_points is null or p_points < 10 or p_points > 10000 then
    raise exception 'Stake must be between 10 and 10,000 points' using errcode = 'P0001';
  end if;

  -- Same lock key as settle/cancel so a stake can never race a payout.
  perform pg_advisory_xact_lock(
    hashtextextended('prediction|' || p_prediction_id::text, 0)
  );

  select * into v_prediction
    from public.tournament_predictions
    where id = p_prediction_id;

  if v_prediction.id is null then
    raise exception 'Prediction not found' using errcode = 'P0001';
  end if;

  if v_prediction.status <> 'open' then
    raise exception 'Predictions are locked — no more stakes' using errcode = 'P0001';
  end if;

  -- Tournament-cancel interaction (see header): no new stakes once
  -- the tournament itself is dead.
  select status into v_tournament_status
    from public.tournaments
    where id = v_prediction.tournament_id;

  if v_tournament_status in ('completed', 'cancelled') then
    raise exception 'This tournament has ended — staking is closed' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(v_prediction.options) o
    where o->>'id' = p_option_id
  ) then
    raise exception 'That option does not exist on this prediction' using errcode = 'P0001';
  end if;

  -- Friendly pre-check; the unique(prediction_id, user_id) constraint
  -- is the real enforcement.
  if exists (
    select 1 from public.prediction_stakes
    where prediction_id = p_prediction_id and user_id = auth.uid()
  ) then
    raise exception 'You already placed a stake on this prediction' using errcode = 'P0001';
  end if;

  -- Deduct points atomically; the WHERE guard makes overdraft impossible
  -- even if the balance changed since the client last read it.
  update public.profiles
    set points = points - p_points
    where id = auth.uid()
      and points >= p_points;
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Not enough points' using errcode = 'P0001';
  end if;

  insert into public.prediction_stakes (prediction_id, user_id, option_id, points)
  values (p_prediction_id, auth.uid(), p_option_id, p_points)
  returning * into v_row;

  return v_row;
end;
$$;

-- ─── 6. lock_tournament_prediction ───────────────────────────────
-- Host/admin closes staking (open → locked). Locking an already
-- locked prediction is a no-op so double-clicks are harmless.

create or replace function public.lock_tournament_prediction(p_prediction_id uuid)
returns public.tournament_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.tournament_predictions;
begin
  if not public.can_manage_tournament_prediction(p_prediction_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('prediction|' || p_prediction_id::text, 0)
  );

  select * into v_row
    from public.tournament_predictions
    where id = p_prediction_id;

  if v_row.id is null then
    raise exception 'Prediction not found' using errcode = 'P0001';
  end if;

  if v_row.status = 'locked' then
    return v_row; -- idempotent no-op
  end if;

  if v_row.status <> 'open' then
    raise exception 'Only an open prediction can be locked' using errcode = 'P0001';
  end if;

  update public.tournament_predictions
    set status = 'locked',
        locked_at = now()
    where id = p_prediction_id
    returning * into v_row;

  return v_row;
end;
$$;

-- ─── 7. settle_tournament_prediction ─────────────────────────────
-- Host/admin picks the winning option (open or locked → settled).
--   * Winners: own stake back + floor(losing_pool * stake / winning_pool).
--     Leftover points from flooring stay unallocated (see header).
--   * No winning stakes: everyone is refunded in full.
-- Idempotent in the reject sense: settling an already settled or
-- cancelled prediction raises, so points can never be paid twice.

create or replace function public.settle_tournament_prediction(
  p_prediction_id uuid,
  p_winning_option text
)
returns public.tournament_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prediction public.tournament_predictions;
  v_winning_pool bigint;
  v_losing_pool bigint;
  v_stake record;
  v_payout integer;
begin
  if not public.can_manage_tournament_prediction(p_prediction_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  -- Same lock key as place_prediction_stake: settlement waits for any
  -- in-flight stake and vice versa.
  perform pg_advisory_xact_lock(
    hashtextextended('prediction|' || p_prediction_id::text, 0)
  );

  select * into v_prediction
    from public.tournament_predictions
    where id = p_prediction_id;

  if v_prediction.id is null then
    raise exception 'Prediction not found' using errcode = 'P0001';
  end if;

  if v_prediction.status = 'settled' then
    raise exception 'Prediction is already settled' using errcode = 'P0001';
  end if;

  if v_prediction.status = 'cancelled' then
    raise exception 'Prediction was cancelled' using errcode = 'P0001';
  end if;

  -- status is 'open' or 'locked' from here.

  if not exists (
    select 1 from jsonb_array_elements(v_prediction.options) o
    where o->>'id' = p_winning_option
  ) then
    raise exception 'That option does not exist on this prediction' using errcode = 'P0001';
  end if;

  select coalesce(sum(points), 0) into v_winning_pool
    from public.prediction_stakes
    where prediction_id = p_prediction_id
      and option_id = p_winning_option;

  select coalesce(sum(points), 0) into v_losing_pool
    from public.prediction_stakes
    where prediction_id = p_prediction_id
      and option_id <> p_winning_option;

  if v_winning_pool = 0 then
    -- Nobody backed the winner: refund every stake in full.
    for v_stake in
      select user_id, points from public.prediction_stakes
      where prediction_id = p_prediction_id
    loop
      update public.profiles
        set points = points + v_stake.points
        where id = v_stake.user_id;
    end loop;
  else
    -- Winners split the losing pool proportionally to their stake and
    -- get their own stake back. floor() rounds each share down; the
    -- flooring remainder is intentionally left unallocated.
    for v_stake in
      select user_id, points from public.prediction_stakes
      where prediction_id = p_prediction_id
        and option_id = p_winning_option
    loop
      v_payout := v_stake.points
        + floor((v_losing_pool::numeric * v_stake.points) / v_winning_pool)::integer;
      update public.profiles
        set points = points + v_payout
        where id = v_stake.user_id;
    end loop;
  end if;

  update public.tournament_predictions
    set status = 'settled',
        winning_option = p_winning_option,
        settled_at = now()
    where id = p_prediction_id
    returning * into v_prediction;

  return v_prediction;
end;
$$;

-- ─── 8. cancel_tournament_prediction ─────────────────────────────
-- Host/admin voids the prediction and refunds every stake in full
-- (open or locked → cancelled). Cancelling an already cancelled
-- prediction is a no-op; a settled one cannot be cancelled (points
-- were already paid out).
--
-- This is also the manual cleanup path when a TOURNAMENT is cancelled
-- (see the header note — cancel_tournament is deliberately untouched).

create or replace function public.cancel_tournament_prediction(p_prediction_id uuid)
returns public.tournament_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prediction public.tournament_predictions;
  v_stake record;
begin
  if not public.can_manage_tournament_prediction(p_prediction_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('prediction|' || p_prediction_id::text, 0)
  );

  select * into v_prediction
    from public.tournament_predictions
    where id = p_prediction_id;

  if v_prediction.id is null then
    raise exception 'Prediction not found' using errcode = 'P0001';
  end if;

  if v_prediction.status = 'cancelled' then
    return v_prediction; -- idempotent no-op
  end if;

  if v_prediction.status = 'settled' then
    raise exception 'A settled prediction cannot be cancelled' using errcode = 'P0001';
  end if;

  for v_stake in
    select user_id, points from public.prediction_stakes
    where prediction_id = p_prediction_id
  loop
    update public.profiles
      set points = points + v_stake.points
      where id = v_stake.user_id;
  end loop;

  update public.tournament_predictions
    set status = 'cancelled'
    where id = p_prediction_id
    returning * into v_prediction;

  return v_prediction;
end;
$$;

-- ─── 9. Grants ───────────────────────────────────────────────────

revoke all on function public.can_manage_tournament_prediction(uuid) from public;
revoke all on function public.create_tournament_prediction(integer, text, jsonb) from public;
revoke all on function public.place_prediction_stake(uuid, text, integer) from public;
revoke all on function public.lock_tournament_prediction(uuid) from public;
revoke all on function public.settle_tournament_prediction(uuid, text) from public;
revoke all on function public.cancel_tournament_prediction(uuid) from public;

grant execute on function public.can_manage_tournament_prediction(uuid) to authenticated;
grant execute on function public.create_tournament_prediction(integer, text, jsonb) to authenticated;
grant execute on function public.place_prediction_stake(uuid, text, integer) to authenticated;
grant execute on function public.lock_tournament_prediction(uuid) to authenticated;
grant execute on function public.settle_tournament_prediction(uuid, text) to authenticated;
grant execute on function public.cancel_tournament_prediction(uuid) to authenticated;
