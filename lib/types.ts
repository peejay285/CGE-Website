export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  gamertag: string | null;
  points: number;
  wins: number;
  losses: number;
  created_at: string;
  // Trust system fields
  total_listings?: number;
  total_sales?: number;
  total_swaps?: number;
  avg_rating?: number;
  rating_count?: number;
  trust_level?: "new" | "verified" | "trusted" | "power";
  // Enhanced profile fields
  bio?: string | null;
  favourite_game?: string | null;
  team_id?: number | null;
  follower_count?: number;
  following_count?: number;
  tournament_count?: number;
  achievement_count?: number;
}

export interface Zone {
  id: string;
  name: string;
  icon: string;
  capacity: number;
  console: string;
  description: string;
}

export interface Game {
  id: number;
  name: string;
  zone_id: string;
  price_per_unit: number;
  unit: string;
}

export interface Booking {
  id: string;
  user_id: string;
  zone_id: string;
  game_name: string;
  booking_date: string;
  time_slot: string;
  duration: number;
  drinks: Record<string, number>;
  session_total: number;
  drinks_total: number;
  total: number;
  payment_method: "paystack" | "venue";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  paystack_reference: string | null;
  pass_code: string | null;
  status: "confirmed" | "cancelled" | "completed";
  created_at: string;
}

export interface Tournament {
  id: number;
  title: string;
  game: string;
  date: string;
  time: string;
  entry_fee: number;
  prize: string;
  slots: number;
  filled: number;
  format: string;
  platform: string;
  status: "open" | "full" | "in_progress" | "completed" | "cancelled";
  rules: string | null;
  created_by: string | null;
  created_at: string;
  // New fields
  stream_url?: string | null;
  series_id?: number | null;
  team_size?: number;
  check_in_required?: boolean;
  check_in_opens_minutes?: number;
  bracket_type?: string | null;
  description?: string | null;
  max_team_size?: number;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: number;
  user_id: string;
  payment_status: string;
  paystack_reference: string | null;
  registered_at: string;
  checked_in?: boolean;
  checked_in_at?: string | null;
}

export interface TournamentRegistrant {
  id: string;
  tournament_id: number;
  user_id: string;
  payment_status: string;
  registered_at: string;
  checked_in?: boolean;
  checked_in_at?: string | null;
  profile?: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
}

// ── Bracket & Match Types ────────────────────────────

export type MatchStatus = "pending" | "in_progress" | "completed" | "bye" | "disputed";

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  round: number;
  match_number: number;
  bracket_position?: string | null; // 'winners' | 'losers'
  participant1_id: string | null;
  participant2_id: string | null;
  participant1_name: string | null;
  participant2_name: string | null;
  participant1_seed?: number | null;
  participant2_seed?: number | null;
  participant1_score: number | null;
  participant2_score: number | null;
  winner_id: string | null;
  loser_id: string | null;
  status: MatchStatus;
  reported_by?: string | null;
  reported_at?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  next_match_id: number | null;
  next_match_slot: number | null;
  loser_next_match_id?: number | null;
  loser_next_match_slot?: number | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface MatchDispute {
  id: number;
  match_id: number;
  reported_by: string;
  reason: string;
  evidence_urls: string[];
  status: "open" | "resolved" | "dismissed";
  resolved_by?: string | null;
  resolution?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

// ── Team Types ───────────────────────────────────────

export interface Team {
  id: number;
  name: string;
  tag: string | null;
  logo_url: string | null;
  captain_id: string;
  description: string | null;
  game: string | null;
  created_at: string;
  member_count?: number;
  captain?: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
}

export interface TeamMember {
  id: number;
  team_id: number;
  user_id: string;
  role: "captain" | "co-captain" | "member";
  joined_at: string;
  profile?: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
}

// ── Tournament Series Types ──────────────────────────

export interface TournamentSeries {
  id: number;
  title: string;
  description: string | null;
  game: string;
  format: string;
  platform: string;
  frequency: "weekly" | "biweekly" | "monthly";
  entry_fee: number;
  prize_template: string | null;
  slots: number;
  rules: string | null;
  team_size: number;
  stream_url: string | null;
  image_url: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  tournament_count?: number;
}

// ── Achievement Types ────────────────────────────────

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "general" | "tournament" | "social" | "milestone";
  points: number;
  rarity: AchievementRarity;
  created_at: string;
}

export interface PlayerAchievement {
  id: number;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  tournament_id?: number | null;
  achievement?: Achievement;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  type: "Party" | "Special" | "Demo" | "Package";
  description: string | null;
  location: string | null;
  is_free: boolean;
  price: number | null;
  capacity: number | null;
  image_url: string | null;
  created_at: string;
}

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  title: string;
  price: number;
  condition: string;
  category: string;
  description: string | null;
  images: string[];
  listing_type: "sell" | "swap" | "sell_or_swap";
  swap_for: string | null;
  swap_for_tags: string[];
  buyout_price: number | null;
  location: string | null;
  views_count: number;
  status: "active" | "sold" | "archived";
  created_at: string;
  seller?: Profile;
  saves_count: number;
  user_has_saved: boolean;
}

export interface SwapProposal {
  id: string;
  listing_id: string;
  proposer_id: string;
  offered_listing_id: string;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  proposer?: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
  offered_listing?: Pick<MarketplaceListing, "id" | "title" | "images" | "condition" | "category">;
}

// ── Community Topic Types ────────────────────────────

export type CommunityTopic =
  | "general"
  | "gaming-news"
  | "lfg"
  | "clips"
  | "memes"
  | "marketplace-talk"
  | "tournament-talk"
  | "tech-talk"
  | "introductions";

export interface TopicConfig {
  id: CommunityTopic;
  label: string;
  icon: string;
  color: string;
  description: string;
}

// ── Community Reaction Types ────────────────────────

export type ReactionType = "fire" | "laugh" | "mind_blown" | "sad" | "angry" | "heart" | "gg";

export interface PostReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionCount {
  reaction_type: ReactionType;
  count: number;
  user_reacted: boolean;
}

// ── Community Poll Types ────────────────────────────

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  votes_count: number;
  user_voted: boolean;
}

export interface PostPoll {
  id: string;
  post_id: string;
  question: string;
  ends_at: string | null;
  total_votes: number;
  options: PollOption[];
  user_has_voted: boolean;
}

// ── Community Post (Enhanced) ───────────────────────

export interface CommunityPost {
  id: string;
  author_id: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  created_at: string;
  author?: Profile;
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  // Enhanced fields
  topic?: CommunityTopic | null;
  media_urls?: string[] | null;
  media_type?: "image" | "video" | "embed" | null;
  embed_url?: string | null;
  has_poll?: boolean;
  poll?: PostPoll | null;
  reactions?: ReactionCount[];
  bookmarked?: boolean;
  mentions?: string[];
  hashtags?: string[];
  share_count?: number;
  is_reported?: boolean;
  author_verified?: boolean;
  author_trust_level?: string | null;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
  // Enhanced
  mentions?: string[];
  reactions?: ReactionCount[];
}

// ── Community Bookmark Types ────────────────────────

export interface PostBookmark {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

// ── Community Report Types ──────────────────────────

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "misinformation"
  | "nsfw"
  | "self_harm"
  | "impersonation"
  | "other";

export interface PostReport {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

// ── Community Mention Types ─────────────────────────

export interface UserMention {
  id: string;
  post_id: string;
  mentioned_user_id: string;
  mentioned_by: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  listing?: Pick<MarketplaceListing, "id" | "title" | "price" | "images" | "listing_type" | "status">;
  buyer?: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
  seller?: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
}

export interface GiveawayEntry {
  id: string;
  user_id: string;
  booking_id: string;
  month: string;
  created_at: string;
}

export interface GiveawayDraw {
  id: number;
  month: string;
  drawn_at: string;
  drawn_by: string | null;
}

export interface Voucher {
  id: string;
  code: string;
  user_id: string;
  draw_id: number | null;
  prize_label: string;
  zone_id: string;
  duration: number;
  status: "active" | "redeemed" | "expired";
  redeemed_at: string | null;
  redeemed_booking_id: string | null;
  expires_at: string;
  notified: boolean;
  created_at: string;
}

// ── Trust System Types ─────────────────────────────────────────────────────

export interface SellerRating {
  id: string;
  seller_id: string;
  reviewer_id: string;
  listing_id: string;
  swap_proposal_id: string | null;
  rating: number;
  communication_rating: number | null;
  condition_rating: number | null;
  speed_rating: number | null;
  review: string | null;
  is_swap: boolean;
  created_at: string;
  reviewer?: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
  listing?: Pick<MarketplaceListing, "id" | "title" | "images">;
}

export interface SellerVerification {
  id: string;
  user_id: string;
  phone_verified: boolean;
  phone_verified_at: string | null;
  email_verified: boolean;
  email_verified_at: string | null;
  id_verified: boolean;
  id_verified_at: string | null;
  verification_level: number;
  created_at: string;
  updated_at: string;
}

export interface SellerStats {
  total_listings: number;
  total_sales: number;
  total_swaps: number;
  avg_rating: number;
  rating_count: number;
  trust_level: "new" | "verified" | "trusted" | "power";
}

export interface SellerProfile extends Profile {
  verification?: SellerVerification;
  ratings?: SellerRating[];
  stats?: SellerStats;
  active_listings?: MarketplaceListing[];
}
