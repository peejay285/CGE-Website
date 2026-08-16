import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_PRIZES_AWARDED_NAIRA, formatNairaCompact } from "@/lib/constants";

const TICKS = [
  `${formatNairaCompact(EVENT_PRIZES_AWARDED_NAIRA)} paid at real events`,
  "Paystack-protected payments",
  "Real venue in Bonny Island",
];

/** Inline row of three factual trust points, used under preview hero CTAs. */
export function TrustTicks({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2",
        className
      )}
    >
      {TICKS.map((tick) => (
        <li
          key={tick}
          className="flex items-center gap-1.5 text-xs text-text-muted"
        >
          <Check size={14} className="shrink-0 text-cyan" aria-hidden="true" />
          {tick}
        </li>
      ))}
    </ul>
  );
}
