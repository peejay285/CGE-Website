-- ================================================================
-- Security readiness verification (READ ONLY)
-- ----------------------------------------------------------------
-- Paste into the Supabase SQL editor before beta/public launch.
-- Every row should return PASS. Any FAIL row is a launch blocker.
-- ================================================================

with checks(area, label, pass) as (
  select 'bookings', 'receipt_token column exists',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bookings'
        and column_name = 'receipt_token'
    )
  union all select 'bookings', 'receipt_token unique index exists',
    exists (
      select 1 from pg_indexes
      where schemaname = 'public'
        and tablename = 'bookings'
        and indexname = 'idx_bookings_receipt_token'
    )
  union all select 'bookings', 'browser insert policy is removed',
    not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'bookings'
        and policyname = 'Authenticated users can create bookings'
    )
  union all select 'bookings', 'users can only cancel own bookings policy exists',
    exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'bookings'
        and policyname = 'Users can cancel own bookings'
    )
  union all select 'profiles', 'authenticated users cannot update is_admin',
    not exists (
      select 1 from information_schema.column_privileges
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'is_admin'
        and grantee = 'authenticated'
        and privilege_type in ('UPDATE', 'INSERT')
    )
  union all select 'profiles', 'authenticated users cannot update premium_tier',
    not exists (
      select 1 from information_schema.column_privileges
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name in ('premium_tier', 'premium_expires_at')
        and grantee = 'authenticated'
        and privilege_type in ('UPDATE', 'INSERT')
    )
  union all select 'profiles', 'authenticated users cannot update payout fields',
    not exists (
      select 1 from information_schema.column_privileges
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name like 'payout_%'
        and grantee = 'authenticated'
        and privilege_type in ('UPDATE', 'INSERT')
    )
  union all select 'storage', 'verification-docs bucket is private',
    exists (
      select 1 from storage.buckets
      where id = 'verification-docs'
        and public = false
    )
  union all select 'storage', 'public image buckets have mime limits',
    not exists (
      select 1 from storage.buckets
      where id in ('marketplace-images', 'avatars', 'community-images')
        and (
          file_size_limit is null
          or allowed_mime_types is null
          or not allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']
        )
    )
  union all select 'rpc', 'capacity-safe booking function exists',
    to_regprocedure('public.create_booking_with_capacity(uuid, text, integer, date, text, integer, jsonb, integer, integer, integer, text)') is not null
  union all select 'rpc', 'duration-aware availability function exists',
    to_regprocedure('public.get_slot_availability(text, date)') is not null
  union all select 'rpc', 'community moderation RPC exists',
    to_regprocedure('public.moderate_post(uuid, text, text)') is not null
  union all select 'rpc', 'swap assist completion RPC exists',
    to_regprocedure('public.complete_swap_assistance(uuid)') is not null
  union all select 'payments', 'premium_subscriptions table exists',
    to_regclass('public.premium_subscriptions') is not null
  union all select 'payments', 'tournament_payouts table exists',
    to_regclass('public.tournament_payouts') is not null
)
select
  area,
  label,
  case when pass then 'PASS' else 'FAIL' end as status
from checks
order by area, label;
