-- ================================================================
-- SECURITY HARDENING: profiles, bookings, storage buckets
-- ----------------------------------------------------------------
-- Fixes from security audit (2026-06-10):
--
--  C1. Privilege escalation: the `profiles` UPDATE policy had no
--      column guard, so any user could set is_admin / premium_tier /
--      is_id_verified / payout_* / points on their own row.
--      Fix: column-level GRANTs. Clients (anon/authenticated) may only
--      INSERT/UPDATE an explicit allowlist of cosmetic columns.
--      SECURITY DEFINER functions (handle_new_user, update_seller_stats,
--      sync_id_verification_to_profile, premium expiry cron) and the
--      service-role key are unaffected by column grants.
--
--  C2. Payment bypass: the `bookings` UPDATE policy let users change
--      any column on their own bookings, including payment_status.
--      Fix: clients may only UPDATE `status`, and only to 'cancelled'.
--      Admin "mark paid" now goes through a service-role server route.
--
--  H2. Storage buckets had no server-side size/MIME enforcement.
--      Fix: file_size_limit + allowed_mime_types on all buckets.
--
-- Run AFTER all previous migrations. Idempotent.
-- ================================================================

-- ─── 1. PROFILES: column-level write allowlist ──────────────────

-- Remove blanket column access. (Supabase grants table-level
-- INSERT/UPDATE to anon/authenticated by default.)
revoke insert on table public.profiles from anon, authenticated;
revoke update on table public.profiles from anon, authenticated;

-- Re-grant only safe, user-editable columns. Conditional per column so
-- this migration works regardless of which feature migrations have run.
do $$
declare
  col text;
  allowed text[] := array[
    'full_name', 'phone', 'avatar_url', 'gamertag',
    'bio', 'favourite_game', 'team_id',
    'location_lat', 'location_lng', 'location_state', 'location_city',
    'follower_count', 'following_count', 'tournament_count', 'achievement_count'
  ];
begin
  foreach col in array allowed loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = col
    ) then
      execute format('grant update (%I) on public.profiles to authenticated', col);
      -- id must be insertable for the "insert own profile" path
      execute format('grant insert (%I) on public.profiles to authenticated', col);
    end if;
  end loop;
  -- id is required on insert (RLS still enforces auth.uid() = id)
  execute 'grant insert (id) on public.profiles to authenticated';
end $$;

-- Tighten the row policy as well (defense in depth): add WITH CHECK so a
-- user can never move a row to another id.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── 2. BOOKINGS: clients can only cancel ───────────────────────

revoke update on table public.bookings from anon, authenticated;
grant update (status) on public.bookings to authenticated;

drop policy if exists "Users can update own bookings" on public.bookings;
create policy "Users can cancel own bookings"
  on public.bookings for update
  using (auth.uid() = user_id and status <> 'completed')
  with check (auth.uid() = user_id and status = 'cancelled');

-- payment_status / totals / pass_code are now writable only by the
-- service role (Paystack webhook, admin mark-paid route, voucher
-- redemption route).

-- ─── 3. GIVEAWAY SYSTEM: create tables if missing + lock writes ─

-- The giveaway section of the original migration.sql was never run in
-- production ("public.vouchers does not exist"), so create the tables
-- here. Required by: monthly draw, voucher checkout redemption, and the
-- auto giveaway entry on every booking.

create table if not exists public.giveaway_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  booking_id uuid references public.bookings(id) not null,
  month text not null, -- e.g. '2026-06'
  created_at timestamptz default now(),
  unique(booking_id) -- one entry per booking
);

alter table public.giveaway_entries enable row level security;

drop policy if exists "Users can view own entries" on public.giveaway_entries;
create policy "Users can view own entries"
  on public.giveaway_entries for select using (auth.uid() = user_id);

create table if not exists public.giveaway_draws (
  id serial primary key,
  month text not null unique,
  drawn_at timestamptz default now(),
  drawn_by uuid references auth.users
);

alter table public.giveaway_draws enable row level security;
drop policy if exists "Draws are viewable by everyone" on public.giveaway_draws;
create policy "Draws are viewable by everyone"
  on public.giveaway_draws for select using (true);

create table if not exists public.vouchers (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  user_id uuid references auth.users not null,
  draw_id integer references public.giveaway_draws(id),
  prize_label text not null,
  zone_id text references public.zones(id) not null,
  duration integer not null default 1,
  status text not null default 'active', -- 'active', 'redeemed', 'expired'
  redeemed_at timestamptz,
  redeemed_booking_id uuid references public.bookings(id),
  expires_at timestamptz not null,
  notified boolean not null default false,
  created_at timestamptz default now()
);

alter table public.vouchers enable row level security;

drop policy if exists "Users can view own vouchers" on public.vouchers;
create policy "Users can view own vouchers"
  on public.vouchers for select using (auth.uid() = user_id);

create index if not exists idx_giveaway_entries_month on public.giveaway_entries(month);
create index if not exists idx_giveaway_entries_user on public.giveaway_entries(user_id);
create index if not exists idx_vouchers_user on public.vouchers(user_id);
create index if not exists idx_vouchers_code on public.vouchers(code);

-- Giveaway entries: inserted by the booking server route (service role) —
-- but allow users to insert their own as well (matches original design).
drop policy if exists "System can insert entries" on public.giveaway_entries;
create policy "System can insert entries"
  on public.giveaway_entries for insert with check (auth.uid() = user_id);

-- Deny-by-default writes for reward tables: SELECT-only policies plus
-- explicit revokes so a future permissive policy can't reopen writes.
revoke insert, update, delete on table public.vouchers from anon, authenticated;
revoke insert, update, delete on table public.giveaway_draws from anon, authenticated;

-- ─── 4. STORAGE: enforce size + MIME server-side ────────────────

update storage.buckets
set
  file_size_limit = 5242880, -- 5 MB (matches client-side validation)
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id in ('marketplace-images', 'avatars', 'community-images');

-- ID verification docs: images or PDF, 10 MB
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'verification-docs';

-- ─── 5. VERIFY ───────────────────────────────────────────────────
-- Run these after applying to confirm:
--
--   select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--   where table_name = 'profiles' and grantee = 'authenticated'
--   order by column_name;
--   -- must NOT list: is_admin, is_id_verified, premium_tier,
--   --                premium_expires_at, points, wins, losses, payout_*
--
--   select id, file_size_limit, allowed_mime_types from storage.buckets;
