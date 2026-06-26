"use client";

import { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/types";
import { SafetyDisclaimerBanner } from "./safety-disclaimer-banner";
import { SwapValueComparison } from "./swap-value-comparison";

interface SwapProposalModalProps {
  open: boolean;
  onClose: () => void;
  targetListing: MarketplaceListing | null;
  myListings: MarketplaceListing[];
  loadingListings?: boolean;
  onSubmit: (offeredListingId: string, message?: string) => void;
  submitting?: boolean;
}

export function SwapProposalModal({
  open,
  onClose,
  targetListing,
  myListings,
  loadingListings = false,
  onSubmit,
  submitting = false,
}: SwapProposalModalProps) {
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function handleClose() {
    setSelectedListingId(null);
    setMessage("");
    onClose();
  }

  function handleSubmit() {
    if (!selectedListingId) return;
    onSubmit(selectedListingId, message.trim() || undefined);
  }

  if (!targetListing) return null;

  const selectedListing = selectedListingId
    ? myListings.find((l) => l.id === selectedListingId) ?? null
    : null;

  const hasImage = targetListing.images && targetListing.images.length > 0;

  return (
    <Modal open={open} onClose={handleClose} title="Propose a Swap" width="lg">
      {/* Target listing preview */}
      <div className="rounded-lg bg-surface-alt border border-border p-3 mb-5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted mb-2">
          You want to swap for
        </p>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-lg bg-base overflow-hidden flex items-center justify-center">
            {hasImage ? (
              <img
                src={targetListing.images[0]}
                alt={targetListing.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <ArrowLeftRight size={18} className="text-text-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-text truncate">
              {targetListing.title}
            </h4>
            <Badge color="magenta" size="sm" className="mt-0.5">
              {targetListing.condition}
            </Badge>
          </div>
        </div>
      </div>

      {/* Own listings selection */}
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
          Select an item to offer
        </p>

        {loadingListings ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-magenta" />
          </div>
        ) : myListings.length === 0 ? (
          <div className="text-center py-10 px-4">
            <ArrowLeftRight size={32} className="mx-auto text-text-muted/40 mb-3" />
            <p className="text-sm text-text-muted">
              You don&apos;t have any active listings to offer. List an item first!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
            {myListings.map((listing) => {
              const isSelected = selectedListingId === listing.id;
              const listingHasImage = listing.images && listing.images.length > 0;

              return (
                <button
                  key={listing.id}
                  type="button"
                  onClick={() => setSelectedListingId(listing.id)}
                  className={cn(
                    "flex flex-col rounded-lg border bg-surface overflow-hidden text-left transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "border-magenta ring-1 ring-magenta/40 shadow-[0_0_12px_rgba(255,45,120,0.15)]"
                      : "border-border hover:border-magenta/40"
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[4/3] bg-surface-alt flex items-center justify-center overflow-hidden">
                    {listingHasImage ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl text-text-muted/40">
                        <ArrowLeftRight size={24} />
                      </span>
                    )}

                    {/* Selected checkmark overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-magenta/10 flex items-center justify-center">
                        <div className="h-7 w-7 rounded-full bg-magenta flex items-center justify-center">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card content */}
                  <div className="px-2.5 py-2">
                    <h4 className="text-xs font-semibold text-text truncate leading-tight">
                      {listing.title}
                    </h4>
                    <Badge color="magenta" size="sm" className="mt-1">
                      {listing.condition}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Value comparison once an item is picked */}
      {selectedListing && (
        <SwapValueComparison
          yourItem={selectedListing}
          theirItem={targetListing}
          yourLabel="You give"
          theirLabel="You get"
          className="mb-5"
        />
      )}

      {/* Optional message */}
      {myListings.length > 0 && !loadingListings && (
        <div className="mb-5">
          <Textarea
            label="Add a note to the seller (optional)"
            placeholder="e.g. My controller is barely used, comes with original box..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Safety disclaimer */}
      <SafetyDisclaimerBanner className="mb-5" />

      {/* Submit button */}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" size="md" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="magenta"
          size="md"
          onClick={handleSubmit}
          disabled={!selectedListingId || submitting}
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Sending...
            </>
          ) : (
            <>

              <ArrowLeftRight size={14} />
              Send Swap Proposal
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
