"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Building2,
  Clock,
  Loader2,
  MapPin,
  Truck,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import { BRAND, getConditionConfig } from "@/lib/constants";
import type { MarketplaceListing, SwapMeetupMethod } from "@/lib/types";
import { SafetyDisclaimerBanner } from "./safety-disclaimer-banner";
import { SwapValueComparison, itemValue } from "./swap-value-comparison";

// Keep in sync with the swap_proposals_cash_adjustment_bounds constraint.
const MAX_CASH_ADJUSTMENT = 5_000_000;

const MEETUP_OPTIONS: {
  value: Exclude<SwapMeetupMethod, "unset">;
  title: string;
  subtitle: string;
  Icon: typeof Building2;
  recommended?: boolean;
}[] = [
  {
    value: "cge_lounge",
    title: "Meet at CGE Lounge",
    subtitle: `Free, staff present — ${BRAND.address}`,
    Icon: Building2,
    recommended: true,
  },
  {
    value: "in_person",
    title: "Meet in person elsewhere",
    subtitle: "Agree on a safe, public spot together",
    Icon: MapPin,
  },
  {
    value: "shipping",
    title: "Ship with tracking",
    subtitle: "Both sides post tracking numbers",
    Icon: Truck,
  },
];

interface SwapProposalModalProps {
  open: boolean;
  onClose: () => void;
  targetListing: MarketplaceListing | null;
  myListings: MarketplaceListing[];
  loadingListings?: boolean;
  onSubmit: (
    offeredListingId: string,
    message?: string,
    cashAdjustment?: number,
    meetupMethod?: SwapMeetupMethod,
  ) => void;
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
  const [cashDirection, setCashDirection] = useState<"add" | "request">("add");
  const [cashAmount, setCashAmount] = useState("");
  const [meetupMethod, setMeetupMethod] = useState<SwapMeetupMethod>("cge_lounge");

  function handleClose() {
    setSelectedListingId(null);
    setMessage("");
    setCashDirection("add");
    setCashAmount("");
    setMeetupMethod("cge_lounge");
    onClose();
  }

  const parsedCash = Math.min(
    MAX_CASH_ADJUSTMENT,
    Math.max(0, Math.floor(Number(cashAmount) || 0)),
  );
  const signedCash = cashDirection === "add" ? parsedCash : -parsedCash;

  function handleSubmit() {
    if (!selectedListingId) return;
    onSubmit(
      selectedListingId,
      message.trim() || undefined,
      signedCash,
      meetupMethod,
    );
  }

  if (!targetListing) return null;

  const selectedListing = selectedListingId
    ? myListings.find((l) => l.id === selectedListingId) ?? null
    : null;

  // Fair-difference suggestion when both items carry a price. Positive =
  // their item is worth more, so the proposer should add cash.
  const yourVal = selectedListing ? itemValue(selectedListing) : null;
  const theirVal = itemValue(targetListing);
  const rawDiff = yourVal !== null && theirVal !== null ? theirVal - yourVal : null;
  const suggestion =
    rawDiff !== null && rawDiff !== 0 && Math.abs(rawDiff) <= MAX_CASH_ADJUSTMENT
      ? rawDiff
      : null;

  function applySuggestion() {
    if (suggestion === null) return;
    setCashDirection(suggestion > 0 ? "add" : "request");
    setCashAmount(String(Math.abs(suggestion)));
  }

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
              {getConditionConfig(targetListing.condition).label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Value comparison — shown as soon as an item is picked, before submit */}
      {selectedListing && (
        <SwapValueComparison
          yourItem={selectedListing}
          theirItem={targetListing}
          yourLabel="You give"
          theirLabel="You get"
          cashAdjustment={signedCash}
          className="mb-4"
        />
      )}

      {/* Cash top-up — balance an uneven swap with naira */}
      {selectedListing && (
        <div className="rounded-lg border border-border bg-surface-alt p-3 mb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Banknote size={13} className="text-green" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Balance the swap with cash (optional)
            </p>
          </div>
          <div className="flex gap-2 mb-2.5">
            {(
              [
                { key: "add", label: "I'll add cash" },
                { key: "request", label: "I want cash on top" },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setCashDirection(option.key)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer",
                  cashDirection === option.key
                    ? "border-magenta/50 bg-magenta/10 text-magenta"
                    : "border-border bg-surface text-text-muted hover:border-magenta/25",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
              ₦
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              aria-label="Cash amount in naira"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value.replace(/[^\d]/g, ""))}
              className="w-full rounded-lg border border-border bg-surface pl-7 pr-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25 transition-colors"
            />
          </div>
          {suggestion !== null && signedCash !== suggestion && (
            <button
              type="button"
              onClick={applySuggestion}
              className="mt-2 text-[11px] font-medium text-cyan hover:underline underline-offset-2 cursor-pointer"
            >
              Suggested: {formatPrice(Math.abs(suggestion))}{" "}
              {suggestion > 0 ? "from you" : "from them"} to balance values — tap
              to apply
            </button>
          )}
          {parsedCash === MAX_CASH_ADJUSTMENT && (
            <p className="mt-2 text-[10px] text-text-muted">
              Cash top-ups are capped at {formatPrice(MAX_CASH_ADJUSTMENT)}.
            </p>
          )}
        </div>
      )}

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
                      {getConditionConfig(listing.condition).label}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Meetup method */}
      {myListings.length > 0 && !loadingListings && (
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">
            How will you swap?
          </p>
          <div className="space-y-2">
            {MEETUP_OPTIONS.map((option) => {
              const isSelected = meetupMethod === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMeetupMethod(option.value)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer",
                    isSelected
                      ? "border-magenta ring-1 ring-magenta/40 bg-magenta/5"
                      : "border-border bg-surface hover:border-magenta/40",
                  )}
                >
                  <option.Icon
                    size={16}
                    className={cn(
                      "shrink-0 mt-0.5",
                      isSelected ? "text-magenta" : "text-text-muted",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-semibold text-text">
                        {option.title}
                      </p>
                      {option.recommended && (
                        <Badge color="green" size="sm">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                      {option.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
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
      <SafetyDisclaimerBanner className="mb-4" />

      {/* Offer expiry note */}
      <p className="flex items-center gap-1.5 text-[11px] text-text-muted mb-5">
        <Clock size={12} className="shrink-0" />
        Offers expire after 48 hours if the owner doesn&apos;t respond.
      </p>

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
