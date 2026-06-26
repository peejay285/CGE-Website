"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, MessageSquarePlus, ChevronRight, Loader2 } from "lucide-react";
import { StarRating } from "./seller-profile-card";
import { Button } from "@/components/ui/button";
import { cn, timeAgo } from "@/lib/utils";
import { useSellerProfile } from "@/hooks/use-seller-profile";
import type { SellerRating } from "@/lib/types";

interface SellerReviewsSectionProps {
  sellerId: string;
  /** Show the "Leave a Review" button */
  onLeaveReview?: () => void;
  /** Navigate to full seller profile */
  onViewAllReviews?: () => void;
  /** Max reviews to show inline */
  limit?: number;
}

export function SellerReviewsSection({
  sellerId,
  onLeaveReview,
  onViewAllReviews,
  limit = 3,
}: SellerReviewsSectionProps) {
  const [reviews, setReviews] = useState<SellerRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const { getSellerRatings, getSellerQuickStats } = useSellerProfile();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const [ratings, stats] = await Promise.all([
      getSellerRatings(sellerId, limit),
      getSellerQuickStats(sellerId),
    ]);
    setReviews(ratings);
    setTotalCount(stats?.rating_count ?? 0);
    setLoading(false);
  }, [sellerId, limit, getSellerRatings, getSellerQuickStats]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchReviews();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchReviews]);

  if (loading) {
    return (
      <div className="rounded-xl bg-surface-alt border border-border p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-alt border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <Star size={12} className="text-gold" />
          Reviews ({totalCount})
        </h4>
        {onLeaveReview && (
          <button
            type="button"
            onClick={onLeaveReview}
            className="text-[11px] text-cyan font-medium hover:underline cursor-pointer flex items-center gap-1"
          >
            <MessageSquarePlus size={12} />
            Leave a Review
          </button>
        )}
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-text-muted mb-1">No reviews yet</p>
          <p className="text-[11px] text-text-muted/60">
            Be the first to leave a review
          </p>
          {onLeaveReview && (
            <Button
              variant="ghost"
              className="mt-3"
              onClick={onLeaveReview}
            >
              <MessageSquarePlus size={14} />
              Write a Review
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* View all link */}
      {totalCount > limit && onViewAllReviews && (
        <button
          type="button"
          onClick={onViewAllReviews}
          className="w-full mt-3 pt-3 border-t border-border flex items-center justify-center gap-1 text-[11px] text-cyan font-medium hover:underline cursor-pointer"
        >
          View all {totalCount} reviews
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

// ── Individual review card ──────────────────────────────────────────────────

function ReviewCard({ review }: { review: SellerRating }) {
  const reviewerName =
    review.reviewer?.full_name || review.reviewer?.gamertag || "CGE Member";

  return (
    <div className="border-b border-border last:border-0 pb-3 last:pb-0">
      <div className="flex items-start gap-2.5">
        {/* Reviewer avatar */}
        <div className="w-8 h-8 rounded-full bg-cyan/10 border border-cyan/25 flex items-center justify-center overflow-hidden shrink-0">
          {review.reviewer?.avatar_url ? (
            <img
              src={review.reviewer.avatar_url}
              alt={reviewerName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-bold text-cyan">
              {reviewerName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + date */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-text truncate">
              {reviewerName}
            </p>
            <span className="text-[10px] text-text-muted shrink-0">
              {timeAgo(review.created_at)}
            </span>
          </div>

          {/* Stars */}
          <div className="mt-0.5">
            <StarRating rating={review.rating} size={11} showValue={false} />
          </div>

          {/* Review text */}
          {review.review && (
            <p className="text-[12px] text-text leading-relaxed mt-1.5">
              {review.review}
            </p>
          )}

          {/* Sub-ratings (if any) */}
          {(review.communication_rating ||
            review.condition_rating ||
            review.speed_rating) && (
            <div className="flex items-center gap-3 mt-1.5">
              {review.communication_rating && (
                <span className="text-[10px] text-text-muted">
                  Comms: {review.communication_rating}/5
                </span>
              )}
              {review.condition_rating && (
                <span className="text-[10px] text-text-muted">
                  Condition: {review.condition_rating}/5
                </span>
              )}
              {review.speed_rating && (
                <span className="text-[10px] text-text-muted">
                  Speed: {review.speed_rating}/5
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
