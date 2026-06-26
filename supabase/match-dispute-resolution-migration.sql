-- ================================================================
-- Match dispute resolution permissions
-- ----------------------------------------------------------------
-- match_disputes shipped with SELECT + INSERT policies only, so the
-- resolveDispute() flow (host/admin marking a dispute resolved or
-- dismissed) silently affected 0 rows under RLS. This migration:
--   1. Lets the tournament host or a site admin UPDATE disputes.
--   2. Extends match management so admins (not just the creator) can
--      revert/complete a match when resolving a dispute.
-- Idempotent: safe to run multiple times.
-- ================================================================

-- ─── Allow host / admin to resolve disputes ─────────────────────
drop policy if exists "Tournament host can resolve disputes" on public.match_disputes;
create policy "Tournament host can resolve disputes"
  on public.match_disputes for update
  using (
    exists (
      select 1
      from public.tournament_matches m
      join public.tournaments t on t.id = m.tournament_id
      where m.id = match_disputes.match_id
        and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1
      from public.tournament_matches m
      join public.tournaments t on t.id = m.tournament_id
      where m.id = match_disputes.match_id
        and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ─── Let admins manage matches too (host already could) ─────────
drop policy if exists "Tournament host can manage matches" on public.tournament_matches;
create policy "Tournament host can manage matches"
  on public.tournament_matches for all
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id
        and t.created_by = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
