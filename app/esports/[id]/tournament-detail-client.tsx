"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft, Calendar, Clock, Gamepad2, Users, Trophy, Swords, Medal,
  Loader2, Settings, Video, CheckCircle, GitBranch, ShieldCheck, UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CardSkeleton } from "@/components/ui/skeleton";
import { formatPrice, cn } from "@/lib/utils";
import { ManageTournamentModal } from "@/components/esports/manage-tournament-modal";
import { BracketView } from "@/components/esports/bracket-view";
import { MatchReportModal } from "@/components/esports/match-report-modal";
import { UnverifiedOrganizerDialog } from "@/components/esports/unverified-organizer-dialog";
import { CommunityThread } from "@/components/community/community-thread";
import { CheckInPanel } from "@/components/esports/check-in-panel";
import { StreamEmbed } from "@/components/esports/stream-embed";
import { useTournaments } from "@/hooks/use-tournaments";
import { useTeams } from "@/hooks/use-teams";
import { useTournamentMatches } from "@/hooks/use-tournament-matches";
import { useAuth } from "@/hooks/use-auth";
import {
  STATUS_CONFIG,
  getCountdown,
  getFilledCount,
  isTournamentPast,
  DEFAULT_TOURNAMENT_RULES,
  formatTournamentDate,
  formatTournamentTime,
  getPayoutDistribution,
} from "@/lib/esports-utils";
import type { TournamentWithCount } from "@/lib/esports-utils";
import type { Tournament, TournamentMatch, TournamentRegistrant, TournamentTeamRegistration } from "@/lib/types";

type DetailTab = "overview" | "bracket" | "stream" | "discussion";

export default function TournamentDetailClient({
  initialData,
}: {
  initialData?: Tournament | null;
}) {
  const params = useParams();
  const { user } = useAuth();
  const {
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
    updateTournament,
    deleteTournament,
    getTournamentRegistrants,
    actionLoading,
  } = useTournaments();
  const { myTeam, getMyTeam } = useTeams();

  const {
    matches,
    loading: matchesLoading,
    getMatches,
    reportMatch,
    confirmMatch,
    startMatch,
    disputeMatch,
  } = useTournamentMatches();

  // Seed from the server-fetched row so the page renders content on first
  // paint. `registration_count` mirrors `filled` (the same fallback
  // getFilledCount uses); the effect below refetches the fully-hydrated
  // row (live counts + organizer profile) after mount.
  const [tournament, setTournament] = useState<TournamentWithCount | null>(
    initialData ? { ...initialData, registration_count: initialData.filled } : null
  );
  const [registrants, setRegistrants] = useState<TournamentRegistrant[]>([]);
  const [loading, setLoading] = useState(!initialData);
  const [notFound, setNotFound] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [showUnverifiedGate, setShowUnverifiedGate] = useState(false);

  const tournamentId = Number(params.id);

  // Initial load
  useEffect(() => {
    if (isNaN(tournamentId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function load() {
      const result = await getTournamentById(tournamentId);
      if (result) {
        setTournament(result);
      } else if (!initialData) {
        // With server-provided data, a failed refetch (e.g. transient
        // network error) shouldn't blank out a tournament we know exists.
        setNotFound(true);
      }
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  // Load matches & registrants when tournament loads
  useEffect(() => {
    if (!tournament) return;
    getMatches(tournament.id);
    getTournamentRegistrants(tournament.id).then(setRegistrants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament?.id]);

  useEffect(() => {
    if (user) {
      getMyTeam();
    }
  }, [user, getMyTeam]);

  // Paystack redirect-back: don't just toast and hope — poll the
  // registration until the webhook marks it paid (backoff ~60s, then a
  // quiet steady check), exactly like the lounge confirmation flow.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const paymentRef = params.get("payment_ref");
    const paymentType = params.get("payment_type");

    if (!paymentRef || (paymentType !== "tournament" && paymentType !== "tournament_team")) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("payment_ref");
    url.searchParams.delete("payment_type");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);

    const table =
      paymentType === "tournament_team"
        ? "tournament_team_registrations"
        : "tournament_registrations";
    const supabase = createClient();
    const delays = [2000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 10000, 10000];
    let attempts = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    setEntryPoll({ status: "polling" });

    const refreshAll = () => {
      getUserRegistrations();
      getUserTeamRegistrations();
      const id = Number(params.get("tournament_id")) || tournament?.id;
      if (id) {
        getTournamentById(id).then((updated) => {
          if (updated) setTournament(updated);
        });
        getTournamentRegistrants(id).then(setRegistrants);
      }
    };

    const tick = async () => {
      const { data: row } = await supabase
        .from(table)
        .select("id, payment_status")
        .eq("paystack_reference", paymentRef)
        .maybeSingle();
      if (cancelled) return;
      if ((row as { payment_status?: string } | null)?.payment_status === "paid") {
        setEntryPoll({ status: "confirmed" });
        toast.success("Payment confirmed — you're in!");
        refreshAll();
        return;
      }
      if (attempts < delays.length) {
        timer = setTimeout(tick, delays[attempts]);
        attempts++;
        return;
      }
      setEntryPoll((prev) =>
        prev?.status === "timeout" ? prev : { status: "timeout" }
      );
      timer = setTimeout(tick, 15000);
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPast = tournament ? isTournamentPast(tournament.date, tournament.status) : false;
  const isTeamEvent = Number(tournament?.team_size ?? 1) > 1;
  const isRegistered = tournament
    ? isTeamEvent
      ? isTeamRegisteredForTournament(tournament.id, myTeam?.id)
      : isRegisteredForTournament(tournament.id)
    : false;
  const currentRegistration = tournament
    ? isTeamEvent
      ? getTeamRegistrationForTournament(tournament.id, myTeam?.id)
      : getRegistrationForTournament(tournament.id)
    : null;
  const currentTeamRegistration = isTeamEvent
    ? (currentRegistration as TournamentTeamRegistration | null)
    : null;
  const currentParticipantId = isTeamEvent
    ? currentTeamRegistration
      ? String(currentTeamRegistration.team_id)
      : undefined
    : user?.id;
  const requiredTeamSize = Math.max(2, Number(tournament?.team_size ?? 2));
  const currentTeamMemberCount = myTeam?.member_count ?? 0;
  const isTeamCaptain = Boolean(myTeam && user && myTeam.captain_id === user.id);
  const teamMissingCount = Math.max(0, requiredTeamSize - currentTeamMemberCount);
  const paymentPending =
    Boolean(isRegistered) &&
    (currentRegistration?.total ?? tournament?.entry_fee ?? 0) > 0 &&
    currentRegistration?.payment_status !== "paid";
  const filledCount = tournament ? getFilledCount(tournament) : 0;
  const isFull = tournament ? filledCount >= tournament.slots : false;
  const countdown = tournament ? getCountdown(tournament.date, tournament.time) : null;
  const isHost = Boolean(user && tournament?.created_by === user.id);
  const hasBracket = matches.length > 0;
  const hasStream = Boolean(tournament?.stream_url);
  const organizer = tournament?.organizer;
  const organizerVerified =
    Boolean(organizer?.is_id_verified) ||
    organizer?.trust_level === "verified" ||
    organizer?.trust_level === "trusted" ||
    organizer?.trust_level === "power";
  const organizerName = organizer?.gamertag || organizer?.full_name || "Organizer";
  const shouldWarnUnverified = Boolean(organizer) && !organizerVerified && !isHost;

  // Build tab list dynamically
  const tabs: { key: DetailTab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
  ];
  if (hasBracket || tournament?.status === "in_progress") {
    tabs.push({ key: "bracket", label: "Bracket", count: matches.length });
  }
  if (hasStream) {
    tabs.push({ key: "stream", label: "Stream" });
  }
  tabs.push({ key: "discussion", label: "Discussion" });

  const handleRegister = useCallback(async () => {
    if (!tournament) return;
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      toast("Sign in to register for tournaments");
      return;
    }

    if (isTeamEvent) {
      const team = myTeam ?? (await getMyTeam());
      if (!team) {
        toast.error("Create a team first, then register the team for this event.");
        return;
      }

      if (team.captain_id !== user.id) {
        toast.error("Only the team captain can register the team for tournaments.");
        return;
      }

      const registration = await registerTeamForTournament(tournament.id, team.id);
      if (registration) {
        if ((registration.total ?? 0) > 0 && registration.payment_status !== "paid") {
          toast.success("Team slot reserved. Redirecting to Paystack...");
          const authorizationUrl = await initializeTournamentTeamRegistrationPayment(
            registration.id,
            registration.tournament_id
          );

          if (authorizationUrl) {
            window.location.assign(authorizationUrl);
            return;
          }

          toast.error("Could not start payment. Please try again.");
          return;
        }

        toast.success("Team registered successfully!");
        const updated = await getTournamentById(tournament.id);
        if (updated) setTournament(updated);
        getTournamentRegistrants(tournament.id).then(setRegistrants);
      } else {
        toast.error("Failed to register team. You may already be registered.");
      }
      return;
    }

    const registration = await registerForTournament(tournament.id);
    if (registration) {
      if ((registration.total ?? 0) > 0 && registration.payment_status !== "paid") {
        toast.success("Registration reserved. Redirecting to Paystack...");
        const authorizationUrl = await initializeTournamentRegistrationPayment(
          registration.id,
          registration.tournament_id
        );

        if (authorizationUrl) {
          window.location.assign(authorizationUrl);
          return;
        }

        toast.error("Could not start payment. Please try again.");
        return;
      }

      toast.success("Successfully registered!");
      const updated = await getTournamentById(tournament.id);
      if (updated) setTournament(updated);
      getTournamentRegistrants(tournament.id).then(setRegistrants);
    } else {
      toast.error("Failed to register. You may already be registered.");
    }
  }, [
    tournament,
    user,
    isTeamEvent,
    myTeam,
    getMyTeam,
    registerTeamForTournament,
    initializeTournamentTeamRegistrationPayment,
    registerForTournament,
    initializeTournamentRegistrationPayment,
    getTournamentById,
    getTournamentRegistrants,
  ]);

  const attemptRegister = useCallback(() => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      toast("Sign in to register for tournaments");
      return;
    }
    if (shouldWarnUnverified) {
      setShowUnverifiedGate(true);
      return;
    }
    handleRegister();
  }, [user, shouldWarnUnverified, handleRegister]);

  const handleCompletePayment = useCallback(async () => {
    if (!currentRegistration) {
      toast.error("Registration not found. Try registering again.");
      return;
    }

    toast.success("Redirecting to Paystack...");
    const authorizationUrl = isTeamEvent
      ? await initializeTournamentTeamRegistrationPayment(
          currentRegistration.id,
          currentRegistration.tournament_id
        )
      : await initializeTournamentRegistrationPayment(
          currentRegistration.id,
          currentRegistration.tournament_id
        );

    if (authorizationUrl) {
      window.location.assign(authorizationUrl);
      return;
    }

    toast.error("Could not start payment. Please try again.");
  }, [
    currentRegistration,
    isTeamEvent,
    initializeTournamentTeamRegistrationPayment,
    initializeTournamentRegistrationPayment,
  ]);

  // Two-tap withdrawal confirm — first tap arms, second tap executes.
  const [withdrawArmed, setWithdrawArmed] = useState(false);

  // Paystack redirect-back confirmation (mirrors the lounge flow):
  // "polling" while we wait for the webhook, "timeout" once the fast
  // window passes (we keep checking quietly), "confirmed" on success.
  const [entryPoll, setEntryPoll] = useState<null | {
    status: "polling" | "timeout" | "confirmed";
  }>(null);

  const handleUnregister = useCallback(async () => {
    if (!tournament) return;
    // Paid entries are money records — self-service withdrawal is
    // blocked (RLS and the hook enforce it too). Give the real path.
    const paidEntry = isTeamEvent
      ? getTeamRegistrationForTournament(tournament.id, myTeam?.id)
          ?.payment_status === "paid"
      : getRegistrationForTournament(tournament.id)?.payment_status === "paid";
    if (paidEntry) {
      toast.error(
        "Paid entries can't be withdrawn here. Message the host or CGE support to arrange a refund."
      );
      return;
    }
    const success = isTeamEvent
      ? await (async () => {
          const team = myTeam ?? (await getMyTeam());
          const registration = getTeamRegistrationForTournament(tournament.id, team?.id);
          const teamId = registration?.team_id ?? team?.id;
          if (!teamId) {
            toast.error("Team registration not found.");
            return false;
          }
          return unregisterTeamFromTournament(tournament.id, teamId);
        })()
      : await unregisterFromTournament(tournament.id);
    if (success) {
      toast.success(isTeamEvent ? "Team withdrawn from tournament" : "Withdrawn from tournament");
      const updated = await getTournamentById(tournament.id);
      if (updated) setTournament(updated);
      getTournamentRegistrants(tournament.id).then(setRegistrants);
    } else {
      toast.error("Failed to withdraw");
    }
  }, [
    tournament,
    isTeamEvent,
    myTeam,
    getMyTeam,
    getTeamRegistrationForTournament,
    getRegistrationForTournament,
    unregisterTeamFromTournament,
    unregisterFromTournament,
    getTournamentById,
    getTournamentRegistrants,
  ]);

  const handleCheckIn = useCallback(async () => {
    if (!tournament || !user) return false;
    setCheckInLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const checkedInAt = new Date().toISOString();
      const { error } = isTeamEvent
        ? await supabase
            .from("tournament_team_registrations")
            .update({ checked_in: true, checked_in_at: checkedInAt })
            .eq("id", currentTeamRegistration?.id ?? "")
        : await supabase
            .from("tournament_registrations")
            .update({ checked_in: true, checked_in_at: checkedInAt })
            .eq("tournament_id", tournament.id)
            .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Checked in!");
      const regs = await getTournamentRegistrants(tournament.id);
      setRegistrants(regs);
      return true;
    } catch {
      toast.error("Failed to check in");
      return false;
    } finally {
      setCheckInLoading(false);
    }
  }, [tournament, user, currentTeamRegistration, isTeamEvent, getTournamentRegistrants]);

  const handleReportMatch = useCallback(
    async (matchId: number, winnerId: string, score1: number, score2: number) => {
      // Host reports are trusted and finalise immediately; a participant's
      // report waits for the opponent to confirm.
      const success = await reportMatch(matchId, winnerId, score1, score2, { autoConfirm: isHost });
      if (success) {
        toast.success(
          isHost ? "Match result reported!" : "Result submitted — waiting for your opponent to confirm"
        );
        setSelectedMatch(null);
        if (tournament) getMatches(tournament.id);
      } else {
        toast.error("Failed to report match");
      }
    },
    [reportMatch, isHost, tournament, getMatches]
  );

  const handleConfirmMatch = useCallback(
    async (matchId: number) => {
      const success = await confirmMatch(matchId);
      if (success) {
        toast.success("Result confirmed");
        setSelectedMatch(null);
        if (tournament) getMatches(tournament.id);
      } else {
        toast.error("Failed to confirm result");
      }
    },
    [confirmMatch, tournament, getMatches]
  );

  const handleStartMatch = useCallback(
    async (matchId: number) => {
      if (!tournament) return;

      const success = await startMatch(matchId);
      if (success) {
        toast.success("Match started");
        setSelectedMatch((current) =>
          current?.id === matchId
            ? { ...current, status: "in_progress", started_at: new Date().toISOString() }
            : current
        );
        getMatches(tournament.id);
      } else {
        toast.error("Failed to start match");
      }
    },
    [startMatch, tournament, getMatches]
  );

  const handleDisputeMatch = useCallback(
    async (matchId: number, reason: string) => {
      const success = await disputeMatch(matchId, reason);
      if (success) {
        toast.success("Dispute filed");
        setSelectedMatch(null);
        if (tournament) getMatches(tournament.id);
      } else {
        toast.error("Failed to file dispute");
      }
    },
    [disputeMatch, tournament, getMatches]
  );

  const handleUpdateTournament = useCallback(
    async (id: number, updates: Record<string, unknown>) => {
      const updated = await updateTournament(id, updates as Parameters<typeof updateTournament>[1]);
      if (updated) {
        toast.success("Tournament updated!");
        setTournament(updated);
        return updated;
      } else {
        toast.error("Failed to update tournament.");
        return null;
      }
    },
    [updateTournament]
  );

  const handleDeleteTournament = useCallback(
    async (id: number) => {
      const success = await deleteTournament(id);
      if (success) {
        toast.success("Tournament deleted.");
        setManageOpen(false);
        setNotFound(true);
        setTournament(null);
      } else {
        toast.error("Failed to delete tournament.");
      }
      return success;
    },
    [deleteTournament]
  );

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8 max-w-2xl mx-auto">
        <CardSkeleton />
      </div>
    );
  }

  if (notFound || !tournament) {
    return (
      <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8 max-w-2xl mx-auto">
        <div className="text-center py-20">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-alt text-text-muted">
            <Trophy size={28} aria-hidden="true" />
          </span>
          <h2 className="text-xl font-bold font-heading text-text mb-2">Tournament not found</h2>
          <p className="text-sm text-text-muted mb-6">This tournament may have been removed or doesn&apos;t exist.</p>
          <Link
            href="/esports"
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan hover:underline"
          >
            <ArrowLeft size={14} />
            Back to Esports
          </Link>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[tournament.status];

  const rules = tournament.rules
    ? tournament.rules.split("\n").filter(Boolean)
    : DEFAULT_TOURNAMENT_RULES;

  const payoutSplit = getPayoutDistribution(tournament);

  return (
    <div className="min-h-screen px-4 py-8 md:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        href="/esports"
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-cyan transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Back to Esports
      </Link>

      <div className="rounded-xl border border-border bg-surface p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/10 text-cyan"
          >
            <Gamepad2 size={30} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-1">{tournament.game}</p>
            <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-text">
              {tournament.title}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge color={status.color} size="md">{status.label}</Badge>
            {isRegistered && !isPast && <Badge color="cyan" size="md">Registered</Badge>}
          </div>
        </div>

        {/* Description */}
        {tournament.description && (
          <p className="text-sm text-text-muted mb-6 leading-relaxed">{tournament.description}</p>
        )}

        {/* Extra info badges */}
        {(tournament.bracket_type || (tournament.team_size && tournament.team_size > 1) || tournament.check_in_required || tournament.stream_url) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tournament.bracket_type && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-xs text-text-muted">
                <GitBranch size={12} className="text-cyan/60" />
                {tournament.bracket_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
            )}
            {tournament.team_size && tournament.team_size > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-magenta/5 border border-magenta/20 text-xs text-magenta">
                <Users size={12} />
                {tournament.team_size}v{tournament.team_size}
              </div>
            )}
            {tournament.check_in_required && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green/5 border border-green/20 text-xs text-green">
                <CheckCircle size={12} />
                Check-in Required
              </div>
            )}
            {tournament.stream_url && (
              <a
                href={tournament.stream_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red/5 border border-red/20 text-xs text-red hover:bg-red/10 transition-colors"
              >
                <Video size={12} />
                Watch Stream
              </a>
            )}
          </div>
        )}

        {/* Tab switcher (only if multiple tabs) */}
        {tabs.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto" role="tablist" aria-label="Tournament sections">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
                  "active:scale-95",
                  activeTab === tab.key
                    ? "bg-cyan/10 text-cyan border border-cyan/25"
                    : "bg-surface-alt text-text-muted border border-border hover:border-cyan/20"
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan/10 text-cyan text-[10px] font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
        {activeTab === "overview" && (
          <>
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="flex items-center gap-2.5 p-4 rounded-lg bg-surface-alt border border-border">
                <Calendar size={18} className="text-cyan/70 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted">Date</p>
                  <p className="text-sm font-semibold text-text">{formatTournamentDate(tournament.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-4 rounded-lg bg-surface-alt border border-border">
                <Clock size={18} className="text-cyan/70 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted">Time</p>
                  <p className="text-sm font-semibold text-text">{formatTournamentTime(tournament.time)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-4 rounded-lg bg-surface-alt border border-border">
                <Swords size={18} className="text-cyan/70 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted">Format</p>
                  <p className="text-sm font-semibold text-text">{tournament.format}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-4 rounded-lg bg-surface-alt border border-border">
                <Gamepad2 size={18} className="text-cyan/70 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted">Platform</p>
                  <p className="text-sm font-semibold text-text">{tournament.platform}</p>
                </div>
              </div>
            </div>

            {/* Entry fee & Prize */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 p-4 rounded-lg bg-surface-alt border border-border text-center">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Entry Fee</p>
                <p className="text-xl font-bold font-heading text-magenta">{formatPrice(tournament.entry_fee)}</p>
              </div>
              <div className="flex-1 p-4 rounded-lg bg-surface-alt border border-gold/20 text-center">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Prize Pool</p>
                <p className="text-xl font-bold font-heading text-gold">{tournament.prize}</p>
              </div>
            </div>

            {tournament.entry_fee > 0 && (
              <div className="mb-8 rounded-lg border border-cyan/20 bg-cyan/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-cyan" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
                      CGE Checkout Protected
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">
                      Paid entries go through CGE checkout and are recorded against this tournament before confirmation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isTeamEvent && (
              <div className="mb-8 rounded-lg border border-magenta/20 bg-magenta/5 p-4">
                <div className="flex items-start gap-3">
                  <Users size={18} className="mt-0.5 shrink-0 text-magenta" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-magenta">
                      Team Entry
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">
                      {!myTeam
                        ? `This is a ${requiredTeamSize}v${requiredTeamSize} event. Create or join a team first; the captain registers one team slot.`
                        : !isTeamCaptain
                          ? `${myTeam.name} can enter this event when the team captain registers the roster.`
                          : teamMissingCount > 0
                            ? `${myTeam.name} needs ${teamMissingCount} more member${teamMissingCount === 1 ? "" : "s"} before it can enter this ${requiredTeamSize}v${requiredTeamSize} event.`
                            : `${myTeam.name} is ready with ${currentTeamMemberCount} member${currentTeamMemberCount === 1 ? "" : "s"}. The captain can register this team.`}
                    </p>
                    {!myTeam && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="magenta"
                          onClick={() => {
                            window.location.assign("/esports?tab=teams");
                          }}
                        >
                          <UserPlus size={14} />
                          Open Teams
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Check-in panel */}
            {tournament.check_in_required && (isRegistered || isHost) && (
              <div className="mb-8">
                <CheckInPanel
                  tournamentId={tournament.id}
                  tournamentDate={tournament.date}
                  tournamentTime={tournament.time}
                  checkInRequired={tournament.check_in_required}
                  checkInOpensMinutes={tournament.check_in_opens_minutes ?? 30}
                  registrants={registrants}
                  currentUserId={currentParticipantId}
                  isHost={isHost}
                  onCheckIn={isRegistered ? handleCheckIn : undefined}
                  loading={checkInLoading}
                />
              </div>
            )}

            {/* Slots */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Users size={14} className="text-cyan/60" />
                  {isTeamEvent ? "Registered Teams" : "Registered Players"}
                </span>
                <span className="font-semibold text-text">
                  {filledCount} / {tournament.slots} slots
                </span>
              </div>
              <ProgressBar
                value={filledCount}
                max={tournament.slots}
                color={isFull ? "var(--color-red)" : "var(--color-cyan)"}
              />
            </div>

            {/* Prize distribution — the tournament's ACTUAL configured
                split, never a hardcoded example. A winner-takes-all
                event shows one card at 100%. */}
            <div className="mb-8">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-gold" />
                Prize Distribution
              </h4>
              <div
                className={cn(
                  "grid gap-2",
                  payoutSplit.length === 1
                    ? "grid-cols-1"
                    : payoutSplit.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                )}
              >
                {payoutSplit.map((entry) => (
                  <div
                    key={entry.place}
                    className={cn(
                      "p-3 rounded-lg bg-surface-alt text-center border",
                      entry.place === 1 ? "border-gold/20" : "border-border"
                    )}
                  >
                    <span className="mb-1.5 flex justify-center">
                      <Medal
                        size={20}
                        aria-hidden="true"
                        className={
                          entry.place === 1
                            ? "text-gold"
                            : entry.place === 2
                              ? "text-[#C0C4CC]"
                              : entry.place === 3
                                ? "text-[#CD7F32]"
                                : "text-text-muted"
                        }
                      />
                    </span>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">
                      {entry.label ??
                        `${entry.place}${
                          entry.place === 1
                            ? "st"
                            : entry.place === 2
                              ? "nd"
                              : entry.place === 3
                                ? "rd"
                                : "th"
                        } Place`}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-bold font-heading",
                        entry.place === 1 ? "text-gold" : "text-text"
                      )}
                    >
                      {entry.percent}%
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="mb-8">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                <Medal size={14} className="text-cyan" />
                Tournament Rules
              </h4>
              <ul className="space-y-2">
                {rules.map((rule, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-text-muted leading-relaxed"
                  >
                    <span className="text-cyan mt-0.5 shrink-0">{"•"}</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Countdown */}
            {countdown && tournament.status === "open" && (
              <div className="mb-8 p-4 rounded-lg bg-cyan/5 border border-cyan/20 text-center">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Starts In</p>
                <p className="text-2xl font-bold font-heading text-cyan">{countdown}</p>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ BRACKET TAB ═══════════════ */}
        {activeTab === "bracket" && (
          <div>
            {matchesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-cyan" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-16">
                <GitBranch size={32} className="mx-auto text-text-muted/30 mb-3" />
                <p className="text-sm text-text-muted">
                  {tournament.status === "open" || tournament.status === "full"
                    ? "Bracket will be generated when the tournament starts."
                    : "No bracket data available."}
                </p>
              </div>
            ) : (
              <BracketView
                matches={matches}
                bracketType={tournament.bracket_type ?? undefined}
                currentUserId={currentParticipantId}
                onMatchClick={(match) => {
                  if (
                    isHost ||
                    match.participant1_id === currentParticipantId ||
                    match.participant2_id === currentParticipantId
                  ) {
                    setSelectedMatch(match);
                  }
                }}
              />
            )}
          </div>
        )}

        {/* ═══════════════ STREAM TAB ═══════════════ */}
        {activeTab === "stream" && tournament.stream_url && (
          <div>
            <StreamEmbed
              url={tournament.stream_url}
              title={`${tournament.title} — Live`}
            />
          </div>
        )}

        {activeTab === "discussion" && (
          <CommunityThread
            tournamentId={tournament.id}
            defaultTopic="tournament-talk"
            title="Tournament Discussion"
          />
        )}

        {/* ═══════════════ ACTION BUTTONS ═══════════════ */}
        <div className="mt-8 border-t border-border pt-6">
          {isHost && (
            <div className="mb-4">
              <Button fullWidth variant="magenta" onClick={() => setManageOpen(true)}>
                <Settings size={16} />
                Manage Tournament
              </Button>
            </div>
          )}

          {isPast || tournament.status === "completed" || tournament.status === "cancelled" ? (
            <Button fullWidth size="lg" variant="primary" disabled>
              <Trophy size={16} />
              Tournament Ended
            </Button>
          ) : isRegistered ? (
            <div className="space-y-2">
              {paymentPending ? (
                <Button
                  fullWidth
                  size="lg"
                  variant="primary"
                  disabled={actionLoading || entryPoll !== null}
                  onClick={handleCompletePayment}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Starting payment...
                    </>
                  ) : (
                    <>
                      <Trophy size={16} />
                      Complete Payment
                    </>
                  )}
                </Button>
              ) : (
                <Button fullWidth size="lg" variant="primary" disabled>
                  <Trophy size={16} />
                  Registered ✓
                </Button>
              )}
              {entryPoll ? (
                <div
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-center text-[11px] leading-relaxed",
                    entryPoll.status === "confirmed"
                      ? "border-green/40 bg-green/10 text-green"
                      : "border-gold/40 bg-gold/10 text-gold"
                  )}
                >
                  {entryPoll.status === "confirmed"
                    ? "Payment confirmed — you're in!"
                    : entryPoll.status === "polling"
                      ? "Confirming your payment with Paystack… usually under a minute. Keep this page open."
                      : "Still confirming your payment — your slot is safe and this page updates automatically. Taking more than a few minutes? Message us on WhatsApp."}
                </div>
              ) : paymentPending ? (
                <p className="text-[11px] text-center text-gold">
                  {isTeamEvent
                    ? "Your team slot is reserved while payment is pending."
                    : "Your slot is reserved while payment is pending."}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (!withdrawArmed) {
                    setWithdrawArmed(true);
                    window.setTimeout(() => setWithdrawArmed(false), 5000);
                    return;
                  }
                  setWithdrawArmed(false);
                  handleUnregister();
                }}
                disabled={actionLoading}
                className={cn(
                  "w-full text-center text-[11px] transition-colors cursor-pointer py-1",
                  withdrawArmed
                    ? "text-magenta font-semibold"
                    : "text-text-muted hover:text-magenta"
                )}
              >
                {actionLoading
                  ? "Withdrawing..."
                  : withdrawArmed
                    ? isTeamEvent
                      ? "Tap again to confirm — your team's slot will be released"
                      : "Tap again to confirm — your slot will be released"
                    : isTeamEvent
                      ? "Withdraw team from tournament"
                      : "Withdraw from tournament"}
              </button>
            </div>
          ) : isFull ? (
            <Button fullWidth size="lg" variant="primary" disabled>
              <Users size={16} />
              Tournament Full
            </Button>
          ) : tournament.status === "in_progress" ? (
            <Button fullWidth size="lg" variant="primary" disabled>
              <Swords size={16} />
              Tournament In Progress
            </Button>
          ) : (
            <Button
              fullWidth
              size="lg"
              variant="primary"
              disabled={actionLoading}
              onClick={attemptRegister}
            >
              {actionLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isTeamEvent ? "Registering team..." : "Registering..."}
                </>
              ) : (
                <>
                  <Trophy size={16} />
                  {isTeamEvent
                    ? tournament.entry_fee > 0
                      ? "Pay & Register Team"
                      : "Register Team"
                    : tournament.entry_fee > 0
                      ? "Pay & Register"
                      : "Register Now"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Manage tournament modal */}
      {isHost && (
        <ManageTournamentModal
          tournament={tournament}
          open={manageOpen}
          onClose={() => setManageOpen(false)}
          onUpdate={handleUpdateTournament}
          onDelete={handleDeleteTournament}
          onLoadRegistrants={getTournamentRegistrants}
          loading={actionLoading}
        />
      )}

      {/* Match report modal */}
      <MatchReportModal
        match={selectedMatch}
        open={selectedMatch !== null}
        onClose={() => setSelectedMatch(null)}
        onStart={isHost ? handleStartMatch : undefined}
        onReport={async (matchId, winnerId, s1, s2) => handleReportMatch(matchId, winnerId, s1, s2)}
        onConfirm={async (matchId) => handleConfirmMatch(matchId)}
        onDispute={async (matchId, reason) => handleDisputeMatch(matchId, reason)}
        currentUserId={currentParticipantId}
        isHost={isHost}
      />

      <UnverifiedOrganizerDialog
        open={showUnverifiedGate}
        onClose={() => setShowUnverifiedGate(false)}
        onConfirm={() => {
          setShowUnverifiedGate(false);
          handleRegister();
        }}
        organizerName={organizerName}
        isPaid={tournament.entry_fee > 0}
        entryFeeLabel={tournament.entry_fee > 0 ? formatPrice(tournament.entry_fee) : undefined}
        isTeamEvent={isTeamEvent}
        loading={actionLoading}
      />
    </div>
  );
}
