-- ================================================================
-- Swap lifecycle RPC hardening
-- ----------------------------------------------------------------
-- Moves swap lifecycle mutations behind SECURITY DEFINER functions so the
-- database, not the browser, decides which party may write which fields.
-- Existing SELECT policies remain unchanged.
-- ================================================================

create or replace function public.set_swap_proposal_decision(
  p_proposal_id uuid,
  p_status text
)
returns public.swap_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prop public.swap_proposals;
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('accepted', 'declined') then
    raise exception 'Unsupported swap decision: %', p_status;
  end if;

  select sp.*
    into v_prop
  from public.swap_proposals sp
  where sp.id = p_proposal_id
  for update;

  if not found then
    raise exception 'Swap proposal not found';
  end if;

  select ml.user_id
    into v_owner
  from public.marketplace_listings ml
  where ml.id = v_prop.listing_id;

  if v_owner is null then
    raise exception 'Swap listing owner not found';
  end if;

  if v_user <> v_owner then
    raise exception 'Only the listing owner can accept or decline a proposal';
  end if;

  if v_prop.status <> 'pending' then
    raise exception 'Only pending proposals can be decided';
  end if;

  if p_status = 'accepted' then
    update public.swap_proposals
       set accepted_at = coalesce(accepted_at, now()),
           declined_at = null
     where id = p_proposal_id
     returning * into v_prop;
  else
    update public.swap_proposals
       set declined_at = coalesce(declined_at, now())
     where id = p_proposal_id
     returning * into v_prop;
  end if;

  return v_prop;
end;
$$;

create or replace function public.mark_swap_shipped(
  p_proposal_id uuid,
  p_tracking text default null
)
returns public.swap_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prop public.swap_proposals;
  v_owner uuid;
  v_tracking text := nullif(btrim(coalesce(p_tracking, '')), '');
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select sp.*
    into v_prop
  from public.swap_proposals sp
  where sp.id = p_proposal_id
  for update;

  if not found then
    raise exception 'Swap proposal not found';
  end if;

  select ml.user_id
    into v_owner
  from public.marketplace_listings ml
  where ml.id = v_prop.listing_id;

  if v_owner is null then
    raise exception 'Swap listing owner not found';
  end if;

  if v_prop.status not in ('accepted', 'in_transit') then
    raise exception 'Swap must be accepted before shipping can be marked';
  end if;

  if v_user = v_prop.proposer_id then
    update public.swap_proposals
       set proposer_shipped_at = coalesce(proposer_shipped_at, now()),
           proposer_tracking = coalesce(v_tracking, proposer_tracking)
     where id = p_proposal_id
     returning * into v_prop;
  elsif v_user = v_owner then
    update public.swap_proposals
       set owner_shipped_at = coalesce(owner_shipped_at, now()),
           owner_tracking = coalesce(v_tracking, owner_tracking)
     where id = p_proposal_id
     returning * into v_prop;
  else
    raise exception 'Only swap parties can mark shipping';
  end if;

  return v_prop;
end;
$$;

create or replace function public.mark_swap_received(p_proposal_id uuid)
returns public.swap_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prop public.swap_proposals;
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select sp.*
    into v_prop
  from public.swap_proposals sp
  where sp.id = p_proposal_id
  for update;

  if not found then
    raise exception 'Swap proposal not found';
  end if;

  select ml.user_id
    into v_owner
  from public.marketplace_listings ml
  where ml.id = v_prop.listing_id;

  if v_owner is null then
    raise exception 'Swap listing owner not found';
  end if;

  if v_prop.status not in ('accepted', 'in_transit') then
    raise exception 'Swap is not awaiting receipt confirmation';
  end if;

  if v_user = v_prop.proposer_id then
    if v_prop.owner_shipped_at is null then
      raise exception 'The owner has not marked their item as shipped yet';
    end if;
    update public.swap_proposals
       set proposer_received_at = coalesce(proposer_received_at, now())
     where id = p_proposal_id
     returning * into v_prop;
  elsif v_user = v_owner then
    if v_prop.proposer_shipped_at is null then
      raise exception 'The proposer has not marked their item as shipped yet';
    end if;
    update public.swap_proposals
       set owner_received_at = coalesce(owner_received_at, now())
     where id = p_proposal_id
     returning * into v_prop;
  else
    raise exception 'Only swap parties can mark receipt';
  end if;

  return v_prop;
end;
$$;

create or replace function public.cancel_swap_proposal(
  p_proposal_id uuid,
  p_reason text default null
)
returns public.swap_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prop public.swap_proposals;
  v_owner uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select sp.*
    into v_prop
  from public.swap_proposals sp
  where sp.id = p_proposal_id
  for update;

  if not found then
    raise exception 'Swap proposal not found';
  end if;

  select ml.user_id
    into v_owner
  from public.marketplace_listings ml
  where ml.id = v_prop.listing_id;

  if v_owner is null then
    raise exception 'Swap listing owner not found';
  end if;

  if v_user <> v_prop.proposer_id and v_user <> v_owner then
    raise exception 'Only swap parties can cancel this proposal';
  end if;

  if v_prop.status in ('completed', 'cancelled', 'declined', 'expired') then
    raise exception 'Swap proposal is already closed';
  end if;

  update public.swap_proposals
     set cancelled_at = coalesce(cancelled_at, now()),
         cancelled_by = coalesce(cancelled_by, v_user),
         cancellation_reason = nullif(btrim(coalesce(p_reason, '')), '')
   where id = p_proposal_id
   returning * into v_prop;

  return v_prop;
end;
$$;

create or replace function public.dispute_swap_proposal(
  p_proposal_id uuid,
  p_reason text
)
returns public.swap_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prop public.swap_proposals;
  v_owner uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if v_reason is null or length(v_reason) < 5 then
    raise exception 'Dispute reason is too short';
  end if;

  select sp.*
    into v_prop
  from public.swap_proposals sp
  where sp.id = p_proposal_id
  for update;

  if not found then
    raise exception 'Swap proposal not found';
  end if;

  select ml.user_id
    into v_owner
  from public.marketplace_listings ml
  where ml.id = v_prop.listing_id;

  if v_owner is null then
    raise exception 'Swap listing owner not found';
  end if;

  if v_user <> v_prop.proposer_id and v_user <> v_owner then
    raise exception 'Only swap parties can dispute this proposal';
  end if;

  if v_prop.status in ('completed', 'cancelled', 'declined', 'expired') then
    raise exception 'Swap proposal is already closed';
  end if;

  update public.swap_proposals
     set disputed_at = coalesce(disputed_at, now()),
         disputed_by = coalesce(disputed_by, v_user),
         dispute_reason = v_reason
   where id = p_proposal_id
   returning * into v_prop;

  return v_prop;
end;
$$;

grant execute on function public.set_swap_proposal_decision(uuid, text) to authenticated;
grant execute on function public.mark_swap_shipped(uuid, text) to authenticated;
grant execute on function public.mark_swap_received(uuid) to authenticated;
grant execute on function public.cancel_swap_proposal(uuid, text) to authenticated;
grant execute on function public.dispute_swap_proposal(uuid, text) to authenticated;

drop policy if exists "Either party can update lifecycle"
  on public.swap_proposals;

drop policy if exists "Listing owners can update proposal status"
  on public.swap_proposals;

revoke update on table public.swap_proposals from anon, authenticated;

drop policy if exists "Users can create proposals"
  on public.swap_proposals;

drop policy if exists "proposals_insert"
  on public.swap_proposals;

create policy "Users can create valid proposals"
  on public.swap_proposals for insert
  with check (
    proposer_id = auth.uid()
    and listing_id is not null
    and offered_listing_id is not null
    and listing_id <> offered_listing_id
    and exists (
      select 1
      from public.marketplace_listings target
      where target.id = swap_proposals.listing_id
        and target.user_id <> auth.uid()
        and target.status = 'active'
    )
    and exists (
      select 1
      from public.marketplace_listings offered
      where offered.id = swap_proposals.offered_listing_id
        and offered.user_id = auth.uid()
        and offered.status = 'active'
    )
  );
