-- ================================================================
-- Gate is_pinned (and is_seeded) to admins
-- ----------------------------------------------------------------
-- Bug: the community_posts INSERT policy only checks author_id, so any
-- user could set is_pinned = true and float their own post to the top
-- of the feed (the feed sorts pinned-first). This supersedes the
-- seeded-flag trigger from community-seeded-discussions-migration.sql
-- and now coerces BOTH flags to false when a non-admin newly sets them.
-- The transition check (vs. OLD on UPDATE) preserves an admin-set pin
-- when the author later edits their own post.
-- Idempotent: safe to run multiple times.
-- ================================================================

create or replace function public.enforce_seeded_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  v_is_admin := coalesce(v_is_admin, false);

  if not v_is_admin then
    if TG_OP = 'INSERT' then
      if new.is_seeded then new.is_seeded := false; end if;
      if new.is_pinned then new.is_pinned := false; end if;
    else
      -- Only block a non-admin newly turning a flag on; leave existing
      -- admin-set flags intact across the author's own edits.
      if new.is_seeded and not coalesce(old.is_seeded, false) then
        new.is_seeded := false;
      end if;
      if new.is_pinned and not coalesce(old.is_pinned, false) then
        new.is_pinned := false;
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Trigger already exists from the seeded-discussions migration; recreate
-- defensively in case this migration is run standalone.
drop trigger if exists trg_enforce_seeded_flag on public.community_posts;
create trigger trg_enforce_seeded_flag
  before insert or update on public.community_posts
  for each row execute function public.enforce_seeded_flag();
