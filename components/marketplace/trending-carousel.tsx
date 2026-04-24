"use client";

import { useRef } from "react";
import { Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn, formatPrice } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/types";

interface TrendingCarouselProps {
  listings: MarketplaceListing[];
  onListingClick: (listing: MarketplaceListing) => void;
  loading?: boolean;
}

export function TrendingCarousel({
  listings,
  onListingClick,
  loading = false,
}: TrendingCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort by views + saves to get trending
  const trending = [...listings]
    .sort((a, b) => b.views_count + b.saves_count - (a.views_count + a.saves_count))
    .slice(0, 10);

  if (!loading && trending.length === 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-1.5 mb-3">
          <Flame size={16} className="text-magenta/40" />
          <h2 className="text-sm font-semibold text-text-muted/60">Trending Now</h2>
        </div>
        <div className="rounded-xl border border-dashed border-border/50 bg-surface-alt/30 py-8 flex flex-col items-center gap-2">
          <Flame size={24} className="text-magenta/20" />
          <p className="text-xs text-text-muted/50">Trending items will appear here as people start listing</p>
        </div>
      </div>
    );
  }

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text flex items-center gap-1.5">
          <Flame size={16} className="text-magenta" />
          Trending Now
        </h2>
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="w-7 h-7 rounded-full bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-cyan/30 transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-7 h-7 rounded-full bg-surface-alt border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-cyan/30 transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[260px] sm:w-[280px] rounded-xl border border-border bg-surface overflow-hidden"
              >
                <div className="h-36 bg-surface-alt animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-surface-alt rounded" />
                  <div className="h-3 w-1/2 bg-surface-alt rounded" />
                </div>
              </div>
            ))
          : trending.map((listing) => (
              <TrendingCard
                key={listing.id}
                listing={listing}
                onClick={() => onListingClick(listing)}
              />
            ))}
      </div>
    </div>
  );
}

function TrendingCard({
  listing,
  onClick,
}: {
  listing: MarketplaceListing;
  onClick: () => void;
}) {
  const image = listing.images?.[0];
  const isSwap = listing.listing_type === "swap";

  return (
    <button
      type="button"
      onClick={onClick}
      className="snap-start shrink-0 w-[260px] sm:w-[280px] rounded-xl border border-border bg-surface overflow-hidden text-left transition-all hover:border-cyan/30 active:scale-[0.98] cursor-pointer group"
    >
      {/* Image */}
      <div className="relative h-36 bg-surface-alt overflow-hidden">
        {image ? (
          <ImageSkeleton
            src={image}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon category={listing.category} size={40} />
          </div>
        )}

        {/* Trending badge */}
        <div className="absolute top-2 left-2 bg-magenta/90 backdrop-blur-sm rounded-md px-2 py-0.5 flex items-center gap-1">
          <Flame size={10} className="text-white" />
          <span className="text-[10px] font-semibold text-white">Hot</span>
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-2 right-2 bg-base/80 backdrop-blur-sm rounded-md px-2 py-0.5">
          {isSwap ? (
            <span className="text-[11px] font-bold text-magenta">Swap</span>
          ) : (
            <span className="text-[11px] font-bold text-cyan">
              {formatPrice(listing.price)}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-medium text-text truncate mb-1">
          {listing.title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">
            {listing.views_count} views &middot; {listing.saves_count} saves
          </span>
          <span className="text-[10px] text-text-muted">{listing.condition}</span>
        </div>
      </div>
    </button>
  );
}
