"use client";

import { Sparkles } from "lucide-react";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { CategoryIcon } from "@/components/ui/category-icon";
import { formatPrice } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/types";

interface RelatedListingsProps {
  currentListing: MarketplaceListing;
  allListings: MarketplaceListing[];
  onListingClick: (listing: MarketplaceListing) => void;
  limit?: number;
}

export function RelatedListings({
  currentListing,
  allListings,
  onListingClick,
  limit = 4,
}: RelatedListingsProps) {
  // Find related: same category first, then same listing type, exclude current
  const related = allListings
    .filter((l) => l.id !== currentListing.id && l.status === "active")
    .sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      // Same category = +3
      if (a.category === currentListing.category) scoreA += 3;
      if (b.category === currentListing.category) scoreB += 3;
      // Same listing type = +2
      if (a.listing_type === currentListing.listing_type) scoreA += 2;
      if (b.listing_type === currentListing.listing_type) scoreB += 2;
      // Similar price range (within 30%) = +1
      const priceA = a.listing_type === "swap" ? 0 : a.price;
      const priceB = b.listing_type === "swap" ? 0 : b.price;
      const currentPrice =
        currentListing.listing_type === "swap" ? 0 : currentListing.price;
      if (
        currentPrice > 0 &&
        priceA > 0 &&
        Math.abs(priceA - currentPrice) / currentPrice < 0.3
      )
        scoreA += 1;
      if (
        currentPrice > 0 &&
        priceB > 0 &&
        Math.abs(priceB - currentPrice) / currentPrice < 0.3
      )
        scoreB += 1;

      return scoreB - scoreA;
    })
    .slice(0, limit);

  if (related.length === 0) return null;

  return (
    <div className="mt-1">
      <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
        <Sparkles size={12} className="text-cyan" />
        You might also like
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {related.map((listing) => {
          const image = listing.images?.[0];
          const isSwap = listing.listing_type === "swap";

          return (
            <button
              key={listing.id}
              type="button"
              onClick={() => onListingClick(listing)}
              className="rounded-lg border border-border bg-surface overflow-hidden text-left transition-all hover:border-cyan/30 active:scale-[0.98] cursor-pointer"
            >
              <div className="relative h-20 bg-surface-alt overflow-hidden">
                {image ? (
                  <ImageSkeleton
                    src={image}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <CategoryIcon category={listing.category} size={24} />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-[10px] font-medium text-text truncate">
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
        })}
      </div>
    </div>
  );
}
