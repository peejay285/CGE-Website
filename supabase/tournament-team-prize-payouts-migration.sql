-- ================================================================
-- Team-aware tournament prize payouts
-- ----------------------------------------------------------------
-- Brackets identify teams by numeric id. Paystack transfers identify a
-- verified person, so a team placement resolves to that team's captain.
-- ================================================================

create or replace function public.is_paid_tournament_prize_recipient(
  p_tournament_id integer,
  p_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_registrations registration
    where registration.tournament_id = p_tournament_id
      and registration.user_id = p_user_id
      and registration.payment_status = 'paid'
  )
  or exists (
    select 1
    from public.tournament_team_registrations registration
    join public.teams team on team.id = registration.team_id
    where registration.tournament_id = p_tournament_id
      and team.captain_id = p_user_id
      and registration.payment_status = 'paid'
  );
$$;

create or replace function public.resolve_tournament_prize_user(
  p_tournament_id integer,
  p_participant_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if p_participant_id is null then
    return null;
  end if;

  if p_participant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_user := p_participant_id::uuid;
  elsif p_participant_id ~ '^[0-9]+$' then
    select team.captain_id
      into v_user
      from public.teams team
      join public.tournament_team_registrations registration
        on registration.team_id = team.id
      where team.id = p_participant_id::integer
        and registration.tournament_id = p_tournament_id
        and registration.payment_status = 'paid'
      limit 1;
  end if;

  return v_user;
end;
$$;

create or replace function public.set_tournament_prize_placement(
  p_tournament_id integer,
  p_placement integer,
  p_user_id uuid
)
returns public.tournament_prize_placements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.tournament_prize_placements;
begin
  if not public.can_manage_tournament_payouts(p_tournament_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
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

  if not public.is_paid_tournament_prize_recipient(
    p_tournament_id,
    p_user_id
  ) then
    raise exception 'Recipient is not attached to a paid tournament registration'
      using errcode = 'P0001';
  end if;

  insert into public.tournament_prize_placements (
    tournament_id, placement, user_id, source, assigned_by, assigned_at
  )
  values (
    p_tournament_id, p_placement, p_user_id, 'manual', auth.uid(), now()
  )
  on conflict (tournament_id, placement)
  do update set
    user_id = excluded.user_id,
    source = 'manual',
    assigned_by = auth.uid(),
    assigned_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

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

    insert into public.tournament_payouts (
      tournament_id,
      user_id,
      placement,
      percentage,
      gross_amount,
      platform_fee_amount,
      net_amount,
      status,
      generated_by
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
      auth.uid()
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

revoke all on function public.is_paid_tournament_prize_recipient(integer, uuid)
  from public;
revoke all on function public.resolve_tournament_prize_user(integer, text)
  from public;
grant execute on function public.is_paid_tournament_prize_recipient(integer, uuid)
  to authenticated;
grant execute on function public.resolve_tournament_prize_user(integer, text)
  to authenticated;
