import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { MarketplaceListing } from "@/lib/types";
import ListingDetailPageClient from "./listing-detail-page-client";

const LISTING_SELECT =
  "*, seller:profiles!user_id(id, full_name, avatar_url, gamertag, phone, created_at, trust_level, avg_rating, rating_count, total_sales, total_swaps, location_state, location_city, is_id_verified, premium_tier), listing_saves(user_id)";

// UUIDs only — anything else is a guaranteed miss.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

const FALLBACK_METADATA: Metadata = {
  title: "Listing — CGE Swap Market",
  description:
    "Trade, swap and sell gaming gear on CGE Swap Market — Nigeria's gaming marketplace.",
  openGraph: {
    title: "CGE Swap Market — Gaming Gear in Nigeria",
    description: "Trade, swap and sell gaming gear with the CGE community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CGE Swap Market — Gaming Gear in Nigeria",
    description: "Trade, swap and sell gaming gear with the CGE community.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) return FALLBACK_METADATA;

    const supabase = getAnonClient();
    if (!supabase) return FALLBACK_METADATA;

    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("title, description, price, condition, category, listing_type, images")
      .eq("id", id)
      .maybeSingle<
        Pick<
          MarketplaceListing,
          | "title"
          | "description"
          | "price"
          | "condition"
          | "category"
          | "listing_type"
          | "images"
        >
      >();

    if (error || !data) return FALLBACK_METADATA;

    const title = `${data.title} — CGE Swap Market`;
    const detailParts: string[] = [];
    if (data.listing_type === "swap") {
      detailParts.push("Swap Only");
    } else if (typeof data.price === "number" && data.price > 0) {
      detailParts.push(`₦${data.price.toLocaleString()}`);
    }
    if (data.condition) detailParts.push(data.condition);
    if (data.category) detailParts.push(data.category);
    const description = `${detailParts.join(" · ")}${
      detailParts.length > 0 ? ". " : ""
    }${
      data.description
        ? `${data.description.slice(0, 140)} — `
        : ""
    }Trade, swap and sell gaming gear on CGE.`;

    const image = data.images?.[0];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url: `/marketplace/listing/${id}`,
        ...(image ? { images: [{ url: image }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  } catch {
    return FALLBACK_METADATA;
  }
}

/**
 * Server component: fetches the listing row with the anon client (same
 * approach as app/esports/[id]/page.tsx) so the detail content is in the
 * HTML on first paint and the page is shareable with rich previews.
 */
export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let initialData: MarketplaceListing | null = null;
  let confirmedMissing = !UUID_RE.test(id);

  if (!confirmedMissing) {
    try {
      const supabase = getAnonClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("marketplace_listings")
          .select(LISTING_SELECT)
          .eq("id", id)
          .maybeSingle();

        if (!error) {
          if (data) {
            const row = data as Record<string, unknown>;
            const saves = row.listing_saves as
              | Array<{ user_id: string }>
              | undefined;
            initialData = {
              ...row,
              seller: row.seller ?? undefined,
              swap_for_tags: (row.swap_for_tags as string[]) ?? [],
              buyout_price: (row.buyout_price as number) ?? null,
              views_count: (row.views_count as number) ?? 0,
              saves_count: saves?.length ?? 0,
              user_has_saved: false,
            } as MarketplaceListing;
          } else {
            // Fetch succeeded and the row genuinely doesn't exist.
            confirmedMissing = true;
          }
        }
      }
    } catch {
      // Fetch failed — fall through with null; the client component
      // handles the not-found state gracefully.
    }
  }

  // Outside the try/catch: notFound() works by throwing.
  if (confirmedMissing) notFound();

  return <ListingDetailPageClient key={id} listing={initialData} />;
}
