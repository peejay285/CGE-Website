import type { ListingCondition } from "./types";

export const BRAND = {
  name: "Creative Gaming Entertainment",
  short: "CGE",
  address: "1 IT William Street, Akiama, Bonny Island",
  phone: "08160658509",
  email: "Creativegamingent@gmail.com",
  whatsapp: "https://wa.me/2348160658509",
  hours: { weekday: "10 AM – 9 PM", sunday: "1 PM – 9 PM" },
  agePolicy: "13+",
} as const;

// Interim reschedule/cancel policy — single source of truth for the copy
// shown before payment (lounge wizard) and after (booking confirmation).
export const RESCHEDULE_POLICY = {
  hoursNotice: 6,
  shortLead: "Free reschedule up to 6 hours before your session",
  short:
    "Free reschedule up to 6 hours before your session — message us on WhatsApp.",
  full:
    "Need to reschedule or cancel? Contact us on WhatsApp at least 6 hours before your session and we'll move it free of charge.",
} as const;

// Real offline event history — the trust seed for "₦ Won At CGE Events":
// Invasion Dec 2025 ₦1,000,000 pools (FC26 800K + MK 100K + CODM 100K)
// + Warfare Series Mar 2026 ₦200,000. Platform tournament winnings are
// added on top of this seed wherever it's displayed.
export const EVENT_PRIZES_AWARDED_NAIRA = 1_200_000;

/**
 * Compact naira display for prize totals — "₦1.2M+" style (ACGL
 * "R2.5m+ awarded" trust pattern). Shared by the home stats bar and the
 * esports hero so both always agree.
 */
export function formatNairaCompact(total: number): string {
  if (total >= 1_000_000) {
    return `₦${(total / 1e6).toFixed(1).replace(/\.0$/, "")}M+`;
  }
  return `₦${total.toLocaleString()}`;
}

export const PRICING = {
  mainLounge: [
    { game: "FC 26", price: 3000, unit: "hr" },
    { game: "Other Games", price: 2000, unit: "hr" },
  ],
  vipLounge: [
    { game: "Private PS5 Room", price: 5000, unit: "hr" },
  ],
  vr: [{ game: "VR Experience", price: 2000, unit: "15 min session" }],
  drinks: [
    { name: "Coca-Cola", price: 500, category: "drink" },
    { name: "Fanta", price: 500, category: "drink" },
    { name: "Sprite", price: 500, category: "drink" },
    { name: "Water", price: 300, category: "drink" },
    { name: "Energy Drink", price: 800, category: "drink" },
  ],
  snacks: [
    { name: "Chin Chin", price: 300, category: "snack" },
    { name: "Pringles", price: 1500, category: "snack" },
    { name: "Popcorn", price: 500, category: "snack" },
    { name: "Gala", price: 300, category: "snack" },
    { name: "Biscuits", price: 500, category: "snack" },
  ],
} as const;

// Zone photos: drop real images into /public/zones/{main,vip,vr}.jpg and they
// auto-replace the gradient placeholder. Path is relative to /public.
export const ZONES = [
  {
    id: "main",
    name: "Main Lounge",
    icon: "🎮",
    tagline: "Where squads pull up.",
    capacity: 6,
    capacityLabel: "6 stations",
    console: "PS4",
    desc: "Gaming arena with 6 PS4 stations",
    image: "/zones/main.jpg",
    gradient: "from-cyan/30 via-cyan/10 to-base",
  },
  {
    id: "vip",
    name: "VIP Lounge",
    icon: "👑",
    tagline: "A private room for main characters.",
    capacity: 1,
    capacityLabel: "1 player",
    console: "PS5",
    desc: "Private PS5 space for one ticket at a time",
    image: "/zones/vip.jpg",
    gradient: "from-gold/30 via-gold/10 to-base",
  },
  {
    id: "vr",
    name: "VR Zone",
    icon: "🥽",
    tagline: "Step inside the game.",
    capacity: 2,
    capacityLabel: "2 players",
    console: "VR",
    desc: "Immersive VR sessions for up to 2 players",
    image: "/zones/vr.jpg",
    gradient: "from-magenta/30 via-magenta/10 to-base",
  },
] as const;

export const TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
] as const;

// Sunday opens at 1 PM
export const SUNDAY_TIME_SLOTS = [
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
] as const;

export const GAME_OPTIONS: Record<string, string[]> = {
  main: ["FC 26", "Tekken 8", "Mortal Kombat 1", "Call of Duty", "GTA V", "NBA 2K25"],
  vip: ["FC 26", "Tekken 8", "Mortal Kombat 1", "Call of Duty", "Spider-Man 2", "God of War"],
  vr: ["Beat Saber", "VR Boxing", "VR Racing", "VR Adventure"],
};

export const MARKETPLACE_CATEGORIES = [
  "All",
  "Controllers",
  "Games",
  "Accessories",
  "Furniture",
  "Consoles",
] as const;

// ── Listing condition taxonomy (Nigerian market / Jiji pattern) ─────────────
// Canonical stored values are snake_case. Legacy rows created before the
// taxonomy migration may still hold the old free-text values ("New",
// "Used - Like New", "Used - Good", "Used - Fair"); normalizeListingCondition
// maps them so they keep rendering correctly everywhere.
export const LISTING_CONDITIONS = [
  "brand_new",
  "foreign_used",
  "local_used",
] as const;

export const LISTING_CONDITION_CONFIG: Record<
  ListingCondition,
  {
    label: string;
    helper: string;
    /** Badge color name (components/ui/badge) */
    badgeColor: "green" | "cyan" | "neutral";
    /** Raw Tailwind classes for compact tag chips (listing cards) */
    tagClass: string;
  }
> = {
  brand_new: {
    label: "Brand New",
    helper: "Sealed or unused, in original packaging",
    badgeColor: "green",
    tagClass: "bg-green/15 text-green border-green/25",
  },
  foreign_used: {
    label: "Foreign Used",
    helper: "Imported second-hand (UK/US used)",
    badgeColor: "cyan",
    tagClass: "bg-cyan/15 text-cyan border-cyan/25",
  },
  local_used: {
    label: "Local Used",
    helper: "Used here in Nigeria",
    badgeColor: "neutral",
    tagClass: "bg-surface-alt text-text-muted border-border",
  },
} as const;

/**
 * Maps any stored condition value (canonical or legacy free text) to the
 * canonical taxonomy. Mirrors the mapping in
 * supabase/listing-condition-taxonomy-migration.sql — keep both in sync.
 */
export function normalizeListingCondition(
  condition: string
): ListingCondition | null {
  const c = condition.trim().toLowerCase();
  if (c === "brand_new" || c === "new" || c === "brand new") return "brand_new";
  if (c === "foreign_used" || c === "foreign used") return "foreign_used";
  if (c === "local_used" || c === "local used" || c.startsWith("used"))
    return "local_used";
  return null;
}

/**
 * Shared value→label/color lookup so the condition tag renders identically
 * everywhere (cards, detail, proposals, filters). Unknown legacy values fall
 * back to neutral styling with the raw text as the label.
 */
export function getConditionConfig(condition: string) {
  const normalized = normalizeListingCondition(condition);
  if (normalized) return LISTING_CONDITION_CONFIG[normalized];
  return {
    label: condition,
    helper: "",
    badgeColor: "neutral" as const,
    tagClass: "bg-surface-alt text-text-muted border-border",
  };
}

export const TOURNAMENT_GAMES = [
  "FC 26",
  "Tekken 8",
  "Call of Duty",
  "MK1",
  "NBA 2K",
  "GTA",
  "Spider-Man",
  "God of War",
] as const;

export const TOURNAMENT_FORMATS = [
  "Single Elimination",
  "Double Elimination",
  "Round Robin",
  "Swiss",
  "Best of 3",
  "Best of 5",
] as const;

export const TOURNAMENT_PLATFORMS = [
  "PS5",
  "Xbox Series X",
  "PC",
  "Cross-Platform",
  "Mobile",
] as const;

export const SWAP_SUGGESTIONS = [
  "PS5 Controller",
  "Xbox Controller",
  "Gaming Headset",
  "FIFA/FC 26",
  "GTA VI",
  "Gaming Mouse",
  "Mechanical Keyboard",
  "Gaming Monitor",
  "PS5 Console",
  "Xbox Series X",
  "Nintendo Switch",
  "VR Headset",
  "Gaming Chair",
  "Any PS5 Game",
  "Any Xbox Game",
] as const;

export const ASSISTED_SWAP_SERVICE = {
  title: "CGE Assisted Swap",
  label: "Optional paid service",
  body:
    "For higher-value trades, CGE can help coordinate a lounge meetup, identity check, inspection checklist, and handover record. Users still inspect and decide before exchanging items.",
  note:
    "CGE facilitates the process only; item value, ownership, and long-term condition remain the responsibility of the trading parties.",
} as const;

// Tiered facilitation fee, based on the higher-valued item in the swap.
// The fee is split 50/50 between the two parties. Mirrored in SQL by the
// assist_fee_for_value() function — keep both in sync if the bands change.
export const ASSISTED_SWAP_FEE_TIERS = [
  { maxValue: 20000, fee: 1000 },
  { maxValue: 50000, fee: 2500 },
  { maxValue: Infinity, fee: 5000 },
] as const;

// Premium members get this many assisted-swap shares free per calendar month.
export const PREMIUM_ASSIST_MONTHLY_QUOTA = 3;

/** The total facilitation fee for a swap whose higher-valued item is `value`. */
export function assistFeeForValue(value: number): number {
  for (const tier of ASSISTED_SWAP_FEE_TIERS) {
    if (value <= tier.maxValue) return tier.fee;
  }
  return ASSISTED_SWAP_FEE_TIERS[ASSISTED_SWAP_FEE_TIERS.length - 1].fee;
}

// Preset avatars — DiceBear "bottts-neutral" (gaming bot heads, free SVGs).
// avatar_url just holds the URL so any picture (preset or upload) is uniform.
export const DEFAULT_AVATARS = [
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cge-rookie",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cge-shadow",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cge-pixel",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cge-titan",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cge-nova",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cge-ghost",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cge-flux",
  "https://api.dicebear.com/7.x/bottts-neutral/svg?seed=cge-kappa",
] as const;

// Premium tier perks. Single source of truth for the gating logic and the
// upgrade page copy.
export const PREMIUM_LIMITS = {
  freeMaxImages: 4,
  premiumMaxImages: 8,
} as const;

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export type NigerianState = typeof NIGERIAN_STATES[number];

export const SAFETY_GUIDELINES = {
  short:
    "CGE is not a party to peer-to-peer trades. Verify the other user, meet in public or ship with tracking, and inspect items before exchanging.",
  title: "How to swap and sell safely",
  intro:
    "Trades happen directly between users. CGE provides the platform — we don't hold items, handle payments, or referee disputes. A few habits will keep you safe.",
  tips: [
    {
      heading: "Verify before you commit",
      body: "Check the other user's rating, swap count, and how long they've been a member. Ask for extra photos or a video call to confirm the item.",
    },
    {
      heading: "Meet in public, or ship with tracking",
      body: "If you can meet, choose a busy public place with cameras and people around. If you're shipping, use a courier with tracking on both sides of the swap.",
    },
    {
      heading: "Inspect on arrival",
      body: "Open the item and confirm it matches the listing before you hand over yours or release payment.",
    },
    {
      heading: "Keep the conversation in-app",
      body: "If something goes wrong, the on-platform record is your evidence. Off-platform chats can't be reviewed by our team.",
    },
    {
      heading: "Report problems",
      body: "If a user behaves badly, report them. We can suspend bad actors — but only if you tell us.",
    },
  ],
} as const;

export const NAV_LINKS = [
  { label: "Lounge", href: "/lounge" },
  { label: "Esports", href: "/esports" },
  { label: "Events", href: "/events" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Community", href: "/community" },
  { label: "About", href: "/about" },
] as const;
