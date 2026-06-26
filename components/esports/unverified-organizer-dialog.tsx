"use client";

import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

interface UnverifiedOrganizerDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  organizerName: string;
  isPaid: boolean;
  entryFeeLabel?: string;
  isTeamEvent?: boolean;
  loading?: boolean;
}

export function UnverifiedOrganizerDialog({
  open,
  onClose,
  onConfirm,
  organizerName,
  isPaid,
  entryFeeLabel,
  isTeamEvent,
  loading,
}: UnverifiedOrganizerDialogProps) {
  const content = (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/10">
          <AlertTriangle size={20} className="text-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text">
            {organizerName} isn&apos;t a verified CGE organizer yet
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            This organizer hasn&apos;t completed CGE verification. Confirm the rules, schedule, and
            prize details before you {isTeamEvent ? "register your team" : "register"}.
          </p>
        </div>
      </div>

      {isPaid && (
        <div className="rounded-lg border border-cyan/20 bg-cyan/5 p-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-cyan" />
            <p className="text-[11px] leading-relaxed text-text-muted">
              Your {entryFeeLabel ? <span className="font-semibold text-text">{entryFeeLabel}</span> : ""} entry
              goes through CGE checkout and prize payouts are released by CGE — but CGE doesn&apos;t vouch
              for this organizer&apos;s conduct. Only continue if you trust the event.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          variant="magenta"
          fullWidth
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {isTeamEvent ? "Registering team..." : "Registering..."}
            </>
          ) : isPaid ? (
            "Continue & Register"
          ) : (
            "Register anyway"
          )}
        </Button>
        <Button variant="ghost" fullWidth disabled={loading} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <Modal open={open} onClose={onClose} title="Before you register" width="sm">
          {content}
        </Modal>
      </div>
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title="Before you register">
          <div className="px-4 py-3">{content}</div>
        </BottomSheet>
      </div>
    </>
  );
}
