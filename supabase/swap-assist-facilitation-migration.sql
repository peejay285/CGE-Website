-- ================================================================
-- Paid CGE-assisted swap (facilitation only)
-- ----------------------------------------------------------------
-- Adds an optional paid facilitation layer on top of an existing swap
-- proposal. CGE coordinates a lounge meetup / ID check / inspection /
-- handover record. CGE does NOT hold item value.
--
-- Model:
--   * Tiered fee by the higher-valued item, split 50/50 between parties.
--   * Each party settles their own half: pay via Paystack OR spend one
--     premium credit (premium members get a monthly free quota).
--   * Assistance goes "active" once both halves are settled.
-- Idempotent: safe to run multiple times.
-- ================================================================

-- ─── swap_proposals assist columns ──────────────────────────────
alter table public.swap_proposals
  add column if not exists assist_status text not null default 'none'
    check (assist_status in ('none', 'awaiting_payment', 'active', 'completed', 'cancelled')),
  add column if not exists assist_fee_total integer,
  add column if not exists assist_requested_by uuid references auth.users,
  add column if not exists assist_requested_at timestamptz,
  add column if not exists assist_activated_at timestamptz,
  add column if not exists assist_completed_at timestamptz,
  add column if not exists assist_completed_by uuid references auth.users;

-- ─── Per-party payment shares ───────────────────────────────────
-- Columns named `total` / `payment_status` so the generic Paystack
-- initialize route (type → table/ownerColumn) can drive payment.
create table if not exists public.swap_assist_payments (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid references public.swap_proposals(id) on delete cascade not null,
  payer_id uuid references auth.users not null,
  role text not null check (role in ('proposer', 'owner')),
  total integer not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'free')),
  method text check (method in ('paystack', 'premium')),
  paystack_reference text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (proposal_id, payer_id)
);

create index if not exists idx_swap_assist_payments_proposal
  on public.swap_assist_payments(proposal_id);
create index if not exists idx_swap_assist_payments_payer
  on public.swap_assist_payments(payer_id);

-- ─── Premium credit usage log (for the monthly quota) ───────────
create table if not exists public.swap_assist_credit_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  payment_id uuid references public.swap_assist_payments(id) on delete cascade,
  used_at timestamptz not null default now()
);

create index if not exists idx_swap_assist_credit_usage_user_month
  on public.swap_assist_credit_usage(user_id, used_at);

-- ─── RLS ────────────────────────────────────────────────────────
alter table public.swap_assist_payments enable row level security;
drop policy if exists "Swap parties can view assist payments" on public.swap_assist_payments;
create policy "Swap parties can view assist payments"
  on public.swap_assist_payments for select
  using (
    exists (
      select 1 from public.swap_proposals sp
      where sp.id = swap_assist_payments.proposal_id
        and (
          sp.proposer_id = auth.uid()
          or exists (
            select 1 from public.marketplace_listings ml
            where ml.id = sp.listing_id and ml.user_id = auth.uid()
          )
        )
    )
  );
-- Writes happen only through the security-definer RPCs and the webhook
-- (service role), so no direct INSERT/UPDATE/DELETE policies.

alter table public.swap_assist_credit_usage enable row level security;
drop policy if exists "Users can view own assist credit usage" on public.swap_assist_credit_usage;
create policy "Users can view own assist credit usage"
  on public.swap_assist_credit_usage for select
  using (user_id = auth.uid());

-- ─── Helpers ────────────────────────────────────────────────────
create or replace function public.assist_fee_for_value(p_value integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(p_value, 0) <= 20000 then 1000
    when coalesce(p_value, 0) <= 50000 then 2500
    else 5000
  end;
$$;

create or replace function public.swap_assist_premium_credits_remaining(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_premium boolean;
  v_used integer;
begin
  select (premium_tier = 'premium' and (premium_expires_at is null or premium_expires_at > now()))
    into v_is_premium
    from public.profiles
    where id = p_user_id;

  if not coalesce(v_is_premium, false) then
    return 0;
  end if;

  select count(*) into v_used
    from public.swap_assist_credit_usage
    where user_id = p_user_id
      and used_at >= date_trunc('month', now());

  return greatest(0, 3 - v_used);
end;
$$;

-- ─── Request assistance (creates the two payment shares) ────────
create or replace function public.request_swap_assistance(p_proposal_id uuid)
returns public.swap_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prop public.swap_proposals;
  v_owner uuid;
  v_off_val integer;
  v_tgt_val integer;
  v_fee integer;
  v_half integer;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select * into v_prop from public.swap_proposals where id = p_proposal_id;
  if v_prop.id is null then
    raise exception 'Swap proposal not found' using errcode = 'P0001';
  end if;

  select user_id into v_owner from public.marketplace_listings where id = v_prop.listing_id;
  if v_user <> v_prop.proposer_id and v_user <> coalesce(v_owner, '00000000-0000-0000-0000-000000000000'::uuid) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  if v_prop.status not in ('pending', 'accepted', 'in_transit') then
    raise exception 'This swap is not active' using errcode = 'P0001';
  end if;
  if coalesce(v_prop.assist_status, 'none') not in ('none', 'cancelled') then
    raise exception 'Assistance has already been requested for this swap' using errcode = 'P0001';
  end if;

  select case when price > 0 then price else coalesce(buyout_price, 0) end
    into v_off_val from public.marketplace_listings where id = v_prop.offered_listing_id;
  select case when price > 0 then price else coalesce(buyout_price, 0) end
    into v_tgt_val from public.marketplace_listings where id = v_prop.listing_id;

  v_fee := public.assist_fee_for_value(greatest(coalesce(v_off_val, 0), coalesce(v_tgt_val, 0)));
  v_half := (v_fee / 2)::integer;

  -- Clear any rows left over from a previously cancelled request.
  delete from public.swap_assist_payments where proposal_id = p_proposal_id;

  insert into public.swap_assist_payments (proposal_id, payer_id, role, total, payment_status)
  values
    (p_proposal_id, v_prop.proposer_id, 'proposer', v_half, 'pending'),
    (p_proposal_id, v_owner, 'owner', v_half, 'pending');

  update public.swap_proposals
    set assist_status = 'awaiting_payment',
        assist_fee_total = v_fee,
        assist_requested_by = v_user,
        assist_requested_at = now(),
        assist_activated_at = null,
        assist_completed_at = null,
        assist_completed_by = null
    where id = p_proposal_id
    returning * into v_prop;

  return v_prop;
end;
$$;

-- ─── Cover your half with a premium credit ──────────────────────
create or replace function public.cover_swap_assist_with_premium(p_proposal_id uuid)
returns public.swap_assist_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pay public.swap_assist_payments;
  v_remaining integer;
  v_unsettled integer;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select * into v_pay
    from public.swap_assist_payments
    where proposal_id = p_proposal_id and payer_id = v_user;
  if v_pay.id is null then
    raise exception 'You have no assistance share on this swap' using errcode = 'P0001';
  end if;
  if v_pay.payment_status <> 'pending' then
    raise exception 'Your share is already settled' using errcode = 'P0001';
  end if;

  v_remaining := public.swap_assist_premium_credits_remaining(v_user);
  if v_remaining <= 0 then
    raise exception 'No premium assist credits remaining this month' using errcode = 'P0001';
  end if;

  update public.swap_assist_payments
    set payment_status = 'free', method = 'premium', paid_at = now()
    where id = v_pay.id
    returning * into v_pay;

  insert into public.swap_assist_credit_usage (user_id, payment_id)
  values (v_user, v_pay.id);

  select count(*) into v_unsettled
    from public.swap_assist_payments
    where proposal_id = p_proposal_id and payment_status not in ('paid', 'free');
  if v_unsettled = 0 then
    update public.swap_proposals
      set assist_status = 'active', assist_activated_at = now()
      where id = p_proposal_id and assist_status = 'awaiting_payment';
  end if;

  return v_pay;
end;
$$;

-- ─── Mark facilitation complete (party or admin) ────────────────
create or replace function public.complete_swap_assistance(p_proposal_id uuid)
returns public.swap_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prop public.swap_proposals;
  v_owner uuid;
  v_is_admin boolean;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select * into v_prop from public.swap_proposals where id = p_proposal_id;
  if v_prop.id is null then
    raise exception 'Swap proposal not found' using errcode = 'P0001';
  end if;

  select user_id into v_owner from public.marketplace_listings where id = v_prop.listing_id;
  select is_admin into v_is_admin from public.profiles where id = v_user;

  if not (coalesce(v_is_admin, false) or v_user = v_prop.proposer_id or v_user = v_owner) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;
  if v_prop.assist_status <> 'active' then
    raise exception 'Assistance is not active' using errcode = 'P0001';
  end if;

  update public.swap_proposals
    set assist_status = 'completed', assist_completed_at = now(), assist_completed_by = v_user
    where id = p_proposal_id
    returning * into v_prop;

  return v_prop;
end;
$$;

-- ─── Cancel before activation (no money settled) ────────────────
create or replace function public.cancel_swap_assistance(p_proposal_id uuid)
returns public.swap_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prop public.swap_proposals;
  v_owner uuid;
  v_is_admin boolean;
  v_settled integer;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select * into v_prop from public.swap_proposals where id = p_proposal_id;
  if v_prop.id is null then
    raise exception 'Swap proposal not found' using errcode = 'P0001';
  end if;

  select user_id into v_owner from public.marketplace_listings where id = v_prop.listing_id;
  select is_admin into v_is_admin from public.profiles where id = v_user;
  if not (coalesce(v_is_admin, false) or v_user = v_prop.proposer_id or v_user = v_owner) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;
  if v_prop.assist_status <> 'awaiting_payment' then
    raise exception 'Assistance can only be cancelled before it activates' using errcode = 'P0001';
  end if;

  select count(*) into v_settled
    from public.swap_assist_payments
    where proposal_id = p_proposal_id and payment_status in ('paid', 'free');
  if v_settled > 0 then
    raise exception 'A share is already paid — contact CGE support to cancel' using errcode = 'P0001';
  end if;

  delete from public.swap_assist_payments where proposal_id = p_proposal_id;
  update public.swap_proposals
    set assist_status = 'cancelled',
        assist_fee_total = null,
        assist_requested_by = null,
        assist_requested_at = null
    where id = p_proposal_id
    returning * into v_prop;

  return v_prop;
end;
$$;

-- ─── Grants ─────────────────────────────────────────────────────
revoke all on function public.assist_fee_for_value(integer) from public;
revoke all on function public.swap_assist_premium_credits_remaining(uuid) from public;
revoke all on function public.request_swap_assistance(uuid) from public;
revoke all on function public.cover_swap_assist_with_premium(uuid) from public;
revoke all on function public.complete_swap_assistance(uuid) from public;
revoke all on function public.cancel_swap_assistance(uuid) from public;

grant execute on function public.assist_fee_for_value(integer) to authenticated;
grant execute on function public.swap_assist_premium_credits_remaining(uuid) to authenticated;
grant execute on function public.request_swap_assistance(uuid) to authenticated;
grant execute on function public.cover_swap_assist_with_premium(uuid) to authenticated;
grant execute on function public.complete_swap_assistance(uuid) to authenticated;
grant execute on function public.cancel_swap_assistance(uuid) to authenticated;
