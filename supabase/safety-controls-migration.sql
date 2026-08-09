-- ════════════════════════════════════════════════════════════════════════════
-- Safety controls: user blocks + user reports
--
-- Gives users the two controls every messaging/marketplace surface needs:
--
--   1. `user_blocks` — a user can block another user. Blocked users are
--      filtered out of the conversation list client-side, and a BEFORE INSERT
--      trigger on `messages` enforces the block at the data layer in BOTH
--      directions (neither party can message the other while a block exists).
--
--   2. `user_reports` — a generic report table covering conversations,
--      listings, messages and profiles (unlike `post_reports`, which is
--      community-post specific). Reporters can file and see their own
--      reports; triage happens in the Supabase dashboard / service role,
--      mirroring the post_reports approach before the moderation queue.
--
-- Run this in the Supabase SQL Editor. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. user_blocks ─────────────────────────────────────────────────────────
create table if not exists public.user_blocks (
  blocker_id  uuid not null references public.profiles(id) on delete cascade,
  blocked_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- The trigger below looks blocks up by either side, so index the reverse
-- direction too (the primary key already covers blocker_id lookups).
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

-- Only the blocker ever sees or manages their own block list.
drop policy if exists "Users can view own blocks" on public.user_blocks;
create policy "Users can view own blocks"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

drop policy if exists "Users can block others" on public.user_blocks;
create policy "Users can block others"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "Users can unblock others" on public.user_blocks;
create policy "Users can unblock others"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

-- No anon grant: the block list is never embedded on anonymous surfaces.
grant select, insert, delete on public.user_blocks to authenticated;


-- ── 2. user_reports ────────────────────────────────────────────────────────
create table if not exists public.user_reports (
  id                uuid default gen_random_uuid() primary key,
  reporter_id       uuid not null references public.profiles(id) on delete cascade,
  reported_user_id  uuid references public.profiles(id) on delete set null,
  context_type      text not null check (context_type in ('message', 'conversation', 'listing', 'profile')),
  context_id        text,
  reason            text not null check (char_length(reason) between 3 and 100),
  details           text check (char_length(details) <= 1000),
  status            text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  created_at        timestamptz default now()
);

create index if not exists idx_user_reports_reporter on public.user_reports(reporter_id);
create index if not exists idx_user_reports_open on public.user_reports(status) where status = 'open';

alter table public.user_reports enable row level security;

-- Reporters can file reports and see their own; no update/delete for users.
-- The owner triages via the Supabase dashboard / service role (same model
-- as post_reports before the community moderation queue existed).
drop policy if exists "Reporters can see own reports" on public.user_reports;
create policy "Reporters can see own reports"
  on public.user_reports for select
  using (auth.uid() = reporter_id);

drop policy if exists "Authenticated users can report" on public.user_reports;
create policy "Authenticated users can report"
  on public.user_reports for insert
  with check (auth.uid() = reporter_id);

grant select, insert on public.user_reports to authenticated;


-- ── 3. Block enforcement on messages ───────────────────────────────────────
-- BEFORE INSERT on messages: refuse the send when a block exists in EITHER
-- direction between the sender and the other conversation participant.
-- SECURITY DEFINER with a pinned search_path (see
-- fix-handle-new-user-search-path-migration.sql for why) so it can read
-- user_blocks rows that RLS hides from the sender.
create or replace function public.enforce_message_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
  v_seller uuid;
  v_other uuid;
begin
  select buyer_id, seller_id into v_buyer, v_seller
  from public.conversations
  where id = NEW.conversation_id;

  -- Unknown conversation: let the FK constraint produce the real error.
  if v_buyer is null then
    return NEW;
  end if;

  v_other := case when NEW.sender_id = v_buyer then v_seller else v_buyer end;

  if exists (
    select 1 from public.user_blocks
    where (blocker_id = NEW.sender_id and blocked_id = v_other)
       or (blocker_id = v_other and blocked_id = NEW.sender_id)
  ) then
    raise exception 'You cannot message this user' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_message_block_trigger on public.messages;
create trigger enforce_message_block_trigger
  before insert on public.messages
  for each row
  execute function public.enforce_message_block();


-- Refresh PostgREST's schema cache so the new tables are queryable at once.
notify pgrst, 'reload schema';
