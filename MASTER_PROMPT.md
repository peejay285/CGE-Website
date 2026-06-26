# CGE LOUNGE APP — MASTER PROMPT

> **Last updated:** 2026-06-06
> **Status:** Active development — full web platform build

You are continuing work on the **CGE (Creative Gaming Entertainment) Lounge App** — a full-stack gaming lounge platform for a Nigerian gaming entertainment company. The product direction is now a full local web platform first, with mobile apps later as companion surfaces for notifications, convenience, and possible app-exclusive features. The app is a four-pillar gaming ecosystem: Lounge (bookings), Marketplace (swap-first market), Esports (tournaments, teams, payouts), and Community (social feed).

---

## CURRENT HANDOFF SNAPSHOT — 2026-06-06

### Product Direction
- Build the website as a complete usable platform, not just a funnel to the app.
- Mobile UX matters heavily because the Nigerian gaming audience will often browse and register from phones.
- The long-term goal is to make CGE one of the strongest esports and gaming platforms in Nigeria and Africa.
- Core pillars:
  - Lounge booking for physical stations.
  - Esports tournament hosting, team play, brackets, paid registration, and prize payouts.
  - Marketplace with swap-first positioning and optional paid CGE-assisted swaps.
  - Community with event-linked discussions, moderation, anti-spam, and seeded quality content.

### Confirmed Completed Work
- Lounge capacity and booking RPC migration was created and successfully run in the correct Supabase project.
  - Main lounge capacity: 6.
  - VR room capacity: 2.
  - VIP capacity: 1.
  - Booking creation now uses a locked RPC so simultaneous bookings cannot overfill a time slot.
- Esports upgrade migration was created and successfully run.
  - Added tournament teams, team members, team tournament registrations, check-ins, bracket/match table, disputes, achievements, player follows, tournament series, and profile esports fields.
- Tournament paid solo registration migration was created.
  - Adds totals/payment fields to `tournament_registrations`.
  - Adds slot-safe RPC `create_tournament_registration_with_payment`.
- Tournament prize payout foundation migration was created and successfully run after adapting for the existing DB.
  - Adds payout configuration on tournaments.
  - Adds `tournament_prize_placements` and `tournament_payouts`.
  - Adds RPCs to assign placements, prepare payout drafts, approve drafts, and mark payouts paid.
  - Supports automatic 1st/2nd placement from `tournament_matches` when that table exists.
- Payout profile and payout release UI/API foundation has been built.
- Team tournament paid registration migration was created.
  - Adds totals/payment fields to `tournament_team_registrations`.
  - Adds slot-safe RPC `create_tournament_team_registration_with_payment`.
  - Treats `tournament.entry_fee` as the team entry fee for now.
- Team tournament checkout was wired into the app.
  - Solo tournaments use solo paid registration/payment.
  - Team tournaments require a captain with a ready team and use team paid registration/payment.
  - Paystack initialization/webhook supports `tournament_team` payments.
- Team readiness UI was added.
  - Tournament detail pages and modals show whether the current team has enough members.
  - Team member counts now hydrate from real `team_members` rows.

### Latest Build Completed
- Added a first-class team join request workflow.
- New migration:
  - `supabase/team-join-requests-migration.sql`
  - Creates `team_join_requests`.
  - Removes open direct team joining.
  - Adds request, approve, decline, and cancel RPCs.
  - Allows captains/co-captains to manage pending requests.
- App wiring:
  - `hooks/use-teams.ts` now supports pending join requests and captain approval/decline actions.
  - `hooks/use-esports-page.tsx` exposes request handlers and updated toasts.
  - `components/esports/team-detail-modal.tsx` now shows `Request to Join`, `Request Pending`, `Cancel Request`, and captain approve/decline controls.
  - `app/esports/page.tsx` passes request state/actions into the team modal.

### Migration Run Status
- Already confirmed successful by user:
  - `supabase/lounge-capacity-and-booking-rpc-migration.sql`
  - `supabase/esports-upgrade-migration.sql`
  - `supabase/tournament-prize-payouts-migration.sql`
- Created but run status not confirmed in chat:
  - `supabase/tournament-paid-registration-migration.sql`
  - `supabase/tournament-team-paid-registration-migration.sql`
  - `supabase/team-join-requests-migration.sql`
- Before testing the latest team request flow in Supabase, run `supabase/team-join-requests-migration.sql` in the correct CGE Supabase project.

### Latest Verification
- `node node_modules\typescript\bin\tsc --noEmit --incremental false` passed.
- `npm run build` passed.
- Live route checks returned 200:
  - `http://127.0.0.1:3000/esports`
  - `http://127.0.0.1:3000/esports?tab=teams`

### Recommended Next Build Steps
1. Run `team-join-requests-migration.sql` in Supabase and manually test:
   - Non-member requests to join a team.
   - User sees pending request and can cancel it.
   - Captain/co-captain sees request and can approve/decline.
   - Approved user becomes a `team_members` row.
2. Confirm whether `tournament-paid-registration-migration.sql` and `tournament-team-paid-registration-migration.sql` have been run in production Supabase.
3. Continue esports build:
   - Bracket generation UI and match management.
   - Score reporting/confirmation/dispute UX.
   - Tournament organizer verification badges and unverified organizer warnings.
   - Payout admin review/release experience.
4. Continue marketplace build:
   - Swap trust layer, offer comparison, safety guidance wording, and paid CGE-assisted swap flow.
5. Continue community build:
   - Moderation queue, anti-spam, topic quality, seeded discussions, and event-linked tournament discussion threads.

---

## TECH STACK

- **Framework:** Next.js 16.1.6 (App Router)
- **Language:** TypeScript (strict)
- **UI:** React 19.2.3 + Tailwind CSS v4
- **Database & Auth:** Supabase (PostgreSQL + RLS + Realtime + Storage + Auth)
- **Validation:** Zod v4
- **Icons:** lucide-react
- **Dates:** date-fns
- **Notifications:** react-hot-toast
- **Utilities:** clsx (via `cn()` wrapper)
- **Project path:** `c:\Users\asoliadeefirst\Documents\cge-lounge-app`

---

## DESIGN SYSTEM

### Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `cyan` | `#00F0FF` | Primary accent, links, active states |
| `magenta` | `#FF2D78` | Secondary accent, CTAs, esports |
| `gold` | `#FFD700` | Warnings, pinned badges, highlights |
| `green` | `#00FF88` | Success, community, availability |
| `red` | `#FF4444` | Errors, danger, likes (heart) |
| `base` | `#0A0A0B` | Page background |
| `surface` | — | Card backgrounds |
| `surface-alt` | — | Elevated surfaces, hover states |
| `border` | — | Borders, dividers |
| `text` | — | Primary text (light) |
| `text-muted` | — | Secondary text |

### Typography
- **Heading font:** Orbitron (bold, gaming aesthetic)
- **Body font:** Sora (clean, readable)
- **Alt heading:** Rajdhani (secondary headings, stats)
- **Monospace:** JetBrains Mono (codes, badges)

### Component Patterns
- Glass morphism navbar (blur on scroll)
- Gradient buttons: cyan→[#00C8D4] (primary), magenta→[#D41860] (magenta variant)
- Cards with border-border, hover glow effects
- Badge component with color prop (cyan, magenta, gold, green, red)
- Button variants: primary, secondary, magenta, ghost, danger
- Button sizes: sm, md, lg
- Modals: sm/md/lg width, focus trap, ESC to close

---

## PROJECT STRUCTURE

```
cge-lounge-app/
├── app/
│   ├── layout.tsx              # Root: fonts, metadata, StructuredData, Toaster
│   ├── page.tsx                # Home: Hero, Pillars, Pricing, Testimonials, CTA
│   ├── error.tsx               # Error boundary
│   ├── not-found.tsx           # 404
│   ├── global-error.tsx        # Critical error (no components)
│   ├── lounge/page.tsx         # 4-step booking wizard
│   ├── marketplace/page.tsx    # Swap market grid + filters
│   ├── events/page.tsx         # Events list + calendar
│   ├── events/[id]/page.tsx    # Single event detail
│   ├── esports/page.tsx        # Tournaments hub + leaderboard
│   ├── esports/[id]/page.tsx   # Single tournament detail
│   ├── community/page.tsx      # Social feed
│   ├── messages/page.tsx       # Conversations + chat
│   ├── about/page.tsx          # Brand info
│   └── admin/giveaway/page.tsx # Monthly draw admin
├── components/
│   ├── ui/                     # badge, button, card, input, modal, section-title,
│   │                           # tab-bar, progress-bar, empty-state, skeleton
│   ├── layout/                 # navbar, footer, cge-logo
│   ├── home/                   # hero, pillars, pricing-grid, zone-comparison,
│   │                           # testimonials, game-showcase, cta-section
│   ├── lounge/                 # zone-selector, booking-form, drinks-addon,
│   │                           # payment-step, booking-confirmation
│   ├── marketplace/            # listing-card, listing-filters, listing-detail-modal,
│   │                           # create-listing-modal, swap-proposal-modal,
│   │                           # swap-proposals-panel
│   ├── events/                 # event-card, event-detail-modal, event-calendar
│   ├── esports/                # tournament-card, tournament-detail-modal,
│   │                           # create-tournament-modal, manage-tournament-modal,
│   │                           # leaderboard-table
│   ├── community/              # post-card, create-post, comment-section
│   ├── messages/               # conversation-list, chat-thread, message-bubble,
│   │                           # message-input, conversation-skeleton
│   ├── app-shell.tsx           # Root wrapper: Navbar, Footer, AuthModal, FABs
│   ├── auth-modal.tsx          # Sign In/Up/Reset + social (Google/Apple/Azure/Discord)
│   ├── ai-concierge.tsx        # Claude-powered chatbot widget
│   ├── giveaway-banner.tsx     # Monthly giveaway notification
│   ├── whatsapp-fab.tsx        # Floating WhatsApp button
│   ├── structured-data.tsx     # JSON-LD SEO schema
│   └── error-boundary.tsx      # Error boundary wrapper
├── hooks/
│   ├── use-auth.ts             # signUp, signIn, signOut, signInWithProvider, resetPassword
│   ├── use-bookings.ts         # getUserBookings, createBooking, checkAvailability
│   ├── use-marketplace.ts      # getListings, getListingById, createListing, updateListing,
│   │                           # deleteListing, uploadListingImage, toggleSave, recordView,
│   │                           # getMyListings, createSwapProposal, getSwapProposals,
│   │                           # updateProposalStatus, subscribeToListings
│   ├── use-events.ts           # getEvents, registerForEvent, unregisterFromEvent, getEventById
│   ├── use-tournaments.ts      # getTournaments, createTournament, registerForTournament,
│   │                           # getLeaderboard, getTournamentRegistrants, updateTournament,
│   │                           # deleteTournament, getMyHostedTournaments
│   ├── use-community.ts        # getPosts, createPost, editPost, deletePost, toggleLike,
│   │                           # getComments, addComment, deleteComment, getLikers,
│   │                           # uploadPostImage, subscribeToFeed, subscribeToComments, loadMore
│   └── use-messages.ts         # getConversations, getMessages, sendMessage, markAsRead,
│                               # getOrCreateConversation, subscribeToMessages,
│                               # getUnreadCount, subscribeToUnread
├── lib/
│   ├── types.ts                # All TypeScript interfaces
│   ├── constants.ts            # Brand, pricing, zones, games, categories, nav links
│   ├── utils.ts                # cn, formatPrice, getInitials, formatBookingDate, timeAgo, isSunday
│   ├── validations.ts          # Zod schemas for all forms
│   └── supabase/client.ts      # Supabase browser client
└── globals.css                 # Tailwind + custom styles
```

---

## CORE FEATURES

### 1. Lounge — Gaming Session Booking
**Route:** `/lounge`
**Flow:** Zone Selection → Details (game, date, time, duration) → Extras (drinks/snacks) → Payment (Paystack or venue) → Confirmation with pass code
- 3 zones: Main (PS4, 6-player, ₦1500/hr), VIP (PS5, 2-player, ₦3000/hr), VR (1-player, ₦2000/hr)
- Time slots: 10 AM–8 PM weekdays, 1 PM–8 PM Sundays
- Duration-based pricing with drinks add-ons
- Paystack integration or pay-at-venue option

### 2. Marketplace — Swap-First Gaming Marketplace
**Route:** `/marketplace`
**Identity:** Swap-first design — swapping is the key differentiator over platforms like Jiji.ng
**Features:** Create/browse listings, filter by category/type/saved, search, sort, price range filter
- **Listing types:** swap (default), sell_or_swap, sell — swap-first ordering
- **Multi-tag swap wants:** Users specify what they want via chips (Enter to add, quick-add suggestions from SWAP_SUGGESTIONS), stored as `swap_for_tags: string[]`, max 8 tags
- **Buyout price:** Swap-only listings can set an optional cash buyout price
- **Save/favorite system:** Heart button on cards and detail modal, listing_saves table, toggleSave like/unlike pattern, "Saved" filter pill (auth-only)
- **View tracking:** Eye icon + count on cards, views_count incremented via `increment_views` RPC (once per session via viewedRef Set)
- **Swap proposal system:** Users pick one of their own active listings to offer as swap, add optional message → creates swap_proposals row. Listing owners see proposals panel with accept/decline buttons
- **Engagement stats:** Views count + saves count displayed on cards and detail modal
- **Seller info:** Avatar (image or initials), name, gamertag, "Member since" date
- Categories: Controllers, Games, Accessories, Furniture, Consoles
- Image upload (Supabase Storage: `marketplace-images` bucket, max 4 photos)
- Direct messaging with sellers (integrates with Messages) + WhatsApp fallback
- Conditions: New, Like New, Good, Fair
- Price range filter (collapsible min/max inputs, hidden when filter is "swap")
- Auto-message on first contact (swap-aware or buy-aware text)

### 3. Esports — Tournaments
**Route:** `/esports`, `/esports/[id]`
**Features:** Browse tournaments, register, host your own, leaderboard
- Any signed-in user can host tournaments
- Host management: edit details, start/complete/cancel, view registrants
- Status flow: open → in_progress → completed (or cancelled from any non-completed)
- Leaderboard with points, wins, losses
- Stats bar: open count, total prize pool, total tournaments
- Games: FC 26, Tekken 8, MK1, Call of Duty, etc.
- Formats: Single Elimination, Double Elimination, Round Robin, Swiss, etc.

### 4. Community — Social Feed
**Route:** `/community`
**Features:** Post, like, comment, share, real-time updates
- Create posts with optional image upload (Supabase Storage: `community-images` bucket)
- Edit & delete own posts (inline edit mode, delete confirmation)
- Like with "liked by" modal showing who liked
- Comment with delete own comments (hover-reveal)
- Share: Web Share API or clipboard fallback
- Search bar + sort (Most Recent, Most Liked, My Posts)
- Pagination with Load More (15 posts per page)
- Pinned posts always sorted to top
- Auth gate: unauthenticated users prompted to sign in
- Real-time: post inserts/deletes + comment inserts/deletes via Supabase channels
- Avatar support: profile image or colored initials fallback
- Gamertag display (@gamertag under names)

### 5. Messages — Direct Messaging
**Route:** `/messages`
**Features:** Conversation list, chat thread, real-time delivery
- Split layout: conversation list (left) + chat thread (right)
- Mobile responsive: swipe between list and thread
- Unread count badges (navbar + conversation list)
- Auto-create conversation on marketplace inquiry
- Real-time message delivery via Supabase subscriptions

### 6. Events
**Route:** `/events`, `/events/[id]`
**Features:** Browse, register, calendar view
- Event types: Party, Special, Demo, Package
- List view + calendar view toggle
- Registration with capacity tracking
- Free or paid events

### 7. Admin — Giveaway Draw
**Route:** `/admin/giveaway`
**Features:** Monthly draw, winner selection, voucher generation
- Pick winners from eligible entries (users who booked that month)
- Generate unique voucher codes
- Track draw history and stats

### 8. Auth
- Email/password signup + signin
- Social providers: Google, Apple, Azure (Outlook), Discord
- Password strength meter
- Reset password flow
- Profile: full_name, phone, avatar_url, gamertag, points, wins, losses

### 9. AI Concierge
- Claude-powered chatbot widget (floating button)
- Answers questions about the lounge, pricing, availability
- Uses Zod-validated chat history

---

## DATA MODELS (Supabase/PostgreSQL)

```typescript
Profile        { id, full_name, phone, avatar_url, gamertag, points, wins, losses, created_at }
Zone           { id, name, icon, capacity, console, description }
Game           { id, name, zone_id, price_per_unit, unit }
Booking        { id, user_id, zone_id, game_name, booking_date, time_slot, duration, drinks,
                 session_total, drinks_total, total, payment_method, payment_status,
                 paystack_reference, pass_code, status, created_at }
Tournament     { id, title, game, date, time, entry_fee, prize, slots, filled, format,
                 platform, status, rules, created_by, created_at }
TournamentRegistration { id, tournament_id, user_id, payment_status, paystack_reference, registered_at }
Event          { id, title, date, time, type, description, location, is_free, price,
                 capacity, image_url, created_at }
MarketplaceListing { id, seller_id, title, price, condition, category, description, images,
                     listing_type, swap_for, swap_for_tags[], buyout_price, views_count,
                     status, created_at, seller?, saves_count, user_has_saved }
SwapProposal       { id, listing_id, proposer_id, offered_listing_id, message, status
                     (pending|accepted|declined), created_at, proposer?, offered_listing? }
ListingSave        { id, listing_id, user_id, created_at } -- (DB table: listing_saves)
CommunityPost  { id, author_id, content, image_url, is_pinned, created_at, author?,
                 likes_count, comments_count, user_has_liked }
PostComment    { id, post_id, author_id, content, created_at, author? }
Conversation   { id, listing_id, buyer_id, seller_id, created_at, updated_at,
                 listing?, buyer?, seller?, last_message?, unread_count? }
Message        { id, conversation_id, sender_id, content, is_read, created_at, sender? }
GiveawayEntry  { id, user_id, booking_id, month, created_at }
GiveawayDraw   { id, month, drawn_at, drawn_by }
Voucher        { id, code, user_id, draw_id, prize_label, zone_id, duration,
                 status, redeemed_at, redeemed_booking_id, expires_at, notified, created_at }
```

---

## ARCHITECTURE PATTERNS

### Hook Pattern
Every feature hook follows the same structure:
```typescript
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [actionLoading, setActionLoading] = useState(false);
const supabase = createClient();

const doAction = useCallback(async (...) => {
  setActionLoading(true);
  const { data: { user } } = await supabase.auth.getUser();
  // ... supabase query
  // ... optimistic local state update
  setActionLoading(false);
}, [supabase]);
```

### Auth Gate Pattern
```typescript
if (!user) {
  window.dispatchEvent(new CustomEvent("open-auth-modal"));
  return;
}
```

### Real-time Pattern
```typescript
const channelRef = useRef<RealtimeChannel | null>(null);
const subscribe = useCallback(() => {
  const channel = supabase
    .channel("channel-name")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "..." }, handler)
    .subscribe();
  channelRef.current = channel;
  return () => supabase.removeChannel(channel);
}, [supabase]);
```

### Modal Pattern
Forms use useState per field, computed `isValid`, onSubmit callback with loading prop, resetForm on close.

---

## BRAND DETAILS

- **Name:** Creative Gaming Entertainment (CGE)
- **Location:** Bonny Island, Nigeria
- **Currency:** Naira (₦)
- **Hours:** Mon-Sat 10 AM–9 PM, Sun 1 PM–9 PM
- **Age Policy:** 10+ with guardian, 16+ solo
- **Contact:** WhatsApp, phone, email
- **Social:** Instagram, Twitter/X, TikTok, Discord

---

## CONVENTIONS

- **File naming:** kebab-case for files, PascalCase for components
- **Exports:** Named exports for components, default export for pages
- **Styling:** Tailwind utility classes, `cn()` for conditional classes
- **State:** Local state with hooks, no global state library
- **Validation:** Zod schemas in `lib/validations.ts`
- **Types:** Centralized in `lib/types.ts`
- **Errors:** toast notifications via react-hot-toast
- **Loading:** Skeleton components for initial load, spinner for actions
- **Empty states:** EmptyState component with icon, title, subtitle, optional action

---

## PENDING / FUTURE ITEMS

### Database Migrations Needed

**Community:**
- `ALTER TABLE community_posts ADD COLUMN image_url text DEFAULT NULL;`
- Storage bucket: `community-images` (public) with upload/view/delete policies

**Tournaments:**
- `ALTER TABLE tournaments ADD COLUMN created_by uuid REFERENCES profiles(id);` + RLS policies for host management

**Marketplace Upgrade (swap-first):**
```sql
-- 1. Add new columns to marketplace_listings
ALTER TABLE marketplace_listings ADD COLUMN swap_for_tags text[] DEFAULT '{}';
ALTER TABLE marketplace_listings ADD COLUMN buyout_price integer DEFAULT NULL;
ALTER TABLE marketplace_listings ADD COLUMN views_count integer DEFAULT 0;

-- 2. Create listing_saves table
CREATE TABLE listing_saves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, user_id)
);

-- 3. Create swap_proposals table
CREATE TABLE swap_proposals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  proposer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  offered_listing_id uuid REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(listing_id, proposer_id, offered_listing_id)
);

-- 4. RLS policies for listing_saves
ALTER TABLE listing_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view saves counts" ON listing_saves FOR SELECT USING (true);
CREATE POLICY "Authenticated users can save" ON listing_saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can unsave" ON listing_saves FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. RLS policies for swap_proposals
ALTER TABLE swap_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their proposals" ON swap_proposals FOR SELECT TO authenticated
  USING (proposer_id = auth.uid() OR listing_id IN (SELECT id FROM marketplace_listings WHERE seller_id = auth.uid()));
CREATE POLICY "Users can create proposals" ON swap_proposals FOR INSERT TO authenticated
  WITH CHECK (proposer_id = auth.uid());
CREATE POLICY "Listing owners can update proposal status" ON swap_proposals FOR UPDATE TO authenticated
  USING (listing_id IN (SELECT id FROM marketplace_listings WHERE seller_id = auth.uid()));

-- 6. Create increment_views RPC function
CREATE OR REPLACE FUNCTION increment_views(listing_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE marketplace_listings SET views_count = views_count + 1 WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Future
- **Mobile app:** When ready, evaluate Firebase alongside Supabase (not full migration). Use Firebase for push notifications (FCM), analytics, crashlytics. Keep Supabase as primary database.
