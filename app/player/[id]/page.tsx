import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { PlayerAchievement } from "@/lib/types";
import {
  PlayerCard,
  type PublicPlayerProfile,
} from "@/components/player/player-card";

/**
 * Public-safe profile columns only — never phone, email or payout details.
 * Profiles are publicly readable via RLS ("Public profiles are viewable by
 * everyone" in supabase/migration.sql), so we must whitelist columns here.
 */
const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, avatar_url, gamertag, points, wins, losses, created_at, trust_level, avg_rating, rating_count, total_sales, total_swaps, bio, favourite_game, follower_count, tournament_count, achievement_count, location_state, is_id_verified, premium_tier";

/**
 * Minimal columns from the original profiles migration — used as a fallback
 * so the card degrades gracefully if later migrations (trust system,
 * enhanced profile, tier 4) haven't been applied to the database.
 */
const BASE_PROFILE_COLUMNS =
  "id, full_name, avatar_url, gamertag, points, wins, losses, created_at";

// UUIDs only — anything else is a guaranteed miss.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

async function fetchPublicProfile(
  id: string
): Promise<PublicPlayerProfile | null> {
  const supabase = getAnonClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle<PublicPlayerProfile>();

  if (!error) return data ?? null;

  // A column in the full select may not exist yet (unapplied migration) —
  // degrade gracefully to the base column set.
  const { data: baseData } = await supabase
    .from("profiles")
    .select(BASE_PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle<PublicPlayerProfile>();

  return baseData ?? null;
}

const FALLBACK_METADATA: Metadata = {
  title: "Player Card — CGE",
  description:
    "Tournaments, swaps and gaming culture — see this player's stats on CGE, Nigeria's gaming platform.",
  openGraph: {
    title: "CGE Player Card",
    description:
      "Tournaments, swaps and gaming culture — see this player's stats on CGE.",
  },
  twitter: {
    card: "summary",
    title: "CGE Player Card",
    description:
      "Tournaments, swaps and gaming culture — see this player's stats on CGE.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return FALLBACK_METADATA;

    const profile = await fetchPublicProfile(id);
    if (!profile) return FALLBACK_METADATA;

    const displayName = profile.gamertag || profile.full_name || "CGE Member";
    const title = `${displayName} — CGE Player Card`;

    const trustText =
      profile.trust_level === "power" || profile.trust_level === "trusted"
        ? "Trusted trader on CGE"
        : "Player on CGE, Nigeria's gaming platform";
    const wins = profile.wins ?? 0;
    const tournaments = profile.tournament_count ?? 0;
    const description = `${wins} win${wins === 1 ? "" : "s"} · ${tournaments} tournament${
      tournaments === 1 ? "" : "s"
    } · ${trustText}`;

    const image = profile.avatar_url;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        url: `/player/${id}`,
        ...(image ? { images: [{ url: image }] } : {}),
      },
      twitter: {
        card: "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return FALLBACK_METADATA;
  }
}

/**
 * Server component: fetches the profile + unlocked achievements with the
 * anon client (same approach as app/marketplace/listing/[id]/page.tsx) so
 * the card is in the HTML on first paint and shareable with rich previews.
 */
export default async function PlayerCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  let profile: PublicPlayerProfile | null = null;
  let achievements: PlayerAchievement[] = [];

  try {
    profile = await fetchPublicProfile(id);

    if (profile) {
      // player_achievements + achievements are publicly readable
      // ("Achievements are viewable by everyone" in esports-upgrade-migration).
      const supabase = getAnonClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("player_achievements")
          .select("*, achievement:achievements(*)")
          .eq("user_id", id)
          .order("unlocked_at", { ascending: false })
          .limit(24);

        if (!error && data) {
          achievements = data.map((item: Record<string, unknown>) => ({
            ...item,
            achievement: item.achievement ?? undefined,
          })) as PlayerAchievement[];
        }
      }
    }
  } catch {
    // Fetch failed — fall through; notFound() below handles the miss.
  }

  // Outside the try/catch: notFound() works by throwing.
  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        <PlayerCard profile={profile} achievements={achievements} />
      </div>
    </div>
  );
}
