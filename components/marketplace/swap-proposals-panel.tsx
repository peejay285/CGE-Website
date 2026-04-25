"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Check,
  X,
  Loader2,
  Truck,
  Package,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo, getInitials } from "@/lib/utils";
import { SwapStateTracker } from "./swap-state-tracker";
import type { SwapProposal, SwapProposalStatus } from "@/lib/types";

const categoryEmojis: Record<string, string> = {
  Controllers: "🎮",
  Games: "💿",
  Accessories: "🎧",
  Furniture: "🪑",
  Consoles: "🖥️",
};

const conditionColor = (condition: string) => {
  if (condition === "New") return "green" as const;
  if (condition.includes("Like New")) return "cyan" as const;
  if (condition.includes("Good")) return "gold" as const;
  return "magenta" as const;
};

const statusColor = (status: SwapProposalStatus) => {
  switch (status) {
    case "accepted":
    case "in_transit":
      return "cyan" as const;
    case "completed":
      return "green" as const;
    case "declined":
    case "cancelled":
    case "expired":
      return "red" as const;
    case "disputed":
      return "gold" as const;
    default:
      return "gold" as const;
  }
};

interface SwapProposalsPanelProps {
  proposals: SwapProposal[];
  loading?: boolean;
  onAccept: (proposalId: string) => void;
  onDecline: (proposalId: string) => void;
  /** Owner side. Marks the owner's outgoing shipment as sent. */
  onMarkOwnerShipped?: (proposalId: string, tracking?: string) => void;
  /** Owner side. Confirms the proposer's item arrived. */
  onMarkOwnerReceived?: (proposalId: string) => void;
  onCancel?: (proposalId: string, reason: string) => void;
  onDispute?: (proposalId: string, reason: string) => void;
  actionLoading?: boolean;
}

export function SwapProposalsPanel({
  proposals,
  loading,
  onAccept,
  onDecline,
  onMarkOwnerShipped,
  onMarkOwnerReceived,
  onCancel,
  onDispute,
  actionLoading,
}: SwapProposalsPanelProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-magenta/20 bg-magenta/5 px-4 py-6">
        <div className="flex items-center justify-center gap-2 text-magenta">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">Loading proposals...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-magenta/20 bg-magenta/5 px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight size={16} className="text-magenta" />
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
          Swap Proposals
        </h3>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-magenta/20 text-magenta text-[10px] font-bold px-1.5">
          {proposals.length}
        </span>
      </div>

      {proposals.length === 0 && (
        <p className="text-sm text-text-muted text-center py-4">
          No swap proposals yet
        </p>
      )}

      {proposals.length > 0 && (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              actionLoading={actionLoading}
              onAccept={onAccept}
              onDecline={onDecline}
              onMarkOwnerShipped={onMarkOwnerShipped}
              onMarkOwnerReceived={onMarkOwnerReceived}
              onCancel={onCancel}
              onDispute={onDispute}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  actionLoading,
  onAccept,
  onDecline,
  onMarkOwnerShipped,
  onMarkOwnerReceived,
  onCancel,
  onDispute,
}: {
  proposal: SwapProposal;
  actionLoading?: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onMarkOwnerShipped?: (id: string, tracking?: string) => void;
  onMarkOwnerReceived?: (id: string) => void;
  onCancel?: (id: string, reason: string) => void;
  onDispute?: (id: string, reason: string) => void;
}) {
  const [trackingInput, setTrackingInput] = useState("");
  const [openTrackingFor, setOpenTrackingFor] = useState(false);
  const [openCancelFor, setOpenCancelFor] = useState(false);
  const [openDisputeFor, setOpenDisputeFor] = useState(false);
  const [reasonInput, setReasonInput] = useState("");

  const offered = proposal.offered_listing;
  const proposer = proposal.proposer;
  const emoji = offered
    ? categoryEmojis[offered.category] || "📦"
    : "📦";
  const hasImage = offered?.images && offered.images.length > 0;

  const isPending = proposal.status === "pending";
  const isActive =
    proposal.status === "accepted" || proposal.status === "in_transit";
  const ownerShipped = proposal.owner_shipped_at != null;
  const ownerReceived = proposal.owner_received_at != null;
  const proposerShipped = proposal.proposer_shipped_at != null;

  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-[60px] h-[60px] shrink-0 rounded-md bg-surface-alt border border-border flex items-center justify-center overflow-hidden">
          {hasImage ? (
            <img
              src={offered!.images[0]}
              alt={offered!.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">{emoji}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate leading-tight">
            {offered?.title || "Unknown Listing"}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {offered?.condition && (
              <Badge color={conditionColor(offered.condition)} size="sm">
                {offered.condition}
              </Badge>
            )}
            {offered?.category && (
              <Badge color="magenta" size="sm">
                {offered.category}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 shrink-0 rounded-full bg-cyan/10 border border-cyan/25 flex items-center justify-center overflow-hidden">
          {proposer?.avatar_url ? (
            <img
              src={proposer.avatar_url}
              alt={proposer.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-bold text-cyan">
              {getInitials(proposer?.full_name || "CM")}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text truncate leading-tight">
            {proposer?.full_name || "CGE Member"}
          </p>
          {proposer?.gamertag && (
            <p className="text-[10px] text-text-muted truncate leading-tight">
              @{proposer.gamertag}
            </p>
          )}
        </div>
      </div>

      {proposal.message && (
        <p className="text-sm italic text-text-muted leading-relaxed">
          &ldquo;{proposal.message}&rdquo;
        </p>
      )}

      <SwapStateTracker proposal={proposal} />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted">
          {timeAgo(proposal.created_at)}
        </span>
        <Badge color={statusColor(proposal.status)} size="sm">
          {proposal.status}
        </Badge>
      </div>

      {isPending && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            className="bg-gradient-to-br from-green to-emerald-600 hover:from-emerald-400 hover:to-green hover:shadow-[0_4px_20px_rgba(34,197,94,0.3)]"
            disabled={actionLoading}
            onClick={() => onAccept(proposal.id)}
          >
            {actionLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Check size={12} />
            )}
            Accept
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={actionLoading}
            onClick={() => onDecline(proposal.id)}
          >
            {actionLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <X size={12} />
            )}
            Decline
          </Button>
        </div>
      )}

      {isActive && onMarkOwnerShipped && !ownerShipped && (
        <>
          {!openTrackingFor ? (
            <Button
              variant="primary"
              size="sm"
              disabled={actionLoading}
              onClick={() => setOpenTrackingFor(true)}
            >
              <Truck size={12} />
              Mark as shipped
            </Button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Tracking number (optional)"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-cyan/40"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => {
                    onMarkOwnerShipped(
                      proposal.id,
                      trackingInput.trim() || undefined,
                    );
                    setOpenTrackingFor(false);
                    setTrackingInput("");
                  }}
                >
                  Confirm shipped
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenTrackingFor(false);
                    setTrackingInput("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {isActive && onMarkOwnerReceived && proposerShipped && !ownerReceived && (
        <Button
          variant="primary"
          size="sm"
          disabled={actionLoading}
          onClick={() => onMarkOwnerReceived(proposal.id)}
        >
          <Package size={12} />
          Mark proposer&apos;s item as received
        </Button>
      )}

      {isActive && (onCancel || onDispute) && (
        <div className="flex flex-wrap gap-2">
          {onCancel && !openCancelFor && !openDisputeFor && (
            <button
              type="button"
              onClick={() => setOpenCancelFor(true)}
              className="text-[11px] text-text-muted hover:text-red underline-offset-2 hover:underline cursor-pointer"
            >
              Cancel swap
            </button>
          )}
          {onDispute && !openCancelFor && !openDisputeFor && (
            <button
              type="button"
              onClick={() => setOpenDisputeFor(true)}
              className="text-[11px] text-text-muted hover:text-gold underline-offset-2 hover:underline cursor-pointer"
            >
              Report a problem
            </button>
          )}
          {(openCancelFor || openDisputeFor) && (
            <div className="w-full space-y-2">
              <p className="text-[11px] text-text-muted">
                {openCancelFor
                  ? "Why are you cancelling?"
                  : "What's the problem?"}
              </p>
              <input
                type="text"
                placeholder="A short reason"
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-cyan/40"
              />
              <div className="flex gap-2">
                <Button
                  variant={openDisputeFor ? "primary" : "danger"}
                  size="sm"
                  disabled={actionLoading || !reasonInput.trim()}
                  onClick={() => {
                    if (openCancelFor && onCancel) {
                      onCancel(proposal.id, reasonInput.trim());
                    } else if (openDisputeFor && onDispute) {
                      onDispute(proposal.id, reasonInput.trim());
                    }
                    setOpenCancelFor(false);
                    setOpenDisputeFor(false);
                    setReasonInput("");
                  }}
                >
                  {openCancelFor ? (
                    <X size={12} />
                  ) : (
                    <AlertCircle size={12} />
                  )}
                  {openCancelFor ? "Cancel swap" : "Report"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenCancelFor(false);
                    setOpenDisputeFor(false);
                    setReasonInput("");
                  }}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
