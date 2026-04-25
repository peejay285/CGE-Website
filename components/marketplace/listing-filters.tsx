"use client";

import { useState, useCallback } from "react";
import {
  Search,
  ArrowLeftRight,
  Heart,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NIGERIAN_STATES } from "@/lib/constants";
import { SearchSuggestions, addToSearchHistory } from "./search-suggestions";

type ListingTypeFilter = "all" | "swap" | "buy" | "saved";

const LISTING_TYPE_FILTERS: {
  value: ListingTypeFilter;
  label: string;
  authOnly?: boolean;
}[] = [
  { value: "all", label: "All" },
  { value: "swap", label: "Swap" },
  { value: "buy", label: "Buy" },
  { value: "saved", label: "Saved", authOnly: true },
];

const PRICE_PRESETS: { label: string; min: string; max: string }[] = [
  { label: "Any Price", min: "", max: "" },
  { label: "Under \u20A65k", min: "", max: "5000" },
  { label: "\u20A65k–20k", min: "5000", max: "20000" },
  { label: "\u20A620k–50k", min: "20000", max: "50000" },
  { label: "\u20A650k+", min: "50000", max: "" },
];

interface ListingFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  listingTypeFilter: string;
  onListingTypeFilterChange: (filter: string) => void;
  isSignedIn?: boolean;
  priceRange: { min: string; max: string };
  onPriceRangeChange: (range: { min: string; max: string }) => void;
  locationState: string;
  onLocationStateChange: (state: string) => void;
  listingTitles?: string[];
}

export function ListingFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  listingTypeFilter,
  onListingTypeFilterChange,
  isSignedIn,
  priceRange,
  onPriceRangeChange,
  locationState,
  onLocationStateChange,
  listingTitles,
}: ListingFiltersProps) {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const isPresetActive = (preset: { min: string; max: string }) =>
    priceRange.min === preset.min && priceRange.max === preset.max;

  const handleSuggestionSelect = useCallback(
    (term: string) => {
      onSearchChange(term);
      addToSearchHistory(term);
      onSearchSubmit?.(term);
    },
    [onSearchChange, onSearchSubmit]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && search.trim()) {
        addToSearchHistory(search.trim());
        setSuggestionsOpen(false);
        onSearchSubmit?.(search.trim());
      }
      if (e.key === "Escape") {
        setSuggestionsOpen(false);
      }
    },
    [search, onSearchSubmit]
  );

  return (
    <div className="flex flex-col gap-2.5">
      {/* Search bar with suggestions */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="search"
          placeholder="Search items to swap, buy, or sell..."
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!suggestionsOpen) setSuggestionsOpen(true);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onKeyDown={handleSearchKeyDown}
          aria-label="Search marketplace listings"
          aria-expanded={suggestionsOpen}
          aria-haspopup="listbox"
          autoComplete="off"
          className={cn(
            "w-full rounded-xl border border-border bg-surface-alt pl-10 pr-10 py-2.5 text-sm text-text",
            "placeholder:text-text-muted/50 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25",
            "transition-all duration-200"
          )}
        />
        {search && (
          <button
            onClick={() => {
              onSearchChange("");
              setSuggestionsOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-surface transition-colors text-text-muted hover:text-text cursor-pointer"
          >
            <X size={14} />
          </button>
        )}

        {/* Search suggestions dropdown */}
        <SearchSuggestions
          query={search}
          visible={suggestionsOpen}
          onSelect={handleSuggestionSelect}
          onClose={() => setSuggestionsOpen(false)}
          listingTitles={listingTitles}
        />
      </div>

      {/* Listing type + price presets — single scrollable row */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" role="toolbar" aria-label="Listing filters">
        {/* Type filters */}
        {LISTING_TYPE_FILTERS.map((filter) => {
          if (filter.authOnly && !isSignedIn) return null;

          const isSaved = filter.value === "saved";
          const isActive = listingTypeFilter === filter.value;

          return (
            <button
              key={filter.value}
              onClick={() => onListingTypeFilterChange(filter.value)}
              aria-pressed={isActive}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer border flex items-center gap-1 whitespace-nowrap",
                "active:scale-95",
                isSaved
                  ? isActive
                    ? "bg-red-500/15 text-red-500 border-red-500/30"
                    : "bg-surface-alt text-text-muted border-border hover:text-red-400 hover:border-red-500/20"
                  : isActive
                    ? "bg-magenta/15 text-magenta border-magenta/30"
                    : "bg-surface-alt text-text-muted border-border hover:text-text hover:border-magenta/20"
              )}
            >
              {filter.value === "swap" && <ArrowLeftRight size={11} />}
              {isSaved && (
                <Heart
                  size={11}
                  className={isActive ? "fill-current" : ""}
                />
              )}
              {filter.label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px bg-border/50 shrink-0 my-1" />

        {/* State filter */}
        <select
          value={locationState}
          onChange={(e) => onLocationStateChange(e.target.value)}
          aria-label="Filter by state"
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap cursor-pointer",
            "transition-all duration-200 active:scale-95",
            locationState
              ? "bg-cyan/15 text-cyan border-cyan/30"
              : "bg-surface-alt text-text-muted border-border hover:text-text hover:border-cyan/20"
          )}
        >
          <option value="">All states</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Divider */}
        {listingTypeFilter !== "swap" && (
          <div className="w-px bg-border/50 shrink-0 my-1" />
        )}

        {/* Price presets */}
        {listingTypeFilter !== "swap" &&
          PRICE_PRESETS.map((preset) => {
            const isActive = isPresetActive(preset);
            const isAny = !preset.min && !preset.max;

            // Don't show "Any Price" if no price filter is active
            if (isAny && !priceRange.min && !priceRange.max) return null;

            return (
              <button
                key={preset.label}
                onClick={() => onPriceRangeChange({ min: preset.min, max: preset.max })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer border whitespace-nowrap",
                  "active:scale-95",
                  isActive
                    ? "bg-cyan/15 text-cyan border-cyan/30"
                    : "bg-surface-alt text-text-muted border-border hover:text-text hover:border-cyan/20"
                )}
              >
                {preset.label}
              </button>
            );
          })}
      </div>
    </div>
  );
}
