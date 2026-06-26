-- ================================================================
-- Team join requests + captain approval workflow
-- ----------------------------------------------------------------
-- Replaces open team joining in the app with:
--   1. Player-created pending join requests.
--   2. Captain/co-captain approval or decline.
--   3. Player cancellation for pending requests.
--   4. A safer direct team_members insert policy for team creation.
-- ================================================================

create table if not exists public.team_join_requests (
  id uuid default gen_random_uuid() primary key,
  team_id integer references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  message text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'cancelled')),
  decided_by uuid references auth.users,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_team_join_requests_pending_unique
  on public.team_join_requests(team_id, user_id)
  where status = 'pending';

create index if not exists idx_team_join_requests_team_status
  on public.team_join_requests(team_id, status, created_at desc);

create index if not exists idx_team_join_requests_user_status
  on public.team_join_requests(user_id, status, created_at desc);

alter table public.team_join_requests enable row level security;

drop policy if exists "Users can view their team join requests"
  on public.team_join_requests;
create policy "Users can view their team join requests"
  on public.team_join_requests for select
  using (user_id = auth.uid());

drop policy if exists "Team managers can view join requests"
  on public.team_join_requests;
create policy "Team managers can view join requests"
  on public.team_join_requests for select
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_join_requests.team_id
        and t.captain_id = auth.uid()
    )
    or exists (
      select 1
      from public.team_members tm
      where tm.team_id = team_join_requests.team_id
        and tm.user_id = auth.uid()
        and tm.role in ('captain', 'co-captain')
    )
  );

drop policy if exists "Users can create own join requests"
  on public.team_join_requests;
create policy "Users can create own join requests"
  on public.team_join_requests for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists "Users can join teams" on public.team_members;

drop policy if exists "Captains can add their own captain membership"
  on public.team_members;
create policy "Captains can add their own captain membership"
  on public.team_members for insert
  with check (
    user_id = auth.uid()
    and role = 'captain'
    and exists (
      select 1
      from public.teams t
      where t.id = team_members.team_id
        and t.captain_id = auth.uid()
    )
  );

create or replace function public.can_manage_team_requests(p_team_id integer)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = p_team_id
      and t.captain_id = auth.uid()
  )
  or exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role in ('captain', 'co-captain')
  );
$$;

create or replace function public.request_team_join(
  p_team_id integer,
  p_message text default null
)
returns public.team_join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.team_join_requests;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.teams where id = p_team_id) then
    raise exception 'Team not found' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.team_members
    where user_id = v_user_id
  ) then
    raise exception 'You are already on a team' using errcode = 'P0001';
  end if;

  select *
    into v_request
    from public.team_join_requests
    where team_id = p_team_id
      and user_id = v_user_id
      and status = 'pending';

  if v_request.id is not null then
    return v_request;
  end if;

  insert into public.team_join_requests (
    team_id,
    user_id,
    message,
    status
  )
  values (
    p_team_id,
    v_user_id,
    nullif(trim(coalesce(p_message, '')), ''),
    'pending'
  )
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.approve_team_join_request(
  p_request_id uuid
)
returns public.team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.team_join_requests;
  v_member public.team_members;
begin
  select *
    into v_request
    from public.team_join_requests
    where id = p_request_id
      and status = 'pending';

  if v_request.id is null then
    raise exception 'Join request not found' using errcode = 'P0001';
  end if;

  if not public.can_manage_team_requests(v_request.team_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.team_members
    where user_id = v_request.user_id
  ) then
    update public.team_join_requests
      set status = 'declined',
          decided_by = auth.uid(),
          decided_at = now(),
          updated_at = now()
      where id = p_request_id;

    raise exception 'Player is already on a team' using errcode = 'P0001';
  end if;

  insert into public.team_members (
    team_id,
    user_id,
    role
  )
  values (
    v_request.team_id,
    v_request.user_id,
    'member'
  )
  returning * into v_member;

  update public.profiles
    set team_id = v_request.team_id
    where id = v_request.user_id;

  update public.team_join_requests
    set status = 'approved',
        decided_by = auth.uid(),
        decided_at = now(),
        updated_at = now()
    where id = p_request_id;

  update public.team_join_requests
    set status = 'cancelled',
        updated_at = now()
    where user_id = v_request.user_id
      and status = 'pending'
      and id <> p_request_id;

  return v_member;
end;
$$;

create or replace function public.decline_team_join_request(
  p_request_id uuid
)
returns public.team_join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.team_join_requests;
begin
  select *
    into v_request
    from public.team_join_requests
    where id = p_request_id
      and status = 'pending';

  if v_request.id is null then
    raise exception 'Join request not found' using errcode = 'P0001';
  end if;

  if not public.can_manage_team_requests(v_request.team_id) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  update public.team_join_requests
    set status = 'declined',
        decided_by = auth.uid(),
        decided_at = now(),
        updated_at = now()
    where id = p_request_id
    returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.cancel_team_join_request(
  p_request_id uuid
)
returns public.team_join_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.team_join_requests;
begin
  update public.team_join_requests
    set status = 'cancelled',
        updated_at = now()
    where id = p_request_id
      and user_id = auth.uid()
      and status = 'pending'
    returning * into v_request;

  if v_request.id is null then
    raise exception 'Join request not found' using errcode = 'P0001';
  end if;

  return v_request;
end;
$$;

revoke all on function public.can_manage_team_requests(integer) from public;
revoke all on function public.request_team_join(integer, text) from public;
revoke all on function public.approve_team_join_request(uuid) from public;
revoke all on function public.decline_team_join_request(uuid) from public;
revoke all on function public.cancel_team_join_request(uuid) from public;

grant execute on function public.can_manage_team_requests(integer) to authenticated;
grant execute on function public.request_team_join(integer, text) to authenticated;
grant execute on function public.approve_team_join_request(uuid) to authenticated;
grant execute on function public.decline_team_join_request(uuid) to authenticated;
grant execute on function public.cancel_team_join_request(uuid) to authenticated;
