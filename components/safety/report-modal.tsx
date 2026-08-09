"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";

export type ReportContextType = "message" | "conversation" | "listing" | "profile";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  contextType: ReportContextType;
  /** Id of the thing being reported (conversation id, listing id, ...). */
  contextId?: string;
  /** Profile id of the user being reported, when known. */
  reportedUserId?: string;
  /** Display name used in the heading ("Report {name}"). */
  reportedName?: string;
}

const REPORT_REASONS = [
  "Scam or fraud",
  "Harassment or abuse",
  "Inappropriate content",
  "Fake listing",
  "Impersonation",
  "Something else",
] as const;

/**
 * Generic report dialog for conversations, listings, messages and profiles.
 * Inserts into `user_reports` (safety-controls-migration.sql) as the
 * signed-in user — never submits without a reason.
 */
export function ReportModal({
  open,
  onClose,
  contextType,
  contextId,
  reportedUserId,
  reportedName,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const supabase = createClient();

  const handleClose = () => {
    if (pending) return;
    setReason("");
    setDetails("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || pending) return;

    setPending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sign in to send a report");
        return;
      }

      const { error } = await supabase.from("user_reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId ?? null,
        context_type: contextType,
        context_id: contextId ?? null,
        reason,
        details: details.trim() ? details.trim() : null,
      });

      if (error) throw error;

      toast.success("Report sent — our team will review it");
      setReason("");
      setDetails("");
      onClose();
    } catch {
      toast.error("Couldn't send report — please try again");
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Report ${reportedName || "this"}`}
      width="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-text-muted">
          Tell us what&apos;s wrong — reports are private and reviewed by the
          CGE team.
        </p>

        <div>
          <label
            htmlFor="report-reason"
            className="block text-xs font-medium text-text-muted mb-1.5"
          >
            Reason <span className="text-red">*</span>
          </label>
          <select
            id="report-reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:border-red/50 focus:outline-none focus:ring-1 focus:ring-red/25 cursor-pointer"
          >
            <option value="" disabled>
              Select a reason...
            </option>
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="report-details"
            className="block text-xs font-medium text-text-muted mb-1.5"
          >
            Details (optional)
          </label>
          <textarea
            id="report-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Anything that helps us understand what happened..."
            className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 resize-none focus:border-red/50 focus:outline-none focus:ring-1 focus:ring-red/25"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-xs text-text-muted hover:text-text bg-surface-alt border border-border transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!reason || pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-red text-white hover:bg-red/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Flag size={12} />
            {pending ? "Sending..." : "Send report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
