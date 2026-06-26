"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Clock,
  Flag,
  Trash2,
  Loader2,
  MessageCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  Heart,
  Eye,
  Sparkles,
  MapPin,
  X as XIcon,
  Share2,
  Trophy,
  Users,
  Flame,
  Shield,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageSkeleton } from "@/components/ui/image-skeleton";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn, formatPrice, timeAgo } from "@/lib/utils";
import { SwapProposalsPanel } from "./swap-proposals-panel";
import { SellerProfileCard } from "./seller-profile-card";
import { SellerReviewsSection } from "./seller-reviews-section";
import { RelatedListings } from "./related-listings";
import { SafetyDisclaimerBanner } from "./safety-disclaimer-banner";
import { ASSISTED_SWAP_SERVICE } from "@/lib/constants";
import type { MarketplaceListing, SwapProposal } from "@/lib/types";

// ── Props ────────────────────────────────────────────────────────────────────
interface ListingDetailModalProps {
  listing: MarketplaceListing | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onMarkAsSold?: (id: string) => void;
  onMessage?: (listing: MarketplaceListing) => void;
  onProposeSwap?: (listing: MarketplaceListing) => void;
  onSave?: (listing: MarketplaceListing) => void;
  currentUserId?: string | null;
  deleteLoading?: boolean;
  // Proposals (seller view)
  proposals?: SwapProposal[];
  proposalsLoading?: boolean;
  onAcceptProposal?: (proposalId: string) => void;
  onDeclineProposal?: (proposalId: string) => void;
  onMarkOwnerShipped?: (proposalId: string, tracking?: string) => void;
  onMarkOwnerReceived?: (proposalId: string) => void;
  onCancelSwap?: (proposalId: string, reason: string) => void;
  onDisputeSwap?: (proposalId: string, reason: string) => void;
  onAssistChanged?: () => void;
  // Trust system
  onViewSellerProfile?: (sellerId: string) => void;
  onLeaveReview?: (listing: MarketplaceListing) => void;
  // Discovery
  allListings?: MarketplaceListing[];
  onRelatedClick?: (listing: MarketplaceListing) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const conditionColor = (condition: string) => {
  if (condition === "New") return "green" as const;
  if (condition.includes("Like New")) return "cyan" as const;
  if (condition.includes("Good")) return "gold" as const;
  return "magenta" as const;
};

function getWhatsAppUrl(
  listing: MarketplaceListing,
  intent: "buy" | "swap" = "buy"
): string | null {
  const isSwapIntent = intent === "swap";
  const text = encodeURIComponent(
    isSwapIntent
      ? `Hi! I'd like to swap for your item on CGE Marketplace:\n\n` +
          `${listing.title}\n` +
          `Condition: ${listing.condition}\n` +
          (listing.swap_for
            ? `You're looking for: ${listing.swap_for}\n`
            : "") +
          `\nI have something to offer. Can we discuss?`
      : `Hi! I'm interested in your listing on CGE Marketplace:\n\n` +
          `${listing.title}\n` +
          `${formatPrice(listing.price)}\n` +
          `Condition: ${listing.condition}\n\n` +
          `Is this still available?`
  );
  const phone = listing.seller?.phone;
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("234")
    ? cleanPhone
    : `234${cleanPhone.replace(/^0/, "")}`;
  return `https://wa.me/${fullPhone}?text=${text}`;
}

function isNewListing(createdAt: string): boolean {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60) < 24;
}

// ── Lightbox overlay with keyboard navigation ───────────────────────────────

function LightboxOverlay({
  onClose,
  onPrev,
  onNext,
  children,
}: {
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {children}
    </div>
  );
}

// ── Image Gallery with Touch Swipe ──────────────────────────────────────────

function ImageGallery({
  images,
  title,
  isSold,
  category,
}: {
  images: string[];
  title: string;
  isSold: boolean;
  category: string;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const imageCount = images.length;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold && imageCount > 1) {
      setImageIndex((prev) => (prev + 1) % imageCount);
    } else if (diff < -threshold && imageCount > 1) {
      setImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
    }
  }, [imageCount]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  if (images.length === 0) {
    return (
      <div className="relative h-56 sm:h-72 rounded-xl bg-surface-alt border border-border flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-3">
          <CategoryIcon category={category} size={64} />
          <span className="text-sm text-text-muted">{category}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="relative h-56 sm:h-72 rounded-xl bg-surface-alt border border-border overflow-hidden cursor-pointer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setLightbox(true)}
      >
        <ImageSkeleton
          src={images[imageIndex]}
          alt={`${title} - Photo ${imageIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {/* Image counter */}
        {imageCount > 1 && (
          <div className="absolute top-3 right-3 bg-base/70 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-medium text-white">
            {imageIndex + 1} / {imageCount}
          </div>
        )}

        {/* Nav arrows (desktop) */}
        {imageCount > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex(
                  (prev) => (prev - 1 + imageCount) % imageCount
                );
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-base/60 backdrop-blur-sm border border-white/10 hidden sm:flex items-center justify-center text-white hover:bg-base/80 transition-colors cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageIndex((prev) => (prev + 1) % imageCount);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-base/60 backdrop-blur-sm border border-white/10 hidden sm:flex items-center justify-center text-white hover:bg-base/80 transition-colors cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {imageCount > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex(i);
                }}
                aria-label={`View photo ${i + 1}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
                  i === imageIndex
                    ? "bg-cyan w-5"
                    : "bg-white/40 hover:bg-white/60"
                )}
              />
            ))}
          </div>
        )}

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-base/60 flex items-center justify-center">
            <span className="text-xl font-bold font-heading uppercase tracking-wider text-magenta rotate-[-12deg] border-2 border-magenta px-5 py-1.5 rounded-lg">
              Sold
            </span>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <LightboxOverlay
          onClose={() => setLightbox(false)}
          onPrev={imageCount > 1 ? () => setImageIndex((prev) => (prev - 1 + imageCount) % imageCount) : undefined}
          onNext={imageCount > 1 ? () => setImageIndex((prev) => (prev + 1) % imageCount) : undefined}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-10 cursor-pointer"
          >
            <XIcon size={20} />
          </button>
          <img
            src={images[imageIndex]}
            alt={title}
            loading="lazy"
            decoding="async"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {imageCount > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex(
                    (prev) => (prev - 1 + imageCount) % imageCount
                  );
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((prev) => (prev + 1) % imageCount);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {imageIndex + 1} / {imageCount}
          </div>
        </LightboxOverlay>
      )}
    </>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ListingDetailModal({
  listing,
  open,
  onClose,
  onDelete,
  onMarkAsSold,
  onMessage,
  onProposeSwap,
  onSave,
  currentUserId,
  deleteLoading,
  proposals,
  proposalsLoading,
  onAcceptProposal,
  onDeclineProposal,
  onMarkOwnerShipped,
  onMarkOwnerReceived,
  onCancelSwap,
  onDisputeSwap,
  onAssistChanged,
  onViewSellerProfile,
  onLeaveReview,
  allListings,
  onRelatedClick,
}: ListingDetailModalProps) {
  const handleShare = useCallback(async () => {
    if (!listing) return;
    const shareUrl = `${window.location.origin}/marketplace?listing=${listing.id}`;
    const shareText =
      listing.listing_type === "swap"
        ? `Check out this swap on CGE Marketplace: ${listing.title}`
        : `${listing.title} — ${formatPrice(listing.price)} on CGE Marketplace`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled — do nothing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        // We can't import toast here directly without adding it to imports,
        // so we dispatch a custom event the page can handle
        window.dispatchEvent(
          new CustomEvent("listing-shared", { detail: { copied: true } })
        );
      } catch {
        // Ignore
      }
    }
  }, [listing]);

  if (!listing) return null;

  const isOwner = currentUserId && listing.user_id === currentUserId;
  const isSold = listing.status === "sold";
  const isSwap = listing.listing_type === "swap";
  const isSwapOrSell = listing.listing_type === "sell_or_swap";
  const acceptsSwap = isSwap || isSwapOrSell;
  const sellerHasPhone = !!listing.seller?.phone;
  const hasSaved = listing.user_has_saved;
  const hasSwapForTags =
    listing.swap_for_tags && listing.swap_for_tags.length > 0;
  const hasBuyoutPrice =
    isSwap &&
    listing.buyout_price !== null &&
    listing.buyout_price !== undefined &&
    listing.buyout_price > 0;

  const content = (
    <div className="flex flex-col gap-5 pb-24 sm:pb-4">
      {/* Image gallery with swipe */}
      <ImageGallery
        images={listing.images || []}
        title={listing.title}
        isSold={isSold}
        category={listing.category}
      />

      {/* ── Price / swap info + save ────────────────────────── */}
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {isSwap ? (
              <span className="text-lg font-bold text-magenta flex items-center gap-1.5">
                <ArrowLeftRight size={18} />
                Swap Only
              </span>
            ) : (
              <span
                className={cn(
                  "text-2xl font-bold font-heading tracking-tight",
                  isSold ? "text-text-muted line-through" : "text-cyan"
                )}
              >
                {formatPrice(listing.price)}
              </span>
            )}
            {isNewListing(listing.created_at) && !isSold && (
              <span className="inline-flex items-center gap-0.5 bg-green/15 text-green text-[10px] font-semibold rounded-md px-1.5 py-0.5 border border-green/25">
                <Sparkles size={9} />
                New
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-base font-semibold text-text leading-snug mb-2">
            {listing.title}
          </h2>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={conditionColor(listing.condition)} size="md">
              {listing.condition}
            </Badge>
            <Badge color="magenta" size="md">
              <CategoryIcon category={listing.category} size={10} className="mr-1" />
              {listing.category}
            </Badge>
            {acceptsSwap && !isSwap && (
              <Badge color="magenta" size="md">
                <ArrowLeftRight size={10} className="mr-1" />
                Open to Swap
              </Badge>
            )}
            {isSold && (
              <Badge color="magenta" size="md">
                Sold
              </Badge>
            )}
          </div>
        </div>

        {/* Save + Share */}
        <div className="flex flex-col gap-2 shrink-0">
          {!isOwner && (
            <button
              type="button"
              onClick={() => onSave?.(listing)}
              className={cn(
                "p-2.5 rounded-xl transition-all duration-200 cursor-pointer",
                hasSaved
                  ? "bg-magenta/10 border border-magenta/25"
                  : "bg-surface-alt border border-border hover:border-magenta/30"
              )}
              aria-label={hasSaved ? "Unsave listing" : "Save listing"}
            >
              <Heart
                size={20}
                className={cn(
                  "transition-all duration-300",
                  hasSaved
                    ? "fill-magenta text-magenta"
                    : "text-text-muted hover:text-magenta"
                )}
              />
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-surface-alt border border-border hover:border-cyan/30 transition-all duration-200 cursor-pointer"
            aria-label="Share listing"
          >
            <Share2 size={20} className="text-text-muted hover:text-cyan transition-colors" />
          </button>
        </div>
      </div>

      {/* ── Engagement stats ──────────────────────────────── */}
      <div className="flex items-center gap-4 px-1 -mt-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Eye size={12} />
          {listing.views_count} {listing.views_count === 1 ? "view" : "views"}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Heart size={12} />
          {listing.saves_count} {listing.saves_count === 1 ? "save" : "saves"}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Clock size={12} />
          {timeAgo(listing.created_at)}
        </span>
        {listing.location && (
          <span className="flex items-center gap-1.5 text-[11px] text-cyan/70">
            <MapPin size={12} />
            {listing.location}
          </span>
        )}
      </div>

      {/* ── Swap wants ─────────────────────────────────────── */}
      {acceptsSwap && (hasSwapForTags || listing.swap_for) && (
        <div className="rounded-xl border border-magenta/20 bg-magenta/5 px-4 py-3">
          <p className="text-xs font-semibold text-magenta uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ArrowLeftRight size={12} />
            Looking to swap for
          </p>
          {hasSwapForTags ? (
            <div className="flex flex-wrap gap-1.5">
              {listing.swap_for_tags.map((tag) => (
                <Badge key={tag} color="magenta" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text">{listing.swap_for}</p>
          )}
        </div>
      )}

      {acceptsSwap && !isSold && (
        <div className="rounded-xl border border-cyan/20 bg-cyan/5 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-cyan uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={12} />
              {ASSISTED_SWAP_SERVICE.title}
            </p>
            <Badge color="cyan" size="sm">{ASSISTED_SWAP_SERVICE.label}</Badge>
          </div>
          <p className="text-xs leading-relaxed text-text-muted">
            {ASSISTED_SWAP_SERVICE.body}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-text-muted/80">
            {ASSISTED_SWAP_SERVICE.note}
          </p>
        </div>
      )}

      {/* ── Cash buyout ─────────────────────────────────────── */}
      {hasBuyoutPrice && !isOwner && !isSold && (
        <div className="rounded-xl border border-cyan/20 bg-cyan/5 px-4 py-3">
          <p className="text-xs font-semibold text-cyan uppercase tracking-wider mb-1">
            Cash Buyout
          </p>
          <p className="text-sm text-text mb-3">
            Don&apos;t have what they want? Buy it for{" "}
            <span className="font-bold text-cyan">
              {formatPrice(listing.buyout_price!)}
            </span>
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onMessage?.(listing)}
          >
            <MessageCircle size={14} />
            Buy for {formatPrice(listing.buyout_price!)}
          </Button>
        </div>
      )}

      {/* ── Description ─────────────────────────────────────── */}
      {listing.description && (
        <div className="px-1">
          <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
            Description
          </h4>
          <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {listing.description}
          </p>
        </div>
      )}

      {/* ── Seller info card (with trust + cross-pillar) ───── */}
      {listing.seller && (
        <SellerProfileCard
          seller={{
            id: listing.user_id,
            full_name: listing.seller.full_name,
            avatar_url: listing.seller.avatar_url ?? null,
            gamertag: listing.seller.gamertag ?? null,
            created_at: listing.seller.created_at ?? listing.created_at,
            trust_level: listing.seller.trust_level,
            avg_rating: listing.seller.avg_rating,
            rating_count: listing.seller.rating_count,
            total_sales: listing.seller.total_sales,
            total_swaps: listing.seller.total_swaps,
            wins: listing.seller.wins ?? 0,
            tournament_count: listing.seller.tournament_count,
            follower_count: listing.seller.follower_count,
          }}
          onViewProfile={onViewSellerProfile}
          compact
        />
      )}

      {/* ── Seller reviews ──────────────────────────────── */}
      <SellerReviewsSection
        sellerId={listing.user_id}
        onLeaveReview={
          !isOwner && !isSold && onLeaveReview
            ? () => onLeaveReview(listing)
            : undefined
        }
        onViewAllReviews={
          onViewSellerProfile
            ? () => onViewSellerProfile(listing.user_id)
            : undefined
        }
      />

      {/* ── Seller CGE Activity (cross-pillar) ──────────── */}
      {listing.seller && (
        (listing.seller.tournament_count ?? 0) > 0 ||
        (listing.seller.wins ?? 0) > 0 ||
        (listing.seller.follower_count ?? 0) > 0
      ) && (
        <div className="rounded-xl border border-border bg-surface-alt px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted/60 mb-2.5">
            Seller&apos;s CGE Activity
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(listing.seller?.tournament_count ?? 0) > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Trophy size={13} className="text-magenta" />
                  <span className="text-sm font-bold text-text">
                    {listing.seller!.tournament_count}
                  </span>
                </div>
                <p className="text-[9px] text-text-muted">Tournaments</p>
              </div>
            )}
            {(listing.seller?.wins ?? 0) > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Flame size={13} className="text-gold" />
                  <span className="text-sm font-bold text-text">
                    {listing.seller!.wins}
                  </span>
                </div>
                <p className="text-[9px] text-text-muted">Wins</p>
              </div>
            )}
            {(listing.seller?.follower_count ?? 0) > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Users size={13} className="text-green" />
                  <span className="text-sm font-bold text-text">
                    {listing.seller!.follower_count}
                  </span>
                </div>
                <p className="text-[9px] text-text-muted">Followers</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Safety tip ────────────────────────────────────── */}
      <SafetyDisclaimerBanner variant="compact" />


      {/* ── Related listings ──────────────────────────────── */}
      {allListings && onRelatedClick && (
        <RelatedListings
          currentListing={listing}
          allListings={allListings}
          onListingClick={(related) => {
            onRelatedClick(related);
          }}
        />
      )}

      {/* ── Owner actions (desktop) ──────────────────────── */}
      {isOwner && (
        <div className="hidden sm:flex flex-col gap-3 pt-1">
          <div className="flex gap-3 w-full">
            {listing.status === "active" && (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => onMarkAsSold?.(listing.id)}
                disabled={deleteLoading}
              >
                <CheckCircle size={14} />
                Mark as Sold
              </Button>
            )}
            <Button
              variant="ghost"
              fullWidth={listing.status !== "active"}
              className="text-red hover:text-red hover:bg-red/10"
              onClick={() => onDelete?.(listing.id)}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>

          {acceptsSwap &&
            proposals &&
            (onAcceptProposal || onDeclineProposal) && (
              <SwapProposalsPanel
                proposals={proposals}
                loading={proposalsLoading}
                targetListing={listing}
                currentUserId={currentUserId ?? undefined}
                onAssistChanged={onAssistChanged}
                onAccept={(id) => onAcceptProposal?.(id)}
                onDecline={(id) => onDeclineProposal?.(id)}
                onMarkOwnerShipped={onMarkOwnerShipped}
                onMarkOwnerReceived={onMarkOwnerReceived}
                onCancel={onCancelSwap}
                onDispute={onDisputeSwap}
              />
            )}
        </div>
      )}
    </div>
  );

  /* ── Sticky bottom actions bar (mobile) ────────────── */
  const stickyActions = (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-surface border-t border-border px-4 py-3 safe-area-pb">
      {isOwner ? (
        <div className="flex gap-3">
          {listing.status === "active" && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => onMarkAsSold?.(listing.id)}
              disabled={deleteLoading}
            >
              <CheckCircle size={14} />
              Sold
            </Button>
          )}
          <Button
            variant="ghost"
            fullWidth={listing.status !== "active"}
            className="text-red hover:text-red hover:bg-red/10"
            onClick={() => onDelete?.(listing.id)}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Delete
          </Button>
        </div>
      ) : (
        !isSold && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              {!isSwap && (
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => onMessage?.(listing)}
                >
                  <MessageCircle size={14} />
                  {isSwapOrSell ? "Buy" : "Message"}
                </Button>
              )}
              {acceptsSwap && (
                <Button
                  variant="magenta"
                  fullWidth={isSwap}
                  onClick={() => onProposeSwap?.(listing)}
                >
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
        )
      )}
    </div>
  );

  /* ── Desktop-only action buttons (inline, non-sticky) ── */
  const desktopActions = !isOwner && !isSold && (
    <div className="hidden sm:flex flex-col gap-3 pt-1 px-1">
      <div className="flex gap-3 w-full">
        {!isSwap && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => onMessage?.(listing)}
          >
            <MessageCircle size={14} />
            {isSwapOrSell ? "Buy" : "Message Seller"}
          </Button>
        )}
        {acceptsSwap && (
          <Button
            variant="magenta"
            fullWidth={isSwap}
            onClick={() => onProposeSwap?.(listing)}
          >
            <ArrowLeftRight size={14} />
            {isSwap ? "Propose Swap" : "Swap"}
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between">
        {sellerHasPhone && (
          <button
            type="button"
            className="text-[11px] text-text-muted hover:text-green transition-colors cursor-pointer"
            onClick={() => {
              const url = getWhatsAppUrl(
                listing,
                acceptsSwap ? "swap" : "buy"
              );
              if (url) window.open(url, "_blank", "noopener");
            }}
          >
            or message on WhatsApp &rarr;
          </button>
        )}
        <Button variant="ghost" className="shrink-0 ml-auto">
          <Flag size={14} />
          Report
        </Button>
      </div>
    </div>
  );

  // Use BottomSheet on mobile, Modal on desktop
  return (
    <>
      {/* Desktop: Modal */}
      <div className="hidden sm:block">
        <Modal open={open} onClose={onClose} title={listing.title} width="lg">
          {content}
          {desktopActions}
        </Modal>
      </div>

      {/* Mobile: BottomSheet */}
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title={listing.title}>
          <div className="px-4 py-3">
            {content}
          </div>

          {stickyActions}
        </BottomSheet>
      </div>
    </>
  );
}
