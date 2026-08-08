-- ════════════════════════════════════════════════════════════════════════════
-- PRIVATE PHONE MIGRATION — move profiles.phone into a self-only table
--
-- WHY: `profiles` has the "Public profiles are viewable by everyone" policy
-- (`using (true)`), so every user's phone number was readable by anonymous
-- SELECT. Phone is the only sensitive contact column on profiles; it moves to
-- `profile_private`, which only the owner (auth.uid() = id) can read or write.
-- The service-role key bypasses RLS, so server-side SMS (Termii), the Paystack
-- webhook, the giveaway draw and admin tooling keep access.
--
-- RUN ORDER: run AFTER all previous migrations — it redefines handle_new_user
-- on top of fix-handle-new-user-search-path-migration.sql and drops
-- profiles.phone as its final step. Additive + idempotent; safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Private table ───────────────────────────────────────────────────────

create table if not exists public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  updated_at timestamptz default now()
);

alter table public.profile_private enable row level security;

-- Self-only access. No anon policy at all — anonymous SELECT returns nothing.
-- (service_role bypasses RLS automatically for server-side reads.)
drop policy if exists "Users can view own private profile" on public.profile_private;
create policy "Users can view own private profile"
  on public.profile_private for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own private profile" on public.profile_private;
create policy "Users can insert own private profile"
  on public.profile_private for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own private profile" on public.profile_private;
create policy "Users can update own private profile"
  on public.profile_private for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Defense in depth at the grant level too: anon gets nothing, authenticated
-- gets exactly what the policies allow (no delete).
revoke all on table public.profile_private from anon;
revoke all on table public.profile_private from authenticated;
grant select, insert, update on table public.profile_private to authenticated;

-- ─── 2. Backfill from profiles.phone ────────────────────────────────────────

-- Guarded so the migration stays idempotent after step 4 drops the column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'phone'
  ) then
    insert into public.profile_private (id, phone)
    select id, phone from public.profiles where phone is not null
    on conflict (id) do update
      set phone = excluded.phone,
          updated_at = now();
  end if;
end $$;

-- ─── 3. handle_new_user: write phone to profile_private ─────────────────────

-- Reproduces the CURRENT definition (fix-handle-new-user-search-path-
-- migration.sql — pinned search_path, location fields, NULLIF coord casts),
-- changed only to route the signup phone into profile_private instead of
-- profiles. Signup metadata (raw_user_meta_data->>'phone') is unchanged.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, location_state, location_city,
    location_lat, location_lng
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'location_state',
    NEW.raw_user_meta_data->>'location_city',
    NULLIF(NEW.raw_user_meta_data->>'location_lat', '')::DOUBLE PRECISION,
    NULLIF(NEW.raw_user_meta_data->>'location_lng', '')::DOUBLE PRECISION
  );

  INSERT INTO public.profile_private (id, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone))
  ON CONFLICT (id) DO UPDATE
    SET phone = EXCLUDED.phone,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

-- ─── 4. Drop the publicly readable column ───────────────────────────────────

alter table public.profiles drop column if exists phone;

-- ─── 5. Verify ──────────────────────────────────────────────────────────────
-- After applying, confirm:
--
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles'
--     and column_name = 'phone';
--   -- must return 0 rows
--
--   select count(*) from public.profile_private;
--   -- should match the count of profiles that had a phone
--
--   -- As anon (SQL editor "anon" role impersonation or a signed-out client):
--   -- select phone from profile_private;  -- must return 0 rows
