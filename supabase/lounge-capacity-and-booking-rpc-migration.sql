-- ================================================================
-- Lounge capacity correction + transactional booking creation
-- ----------------------------------------------------------------
-- Source of truth:
--   main = 6 stations
--   vr   = 2 players per slot
--   vip  = 1 private ticket per slot
--
-- The old idx_unique_booking_slot index allowed only one confirmed
-- booking per zone/date/time/status, which blocked multi-station zones.
-- This migration removes that index and replaces API count-then-insert
-- with a DB function that locks each zone/date/time slot before counting.
-- ================================================================

update zones
set capacity = case id
  when 'main' then 6
  when 'vr' then 2
  when 'vip' then 1
  else capacity
end,
description = case id
  when 'main' then '6-player gaming arena with PS4 consoles'
  when 'vr' then 'Immersive virtual reality for up to 2 players'
  when 'vip' then 'Private PS5 space for one ticket at a time'
  else description
end
where id in ('main', 'vr', 'vip');

drop index if exists idx_unique_booking_slot;

create or replace function public.create_booking_with_capacity(
  p_user_id uuid,
  p_zone_id text,
  p_game_id integer,
  p_booking_date date,
  p_time_slot text,
  p_duration integer,
  p_drinks jsonb,
  p_session_total integer,
  p_drinks_total integer,
  p_total integer,
  p_payment_method text
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_booked_count integer;
  v_booking public.bookings;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_zone_id || '|' || p_booking_date::text || '|' || p_time_slot, 0)
  );

  select capacity
    into v_capacity
    from public.zones
    where id = p_zone_id;

  if v_capacity is null then
    raise exception 'Zone not found' using errcode = 'P0001';
  end if;

  select count(*)
    into v_booked_count
    from public.bookings
    where zone_id = p_zone_id
      and booking_date = p_booking_date
      and time_slot = p_time_slot
      and status <> 'cancelled';

  if v_booked_count >= v_capacity then
    raise exception 'Time slot is full' using errcode = 'P0001';
  end if;

  insert into public.bookings (
    user_id,
    zone_id,
    game_id,
    booking_date,
    time_slot,
    duration,
    drinks,
    session_total,
    drinks_total,
    total,
    payment_method,
    payment_status,
    status
  )
  values (
    p_user_id,
    p_zone_id,
    p_game_id,
    p_booking_date,
    p_time_slot,
    p_duration,
    coalesce(p_drinks, '{}'::jsonb),
    p_session_total,
    p_drinks_total,
    p_total,
    p_payment_method,
    'pending',
    'confirmed'
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

revoke all on function public.create_booking_with_capacity(
  uuid,
  text,
  integer,
  date,
  text,
  integer,
  jsonb,
  integer,
  integer,
  integer,
  text
) from public;

grant execute on function public.create_booking_with_capacity(
  uuid,
  text,
  integer,
  date,
  text,
  integer,
  jsonb,
  integer,
  integer,
  integer,
  text
) to service_role;
