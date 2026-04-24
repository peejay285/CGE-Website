"use client";

import { ArrowLeftRight, Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo, getInitials } from "@/lib/utils";
import type { SwapProposal } from "@/lib/types";

// ── Category emoji fallback map ───────────────────────────────────────
const categoryEmojis: Record<string, string> = {
  Controllers: "\uD83C\uDFAE",
  Games: "\uD83D\uDCBF",
  Accessories: "\uD83C\uDFA7",
  Furniture: "\uD83E\uDE91",
  Consoles: "\uD83D\uDDA5\uFE0F",
};

// ── Condition → badge color ───────────────────────────────────────────
const conditionColor = (condition: string) => {
  if (condition === "New") return "green" as const;
  if (condition.includes("Like New")) return "cyan" as const;
  if (condition.includes("Good")) return "gold" as const;
  return "magenta" as const;
};

// ── Status → badge color ─────────────────────────────────────────────
const statusColor = (status: SwapProposal["status"]) => {
  if (status === "accepted") return "green" as const;
  if (status === "declined") return "red" as const;
  return "gold" as const;
};

// ── Props ─────────────────────────────────────────────────────────────
interface SwapProposalsPanelProps {
  proposals: SwapProposal[];
  loading?: boolean;
  onAccept: (proposalId: string) => void;
  onDecline: (proposalId: string) => void;
  actionLoading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────
export function SwapProposalsPanel({
  proposals,
  loading,
  onAccept,
  onDecline,
  actionLoading,
}: SwapProposalsPanelProps) {
  // ── Loading state ───────────────────────────────────────────────────
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

  // ── Main render ─────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-magenta/20 bg-magenta/5 px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight size={16} className="text-magenta" />
        <h3 className="text-sm font-semibold text-text uppercase tracking-wider">
          Swap Proposals
        </h3>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-magenta/20 text-magenta text-[10px] font-bold px-1.5">
          {proposals.length}
        </span>
      </div>

      {/* Empty state */}
      {proposals.length === 0 && (
        <p className="text-sm text-text-muted text-center py-4">
          No swap proposals yet
        </p>
      )}

      {/* Proposals list */}
      {proposals.length > 0 && (
        <div className="space-y-3">
          {proposals.map((proposal) => {
            const offered = proposal.offered_listing;
            const proposer = proposal.proposer;
            const emoji = offered
              ? categoryEmojis[offered.category] || "\uD83D\uDCE6"
              : "\uD83D\uDCE6";
            const hasImage =
              offered?.images && offered.images.length > 0;
            const isPending = proposal.status === "pending";

            return (
              <div
                key={proposal.id}
                className="rounded-lg border border-border bg-surface p-3 space-y-3"
              >
                {/* Row 1: Offered listing preview */}
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
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

                  {/* Title + badges */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate leading-tight">
                      {offered?.title || "Unknown Listing"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {offered?.condition && (
                        <Badge
                          color={conditionColor(offered.condition)}
                          size="sm"
                        >
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

                {/* Row 2: Proposer info */}
                <div className="flex items-center gap-2">
                  {/* Avatar */}
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

                {/* Row 3: Message (if any) */}
                {proposal.message && (
                  <p className="text-sm italic text-text-muted leading-relaxed">
                    &ldquo;{proposal.message}&rdquo;
                  </p>
                )}

                {/* Row 4: Timestamp + status badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">
                    {timeAgo(proposal.created_at)}
                  </span>
                  <Badge color={statusColor(proposal.status)} size="sm">
                    {proposal.status}
                  </Badge>
                </div>

                {/* Row 5: Action buttons for pending proposals */}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
