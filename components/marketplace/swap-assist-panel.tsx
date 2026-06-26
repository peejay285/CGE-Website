"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  Check,
  Clock,
  Crown,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { ASSISTED_SWAP_SERVICE } from "@/lib/constants";
import { useMarketplace } from "@/hooks/use-marketplace";
import type { SwapAssistPayment, SwapProposal } from "@/lib/types";

interface SwapAssistPanelProps {
  proposal: SwapProposal;
  currentUserId?: string;
  /** Called after any action so the parent can refresh the proposal. */
  onChanged?: () => void;
}

const SWAP_ACTIVE_STATES = ["pending", "accepted", "in_transit"] as const;

export function SwapAssistPanel({ proposal, currentUserId, onChanged }: SwapAssistPanelProps) {
  const {
    requestSwapAssistance,
    coverSwapAssistWithPremium,
    completeSwapAssistance,
    cancelSwapAssistance,
    getMyAssistCredits,
    initializeAssistPayment,
    actionLoading,
  } = useMarketplace();

  const [payments, setPayments] = useState<SwapAssistPayment[]>(proposal.assist_payments ?? []);
  const [credits, setCredits] = useState(0);
  const [busy, setBusy] = useState(false);

  // Keep local payments in sync as the parent refreshes the proposal.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPayments(proposal.assist_payments ?? []);
    }, 0);
    return () => clearTimeout(timer);
  }, [proposal.assist_payments]);

  useEffect(() => {
    let active = true;
    getMyAssistCredits().then((c) => {
      if (active) setCredits(c);
    });
    return () => {
      active = false;
    };
  }, [getMyAssistCredits, proposal.id, proposal.assist_status]);

  const status = proposal.assist_status ?? "none";
  const swapActive = SWAP_ACTIVE_STATES.includes(
    proposal.status as (typeof SWAP_ACTIVE_STATES)[number],
  );
  const myShare = payments.find((p) => p.payer_id === currentUserId) ?? null;
  const otherShare = payments.find((p) => p.payer_id !== currentUserId) ?? null;
  const isSettled = (p: SwapAssistPayment | null) =>
    Boolean(p) && (p!.payment_status === "paid" || p!.payment_status === "free");
  const anySettled = payments.some((p) => isSettled(p));

  const runAction = useCallback(
    async (fn: () => Promise<boolean>, successMsg: string) => {
      setBusy(true);
      const ok = await fn();
      setBusy(false);
      if (ok) {
        toast.success(successMsg);
        onChanged?.();
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    },
    [onChanged],
  );

  const handlePay = useCallback(async () => {
    if (!myShare) return;
    setBusy(true);
    const url = await initializeAssistPayment(myShare.id);
    setBusy(false);
    if (url) {
      toast.success("Redirecting to Paystack...");
      window.location.assign(url);
    } else {
      toast.error("Could not start payment. Please try again.");
    }
  }, [myShare, initializeAssistPayment]);

  // Hide entirely when assistance is irrelevant (inactive swap, never requested).
  if (status === "none" && !swapActive) return null;
  if (status === "cancelled" && !swapActive) return null;

  const loading = busy || actionLoading;

  return (
    <div className="rounded-lg border border-cyan/20 bg-cyan/5 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={15} className="text-cyan" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-cyan">
          {ASSISTED_SWAP_SERVICE.title}
        </h4>
        {status === "active" && <Badge color="green" size="sm">Active</Badge>}
        {status === "awaiting_payment" && <Badge color="gold" size="sm">Awaiting payment</Badge>}
        {status === "completed" && <Badge color="green" size="sm">Completed</Badge>}
      </div>

      {/* ── Not requested yet ── */}
      {(status === "none" || status === "cancelled") && (
        <>
          <p className="text-[11px] leading-relaxed text-text-muted">{ASSISTED_SWAP_SERVICE.body}</p>
          <p className="text-[11px] leading-relaxed text-text-muted">
            Fee is <span className="text-text font-semibold">₦1,000–₦5,000</span> by item value,
            split 50/50. Premium members get free monthly credits.
          </p>
          <Button
            variant="primary"
            size="sm"
            disabled={loading}
            onClick={() => runAction(() => requestSwapAssistance(proposal.id), "Assistance requested")}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Request CGE Assistance
          </Button>
        </>
      )}

      {/* ── Awaiting payment from one or both parties ── */}
      {status === "awaiting_payment" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Facilitation fee (split 50/50)</span>
            <span className="font-semibold text-text">{formatPrice(proposal.assist_fee_total ?? 0)}</span>
          </div>

          {/* My share */}
          <div className="rounded-md border border-border bg-surface p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text">
                Your share · {formatPrice(myShare?.total ?? 0)}
              </span>
              {isSettled(myShare) ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green">
                  <Check size={12} />
                  {myShare?.method === "premium" ? "Premium credit" : "Paid"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-gold">
                  <Clock size={12} /> Due
                </span>
              )}
            </div>
            {myShare && !isSettled(myShare) && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="primary" size="sm" disabled={loading} onClick={handlePay}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Pay {formatPrice(myShare.total)}
                </Button>
                {credits > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={loading}
                    onClick={() =>
                      runAction(
                        () => coverSwapAssistWithPremium(proposal.id),
                        "Covered with a premium credit",
                      )
                    }
                  >
                    <Crown size={14} />
                    Use credit ({credits} left)
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Other party's share */}
          {otherShare && (
            <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
              <span>Other party&apos;s share · {formatPrice(otherShare.total)}</span>
              {isSettled(otherShare) ? (
                <span className="inline-flex items-center gap-1 text-green">
                  <Check size={11} /> Covered
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gold">
                  <Clock size={11} /> Waiting
                </span>
              )}
            </div>
          )}

          {!anySettled && (
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                runAction(() => cancelSwapAssistance(proposal.id), "Assistance cancelled")
              }
              className="text-[11px] text-text-muted hover:text-red underline-offset-2 hover:underline cursor-pointer disabled:opacity-50"
            >
              Cancel assistance request
            </button>
          )}
        </div>
      )}

      {/* ── Active ── */}
      {status === "active" && (
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-text-muted">
            Both shares are settled. CGE will coordinate a lounge meetup, ID check, inspection, and
            handover record. {ASSISTED_SWAP_SERVICE.note}
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() =>
              runAction(() => completeSwapAssistance(proposal.id), "Handover marked complete")
            }
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Mark handover complete
          </Button>
        </div>
      )}

      {/* ── Completed ── */}
      {status === "completed" && (
        <div className="flex items-start gap-2">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green" />
          <p className="text-[11px] leading-relaxed text-text-muted">
            CGE-assisted handover completed. Thanks for trading safely with CGE.
          </p>
        </div>
      )}
    </div>
  );
}
