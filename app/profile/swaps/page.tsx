"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  Loader2,
  Truck,
  Package,
  AlertCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMarketplace } from "@/hooks/use-marketplace";
import { SwapStateTracker } from "@/components/marketplace/swap-state-tracker";
import { timeAgo } from "@/lib/utils";
import type { SwapProposal, SwapProposalStatus } from "@/lib/types";

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

export default function MySwapProposalsPage() {
  const { user } = useAuth();
  const {
    getMyOutgoingProposals,
    markShipped,
    markReceived,
    cancelSwap,
    disputeSwap,
    actionLoading,
  } = useMarketplace();

  const [proposals, setProposals] = useState<SwapProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getMyOutgoingProposals();
    setProposals(data);
    setLoading(false);
  }, [user, getMyOutgoingProposals]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-text mb-2">
            Sign in to view your swap proposals
          </h2>
          <Button
            variant="primary"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-auth-modal"))
            }
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft size={14} />
          Back to profile
        </Link>

        <div className="flex items-center gap-2">
          <ArrowLeftRight size={18} className="text-magenta" />
          <h1 className="text-lg font-bold font-heading text-text">
            My Swap Proposals
          </h1>
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-magenta/20 text-magenta text-[10px] font-bold px-1.5">
            {proposals.length}
          </span>
        </div>

        <p className="text-xs text-text-muted">
          Proposals you&apos;ve sent. Mark your item as shipped once it&apos;s on
          its way, and confirm receipt when the other side&apos;s item arrives.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-magenta">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-12">
            <ArrowLeftRight
              size={28}
              className="text-text-muted/40 mx-auto mb-3"
            />
            <p className="text-sm text-text-muted">
              You haven&apos;t sent any swap proposals yet.
            </p>
            <Link
              href="/marketplace"
              className="inline-block mt-3 text-sm text-cyan hover:underline"
            >
              Browse the marketplace →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <OutgoingProposalCard
                key={p.id}
                proposal={p}
                actionLoading={actionLoading}
                onMarkShipped={async (id, tracking) => {
                  const ok = await markShipped(id, "proposer", tracking);
                  if (ok) {
                    toast.success("Marked as shipped.");
                    refresh();
                  } else {
                    toast.error("Couldn't mark as shipped.");
                  }
                }}
                onMarkReceived={async (id) => {
                  const ok = await markReceived(id, "proposer");
                  if (ok) {
                    toast.success("Receipt confirmed.");
                    refresh();
                  } else {
                    toast.error("Couldn't confirm receipt.");
                  }
                }}
                onCancel={async (id, reason) => {
                  const ok = await cancelSwap(id, reason);
                  if (ok) {
                    toast.success("Swap cancelled.");
                    refresh();
                  } else {
                    toast.error("Couldn't cancel.");
                  }
                }}
                onDispute={async (id, reason) => {
                  const ok = await disputeSwap(id, reason);
                  if (ok) {
                    toast.success("Reported. Our team will follow up.");
                    refresh();
                  } else {
                    toast.error("Couldn't open the dispute.");
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OutgoingProposalCard({
  proposal,
  actionLoading,
  onMarkShipped,
  onMarkReceived,
  onCancel,
  onDispute,
}: {
  proposal: SwapProposal & {
    target_listing?: {
      id: string;
      title: string;
      images: string[];
      condition: string;
      category: string;
    };
  };
  actionLoading: boolean;
  onMarkShipped: (id: string, tracking?: string) => void;
  onMarkReceived: (id: string) => void;
  onCancel: (id: string, reason: string) => void;
  onDispute: (id: string, reason: string) => void;
}) {
  const [openTracking, setOpenTracking] = useState(false);
  const [tracking, setTracking] = useState("");
  const [openCancel, setOpenCancel] = useState(false);
  const [openDispute, setOpenDispute] = useState(false);
  const [reason, setReason] = useState("");

  const target = proposal.target_listing;
  const offered = proposal.offered_listing;
  const proposerShipped = proposal.proposer_shipped_at != null;
  const proposerReceived = proposal.proposer_received_at != null;
  const ownerShipped = proposal.owner_shipped_at != null;
  const isActive =
    proposal.status === "accepted" || proposal.status === "in_transit";

  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
      {/* Two-listing swap header */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <ListingThumb
          image={offered?.images?.[0]}
          title={offered?.title ?? "Your item"}
          label="You offered"
        />
        <ArrowLeftRight size={14} className="text-magenta" />
        <ListingThumb
          image={target?.images?.[0]}
          title={target?.title ?? "Their item"}
          label="You want"
        />
      </div>

      {proposal.message && (
        <p className="text-xs italic text-text-muted">
          Your note: &ldquo;{proposal.message}&rdquo;
        </p>
      )}

      <SwapStateTracker proposal={proposal} />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted">
          Sent {timeAgo(proposal.created_at)}
        </span>
        <Badge color={statusColor(proposal.status)} size="sm">
          {proposal.status}
        </Badge>
      </div>

      {isActive && !proposerShipped && (
        <>
          {!openTracking ? (
            <Button
              variant="primary"
              size="sm"
              disabled={actionLoading}
              onClick={() => setOpenTracking(true)}
            >
              <Truck size={12} />
              Mark my item as shipped
            </Button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Tracking number (optional)"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-cyan/40"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => {
                    onMarkShipped(proposal.id, tracking.trim() || undefined);
                    setOpenTracking(false);
                    setTracking("");
                  }}
                >
                  Confirm shipped
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenTracking(false);
                    setTracking("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {isActive && ownerShipped && !proposerReceived && (
        <Button
          variant="primary"
          size="sm"
          disabled={actionLoading}
          onClick={() => onMarkReceived(proposal.id)}
        >
          <Package size={12} />
          Mark their item as received
        </Button>
      )}

      {isActive && (
        <div className="flex flex-wrap gap-3">
          {!openCancel && !openDispute && (
            <>
              <button
                type="button"
                onClick={() => setOpenCancel(true)}
                className="text-[11px] text-text-muted hover:text-red underline-offset-2 hover:underline cursor-pointer"
              >
                Cancel swap
              </button>
              <button
                type="button"
                onClick={() => setOpenDispute(true)}
                className="text-[11px] text-text-muted hover:text-gold underline-offset-2 hover:underline cursor-pointer"
              >
                Report a problem
              </button>
            </>
          )}
          {(openCancel || openDispute) && (
            <div className="w-full space-y-2">
              <p className="text-[11px] text-text-muted">
                {openCancel ? "Why are you cancelling?" : "What's the problem?"}
              </p>
              <input
                type="text"
                placeholder="A short reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-cyan/40"
              />
              <div className="flex gap-2">
                <Button
                  variant={openDispute ? "primary" : "danger"}
                  size="sm"
                  disabled={actionLoading || !reason.trim()}
                  onClick={() => {
                    if (openCancel) {
                      onCancel(proposal.id, reason.trim());
                    } else {
                      onDispute(proposal.id, reason.trim());
                    }
                    setOpenCancel(false);
                    setOpenDispute(false);
                    setReason("");
                  }}
                >
                  {openCancel ? <X size={12} /> : <AlertCircle size={12} />}
                  {openCancel ? "Cancel swap" : "Report"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenCancel(false);
                    setOpenDispute(false);
                    setReason("");
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

function ListingThumb({
  image,
  title,
  label,
}: {
  image?: string;
  title: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-12 h-12 shrink-0 rounded-md bg-surface-alt border border-border overflow-hidden">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            📦
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-text-muted">
          {label}
        </p>
        <p className="text-xs font-semibold text-text truncate">{title}</p>
      </div>
    </div>
  );
}
