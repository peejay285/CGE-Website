"use client";

import {
  Trophy,
  Flame,
  Target,
  Star,
  Zap,
  MapPin,
  Gamepad2,
  ShieldCheck,
  Crown,
  Calendar,
  Share2,
  ArrowLeftRight,
  ShoppingBag,
  Users,
  Swords,
  Handshake,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  StarRating,
  TRUST_CONFIG,
} from "@/components/marketplace/seller-profile-card";
import { AchievementBadge } from "@/components/esports/achievement-badge";
import type { PlayerAchievement, Profile } from "@/lib/types";

/**
 * Only public-safe profile fields — never phone or payout details.
 * The /player/[id] server component selects exactly these columns.
 */
export type PublicPlayerProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "avatar_url"
  | "gamertag"
  | "points"
  | "wins"
  | "losses"
  | "created_at"
  | "trust_level"
  | "avg_rating"
  | "rating_count"
  | "total_sales"
  | "total_swaps"
  | "bio"
  | "favourite_game"
  | "follower_count"
  | "tournament_count"
  | "achievement_count"
  | "location_state"
  | "is_id_verified"
  | "premium_tier"
>;

interface PlayerCardProps {
  profile: PublicPlayerProfile;
  achievements?: PlayerAchievement[];
}

export function PlayerCard({ profile, achievements = [] }: PlayerCardProps) {
  const displayName = profile.gamertag || profile.full_name || "CGE Member";
  const trustLevel =
    (profile.trust_level as keyof typeof TRUST_CONFIG) ?? "new";
  const trustConfig = TRUST_CONFIG[trustLevel];
  const TrustIcon = trustConfig.icon;

  const wins = profile.wins ?? 0;
  const losses = profile.losses ?? 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : null;

  const avgRating = Number(profile.avg_rating ?? 0);
  const ratingCount = profile.rating_count ?? 0;

  const unlockedAchievements = achievements.filter((pa) => pa.achievement);

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    "en-NG",
    { month: "long", year: "numeric" }
  );

  async function handleShare() {
    const shareUrl = `${window.location.origin}/player/${profile.id}`;
    const shareText = `Check out ${displayName}'s Player Card on CGE${
      wins > 0 ? ` — ${wins} win${wins === 1 ? "" : "s"}` : ""
    }`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} — CGE Player Card`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled — do nothing
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      } catch {
        // Ignore
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* ── The card (screenshot artifact) ─────────────────────────── */}
      <div
        className="rounded-3xl p-[1.5px] bg-gradient-to-br from-cyan via-magenta/60 to-cyan shadow-[0_0_40px_rgba(0,240,255,0.12),0_0_80px_rgba(255,45,120,0.08)]"
      >
        <div className="rounded-3xl bg-base overflow-hidden">
          {/* Header — subtle dual-glow backdrop */}
          <div className="relative px-5 pt-6 pb-5">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(0,240,255,0.10),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(255,45,120,0.10),transparent_55%)]"
            />

            <div className="relative flex items-start gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-br from-cyan to-magenta shrink-0">
                <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-cyan">
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-xl font-bold font-heading text-text truncate">
                    {displayName}
                  </h1>
                  {profile.is_id_verified && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[9px] font-semibold rounded-md px-1.5 py-0.5 border bg-cyan/15 border-cyan/35 text-cyan shrink-0"
                      title="ID Verified"
                    >
                      <ShieldCheck size={9} />
                      Verified
                    </span>
                  )}
                  {profile.premium_tier === "premium" && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold rounded-md px-1.5 py-0.5 border bg-gold/15 border-gold/35 text-gold shrink-0">
                      <Crown size={9} />
                      Premium
                    </span>
                  )}
                </div>

                {profile.gamertag && profile.full_name && (
                  <p className="text-xs text-text-muted truncate">
                    {profile.full_name}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold rounded-md px-2 py-0.5 border",
                      trustConfig.bg,
                      trustConfig.border,
                      trustConfig.color
                    )}
                  >
                    <TrustIcon size={10} />
                    {trustConfig.label}
                  </span>
                  {profile.location_state && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                      <MapPin size={10} />
                      {profile.location_state}
                    </span>
                  )}
                  {profile.favourite_game && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                      <Gamepad2 size={10} />
                      {profile.favourite_game}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {profile.bio && (
              <p className="relative text-xs text-text-muted leading-relaxed mt-3 line-clamp-2">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-5 divide-x divide-border border-y border-border bg-surface/60">
            <HeroStat label="Wins" value={String(wins)} accent="text-gold" />
            <HeroStat label="Losses" value={String(losses)} />
            <HeroStat
              label="Win rate"
              value={winRate !== null ? `${winRate}%` : "—"}
              accent="text-cyan"
            />
            <HeroStat
              label="Points"
              value={(profile.points ?? 0).toLocaleString()}
              accent="text-magenta"
            />
            <HeroStat
              label="Tourneys"
              value={String(profile.tournament_count ?? 0)}
            />
          </div>

          {/* Two-axis identity: competitor + trader */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {/* Competitive block — magenta */}
            <div className="rounded-xl border border-magenta/25 bg-magenta/5 p-3.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-magenta mb-2.5 flex items-center gap-1.5">
                <Swords size={11} />
                Competitor
              </p>
              <div className="space-y-1.5">
                <MiniStat
                  icon={<Flame size={12} className="text-gold" />}
                  label="Wins"
                  value={String(wins)}
                />
                <MiniStat
                  icon={<Target size={12} className="text-magenta" />}
                  label="Win rate"
                  value={winRate !== null ? `${winRate}%` : "No matches yet"}
                />
                <MiniStat
                  icon={<Trophy size={12} className="text-magenta" />}
                  label="Tournaments"
                  value={String(profile.tournament_count ?? 0)}
                />
                <MiniStat
                  icon={<Zap size={12} className="text-gold" />}
                  label="Points"
                  value={(profile.points ?? 0).toLocaleString()}
                />
              </div>
            </div>

            {/* Trader block — cyan */}
            <div className="rounded-xl border border-cyan/25 bg-cyan/5 p-3.5">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-cyan mb-2.5 flex items-center gap-1.5">
                <Handshake size={11} />
                Trader
              </p>
              <div className="space-y-1.5">
                <MiniStat
                  icon={<TrustIcon size={12} className={trustConfig.color} />}
                  label="Trust level"
                  value={trustConfig.label}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <Star size={12} className="text-gold" />
                    Rating
                  </span>
                  {ratingCount > 0 ? (
                    <StarRating rating={avgRating} size={10} showValue />
                  ) : (
                    <span className="text-[11px] font-semibold text-text-muted">
                      No reviews yet
                    </span>
                  )}
                </div>
                <MiniStat
                  icon={<ArrowLeftRight size={12} className="text-cyan" />}
                  label="Swaps"
                  value={String(profile.total_swaps ?? 0)}
                />
                <MiniStat
                  icon={<ShoppingBag size={12} className="text-cyan" />}
                  label="Sales"
                  value={String(profile.total_sales ?? 0)}
                />
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="px-4 pb-4">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted mb-2.5 flex items-center gap-1.5">
              <Trophy size={11} className="text-gold" />
              Achievements
              {(profile.achievement_count ?? unlockedAchievements.length) >
                0 && (
                <span className="text-gold">
                  {profile.achievement_count ?? unlockedAchievements.length}
                </span>
              )}
            </p>
            {unlockedAchievements.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {unlockedAchievements.slice(0, 8).map((pa) => (
                  <AchievementBadge
                    key={pa.id}
                    achievement={pa.achievement!}
                    unlocked
                    size="sm"
                  />
                ))}
                {unlockedAchievements.length > 8 && (
                  <span className="text-xs text-text-muted self-center">
                    +{unlockedAchievements.length - 8} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-text-muted">
                No achievements unlocked yet
              </p>
            )}
          </div>

          {/* Footer — member since + brand mark */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface/60">
            <p className="text-[10px] text-text-muted flex items-center gap-1.5">
              <Calendar size={10} />
              Member since {memberSince}
            </p>
            <div className="flex items-center gap-3">
              {(profile.follower_count ?? 0) > 0 && (
                <span className="text-[10px] text-text-muted flex items-center gap-1">
                  <Users size={10} />
                  {profile.follower_count} follower
                  {profile.follower_count === 1 ? "" : "s"}
                </span>
              )}
              <span className="text-[10px] font-bold font-heading tracking-widest bg-gradient-to-r from-cyan to-magenta bg-clip-text text-transparent">
                CGE PLAYER CARD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Share (kept outside the card so screenshots stay clean) ── */}
      <button
        type="button"
        onClick={handleShare}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan transition-all hover:bg-cyan/15 hover:border-cyan/50 active:scale-[0.99] cursor-pointer"
      >
        <Share2 size={16} />
        Share my card
      </button>
    </div>
  );
}

// ── Hero stat (top strip) ───────────────────────────────────────────────────

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="py-3 text-center">
      <p className={cn("text-base font-bold font-heading", accent ?? "text-text")}>
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-text-muted mt-0.5">
        {label}
      </p>
    </div>
  );
}

// ── Mini stat row (identity blocks) ─────────────────────────────────────────

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
        {icon}
        {label}
      </span>
      <span className="text-[11px] font-semibold text-text">{value}</span>
    </div>
  );
}
