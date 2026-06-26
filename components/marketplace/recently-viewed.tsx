"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { CategoryIcon } from "@/components/ui/category-icon";
import { formatPrice, timeAgo } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/types";

const STORAGE_KEY = "cge_recently_viewed";
const MAX_RECENT = 12;

interface RecentlyViewedProps {
  onListingClick: (listing: MarketplaceListing) => void;
  allListings: MarketplaceListing[];
}

/** Store a listing ID in recently viewed (localStorage) */
export function trackView(listingId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    // Remove if already present, add to front
    const updated = [listingId, ...ids.filter((id) => id !== listingId)].slice(
      0,
      MAX_RECENT
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silent fail
  }
}

export function RecentlyViewed({
  onListingClick,
  allListings,
}: RecentlyViewedProps) {
  const [recentListings, setRecentListings] = useState<MarketplaceListing[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const ids: string[] = JSON.parse(raw);
        // Match IDs to current listings
        const matched = ids
          .map((id) => allListings.find((l) => l.id === id))
          .filter(Boolean) as MarketplaceListing[];
        setRecentListings(matched);
      } catch {
        // Silent fail
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [allListings]);

  if (recentListings.length === 0) return null;

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
          <Clock size={14} className="text-text-muted" />
          Recently Viewed
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
        className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {recentListings.map((listing) => (
          <RecentCard
            key={listing.id}
            listing={listing}
            onClick={() => onListingClick(listing)}
          />
        ))}
      </div>
    </div>
  );
}

function RecentCard({
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
      className="snap-start shrink-0 w-[140px] sm:w-[160px] rounded-xl border border-border bg-surface overflow-hidden text-left transition-all hover:border-cyan/30 active:scale-[0.98] cursor-pointer"
    >
      <div className="relative aspect-square bg-surface-alt overflow-hidden">
        {image ? (
          <ImageSkeleton
            src={image}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon category={listing.category} size={28} />
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-medium text-text truncate">
          {listing.title}
        </p>
        <p className="text-[10px] font-semibold mt-0.5">
          {isSwap ? (
            <span className="text-magenta">Swap</span>
          ) : (
            <span className="text-cyan">{formatPrice(listing.price)}</span>
          )}
        </p>
      </div>
    </button>
  );
}
