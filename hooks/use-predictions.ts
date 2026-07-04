"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PredictionStake, TournamentPrediction } from "@/lib/types";

/** Aggregated pool for one option. */
export interface PredictionOptionPool {
  option_id: string;
  points: number;
  stakers: number;
  /** Share of the total pool, 0–100. */
  percent: number;
}

/**
 * Tournament predictions (Twitch-style, platform points only).
 *
 * Loads the latest non-cancelled prediction for a tournament plus all
 * stakes (publicly readable — pool totals are part of the fun), the
 * viewer's own stake and their profiles.points balance. All writes go
 * through the SECURITY DEFINER RPCs from
 * supabase/tournament-predictions-migration.sql; action helpers return
 * `null` on success or an error message for toasting.
 */
export function usePredictions(tournamentId: number | null) {
  const supabase = createClient();
  const [prediction, setPrediction] = useState<TournamentPrediction | null>(null);
  const [stakes, setStakes] = useState<PredictionStake[]>([]);
  const [viewerStake, setViewerStake] = useState<PredictionStake | null>(null);
  const [viewerPoints, setViewerPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (tournamentId == null) {
      setPrediction(null);
      setStakes([]);
      setViewerStake(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [{ data: predictionRow, error: predictionError }, { data: auth }] =
        await Promise.all([
          supabase
            .from("tournament_predictions")
            .select("*")
            .eq("tournament_id", tournamentId)
            .neq("status", "cancelled")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.auth.getUser(),
        ]);

      if (predictionError) throw predictionError;

      const viewerId = auth.user?.id ?? null;
      const nextPrediction = (predictionRow as TournamentPrediction | null) ?? null;
      setPrediction(nextPrediction);

      if (viewerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", viewerId)
          .maybeSingle();
        setViewerPoints(
          typeof profile?.points === "number" ? profile.points : null
        );
      } else {
        setViewerPoints(null);
      }

      if (nextPrediction) {
        const { data: stakeRows, error: stakesError } = await supabase
          .from("prediction_stakes")
          .select("*")
          .eq("prediction_id", nextPrediction.id)
          .order("created_at", { ascending: true });

        if (stakesError) throw stakesError;

        const rows = (stakeRows ?? []) as PredictionStake[];
        setStakes(rows);
        setViewerStake(
          viewerId ? rows.find((s) => s.user_id === viewerId) ?? null : null
        );
      } else {
        setStakes([]);
        setViewerStake(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load prediction";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase, tournamentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Runs an RPC and refreshes; returns null on success, message on error. */
  const runAction = useCallback(
    async (
      fn: string,
      args: Record<string, unknown>,
      fallback: string
    ): Promise<string | null> => {
      try {
        setActionLoading(true);
        const { error: rpcError } = await supabase.rpc(fn, args);
        if (rpcError) throw rpcError;
        await refresh();
        return null;
      } catch (err) {
        return err instanceof Error && err.message ? err.message : fallback;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase, refresh]
  );

  const placeStake = useCallback(
    (predictionId: string, optionId: string, points: number) =>
      runAction(
        "place_prediction_stake",
        {
          p_prediction_id: predictionId,
          p_option_id: optionId,
          p_points: points,
        },
        "Failed to place stake"
      ),
    [runAction]
  );

  const createPrediction = useCallback(
    (question: string, options: Array<{ id: string; label: string }>) => {
      if (tournamentId == null) {
        return Promise.resolve("No tournament selected");
      }
      return runAction(
        "create_tournament_prediction",
        {
          p_tournament_id: tournamentId,
          p_question: question,
          p_options: options,
        },
        "Failed to create prediction"
      );
    },
    [runAction, tournamentId]
  );

  const lockPrediction = useCallback(
    (predictionId: string) =>
      runAction(
        "lock_tournament_prediction",
        { p_prediction_id: predictionId },
        "Failed to lock prediction"
      ),
    [runAction]
  );

  const settlePrediction = useCallback(
    (predictionId: string, winningOption: string) =>
      runAction(
        "settle_tournament_prediction",
        { p_prediction_id: predictionId, p_winning_option: winningOption },
        "Failed to settle prediction"
      ),
    [runAction]
  );

  const cancelPrediction = useCallback(
    (predictionId: string) =>
      runAction(
        "cancel_tournament_prediction",
        { p_prediction_id: predictionId },
        "Failed to cancel prediction"
      ),
    [runAction]
  );

  // ── Aggregates ─────────────────────────────────────────────────

  const totalPoints = useMemo(
    () => stakes.reduce((sum, s) => sum + s.points, 0),
    [stakes]
  );

  const pools = useMemo<PredictionOptionPool[]>(() => {
    if (!prediction) return [];
    return prediction.options.map((option) => {
      const optionStakes = stakes.filter((s) => s.option_id === option.id);
      const points = optionStakes.reduce((sum, s) => sum + s.points, 0);
      return {
        option_id: option.id,
        points,
        stakers: optionStakes.length,
        percent: totalPoints > 0 ? (points / totalPoints) * 100 : 0,
      };
    });
  }, [prediction, stakes, totalPoints]);

  return {
    prediction,
    stakes,
    pools,
    totalPoints,
    viewerStake,
    viewerPoints,
    loading,
    error,
    actionLoading,
    refresh,
    placeStake,
    createPrediction,
    lockPrediction,
    settlePrediction,
    cancelPrediction,
  };
}
