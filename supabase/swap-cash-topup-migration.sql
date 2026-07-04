-- ================================================================
-- Cash top-up swaps ("pay the difference", Vinted pattern)
-- ----------------------------------------------------------------
-- Adds cash_adjustment to swap_proposals so a proposer can balance an
-- uneven swap with naira:
--   * positive  = the proposer adds cash on top of their offered item
--   * negative  = the proposer requests cash from the listing owner
--   * 0         = straight item-for-item swap (default)
--
-- Proposal creation is a direct RLS-checked INSERT (see the
-- "Users can create valid proposals" policy installed by
-- swap-lifecycle-rpc-hardening-migration.sql) — there is no creation
-- RPC to recreate, so the sanity bound lives in a table CHECK
-- constraint instead: |cash_adjustment| <= ₦5,000,000.
--
-- Idempotent: safe to run multiple times.
-- ================================================================

alter table public.swap_proposals
  add column if not exists cash_adjustment integer not null default 0;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'swap_proposals_cash_adjustment_bounds'
  ) then
    alter table public.swap_proposals
      add constraint swap_proposals_cash_adjustment_bounds
      check (abs(cash_adjustment) <= 5000000);
  end if;
end $$;

comment on column public.swap_proposals.cash_adjustment is
  'Naira the proposer adds on top of their item (positive) or requests from the listing owner (negative). 0 = straight swap. Bounded to |₦5,000,000|.';
