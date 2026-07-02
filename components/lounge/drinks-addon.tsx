"use client";

import { useState } from "react";
import { PRICING } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { formatPrice } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Minus, Plus, ChevronDown } from "lucide-react";

interface DrinksAddonProps {
  drinks: Record<string, number>;
  onChange: (drinks: Record<string, number>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ALL_ITEMS = [
  ...PRICING.drinks.map((d) => ({ ...d })),
  ...PRICING.snacks.map((s) => ({ ...s })),
];

const PRICE_MAP: Record<string, number> = {};
for (const item of ALL_ITEMS) {
  PRICE_MAP[item.name] = item.price;
}

export function DrinksAddon({ drinks, onChange, onNext, onBack }: DrinksAddonProps) {
  const hasItems = Object.keys(drinks).length > 0;
  // Open by default only if the user has already picked items (so going back
  // doesn't hide their selections). Otherwise collapsed — this step is
  // optional and most bookings skip it.
  const [open, setOpen] = useState(hasItems);

  function updateQty(name: string, delta: number) {
    const current = drinks[name] || 0;
    const next = Math.max(0, current + delta);
    const updated = { ...drinks, [name]: next };
    if (updated[name] === 0) {
      delete updated[name];
    }
    onChange(updated);
  }

  const runningTotal = Object.entries(drinks).reduce((sum, [name, qty]) => {
    return sum + qty * (PRICE_MAP[name] || 0);
  }, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <SectionTitle
        eyebrow="Step 3"
        title="Drinks & Snacks"
        subtitle="Optional: grab some refreshments for your session."
        align="center"
      />

      {/* Toggle — collapsed by default since most bookings skip extras */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full min-h-11 flex items-center justify-between rounded-xl border border-border bg-surface-alt px-4 py-3 mb-4 cursor-pointer hover:border-cyan/30 transition-colors"
      >
        <span className="text-sm font-semibold text-text">
          Add refreshments?
        </span>
        <span className="flex items-center gap-2 text-xs text-text-muted">
          {hasItems
            ? `${Object.values(drinks).reduce((a, b) => a + b, 0)} item${Object.values(drinks).reduce((a, b) => a + b, 0) === 1 ? "" : "s"}`
            : "Tap to browse"}
          <ChevronDown
            size={14}
            className={open ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </span>
      </button>

      {open && (
        <>
          {/* Drinks */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Drinks
            </h4>
            <div className="space-y-3">
              {PRICING.drinks.map((item) => (
                <ItemRow
                  key={item.name}
                  name={item.name}
                  price={item.price}
                  qty={drinks[item.name] || 0}
                  onIncrement={() => updateQty(item.name, 1)}
                  onDecrement={() => updateQty(item.name, -1)}
                />
              ))}
            </div>
          </div>

          {/* Snacks */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Snacks
            </h4>
            <div className="space-y-3">
              {PRICING.snacks.map((item) => (
                <ItemRow
                  key={item.name}
                  name={item.name}
                  price={item.price}
                  qty={drinks[item.name] || 0}
                  onIncrement={() => updateQty(item.name, 1)}
                  onDecrement={() => updateQty(item.name, -1)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Running Total */}
      {runningTotal > 0 && (
        <div className="mt-6 text-center">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Extras Total
          </p>
          <p className="text-xl font-bold font-heading text-cyan">
            {formatPrice(runningTotal)}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6">
        <Button variant="ghost" className="min-h-11" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <Button variant="secondary" className="min-h-11" onClick={onNext}>
            Skip
          </Button>
          <Button variant="primary" className="min-h-11" onClick={onNext}>
            Continue
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  name,
  price,
  qty,
  onIncrement,
  onDecrement,
}: {
  name: string;
  price: number;
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <Card className="flex items-center justify-between py-4 px-5">
      <div>
        <p className="text-sm font-semibold text-text">{name}</p>
        <p className="text-xs text-text-muted">{formatPrice(price)} each</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={qty === 0}
          className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-border bg-surface-alt flex items-center justify-center text-text-muted hover:text-text hover:border-cyan/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Minus size={14} />
        </button>

        <span className="w-6 text-center text-sm font-bold font-mono text-text">
          {qty}
        </span>

        <button
          type="button"
          onClick={onIncrement}
          className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg border border-cyan/30 bg-cyan/10 flex items-center justify-center text-cyan hover:bg-cyan/20 transition-colors cursor-pointer"
        >
          <Plus size={14} />
        </button>
      </div>
    </Card>
  );
}
