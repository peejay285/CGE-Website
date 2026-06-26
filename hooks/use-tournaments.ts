"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Profile,
  Tournament,
  TournamentRegistration,
  TournamentRegistrant,
  TournamentTeamRegistration,
} from "@/lib/types";
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

type OrganizerProfile = Pick<
  Profile,
  "id" | "full_name" | "avatar_url" | "gamertag" | "is_id_verified" | "trust_level" | "tournament_count"
>;

const TOURNAMENT_SELECT_WITH_COUNTS =
  "*, tournament_registrations(count), tournament_team_registrations(count)";

export function useTournaments(initialStatus?: string) {
  const [tournaments, setTournaments] = useState<TournamentWithCount[]>([]);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [teamRegistrations, setTeamRegistrations] = useState<TournamentTeamRegistration[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabase = createClient();

  const hydrateTournamentRows = useCallback(
    async (rows: Record<string, unknown>[]): Promise<TournamentWithCount[]> => {
      const organizerIds = Array.from(
        new Set(
          rows
            .map((item) => item.created_by)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        )
      );
      const organizerMap = new Map<string, OrganizerProfile>();

      if (organizerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, gamertag, is_id_verified, trust_level, tournament_count")
          .in("id", organizerIds);

        for (const profile of (profiles ?? []) as OrganizerProfile[]) {
          organizerMap.set(profile.id, profile);
        }
      }

      return rows.map((item) => {
        const regData = item.tournament_registrations as
          | Array<{ count: number }>
          | undefined;
        const teamRegData = item.tournament_team_registrations as
          | Array<{ count: number }>
          | undefined;
        const soloRegistrationCount = regData?.[0]?.count ?? 0;
        const teamRegistrationCount = teamRegData?.[0]?.count ?? 0;
        const teamSize =
          typeof item.team_size === "number"
            ? item.team_size
            : Number(item.team_size ?? 1);
        const registrationCount =
          teamSize > 1 ? teamRegistrationCount : soloRegistrationCount;
        const rest = { ...item };
        delete rest.tournament_registrations;
        delete rest.tournament_team_registrations;
        const organizerId = typeof rest.created_by === "string" ? rest.created_by : null;

        return {
          ...rest,
          organizer: organizerId ? organizerMap.get(organizerId) ?? null : null,
          registration_count: registrationCount,
        } as TournamentWithCount;
      });
    },
    [supabase]
  );

  const getTournaments = useCallback(
    async (status?: string) => {
      try {
        setLoading(true);
        setError(null);

        const filterStatus = status ?? initialStatus;

        let query = supabase
          .from("tournaments")
          .select(TOURNAMENT_SELECT_WITH_COUNTS)
          .order("date", { ascending: true });

        if (filterStatus) {
          query = query.eq("status", filterStatus);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const mapped = await hydrateTournamentRows((data ?? []) as Record<string, unknown>[]);

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
    [supabase, initialStatus, hydrateTournamentRows]
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

  const getUserTeamRegistrations = useCallback(async () => {
    try {
      setActionLoading(true);
      setActionError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error: fetchError } = await supabase
        .from("tournament_team_registrations")
        .select("*")
        .eq("registered_by", user.id)
        .order("registered_at", { ascending: false });

      if (fetchError) throw fetchError;

      const regs = data as TournamentTeamRegistration[];
      setTeamRegistrations(regs);
      return regs;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch team registrations";
      setActionError(message);
      return [];
    } finally {
      setActionLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    getUserRegistrations();
    getUserTeamRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTournamentById = useCallback(
    async (id: number): Promise<TournamentWithCount | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data, error: fetchError } = await supabase
          .from("tournaments")
          .select(TOURNAMENT_SELECT_WITH_COUNTS)
          .eq("id", id)
          .single();

        if (fetchError) throw fetchError;

        const [mapped] = await hydrateTournamentRows([data as Record<string, unknown>]);
        return mapped ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch tournament";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase, hydrateTournamentRows]
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
        const alreadyRegistered = registrations.some(
          (r) => r.tournament_id === tournament_id
        );

        const { data, error: insertError } = await supabase
          .rpc("create_tournament_registration_with_payment", {
            p_tournament_id: tournament_id,
            p_user_id: user.id,
          })
          .single();

        if (insertError) throw insertError;

        const registration = data as TournamentRegistration;
        setRegistrations((prev) => {
          const exists = prev.some((r) => r.id === registration.id);
          if (exists) {
            return prev.map((r) => (r.id === registration.id ? registration : r));
          }
          return [registration, ...prev];
        });

        // Update the local tournament registration count
        if (!alreadyRegistered) {
          setTournaments((prev) =>
            prev.map((t) =>
              t.id === tournament_id
                ? { ...t, registration_count: t.registration_count + 1 }
                : t
            )
          );
        }

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
    [supabase, registrations]
  );

  const registerTeamForTournament = useCallback(
    async (
      tournament_id: number,
      team_id: number
    ): Promise<TournamentTeamRegistration | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const alreadyRegistered = teamRegistrations.some(
          (r) => r.tournament_id === tournament_id && r.team_id === team_id
        );

        const { data, error: insertError } = await supabase
          .rpc("create_tournament_team_registration_with_payment", {
            p_tournament_id: tournament_id,
            p_team_id: team_id,
            p_registered_by: user.id,
          })
          .single();

        if (insertError) throw insertError;

        const registration = data as TournamentTeamRegistration;
        setTeamRegistrations((prev) => {
          const exists = prev.some((r) => r.id === registration.id);
          if (exists) {
            return prev.map((r) => (r.id === registration.id ? registration : r));
          }
          return [registration, ...prev];
        });

        if (!alreadyRegistered) {
          setTournaments((prev) =>
            prev.map((t) =>
              t.id === tournament_id
                ? { ...t, registration_count: t.registration_count + 1 }
                : t
            )
          );
        }

        return registration;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to register team for tournament";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase, teamRegistrations]
  );

  const initializeTournamentRegistrationPayment = useCallback(
    async (
      registrationId: string,
      tournamentId: number
    ): Promise<string | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const response = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "tournament",
            metadata: {
              registration_id: registrationId,
              tournament_id: tournamentId,
            },
          }),
        });

        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error ?? "Failed to initialize tournament payment");
        }

        return typeof body.authorization_url === "string"
          ? body.authorization_url
          : null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize tournament payment";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    []
  );

  const initializeTournamentTeamRegistrationPayment = useCallback(
    async (
      registrationId: string,
      tournamentId: number
    ): Promise<string | null> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const response = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "tournament_team",
            metadata: {
              registration_id: registrationId,
              team_registration_id: registrationId,
              tournament_id: tournamentId,
            },
          }),
        });

        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error ?? "Failed to initialize team tournament payment");
        }

        return typeof body.authorization_url === "string"
          ? body.authorization_url
          : null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to initialize team tournament payment";
        setActionError(message);
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    []
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

  const unregisterTeamFromTournament = useCallback(
    async (tournament_id: number, team_id: number): Promise<boolean> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error: deleteError } = await supabase
          .from("tournament_team_registrations")
          .delete()
          .eq("tournament_id", tournament_id)
          .eq("team_id", team_id)
          .eq("registered_by", user.id);

        if (deleteError) throw deleteError;

        setTeamRegistrations((prev) =>
          prev.filter(
            (r) => !(r.tournament_id === tournament_id && r.team_id === team_id)
          )
        );
        setTournaments((prev) =>
          prev.map((t) =>
            t.id === tournament_id
              ? { ...t, registration_count: Math.max(0, t.registration_count - 1) }
              : t
          )
        );

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to withdraw team";
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

  const isTeamRegisteredForTournament = useCallback(
    (tournament_id: number, team_id?: number): boolean => {
      return teamRegistrations.some(
        (r) =>
          r.tournament_id === tournament_id &&
          (team_id == null || r.team_id === team_id)
      );
    },
    [teamRegistrations]
  );

  const getRegistrationForTournament = useCallback(
    (tournament_id: number): TournamentRegistration | null => {
      return registrations.find((r) => r.tournament_id === tournament_id) ?? null;
    },
    [registrations]
  );

  const getTeamRegistrationForTournament = useCallback(
    (
      tournament_id: number,
      team_id?: number
    ): TournamentTeamRegistration | null => {
      return (
        teamRegistrations.find(
          (r) =>
            r.tournament_id === tournament_id &&
            (team_id == null || r.team_id === team_id)
        ) ?? null
      );
    },
    [teamRegistrations]
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
          .select(TOURNAMENT_SELECT_WITH_COUNTS)
          .single();

        if (insertError) throw insertError;

        const [tournament] = await hydrateTournamentRows([data as Record<string, unknown>]);
        if (!tournament) throw new Error("Tournament was created but could not be loaded");
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
    [supabase, hydrateTournamentRows]
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
          .select(TOURNAMENT_SELECT_WITH_COUNTS)
          .single();

        if (updateError) throw updateError;

        const [tournament] = await hydrateTournamentRows([data as Record<string, unknown>]);
        if (!tournament) throw new Error("Tournament was updated but could not be loaded");
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
    [supabase, hydrateTournamentRows]
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
          .select(TOURNAMENT_SELECT_WITH_COUNTS)
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        return hydrateTournamentRows((data ?? []) as Record<string, unknown>[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch hosted tournaments";
        setActionError(message);
        return [];
      } finally {
        setActionLoading(false);
      }
    },
    [supabase, hydrateTournamentRows]
  );

  const getTournamentRegistrants = useCallback(
    async (tournamentId: number): Promise<TournamentRegistrant[]> => {
      try {
        setActionLoading(true);
        setActionError(null);

        const { data: tournament } = await supabase
          .from("tournaments")
          .select("id, team_size")
          .eq("id", tournamentId)
          .maybeSingle();

        const isTeamEvent = Number(tournament?.team_size ?? 1) > 1;

        if (isTeamEvent) {
          const { data, error: fetchError } = await supabase
            .from("tournament_team_registrations")
            .select("*")
            .eq("tournament_id", tournamentId)
            .order("registered_at", { ascending: true });

          if (fetchError) throw fetchError;

          const teamRegs = (data ?? []) as TournamentTeamRegistration[];
          const teamIds = Array.from(new Set(teamRegs.map((r) => r.team_id)));

          if (teamIds.length === 0) return [];

          const { data: teams } = await supabase
            .from("teams")
            .select("id, name, tag, logo_url, captain_id")
            .in("id", teamIds);

          const teamMap = new Map<
            number,
            {
              id: number;
              name: string;
              tag: string | null;
              logo_url: string | null;
              captain_id: string;
            }
          >();
          for (const team of (teams ?? []) as Array<{
            id: number;
            name: string;
            tag: string | null;
            logo_url: string | null;
            captain_id: string;
          }>) {
            teamMap.set(team.id, team);
          }

          const captainIds = Array.from(
            new Set(
              Array.from(teamMap.values())
                .map((team) => team.captain_id)
                .filter(Boolean)
            )
          );
          const { data: captainProfiles } = captainIds.length
            ? await supabase
                .from("profiles")
                .select(
                  "id, full_name, avatar_url, gamertag, payout_account_name, payout_bank_name, payout_account_last4, payout_profile_verified_at"
                )
                .in("id", captainIds)
            : { data: [] };
          type CaptainPayoutProfile = Pick<
            Profile,
            | "id"
            | "full_name"
            | "avatar_url"
            | "gamertag"
            | "payout_account_name"
            | "payout_bank_name"
            | "payout_account_last4"
            | "payout_profile_verified_at"
          >;
          const captainMap = new Map<string, CaptainPayoutProfile>();
          for (const profile of (captainProfiles ?? []) as CaptainPayoutProfile[]) {
            captainMap.set(profile.id, profile);
          }

          return teamRegs.map((registration, index) => {
            const team = teamMap.get(registration.team_id);
            const teamName = team?.name ?? `Team ${index + 1}`;
            const displayName = team?.tag ? `[${team.tag}] ${teamName}` : teamName;
            const captain = team?.captain_id
              ? captainMap.get(team.captain_id)
              : undefined;
            const recipientId = team?.captain_id ?? registration.registered_by;

            return {
              id: registration.id,
              tournament_id: registration.tournament_id,
              user_id: recipientId,
              bracket_participant_id: String(registration.team_id),
              total: registration.total,
              payment_method: registration.payment_method,
              payment_status: registration.payment_status,
              paystack_reference: registration.paystack_reference,
              paid_at: registration.paid_at,
              registered_at: registration.registered_at,
              checked_in: registration.checked_in,
              checked_in_at: registration.checked_in_at,
              profile: {
                ...captain,
                id: recipientId,
                full_name: displayName,
                avatar_url: team?.logo_url ?? null,
                gamertag: team?.tag ?? teamName,
              },
            };
          });
        }

        const { data, error: fetchError } = await supabase
          .from("tournament_registrations")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("registered_at", { ascending: true });

        if (fetchError) throw fetchError;

        const registrants = (data ?? []) as TournamentRegistrant[];
        const userIds = Array.from(new Set(registrants.map((r) => r.user_id)));

        if (userIds.length === 0) return registrants;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, gamertag")
          .in("id", userIds);

        const profileMap = new Map<
          string,
          Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">
        >();
        for (const profile of (profiles ?? []) as Array<
          Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">
        >) {
          profileMap.set(profile.id, profile);
        }

        return registrants.map((registrant) => ({
          ...registrant,
          profile: profileMap.get(registrant.user_id),
        }));
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
    teamRegistrations,
    leaderboard,
    loading,
    error,
    actionLoading,
    actionError,
    getTournaments,
    getTournamentById,
    registerForTournament,
    registerTeamForTournament,
    initializeTournamentRegistrationPayment,
    initializeTournamentTeamRegistrationPayment,
    unregisterFromTournament,
    unregisterTeamFromTournament,
    isRegisteredForTournament,
    isTeamRegisteredForTournament,
    getRegistrationForTournament,
    getTeamRegistrationForTournament,
    getUserRegistrations,
    getUserTeamRegistrations,
    getLeaderboard,
    getUniqueGames,
    createTournament,
    updateTournament,
    deleteTournament,
    getMyHostedTournaments,
    getTournamentRegistrants,
  };
}
