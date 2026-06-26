-- ================================================================
-- Migration verification (READ-ONLY) — safe to run anytime.
-- Paste into the Supabase SQL Editor for the CGE project and run.
-- Each row reports PRESENT / MISSING for objects the three
-- "run status unconfirmed" migrations should have created.
-- ================================================================

with checks(category, label, present) as (

  -- 1) team-join-requests-migration.sql ---------------------------
  select 'team-join-requests', 'table: team_join_requests',
         to_regclass('public.team_join_requests') is not null
  union all
  select 'team-join-requests', 'fn: request_team_join',
         to_regprocedure('public.request_team_join(integer, text)') is not null
  union all
  select 'team-join-requests', 'fn: approve_team_join_request',
         to_regprocedure('public.approve_team_join_request(uuid)') is not null
  union all
  select 'team-join-requests', 'fn: decline_team_join_request',
         to_regprocedure('public.decline_team_join_request(uuid)') is not null
  union all
  select 'team-join-requests', 'fn: cancel_team_join_request',
         to_regprocedure('public.cancel_team_join_request(uuid)') is not null
  union all
  select 'team-join-requests', 'fn: can_manage_team_requests',
         to_regprocedure('public.can_manage_team_requests(integer)') is not null
  union all
  -- open-join policy should be GONE after the migration
  select 'team-join-requests', 'policy removed: "Users can join teams"',
         not exists (
           select 1 from pg_policies
           where schemaname = 'public' and tablename = 'team_members'
             and policyname = 'Users can join teams'
         )

  -- 2) tournament-paid-registration-migration.sql -----------------
  union all
  select 'tournament-paid-reg', 'col: tournament_registrations.total',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='tournament_registrations'
                   and column_name='total')
  union all
  select 'tournament-paid-reg', 'col: tournament_registrations.payment_method',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='tournament_registrations'
                   and column_name='payment_method')
  union all
  select 'tournament-paid-reg', 'fn: create_tournament_registration_with_payment',
         exists (select 1 from pg_proc
                 where proname='create_tournament_registration_with_payment')

  -- 3) tournament-team-paid-registration-migration.sql ------------
  union all
  select 'tournament-team-paid-reg', 'col: tournament_team_registrations.total',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='tournament_team_registrations'
                   and column_name='total')
  union all
  select 'tournament-team-paid-reg', 'col: tournament_team_registrations.payment_method',
         exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='tournament_team_registrations'
                   and column_name='payment_method')
  union all
  select 'tournament-team-paid-reg', 'fn: create_tournament_team_registration_with_payment',
         exists (select 1 from pg_proc
                 where proname='create_tournament_team_registration_with_payment')
)
select
  category,
  label,
  case when present then '✅ PRESENT' else '❌ MISSING' end as status
from checks
order by category, label;
