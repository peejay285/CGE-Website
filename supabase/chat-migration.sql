-- ============================================
-- CGE Chat System Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- ─── CONVERSATIONS ─────────────────────────────
create table if not exists conversations (
  id            uuid default gen_random_uuid() primary key,
  listing_id    uuid not null references marketplace_listings(id) on delete cascade,
  buyer_id      uuid not null references auth.users(id) on delete cascade,
  seller_id     uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  constraint conversations_unique_buyer_listing unique (listing_id, buyer_id)
);

create index if not exists conversations_buyer_idx on conversations(buyer_id);
create index if not exists conversations_seller_idx on conversations(seller_id);
create index if not exists conversations_listing_idx on conversations(listing_id);
create index if not exists conversations_updated_idx on conversations(updated_at desc);

alter table conversations enable row level security;

create policy "Users can view their own conversations"
  on conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Authenticated users can create conversations"
  on conversations for insert
  with check (auth.uid() = buyer_id);

create policy "Participants can update their conversations"
  on conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);


-- ─── MESSAGES ──────────────────────────────────
create table if not exists messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  content         text not null,
  is_read         boolean default false,
  created_at      timestamptz default now()
);

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);
create index if not exists messages_unread_idx on messages(conversation_id, is_read) where is_read = false;

alter table messages enable row level security;

create policy "Participants can view messages"
  on messages for select
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Participants can insert messages"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Recipients can mark messages as read"
  on messages for update
  using (
    sender_id != auth.uid()
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );


-- ─── TRIGGER: auto-update conversations.updated_at ─────
create or replace function update_conversation_timestamp()
returns trigger as $$
begin
  update conversations
  set updated_at = now()
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_new_message_update_conversation
  after insert on messages
  for each row
  execute function update_conversation_timestamp();


-- ─── ENABLE REALTIME ───────────────────────────
alter publication supabase_realtime add table messages;
