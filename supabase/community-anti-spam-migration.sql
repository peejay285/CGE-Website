-- ================================================================
-- Community anti-spam
-- ----------------------------------------------------------------
-- Enforced at the database level (BEFORE INSERT triggers) so it can't
-- be bypassed by a client writing to Supabase directly:
--   * Rate limit: posts and comments per rolling 5-minute window.
--   * Blocked words: admin-managed phrase blocklist (substring match).
-- Thresholds live in the trigger functions below — tweak as needed.
-- Idempotent: safe to run multiple times.
-- ================================================================

-- ─── Admin-managed blocklist ────────────────────────────────────
create table if not exists public.community_blocked_words (
  word text primary key,
  created_at timestamptz not null default now()
);

alter table public.community_blocked_words enable row level security;

drop policy if exists "Admins can view blocked words" on public.community_blocked_words;
create policy "Admins can view blocked words"
  on public.community_blocked_words for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Admins can add blocked words" on public.community_blocked_words;
create policy "Admins can add blocked words"
  on public.community_blocked_words for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

drop policy if exists "Admins can remove blocked words" on public.community_blocked_words;
create policy "Admins can remove blocked words"
  on public.community_blocked_words for delete
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- Seed a few common scam/spam phrases (admins can extend in the UI).
insert into public.community_blocked_words (word) values
  ('free robux'),
  ('free v-bucks'),
  ('crypto giveaway'),
  ('double your money'),
  ('click here to win'),
  ('dm me to earn'),
  ('whatsapp me to earn')
on conflict (word) do nothing;

-- ─── Shared blocklist check ─────────────────────────────────────
create or replace function public.community_content_blocked(p_content text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select word
  from public.community_blocked_words
  where position(lower(word) in lower(coalesce(p_content, ''))) > 0
  limit 1;
$$;

-- ─── Post rules (rate limit + blocklist) ────────────────────────
create or replace function public.enforce_community_post_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
begin
  -- Rate limit: at most 5 posts per rolling 5 minutes.
  select count(*) into v_recent
    from public.community_posts
    where author_id = new.author_id
      and created_at > now() - interval '5 minutes';
  if v_recent >= 5 then
    raise exception 'You are posting too fast. Please wait a few minutes before posting again.'
      using errcode = 'P0001';
  end if;

  if public.community_content_blocked(new.content) is not null then
    raise exception 'Your post contains content that is not allowed here.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_community_post_rules on public.community_posts;
create trigger trg_enforce_community_post_rules
  before insert on public.community_posts
  for each row execute function public.enforce_community_post_rules();

-- ─── Comment rules (rate limit + blocklist) ─────────────────────
create or replace function public.enforce_community_comment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
begin
  -- Rate limit: at most 15 comments per rolling 5 minutes.
  select count(*) into v_recent
    from public.post_comments
    where author_id = new.author_id
      and created_at > now() - interval '5 minutes';
  if v_recent >= 15 then
    raise exception 'You are commenting too fast. Please slow down.'
      using errcode = 'P0001';
  end if;

  if public.community_content_blocked(new.content) is not null then
    raise exception 'Your comment contains content that is not allowed here.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_community_comment_rules on public.post_comments;
create trigger trg_enforce_community_comment_rules
  before insert on public.post_comments
  for each row execute function public.enforce_community_comment_rules();
