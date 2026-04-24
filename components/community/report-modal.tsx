"use client";

import { useState } from "react";
import { X, AlertTriangle, Flag } from "lucide-react";
import type { ReportReason } from "@/lib/types";
import { REPORT_REASONS } from "@/lib/community-constants";

interface ReportModalProps {
  postId: string;
  onReport: (postId: string, reason: ReportReason, details?: string) => Promise<void>;
  onClose: () => void;
}

export default function ReportModal({ postId, onReport, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await onReport(postId, reason, details || undefined);
      setSubmitted(true);
      setTimeout(onClose, 1500);
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-surface border border-border rounded-2xl p-8 max-w-sm w-full text-center animate-scaleIn">
          <div className="w-12 h-12 rounded-full bg-green/15 flex items-center justify-center mx-auto mb-3">
            <Flag size={20} className="text-green" />
          </div>
          <h3 className="text-text font-heading text-sm mb-1">Report Submitted</h3>
          <p className="text-text-muted text-xs">
            Thank you for helping keep the community safe. We&apos;ll review this post.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop modal */}
      <div className="hidden sm:flex fixed inset-0 z-50 items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-surface border border-border rounded-2xl w-full max-w-md animate-scaleIn">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2 text-red">
              <AlertTriangle size={18} />
              <h3 className="font-heading text-sm">Report Post</h3>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-surface-alt flex items-center justify-center text-text-muted hover:text-text"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-xs text-text-muted">
              Why are you reporting this post? Your report is anonymous.
            </p>

            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value as ReportReason)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    reason === r.value
                      ? "bg-red/10 border border-red/40 text-red"
                      : "bg-surface-alt border border-border text-text-muted hover:text-text"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {reason && (
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add details (optional)..."
                rows={3}
                className="w-full bg-surface-alt border border-border rounded-xl px-3 py-2 text-xs text-text placeholder:text-text-muted/50 resize-none focus:border-red/50 focus:ring-1 focus:ring-red/25 outline-none"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-text-muted hover:text-text bg-surface-alt border border-border"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-red text-white hover:bg-red/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="sm:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
        <div className="absolute bottom-0 inset-x-0 bg-surface border-t border-border rounded-t-2xl animate-slideUp max-h-[85vh] overflow-y-auto">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3" />

          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 text-red">
              <AlertTriangle size={18} />
              <h3 className="font-heading text-sm">Report Post</h3>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <p className="text-xs text-text-muted">
              Why are you reporting this post? Your report is anonymous.
            </p>

            <div className="space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value as ReportReason)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    reason === r.value
                      ? "bg-red/10 border border-red/40 text-red"
                      : "bg-surface-alt border border-border text-text-muted hover:text-text"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {reason && (
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add details (optional)..."
                rows={3}
                className="w-full bg-surface-alt border border-border rounded-xl px-3 py-2 text-xs text-text placeholder:text-text-muted/50 resize-none focus:border-red/50 focus:ring-1 focus:ring-red/25 outline-none"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl text-xs text-text-muted bg-surface-alt border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="flex-1 px-4 py-3 rounded-xl text-xs font-medium bg-red text-white disabled:opacity-40 transition-all"
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
