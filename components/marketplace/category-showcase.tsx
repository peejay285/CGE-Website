"use client";

import {
  getCategoryConfig,
  CategoryIcon,
} from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/types";

interface CategoryShowcaseProps {
  listings: MarketplaceListing[];
  activeCategory: string;
  onCategorySelect: (category: string) => void;
}

const CATEGORIES = ["Controllers", "Games", "Accessories", "Furniture", "Consoles"];

export function CategoryShowcase({
  listings,
  activeCategory,
  onCategorySelect,
}: CategoryShowcaseProps) {
  // Count listings per category
  const counts = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = listings.filter((l) => l.category === cat).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="mb-5">
      <h2 className="text-sm font-semibold text-text mb-3">Browse by Category</h2>
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {CATEGORIES.map((cat) => {
          const config = getCategoryConfig(cat);
          const isActive = activeCategory === cat;
          const count = counts[cat] ?? 0;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategorySelect(isActive ? "All" : cat)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all cursor-pointer active:scale-95",
                isActive
                  ? "bg-cyan/10 border-cyan/30 shadow-[0_0_12px_rgba(0,240,255,0.1)]"
                  : "bg-surface-alt border-border hover:border-cyan/20"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors",
                  isActive ? "bg-cyan/15" : "bg-surface"
                )}
              >
                <CategoryIcon
                  category={cat}
                  size={20}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-cyan" : ""
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] font-medium leading-tight text-center transition-colors",
                  isActive ? "text-cyan" : "text-text-muted"
                )}
              >
                {cat}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-[9px] font-medium rounded-full px-1.5 py-0.5",
                    isActive
                      ? "bg-cyan/20 text-cyan"
                      : "bg-surface text-text-muted"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
