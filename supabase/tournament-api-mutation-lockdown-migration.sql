-- ================================================================
-- Tournament mutation lockdown
-- ----------------------------------------------------------------
-- Tournament match actions now go through:
--   - POST /api/tournament-matches/[id]
--   - POST /api/tournaments/[id]/bracket
--
-- Those routes authenticate the actor, validate the action payload, verify
-- participant/host/admin access, and write through the service role. Browser
-- clients should only read bracket state directly.
--
-- This closes the old participant UPDATE policy that allowed a match
-- participant to update an entire tournament_matches row from the browser.
-- ================================================================

drop policy if exists "Participants can update match scores"
  on public.tournament_matches;

-- Keep SELECT policies intact, but remove browser mutation privileges.
revoke insert, update, delete on table public.tournament_matches
  from anon, authenticated;

revoke insert, update, delete on table public.match_disputes
  from anon, authenticated;
