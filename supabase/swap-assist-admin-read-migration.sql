-- ================================================================
-- Admin read access for the CGE-assisted swap staff queue
-- ----------------------------------------------------------------
-- Adds permissive admin SELECT policies (combined with the existing
-- party-only policies via OR) so staff can see every assisted swap and
-- its payment shares in /admin/swap-assist. Completion still runs
-- through complete_swap_assistance(), which already allows admins.
-- Idempotent: safe to run multiple times.
-- ================================================================

drop policy if exists "Admins can view all assist payments" on public.swap_assist_payments;
create policy "Admins can view all assist payments"
  on public.swap_assist_payments for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists "Admins can view all swap proposals" on public.swap_proposals;
create policy "Admins can view all swap proposals"
  on public.swap_proposals for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
