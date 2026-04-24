"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Clock, X, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETPLACE_CATEGORIES } from "@/lib/constants";

const HISTORY_KEY = "cge-search-history";
const MAX_HISTORY = 8;

// Popular / trending search terms (can be made dynamic later)
const POPULAR_SEARCHES = [
  "PS5",
  "Xbox controller",
  "Nintendo Switch",
  "Gaming chair",
  "Headset",
  "FIFA",
  "Monitor",
  "Keyboard",
];

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(history: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Silent fail
  }
}

export function addToSearchHistory(term: string) {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) return;
  const history = getSearchHistory().filter(
    (h) => h.toLowerCase() !== trimmed.toLowerCase()
  );
  history.unshift(trimmed);
  saveSearchHistory(history);
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Silent fail
  }
}

interface SearchSuggestionsProps {
  query: string;
  visible: boolean;
  onSelect: (term: string) => void;
  onClose: () => void;
  listingTitles?: string[];
}

export function SearchSuggestions({
  query,
  visible,
  onSelect,
  onClose,
  listingTitles = [],
}: SearchSuggestionsProps) {
  const [history, setHistory] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, [visible]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [visible, onClose]);

  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  const handleRemoveHistoryItem = useCallback((term: string) => {
    const updated = getSearchHistory().filter(
      (h) => h.toLowerCase() !== term.toLowerCase()
    );
    saveSearchHistory(updated);
    setHistory(updated);
  }, []);

  if (!visible) return null;

  const lowerQuery = query.toLowerCase().trim();

  // Build suggestions based on context
  let suggestions: { label: string; type: "history" | "category" | "popular" | "title" }[] = [];

  if (lowerQuery.length === 0) {
    // Show history + popular when empty
    history.forEach((h) => suggestions.push({ label: h, type: "history" }));
    if (suggestions.length < 3) {
      POPULAR_SEARCHES.filter(
        (p) => !history.some((h) => h.toLowerCase() === p.toLowerCase())
      )
        .slice(0, 4)
        .forEach((p) => suggestions.push({ label: p, type: "popular" }));
    }
  } else {
    // Filter history matches
    history
      .filter((h) => h.toLowerCase().includes(lowerQuery) && h.toLowerCase() !== lowerQuery)
      .slice(0, 2)
      .forEach((h) => suggestions.push({ label: h, type: "history" }));

    // Category matches
    MARKETPLACE_CATEGORIES.filter(
      (c) => c !== "All" && c.toLowerCase().includes(lowerQuery)
    )
      .slice(0, 2)
      .forEach((c) => suggestions.push({ label: c, type: "category" }));

    // Title matches (autocomplete from existing listings)
    const seenLower = new Set(suggestions.map((s) => s.label.toLowerCase()));
    listingTitles
      .filter((t) => {
        const lower = t.toLowerCase();
        return lower.includes(lowerQuery) && lower !== lowerQuery && !seenLower.has(lower);
      })
      .slice(0, 4)
      .forEach((t) => {
        suggestions.push({ label: t, type: "title" });
      });

    // Popular matches
    POPULAR_SEARCHES.filter(
      (p) =>
        p.toLowerCase().includes(lowerQuery) &&
        !suggestions.some((s) => s.label.toLowerCase() === p.toLowerCase())
    )
      .slice(0, 2)
      .forEach((p) => suggestions.push({ label: p, type: "popular" }));
  }

  // Cap total
  suggestions = suggestions.slice(0, 8);

  if (suggestions.length === 0 && history.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden"
    >
      {/* History header with clear */}
      {lowerQuery.length === 0 && history.length > 0 && (
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Recent Searches
          </span>
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-[10px] text-text-muted hover:text-magenta transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      <div className="py-1">
        {suggestions.map((item, i) => (
          <button
            key={`${item.type}-${item.label}-${i}`}
            type="button"
            onClick={() => {
              onSelect(item.label);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-alt transition-colors cursor-pointer text-left"
          >
            {item.type === "history" ? (
              <Clock size={12} className="text-text-muted shrink-0" />
            ) : item.type === "popular" ? (
              <TrendingUp size={12} className="text-magenta/60 shrink-0" />
            ) : (
              <Search size={12} className="text-text-muted/50 shrink-0" />
            )}
            <span
              className={cn(
                "text-sm truncate flex-1",
                item.type === "history" ? "text-text" : "text-text-muted"
              )}
            >
              {item.label}
            </span>
            {item.type === "category" && (
              <span className="text-[9px] text-cyan/60 font-medium shrink-0">
                Category
              </span>
            )}
            {item.type === "history" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveHistoryItem(item.label);
                }}
                className="p-0.5 rounded hover:bg-surface transition-colors text-text-muted hover:text-text cursor-pointer shrink-0"
                aria-label={`Remove "${item.label}" from search history`}
              >
                <X size={10} />
              </button>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
