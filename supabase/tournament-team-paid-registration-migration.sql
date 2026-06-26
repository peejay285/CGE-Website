-- ================================================================
-- Tournament team paid registration + slot-safe signup
-- ----------------------------------------------------------------
-- Makes team tournaments first-class in checkout:
--   1. Stores payable totals on team registrations.
--   2. Lets captains reserve one team slot through a locked RPC.
--   3. Supports free team events without Paystack.
--   4. Allows the payment route to stamp the Paystack reference.
--
-- Note: tournament.entry_fee is treated as the team entry fee for now.
-- ================================================================

alter table public.tournament_team_registrations
  add column if not exists total integer not null default 0,
  add column if not exists payment_method text not null default 'paystack',
  add column if not exists paid_at timestamptz;

create index if not exists idx_tournament_team_registrations_tournament
  on public.tournament_team_registrations(tournament_id);

create index if not exists idx_tournament_team_registrations_team
  on public.tournament_team_registrations(team_id);

drop policy if exists "Team registration owner can update payment reference"
  on public.tournament_team_registrations;
create policy "Team registration owner can update payment reference"
  on public.tournament_team_registrations for update
  using (registered_by = auth.uid())
  with check (registered_by = auth.uid());

drop policy if exists "Team captains can delete own registrations"
  on public.tournament_team_registrations;
create policy "Team captains can delete own registrations"
  on public.tournament_team_registrations for delete
  using (
    exists (
      select 1
      from public.teams t
      where t.id = tournament_team_registrations.team_id
        and t.captain_id = auth.uid()
    )
  );

create or replace function public.create_tournament_team_registration_with_payment(
  p_tournament_id integer,
  p_team_id integer,
  p_registered_by uuid
)
returns public.tournament_team_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_team public.teams;
  v_registration public.tournament_team_registrations;
  v_registration_count integer;
  v_member_count integer;
  v_team_size integer;
  v_entry_fee integer;
begin
  if auth.uid() is distinct from p_registered_by then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('tournament-team|' || p_tournament_id::text, 0)
  );

  select *
    into v_tournament
    from public.tournaments
    where id = p_tournament_id;

  if v_tournament.id is null then
    raise exception 'Tournament not found' using errcode = 'P0001';
  end if;

  if v_tournament.status <> 'open' then
    raise exception 'Tournament is not open for registration' using errcode = 'P0001';
  end if;

  v_team_size := greatest(coalesce(v_tournament.team_size, 1), 1);
  if v_team_size <= 1 then
    raise exception 'Tournament is not a team event' using errcode = 'P0001';
  end if;

  select *
    into v_team
    from public.teams
    where id = p_team_id;

  if v_team.id is null then
    raise exception 'Team not found' using errcode = 'P0001';
  end if;

  if v_team.captain_id is distinct from p_registered_by then
    raise exception 'Only the team captain can register this team' using errcode = 'P0001';
  end if;

  select count(*)
    into v_member_count
    from public.team_members
    where team_id = p_team_id;

  if v_member_count < v_team_size then
    raise exception 'Team does not have enough members for this tournament' using errcode = 'P0001';
  end if;

  select *
    into v_registration
    from public.tournament_team_registrations
    where tournament_id = p_tournament_id
      and team_id = p_team_id;

  if v_registration.id is not null then
    return v_registration;
  end if;

  select count(*)
    into v_registration_count
    from public.tournament_team_registrations
    where tournament_id = p_tournament_id
      and payment_status in ('pending', 'paid', 'free');

  if v_registration_count >= v_tournament.slots then
    raise exception 'Tournament is full' using errcode = 'P0001';
  end if;

  v_entry_fee := greatest(coalesce(v_tournament.entry_fee, 0), 0);

  insert into public.tournament_team_registrations (
    tournament_id,
    team_id,
    registered_by,
    total,
    payment_method,
    payment_status,
    paid_at
  )
  values (
    p_tournament_id,
    p_team_id,
    p_registered_by,
    v_entry_fee,
    case when v_entry_fee > 0 then 'paystack' else 'free' end,
    case when v_entry_fee > 0 then 'pending' else 'paid' end,
    case when v_entry_fee > 0 then null else now() end
  )
  returning * into v_registration;

  return v_registration;
end;
$$;

revoke all on function public.create_tournament_team_registration_with_payment(
  integer,
  integer,
  uuid
) from public;

grant execute on function public.create_tournament_team_registration_with_payment(
  integer,
  integer,
  uuid
) to authenticated;
