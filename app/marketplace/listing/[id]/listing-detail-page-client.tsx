"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ListingDetailContent,
  getWhatsAppUrl,
} from "@/components/marketplace/listing-detail-content";
import type { MarketplaceListing } from "@/lib/types";

interface ListingDetailPageClientProps {
  listing: MarketplaceListing | null;
}

/**
 * Full-page shareable view of a listing — renders the same detail content
 * as the marketplace modal. Buy / swap actions deep-link back into the
 * marketplace grid (`/marketplace?listing=<id>`) where the full interactive
 * flow (auth, chat, swap proposals) lives.
 */
export default function ListingDetailPageClient({
  listing,
}: ListingDetailPageClientProps) {
  const router = useRouter();

  if (!listing) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-cyan" />
          <p className="text-sm text-text-muted">Loading listing...</p>
        </div>
      </div>
    );
  }

  const isSold = listing.status === "sold";
  const isSwap = listing.listing_type === "swap";
  const isSwapOrSell = listing.listing_type === "sell_or_swap";
  const acceptsSwap = isSwap || isSwapOrSell;
  const sellerHasPhone = !!listing.seller?.phone;

  const openInMarketplace = () =>
    router.push(`/marketplace?listing=${listing.id}`);

  const actions = !isSold && (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        {!isSwap && (
          <Button
            variant={acceptsSwap ? "secondary" : "primary"}
            fullWidth
            onClick={openInMarketplace}
          >
            <MessageCircle size={14} />
            {isSwapOrSell ? "Buy" : "Message Seller"}
          </Button>
        )}
        {acceptsSwap && (
          <Button variant="magenta" fullWidth onClick={openInMarketplace}>
            <ArrowLeftRight size={14} />
            {isSwap ? "Propose Swap" : "Swap"}
          </Button>
        )}
      </div>
      {sellerHasPhone && (
        <button
          type="button"
          className="text-[11px] text-text-muted hover:text-green transition-colors cursor-pointer text-center py-0.5"
          onClick={() => {
            const url = getWhatsAppUrl(listing, acceptsSwap ? "swap" : "buy");
            if (url) window.open(url, "_blank", "noopener");
          }}
        >
          or contact on WhatsApp &rarr;
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/marketplace")}
            className="p-2 rounded-lg hover:bg-surface-alt transition-colors cursor-pointer"
            aria-label="Back to marketplace"
          >
            <ArrowLeft size={18} className="text-text" />
          </button>
          <h1 className="text-sm font-semibold text-text truncate">
            {listing.title}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <ListingDetailContent
          listing={listing}
          onViewSellerProfile={(sellerId) =>
            router.push(`/marketplace/seller/${sellerId}`)
          }
          className="pb-28 sm:pb-4"
        />

        {/* Desktop inline actions */}
        <div className="hidden sm:block pt-5">{actions}</div>
      </div>

      {/* Mobile sticky action bar */}
      {actions && (
        <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-surface border-t border-border px-4 py-3 safe-area-pb">
          {actions}
        </div>
      )}
    </div>
  );
}
