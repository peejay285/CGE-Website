"use client";

import { useVouchers } from "@/hooks/use-vouchers";
import { useAuth } from "@/hooks/use-auth";
import { X, Gift, Copy, Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function GiveawayBanner() {
  const { user } = useAuth();
  const { unnotified, dismissVoucher } = useVouchers();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!user || unnotified.length === 0) return null;

  const voucher = unnotified[0]; // Show one at a time

  function handleCopy() {
    navigator.clipboard.writeText(voucher.code);
    setCopiedId(voucher.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg animate-in slide-in-from-top duration-500">
      <div className="rounded-xl border border-cyan/30 bg-surface shadow-[0_0_30px_rgba(0,240,255,0.15)] p-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-lg bg-cyan/15 flex items-center justify-center flex-shrink-0">
            <Gift size={20} className="text-cyan" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text mb-1">
              You won a free session!
            </p>
            <p className="text-xs text-text-muted mb-3">
              Congratulations! You won <span className="text-cyan font-semibold">{voucher.prize_label}</span> from
              our monthly giveaway.
            </p>

            {/* Voucher code */}
            <div className="flex items-center gap-2 mb-3">
              <code className="flex-1 bg-base border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold text-cyan tracking-wider">
                {voucher.code}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="w-9 h-9 rounded-lg border border-border bg-surface-alt flex items-center justify-center text-text-muted hover:text-cyan hover:border-cyan/30 transition-colors cursor-pointer"
                title="Copy code"
              >
                {copiedId === voucher.id ? <Check size={14} className="text-green" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/lounge"
                className="text-xs font-semibold text-cyan hover:text-cyan/80 transition-colors"
              >
                Book now with voucher
              </Link>
              <span className="text-xs text-text-muted">
                Expires {new Date(voucher.expires_at).toLocaleDateString("en-NG", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Dismiss */}
          <button
            type="button"
            onClick={() => dismissVoucher(voucher.id)}
            className="text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
