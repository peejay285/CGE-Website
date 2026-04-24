-- ============================================
-- CGE Database Schema Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- ─── PROFILES ────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  phone text,
  avatar_url text,
  gamertag text unique,
  points integer default 0,
  wins integer default 0,
  losses integer default 0,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', new.phone)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── ZONES ───────────────────────────────────
create table if not exists zones (
  id text primary key,
  name text not null,
  icon text,
  capacity integer not null,
  console text not null,
  description text
);

alter table zones enable row level security;
create policy "Zones are viewable by everyone" on zones for select using (true);

-- Seed zones
insert into zones (id, name, icon, capacity, console, description) values
  ('main', 'Main Lounge', '🎮', 6, 'PS4', '6-player gaming arena with PS4 consoles'),
  ('vip', 'VIP Lounge', '👑', 2, 'PS5', 'Premium PS5 experience, 2 consoles'),
  ('vr', 'VR Zone', '🥽', 1, 'VR', 'Immersive virtual reality')
on conflict (id) do nothing;

-- ─── GAMES ───────────────────────────────────
create table if not exists games (
  id serial primary key,
  name text not null,
  zone_id text references zones(id),
  price_per_unit integer not null,
  unit text not null default 'hr'
);

alter table games enable row level security;
create policy "Games are viewable by everyone" on games for select using (true);

-- Seed games
insert into games (name, zone_id, price_per_unit, unit) values
  ('FC 26', 'main', 3000, 'hr'),
  ('Tekken 8', 'main', 2000, 'hr'),
  ('Mortal Kombat 1', 'main', 2000, 'hr'),
  ('Call of Duty', 'main', 2000, 'hr'),
  ('GTA V', 'main', 2000, 'hr'),
  ('NBA 2K25', 'main', 2000, 'hr'),
  ('FC 26', 'vip', 5000, 'hr'),
  ('Tekken 8', 'vip', 5000, 'hr'),
  ('Mortal Kombat 1', 'vip', 5000, 'hr'),
  ('Call of Duty', 'vip', 5000, 'hr'),
  ('Spider-Man 2', 'vip', 5000, 'hr'),
  ('God of War', 'vip', 5000, 'hr'),
  ('Beat Saber', 'vr', 2000, '15 min session'),
  ('VR Boxing', 'vr', 2000, '15 min session'),
  ('VR Racing', 'vr', 2000, '15 min session'),
  ('VR Adventure', 'vr', 2000, '15 min session')
on conflict do nothing;

-- ─── BOOKINGS ────────────────────────────────
create table if not exists bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  zone_id text references zones(id) not null,
  game_id integer references games(id) not null,
  booking_date date not null,
  time_slot text not null,
  duration integer not null default 1,
  drinks jsonb default '{}',
  session_total integer not null,
  drinks_total integer not null default 0,
  total integer not null,
  payment_method text not null,
  payment_status text not null default 'pending',
  paystack_reference text,
  pass_code text,
  status text not null default 'confirmed',
  created_at timestamptz default now()
);

alter table bookings enable row level security;

create policy "Users can view own bookings"
  on bookings for select using (auth.uid() = user_id);

create policy "Authenticated users can create bookings"
  on bookings for insert with check (auth.uid() = user_id);

create policy "Users can update own bookings"
  on bookings for update using (auth.uid() = user_id);

-- ─── TOURNAMENTS ─────────────────────────────
create table if not exists tournaments (
  id serial primary key,
  title text not null,
  game text not null,
  date date not null,
  time text not null,
  entry_fee integer not null,
  prize text not null,
  slots integer not null,
  format text not null,
  platform text not null,
  status text not null default 'open',
  rules text,
  created_at timestamptz default now()
);

alter table tournaments enable row level security;
create policy "Tournaments are viewable by everyone" on tournaments for select using (true);

create table if not exists tournament_registrations (
  id uuid default gen_random_uuid() primary key,
  tournament_id integer references tournaments(id) not null,
  user_id uuid references auth.users not null,
  payment_status text not null default 'pending',
  paystack_reference text,
  registered_at timestamptz default now(),
  unique(tournament_id, user_id)
);

alter table tournament_registrations enable row level security;

create policy "Users can view own registrations"
  on tournament_registrations for select using (auth.uid() = user_id);

create policy "Authenticated users can register"
  on tournament_registrations for insert with check (auth.uid() = user_id);

-- Seed tournaments
insert into tournaments (title, game, date, time, entry_fee, prize, slots, format, platform, status) values
  ('FC 26 Weekend Cup', 'FC 26', '2026-03-15', '2:00 PM', 2000, '₦50,000', 16, 'Single Elimination', 'PS5', 'open'),
  ('Tekken 8 Showdown', 'Tekken 8', '2026-03-22', '3:00 PM', 1500, '₦30,000', 8, 'Double Elimination', 'PS5', 'open'),
  ('COD Warzone Battle', 'Call of Duty', '2026-04-01', '4:00 PM', 3000, '₦80,000', 32, 'Battle Royale', 'PS5', 'open'),
  ('Mortal Kombat League', 'MK1', '2026-04-08', '1:00 PM', 1000, '₦20,000', 16, 'Round Robin', 'PS4', 'open')
on conflict do nothing;

-- ─── EVENTS ──────────────────────────────────
create table if not exists events (
  id serial primary key,
  title text not null,
  date text not null,
  time text not null,
  type text not null,
  description text,
  is_free boolean default false,
  price integer,
  capacity integer,
  image_url text,
  created_at timestamptz default now()
);

alter table events enable row level security;
create policy "Events are viewable by everyone" on events for select using (true);

create table if not exists event_registrations (
  id uuid default gen_random_uuid() primary key,
  event_id integer references events(id) not null,
  user_id uuid references auth.users not null,
  payment_status text default 'free',
  paystack_reference text,
  registered_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table event_registrations enable row level security;

create policy "Users can view own event registrations"
  on event_registrations for select using (auth.uid() = user_id);

create policy "Authenticated users can register for events"
  on event_registrations for insert with check (auth.uid() = user_id);

-- Seed events
insert into events (title, date, time, type, description, is_free, price, capacity) values
  ('CGE Grand Opening Party', 'Mar 20, 2026', '4:00 PM - 9:00 PM', 'Party', 'Join us for the grand opening celebration with free gaming sessions, music, and refreshments!', true, null, 100),
  ('Ladies Gaming Night', 'Mar 28, 2026', '5:00 PM - 8:00 PM', 'Special', 'Exclusive gaming night for the ladies. Discounted rates and special prizes!', false, 1500, 30),
  ('VR Demo Day', 'Apr 5, 2026', '12:00 PM - 6:00 PM', 'Demo', 'Experience the latest VR games. First session free for new visitors!', true, null, 50),
  ('Birthday Package Showcase', 'Every Weekend', 'By Reservation', 'Package', 'Host your birthday party at CGE! Custom packages available with exclusive VIP access.', false, 15000, null)
on conflict do nothing;

-- ─── MARKETPLACE ─────────────────────────────
create table if not exists marketplace_listings (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references auth.users not null,
  title text not null,
  price integer not null default 0,
  condition text not null,
  category text not null,
  description text,
  images text[] default '{}',
  listing_type text not null default 'sell',    -- 'sell', 'swap', 'sell_or_swap'
  swap_for text,                                -- what the seller wants in exchange
  status text default 'active',
  created_at timestamptz default now()
);

alter table marketplace_listings enable row level security;

create policy "Active and sold listings are viewable by everyone"
  on marketplace_listings for select using (status in ('active', 'sold'));

create policy "Authenticated users can create listings"
  on marketplace_listings for insert with check (auth.uid() = seller_id);

create policy "Sellers can update own listings"
  on marketplace_listings for update using (auth.uid() = seller_id);

create policy "Sellers can delete own listings"
  on marketplace_listings for delete using (auth.uid() = seller_id);

-- ─── COMMUNITY ───────────────────────────────
create table if not exists community_posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references auth.users not null,
  content text not null,
  is_pinned boolean default false,
  created_at timestamptz default now()
);

alter table community_posts enable row level security;

create policy "Posts are viewable by everyone"
  on community_posts for select using (true);

create policy "Authenticated users can create posts"
  on community_posts for insert with check (auth.uid() = author_id);

create policy "Authors can update own posts"
  on community_posts for update using (auth.uid() = author_id);

create policy "Authors can delete own posts"
  on community_posts for delete using (auth.uid() = author_id);

-- ─── POST LIKES ──────────────────────────────
create table if not exists post_likes (
  user_id uuid references auth.users not null,
  post_id uuid references community_posts(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

alter table post_likes enable row level security;

create policy "Likes are viewable by everyone"
  on post_likes for select using (true);

create policy "Authenticated users can like"
  on post_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike"
  on post_likes for delete using (auth.uid() = user_id);

-- ─── POST COMMENTS ───────────────────────────
create table if not exists post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references community_posts(id) on delete cascade not null,
  author_id uuid references auth.users not null,
  content text not null,
  created_at timestamptz default now()
);

alter table post_comments enable row level security;

create policy "Comments are viewable by everyone"
  on post_comments for select using (true);

create policy "Authenticated users can comment"
  on post_comments for insert with check (auth.uid() = author_id);

create policy "Authors can delete own comments"
  on post_comments for delete using (auth.uid() = author_id);

-- ─── STORAGE BUCKETS ─────────────────────────
insert into storage.buckets (id, name, public)
values ('marketplace-images', 'marketplace-images', true)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict do nothing;

-- Storage policies
create policy "Anyone can view marketplace images"
  on storage.objects for select
  using (bucket_id = 'marketplace-images');

create policy "Authenticated users can upload marketplace images"
  on storage.objects for insert
  with check (bucket_id = 'marketplace-images' and auth.role() = 'authenticated');

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- ─── GIVEAWAY SYSTEM ────────────────────────
-- Entries: 1 entry per signed-in booking
create table if not exists giveaway_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  booking_id uuid references bookings(id) not null,
  month text not null, -- e.g. '2026-03'
  created_at timestamptz default now(),
  unique(booking_id) -- one entry per booking
);

alter table giveaway_entries enable row level security;

create policy "Users can view own entries"
  on giveaway_entries for select using (auth.uid() = user_id);

create policy "System can insert entries"
  on giveaway_entries for insert with check (auth.uid() = user_id);

-- Draws: monthly draw records
create table if not exists giveaway_draws (
  id serial primary key,
  month text not null unique, -- e.g. '2026-03'
  drawn_at timestamptz default now(),
  drawn_by uuid references auth.users -- admin who triggered draw
);

alter table giveaway_draws enable row level security;
create policy "Draws are viewable by everyone" on giveaway_draws for select using (true);

-- Vouchers: generated for winners
create table if not exists vouchers (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  user_id uuid references auth.users not null,
  draw_id integer references giveaway_draws(id),
  prize_label text not null, -- e.g. '1 Hour VIP Session'
  zone_id text references zones(id) not null,
  duration integer not null default 1, -- hours or sessions
  status text not null default 'active', -- 'active', 'redeemed', 'expired'
  redeemed_at timestamptz,
  redeemed_booking_id uuid references bookings(id),
  expires_at timestamptz not null,
  notified boolean not null default false, -- email sent?
  created_at timestamptz default now()
);

alter table vouchers enable row level security;

create policy "Users can view own vouchers"
  on vouchers for select using (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_giveaway_entries_month ON giveaway_entries(month);
CREATE INDEX IF NOT EXISTS idx_giveaway_entries_user ON giveaway_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_user ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);

-- ─── PERFORMANCE INDEXES ────────────────────
-- (run separately if migration already applied)
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_zone_date_slot ON bookings(zone_id, booking_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_tournament_reg_user ON tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_status_cat ON marketplace_listings(status, category);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_user ON event_registrations(user_id);

-- Prevent double-booking same zone/date/time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_booking_slot ON bookings(zone_id, booking_date, time_slot, status) WHERE status = 'confirmed';
