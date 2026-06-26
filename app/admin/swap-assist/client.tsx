"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn, formatPrice } from "@/lib/utils";
import type { SwapAssistPayment, SwapAssistStatus } from "@/lib/types";

export interface AssistRow {
  id: string;
  swap_status: string;
  assist_status: SwapAssistStatus;
  assist_fee_total: number | null;
  assist_requested_at: string | null;
  assist_activated_at: string | null;
  assist_completed_at: string | null;
  proposer_name: string | null;
  owner_name: string | null;
  offered_title: string | null;
  target_title: string | null;
  payments: SwapAssistPayment[];
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "awaiting_payment", label: "Awaiting payment" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function statusColor(s: SwapAssistStatus) {
  if (s === "active") return "cyan" as const;
  if (s === "completed") return "green" as const;
  if (s === "cancelled") return "red" as const;
  return "gold" as const;
}

function shareLabel(p: SwapAssistPayment) {
  if (p.payment_status === "paid") return "paid";
  if (p.payment_status === "free") return "credit";
  return "due";
}

function whenLabel(r: AssistRow) {
  if (r.assist_completed_at)
    return `Completed ${new Date(r.assist_completed_at).toLocaleString("en-GB")}`;
  if (r.assist_activated_at)
    return `Active since ${new Date(r.assist_activated_at).toLocaleString("en-GB")}`;
  if (r.assist_requested_at)
    return `Requested ${new Date(r.assist_requested_at).toLocaleString("en-GB")}`;
  return "";
}

export function SwapAssistAdminClient({ rows }: { rows: AssistRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.assist_status === filter);

  async function markComplete(id: string) {
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("complete_swap_assistance", { p_proposal_id: id });
    setBusyId(null);
    if (error) {
      toast.error(error.message || "Could not mark complete");
      return;
    }
    toast.success("Marked complete");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-cyan" />
          <h1 className="text-lg font-bold font-heading text-text">CGE Assisted Swaps</h1>
        </div>
        <p className="text-xs text-text-muted">
          Coordinate paid facilitation — lounge meetup, ID check, inspection, and handover record.
          Mark a swap complete once the handover is done.
        </p>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count =
              f.key === "all" ? rows.length : rows.filter((r) => r.assist_status === f.key).length;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                  filter === f.key
                    ? "bg-cyan/10 text-cyan border-cyan/25"
                    : "bg-surface-alt text-text-muted border-border hover:border-cyan/20",
                )}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-text-muted">
            No assisted swaps in this view.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-surface p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">
                      {r.proposer_name || "Proposer"} ↔ {r.owner_name || "Owner"}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {r.offered_title || "Item"} ↔ {r.target_title || "Item"}
                    </p>
                  </div>
                  <Badge color={statusColor(r.assist_status)} size="sm">
                    {r.assist_status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md bg-surface-alt border border-border p-2">
                    <span className="text-text-muted">Fee (split 50/50)</span>
                    <p className="text-text font-semibold">{formatPrice(r.assist_fee_total ?? 0)}</p>
                  </div>
                  <div className="rounded-md bg-surface-alt border border-border p-2">
                    <span className="text-text-muted">Shares</span>
                    <p className="text-text font-semibold">
                      {r.payments.length > 0
                        ? r.payments.map((p) => `${p.role} ${shareLabel(p)}`).join(" · ")
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-text-muted">{whenLabel(r)}</span>
                  {r.assist_status === "active" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => markComplete(r.id)}
                    >
                      {busyId === r.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      Mark complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
