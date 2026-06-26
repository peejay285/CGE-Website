-- ================================================================
-- Bookings insert lockdown
-- ----------------------------------------------------------------
-- After this migration, only the service role (used by
-- POST /api/bookings/create) can insert into `bookings`. The browser
-- client cannot. This closes the price-tampering exploit where a
-- malicious user could insert a booking with a fake `total = 1` and
-- then pay ₦1 for a ₦20,000 session.
--
-- The server route now recomputes session_total / drinks_total / total
-- from authoritative pricing (lib/pricing.ts) before inserting.
--
-- Rollback: re-run the original `Authenticated users can create bookings`
-- policy from supabase/migration.sql lines 127–128.
-- ================================================================

drop policy if exists "Authenticated users can create bookings" on public.bookings;

-- RLS deny-by-default is the main protection once the INSERT policy is gone.
-- Revoke the table-level browser grant as a second lock so future policy
-- edits cannot accidentally reopen client-side booking inserts.
revoke insert on table public.bookings from anon, authenticated;

-- Belt-and-braces: a CHECK constraint that pins the table-level invariant
-- regardless of who inserts. Even if a future migration accidentally
-- re-grants insert to authenticated users, the totals must add up.
alter table public.bookings
  drop constraint if exists bookings_total_matches;

alter table public.bookings
  add constraint bookings_total_matches
  check (total = session_total + drinks_total);

-- Confirm: only service role can insert. (RLS still enabled, the
-- update/select policies remain — see migration.sql.)
