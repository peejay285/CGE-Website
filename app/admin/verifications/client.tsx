"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Loader2,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { IdVerificationSubmission } from "@/lib/types";

interface AdminRow extends IdVerificationSubmission {
  user_full_name: string | null;
  user_email: string | null;
}

export function VerificationsAdminClient({ rows: initialRows }: { rows: AdminRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const visible = filter === "pending"
    ? rows.filter((r) => r.status === "pending")
    : rows;

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-cyan" />
          <h1 className="text-lg font-bold font-heading text-text">
            ID Verification Queue
          </h1>
        </div>

        <div className="flex gap-2">
          <FilterChip
            label={`Pending (${rows.filter((r) => r.status === "pending").length})`}
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
          />
          <FilterChip
            label={`All (${rows.length})`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-12">
            No submissions to review.
          </p>
        ) : (
          <div className="space-y-3">
            {visible.map((row) => (
              <SubmissionRow
                key={row.id}
                row={row}
                supabase={supabase}
                onUpdate={(updated) =>
                  setRows((prev) =>
                    prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all",
        active
          ? "bg-cyan/15 text-cyan border-cyan/30"
          : "bg-surface-alt text-text-muted border-border hover:text-text",
      )}
    >
      {label}
    </button>
  );
}

function SubmissionRow({
  row,
  supabase,
  onUpdate,
}: {
  row: AdminRow;
  supabase: ReturnType<typeof createClient>;
  onUpdate: (patch: Partial<AdminRow> & { id: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [openReject, setOpenReject] = useState(false);
  const [signedUrls, setSignedUrls] = useState<{
    id?: string;
    supporting: string[];
  }>({ supporting: [] });

  async function loadSignedUrls() {
    if (signedUrls.id || row.status !== "pending") {
      // Lazy: only resolve when expanding & still pending
    }
    const { data: idSigned } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(row.id_document_url, 60 * 5);
    const supporting: string[] = [];
    for (const path of row.supporting_doc_urls ?? []) {
      const { data } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(path, 60 * 5);
      if (data?.signedUrl) supporting.push(data.signedUrl);
    }
    setSignedUrls({ id: idSigned?.signedUrl, supporting });
  }

  async function handleApprove() {
    setBusy(true);
    const { error } = await supabase
      .from("id_verification_submissions")
      .update({ status: "approved" })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Approved. Profile is now verified.");
    onUpdate({ id: row.id, status: "approved" });
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("id_verification_submissions")
      .update({
        status: "rejected",
        rejection_reason: rejectReason.trim(),
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rejected with reason.");
    setOpenReject(false);
    setRejectReason("");
    onUpdate({
      id: row.id,
      status: "rejected",
      rejection_reason: rejectReason.trim(),
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface-alt overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) loadSignedUrls();
        }}
        className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            {row.user_full_name ?? "Unknown user"}
          </p>
          <p className="text-[11px] text-text-muted">
            {new Date(row.submitted_at).toLocaleString()}
          </p>
        </div>
        <Badge color={statusColor(row.status)} size="sm">
          {row.status}
        </Badge>
        <ChevronDown
          size={16}
          className={cn(
            "text-text-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              ID document
            </p>
            {signedUrls.id ? (
              <a
                href={signedUrls.id}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-cyan hover:underline"
              >
                Open in new tab
                <ExternalLink size={12} />
              </a>
            ) : (
              <Loader2 size={14} className="animate-spin text-cyan" />
            )}
          </div>

          {row.supporting_doc_urls?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Supporting documents
              </p>
              <ul className="space-y-1">
                {signedUrls.supporting.map((url, i) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-cyan hover:underline"
                    >
                      Document {i + 1}
                      <ExternalLink size={12} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {row.status === "rejected" && row.rejection_reason && (
            <div className="rounded-lg bg-red/10 border border-red/30 p-3">
              <p className="text-xs font-semibold text-red mb-1">
                Rejected
              </p>
              <p className="text-xs text-text-muted">
                {row.rejection_reason}
              </p>
            </div>
          )}

          {row.status === "pending" && !openReject && (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={handleApprove}
                className="bg-gradient-to-br from-green to-emerald-600"
              >
                {busy ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => setOpenReject(true)}
              >
                <X size={12} />
                Reject
              </Button>
            </div>
          )}

          {openReject && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Reason (visible to the user)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-cyan/40"
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy || !rejectReason.trim()}
                  onClick={handleReject}
                >
                  Confirm reject
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpenReject(false);
                    setRejectReason("");
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

function statusColor(s: string) {
  if (s === "approved") return "green" as const;
  if (s === "rejected") return "red" as const;
  return "gold" as const;
}
