-- ================================================================
-- Seeded / official community discussions
-- ----------------------------------------------------------------
-- Adds an "Official" marker so CGE can seed quality starter threads.
--   * is_seeded column on community_posts.
--   * A trigger coerces is_seeded -> false for non-admins, so the
--     "Official" badge can't be spoofed by regular users.
--   * Admins bypass the anti-spam rate limit / blocklist so they can
--     seed several starter threads in a row (supersedes the post-rules
--     function from community-anti-spam-migration.sql).
-- Idempotent: safe to run multiple times.
-- ================================================================

alter table public.community_posts
  add column if not exists is_seeded boolean not null default false;

create index if not exists idx_community_posts_seeded
  on public.community_posts(is_seeded)
  where is_seeded = true;

-- ─── Only admins may mark a post official ───────────────────────
create or replace function public.enforce_seeded_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_seeded is true then
    if not exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true
    ) then
      new.is_seeded := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_seeded_flag on public.community_posts;
create trigger trg_enforce_seeded_flag
  before insert or update on public.community_posts
  for each row execute function public.enforce_seeded_flag();

-- ─── Post rules with admin bypass (supersedes anti-spam version) ─
create or replace function public.enforce_community_post_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent integer;
  v_is_admin boolean;
begin
  -- Admins are trusted (they seed official threads); skip spam checks.
  select is_admin into v_is_admin from public.profiles where id = new.author_id;
  if coalesce(v_is_admin, false) then
    return new;
  end if;

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
