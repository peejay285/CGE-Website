"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellRing, X, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/types";

const STORAGE_KEY = "cge-saved-searches";
const SEEN_KEY = "cge-saved-search-seen";

interface SavedSearch {
  id: string;
  query: string;
  category?: string;
  createdAt: string;
}

function getSavedSearches(): SavedSearch[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setSavedSearches(searches: SavedSearch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Silent
  }
}

function getSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markAsSeen(ids: string[]) {
  try {
    const existing = getSeenIds();
    ids.forEach((id) => existing.add(id));
    // Keep max 200 to avoid unbounded growth
    const arr = Array.from(existing).slice(-200);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    // Silent
  }
}

export function addSavedSearch(query: string, category?: string): boolean {
  const searches = getSavedSearches();
  const normalized = query.trim().toLowerCase();

  // Prevent duplicates
  if (
    searches.some(
      (s) =>
        s.query.toLowerCase() === normalized &&
        (s.category || "") === (category || "")
    )
  ) {
    return false;
  }

  searches.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    query: query.trim(),
    category: category && category !== "All" ? category : undefined,
    createdAt: new Date().toISOString(),
  });

  // Max 10 saved searches
  setSavedSearches(searches.slice(0, 10));
  return true;
}

export function removeSavedSearch(id: string) {
  setSavedSearches(getSavedSearches().filter((s) => s.id !== id));
}

/** Check if a listing matches any saved search */
function matchesSavedSearch(listing: MarketplaceListing, search: SavedSearch): boolean {
  const titleMatch = listing.title
    .toLowerCase()
    .includes(search.query.toLowerCase());
  const descMatch = listing.description
    ? listing.description.toLowerCase().includes(search.query.toLowerCase())
    : false;
  const categoryMatch = search.category
    ? listing.category === search.category
    : true;

  return (titleMatch || descMatch) && categoryMatch;
}

interface SavedSearchesButtonProps {
  listings: MarketplaceListing[];
  onSearchSelect: (query: string, category?: string) => void;
}

export function SavedSearchesButton({
  listings,
  onSearchSelect,
}: SavedSearchesButtonProps) {
  const [open, setOpen] = useState(false);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [newMatchCount, setNewMatchCount] = useState(0);

  // Load saved searches and compute new matches
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = getSavedSearches();
      setSearches(saved);

      if (saved.length === 0 || listings.length === 0) {
        setNewMatchCount(0);
        return;
      }

      const seen = getSeenIds();
      let count = 0;

      for (const listing of listings) {
        if (seen.has(listing.id)) continue;
        for (const search of saved) {
          if (matchesSavedSearch(listing, search)) {
            count++;
            break; // Count listing only once even if it matches multiple searches
          }
        }
      }

      setNewMatchCount(count);
    }, 0);
    return () => clearTimeout(timer);
  }, [listings]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    // Mark all current matches as seen
    if (listings.length > 0 && searches.length > 0) {
      const matchedIds: string[] = [];
      for (const listing of listings) {
        for (const search of searches) {
          if (matchesSavedSearch(listing, search)) {
            matchedIds.push(listing.id);
            break;
          }
        }
      }
      markAsSeen(matchedIds);
      setNewMatchCount(0);
    }
  }, [listings, searches]);

  const handleRemove = useCallback((id: string) => {
    removeSavedSearch(id);
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSelectSearch = useCallback(
    (search: SavedSearch) => {
      onSearchSelect(search.query, search.category);
      setOpen(false);
    },
    [onSearchSelect]
  );

  if (searches.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "relative p-2 rounded-lg border transition-all duration-200 cursor-pointer",
          newMatchCount > 0
            ? "bg-magenta/10 border-magenta/30 animate-pulse"
            : "bg-surface-alt border-border hover:border-cyan/30"
        )}
        aria-label={`Saved searches${newMatchCount > 0 ? ` — ${newMatchCount} new matches` : ""}`}
      >
        {newMatchCount > 0 ? (
          <BellRing size={16} className="text-magenta" />
        ) : (
          <Bell size={16} className="text-text-muted" />
        )}
        {newMatchCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-magenta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {newMatchCount > 9 ? "9+" : newMatchCount}
          </span>
        )}
      </button>

      {/* Saved searches panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-base/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md bg-surface border border-border rounded-t-2xl sm:rounded-2xl mx-0 sm:mx-4 p-5 z-10 max-h-[70vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                <Bell size={14} className="text-cyan" />
                Saved Searches
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-full hover:bg-surface-alt transition-colors cursor-pointer"
              >
                <X size={16} className="text-text-muted" />
              </button>
            </div>

            <div className="space-y-2">
              {searches.map((search) => {
                const matchCount = listings.filter((l) =>
                  matchesSavedSearch(l, search)
                ).length;

                return (
                  <div
                    key={search.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-alt hover:border-cyan/20 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectSearch(search)}
                      className="flex-1 flex items-center gap-2.5 text-left cursor-pointer"
                    >
                      <Search size={13} className="text-text-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-text truncate">
                          {search.query}
                          {search.category && (
                            <span className="text-cyan/60 text-[10px] ml-1.5">
                              in {search.category}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {matchCount > 0 ? (
                            <span className="text-cyan">
                              {matchCount} {matchCount === 1 ? "match" : "matches"} now
                            </span>
                          ) : (
                            "No current matches"
                          )}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(search.id)}
                      className="p-1.5 rounded-lg hover:bg-surface transition-colors cursor-pointer shrink-0"
                      aria-label={`Remove saved search "${search.query}"`}
                    >
                      <Trash2 size={12} className="text-text-muted hover:text-red-400" />
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-text-muted/50 mt-3 text-center">
              You&apos;ll see a notification badge when new listings match your saved searches.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
