import { requireAdmin } from "@/lib/require-admin";
import { SwapAssistAdminClient, type AssistRow } from "./client";
import type { SwapAssistPayment, SwapAssistStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RawProposal {
  id: string;
  status: string;
  assist_status: SwapAssistStatus;
  assist_fee_total: number | null;
  assist_requested_at: string | null;
  assist_activated_at: string | null;
  assist_completed_at: string | null;
  proposer_id: string;
  offered_listing: { title: string | null } | null;
  target_listing: { title: string | null; user_id: string | null } | null;
  assist_payments: SwapAssistPayment[] | null;
}

export default async function SwapAssistAdminPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("swap_proposals")
    .select(
      "id, status, assist_status, assist_fee_total, assist_requested_at, assist_activated_at, assist_completed_at, proposer_id, offered_listing:marketplace_listings!offered_listing_id(title), target_listing:marketplace_listings!listing_id(title, user_id), assist_payments:swap_assist_payments(*)",
    )
    .neq("assist_status", "none")
    .order("assist_requested_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <p className="text-sm text-red">Failed to load assisted swaps: {error.message}</p>
      </div>
    );
  }

  const raw = (data ?? []) as unknown as RawProposal[];

  // Resolve party display names in one query (PostgREST can't traverse
  // listing.user_id → profiles automatically).
  const ids = new Set<string>();
  raw.forEach((r) => {
    ids.add(r.proposer_id);
    if (r.target_listing?.user_id) ids.add(r.target_listing.user_id);
  });

  const nameById = new Map<string, string | null>();
  if (ids.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, gamertag")
      .in("id", Array.from(ids));
    ((profiles ?? []) as { id: string; full_name: string | null; gamertag: string | null }[]).forEach(
      (p) => nameById.set(p.id, p.gamertag || p.full_name),
    );
  }

  const rows: AssistRow[] = raw.map((r) => ({
    id: r.id,
    swap_status: r.status,
    assist_status: r.assist_status,
    assist_fee_total: r.assist_fee_total,
    assist_requested_at: r.assist_requested_at,
    assist_activated_at: r.assist_activated_at,
    assist_completed_at: r.assist_completed_at,
    proposer_name: nameById.get(r.proposer_id) ?? null,
    owner_name: r.target_listing?.user_id ? nameById.get(r.target_listing.user_id) ?? null : null,
    offered_title: r.offered_listing?.title ?? null,
    target_title: r.target_listing?.title ?? null,
    payments: r.assist_payments ?? [],
  }));

  return <SwapAssistAdminClient rows={rows} />;
}
