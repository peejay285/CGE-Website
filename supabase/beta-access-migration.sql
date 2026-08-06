-- ================================================================
-- Beta waiting room: profiles.beta_approved
-- ----------------------------------------------------------------
-- Closed-beta access gate. New accounts default to NOT approved;
-- unapproved signed-in users can browse but hit a friendly waitlist
-- screen when they try to book a lounge session, register for a
-- tournament, create a marketplace listing, or post in the community.
-- The owner approves testers by setting beta_approved = true in the
-- Supabase dashboard (Table Editor > profiles).
--
-- A BEFORE UPDATE trigger stops authenticated API users from flipping
-- the flag on themselves; dashboard/direct-postgres access (where
-- auth.uid() is null) and the service role remain free to change it.
--
-- At public launch the gate deactivates via env (NEXT_PUBLIC_SITE_PHASE
-- moves off "beta" and the client gate becomes a no-op) — no SQL
-- rollback needed; the column simply stops being consulted.
-- Idempotent: safe to run multiple times.
-- ================================================================

alter table public.profiles
  add column if not exists beta_approved boolean not null default false;

-- Grandfather existing accounts — everyone registered before the gate
-- shipped is a known person.
update public.profiles set beta_approved = true;

-- Prevent authenticated API users from changing beta_approved themselves.
create or replace function public.protect_beta_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.beta_approved is distinct from old.beta_approved
     and auth.uid() is not null
     and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    -- Silently revert: profile edits still succeed, the flag stays put.
    new.beta_approved := old.beta_approved;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_beta_approved on public.profiles;
create trigger trg_protect_beta_approved
  before update on public.profiles
  for each row execute function public.protect_beta_approved();
