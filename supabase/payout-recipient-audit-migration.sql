-- ================================================================
-- Payout recipient change audit trail
-- ----------------------------------------------------------------
-- Records every change to a user's payout bank account (the account
-- Paystack transfers tournament prizes to). A silent account swap is
-- the classic prize-theft move, so each change keeps who/what/when
-- plus the request IP and user agent. Rows are written only by the
-- service-role client in app/api/payout-profile/recipient/route.ts;
-- there are deliberately NO insert/update RLS policies. Idempotent.
-- ================================================================

create table if not exists public.payout_recipient_changes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  old_account_last4 text,
  old_bank_name text,
  new_account_last4 text,
  new_bank_name text,
  changed_at timestamptz default now(),
  ip text,
  user_agent text
);

create index if not exists idx_payout_recipient_changes_user
  on public.payout_recipient_changes(user_id);
create index if not exists idx_payout_recipient_changes_changed_at
  on public.payout_recipient_changes(changed_at);

alter table public.payout_recipient_changes enable row level security;

-- Owner or admin can read their audit trail. No insert/update/delete
-- policies: writes go through the service role only.
drop policy if exists "Payout recipient changes viewable by owner or admin"
  on public.payout_recipient_changes;
create policy "Payout recipient changes viewable by owner or admin"
  on public.payout_recipient_changes for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

revoke all on table public.payout_recipient_changes from anon;
revoke all on table public.payout_recipient_changes from authenticated;
grant select on table public.payout_recipient_changes to authenticated;
