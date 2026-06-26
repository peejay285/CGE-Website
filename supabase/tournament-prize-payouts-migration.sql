-- ================================================================
-- Tournament prize payout automation foundation
-- ----------------------------------------------------------------
-- Adds:
--   1. Payout configuration on tournaments.
--   2. Prize placement records for winners/runner-up/etc.
--   3. Payout ledger rows tied to paid registration money.
--   4. RPCs for hosts/admins to assign placements, generate payout
--      drafts, and approve payout drafts for CGE admin release.
-- ================================================================

alter table public.tournaments
  add column if not exists prize_pool_total integer not null default 0,
  add column if not exists payout_status text not null default 'not_ready',
  add column if not exists payout_distribution jsonb not null default
    '[{"place":1,"label":"1st Place","percent":60},{"place":2,"label":"2nd Place","percent":25},{"place":3,"label":"3rd Place","percent":15}]'::jsonb,
  add column if not exists platform_fee_percent numeric(5,2) not null default 0,
  add column if not exists payout_locked_at timestamptz,
  add column if not exists payout_released_at timestamptz;

alter table public.profiles
  add column if not exists payout_recipient_code text,
  add column if not exists payout_account_name text,
  add column if not exists payout_bank_name text,
  add column if not exists payout_account_last4 text,
  add column if not exists payout_profile_verified_at timestamptz;

create table if not exists public.tournament_prize_placements (
  id uuid default gen_random_uuid() primary key,
  tournament_id integer references public.tournaments(id) on delete cascade not null,
  placement integer not null check (placement >= 1 and placement <= 16),
  user_id uuid references public.profiles(id) not null,
  source text not null default 'manual',
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  unique(tournament_id, placement),
  unique(tournament_id, user_id)
);

create table if not exists public.tournament_payouts (
  id uuid default gen_random_uuid() primary key,
  tournament_id integer references public.tournaments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  placement integer not null check (placement >= 1 and placement <= 16),
  percentage numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  gross_amount integer not null check (gross_amount >= 0),
  platform_fee_amount integer not null default 0 check (platform_fee_amount >= 0),
  net_amount integer not null check (net_amount >= 0),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'processing', 'paid', 'failed', 'cancelled')),
  paystack_transfer_reference text unique,
  paystack_transfer_code text,
  processed_at timestamptz,
  generated_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tournament_id, placement),
  unique(tournament_id, user_id)
);

create index if not exists idx_tournament_payouts_tournament
  on public.tournament_payouts(tournament_id);
create index if not exists idx_tournament_payouts_user
  on public.tournament_payouts(user_id);
create index if not exists idx_tournament_payouts_status
  on public.tournament_payouts(status);
create index if not exists idx_tournament_placements_tournament
  on public.tournament_prize_placements(tournament_id);

alter table public.tournament_prize_placements enable row level security;
alter table public.tournament_payouts enable row level security;

drop policy if exists "Tournament placements are viewable" on public.tournament_prize_placements;
create policy "Tournament placements are viewable"
  on public.tournament_prize_placements for select
  using (true);

drop policy if exists "Tournament payout rows viewable by parties" on public.tournament_payouts;
create policy "Tournament payout rows viewable by parties"
  on public.tournament_payouts for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.tournaments t
      where t.id = tournament_payouts.tournament_id
        and t.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_admin = true
    )
  );

create or replace function public.can_manage_tournament_payouts(p_tournament_id integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = p_tournament_id
      and t.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  );
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
    from public.tournament_payouts
    where tournament_id = p_tournament_id
      and status in ('approved', 'processing', 'paid')
  ) then
    raise exception 'Payouts are already approved or released' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.tournament_registrations
    where tournament_id = p_tournament_id
      and user_id = p_user_id
      and payment_status = 'paid'
  ) then
    raise exception 'Player does not have a paid registration for this tournament' using errcode = 'P0001';
  end if;

  insert into public.tournament_prize_placements (
    tournament_id,
    placement,
    user_id,
    source,
    assigned_by,
    assigned_at
  )
  values (
    p_tournament_id,
    p_placement,
    p_user_id,
    'manual',
    auth.uid(),
    now()
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

create or replace function public.prepare_tournament_payouts(p_tournament_id integer)
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
    raise exception 'Tournament must be completed before payouts are generated' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.tournament_payouts
    where tournament_payouts.tournament_id = p_tournament_id
      and tournament_payouts.status in ('approved', 'processing', 'paid')
  ) then
    raise exception 'Payouts are already approved or released' using errcode = 'P0001';
  end if;

  select coalesce(sum(total), 0)
    into v_pool
    from public.tournament_registrations
    where tournament_registrations.tournament_id = p_tournament_id
      and payment_status = 'paid';

  if v_pool <= 0 then
    update public.tournaments
      set prize_pool_total = 0,
          payout_status = 'no_paid_pool'
      where id = p_tournament_id;
    raise exception 'No paid prize pool available' using errcode = 'P0001';
  end if;

  if to_regclass('public.tournament_matches') is not null then
    select *
      into v_final_match
      from public.tournament_matches
      where tournament_matches.tournament_id = p_tournament_id
        and status = 'completed'
        and winner_id is not null
      order by round desc, completed_at desc nulls last, id desc
      limit 1;

    if found and v_final_match.winner_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      insert into public.tournament_prize_placements (
        tournament_id,
        placement,
        user_id,
        source,
        assigned_by
      )
      values (
        p_tournament_id,
        1,
        v_final_match.winner_id::uuid,
        'bracket_final',
        auth.uid()
      )
      on conflict (tournament_id, placement) do nothing;
    end if;

    if found and v_final_match.loser_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      insert into public.tournament_prize_placements (
        tournament_id,
        placement,
        user_id,
        source,
        assigned_by
      )
      values (
        p_tournament_id,
        2,
        v_final_match.loser_id::uuid,
        'bracket_final',
        auth.uid()
      )
      on conflict (tournament_id, placement) do nothing;
    end if;
  end if;

  delete from public.tournament_payouts
    where tournament_payouts.tournament_id = p_tournament_id
      and status in ('pending_review', 'cancelled');

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
    v_fee := floor((v_gross::numeric * greatest(v_tournament.platform_fee_percent, 0)) / 100)::integer;
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
        payout_status = case when v_count > 0 then 'pending_review' else 'needs_placements' end,
        payout_locked_at = null,
        payout_released_at = null
    where id = p_tournament_id;

  return query
    select
      p_tournament_id,
      v_pool,
      v_allocated,
      v_count,
      case when v_count > 0 then 'pending_review' else 'needs_placements' end;
end;
$$;

create or replace function public.approve_tournament_payouts(p_tournament_id integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.can_manage_tournament_payouts(p_tournament_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
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

create or replace function public.mark_tournament_payout_paid(
  p_payout_id uuid,
  p_transfer_reference text default null,
  p_notes text default null
)
returns public.tournament_payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.tournament_payouts;
  v_remaining integer;
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  ) then
    raise exception 'Admin access required' using errcode = 'P0001';
  end if;

  update public.tournament_payouts
    set status = 'paid',
        paystack_transfer_reference = coalesce(p_transfer_reference, paystack_transfer_reference),
        processed_at = now(),
        notes = coalesce(p_notes, notes),
        updated_at = now()
    where id = p_payout_id
      and status in ('approved', 'processing')
    returning * into v_row;

  if v_row.id is null then
    raise exception 'Payout not found or not payable' using errcode = 'P0001';
  end if;

  select count(*)
    into v_remaining
    from public.tournament_payouts
    where tournament_id = v_row.tournament_id
      and status <> 'paid';

  if v_remaining = 0 then
    update public.tournaments
      set payout_status = 'paid',
          payout_released_at = now()
      where id = v_row.tournament_id;
  end if;

  return v_row;
end;
$$;

revoke all on function public.can_manage_tournament_payouts(integer) from public;
revoke all on function public.set_tournament_prize_placement(integer, integer, uuid) from public;
revoke all on function public.prepare_tournament_payouts(integer) from public;
revoke all on function public.approve_tournament_payouts(integer) from public;
revoke all on function public.mark_tournament_payout_paid(uuid, text, text) from public;

grant execute on function public.can_manage_tournament_payouts(integer) to authenticated;
grant execute on function public.set_tournament_prize_placement(integer, integer, uuid) to authenticated;
grant execute on function public.prepare_tournament_payouts(integer) to authenticated;
grant execute on function public.approve_tournament_payouts(integer) to authenticated;
grant execute on function public.mark_tournament_payout_paid(uuid, text, text) to authenticated;
