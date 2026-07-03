"use client";

import { ArrowLeftRight, Target } from "lucide-react";
import { ListingCard } from "@/components/marketplace/listing-card";
import { useSwapMatches } from "@/hooks/use-swap-matches";
import type { MarketplaceListing } from "@/lib/types";

interface SwapMatchesSectionProps {
  onListingClick: (listing: MarketplaceListing) => void;
  onSwap: (listing: MarketplaceListing) => void;
  onSave?: (listingId: string) => void;
}

/**
 * "Swap Matches" — reverse browsing for signed-in users with active listings:
 * listings whose swap_for_tags ask for something the user has listed.
 * Rendered only when the user has ≥1 active listing (the hook decides).
 */
export function SwapMatchesSection({
  onListingClick,
  onSwap,
  onSave,
}: SwapMatchesSectionProps) {
  const { matches, loading, hasActiveListings } = useSwapMatches();

  // Signed-out users and users with no active listings never see the section.
  // While loading we render nothing to avoid a layout flash for that majority.
  if (loading || !hasActiveListings) return null;

  return (
    <section className="mb-5" aria-label="Swap matches">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-magenta/15 border border-magenta/25 flex items-center justify-center shrink-0">
          <Target size={14} className="text-magenta" />
        </div>
        <div>
          <h2 className="text-sm font-bold font-heading tracking-tight text-text leading-tight">
            Swap Matches
          </h2>
          <p className="text-[11px] text-text-muted leading-tight">
            People who want what you have
          </p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-magenta/20 bg-magenta/5 px-4 py-4 flex items-center gap-3">
          <ArrowLeftRight size={16} className="text-magenta/60 shrink-0" />
          <p className="text-xs text-text-muted">
            No matches yet — add swap tags to your listings to get matched.
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          {matches.map((match) => (
            <div
              key={match.listing.id}
              className="w-40 sm:w-48 shrink-0 flex flex-col gap-1.5"
            >
              {/* Which of my items this listing is asking for */}
              <span
                className="inline-flex items-center gap-1 self-start max-w-full rounded-full bg-magenta/15 border border-magenta/25 px-2 py-0.5 text-[9px] font-semibold text-magenta"
                title={`Matches your: ${match.matchedMine
                  .map((m) => m.title)
                  .join(", ")}`}
              >
                <ArrowLeftRight size={8} className="shrink-0" />
                <span className="truncate">
                  matches your: {match.matchedMine[0].title}
                </span>
                {match.matchedMine.length > 1 && (
                  <span className="shrink-0">+{match.matchedMine.length - 1}</span>
                )}
              </span>
              <ListingCard
                listing={match.listing}
                onClick={() => onListingClick(match.listing)}
                onSwap={() => onSwap(match.listing)}
                onSave={onSave ? () => onSave(match.listing.id) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
