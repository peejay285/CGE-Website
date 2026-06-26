-- ================================================================
-- Chat integrity hardening
-- ----------------------------------------------------------------
-- Fixes two RLS gaps in the marketplace chat schema:
--   1. A buyer-created conversation must bind seller_id to the actual
--      owner of listing_id.
--   2. Browser clients should not mutate conversation participants/listing,
--      and message UPDATE should only be able to mark is_read.
-- ================================================================

drop policy if exists "Authenticated users can create conversations"
  on public.conversations;

create policy "Authenticated users can create valid conversations"
  on public.conversations for insert
  with check (
    auth.uid() = buyer_id
    and buyer_id <> seller_id
    and exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = conversations.listing_id
        and ml.user_id = conversations.seller_id
    )
  );

drop policy if exists "Participants can update their conversations"
  on public.conversations;

revoke update on table public.conversations from anon, authenticated;

-- The app marks incoming messages read. Recipients should not be able to
-- rewrite content, sender_id, or conversation_id through a broad UPDATE grant.
revoke update on table public.messages from anon, authenticated;
grant update (is_read) on public.messages to authenticated;
