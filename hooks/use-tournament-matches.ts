"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TournamentMatch, MatchDispute } from "@/lib/types";
import type { BracketParticipant, BracketType } from "@/lib/bracket-engine";

type BracketResponse = { matches: TournamentMatch[] };
type MatchActionResponse = { match: TournamentMatch; dispute?: MatchDispute };

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    details?: unknown;
  };

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export function useTournamentMatches() {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [disputes, setDisputes] = useState<MatchDispute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // ── Fetch matches for a tournament ─────────────────
  const getMatches = useCallback(
    async (tournamentId: number): Promise<TournamentMatch[]> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("tournament_matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("round", { ascending: true })
          .order("match_number", { ascending: true });

        if (fetchError) throw fetchError;

        const result = (data ?? []) as TournamentMatch[];
        setMatches(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch matches";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Generate bracket and insert matches ────────────
  const generateAndSaveBracket = useCallback(
    async (
      tournamentId: number,
      bracketType: BracketType,
      participants: BracketParticipant[]
    ): Promise<TournamentMatch[]> => {
      try {
        setLoading(true);
        setError(null);

        if (participants.length < 2) {
          throw new Error("Need at least 2 participants to generate a bracket");
        }

        // The server owns bracket generation: it re-loads eligible paid/free
        // participants, checks host/admin access, inserts the bracket with the
        // service role, and links progression slots atomically from one trust
        // boundary. Keep the parameters for the UI pre-check/signature.
        void bracketType;
        const { matches: nextMatches } = await postJson<BracketResponse>(
          `/api/tournaments/${tournamentId}/bracket`,
          { action: "generate" }
        );

        setMatches(nextMatches);
        return nextMatches;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate bracket";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── Report match result ────────────────────────────
  // By default a participant's report enters "awaiting_confirmation" and does
  // NOT advance the bracket — the opponent must confirm (or dispute) first.
  // Pass { autoConfirm: true } for a host/admin report, which is trusted and
  // finalises + advances immediately.
  const reportMatch = useCallback(
    async (
      matchId: number,
      winnerId: string,
      score1: number,
      score2: number,
      options?: { autoConfirm?: boolean }
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        void options;
        const { match } = await postJson<MatchActionResponse>(
          `/api/tournament-matches/${matchId}`,
          {
            action: "report",
            winner_id: winnerId,
            participant1_score: score1,
            participant2_score: score2,
          }
        );

        setMatches((prev) =>
          prev.map((current) => (current.id === match.id ? match : current))
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to report match";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── Confirm a reported result ──────────────────────
  // Finalises an "awaiting_confirmation" match (opponent confirms, or a host
  // force-confirms) and advances the bracket.
  const confirmMatch = useCallback(
    async (matchId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { match } = await postJson<MatchActionResponse>(
          `/api/tournament-matches/${matchId}`,
          { action: "confirm" }
        );

        setMatches((prev) =>
          prev.map((current) => (current.id === match.id ? match : current))
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to confirm result";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── Start a match (set to in_progress) ─────────────
  const startMatch = useCallback(
    async (matchId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { match } = await postJson<MatchActionResponse>(
          `/api/tournament-matches/${matchId}`,
          { action: "start" }
        );

        setMatches((prev) =>
          prev.map((current) => (current.id === match.id ? match : current))
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start match";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── File a dispute ─────────────────────────────────
  const disputeMatch = useCallback(
    async (matchId: number, reason: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { match, dispute } = await postJson<MatchActionResponse>(
          `/api/tournament-matches/${matchId}`,
          { action: "dispute", reason }
        );

        setMatches((prev) =>
          prev.map((current) => (current.id === match.id ? match : current))
        );
        if (dispute) setDisputes((prev) => [dispute, ...prev]);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to file dispute";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── Resolve a dispute ──────────────────────────────
  const resolveDispute = useCallback(
    async (
      disputeId: number,
      matchId: number,
      resolution: string,
      newStatus: "open" | "resolved" | "dismissed"
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        if (newStatus === "open") throw new Error("Choose a final dispute decision");

        const { match, dispute } = await postJson<MatchActionResponse>(
          `/api/tournament-matches/${matchId}`,
          {
            action: "resolve_dispute",
            dispute_id: disputeId,
            decision: newStatus,
            resolution,
          }
        );

        setMatches((prev) =>
          prev.map((current) => (current.id === match.id ? match : current))
        );
        if (dispute) {
          setDisputes((prev) =>
            prev.map((current) => (current.id === dispute.id ? dispute : current))
          );
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to resolve dispute";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── Get disputes for a tournament ──────────────────
  // Self-contained: joins tournament_matches (inner) so it can filter by
  // tournament without relying on `matches` state being loaded first, and
  // hydrates match context for display in the resolution UI.
  const getDisputes = useCallback(
    async (tournamentId: number): Promise<MatchDispute[]> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("match_disputes")
          .select(
            `*, match:tournament_matches!inner (
              id, tournament_id, round, match_number,
              participant1_id, participant2_id,
              participant1_name, participant2_name,
              status, winner_id
            )`
          )
          .eq("match.tournament_id", tournamentId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        const result = (data ?? []) as MatchDispute[];
        setDisputes(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch disputes";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // ── Delete all matches (reset bracket) ─────────────
  const resetBracket = useCallback(
    async (tournamentId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        await postJson<BracketResponse>(`/api/tournaments/${tournamentId}/bracket`, {
          action: "reset",
        });

        setMatches([]);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to reset bracket";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    matches,
    disputes,
    loading,
    error,
    getMatches,
    generateAndSaveBracket,
    reportMatch,
    confirmMatch,
    startMatch,
    disputeMatch,
    resolveDispute,
    getDisputes,
    resetBracket,
  };
}
