"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Star,
  Shield,
  ShieldCheck,
  Crown,
  BadgeCheck,
  Mail,
  Phone,
  ArrowLeftRight,
  ShoppingBag,
  ChevronRight,
  Loader2,
  Trophy,
  Users,
  MessageSquare,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSellerProfile } from "@/hooks/use-seller-profile";
import type { Profile } from "@/lib/types";

// ── Trust badge config ─────────────────────────────────────────────────────

const TRUST_CONFIG = {
  new: {
    label: "New Seller",
    icon: Shield,
    color: "text-text-muted",
    bg: "bg-surface-alt",
    border: "border-border",
  },
  verified: {
    label: "Verified",
    icon: ShieldCheck,
    color: "text-cyan",
    bg: "bg-cyan/10",
    border: "border-cyan/25",
  },
  trusted: {
    label: "Trusted",
    icon: BadgeCheck,
    color: "text-green",
    bg: "bg-green/10",
    border: "border-green/25",
  },
  power: {
    label: "Power Seller",
    icon: Crown,
    color: "text-gold",
    bg: "bg-gold/10",
    border: "border-gold/25",
  },
} as const;

// ── Star rating display ────────────────────────────────────────────────────

function StarRating({
  rating,
  size = 14,
  showValue = true,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
}) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={size}
            className={cn(
              "transition-colors",
              i < fullStars
                ? "fill-gold text-gold"
                : i === fullStars && hasHalf
                  ? "fill-gold/50 text-gold"
                  : "text-text-muted/30"
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-xs font-medium text-text ml-0.5">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}

// ── Compact seller card (for listing detail modal) ─────────────────────────

interface SellerProfileCardProps {
  seller: Pick<
    Profile,
    | "id"
    | "full_name"
    | "avatar_url"
    | "gamertag"
    | "created_at"
    | "trust_level"
    | "avg_rating"
    | "rating_count"
    | "total_sales"
    | "total_swaps"
    | "wins"
    | "tournament_count"
    | "follower_count"
    | "is_id_verified"
    | "premium_tier"
  >;
  onViewProfile?: (sellerId: string) => void;
  compact?: boolean;
}

export function SellerProfileCard({
  seller,
  onViewProfile,
  compact = false,
}: SellerProfileCardProps) {
  const [stats, setStats] = useState<{
    avg_rating: number;
    rating_count: number;
    trust_level: string;
    total_sales: number;
    total_swaps: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const { getSellerQuickStats } = useSellerProfile();

  // Fetch live stats if the seller object doesn't have trust data
  const fetchStats = useCallback(async () => {
    if (seller.trust_level !== undefined && seller.avg_rating !== undefined) {
      setStats({
        avg_rating: Number(seller.avg_rating ?? 0),
        rating_count: seller.rating_count ?? 0,
        trust_level: seller.trust_level ?? "new",
        total_sales: seller.total_sales ?? 0,
        total_swaps: seller.total_swaps ?? 0,
      });
      return;
    }

    setStatsLoading(true);
    const result = await getSellerQuickStats(seller.id);
    if (result) setStats(result);
    setStatsLoading(false);
  }, [seller, getSellerQuickStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchStats();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStats]);

  const trustLevel =
    (stats?.trust_level as keyof typeof TRUST_CONFIG) ?? "new";
  const config = TRUST_CONFIG[trustLevel];
  const TrustIcon = config.icon;

  const memberSince = new Date(seller.created_at).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-xl bg-surface-alt border border-border p-3 transition-all",
          onViewProfile && "cursor-pointer hover:border-cyan/30"
        )}
        onClick={() => onViewProfile?.(seller.id)}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-cyan/10 border border-cyan/25 flex items-center justify-center overflow-hidden shrink-0">
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                alt={seller.full_name || "Seller"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-cyan">
                {(seller.full_name || "CM").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-text truncate">
                {seller.full_name || "CGE Member"}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-[9px] font-semibold rounded-md px-1.5 py-0.5 border shrink-0",
                  config.bg,
                  config.border,
                  config.color
                )}
              >
                <TrustIcon size={9} />
                {config.label}
              </span>
              {seller.is_id_verified && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold rounded-md px-1.5 py-0.5 border bg-cyan/15 border-cyan/35 text-cyan shrink-0">
                  <ShieldCheck size={9} />
                  Verified
                </span>
              )}
              {seller.premium_tier === "premium" && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold rounded-md px-1.5 py-0.5 border bg-gold/15 border-gold/35 text-gold shrink-0">
                  <Crown size={9} />
                  Premium
                </span>
              )}
            </div>

            {statsLoading ? (
              <Loader2 size={10} className="animate-spin text-text-muted mt-1" />
            ) : stats && stats.rating_count > 0 ? (
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating
                  rating={stats.avg_rating}
                  size={11}
                  showValue={true}
                />
                <span className="text-[10px] text-text-muted">
                  ({stats.rating_count})
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-text-muted mt-0.5">
                No reviews yet
              </p>
            )}
          </div>

          {/* Arrow */}
          {onViewProfile && (
            <ChevronRight
              size={16}
              className="text-text-muted shrink-0"
            />
          )}
        </div>
      </div>
    );
  }

  // ── Full seller card ───────────────────────────────────────────────────

  return (
    <div className="rounded-xl bg-surface-alt border border-border p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-cyan/10 border-2 border-cyan/25 flex items-center justify-center overflow-hidden shrink-0">
          {seller.avatar_url ? (
            <img
              src={seller.avatar_url}
              alt={seller.full_name || "Seller"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg font-bold text-cyan">
              {(seller.full_name || "CM").slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-base font-semibold text-text truncate">
              {seller.full_name || "CGE Member"}
            </p>
          </div>

          {seller.gamertag && (
            <p className="text-xs text-text-muted mb-1.5">
              @{seller.gamertag}
            </p>
          )}

          {/* Trust badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold rounded-md px-2 py-0.5 border",
              config.bg,
              config.border,
              config.color
            )}
          >
            <TrustIcon size={11} />
            {config.label}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border">
        {/* Rating */}
        <div className="text-center">
          {statsLoading ? (
            <Loader2 size={14} className="animate-spin text-text-muted mx-auto" />
          ) : stats && stats.rating_count > 0 ? (
            <>
              <div className="flex items-center justify-center gap-1">
                <Star size={14} className="fill-gold text-gold" />
                <span className="text-sm font-bold text-text">
                  {stats.avg_rating.toFixed(1)}
                </span>
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">
                {stats.rating_count}{" "}
                {stats.rating_count === 1 ? "review" : "reviews"}
              </p>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-text-muted">-</span>
              <p className="text-[10px] text-text-muted mt-0.5">No reviews</p>
            </>
          )}
        </div>

        {/* Sales */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <ShoppingBag size={14} className="text-cyan" />
            <span className="text-sm font-bold text-text">
              {stats?.total_sales ?? 0}
            </span>
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Sales</p>
        </div>

        {/* Swaps */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <ArrowLeftRight size={14} className="text-magenta" />
            <span className="text-sm font-bold text-text">
              {stats?.total_swaps ?? 0}
            </span>
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Swaps</p>
        </div>
      </div>

      {/* Cross-pillar activity */}
      {(seller.tournament_count || seller.follower_count) ? (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-text-muted/60 mb-2">
            CGE Activity
          </p>
          <div className="flex flex-wrap gap-2">
            {(seller.tournament_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-magenta bg-magenta/10 border border-magenta/20 rounded-md px-2 py-0.5">
                <Trophy size={10} />
                {seller.tournament_count} Tournament{seller.tournament_count === 1 ? "" : "s"}
              </span>
            )}
            {(seller.wins ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gold bg-gold/10 border border-gold/20 rounded-md px-2 py-0.5">
                <Flame size={10} />
                {seller.wins} Win{seller.wins === 1 ? "" : "s"}
              </span>
            )}
            {(seller.follower_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green bg-green/10 border border-green/20 rounded-md px-2 py-0.5">
                <Users size={10} />
                {seller.follower_count} Follower{seller.follower_count === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Member since */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <p className="text-[11px] text-text-muted">
          Member since {memberSince}
        </p>
        {onViewProfile && (
          <button
            type="button"
            onClick={() => onViewProfile(seller.id)}
            className="text-[11px] text-cyan font-medium hover:underline cursor-pointer"
          >
            View Profile &rarr;
          </button>
        )}
      </div>
    </div>
  );
}

// Export StarRating for reuse
export { StarRating, TRUST_CONFIG };
