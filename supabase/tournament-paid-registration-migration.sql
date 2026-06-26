-- ================================================================
-- Tournament paid registration + slot-safe signup
-- ----------------------------------------------------------------
-- Stores the payable entry fee on each registration and creates
-- registrations through a locked RPC so tournament slots cannot be
-- overfilled by simultaneous signups.
-- ================================================================

alter table public.tournament_registrations
  add column if not exists total integer not null default 0,
  add column if not exists payment_method text not null default 'paystack',
  add column if not exists paid_at timestamptz;

create unique index if not exists idx_tournament_registrations_unique_user
  on public.tournament_registrations(tournament_id, user_id);

create or replace function public.create_tournament_registration_with_payment(
  p_tournament_id integer,
  p_user_id uuid
)
returns public.tournament_registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_registration public.tournament_registrations;
  v_registration_count integer;
  v_entry_fee integer;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('tournament|' || p_tournament_id::text, 0)
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

  select *
    into v_registration
    from public.tournament_registrations
    where tournament_id = p_tournament_id
      and user_id = p_user_id;

  if v_registration.id is not null then
    return v_registration;
  end if;

  select count(*)
    into v_registration_count
    from public.tournament_registrations
    where tournament_id = p_tournament_id
      and payment_status in ('pending', 'paid', 'free');

  if v_registration_count >= v_tournament.slots then
    raise exception 'Tournament is full' using errcode = 'P0001';
  end if;

  v_entry_fee := greatest(coalesce(v_tournament.entry_fee, 0), 0);

  insert into public.tournament_registrations (
    tournament_id,
    user_id,
    total,
    payment_method,
    payment_status,
    paid_at
  )
  values (
    p_tournament_id,
    p_user_id,
    v_entry_fee,
    case when v_entry_fee > 0 then 'paystack' else 'free' end,
    case when v_entry_fee > 0 then 'pending' else 'paid' end,
    case when v_entry_fee > 0 then null else now() end
  )
  returning * into v_registration;

  return v_registration;
end;
$$;

revoke all on function public.create_tournament_registration_with_payment(
  integer,
  uuid
) from public;

grant execute on function public.create_tournament_registration_with_payment(
  integer,
  uuid
) to authenticated;
