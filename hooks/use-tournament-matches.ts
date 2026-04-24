"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TournamentMatch, MatchDispute } from "@/lib/types";
import type { BracketParticipant, GeneratedMatch, BracketType } from "@/lib/bracket-engine";
import { generateBracket } from "@/lib/bracket-engine";

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

        // Generate matches client-side
        const generatedMatches = generateBracket(bracketType, participants);

        // Map generated matches to DB rows
        const dbRows = generatedMatches.map((m: GeneratedMatch) => ({
          tournament_id: tournamentId,
          round: m.round,
          match_number: m.match_number,
          bracket_position: m.bracket_position,
          participant1_id: m.participant1_id === "bye" ? null : m.participant1_id,
          participant2_id: m.participant2_id === "bye" ? null : m.participant2_id,
          participant1_name: m.participant1_name === "BYE" ? null : m.participant1_name,
          participant2_name: m.participant2_name === "BYE" ? null : m.participant2_name,
          participant1_seed: m.participant1_seed,
          participant2_seed: m.participant2_seed,
          status: m.status,
          winner_id: m.winner_id,
        }));

        // Insert all matches
        const { data, error: insertError } = await supabase
          .from("tournament_matches")
          .insert(dbRows)
          .select();

        if (insertError) throw insertError;

        const insertedMatches = (data ?? []) as TournamentMatch[];

        // Now link next_match_id references using the real DB IDs
        const matchIdMap: Record<number, number> = {};
        insertedMatches.forEach((m, idx) => {
          matchIdMap[idx] = m.id;
        });

        // Link next_match_id references using the real DB IDs
        for (let idx = 0; idx < generatedMatches.length; idx++) {
          const gen = generatedMatches[idx];
          const dbMatch = insertedMatches[idx];
          if (!dbMatch) continue;

          const updateData: Record<string, unknown> = {};
          if (gen.next_match_id_ref !== null && matchIdMap[gen.next_match_id_ref] !== undefined) {
            updateData.next_match_id = matchIdMap[gen.next_match_id_ref];
            updateData.next_match_slot = gen.next_match_slot;
          }
          if (gen.loser_next_match_id_ref !== null && matchIdMap[gen.loser_next_match_id_ref] !== undefined) {
            updateData.loser_next_match_id = matchIdMap[gen.loser_next_match_id_ref];
            updateData.loser_next_match_slot = gen.loser_next_match_slot;
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("tournament_matches")
              .update(updateData)
              .eq("id", dbMatch.id);
          }
        }

        // Re-fetch the fully linked matches
        return await getMatches(tournamentId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate bracket";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase, getMatches]
  );

  // ── Report match result ────────────────────────────
  const reportMatch = useCallback(
    async (
      matchId: number,
      winnerId: string,
      score1: number,
      score2: number
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Get the match first
        const { data: matchData, error: matchError } = await supabase
          .from("tournament_matches")
          .select("*")
          .eq("id", matchId)
          .single();

        if (matchError) throw matchError;
        const match = matchData as TournamentMatch;

        const loserId =
          match.participant1_id === winnerId
            ? match.participant2_id
            : match.participant1_id;

        // Update the match
        const { error: updateError } = await supabase
          .from("tournament_matches")
          .update({
            winner_id: winnerId,
            loser_id: loserId,
            participant1_score: match.participant1_id === winnerId ? Math.max(score1, score2) : Math.min(score1, score2),
            participant2_score: match.participant2_id === winnerId ? Math.max(score1, score2) : Math.min(score1, score2),
            status: "completed",
            reported_by: user.id,
            reported_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", matchId);

        if (updateError) throw updateError;

        // Advance winner to next match
        if (match.next_match_id) {
          const winnerName =
            match.participant1_id === winnerId
              ? match.participant1_name
              : match.participant2_name;
          const winnerSeed =
            match.participant1_id === winnerId
              ? match.participant1_seed
              : match.participant2_seed;

          const slotField =
            match.next_match_slot === 1
              ? {
                  participant1_id: winnerId,
                  participant1_name: winnerName,
                  participant1_seed: winnerSeed,
                }
              : {
                  participant2_id: winnerId,
                  participant2_name: winnerName,
                  participant2_seed: winnerSeed,
                };

          await supabase
            .from("tournament_matches")
            .update(slotField)
            .eq("id", match.next_match_id);
        }

        // Advance loser to losers bracket (double elimination)
        if (match.loser_next_match_id && loserId) {
          const loserName =
            match.participant1_id === loserId
              ? match.participant1_name
              : match.participant2_name;
          const loserSeed =
            match.participant1_id === loserId
              ? match.participant1_seed
              : match.participant2_seed;

          const slotField =
            match.loser_next_match_slot === 1
              ? {
                  participant1_id: loserId,
                  participant1_name: loserName,
                  participant1_seed: loserSeed,
                }
              : {
                  participant2_id: loserId,
                  participant2_name: loserName,
                  participant2_seed: loserSeed,
                };

          await supabase
            .from("tournament_matches")
            .update(slotField)
            .eq("id", match.loser_next_match_id);
        }

        // Update local state
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  winner_id: winnerId,
                  loser_id: loserId,
                  participant1_score: match.participant1_id === winnerId ? Math.max(score1, score2) : Math.min(score1, score2),
                  participant2_score: match.participant2_id === winnerId ? Math.max(score1, score2) : Math.min(score1, score2),
                  status: "completed" as const,
                  reported_by: user.id,
                  reported_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                }
              : m
          )
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
    [supabase]
  );

  // ── Start a match (set to in_progress) ─────────────
  const startMatch = useCallback(
    async (matchId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { error: updateError } = await supabase
          .from("tournament_matches")
          .update({
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .eq("id", matchId);

        if (updateError) throw updateError;

        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId
              ? { ...m, status: "in_progress" as const, started_at: new Date().toISOString() }
              : m
          )
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
    [supabase]
  );

  // ── File a dispute ─────────────────────────────────
  const disputeMatch = useCallback(
    async (matchId: number, reason: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Update match status
        await supabase
          .from("tournament_matches")
          .update({ status: "disputed" })
          .eq("id", matchId);

        // Create dispute record
        const { error: insertError } = await supabase
          .from("match_disputes")
          .insert({
            match_id: matchId,
            reported_by: user.id,
            reason,
            evidence_urls: [],
            status: "open",
          });

        if (insertError) throw insertError;

        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId ? { ...m, status: "disputed" as const } : m
          )
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to file dispute";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        await supabase
          .from("match_disputes")
          .update({
            status: newStatus,
            resolved_by: user.id,
            resolution,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", disputeId);

        // If resolved, revert match to pending for re-play
        if (newStatus === "resolved") {
          await supabase
            .from("tournament_matches")
            .update({
              status: "pending",
              winner_id: null,
              loser_id: null,
              participant1_score: null,
              participant2_score: null,
              reported_by: null,
              reported_at: null,
              completed_at: null,
            })
            .eq("id", matchId);

          setMatches((prev) =>
            prev.map((m) =>
              m.id === matchId
                ? {
                    ...m,
                    status: "pending" as const,
                    winner_id: null,
                    loser_id: null,
                    participant1_score: null,
                    participant2_score: null,
                  }
                : m
            )
          );
        }

        // If dismissed, revert match to completed
        if (newStatus === "dismissed") {
          await supabase
            .from("tournament_matches")
            .update({ status: "completed" })
            .eq("id", matchId);

          setMatches((prev) =>
            prev.map((m) =>
              m.id === matchId ? { ...m, status: "completed" as const } : m
            )
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
    [supabase]
  );

  // ── Get disputes for a tournament ──────────────────
  const getDisputes = useCallback(
    async (tournamentId: number): Promise<MatchDispute[]> => {
      try {
        setLoading(true);
        setError(null);

        // Get all match IDs for this tournament
        const matchIds = matches
          .filter((m) => m.tournament_id === tournamentId)
          .map((m) => m.id);

        if (matchIds.length === 0) return [];

        const { data, error: fetchError } = await supabase
          .from("match_disputes")
          .select("*")
          .in("match_id", matchIds)
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
    [supabase, matches]
  );

  // ── Delete all matches (reset bracket) ─────────────
  const resetBracket = useCallback(
    async (tournamentId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { error: deleteError } = await supabase
          .from("tournament_matches")
          .delete()
          .eq("tournament_id", tournamentId);

        if (deleteError) throw deleteError;

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
    [supabase]
  );

  return {
    matches,
    disputes,
    loading,
    error,
    getMatches,
    generateAndSaveBracket,
    reportMatch,
    startMatch,
    disputeMatch,
    resolveDispute,
    getDisputes,
    resetBracket,
  };
}
