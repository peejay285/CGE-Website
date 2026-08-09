-- ════════════════════════════════════════════════════════════════════════════
-- REPOINT CONTENT FOREIGN KEYS: auth.users → public.profiles
--
-- WHY: marketplace_listings.user_id, community_posts.author_id and seven other
-- content columns reference auth.users, but the app's queries embed the
-- related PROFILES row (e.g. seller:profiles!user_id(...)). PostgREST can only
-- embed across a real FK, so every such query fails with PGRST200
-- ("Could not find a relationship ... in the schema cache") — this is the
-- root cause of the production "Couldn't load listings" and community 400s.
--
-- profiles.id itself references auth.users(id) on delete cascade, so pointing
-- content tables at profiles preserves integrity transitively.
--
-- Idempotent: drops whatever FK currently exists on each (table, column) and
-- recreates it against profiles with the deterministic name the code's embed
-- hints expect (<table>_<column>_fkey). New FKs are added NOT VALID first so
-- the relationship is usable immediately, then validated (left NOT VALID with
-- a notice if legacy orphan rows exist — embedding still works either way).
--
-- RUN ORDER: any time after the base migration; safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  pair record;
  con record;
  new_name text;
begin
  for pair in
    select * from (values
      ('marketplace_listings', 'user_id'),
      ('community_posts',      'author_id'),
      ('post_comments',        'author_id'),
      ('post_likes',           'user_id'),
      ('swap_proposals',       'proposer_id'),
      ('conversations',        'buyer_id'),
      ('conversations',        'seller_id'),
      ('messages',             'sender_id'),
      ('seller_ratings',       'reviewer_id')
    ) as t(tbl, col)
  loop
    -- Skip tables that don't exist in this environment
    if to_regclass('public.' || pair.tbl) is null then
      raise notice 'Skipping %.% (table not found)', pair.tbl, pair.col;
      continue;
    end if;

    -- Drop every existing single-column FK on (table, column)
    for con in
      select distinct c.conname
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attnum   = any (c.conkey)
      where c.contype = 'f'
        and c.conrelid = ('public.' || pair.tbl)::regclass
        and a.attname  = pair.col
        and array_length(c.conkey, 1) = 1
    loop
      execute format('alter table public.%I drop constraint %I',
                     pair.tbl, con.conname);
      raise notice 'Dropped %.%', pair.tbl, con.conname;
    end loop;

    new_name := pair.tbl || '_' || pair.col || '_fkey';

    execute format(
      'alter table public.%I add constraint %I foreign key (%I) '
      || 'references public.profiles(id) on delete cascade not valid',
      pair.tbl, new_name, pair.col
    );

    begin
      execute format('alter table public.%I validate constraint %I',
                     pair.tbl, new_name);
      raise notice 'Created and validated %.%', pair.tbl, new_name;
    exception when others then
      raise notice 'Created % NOT VALID (validation failed: %)', new_name, sqlerrm;
    end;
  end loop;
end $$;

-- Refresh PostgREST's schema cache so the new relationships are usable now
notify pgrst, 'reload schema';
