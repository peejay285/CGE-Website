import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Tournament } from "@/lib/types";
import TournamentDetailClient from "./tournament-detail-client";

/**
 * Server component: fetches the tournament row with the anon client (same
 * approach as the sibling layout.tsx) so the detail content is in the
 * HTML on first paint. The client component refetches after hydration to
 * get the fully-hydrated row (live registration counts, organizer
 * profile, matches and registrants).
 */
export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);

  let initialData: Tournament | null = null;
  let confirmedMissing = false;

  if (Number.isInteger(numericId) && numericId > 0) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", numericId)
          .maybeSingle<Tournament>();

        if (!error) {
          if (data) {
            initialData = data;
          } else {
            // Fetch succeeded and the row genuinely doesn't exist.
            confirmedMissing = true;
          }
        }
      }
    } catch {
      // Fetch failed — fall through with null; the client component
      // fetches on its own and handles the not-found state.
    }
  }

  // Outside the try/catch: notFound() works by throwing.
  if (confirmedMissing) notFound();

  // Key by id so the client component remounts (and re-seeds its state)
  // when navigating between different tournament ids.
  return <TournamentDetailClient key={id} initialData={initialData} />;
}
