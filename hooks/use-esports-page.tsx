"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useTournaments } from "@/hooks/use-tournaments";
import { useTeams } from "@/hooks/use-teams";
import { useAchievements } from "@/hooks/use-achievements";
import { usePlayerFollows } from "@/hooks/use-player-follows";
import { useAuth } from "@/hooks/use-auth";
import { isTournamentPast } from "@/lib/esports-utils";
import type { TournamentWithCount } from "@/lib/esports-utils";
import { triggerAppGate } from "@/components/ui/app-gate";
import type { Team } from "@/lib/types";

export const TABS = ["Tournaments", "My Tournaments", "Teams", "Leaderboard", "Achievements"];

export const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Live", value: "in_progress" },
  { label: "Completed", value: "completed" },
] as const;

export function useEsportsPage() {
  // --------------- State ---------------
  const [activeTab, setActiveTab] = useState("Tournaments");
  const [selectedTournament, setSelectedTournament] = useState<TournamentWithCount | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [manageTournament, setManageTournament] = useState<TournamentWithCount | null>(null);
  const [hostedTournaments, setHostedTournaments] = useState<TournamentWithCount[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  // --------------- Refs ---------------
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --------------- Debounce search input (300ms) ---------------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // --------------- External hooks ---------------
  const { user } = useAuth();

  const {
    tournaments,
    registrations,
    leaderboard,
    loading,
    actionLoading,
    registerForTournament,
    unregisterFromTournament,
    isRegisteredForTournament,
    getLeaderboard,
    getTournamentById,
    getUniqueGames,
    createTournament,
    updateTournament,
    deleteTournament,
    getMyHostedTournaments,
    getTournamentRegistrants,
  } = useTournaments();

  const {
    teams,
    myTeam,
    members: teamMembers,
    loading: teamsLoading,
    getTeams,
    getMyTeam,
    getTeamMembers,
    createTeam,
    joinTeam,
    leaveTeam,
    removeMember,
    updateMemberRole,
    deleteTeam,
  } = useTeams();

  const {
    achievements,
    playerAchievements,
    loading: achievementsLoading,
    getAllAchievements,
    getPlayerAchievements,
  } = useAchievements();

  const {
    following,
    getFollowing,
    followPlayer,
    unfollowPlayer,
  } = usePlayerFollows();

  // --------------- Memos ---------------
  const followingSet = useMemo(() => new Set(following), [following]);

  const uniqueGames = useMemo(() => getUniqueGames(), [getUniqueGames]);

  const stats = useMemo(() => {
    const openCount = tournaments.filter((t) => t.status === "open").length;
    const totalPrize = tournaments.reduce((sum, t) => {
      const match = t.prize.match(/[\d,]+/);
      return sum + (match ? parseInt(match[0].replace(/,/g, ""), 10) : 0);
    }, 0);
    const totalPlayers = new Set(registrations.map((r) => r.user_id)).size;
    return { openCount, totalPrize, totalPlayers };
  }, [tournaments, registrations]);

  const filteredTournaments = useMemo(() => {
    let result = tournaments;

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (gameFilter !== "All") {
      result = result.filter((t) => t.game === gameFilter);
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.game.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tournaments, statusFilter, gameFilter, debouncedSearch]);

  const { upcomingTournaments, pastTournaments } = useMemo(() => {
    const upcoming: typeof filteredTournaments = [];
    const past: typeof filteredTournaments = [];

    filteredTournaments.forEach((t) => {
      if (isTournamentPast(t.date, t.status)) {
        past.push(t);
      } else {
        upcoming.push(t);
      }
    });

    return { upcomingTournaments: upcoming, pastTournaments: past };
  }, [filteredTournaments]);

  // Tournaments starting within the next 7 days, sorted soonest first.
  // Surfaces "what's happening this week" so newcomers don't see an empty page.
  const thisWeekTournaments = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return upcomingTournaments
      .filter((t) => {
        const start = new Date(t.date).getTime();
        if (Number.isNaN(start)) return false;
        return start >= now && start - now <= oneWeekMs;
      })
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
  }, [upcomingTournaments]);

  const myTournaments = useMemo(() => {
    const myIds = new Set(registrations.map((r) => r.tournament_id));
    return tournaments.filter((t) => myIds.has(t.id));
  }, [tournaments, registrations]);

  // --------------- Effects ---------------

  // Load leaderboard + follow data when switching to that tab
  useEffect(() => {
    if (activeTab === "Leaderboard") {
      getLeaderboard(20);
      if (user) getFollowing();
    }
  }, [activeTab, getLeaderboard, user, getFollowing]);

  // Load hosted tournaments when switching to My Tournaments tab
  useEffect(() => {
    if (activeTab === "My Tournaments" && user) {
      getMyHostedTournaments().then(setHostedTournaments);
    }
  }, [activeTab, user, getMyHostedTournaments]);

  // Load teams when switching to Teams tab
  useEffect(() => {
    if (activeTab === "Teams") {
      getTeams();
      if (user) getMyTeam();
    }
  }, [activeTab, user, getTeams, getMyTeam]);

  // Load achievements when switching to Achievements tab
  useEffect(() => {
    if (activeTab === "Achievements") {
      getAllAchievements();
      if (user) getPlayerAchievements();
    }
  }, [activeTab, user, getAllAchievements, getPlayerAchievements]);

  // --------------- Callbacks ---------------

  const handleRegister = useCallback(
    async (_tournamentId: number) => {
      triggerAppGate("esports-register");
    },
    []
  );

  const handleUnregister = useCallback(
    async (tournamentId: number) => {
      const success = await unregisterFromTournament(tournamentId);
      if (success) {
        toast.success("Withdrawn from tournament");
        const updated = await getTournamentById(tournamentId);
        if (updated) setSelectedTournament(updated);
      } else {
        toast.error("Failed to withdraw");
      }
    },
    [unregisterFromTournament, getTournamentById]
  );

  const handleCreateTournament = useCallback(
    async (data: {
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
      bracket_type?: string;
      team_size?: number;
      check_in_required?: boolean;
      check_in_opens_minutes?: number;
      stream_url?: string;
      description?: string;
    }) => {
      if (!user) {
        window.dispatchEvent(new CustomEvent("open-auth-modal"));
        toast("Sign in to host a tournament", { icon: "\uD83D\uDD12" });
        return;
      }
      const tournament = await createTournament(data);
      if (tournament) {
        toast.success("Tournament created!");
        setCreateOpen(false);
        getMyHostedTournaments().then(setHostedTournaments);
      } else {
        toast.error("Failed to create tournament. Please try again.");
      }
    },
    [user, createTournament, getMyHostedTournaments]
  );

  const handleUpdateTournament = useCallback(
    async (id: number, updates: Record<string, unknown>) => {
      const updated = await updateTournament(id, updates as Parameters<typeof updateTournament>[1]);
      if (updated) {
        toast.success("Tournament updated!");
        setManageTournament(updated);
        getMyHostedTournaments().then(setHostedTournaments);
        return updated;
      } else {
        toast.error("Failed to update tournament.");
        return null;
      }
    },
    [updateTournament, getMyHostedTournaments]
  );

  const handleDeleteTournament = useCallback(
    async (id: number) => {
      const success = await deleteTournament(id);
      if (success) {
        toast.success("Tournament deleted.");
        setManageTournament(null);
        getMyHostedTournaments().then(setHostedTournaments);
      } else {
        toast.error("Failed to delete tournament.");
      }
      return success;
    },
    [deleteTournament, getMyHostedTournaments]
  );

  const isHostOfTournament = useCallback(
    (tournament: TournamentWithCount): boolean => {
      return Boolean(user && tournament.created_by === user.id);
    },
    [user]
  );

  // --------------- Derived values ---------------

  const leaderboardPlayers = leaderboard.map((entry, index) => ({
    rank: index + 1,
    name: entry.gamertag || entry.full_name,
    points: entry.points,
    wins: entry.wins,
    losses: entry.losses,
    userId: entry.id,
    avatarUrl: entry.avatar_url,
  }));

  const selectedIsPast = selectedTournament
    ? isTournamentPast(selectedTournament.date, selectedTournament.status)
    : false;
  const selectedIsRegistered = selectedTournament
    ? isRegisteredForTournament(selectedTournament.id)
    : false;
  const selectedIsHost = selectedTournament
    ? isHostOfTournament(selectedTournament)
    : false;

  // --------------- Inline handlers for modals ---------------

  const handleManageFromDetail = useCallback(() => {
    if (selectedTournament) {
      setManageTournament(selectedTournament);
      setSelectedTournament(null);
    }
  }, [selectedTournament]);

  const handleCreateTeam = useCallback(
    async (data: Parameters<typeof createTeam>[0]) => {
      const team = await createTeam(data);
      if (team) {
        toast.success("Team created!");
        setCreateTeamOpen(false);
        getTeams();
      } else {
        toast.error("Failed to create team");
      }
    },
    [createTeam, getTeams]
  );

  const handleJoinTeam = useCallback(
    async (teamId: number) => {
      const success = await joinTeam(teamId);
      if (success) {
        toast.success("Joined team!");
        getTeams();
      } else {
        toast.error("Failed to join team");
      }
      return success;
    },
    [joinTeam, getTeams]
  );

  const handleLeaveTeam = useCallback(
    async (teamId: number) => {
      const success = await leaveTeam(teamId);
      if (success) {
        toast.success("Left team");
        setSelectedTeam(null);
        getTeams();
      } else {
        toast.error("Failed to leave team");
      }
      return success;
    },
    [leaveTeam, getTeams]
  );

  const handleRemoveMember = useCallback(
    async (teamId: number, userId: string) => {
      const success = await removeMember(teamId, userId);
      if (success) toast.success("Member removed");
      return success;
    },
    [removeMember]
  );

  const handleDeleteTeam = useCallback(
    async (teamId: number) => {
      const success = await deleteTeam(teamId);
      if (success) {
        toast.success("Team disbanded");
        setSelectedTeam(null);
        getTeams();
      }
      return success;
    },
    [deleteTeam, getTeams]
  );

  const handleFollow = useCallback(
    async (userId: string) => {
      const success = await followPlayer(userId);
      if (success) toast.success("Following!");
    },
    [followPlayer]
  );

  const handleUnfollow = useCallback(
    async (userId: string) => {
      const success = await unfollowPlayer(userId);
      if (success) toast.success("Unfollowed");
    },
    [unfollowPlayer]
  );

  // --------------- Return ---------------

  return {
    // State
    activeTab,
    setActiveTab,
    selectedTournament,
    setSelectedTournament,
    searchQuery,
    setSearchQuery,
    gameFilter,
    setGameFilter,
    statusFilter,
    setStatusFilter,
    createOpen,
    setCreateOpen,
    manageTournament,
    setManageTournament,
    hostedTournaments,
    selectedTeam,
    setSelectedTeam,
    createTeamOpen,
    setCreateTeamOpen,

    // Auth
    user,

    // Tournament data
    tournaments,
    loading,
    actionLoading,
    isRegisteredForTournament,
    getTournamentRegistrants,

    // Computed tournament data
    uniqueGames,
    stats,
    filteredTournaments,
    upcomingTournaments,
    thisWeekTournaments,
    pastTournaments,
    myTournaments,
    leaderboardPlayers,
    selectedIsPast,
    selectedIsRegistered,
    selectedIsHost,

    // Tournament handlers
    handleRegister,
    handleUnregister,
    handleCreateTournament,
    handleUpdateTournament,
    handleDeleteTournament,
    isHostOfTournament,
    handleManageFromDetail,

    // Teams data
    teams,
    myTeam,
    teamMembers,
    teamsLoading,
    getTeamMembers,
    updateMemberRole,

    // Team handlers
    handleCreateTeam,
    handleJoinTeam,
    handleLeaveTeam,
    handleRemoveMember,
    handleDeleteTeam,

    // Achievements data
    achievements,
    playerAchievements,
    achievementsLoading,

    // Leaderboard / follows
    followingSet,
    handleFollow,
    handleUnfollow,

    // Utility re-exports needed by JSX
    isTournamentPast,
    triggerAppGate,
  };
}
