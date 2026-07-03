"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { MarketplaceListing } from "@/lib/types";

/**
 * Swap Matches — reverse browsing: "who wants what I have".
 *
 * Other users' swap listings store `swap_for_tags` (free-text tags describing
 * what they want in return). This hook fetches the signed-in user's active
 * listings, derives match terms from their categories + significant title
 * words, then finds swap-accepting listings whose tags overlap those terms.
 *
 * Query approach: `swap_for_tags` is a free-text TEXT[] column ("PS5
 * Controller", "Any Xbox Game", ...), so an exact-element `.overlaps()` would
 * miss almost every real match. Instead we run one simple, index-friendly
 * server query (status/listing_type/non-empty-tags, newest first, capped) and
 * do the fuzzy token matching client-side. The supporting indexes live in
 * supabase/swap-matches-index-migration.sql.
 */

export interface SwapMatch {
  listing: MarketplaceListing;
  /** Which of the user's own listings this candidate is asking for. */
  matchedMine: { id: string; title: string }[];
}

// How many swap candidates to scan per fetch.
const CANDIDATE_LIMIT = 60;
// How many matches the UI needs at most.
const MATCH_LIMIT = 12;

// Words too generic to signal a real match.
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "any", "new", "used", "like", "good", "fair",
  "brand", "set", "full", "very", "original", "edition", "version", "black",
  "white", "one", "two", "pro", "plus", "mini", "item", "gaming",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

/** Loose token comparison: exact for short tokens, prefix for longer ones
 *  (so "console" matches "consoles", "controller" matches "controllers"). */
function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    return a.startsWith(b) || b.startsWith(a);
  }
  return false;
}

interface MyListingTerms {
  id: string;
  title: string;
  terms: string[];
}

function buildTerms(listing: { id: string; title: string; category: string }): MyListingTerms {
  return {
    id: listing.id,
    title: listing.title,
    terms: [...tokenize(listing.category), ...tokenize(listing.title)],
  };
}

/** True when any tag token overlaps any of the listing's terms. */
function tagsMatchTerms(tags: string[], terms: string[]): boolean {
  for (const tag of tags) {
    for (const tagToken of tokenize(tag)) {
      if (terms.some((term) => tokensMatch(tagToken, term))) return true;
    }
  }
  return false;
}

export function useSwapMatches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActiveListings, setHasActiveListings] = useState(false);

  const fetchMatches = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setHasActiveListings(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // 1. The user's own active listings — the "what I have" side.
      const { data: mine, error: mineError } = await supabase
        .from("marketplace_listings")
        .select("id, title, category")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (mineError) throw mineError;

      if (!mine || mine.length === 0) {
        setHasActiveListings(false);
        setMatches([]);
        return;
      }
      setHasActiveListings(true);

      const myTerms: MyListingTerms[] = (
        mine as { id: string; title: string; category: string }[]
      ).map(buildTerms);

      // 2. Swap-accepting listings from other users with at least one tag.
      //    Kept simple and index-friendly; fuzzy matching happens below.
      const { data: candidates, error: candidatesError } = await supabase
        .from("marketplace_listings")
        .select(
          "*, seller:profiles!user_id(id, full_name, avatar_url, gamertag, phone, created_at, trust_level, avg_rating, rating_count, total_sales, total_swaps, is_id_verified, premium_tier)"
        )
        .eq("status", "active")
        .neq("user_id", user.id)
        .in("listing_type", ["swap", "sell_or_swap"])
        .not("swap_for_tags", "is", null)
        .neq("swap_for_tags", "{}")
        .order("created_at", { ascending: false })
        .limit(CANDIDATE_LIMIT);

      if (candidatesError) throw candidatesError;

      // 3. Client-side matching: which candidates want something I listed?
      const found: SwapMatch[] = [];
      for (const item of candidates ?? []) {
        const tags = (item.swap_for_tags as string[]) ?? [];
        if (tags.length === 0) continue;

        const matchedMine = myTerms
          .filter((m) => tagsMatchTerms(tags, m.terms))
          .map((m) => ({ id: m.id, title: m.title }));

        if (matchedMine.length === 0) continue;

        found.push({
          listing: {
            ...item,
            seller: item.seller ?? undefined,
            swap_for_tags: tags,
            buyout_price: (item.buyout_price as number) ?? null,
            views_count: (item.views_count as number) ?? 0,
            saves_count: 0,
            user_has_saved: false,
          } as MarketplaceListing,
          matchedMine,
        });

        if (found.length >= MATCH_LIMIT) break;
      }

      setMatches(found);
    } catch {
      // Non-critical discovery section — fail quietly.
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return { matches, loading, hasActiveListings, refresh: fetchMatches };
}
