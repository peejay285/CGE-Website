"use client";

import { useState } from "react";
import { Shield, ChevronDown } from "lucide-react";
import { SAFETY_GUIDELINES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SafetyDisclaimerBannerProps {
  variant?: "compact" | "expanded";
  className?: string;
}

export function SafetyDisclaimerBanner({
  variant = "expanded",
  className,
}: SafetyDisclaimerBannerProps) {
  const [open, setOpen] = useState(false);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-surface-alt px-4 py-3 flex items-start gap-2.5",
          className
        )}
      >
        <Shield size={14} className="text-cyan shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          <span className="font-semibold text-text">Safety:</span>{" "}
          {SAFETY_GUIDELINES.short}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface-alt overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer"
        aria-expanded={open}
      >
        <Shield size={16} className="text-cyan shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-text leading-snug">
            {SAFETY_GUIDELINES.title}
          </p>
          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
            {SAFETY_GUIDELINES.intro}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "text-text-muted shrink-0 mt-1 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <ul className="border-t border-border px-4 py-3 space-y-3">
          {SAFETY_GUIDELINES.tips.map((tip) => (
            <li key={tip.heading} className="text-[11px] leading-relaxed">
              <span className="font-semibold text-text">{tip.heading}.</span>{" "}
              <span className="text-text-muted">{tip.body}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
