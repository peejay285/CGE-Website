-- ================================================================
-- Tournament cancellation + entry-fee refund pipeline
-- ----------------------------------------------------------------
-- Run after tournament-paid-registration-migration.sql and
-- tournament-team-paid-registration-migration.sql. Idempotent.
--
--   1. tournaments gain cancellation context: cancellation_reason +
--      cancelled_at. The 'cancelled' status value itself already
--      exists in app code (tournaments.status is unconstrained text
--      with values open / full / in_progress / completed / cancelled).
--   2. Paid registration rows (solo + team) gain refund bookkeeping:
--      refund_status ('refund_pending' | 'refunded' | 'failed'),
--      refund_reference, refunded_at and refund_notes.
--   3. cancel_tournament(p_tournament_id, p_reason): host OR admin
--      may cancel, only BEFORE the tournament starts ('in_progress'
--      marks the start, so the pre-start states are 'open'/'full').
--      Sets status to cancelled and marks every PAID Paystack entry
--      refund_pending. The actual Paystack refunds are released one
--      by one by a CGE admin through
--      POST /api/tournament-refunds/[id]/process.
-- ================================================================

alter table public.tournaments
  add column if not exists cancellation_reason text,
  add column if not exists cancelled_at timestamptz;

alter table public.tournament_registrations
  add column if not exists refund_status text,
  add column if not exists refund_reference text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_notes text;

alter table public.tournament_team_registrations
  add column if not exists refund_status text,
  add column if not exists refund_reference text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_notes text;

create or replace function public.cancel_tournament(
  p_tournament_id integer,
  p_reason text
)
returns table (
  tournament_id integer,
  status text,
  refund_pending_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments;
  v_is_admin boolean;
  v_reason text;
  v_solo_count integer := 0;
  v_team_count integer := 0;
begin
  v_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_reason is null then
    raise exception 'A cancellation reason is required' using errcode = 'P0001';
  end if;

  -- Same lock key as the registration RPCs so a cancel cannot race a
  -- concurrent slot-reserving signup.
  perform pg_advisory_xact_lock(
    hashtextextended('tournament|' || p_tournament_id::text, 0)
  );

  select *
    into v_tournament
    from public.tournaments
    where id = p_tournament_id;

  if v_tournament.id is null then
    raise exception 'Tournament not found' using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  ) into v_is_admin;

  if not v_is_admin and v_tournament.created_by is distinct from auth.uid() then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  -- Idempotent: cancelling an already-cancelled tournament is a no-op
  -- that reports how many refunds are still queued.
  if v_tournament.status = 'cancelled' then
    return query
      select
        p_tournament_id,
        'cancelled'::text,
        (
          (
            select count(*)::integer
            from public.tournament_registrations r
            where r.tournament_id = p_tournament_id
              and r.refund_status = 'refund_pending'
          )
          +
          (
            select count(*)::integer
            from public.tournament_team_registrations r
            where r.tournament_id = p_tournament_id
              and r.refund_status = 'refund_pending'
          )
        );
    return;
  end if;

  -- Only before the tournament starts.
  if v_tournament.status not in ('open', 'full') then
    raise exception 'Tournament can only be cancelled before it starts'
      using errcode = 'P0001';
  end if;

  update public.tournaments
    set status = 'cancelled',
        cancellation_reason = v_reason,
        cancelled_at = now()
    where id = p_tournament_id;

  -- Queue a refund for every PAID Paystack entry (solo + team). Rows
  -- that already carry a refund state keep it — re-runs never regress
  -- a refunded or failed row back to pending.
  update public.tournament_registrations r
    set refund_status = 'refund_pending'
    where r.tournament_id = p_tournament_id
      and r.payment_status = 'paid'
      and coalesce(r.total, 0) > 0
      and r.paystack_reference is not null
      and r.refund_status is null;
  get diagnostics v_solo_count = row_count;

  update public.tournament_team_registrations r
    set refund_status = 'refund_pending'
    where r.tournament_id = p_tournament_id
      and r.payment_status = 'paid'
      and coalesce(r.total, 0) > 0
      and r.paystack_reference is not null
      and r.refund_status is null;
  get diagnostics v_team_count = row_count;

  return query
    select p_tournament_id, 'cancelled'::text, v_solo_count + v_team_count;
end;
$$;

revoke all on function public.cancel_tournament(integer, text) from public;

grant execute on function public.cancel_tournament(integer, text) to authenticated;
