-- ================================================================
-- DURATION-AWARE AVAILABILITY
-- ----------------------------------------------------------------
-- Fixes two related booking bugs:
--
--  1. Overbooking: capacity checks only counted bookings whose
--     time_slot string matched exactly. A 4-hour booking starting at
--     1:00 PM did not block 2:00–4:00 PM. Both the booking RPC and the
--     client-side availability display had this hole.
--
--  2. Wrong availability display: the booking form counted bookings
--     with the browser client, but RLS only returns the caller's OWN
--     bookings — so "slot full" indicators were based on a fraction of
--     real bookings. New SECURITY DEFINER `get_slot_availability` RPC
--     returns aggregate per-hour counts (no personal data) to any
--     caller.
--
-- VR sessions are 15 minutes (max 4 per booking = 1 hour), so a VR
-- booking always occupies exactly its one starting slot.
--
-- Run AFTER lounge-capacity-and-booking-rpc-migration.sql. Idempotent.
-- ================================================================

-- ─── Helper: parse "10:00 AM" / "1:00 PM" → 24h hour ────────────
create or replace function public.slot_to_hour(p_slot text)
returns integer
language sql
immutable
as $$
  select case
    when p_slot ~* '^12:\d{2}\s*AM' then 0
    when p_slot ~* '^12:\d{2}\s*PM' then 12
    when p_slot ~* 'PM\s*$' then split_part(p_slot, ':', 1)::integer + 12
    else split_part(p_slot, ':', 1)::integer
  end;
$$;

-- ─── Overlap-aware booking creation (same signature as before) ──
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
  v_start integer;
  v_len integer;
  v_hour integer;
begin
  -- Lock per zone+date (not per slot) so overlapping bookings serialize.
  perform pg_advisory_xact_lock(
    hashtextextended(p_zone_id || '|' || p_booking_date::text, 0)
  );

  select capacity
    into v_capacity
    from public.zones
    where id = p_zone_id;

  if v_capacity is null then
    raise exception 'Zone not found' using errcode = 'P0001';
  end if;

  v_start := public.slot_to_hour(p_time_slot);
  v_len := case when p_zone_id = 'vr' then 1 else greatest(coalesce(p_duration, 1), 1) end;

  -- Every hour the new booking spans must have a free station.
  for v_hour in v_start..(v_start + v_len - 1) loop
    select count(*)
      into v_booked_count
      from public.bookings b
      where b.zone_id = p_zone_id
        and b.booking_date = p_booking_date
        and b.status <> 'cancelled'
        and public.slot_to_hour(b.time_slot) <= v_hour
        and v_hour < public.slot_to_hour(b.time_slot)
              + (case when b.zone_id = 'vr' then 1 else greatest(coalesce(b.duration, 1), 1) end);

    if v_booked_count >= v_capacity then
      raise exception 'Time slot is full' using errcode = 'P0001';
    end if;
  end loop;

  insert into public.bookings (
    user_id, zone_id, game_id, booking_date, time_slot, duration,
    drinks, session_total, drinks_total, total,
    payment_method, payment_status, status
  )
  values (
    p_user_id, p_zone_id, p_game_id, p_booking_date, p_time_slot, p_duration,
    coalesce(p_drinks, '{}'::jsonb), p_session_total, p_drinks_total, p_total,
    p_payment_method, 'pending', 'confirmed'
  )
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ─── Public availability: aggregate per-hour booked counts ──────
create or replace function public.get_slot_availability(
  p_zone_id text,
  p_booking_date date
)
returns table (slot_hour integer, booked_count bigint, capacity integer)
language sql
stable
security definer
set search_path = public
as $$
  with z as (
    select z.capacity from public.zones z where z.id = p_zone_id
  ),
  b as (
    select
      public.slot_to_hour(time_slot) as start_hour,
      case when zone_id = 'vr' then 1 else greatest(coalesce(duration, 1), 1) end as dur
    from public.bookings
    where zone_id = p_zone_id
      and booking_date = p_booking_date
      and status <> 'cancelled'
  )
  select
    h as slot_hour,
    count(b.start_hour) as booked_count,
    (select capacity from z) as capacity
  from generate_series(9, 21) as h
  left join b on h >= b.start_hour and h < b.start_hour + b.dur
  group by h
  order by h;
$$;

revoke all on function public.get_slot_availability(text, date) from public;
grant execute on function public.get_slot_availability(text, date) to anon, authenticated;
