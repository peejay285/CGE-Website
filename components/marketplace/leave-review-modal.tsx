"use client";

import { useState, useCallback } from "react";
import { Star, Loader2, MessageSquare, Zap, Package, ArrowLeftRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSellerProfile } from "@/hooks/use-seller-profile";
import type { MarketplaceListing } from "@/lib/types";

interface LeaveReviewModalProps {
  open: boolean;
  onClose: () => void;
  listing: MarketplaceListing;
  onReviewSubmitted?: () => void;
}

// ── Interactive star picker ─────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
  label,
  size = 24,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  size?: number;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div>
      <p className="text-xs text-text-muted mb-1.5">{label}</p>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const starVal = i + 1;
          return (
            <button
              key={starVal}
              type="button"
              onClick={() => onChange(starVal)}
              onMouseEnter={() => setHover(starVal)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5 cursor-pointer transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                size={size}
                className={cn(
                  "transition-colors",
                  (hover || value) >= starVal
                    ? "fill-gold text-gold"
                    : "text-text-muted/30"
                )}
              />
            </button>
          );
        })}
        {value > 0 && (
          <span className="text-sm font-medium text-text ml-1">
            {value}/5
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function LeaveReviewModal({
  open,
  onClose,
  listing,
  onReviewSubmitted,
}: LeaveReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [conditionRating, setConditionRating] = useState(0);
  const [speedRating, setSpeedRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { submitRating, actionLoading, error } = useSellerProfile();

  const isSwap =
    listing.listing_type === "swap" ||
    listing.listing_type === "sell_or_swap";

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;

    const result = await submitRating({
      seller_id: listing.user_id,
      listing_id: listing.id,
      rating,
      communication_rating: communicationRating || undefined,
      condition_rating: conditionRating || undefined,
      speed_rating: speedRating || undefined,
      review: review.trim() || undefined,
      is_swap: isSwap,
    });

    if (result) {
      setSubmitted(true);
      onReviewSubmitted?.();
    }
  }, [
    rating,
    communicationRating,
    conditionRating,
    speedRating,
    review,
    listing,
    isSwap,
    submitRating,
    onReviewSubmitted,
  ]);

  const handleClose = useCallback(() => {
    // Reset state
    setRating(0);
    setCommunicationRating(0);
    setConditionRating(0);
    setSpeedRating(0);
    setReview("");
    setSubmitted(false);
    onClose();
  }, [onClose]);

  const sellerName =
    listing.seller?.full_name || listing.seller?.gamertag || "Seller";

  const content = submitted ? (
    /* ── Success state ─── */
    <div className="flex flex-col items-center py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-green/10 border border-green/25 flex items-center justify-center mb-4">
        <Star size={28} className="fill-gold text-gold" />
      </div>
      <h3 className="text-lg font-semibold text-text mb-2">
        Review Submitted!
      </h3>
      <p className="text-sm text-text-muted mb-6 max-w-xs">
        Thanks for helping the CGE community. Your review helps others make
        better {isSwap ? "swap" : "buying"} decisions.
      </p>
      <Button variant="primary" onClick={handleClose}>
        Done
      </Button>
    </div>
  ) : (
    /* ── Review form ─── */
    <div className="flex flex-col gap-5 px-4 py-3 pb-6">
      {/* Listing reference */}
      <div className="flex items-center gap-3 rounded-lg bg-surface-alt border border-border p-3">
        {listing.images?.[0] ? (
          <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-md bg-surface flex items-center justify-center shrink-0">
            📦
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate">
            {listing.title}
          </p>
          <p className="text-[11px] text-text-muted">
            {isSwap ? (
              <span className="flex items-center gap-1 text-magenta">
                <ArrowLeftRight size={10} />
                Swapped with {sellerName}
              </span>
            ) : (
              <>Purchased from {sellerName}</>
            )}
          </p>
        </div>
      </div>

      {/* Overall rating (required) */}
      <StarPicker
        value={rating}
        onChange={setRating}
        label="Overall Rating *"
        size={28}
      />

      {/* Sub-ratings (optional) */}
      <div className="space-y-3 pt-1">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
          Detailed Ratings (Optional)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-surface-alt border border-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare size={12} className="text-cyan" />
              <span className="text-[11px] font-medium text-text">
                Communication
              </span>
            </div>
            <StarPicker
              value={communicationRating}
              onChange={setCommunicationRating}
              label=""
              size={18}
            />
          </div>
          <div className="rounded-lg bg-surface-alt border border-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Package size={12} className="text-green" />
              <span className="text-[11px] font-medium text-text">
                Item Condition
              </span>
            </div>
            <StarPicker
              value={conditionRating}
              onChange={setConditionRating}
              label=""
              size={18}
            />
          </div>
          <div className="rounded-lg bg-surface-alt border border-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={12} className="text-gold" />
              <span className="text-[11px] font-medium text-text">
                Speed
              </span>
            </div>
            <StarPicker
              value={speedRating}
              onChange={setSpeedRating}
              label=""
              size={18}
            />
          </div>
        </div>
      </div>

      {/* Written review */}
      <div>
        <label className="text-xs text-text-muted block mb-1.5">
          Written Review (Optional)
        </label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your experience with this seller..."
          rows={3}
          maxLength={500}
          className="w-full bg-surface-alt border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25 resize-none"
        />
        <p className="text-[10px] text-text-muted text-right mt-1">
          {review.length}/500
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button
        variant="primary"
        fullWidth
        onClick={handleSubmit}
        disabled={rating === 0 || actionLoading}
      >
        {actionLoading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Star size={14} />
            Submit Review
          </>
        )}
      </Button>
    </div>
  );

  const title = submitted ? "" : `Rate ${sellerName}`;

  return (
    <>
      {/* Desktop: Modal */}
      <div className="hidden sm:block">
        <Modal open={open} onClose={handleClose} title={title} width="md">
          {content}
        </Modal>
      </div>

      {/* Mobile: BottomSheet */}
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={handleClose} title={title}>
          {content}
        </BottomSheet>
      </div>
    </>
  );
}
