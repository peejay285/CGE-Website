"use client";

import { memo } from "react";
import { Camera, ArrowLeftRight, Heart, Eye, Sparkles, MapPin, ShieldCheck, Crown, BadgeCheck, Shield, Trophy, Star } from "lucide-react";
import { cn, formatPrice, timeAgo } from "@/lib/utils";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { CategoryIcon, getCategoryConfig } from "@/components/ui/category-icon";
import type { MarketplaceListing } from "@/lib/types";

interface ListingCardProps {
  listing: MarketplaceListing;
  onClick: () => void;
  onSave?: (e: React.MouseEvent) => void;
  /** Starts the swap proposal flow directly. Falls back to onClick (open detail). */
  onSwap?: () => void;
}

function isNewListing(createdAt: string): boolean {
  const hoursSinceCreated =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return hoursSinceCreated < 24;
}

function getConditionStyle(condition: string) {
  if (condition === "New") return "bg-green/15 text-green border-green/25";
  if (condition.includes("Like New")) return "bg-cyan/15 text-cyan border-cyan/25";
  if (condition.includes("Good")) return "bg-gold/15 text-gold border-gold/25";
  return "bg-magenta/15 text-magenta border-magenta/25";
}

// Inline trust badge config for listing cards
const TRUST_BADGE: Record<string, { icon: typeof Shield; color: string; label: string }> = {
  verified: { icon: ShieldCheck, color: "text-cyan", label: "Verified" },
  trusted: { icon: BadgeCheck, color: "text-green", label: "Trusted" },
  power: { icon: Crown, color: "text-gold", label: "Power Seller" },
};

export const ListingCard = memo(function ListingCard({ listing, onClick, onSave, onSwap }: ListingCardProps) {
  const isSold = listing.status === "sold";
  const hasImage = listing.images && listing.images.length > 0;
  const imageCount = listing.images?.length || 0;
  const isSwap = listing.listing_type === "swap";
  const isSwapOrSell = listing.listing_type === "sell_or_swap";
  const acceptsSwap = isSwap || isSwapOrSell;
  const isNew = isNewListing(listing.created_at);

  const swapTags = listing.swap_for_tags || [];
  const visibleTags = swapTags.slice(0, 2);
  const extraTagCount = swapTags.length - 2;

  const catConfig = getCategoryConfig(listing.category);

  return (
    <article
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      role="button"
      aria-label={`${listing.title} — ${isSwap ? "Swap Only" : formatPrice(listing.price)}`}
      className={cn(
        "group rounded-xl border border-border bg-surface overflow-hidden cursor-pointer",
        "transition-all duration-300 hover:border-cyan/30 hover:shadow-[0_4px_24px_rgba(0,240,255,0.1)]",
        "active:scale-[0.98] active:transition-transform active:duration-100",
        "focus-visible:ring-2 focus-visible:ring-cyan/50 focus-visible:outline-none",
        isSold && "opacity-60"
      )}
    >
      {/* Image area — 4:3 aspect ratio */}
      <div className="relative aspect-[4/3] bg-surface-alt flex items-center justify-center overflow-hidden">
        {hasImage ? (
          <ImageSkeleton
            src={listing.images[0]}
            alt={listing.title}
            className="transition-transform duration-500 group-hover:scale-105"
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-surface-alt">
                <CategoryIcon category={listing.category} size={48} />
              </div>
            }
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CategoryIcon category={listing.category} size={40} />
            <span className="text-[10px] text-text-muted font-medium">
              {listing.category}
            </span>
          </div>
        )}

        {/* Top row: badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {/* Swap badge */}
            {(isSwap || isSwapOrSell) && (
              <div className="flex items-center gap-1 bg-magenta/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 w-fit">
                <ArrowLeftRight size={10} className="text-white" />
                <span className="text-[10px] font-semibold text-white">
                  Swap
                </span>
              </div>
            )}

            {/* New badge */}
            {isNew && !isSold && (
              <div className="flex items-center gap-0.5 bg-green/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 w-fit">
                <Sparkles size={9} className="text-white" />
                <span className="text-[10px] font-semibold text-white">
                  New
                </span>
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave?.(e);
            }}
            aria-label={listing.user_has_saved ? "Unsave listing" : "Save listing"}
            className={cn(
              "flex items-center gap-0.5 backdrop-blur-sm rounded-full px-2 py-1.5",
              "transition-all duration-200 cursor-pointer",
              listing.user_has_saved
                ? "bg-magenta/20 border border-magenta/30"
                : "bg-base/60 hover:bg-base/80"
            )}
          >
            <Heart
              size={14}
              className={cn(
                "transition-all duration-300",
                listing.user_has_saved
                  ? "fill-magenta text-magenta scale-110"
                  : "text-white/80 hover:text-magenta"
              )}
            />
            {listing.saves_count > 0 && (
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  listing.user_has_saved ? "text-magenta" : "text-white/80"
                )}
              >
                {listing.saves_count}
              </span>
            )}
          </button>
        </div>

        {/* Bottom row: stats */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-2 pb-2">
          {/* Views */}
          <div className="flex items-center gap-1 bg-base/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
            <Eye size={10} className="text-white/70" />
            <span className="text-[10px] font-medium text-white/70">
              {listing.views_count}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Photo count */}
            {imageCount > 1 && (
              <div className="flex items-center gap-1 bg-base/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                <Camera size={10} className="text-white/70" />
                <span className="text-[10px] font-medium text-white/70">
                  {imageCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-base/50 flex items-center justify-center">
            <span className="text-sm font-bold font-heading uppercase tracking-wider text-magenta rotate-[-12deg] border-2 border-magenta px-3 py-0.5 rounded">
              Sold
            </span>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="px-3 py-2.5 space-y-1.5">
        {/* Price / Swap info */}
        {isSwap ? (
          <div>
            <p className="text-xs font-bold text-magenta flex items-center gap-1">
              <ArrowLeftRight size={11} />
              Swap Only
            </p>
            {listing.buyout_price != null && listing.buyout_price > 0 && (
              <p className="text-[10px] text-cyan mt-0.5">
                Buyout: {formatPrice(listing.buyout_price)}
              </p>
            )}
          </div>
        ) : isSwapOrSell ? (
          // Swap-first hierarchy: swap is the headline, buying is secondary.
          <div>
            <p className="text-xs font-bold text-magenta flex items-center gap-1">
              <ArrowLeftRight size={11} />
              Open to Swap
            </p>
            <p
              className={cn(
                "text-sm font-bold font-heading tracking-tight mt-0.5",
                isSold ? "text-text-muted line-through" : "text-cyan"
              )}
            >
              {formatPrice(listing.price)}
              <span className="text-[10px] font-normal text-text-muted ml-1">
                to buy
              </span>
            </p>
          </div>
        ) : (
          <p
            className={cn(
              "text-lg font-bold font-heading tracking-tight leading-tight",
              isSold ? "text-text-muted line-through" : "text-cyan"
            )}
          >
            {formatPrice(listing.price)}
          </p>
        )}

        {/* Title */}
        <h3 className="text-xs text-text font-medium truncate leading-tight">
          {listing.title}
        </h3>

        {/* Condition + Category row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center text-[9px] font-semibold rounded-md px-1.5 py-0.5 border",
              getConditionStyle(listing.condition)
            )}
          >
            {listing.condition}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-text-muted bg-surface-alt rounded-md px-1.5 py-0.5 border border-border">
            <CategoryIcon category={listing.category} size={9} />
            {listing.category}
          </span>
        </div>

        {/* Swap wants — tag chips */}
        {visibleTags.length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden">
            <ArrowLeftRight size={8} className="shrink-0 text-magenta/80" />
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-magenta/10 text-magenta text-[9px] font-medium rounded px-1.5 py-0.5 truncate max-w-[80px]"
              >
                {tag}
              </span>
            ))}
            {extraTagCount > 0 && (
              <span className="text-[9px] text-magenta/70 font-medium shrink-0">
                +{extraTagCount}
              </span>
            )}
          </div>
        )}

        {/* Footer: seller + trust + location + time */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Mini seller avatar + trust badge */}
          {listing.seller && (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-5 h-5 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center overflow-hidden">
                  {listing.seller.avatar_url ? (
                    <img
                      src={listing.seller.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[7px] font-bold text-cyan">
                      {(listing.seller.full_name || "CM")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Trust level indicator dot */}
                {listing.seller.trust_level && listing.seller.trust_level !== "new" && (
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface flex items-center justify-center",
                    listing.seller.trust_level === "power" ? "bg-gold" :
                    listing.seller.trust_level === "trusted" ? "bg-green" :
                    "bg-cyan"
                  )}>
                    {(() => {
                      const badge = TRUST_BADGE[listing.seller.trust_level!];
                      if (!badge) return null;
                      const TIcon = badge.icon;
                      return <TIcon size={6} className="text-base" />;
                    })()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[10px] text-text-muted truncate max-w-[50px]">
                  {listing.seller.full_name?.split(" ")[0] || "Seller"}
                </span>
                {/* Inline star rating */}
                {listing.seller.avg_rating != null && listing.seller.avg_rating > 0 && (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Star size={8} className="fill-gold text-gold" />
                    <span className="text-[9px] font-medium text-gold">
                      {Number(listing.seller.avg_rating).toFixed(1)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {listing.location && (
              <span className="text-[9px] text-cyan/60 flex items-center gap-0.5">
                <MapPin size={8} />
                <span className="truncate max-w-[50px]">{listing.location}</span>
              </span>
            )}
            <p className="text-[10px] text-text-muted">
              {timeAgo(listing.created_at)}
            </p>
          </div>
        </div>

        {/* Swap-first CTA — the dominant action when a listing accepts swaps */}
        {acceptsSwap && !isSold && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              (onSwap ?? onClick)();
            }}
            aria-label={`Propose a swap for ${listing.title}`}
            className={cn(
              "w-full mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5",
              "bg-gradient-to-br from-magenta to-[#D41860] text-white text-[10px] font-semibold uppercase tracking-wider",
              "transition-all duration-300 hover:from-[#FF5A96] hover:to-magenta hover:shadow-[0_4px_20px_rgba(255,45,120,0.3)]",
              "active:scale-[0.98] cursor-pointer"
            )}
          >
            <ArrowLeftRight size={11} />
            {isSwap ? "Propose Swap" : "Swap"}
          </button>
        )}
      </div>
    </article>
  );
});
