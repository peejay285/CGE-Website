"use client";

import { ArrowLeftRight, Scale, TrendingUp, TrendingDown, Info } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

interface SwapItem {
  title?: string | null;
  images?: string[] | null;
  condition?: string | null;
  price?: number | null;
  buyout_price?: number | null;
}

interface SwapValueComparisonProps {
  /** The viewer's own item. */
  yourItem: SwapItem;
  /** The counterparty's item. */
  theirItem: SwapItem;
  yourLabel?: string;
  theirLabel?: string;
  className?: string;
}

// A swap listing's working value: its listed price, else its cash buyout price.
function itemValue(item: SwapItem): number | null {
  if (typeof item.price === "number" && item.price > 0) return item.price;
  if (typeof item.buyout_price === "number" && item.buyout_price > 0) return item.buyout_price;
  return null;
}

// Swaps within 15% of each other read as "fair".
const FAIR_THRESHOLD = 0.15;

function ItemCell({ item, label }: { item: SwapItem; label: string }) {
  const hasImage = Boolean(item.images && item.images.length > 0);
  const value = itemValue(item);
  return (
    <div className="flex-1 min-w-0 text-center">
      <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5 truncate">{label}</p>
      <div className="mx-auto h-12 w-12 rounded-lg bg-base overflow-hidden flex items-center justify-center">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.images![0]} alt={item.title || "Item"} className="h-full w-full object-cover" />
        ) : (
          <ArrowLeftRight size={16} className="text-text-muted" />
        )}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-text truncate">{item.title || "Item"}</p>
      <p className="text-[11px] font-bold font-heading text-text-muted">
        {value !== null ? formatPrice(value) : "No price"}
      </p>
    </div>
  );
}

export function SwapValueComparison({
  yourItem,
  theirItem,
  yourLabel = "Your item",
  theirLabel = "Their item",
  className,
}: SwapValueComparisonProps) {
  const yourVal = itemValue(yourItem);
  const theirVal = itemValue(theirItem);
  const canCompare = yourVal !== null && theirVal !== null;

  // Net value to the viewer: positive = they bring more (you trade up).
  const delta = canCompare ? theirVal! - yourVal! : 0;
  const ref = canCompare ? Math.max(yourVal!, theirVal!) : 0;
  const pct = ref > 0 ? Math.abs(delta) / ref : 0;
  const fair = pct <= FAIR_THRESHOLD;

  let verdict: { label: string; detail: string; color: string; Icon: typeof Scale };
  if (!canCompare) {
    verdict = {
      label: "Value comparison unavailable",
      detail: "One of the items has no listed price.",
      color: "text-text-muted",
      Icon: Info,
    };
  } else if (delta === 0) {
    verdict = {
      label: "Even value swap",
      detail: "Both items are priced the same.",
      color: "text-green",
      Icon: Scale,
    };
  } else if (fair) {
    verdict = {
      label: "Fair swap",
      detail: `Within ${Math.round(pct * 100)}% — about ${formatPrice(Math.abs(delta))} apart.`,
      color: "text-green",
      Icon: Scale,
    };
  } else if (delta > 0) {
    verdict = {
      label: `You'd gain ${formatPrice(delta)} in value`,
      detail: "You're trading up — their item is worth more.",
      color: "text-cyan",
      Icon: TrendingUp,
    };
  } else {
    verdict = {
      label: `You'd give ${formatPrice(-delta)} more value`,
      detail: "You're trading down — your item is worth more.",
      color: "text-gold",
      Icon: TrendingDown,
    };
  }

  const { Icon } = verdict;

  return (
    <div className={cn("rounded-lg border border-border bg-surface-alt p-3", className)}>
      <div className="flex items-center gap-2">
        <ItemCell item={yourItem} label={yourLabel} />
        <ArrowLeftRight size={16} className="shrink-0 text-text-muted" />
        <ItemCell item={theirItem} label={theirLabel} />
      </div>
      <div className="mt-3 flex items-start gap-2 border-t border-border pt-3">
        <Icon size={14} className={cn("mt-0.5 shrink-0", verdict.color)} />
        <div className="min-w-0">
          <p className={cn("text-xs font-semibold", verdict.color)}>{verdict.label}</p>
          <p className="text-[11px] leading-relaxed text-text-muted">{verdict.detail}</p>
        </div>
      </div>
    </div>
  );
}
