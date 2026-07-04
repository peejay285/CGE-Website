"use client";

import { Banknote, Building2, Clock, MapPin, Truck } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { BRAND } from "@/lib/constants";
import type { SwapMeetupMethod, SwapProposal } from "@/lib/types";

export const MEETUP_METHOD_CONFIG: Record<
  Exclude<SwapMeetupMethod, "unset">,
  { label: string; Icon: typeof Building2; reassurance: string | null }
> = {
  cge_lounge: {
    label: "Swap at the CGE Lounge",
    Icon: Building2,
    reassurance: `Exchange happens at the CGE lounge with staff present — ${BRAND.address}.`,
  },
  in_person: {
    label: "Meet in person",
    Icon: MapPin,
    reassurance: null,
  },
  shipping: {
    label: "Ship with tracking",
    Icon: Truck,
    reassurance: null,
  },
};

/** Time left on a pending offer: "Expires in 36h", urgent when under 6h. */
export function pendingExpiryCountdown(
  expiresAt: string,
): { label: string; urgent: boolean } | null {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return { label: "Offer expiring", urgent: true };
  const hours = ms / 3_600_000;
  if (hours < 1) {
    return {
      label: `Expires in ${Math.max(1, Math.round(ms / 60_000))}m`,
      urgent: true,
    };
  }
  return { label: `Expires in ${Math.round(hours)}h`, urgent: hours < 6 };
}

interface SwapTermsSummaryProps {
  proposal: SwapProposal;
  /** Which side of the swap the viewer is on. */
  viewerRole: "owner" | "proposer";
  className?: string;
}

/**
 * Compact summary of the proposal's agreed terms: cash top-up, meetup
 * method (with a reassurance line for the CGE lounge), and — while the
 * offer is still pending — the 48h expiry countdown.
 */
export function SwapTermsSummary({
  proposal,
  viewerRole,
  className,
}: SwapTermsSummaryProps) {
  const cash = proposal.cash_adjustment ?? 0;
  const method =
    proposal.meetup_method && proposal.meetup_method !== "unset"
      ? MEETUP_METHOD_CONFIG[proposal.meetup_method]
      : null;
  const countdown =
    proposal.status === "pending" && proposal.expires_at
      ? pendingExpiryCountdown(proposal.expires_at)
      : null;

  if (cash === 0 && !method && !countdown) return null;

  let cashLine: string | null = null;
  if (cash > 0) {
    cashLine =
      viewerRole === "owner"
        ? `+ ${formatPrice(cash)} cash from the proposer`
        : `+ ${formatPrice(cash)} cash from you`;
  } else if (cash < 0) {
    cashLine =
      viewerRole === "owner"
        ? `Proposer requests ${formatPrice(-cash)} cash from you on top`
        : `You requested ${formatPrice(-cash)} cash on top`;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-alt px-3 py-2.5 space-y-1.5",
        className,
      )}
    >
      {cashLine && (
        <div className="flex items-start gap-2">
          <Banknote size={13} className="text-green shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-text leading-relaxed">
            {cashLine}
          </p>
        </div>
      )}
      {method && (
        <div className="flex items-start gap-2">
          <method.Icon size={13} className="text-cyan shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-text leading-relaxed">
              {method.label}
            </p>
            {method.reassurance && (
              <p className="text-[10px] text-text-muted leading-relaxed">
                {method.reassurance}
              </p>
            )}
          </div>
        </div>
      )}
      {countdown && (
        <div className="flex items-start gap-2">
          <Clock
            size={13}
            className={cn(
              "shrink-0 mt-0.5",
              countdown.urgent ? "text-red" : "text-text-muted",
            )}
          />
          <p
            className={cn(
              "text-[11px] font-semibold leading-relaxed",
              countdown.urgent ? "text-red" : "text-text-muted",
            )}
          >
            {countdown.label}
          </p>
        </div>
      )}
    </div>
  );
}
