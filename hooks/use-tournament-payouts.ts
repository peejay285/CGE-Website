"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  TournamentPayout,
  TournamentPrizePlacement,
} from "@/lib/types";

type PayoutProfile = Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">;
type PayoutRecipientProfile = PayoutProfile &
  Pick<
    Profile,
    | "payout_account_name"
    | "payout_bank_name"
    | "payout_account_last4"
    | "payout_profile_verified_at"
  >;

export interface TournamentPayoutSummary {
  tournament_id: number;
  prize_pool_total: number;
  allocated_total: number;
  payout_count: number;
  status: string;
}

async function hydrateProfiles<T extends { user_id: string; profile?: PayoutRecipientProfile }>(
  supabase: ReturnType<typeof createClient>,
  rows: T[]
): Promise<T[]> {
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  if (userIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, gamertag, payout_account_name, payout_bank_name, payout_account_last4, payout_profile_verified_at"
    )
    .in("id", userIds);

  const profileMap = new Map<string, PayoutRecipientProfile>();
  for (const profile of (profiles ?? []) as PayoutRecipientProfile[]) {
    profileMap.set(profile.id, profile);
  }

  return rows.map((row) => ({
    ...row,
    profile: profileMap.get(row.user_id),
  }));
}

export function useTournamentPayouts() {
  const supabase = createClient();
  const [payouts, setPayouts] = useState<TournamentPayout[]>([]);
  const [placements, setPlacements] = useState<TournamentPrizePlacement[]>([]);
  const [summary, setSummary] = useState<TournamentPayoutSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPayouts = useCallback(
    async (tournamentId: number) => {
      try {
        setLoading(true);
        setError(null);

        const [payoutResult, placementResult] = await Promise.all([
          supabase
            .from("tournament_payouts")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("placement", { ascending: true }),
          supabase
            .from("tournament_prize_placements")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("placement", { ascending: true }),
        ]);

        if (payoutResult.error) throw payoutResult.error;
        if (placementResult.error) throw placementResult.error;

        const payoutRows = await hydrateProfiles(
          supabase,
          (payoutResult.data ?? []) as TournamentPayout[]
        );
        const placementRows = await hydrateProfiles(
          supabase,
          (placementResult.data ?? []) as TournamentPrizePlacement[]
        );

        setPayouts(payoutRows);
        setPlacements(placementRows);
        return { payouts: payoutRows, placements: placementRows };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch payouts";
        setError(message);
        return { payouts: [], placements: [] };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const setPrizePlacement = useCallback(
    async (tournamentId: number, placement: number, userId: string) => {
      try {
        setLoading(true);
        setError(null);

        const { error: rpcError } = await supabase.rpc(
          "set_tournament_prize_placement",
          {
            p_tournament_id: tournamentId,
            p_placement: placement,
            p_user_id: userId,
          }
        );

        if (rpcError) throw rpcError;
        await getPayouts(tournamentId);
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to assign prize placement";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase, getPayouts]
  );

  const preparePayouts = useCallback(
    async (tournamentId: number) => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc(
          "prepare_tournament_payouts",
          { p_tournament_id: tournamentId }
        );

        if (rpcError) throw rpcError;

        const nextSummary = Array.isArray(data)
          ? (data[0] as TournamentPayoutSummary | undefined) ?? null
          : (data as TournamentPayoutSummary | null);

        setSummary(nextSummary);
        await getPayouts(tournamentId);
        return nextSummary;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to prepare payout draft";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, getPayouts]
  );

  const approvePayouts = useCallback(
    async (tournamentId: number) => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc(
          "approve_tournament_payouts",
          { p_tournament_id: tournamentId }
        );

        if (rpcError) throw rpcError;
        await getPayouts(tournamentId);
        return typeof data === "number" ? data : 0;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to approve payouts";
        setError(message);
        return 0;
      } finally {
        setLoading(false);
      }
    },
    [supabase, getPayouts]
  );

  const releasePayout = useCallback(
    async (payoutId: string, tournamentId: number) => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/tournament-payouts/${payoutId}/release`, {
          method: "POST",
        });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; status?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to release payout");
        }

        await getPayouts(tournamentId);
        return payload;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to release payout";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getPayouts]
  );

  return {
    payouts,
    placements,
    summary,
    loading,
    error,
    getPayouts,
    setPrizePlacement,
    preparePayouts,
    approvePayouts,
    releasePayout,
  };
}
