-- ================================================================
-- Booking receipt token hardening
-- ----------------------------------------------------------------
-- Public receipt URLs should not be bearer-by-booking-UUID alone.
-- This adds an unguessable token used by QR/SMS receipt links while
-- keeping owners and admins able to view their own receipts when signed in.
--
-- Run AFTER the base bookings table exists. Idempotent.
-- ================================================================

alter table public.bookings
  add column if not exists receipt_token text;

update public.bookings
set receipt_token = encode(gen_random_bytes(24), 'hex')
where receipt_token is null;

alter table public.bookings
  alter column receipt_token set default encode(gen_random_bytes(24), 'hex');

alter table public.bookings
  alter column receipt_token set not null;

create unique index if not exists idx_bookings_receipt_token
  on public.bookings(receipt_token);

-- Clients may read their own receipt token through the existing owner
-- SELECT policy, but should never write it.
revoke update (receipt_token) on public.bookings from anon, authenticated;

-- Helps server-side beta abuse checks for active reservation counts.
create index if not exists idx_bookings_user_active_future
  on public.bookings(user_id, booking_date)
  where status <> 'cancelled';
