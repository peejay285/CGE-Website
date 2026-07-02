-- ================================================================
-- Payout approval hardening
-- ----------------------------------------------------------------
-- Run after tournament-prize-payouts-migration.sql and
-- tournament-team-prize-payouts-migration.sql. Idempotent.
--
-- Closes two fraud gaps in the tournament payout flow:
--
--   1. approve_tournament_payouts: can_manage_tournament_payouts()
--      lets the tournament HOST approve the payout draft for their
--      own tournament. For tournaments with real money at stake
--      (paid entry fee / collected prize pool) approval is now
--      admin-only. Hosts may still approve free tournaments. The
--      function signature is unchanged so app code keeps working.
--
--   2. prepare_tournament_payouts: a host could assign themselves a
--      placement and generate a payout to themselves. Design choice:
--      we FLAG rather than BLOCK — hosts legitimately compete in and
--      win community tournaments, so blocking would break real use.
--      Each payout row now carries host_is_payee, set when the payee
--      resolves to tournaments.created_by. Flagged drafts always
--      require admin approval (regardless of entry fee), the flag is
--      surfaced in the admin release UI, and release itself was
--      already admin-only.
-- ================================================================

alter table public.tournament_payouts
  add column if not exists host_is_payee boolean not null default false;

-- Backfill any existing rows where the payee is the tournament host.
update public.tournament_payouts payout
  set host_is_payee = true
  from public.tournaments t
  where t.id = payout.tournament_id
    and payout.user_id = t.created_by
    and payout.host_is_payee = false;

-- ----------------------------------------------------------------
-- prepare_tournament_payouts — same body as the team-aware variant
-- in tournament-team-prize-payouts-migration.sql, plus the
-- host_is_payee flag on every generated row.
-- ----------------------------------------------------------------
create or replace function public.prepare_tournament_payouts(
  p_tournament_id integer
)
returns table (
  tournament_id integer,
  prize_pool_total integer,
  allocated_total integer,
  payout_count integer,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_pool integer;
  v_allocated integer := 0;
  v_count integer := 0;
  v_item jsonb;
  v_place integer;
  v_percent numeric(5,2);
  v_user_id uuid;
  v_gross integer;
  v_fee integer;
  v_net integer;
  v_host_is_payee boolean;
  v_final_match record;
begin
  if not public.can_manage_tournament_payouts(p_tournament_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('tournament-payout|' || p_tournament_id::text, 0)
  );

  select *
    into v_tournament
    from public.tournaments
    where id = p_tournament_id;

  if v_tournament.id is null then
    raise exception 'Tournament not found' using errcode = 'P0001';
  end if;
  if v_tournament.status <> 'completed' then
    raise exception 'Tournament must be completed before payouts are generated'
      using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.tournament_payouts payout
    where payout.tournament_id = p_tournament_id
      and payout.status in ('approved', 'processing', 'paid')
  ) then
    raise exception 'Payouts are already approved or released'
      using errcode = 'P0001';
  end if;

  select
    coalesce((
      select sum(registration.total)
      from public.tournament_registrations registration
      where registration.tournament_id = p_tournament_id
        and registration.payment_status = 'paid'
    ), 0)
    +
    coalesce((
      select sum(registration.total)
      from public.tournament_team_registrations registration
      where registration.tournament_id = p_tournament_id
        and registration.payment_status = 'paid'
    ), 0)
    into v_pool;

  if v_pool <= 0 then
    update public.tournaments
      set prize_pool_total = 0,
          payout_status = 'no_paid_pool'
      where id = p_tournament_id;
    raise exception 'No paid prize pool available' using errcode = 'P0001';
  end if;

  select *
    into v_final_match
    from public.tournament_matches tm
    where tm.tournament_id = p_tournament_id
      and tm.status = 'completed'
      and tm.winner_id is not null
    order by tm.round desc, tm.completed_at desc nulls last, tm.id desc
    limit 1;

  if found then
    v_user_id := public.resolve_tournament_prize_user(
      p_tournament_id,
      v_final_match.winner_id
    );
    if v_user_id is not null then
      insert into public.tournament_prize_placements (
        tournament_id, placement, user_id, source, assigned_by
      )
      values (
        p_tournament_id, 1, v_user_id, 'bracket_final', auth.uid()
      )
      on conflict (tournament_id, placement) do nothing;
    end if;

    v_user_id := public.resolve_tournament_prize_user(
      p_tournament_id,
      v_final_match.loser_id
    );
    if v_user_id is not null then
      insert into public.tournament_prize_placements (
        tournament_id, placement, user_id, source, assigned_by
      )
      values (
        p_tournament_id, 2, v_user_id, 'bracket_final', auth.uid()
      )
      on conflict (tournament_id, placement) do nothing;
    end if;
  end if;

  delete from public.tournament_payouts payout
    where payout.tournament_id = p_tournament_id
      and payout.status in ('pending_review', 'cancelled');

  for v_item in
    select value
    from jsonb_array_elements(v_tournament.payout_distribution)
  loop
    v_place := coalesce((v_item->>'place')::integer, 0);
    v_percent := coalesce((v_item->>'percent')::numeric, 0);
    if v_place < 1 or v_percent <= 0 then
      continue;
    end if;

    select placement.user_id
      into v_user_id
      from public.tournament_prize_placements placement
      where placement.tournament_id = p_tournament_id
        and placement.placement = v_place;
    if v_user_id is null then
      continue;
    end if;

    v_gross := floor((v_pool::numeric * v_percent) / 100)::integer;
    v_fee := floor(
      (v_gross::numeric * greatest(v_tournament.platform_fee_percent, 0)) / 100
    )::integer;
    v_net := greatest(v_gross - v_fee, 0);
    if v_net <= 0 then
      continue;
    end if;

    -- Fraud flag: the payee is the tournament host. The draft is
    -- still generated (hosts can legitimately win), but the row is
    -- marked so approval is forced through an admin and the release
    -- UI shows a warning.
    v_host_is_payee := coalesce(v_user_id = v_tournament.created_by, false);
    if v_host_is_payee then
      raise notice 'Tournament % payout for place % goes to the tournament host (%)',
        p_tournament_id, v_place, v_user_id;
    end if;

    insert into public.tournament_payouts (
      tournament_id,
      user_id,
      placement,
      percentage,
      gross_amount,
      platform_fee_amount,
      net_amount,
      status,
      generated_by,
      host_is_payee
    )
    values (
      p_tournament_id,
      v_user_id,
      v_place,
      v_percent,
      v_gross,
      v_fee,
      v_net,
      'pending_review',
      auth.uid(),
      v_host_is_payee
    );
    v_allocated := v_allocated + v_gross;
    v_count := v_count + 1;
  end loop;

  update public.tournaments
    set prize_pool_total = v_pool,
        payout_status = case
          when v_count > 0 then 'pending_review'
          else 'needs_placements'
        end,
        payout_locked_at = null,
        payout_released_at = null
    where id = p_tournament_id;

  return query
    select
      p_tournament_id,
      v_pool,
      v_allocated,
      v_count,
      case
        when v_count > 0 then 'pending_review'
        else 'needs_placements'
      end;
end;
$$;

-- ----------------------------------------------------------------
-- approve_tournament_payouts — signature unchanged. Hosts may still
-- approve free tournaments; anything with money at stake (paid entry
-- fee, collected prize pool, or a host-is-payee draft row) requires
-- a CGE admin.
-- ----------------------------------------------------------------
create or replace function public.approve_tournament_payouts(p_tournament_id integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_tournament public.tournaments;
  v_is_admin boolean;
  v_requires_admin boolean;
begin
  if not public.can_manage_tournament_payouts(p_tournament_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  select *
    into v_tournament
    from public.tournaments
    where id = p_tournament_id;

  if v_tournament.id is null then
    raise exception 'Tournament not found' using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  ) into v_is_admin;

  v_requires_admin :=
    coalesce(v_tournament.entry_fee, 0) > 0
    or coalesce(v_tournament.prize_pool_total, 0) > 0
    or exists (
      select 1
      from public.tournament_payouts payout
      where payout.tournament_id = p_tournament_id
        and payout.status = 'pending_review'
        and payout.host_is_payee = true
    );

  if v_requires_admin and not v_is_admin then
    raise exception 'Admin approval required for paid tournament payouts'
      using errcode = 'P0001';
  end if;

  update public.tournament_payouts
    set status = 'approved',
        approved_by = auth.uid(),
        approved_at = now(),
        updated_at = now()
    where tournament_id = p_tournament_id
      and status = 'pending_review';

  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'No payout draft to approve' using errcode = 'P0001';
  end if;

  update public.tournaments
    set payout_status = 'approved',
        payout_locked_at = now()
    where id = p_tournament_id;

  return v_count;
end;
$$;

revoke all on function public.prepare_tournament_payouts(integer) from public;
revoke all on function public.approve_tournament_payouts(integer) from public;

grant execute on function public.prepare_tournament_payouts(integer) to authenticated;
grant execute on function public.approve_tournament_payouts(integer) to authenticated;
