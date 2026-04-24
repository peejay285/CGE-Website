"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  ShoppingBag,
  ArrowLeftRight,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  BadgeCheck,
  Crown,
  Calendar,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  StarRating,
  TRUST_CONFIG,
} from "@/components/marketplace/seller-profile-card";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn, formatPrice, timeAgo } from "@/lib/utils";
import { useSellerProfile } from "@/hooks/use-seller-profile";
import type { SellerProfile, SellerRating, MarketplaceListing } from "@/lib/types";

export default function SellerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params.id as string;

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [allReviews, setAllReviews] = useState<SellerRating[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const { getSellerProfile, getSellerRatings, loading } = useSellerProfile();

  useEffect(() => {
    if (!sellerId) return;
    (async () => {
      const data = await getSellerProfile(sellerId);
      setProfile(data);
    })();
  }, [sellerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMoreReviews = useCallback(async () => {
    const ratings = await getSellerRatings(sellerId, 50);
    setAllReviews(ratings);
    setShowAllReviews(true);
  }, [sellerId, getSellerRatings]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-cyan" />
          <p className="text-sm text-text-muted">Loading seller profile...</p>
        </div>
      </div>
    );
  }

  const trustLevel =
    (profile.stats?.trust_level as keyof typeof TRUST_CONFIG) ?? "new";
  const config = TRUST_CONFIG[trustLevel];
  const TrustIcon = config.icon;
  const stats = profile.stats;
  const reviews = showAllReviews
    ? allReviews
    : profile.ratings ?? [];

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    "en-NG",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} className="text-text" />
          </button>
          <h1 className="text-sm font-semibold text-text truncate">
            Seller Profile
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ── Profile hero ────────────────────────────────── */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-cyan/10 border-2 border-cyan/25 flex items-center justify-center overflow-hidden mb-3">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-cyan">
                {(profile.full_name || "CM").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name */}
          <h2 className="text-xl font-bold font-heading text-text mb-1">
            {profile.full_name || "CGE Member"}
          </h2>

          {profile.gamertag && (
            <p className="text-sm text-text-muted mb-2">
              @{profile.gamertag}
            </p>
          )}

          {/* Trust badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1 border",
              config.bg,
              config.border,
              config.color
            )}
          >
            <TrustIcon size={14} />
            {config.label}
          </span>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-text-muted mt-3 max-w-md leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Member since */}
          <p className="text-[11px] text-text-muted mt-2 flex items-center gap-1">
            <Calendar size={11} />
            Member since {memberSince}
          </p>
        </div>

        {/* ── Stats grid ──────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard
            icon={<Star size={16} className="text-gold" />}
            value={
              stats && stats.rating_count > 0
                ? stats.avg_rating.toFixed(1)
                : "-"
            }
            label="Rating"
          />
          <StatCard
            icon={<Star size={16} className="text-text-muted" />}
            value={String(stats?.rating_count ?? 0)}
            label="Reviews"
          />
          <StatCard
            icon={<ShoppingBag size={16} className="text-cyan" />}
            value={String(stats?.total_sales ?? 0)}
            label="Sales"
          />
          <StatCard
            icon={<ArrowLeftRight size={16} className="text-magenta" />}
            value={String(stats?.total_swaps ?? 0)}
            label="Swaps"
          />
        </div>

        {/* ── Verification badges ─────────────────────────── */}
        {profile.verification && (
          <div className="rounded-xl bg-surface-alt border border-border p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
              <Shield size={12} />
              Verifications
            </h3>
            <div className="flex flex-wrap gap-2">
              <VerificationBadge
                label="Email"
                verified={profile.verification.email_verified}
                icon={<Mail size={12} />}
              />
              <VerificationBadge
                label="Phone"
                verified={profile.verification.phone_verified}
                icon={<Phone size={12} />}
              />
              <VerificationBadge
                label="ID"
                verified={profile.verification.id_verified}
                icon={<ShieldCheck size={12} />}
              />
            </div>
          </div>
        )}

        {/* ── Active listings ─────────────────────────────── */}
        {profile.active_listings && profile.active_listings.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
              <Package size={12} />
              Active Listings ({profile.active_listings.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.active_listings.slice(0, 6).map((listing) => (
                <MiniListingCard
                  key={listing.id}
                  listing={listing}
                  onClick={() =>
                    router.push(`/marketplace?listing=${listing.id}`)
                  }
                />
              ))}
            </div>
            {profile.active_listings.length > 6 && (
              <button
                type="button"
                onClick={() => router.push(`/marketplace?seller=${sellerId}`)}
                className="w-full mt-3 text-[11px] text-cyan font-medium hover:underline cursor-pointer text-center"
              >
                View all {profile.active_listings.length} listings &rarr;
              </button>
            )}
          </div>
        )}

        {/* ── Reviews ─────────────────────────────────────── */}
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
            <Star size={12} className="text-gold" />
            Reviews ({stats?.rating_count ?? 0})
          </h3>

          {reviews.length === 0 ? (
            <div className="rounded-xl bg-surface-alt border border-border p-6 text-center">
              <Star size={24} className="text-text-muted/30 mx-auto mb-2" />
              <p className="text-sm text-text-muted">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <ReviewDetailCard key={review.id} review={review} />
              ))}
            </div>
          )}

          {!showAllReviews &&
            stats &&
            stats.rating_count > (profile.ratings?.length ?? 0) && (
              <Button
                variant="ghost"
                fullWidth
                className="mt-3"
                onClick={loadMoreReviews}
              >
                Load all reviews
              </Button>
            )}
        </div>
      </div>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-surface-alt border border-border p-3 text-center">
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-text">{value}</p>
      <p className="text-[10px] text-text-muted">{label}</p>
    </div>
  );
}

// ── Verification badge ──────────────────────────────────────────────────────

function VerificationBadge({
  label,
  verified,
  icon,
}: {
  label: string;
  verified: boolean;
  icon: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium rounded-lg px-2.5 py-1 border",
        verified
          ? "bg-green/10 border-green/25 text-green"
          : "bg-surface border-border text-text-muted"
      )}
    >
      {icon}
      {label}
      {verified ? " Verified" : " Unverified"}
    </span>
  );
}

// ── Mini listing card ───────────────────────────────────────────────────────

function MiniListingCard({
  listing,
  onClick,
}: {
  listing: MarketplaceListing;
  onClick: () => void;
}) {
  const image = listing.images?.[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-surface-alt border border-border overflow-hidden text-left transition-all hover:border-cyan/30 cursor-pointer"
    >
      <div className="aspect-square bg-surface flex items-center justify-center overflow-hidden">
        {image ? (
          <ImageSkeleton
            src={image}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <CategoryIcon category={listing.category} size={32} />
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-medium text-text truncate">
          {listing.title}
        </p>
        <p className="text-[10px] text-cyan font-semibold">
          {listing.listing_type === "swap" ? (
            <span className="text-magenta">Swap</span>
          ) : (
            formatPrice(listing.price)
          )}
        </p>
      </div>
    </button>
  );
}

// ── Review detail card ──────────────────────────────────────────────────────

function ReviewDetailCard({ review }: { review: SellerRating }) {
  const reviewerName =
    review.reviewer?.full_name || review.reviewer?.gamertag || "CGE Member";

  return (
    <div className="rounded-xl bg-surface-alt border border-border p-4">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-cyan/10 border border-cyan/25 flex items-center justify-center overflow-hidden shrink-0">
          {review.reviewer?.avatar_url ? (
            <img
              src={review.reviewer.avatar_url}
              alt={reviewerName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-cyan">
              {reviewerName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-text truncate">
              {reviewerName}
            </p>
            <span className="text-[10px] text-text-muted shrink-0">
              {timeAgo(review.created_at)}
            </span>
          </div>

          <div className="mt-1">
            <StarRating rating={review.rating} size={13} showValue={true} />
          </div>

          {review.review && (
            <p className="text-sm text-text leading-relaxed mt-2">
              {review.review}
            </p>
          )}

          {/* Sub-ratings */}
          {(review.communication_rating ||
            review.condition_rating ||
            review.speed_rating) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {review.communication_rating && (
                <span className="text-[10px] text-text-muted bg-surface rounded px-2 py-0.5">
                  Communication: {review.communication_rating}/5
                </span>
              )}
              {review.condition_rating && (
                <span className="text-[10px] text-text-muted bg-surface rounded px-2 py-0.5">
                  Condition: {review.condition_rating}/5
                </span>
              )}
              {review.speed_rating && (
                <span className="text-[10px] text-text-muted bg-surface rounded px-2 py-0.5">
                  Speed: {review.speed_rating}/5
                </span>
              )}
            </div>
          )}

          {/* Listing reference */}
          {review.listing && (
            <div className="mt-2 flex items-center gap-2 text-[10px] text-text-muted">
              <span>For:</span>
              <span className="text-text font-medium truncate">
                {review.listing.title}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
