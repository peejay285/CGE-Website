-- ================================================================
-- Verify ALL session migrations (READ-ONLY). Paste into the Supabase
-- SQL Editor and run. Each row reports PRESENT / MISSING for a key
-- object created by each migration, grouped by migration file.
-- Anything ❌ MISSING means that migration hasn't been run.
-- ================================================================

with checks(migration, label, present) as (

  -- team-join-requests-migration.sql ------------------------------
  select 'team-join-requests', 'table team_join_requests',
         to_regclass('public.team_join_requests') is not null
  union all select 'team-join-requests', 'fn request_team_join',
         to_regprocedure('public.request_team_join(integer, text)') is not null
  union all select 'team-join-requests', 'fn approve_team_join_request',
         to_regprocedure('public.approve_team_join_request(uuid)') is not null

  -- match-dispute-resolution-migration.sql ------------------------
  union all select 'match-dispute-resolution', 'policy host can resolve disputes',
         exists (select 1 from pg_policies where tablename='match_disputes'
                 and policyname='Tournament host can resolve disputes')

  -- swap-assist-facilitation-migration.sql ------------------------
  union all select 'swap-assist-facilitation', 'table swap_assist_payments',
         to_regclass('public.swap_assist_payments') is not null
  union all select 'swap-assist-facilitation', 'table swap_assist_credit_usage',
         to_regclass('public.swap_assist_credit_usage') is not null
  union all select 'swap-assist-facilitation', 'col swap_proposals.assist_status',
         exists (select 1 from information_schema.columns where table_schema='public'
                 and table_name='swap_proposals' and column_name='assist_status')
  union all select 'swap-assist-facilitation', 'fn request_swap_assistance',
         to_regprocedure('public.request_swap_assistance(uuid)') is not null
  union all select 'swap-assist-facilitation', 'fn cover_swap_assist_with_premium',
         to_regprocedure('public.cover_swap_assist_with_premium(uuid)') is not null
  union all select 'swap-assist-facilitation', 'fn complete_swap_assistance',
         to_regprocedure('public.complete_swap_assistance(uuid)') is not null
  union all select 'swap-assist-facilitation', 'fn assist_fee_for_value',
         to_regprocedure('public.assist_fee_for_value(integer)') is not null

  -- swap-assist-admin-read-migration.sql --------------------------
  union all select 'swap-assist-admin-read', 'policy admins view assist payments',
         exists (select 1 from pg_policies where tablename='swap_assist_payments'
                 and policyname='Admins can view all assist payments')
  union all select 'swap-assist-admin-read', 'policy admins view swap proposals',
         exists (select 1 from pg_policies where tablename='swap_proposals'
                 and policyname='Admins can view all swap proposals')

  -- community-moderation-migration.sql ----------------------------
  union all select 'community-moderation', 'col community_posts.is_hidden',
         exists (select 1 from information_schema.columns where table_schema='public'
                 and table_name='community_posts' and column_name='is_hidden')
  union all select 'community-moderation', 'fn moderate_post',
         to_regprocedure('public.moderate_post(uuid, text, text)') is not null
  union all select 'community-moderation', 'policy admins view post reports',
         exists (select 1 from pg_policies where tablename='post_reports'
                 and policyname='Admins can view all post reports')

  -- community-event-links-migration.sql ---------------------------
  union all select 'community-event-links', 'col community_posts.event_id',
         exists (select 1 from information_schema.columns where table_schema='public'
                 and table_name='community_posts' and column_name='event_id')
  union all select 'community-event-links', 'col community_posts.tournament_id',
         exists (select 1 from information_schema.columns where table_schema='public'
                 and table_name='community_posts' and column_name='tournament_id')

  -- community-anti-spam-migration.sql -----------------------------
  union all select 'community-anti-spam', 'table community_blocked_words',
         to_regclass('public.community_blocked_words') is not null
  union all select 'community-anti-spam', 'fn enforce_community_post_rules',
         to_regprocedure('public.enforce_community_post_rules()') is not null
  union all select 'community-anti-spam', 'fn community_content_blocked',
         to_regprocedure('public.community_content_blocked(text)') is not null
  union all select 'community-anti-spam', 'trigger trg_enforce_community_post_rules',
         exists (select 1 from pg_trigger where tgname='trg_enforce_community_post_rules'
                 and not tgisinternal)

  -- community-seeded-discussions-migration.sql --------------------
  union all select 'community-seeded-discussions', 'col community_posts.is_seeded',
         exists (select 1 from information_schema.columns where table_schema='public'
                 and table_name='community_posts' and column_name='is_seeded')
  union all select 'community-seeded-discussions', 'fn enforce_seeded_flag',
         to_regprocedure('public.enforce_seeded_flag()') is not null
  union all select 'community-seeded-discussions', 'trigger trg_enforce_seeded_flag',
         exists (select 1 from pg_trigger where tgname='trg_enforce_seeded_flag'
                 and not tgisinternal)
)
select migration, label,
       case when present then '✅ PRESENT' else '❌ MISSING' end as status
from checks
order by migration, label;
