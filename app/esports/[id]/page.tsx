"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft, Calendar, Clock, Gamepad2, Users, Trophy, Swords, Medal,
  Loader2, Settings, Video, CheckCircle, GitBranch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CardSkeleton } from "@/components/ui/skeleton";
import { formatPrice, cn } from "@/lib/utils";
import { ManageTournamentModal } from "@/components/esports/manage-tournament-modal";
import { BracketView } from "@/components/esports/bracket-view";
import { MatchReportModal } from "@/components/esports/match-report-modal";
import { CheckInPanel } from "@/components/esports/check-in-panel";
import { StreamEmbed } from "@/components/esports/stream-embed";
import { useTournaments } from "@/hooks/use-tournaments";
import { useTournamentMatches } from "@/hooks/use-tournament-matches";
import { useAuth } from "@/hooks/use-auth";
import {
  getGameEmoji,
  STATUS_CONFIG,
  getCountdown,
  getFilledCount,
  isTournamentPast,
  DEFAULT_TOURNAMENT_RULES,
  formatTournamentDate,
  formatTournamentTime,
} from "@/lib/esports-utils";
import type { TournamentWithCount } from "@/lib/esports-utils";
import type { TournamentMatch, TournamentRegistrant } from "@/lib/types";

type DetailTab = "overview" | "bracket" | "stream";

export default function TournamentDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const {
    getTournamentById,
    registerForTournament,
    unregisterFromTournament,
    isRegisteredForTournament,
    updateTournament,
    deleteTournament,
    getTournamentRegistrants,
    actionLoading,
  } = useTournaments();

  const {
    matches,
    loading: matchesLoading,
    getMatches,
    reportMatch,
    disputeMatch,
  } = useTournamentMatches();

  const [tournament, setTournament] = useState<TournamentWithCount | null>(null);
  const [registrants, setRegistrants] = useState<TournamentRegistrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  const tournamentId = Number(params.id);

  // Initial load
  useEffect(() => {
    if (isNaN(tournamentId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const result = await getTournamentById(tournamentId);
      if (result) {
        setTournament(result);
      } else {
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

  const isPast = tournament ? isTournamentPast(tournament.date, tournament.status) : false;
  const isRegistered = tournament ? isRegisteredForTournament(tournament.id) : false;
  const filledCount = tournament ? getFilledCount(tournament) : 0;
  const isFull = tournament ? filledCount >= tournament.slots : false;
  const countdown = tournament ? getCountdown(tournament.date, tournament.time) : null;
  const isHost = Boolean(user && tournament?.created_by === user.id);
  const hasBracket = matches.length > 0;
  const hasStream = Boolean(tournament?.stream_url);

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

  const handleRegister = useCallback(async () => {
    if (!tournament) return;
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      toast("Sign in to register for tournaments", { icon: "\uD83D\uDD12" });
      return;
    }

    const registration = await registerForTournament(tournament.id);
    if (registration) {
      toast.success("Successfully registered!");
      const updated = await getTournamentById(tournament.id);
      if (updated) setTournament(updated);
      getTournamentRegistrants(tournament.id).then(setRegistrants);
    } else {
      toast.error("Failed to register. You may already be registered.");
    }
  }, [tournament, user, registerForTournament, getTournamentById, getTournamentRegistrants]);

  const handleUnregister = useCallback(async () => {
    if (!tournament) return;
    const success = await unregisterFromTournament(tournament.id);
    if (success) {
      toast.success("Withdrawn from tournament");
      const updated = await getTournamentById(tournament.id);
      if (updated) setTournament(updated);
      getTournamentRegistrants(tournament.id).then(setRegistrants);
    } else {
      toast.error("Failed to withdraw");
    }
  }, [tournament, unregisterFromTournament, getTournamentById, getTournamentRegistrants]);

  const handleCheckIn = useCallback(async () => {
    if (!tournament || !user) return false;
    setCheckInLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("tournament_registrations")
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
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
  }, [tournament, user, getTournamentRegistrants]);

  const handleReportMatch = useCallback(
    async (matchId: number, winnerId: string, score1: number, score2: number) => {
      const success = await reportMatch(matchId, winnerId, score1, score2);
      if (success) {
        toast.success("Match result reported!");
        setSelectedMatch(null);
        if (tournament) getMatches(tournament.id);
      } else {
        toast.error("Failed to report match");
      }
    },
    [reportMatch, tournament, getMatches]
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
          <span className="text-6xl mb-4 block">{"\uD83C\uDFC6"}</span>
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

  const emoji = getGameEmoji(tournament.game);
  const status = STATUS_CONFIG[tournament.status];

  const rules = tournament.rules
    ? tournament.rules.split("\n").filter(Boolean)
    : DEFAULT_TOURNAMENT_RULES;

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
          <span className="text-6xl">{emoji}</span>
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
                  currentUserId={user?.id}
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
                  Registered Players
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

            {/* Prize distribution */}
            <div className="mb-8">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-gold" />
                Prize Distribution
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-lg bg-surface-alt border border-gold/20 text-center">
                  <p className="text-lg mb-1">{"\uD83E\uDD47"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">1st Place</p>
                  <p className="text-sm font-bold font-heading text-gold">60%</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-alt border border-border text-center">
                  <p className="text-lg mb-1">{"\uD83E\uDD48"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">2nd Place</p>
                  <p className="text-sm font-bold font-heading text-text">25%</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-alt border border-border text-center">
                  <p className="text-lg mb-1">{"\uD83E\uDD49"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">3rd Place</p>
                  <p className="text-sm font-bold font-heading text-text">15%</p>
                </div>
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
                    <span className="text-cyan mt-0.5 shrink-0">{"\u2022"}</span>
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
                currentUserId={user?.id}
                onMatchClick={(match) => {
                  if (
                    isHost ||
                    match.participant1_id === user?.id ||
                    match.participant2_id === user?.id
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
              title={`${tournament.title} \u2014 Live`}
            />
          </div>
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
              <Button fullWidth size="lg" variant="primary" disabled>
                <Trophy size={16} />
                Registered ✓
              </Button>
              <button
                type="button"
                onClick={handleUnregister}
                disabled={actionLoading}
                className="w-full text-center text-[11px] text-text-muted hover:text-magenta transition-colors cursor-pointer py-1"
              >
                {actionLoading ? "Withdrawing..." : "Withdraw from tournament"}
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
              onClick={handleRegister}
            >
              {actionLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Trophy size={16} />
                  Register Now
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
        onReport={async (matchId, winnerId, s1, s2) => handleReportMatch(matchId, winnerId, s1, s2)}
        onDispute={async (matchId, reason) => handleDisputeMatch(matchId, reason)}
        currentUserId={user?.id}
        isHost={isHost}
      />
    </div>
  );
}
