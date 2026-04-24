"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tournament, TournamentRegistration, TournamentRegistrant } from "@/lib/types";
import type { TournamentWithCount } from "@/lib/esports-utils";

interface CreateTournamentData {
  title: string;
  game: string;
  date: string;
  time: string;
  entry_fee: number;
  prize: string;
  slots: number;
  format: string;
  platform: string;
  rules?: string;
}

interface UpdateTournamentData {
  title?: string;
  game?: string;
  date?: string;
  time?: string;
  entry_fee?: number;
  prize?: string;
  slots?: number;
  format?: string;
  platform?: string;
  rules?: string;
  status?: Tournament["status"];
}

interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_url: string | null;
  gamertag: string | null;
  points: number;
  wins: number;
  losses: number;
}

export function useTournaments(initialStatus?: string) {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabase = createClient();

  const getTournaments = useCallback(
    async (status?: string) => {
      try {
        setLoading(true);
        setError(null);

        const filterStatus = status ?? initialStatus;

        let query = supabase
          .from("tournaments")
          .select("*, tournament_registrations(count)")
          .order("date", { ascending: true });

        if (filterStatus) {
          query = query.eq("status", filterStatus);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const mapped = (data ?? []).map((item: Record<string, unknown>) => {
          const regData = item.tournament_registrations as
            | Array<{ count: number }>
            | undefined;
          const registrationCount = regData?.[0]?.count ?? 0;
          const { tournament_registrations: _, ...rest } = item;
          return {
            ...rest,
            registration_count: registrationCount,
          } as TournamentWithCount;
        });

        setTournaments(mapped);
        return mapped;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch tournaments";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase, initialStatus]
  );

  useEffect(() => {
    getTournaments();
  }, [getTournaments]);

  const getUserRegistrations = useCallback(async () => {
    try {
      setActionLoading(true);
      setActionError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error: fetchError } = await supabase
        .from("tournament_registrations")
        .select("*")
        .eq("user_id", user.id)
        .order("registered_at", { ascending: false });

      if (fetchError) throw fetchError;

      const regs = data as TournamentRegistration[];
      setRegistrations(regs);
      return regs;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch registrations";
      setActionError(message);
      return [];
    } finally {
      setActionLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    getUserRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTournamentById = useCallback(
    async (id: number): Promise<TournamentWithCount | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data, error: fetchError } = await supabase
          .from("tournaments")
          .select("*, tournament_registrations(count)")
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        const regData = data.tournament_registrations as
          | Array<{ count: number }>
          | undefined;
        const registrationCount = regData?.[0]?.count ?? 0;
        const { tournament_registrations: _, ...rest } = data;

        return {
          ...rest,
          registration_count: registrationCount,
        } as TournamentWithCount;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch tournament";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const registerForTournament = useCallback(
    async (tournament_id: number): Promise<TournamentRegistration | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: insertError } = await supabase
          .from("tournament_registrations")
          .insert({
            tournament_id,
            user_id: user.id,
            payment_status: "pending",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        const registration = data as TournamentRegistration;
        setRegistrations((prev) => [registration, ...prev]);

        // Update the local tournament registration count
        setTournaments((prev) =>
          prev.map((t) =>
            t.id === tournament_id
              ? { ...t, registration_count: t.registration_count + 1 }
              : t
          )
        );

        return registration;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to register for tournament";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const unregisterFromTournament = useCallback(
    async (tournament_id: number): Promise<boolean> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: deleteError } = await supabase
          .from("tournament_registrations")
          .delete()
          .eq("tournament_id", tournament_id)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        setRegistrations((prev) => prev.filter((r) => r.tournament_id !== tournament_id));
        setTournaments((prev) =>
          prev.map((t) =>
            t.id === tournament_id
              ? { ...t, registration_count: Math.max(0, t.registration_count - 1) }
              : t
          )
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to withdraw";
        setActionError(message);
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const isRegisteredForTournament = useCallback(
    (tournament_id: number): boolean => {
      return registrations.some((r) => r.tournament_id === tournament_id);
    },
    [registrations]
  );

  const getLeaderboard = useCallback(
    async (limit: number = 20) => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, gamertag, points, wins, losses")
          .order("points", { ascending: false })
          .order("wins", { ascending: false })
          .limit(limit);

        if (fetchError) throw fetchError;

        const entries = data as LeaderboardEntry[];
        setLeaderboard(entries);
        return entries;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch leaderboard";
        setActionError(message);
        return [];
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const createTournament = useCallback(
    async (tournamentData: CreateTournamentData): Promise<TournamentWithCount | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // Server-side validation
        const tournamentDate = new Date(`${tournamentData.date}T${tournamentData.time || "00:00"}`);
        if (isNaN(tournamentDate.getTime()) || tournamentDate <= new Date()) {
          throw new Error("Tournament date must be in the future");
        }
        if (tournamentData.entry_fee < 0) {
          throw new Error("Entry fee cannot be negative");
        }
        if (tournamentData.slots < 2) {
          throw new Error("Tournament must have at least 2 slots");
        }

        const { data, error: insertError } = await supabase
          .from("tournaments")
          .insert({
            ...tournamentData,
            created_by: user.id,
            filled: 0,
            status: "open",
            rules: tournamentData.rules || null,
          })
          .select("*, tournament_registrations(count)")
          .single();

        if (insertError) throw insertError;

        const regData = data.tournament_registrations as
          | Array<{ count: number }>
          | undefined;
        const registrationCount = regData?.[0]?.count ?? 0;
        const { tournament_registrations: _, ...rest } = data;

        const tournament = { ...rest, registration_count: registrationCount } as TournamentWithCount;
        setTournaments((prev) => [tournament, ...prev]);
        return tournament;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create tournament";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const updateTournament = useCallback(
    async (id: number, updates: UpdateTournamentData): Promise<TournamentWithCount | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: updateError } = await supabase
          .from("tournaments")
          .update(updates)
          .eq("id", id)
          .eq("created_by", user.id)
          .select("*, tournament_registrations(count)")
          .single();

        if (updateError) throw updateError;

        const regData = data.tournament_registrations as
          | Array<{ count: number }>
          | undefined;
        const registrationCount = regData?.[0]?.count ?? 0;
        const { tournament_registrations: _, ...rest } = data;

        const tournament = { ...rest, registration_count: registrationCount } as TournamentWithCount;
        setTournaments((prev) => prev.map((t) => (t.id === id ? tournament : t)));
        return tournament;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update tournament";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const deleteTournament = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: deleteError } = await supabase
          .from("tournaments")
          .delete()
          .eq("id", id)
          .eq("created_by", user.id);

        if (deleteError) throw deleteError;

        setTournaments((prev) => prev.filter((t) => t.id !== id));
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete tournament";
        setActionError(message);
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const getMyHostedTournaments = useCallback(
    async (): Promise<TournamentWithCount[]> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error: fetchError } = await supabase
          .from("tournaments")
          .select("*, tournament_registrations(count)")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        return (data ?? []).map((item: Record<string, unknown>) => {
          const regData = item.tournament_registrations as
            | Array<{ count: number }>
            | undefined;
          const registrationCount = regData?.[0]?.count ?? 0;
          const { tournament_registrations: _, ...rest } = item;
          return { ...rest, registration_count: registrationCount } as TournamentWithCount;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch hosted tournaments";
        setActionError(message);
        return [];
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const getTournamentRegistrants = useCallback(
    async (tournamentId: number): Promise<TournamentRegistrant[]> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data, error: fetchError } = await supabase
          .from("tournament_registrations")
          .select("*, profile:profiles!user_id(id, full_name, avatar_url, gamertag)")
          .eq("tournament_id", tournamentId)
          .order("registered_at", { ascending: true });

        if (fetchError) throw fetchError;

        return (data ?? []).map((item: Record<string, unknown>) => ({
          ...item,
          profile: item.profile ?? undefined,
        })) as TournamentRegistrant[];
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch registrants";
        setActionError(message);
        return [];
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  const getUniqueGames = useCallback((): string[] => {
    const games = new Set(tournaments.map((t) => t.game));
    return Array.from(games).sort();
  }, [tournaments]);

  return {
    tournaments,
    registrations,
    leaderboard,
    loading,
    error,
    actionLoading,
    actionError,
    getTournaments,
    getTournamentById,
    registerForTournament,
    unregisterFromTournament,
    isRegisteredForTournament,
    getUserRegistrations,
    getLeaderboard,
    getUniqueGames,
    createTournament,
    updateTournament,
    deleteTournament,
    getMyHostedTournaments,
    getTournamentRegistrants,
  };
}
