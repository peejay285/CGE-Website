"use client";

import { Check, Truck, Package, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwapProposal } from "@/lib/types";

interface SwapStateTrackerProps {
  proposal: SwapProposal;
  className?: string;
}

const STEPS = [
  { key: "proposer_shipped_at", label: "Proposer shipped", icon: Truck },
  { key: "owner_shipped_at", label: "Owner shipped", icon: Truck },
  { key: "proposer_received_at", label: "Proposer received", icon: Package },
  { key: "owner_received_at", label: "Owner received", icon: Package },
] as const;

export function SwapStateTracker({ proposal, className }: SwapStateTrackerProps) {
  const isTerminalCancel =
    proposal.status === "cancelled" || proposal.status === "expired";
  const isDisputed = proposal.status === "disputed";

  if (isTerminalCancel) {
    return (
      <div
        className={cn(
          "rounded-lg border border-red/30 bg-red/5 px-3 py-2.5 flex items-start gap-2",
          className,
        )}
      >
        <X size={14} className="text-red shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold text-red">
            {proposal.status === "expired" ? "Expired" : "Cancelled"}
          </p>
          {proposal.cancellation_reason && (
            <p className="text-text-muted mt-0.5">
              {proposal.cancellation_reason}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isDisputed) {
    return (
      <div
        className={cn(
          "rounded-lg border border-gold/40 bg-gold/5 px-3 py-2.5 flex items-start gap-2",
          className,
        )}
      >
        <AlertCircle size={14} className="text-gold shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold text-gold">Disputed</p>
          {proposal.dispute_reason && (
            <p className="text-text-muted mt-0.5">{proposal.dispute_reason}</p>
          )}
        </div>
      </div>
    );
  }

  if (proposal.status === "completed") {
    return (
      <div
        className={cn(
          "rounded-lg border border-green/30 bg-green/5 px-3 py-2.5 flex items-center gap-2",
          className,
        )}
      >
        <Check size={14} className="text-green shrink-0" />
        <p className="text-xs font-semibold text-green">
          Swap completed — both parties confirmed receipt
        </p>
      </div>
    );
  }

  // Active or accepted state — render the 4-step tracker.
  if (
    proposal.status !== "accepted" &&
    proposal.status !== "in_transit"
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-alt px-3 py-2.5",
        className,
      )}
    >
      <div className="grid grid-cols-4 gap-1.5">
        {STEPS.map((step) => {
          const done = proposal[step.key] != null;
          const Icon = done ? Check : step.icon;
          return (
            <div
              key={step.key}
              className={cn(
                "flex flex-col items-center gap-1 text-center",
                done ? "text-cyan" : "text-text-muted",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center border",
                  done
                    ? "bg-cyan/15 border-cyan/40"
                    : "bg-surface border-border",
                )}
              >
                <Icon size={12} />
              </div>
              <p className="text-[9px] leading-tight font-medium">
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
      {proposal.expires_at && (
        <p className="text-[10px] text-text-muted text-center mt-2">
          Expires {new Date(proposal.expires_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
