-- ================================================================
-- Community moderation queue
-- ----------------------------------------------------------------
-- Closes the report loop: users could already file post_reports, but
-- staff had no way to act. Adds post moderation state, admin read
-- access to reports, and a single admin-gated moderate_post() RPC for
-- dismiss / hide / unhide / remove. Hidden posts are filtered from the
-- public feed in the app layer (use-community-enhanced getPosts).
-- Idempotent: safe to run multiple times.
-- ================================================================

alter table public.community_posts
  add column if not exists is_hidden boolean not null default false,
  add column if not exists moderated_by uuid references auth.users,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_note text;

create index if not exists idx_community_posts_hidden
  on public.community_posts(is_hidden)
  where is_hidden = true;

-- Staff can see every report (reporters still only see their own via the
-- existing policy; permissive policies combine with OR).
drop policy if exists "Admins can view all post reports" on public.post_reports;
create policy "Admins can view all post reports"
  on public.post_reports for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ─── Moderation action (admin only) ─────────────────────────────
create or replace function public.moderate_post(
  p_post_id uuid,
  p_action text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = 'P0001';
  end if;

  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Not authorized' using errcode = 'P0001';
  end if;

  if p_action = 'dismiss' then
    update public.post_reports
      set status = 'dismissed', reviewed_by = auth.uid(), reviewed_at = now()
      where post_id = p_post_id and status = 'pending';

  elsif p_action = 'hide' then
    update public.community_posts
      set is_hidden = true, moderated_by = auth.uid(), moderated_at = now(), moderation_note = p_note
      where id = p_post_id;
    update public.post_reports
      set status = 'actioned', reviewed_by = auth.uid(), reviewed_at = now()
      where post_id = p_post_id and status = 'pending';

  elsif p_action = 'unhide' then
    update public.community_posts
      set is_hidden = false, moderated_by = auth.uid(), moderated_at = now(), moderation_note = p_note
      where id = p_post_id;

  elsif p_action = 'remove' then
    update public.post_reports
      set status = 'actioned', reviewed_by = auth.uid(), reviewed_at = now()
      where post_id = p_post_id and status = 'pending';
    delete from public.community_posts where id = p_post_id;

  else
    raise exception 'Unknown moderation action: %', p_action using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.moderate_post(uuid, text, text) from public;
grant execute on function public.moderate_post(uuid, text, text) to authenticated;
