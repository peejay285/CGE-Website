"use client";

import { Hourglass } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BRAND } from "@/lib/constants";

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Friendly closed-beta waitlist screen, shown when a signed-in but
 * not-yet-approved account tries one of the gated actions (book a
 * session, register for a tournament, create a listing, post).
 */
export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  return (
    <Modal open={open} onClose={onClose} width="sm">
      <div className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan/10 text-cyan">
          <Hourglass size={26} />
        </div>
        <h3 className="text-lg font-bold font-heading tracking-tight text-text mb-2">
          You&apos;re on the waitlist
        </h3>
        <p className="text-sm text-text-muted leading-relaxed mb-5">
          CGE is in closed beta. We&apos;re letting testers in wave by wave
          &mdash; your account is registered and in line. We&apos;ll reach out
          on WhatsApp when your spot opens.
        </p>
        <p className="text-xs text-text-muted">
          Want in faster?{" "}
          <a
            href={BRAND.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-green hover:text-green/80 underline underline-offset-2 transition-colors"
          >
            Message us
          </a>
        </p>
      </div>
    </Modal>
  );
}
