-- ================================================================
-- Pending-offer expiry (48-hour offer state machine, eBay/Depop pattern)
-- ----------------------------------------------------------------
-- swap_proposals.expires_at already exists (Tier 3) but was only armed
-- at acceptance (accepted_at + 14 days) and swept by
-- expire_stale_swap_proposals(). This migration extends the same
-- infrastructure to pending offers:
--
--   1. New proposals get expires_at = now() + 48 hours at insert time
--      (column default), giving the owner a 48h response window.
--   2. derive_swap_status() is recreated so that (a) an explicit
--      status = 'expired' written by the sweep is respected instead of
--      being re-derived (previously the sweep's cancelled_at write
--      flipped accepted rows to 'cancelled'), and (b) the 48h offer
--      window is re-armed to the 14-day completion window exactly once
--      at the moment of acceptance.
--   3. expire_stale_swap_proposals() now also expires pending offers
--      past expires_at ('expired' is an existing status value).
--   4. The existing 'expire-stale-swaps' pg_cron job is rescheduled
--      hourly (a nightly sweep is too coarse for a 48h window). Skipped
--      gracefully when pg_cron is not installed.
--
-- Idempotent: safe to run multiple times.
-- ================================================================

-- ─── 1. 48h default + backfill ──────────────────────────────────
alter table public.swap_proposals
  alter column expires_at set default (now() + interval '48 hours');

-- Existing pending offers with no deadline get a fresh 48h window from
-- now (rather than created_at + 48h, which would mass-expire old offers
-- the moment the sweep next runs).
update public.swap_proposals
set expires_at = now() + interval '48 hours'
where status = 'pending'
  and expires_at is null;

-- ─── 2. Status-keeper trigger, expiry-aware ─────────────────────
create or replace function derive_swap_status()
returns trigger as $$
declare
  proposer_shipped boolean := new.proposer_shipped_at is not null;
  owner_shipped boolean := new.owner_shipped_at is not null;
  proposer_received boolean := new.proposer_received_at is not null;
  owner_received boolean := new.owner_received_at is not null;
begin
  -- Explicit expiry wins over derivation. Only the security-definer
  -- sweep writes status directly (client UPDATE is revoked and the
  -- lifecycle RPCs write timestamps, not status), so this cannot be
  -- abused to skip states.
  if new.status = 'expired' then
    return new;
  end if;

  -- Terminal-cancellation states bypass derivation.
  if new.cancelled_at is not null then
    new.status := 'cancelled';
    return new;
  end if;

  if new.disputed_at is not null then
    new.status := 'disputed';
    return new;
  end if;

  if new.declined_at is not null then
    new.status := 'declined';
    return new;
  end if;

  -- Both parties confirmed receipt → completed.
  if proposer_received and owner_received then
    new.status := 'completed';
    if new.completed_at is null then
      new.completed_at := now();
    end if;
    return new;
  end if;

  -- At least one ship event has fired → in_transit.
  if proposer_shipped or owner_shipped then
    new.status := 'in_transit';
    return new;
  end if;

  -- Owner accepted but nothing shipped yet. Re-arm the deadline exactly
  -- once at acceptance: the pending 48h offer window is replaced by the
  -- 14-day completion window.
  if new.accepted_at is not null then
    new.status := 'accepted';
    if tg_op = 'INSERT' or old.accepted_at is null then
      new.expires_at := new.accepted_at + interval '14 days';
    end if;
    return new;
  end if;

  -- Default — still negotiating.
  if new.status is null then
    new.status := 'pending';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists derive_swap_status_trigger on swap_proposals;
create trigger derive_swap_status_trigger
  before insert or update on swap_proposals
  for each row
  execute function derive_swap_status();

-- ─── 3. Sweep now also expires stale pending offers ─────────────
create or replace function public.expire_stale_swap_proposals()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_pending integer;
  expired_active integer;
begin
  -- Pending offers past their 48-hour response window. No cancelled_at:
  -- the offer simply lapsed; cancellation_reason doubles as the
  -- user-facing note in the state tracker.
  with updated as (
    update public.swap_proposals
    set status = 'expired',
        cancellation_reason = 'Offer expired (no response within 48 hours)'
    where status = 'pending'
      and expires_at is not null
      and expires_at < now()
    returning 1
  )
  select count(*) into expired_pending from updated;

  -- Accepted swaps that stalled past the 14-day completion window.
  with updated as (
    update public.swap_proposals
    set status = 'expired',
        cancelled_at = now(),
        cancellation_reason = 'Auto-expired (14-day timeout reached)'
    where status in ('accepted', 'in_transit')
      and expires_at is not null
      and expires_at < now()
    returning 1
  )
  select count(*) into expired_active from updated;

  return expired_pending + expired_active;
end;
$$;

revoke execute on function public.expire_stale_swap_proposals() from anon, authenticated;

-- ─── 4. Reschedule the sweep hourly (when pg_cron is available) ──
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('expire-stale-swaps');
    exception when others then
      -- 'job not found' on first run — safe to ignore.
      null;
    end;
    perform cron.schedule(
      'expire-stale-swaps',
      '0 * * * *',
      'SELECT expire_stale_swap_proposals();'
    );
  end if;
end $$;
