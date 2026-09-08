import { createClient } from "@supabase/supabase-js";
import type { MarketplaceListing, Tournament } from "@/lib/types";

/**
 * Public, anonymous reads for the landing page. Uses a cookie-less client
 * so the page can be statically cached (see `revalidate` on the route).
 * Every failure degrades to null and the page renders its honest empty
 * copy instead of a broken card.
 */

export type LandingTournament = Pick<
  Tournament,
  "id" | "title" | "game" | "date" | "time" | "entry_fee" | "prize" | "slots" | "filled" | "status"
>;

export type LandingListing = Pick<
  MarketplaceListing,
  "id" | "title" | "price" | "condition" | "category" | "images" | "listing_type" | "location" | "created_at"
>;

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getLandingData(): Promise<{
  tournament: LandingTournament | null;
  listing: LandingListing | null;
}> {
  const supabase = anonClient();
  if (!supabase) return { tournament: null, listing: null };

  const today = new Date().toISOString().slice(0, 10);

  const [tournamentRes, listingRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, title, game, date, time, entry_fee, prize, slots, filled, status")
      .eq("status", "open")
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("marketplace_listings")
      .select("id, title, price, condition, category, images, listing_type, location, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    tournament: (tournamentRes.data as LandingTournament | null) ?? null,
    listing: (listingRes.data as LandingListing | null) ?? null,
  };
}
