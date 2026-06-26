import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getCanonicalSiteUrl, shouldDisableIndexing } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (shouldDisableIndexing()) {
    return [];
  }

  const baseUrl = getCanonicalSiteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/lounge`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/marketplace`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/esports`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/community`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  // Dynamic entries — tournaments and events detail pages. Fail soft: if
  // env vars are missing or the fetch errors, return static entries only.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
    return staticEntries;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const [tournaments, events] = await Promise.all([
      supabase.from("tournaments").select("id").limit(200),
      supabase.from("events").select("id").limit(200),
    ]);

    const tournamentEntries: MetadataRoute.Sitemap = (tournaments.data ?? []).map(
      (t: { id: number }) => ({
        url: `${baseUrl}/esports/${t.id}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.6,
      })
    );

    const eventEntries: MetadataRoute.Sitemap = (events.data ?? []).map(
      (e: { id: number }) => ({
        url: `${baseUrl}/events/${e.id}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.6,
      })
    );

    return [...staticEntries, ...tournamentEntries, ...eventEntries];
  } catch {
    return staticEntries;
  }
}
