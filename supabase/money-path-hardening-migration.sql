-- ═══════════════════════════════════════════════════════════════════
-- MONEY-PATH HARDENING (Deep Dive P0-A, 3 Sept 2026)
-- Run AFTER deploying the matching code (initialize route now stamps
-- paystack_reference with the service role, so no client policy is
-- needed for it anymore).
--
-- Fixes:
--  B3 — team captains could UPDATE their registration rows without
--       column scoping (self-mark payment_status='paid', inflate
--       totals → fake entries + inflated prize pools).
--  U1/E2 — paid registrations (solo + team) could be hard-deleted by
--       their owner, erasing the payment record and silently
--       shrinking the prize pool.
-- ═══════════════════════════════════════════════════════════════════

begin;

-- ── B3: close the client UPDATE hole on team registrations ─────────
-- This policy existed so captains could stamp the Paystack reference
-- from the browser; stamping is now done server-side with the service
-- role, so client UPDATE is no longer needed at all.
drop policy if exists "Team registration owner can update payment reference"
  on public.tournament_team_registrations;

revoke update on table public.tournament_team_registrations
  from anon, authenticated;

-- ── U1: paid entries can no longer be self-deleted ─────────────────
-- Solo registrations
drop policy if exists "Users can delete own registrations"
  on public.tournament_registrations;
create policy "Users can delete own unpaid registrations"
  on public.tournament_registrations for delete
  using (
    auth.uid() = user_id
    and coalesce(payment_status, 'unpaid') <> 'paid'
  );

-- Team registrations
drop policy if exists "Team captains can delete own registrations"
  on public.tournament_team_registrations;
create policy "Team captains can delete own unpaid registrations"
  on public.tournament_team_registrations for delete
  using (
    registered_by = auth.uid()
    and coalesce(payment_status, 'unpaid') <> 'paid'
  );

commit;

notify pgrst, 'reload schema';

-- Sanity checks (run separately, should all return rows / expected values):
--   select policyname, cmd from pg_policies
--     where tablename in ('tournament_registrations','tournament_team_registrations');
--   select privilege_type from information_schema.role_table_grants
--     where table_name = 'tournament_team_registrations'
--       and grantee = 'authenticated';  -- must NOT include UPDATE
