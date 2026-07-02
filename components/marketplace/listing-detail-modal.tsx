"use client";

import {
  Flag,
  Trash2,
  Loader2,
  MessageCircle,
  CheckCircle,
  ArrowLeftRight,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  ListingDetailContent,
  getWhatsAppUrl,
} from "./listing-detail-content";
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
  if (!listing) return null;

  const isOwner = currentUserId && listing.user_id === currentUserId;
  const isSold = listing.status === "sold";
  const isSwap = listing.listing_type === "swap";
  const isSwapOrSell = listing.listing_type === "sell_or_swap";
  const acceptsSwap = isSwap || isSwapOrSell;
  const sellerHasPhone = !!listing.seller?.phone;

  const content = (
    <ListingDetailContent
      listing={listing}
      currentUserId={currentUserId}
      onSave={onSave}
      onDelete={onDelete}
      onMarkAsSold={onMarkAsSold}
      onMessage={onMessage}
      deleteLoading={deleteLoading}
      proposals={proposals}
      proposalsLoading={proposalsLoading}
      onAcceptProposal={onAcceptProposal}
      onDeclineProposal={onDeclineProposal}
      onMarkOwnerShipped={onMarkOwnerShipped}
      onMarkOwnerReceived={onMarkOwnerReceived}
      onCancelSwap={onCancelSwap}
      onDisputeSwap={onDisputeSwap}
      onAssistChanged={onAssistChanged}
      onViewSellerProfile={onViewSellerProfile}
      onLeaveReview={onLeaveReview}
      allListings={allListings}
      onRelatedClick={onRelatedClick}
      className="pb-24 sm:pb-4"
    />
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
                  variant={acceptsSwap ? "secondary" : "primary"}
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
                  fullWidth
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
            variant={acceptsSwap ? "secondary" : "primary"}
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
            fullWidth
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
