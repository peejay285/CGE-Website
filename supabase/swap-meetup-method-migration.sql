-- ================================================================
-- "Swap at the Lounge" meetup option
-- ----------------------------------------------------------------
-- Adds meetup_method to swap_proposals so the proposer states how the
-- exchange should happen when they send the offer:
--   * 'cge_lounge' — meet at the CGE lounge (free, staff present,
--                    Bonny Island). Recommended default in the UI.
--   * 'in_person'  — meet in person somewhere else
--   * 'shipping'   — ship with tracking (existing Tier 3 ship/receive
--                    lifecycle)
--   * 'unset'      — legacy rows created before this migration
--
-- The proposer picks the method in the proposal modal (there is no
-- separate logistics step in the lifecycle — acceptance is a single
-- decision RPC), and the owner sees it before accepting.
--
-- Idempotent: safe to run multiple times.
-- ================================================================

alter table public.swap_proposals
  add column if not exists meetup_method text not null default 'unset'
    check (meetup_method in ('unset', 'cge_lounge', 'in_person', 'shipping'));

comment on column public.swap_proposals.meetup_method is
  'How the parties exchange items: cge_lounge (staff present), in_person, shipping, or unset for legacy rows.';
