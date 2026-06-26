"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, Users, Settings, Trash2, Play, CheckCircle, XCircle, GitBranch, RefreshCw, Wallet, ShieldAlert, Flag } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import { BracketView } from "@/components/esports/bracket-view";
import { MatchReportModal } from "@/components/esports/match-report-modal";
import { TOURNAMENT_GAMES, TOURNAMENT_FORMATS, TOURNAMENT_PLATFORMS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { getFilledCount } from "@/lib/esports-utils";
import { useTournamentMatches } from "@/hooks/use-tournament-matches";
import { useTournamentPayouts } from "@/hooks/use-tournament-payouts";
import { useAuth } from "@/hooks/use-auth";
import type { Tournament, TournamentMatch, TournamentPayout, TournamentRegistrant, MatchDispute } from "@/lib/types";
import type { BracketParticipant, BracketType } from "@/lib/bracket-engine";

type ManageView = "details" | "registrants" | "bracket" | "disputes" | "payouts";

const FALLBACK_PAYOUT_DISTRIBUTION = [
  { place: 1, label: "1st Place", percent: 60 },
  { place: 2, label: "2nd Place", percent: 25 },
  { place: 3, label: "3rd Place", percent: 15 },
];

function getPayoutDistribution(tournament: Tournament) {
  const raw = tournament.payout_distribution;
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_PAYOUT_DISTRIBUTION;

  return raw
    .map((item) => ({
      place: Number(item.place),
      label: item.label || `${Number(item.place)} Place`,
      percent: Number(item.percent),
    }))
    .filter((item) => item.place > 0 && item.percent > 0);
}

function formatPlacement(place: number) {
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  if (place === 3) return "3rd";
  return `${place}th`;
}

function payoutBadgeColor(status: string) {
  if (status === "paid") return "green" as const;
  if (status === "approved" || status === "processing") return "cyan" as const;
  if (status === "failed" || status === "cancelled") return "red" as const;
  return "gold" as const;
}

function disputeBadgeColor(status: string) {
  if (status === "resolved") return "green" as const;
  if (status === "dismissed") return "gold" as const;
  return "red" as const;
}

// Disputes are filed by a participant; resolve their name from match context.
function disputeReporterName(dispute: MatchDispute) {
  const m = dispute.match;
  if (m) {
    if (dispute.reported_by === m.participant1_id) return m.participant1_name || "Player 1";
    if (dispute.reported_by === m.participant2_id) return m.participant2_name || "Player 2";
  }
  return "A participant";
}

interface ManageTournamentModalProps {
  tournament: (Tournament & { registration_count?: number }) | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: (id: number, data: Record<string, unknown>) => Promise<unknown>;
  onDelete?: (id: number) => Promise<boolean>;
  onLoadRegistrants?: (tournamentId: number) => Promise<TournamentRegistrant[]>;
  loading?: boolean;
}

export function ManageTournamentModal({
  tournament,
  open,
  onClose,
  onUpdate,
  onDelete,
  onLoadRegistrants,
  loading,
}: ManageTournamentModalProps) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ManageView>("details");
  const [registrants, setRegistrants] = useState<TournamentRegistrant[]>([]);
  const [registrantsLoading, setRegistrantsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmResetBracket, setConfirmResetBracket] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [disputeNotes, setDisputeNotes] = useState<Record<number, string>>({});
  const [resolvingDisputeId, setResolvingDisputeId] = useState<number | null>(null);

  const {
    matches,
    disputes,
    loading: bracketLoading,
    getMatches,
    getDisputes,
    generateAndSaveBracket,
    reportMatch,
    confirmMatch,
    startMatch,
    disputeMatch,
    resolveDispute,
    resetBracket,
  } = useTournamentMatches();
  const {
    payouts,
    placements,
    summary: payoutSummary,
    loading: payoutLoading,
    error: payoutError,
    getPayouts,
    setPrizePlacement,
    preparePayouts,
    approvePayouts,
    releasePayout,
  } = useTournamentPayouts();

  // Edit form state
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [customGame, setCustomGame] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [entryFee, setEntryFee] = useState("");
  const [prize, setPrize] = useState("");
  const [slots, setSlots] = useState("");
  const [format, setFormat] = useState("");
  const [platform, setPlatform] = useState("");
  const [rules, setRules] = useState("");

  // Populate form when tournament changes
  useEffect(() => {
    if (!tournament) return;
    const timer = setTimeout(() => {
      const isKnownGame = TOURNAMENT_GAMES.includes(tournament.game as typeof TOURNAMENT_GAMES[number]);
      setTitle(tournament.title);
      setGame(isKnownGame ? tournament.game : "Other");
      setCustomGame(isKnownGame ? "" : tournament.game);
      setDate(tournament.date);
      setTime(tournament.time);
      setEntryFee(String(tournament.entry_fee));
      setPrize(tournament.prize);
      setSlots(String(tournament.slots));
      setFormat(tournament.format);
      setPlatform(tournament.platform);
      setRules(tournament.rules || "");
      setActiveView("details");
      setConfirmDelete(false);
      setConfirmResetBracket(false);
      setSelectedMatch(null);
      setRegistrants([]);
      setDisputeNotes({});
      setResolvingDisputeId(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [tournament]);

  // Load registrants when switching to that view
  useEffect(() => {
    if (activeView !== "registrants" || !tournament || !onLoadRegistrants) return;
    const timer = setTimeout(() => {
      setRegistrantsLoading(true);
      onLoadRegistrants(tournament.id)
        .then(setRegistrants)
        .finally(() => setRegistrantsLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [activeView, tournament, onLoadRegistrants]);

  // Load matches when switching to bracket view
  useEffect(() => {
    if (activeView === "bracket" && tournament) {
      getMatches(tournament.id);
    }
  }, [activeView, tournament, getMatches]);

  // Load disputes when the modal opens (keeps the tab badge accurate) and
  // refresh whenever the disputes view is shown.
  useEffect(() => {
    if (open && tournament) {
      getDisputes(tournament.id);
    }
  }, [open, tournament, activeView, getDisputes]);

  // Load payout state and paid registrants when switching to payout view
  useEffect(() => {
    if (activeView !== "payouts" || !tournament) return;
    getPayouts(tournament.id);
    if (onLoadRegistrants) {
      onLoadRegistrants(tournament.id).then(setRegistrants);
    }
  }, [activeView, tournament, getPayouts, onLoadRegistrants]);

  useEffect(() => {
    let active = true;

    async function loadViewerRole() {
      setViewerIsAdmin(false);
      if (!user || !open) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (active) {
        setViewerIsAdmin(Boolean(data?.is_admin));
      }
    }

    loadViewerRole();
    return () => {
      active = false;
    };
  }, [user, open]);

  const handleGenerateBracket = useCallback(async () => {
    if (!tournament || !onLoadRegistrants) return;

    const regs = await onLoadRegistrants(tournament.id);
    if (regs.length < 2) {
      toast.error("Need at least 2 registered players to generate a bracket");
      return;
    }

    const participants: BracketParticipant[] = regs.map((r, idx) => ({
      id: r.bracket_participant_id ?? r.user_id,
      name: r.profile?.gamertag || r.profile?.full_name || `Player ${idx + 1}`,
      seed: idx + 1,
    }));

    const bracketType: BracketType = (tournament.bracket_type as BracketType) || "single_elimination";

    const result = await generateAndSaveBracket(tournament.id, bracketType, participants);
    if (result.length > 0) {
      toast.success(`Bracket generated! ${result.length} matches created.`);
    } else {
      toast.error("Failed to generate bracket");
    }
  }, [tournament, onLoadRegistrants, generateAndSaveBracket]);

  const handleResetBracket = useCallback(async () => {
    if (!tournament) return;
    const success = await resetBracket(tournament.id);
    if (success) {
      toast.success("Bracket reset");
      setConfirmResetBracket(false);
    } else {
      toast.error("Failed to reset bracket");
    }
  }, [tournament, resetBracket]);

  const handleStartMatch = useCallback(async (matchId: number) => {
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
      toast.error("Could not start match");
    }
  }, [tournament, startMatch, getMatches]);

  const handleReportMatch = useCallback(
    async (matchId: number, winnerId: string, score1: number, score2: number) => {
      if (!tournament) return;

      // Host reports are trusted — finalise and advance immediately.
      const success = await reportMatch(matchId, winnerId, score1, score2, { autoConfirm: true });
      if (success) {
        toast.success("Match result saved");
        setSelectedMatch(null);
        getMatches(tournament.id);
      } else {
        toast.error("Could not save match result");
      }
    },
    [tournament, reportMatch, getMatches]
  );

  const handleConfirmMatch = useCallback(
    async (matchId: number) => {
      if (!tournament) return;

      const success = await confirmMatch(matchId);
      if (success) {
        toast.success("Result confirmed");
        setSelectedMatch(null);
        getMatches(tournament.id);
      } else {
        toast.error("Could not confirm result");
      }
    },
    [tournament, confirmMatch, getMatches]
  );

  const handleDisputeMatch = useCallback(
    async (matchId: number, reason: string) => {
      if (!tournament) return;

      const success = await disputeMatch(matchId, reason);
      if (success) {
        toast.success("Dispute filed");
        setSelectedMatch(null);
        getMatches(tournament.id);
      } else {
        toast.error("Could not file dispute");
      }
    },
    [tournament, disputeMatch, getMatches]
  );

  const handleResolveDispute = useCallback(
    async (dispute: MatchDispute, newStatus: "resolved" | "dismissed") => {
      if (!tournament) return;

      const resolution = (disputeNotes[dispute.id] ?? "").trim();
      if (!resolution) {
        toast.error("Add a short resolution note before deciding");
        return;
      }

      setResolvingDisputeId(dispute.id);
      const success = await resolveDispute(dispute.id, dispute.match_id, resolution, newStatus);
      setResolvingDisputeId(null);

      if (success) {
        toast.success(
          newStatus === "resolved"
            ? "Dispute upheld — match reopened for a replay"
            : "Dispute dismissed — original result stands"
        );
        setDisputeNotes((prev) => {
          const next = { ...prev };
          delete next[dispute.id];
          return next;
        });
        getDisputes(tournament.id);
        getMatches(tournament.id);
      } else {
        toast.error("Could not resolve dispute");
      }
    },
    [tournament, disputeNotes, resolveDispute, getDisputes, getMatches]
  );

  const handlePlacementChange = useCallback(
    async (placement: number, userId: string) => {
      if (!tournament || !userId) return;

      const success = await setPrizePlacement(tournament.id, placement, userId);
      if (success) {
        toast.success(`${formatPlacement(placement)} place assigned`);
      } else {
        toast.error("Could not assign prize placement");
      }
    },
    [tournament, setPrizePlacement]
  );

  const handlePreparePayouts = useCallback(async () => {
    if (!tournament) return;

    const result = await preparePayouts(tournament.id);
    if (result) {
      toast.success(
        result.payout_count > 0
          ? "Payout draft generated"
          : "Add prize placements to generate payouts"
      );
    } else {
      toast.error("Could not generate payout draft");
    }
  }, [tournament, preparePayouts]);

  const handleApprovePayouts = useCallback(async () => {
    if (!tournament) return;

    const count = await approvePayouts(tournament.id);
    if (count > 0) {
      toast.success("Payout draft approved for CGE release");
    } else {
      toast.error("Could not approve payout draft");
    }
  }, [tournament, approvePayouts]);

  const handleReleasePayout = useCallback(
    async (payout: TournamentPayout) => {
      if (!tournament) return;

      const result = await releasePayout(payout.id, tournament.id);
      if (result) {
        toast.success(result.status === "paid" ? "Payout paid" : "Payout release started");
      } else {
        toast.error("Could not release payout");
      }
    },
    [tournament, releasePayout]
  );

  if (!tournament) return null;

  const showCustomGame = game === "Other";
  const resolvedGame = showCustomGame ? customGame.trim() : game;
  const isEditable = tournament.status === "open" || tournament.status === "full";
  const filledCount = getFilledCount(tournament);
  const openDisputeCount = disputes.filter((d) => d.status === "open").length;
  const payoutDistribution = getPayoutDistribution(tournament);
  const placementsByPlace = new Map(placements.map((p) => [p.placement, p]));
  const paidRegistrants = registrants.filter((r) => r.payment_status === "paid");
  const payoutPool =
    payoutSummary?.prize_pool_total ??
    tournament.prize_pool_total ??
    paidRegistrants.reduce((sum, r) => sum + (r.total ?? tournament.entry_fee ?? 0), 0);
  const payoutAllocated = payouts.reduce((sum, payout) => sum + payout.gross_amount, 0);
  const payoutNetTotal = payouts.reduce((sum, payout) => sum + payout.net_amount, 0);
  const payoutLocked = payouts.some((p) => ["approved", "processing", "paid"].includes(p.status));
  const canPreparePayouts = tournament.status === "completed" && !payoutLocked;
  const canApprovePayouts =
    tournament.status === "completed" &&
    payouts.length > 0 &&
    payouts.every((p) => p.status === "pending_review");

  const gameOptions = [
    ...TOURNAMENT_GAMES.map((g) => ({ value: g, label: g })),
    { value: "Other", label: "Other (custom)" },
  ];
  const formatOptions = TOURNAMENT_FORMATS.map((f) => ({ value: f, label: f }));
  const platformOptions = TOURNAMENT_PLATFORMS.map((p) => ({ value: p, label: p }));

  const isValid =
    title.trim().length >= 3 &&
    resolvedGame.length > 0 &&
    date &&
    time &&
    prize.trim().length > 0 &&
    slots &&
    Number(slots) >= 2 &&
    format &&
    platform;

  async function handleSave() {
    if (!isValid || !onUpdate) return;
    await onUpdate(tournament!.id, {
      title: title.trim(),
      game: resolvedGame,
      date,
      time,
      entry_fee: Number(entryFee) || 0,
      prize: prize.trim(),
      slots: Number(slots),
      format,
      platform,
      rules: rules.trim() || null,
    });
  }

  async function handleStatusChange(newStatus: Tournament["status"]) {
    if (!onUpdate) return;
    await onUpdate(tournament!.id, { status: newStatus });
  }

  async function handleDelete() {
    if (!onDelete) return;
    const success = await onDelete(tournament!.id);
    if (success) onClose();
  }

  const content = (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 overflow-x-auto" role="tablist" aria-label="Tournament management tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "details"}
          onClick={() => setActiveView("details")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "details"
              ? "bg-magenta/10 text-magenta border border-magenta/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-magenta/20"
          )}
        >
          <Settings size={14} />
          Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "registrants"}
          onClick={() => setActiveView("registrants")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "registrants"
              ? "bg-cyan/10 text-cyan border border-cyan/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-cyan/20"
          )}
        >
          <Users size={14} />
          Registrants ({filledCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "bracket"}
          onClick={() => setActiveView("bracket")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "bracket"
              ? "bg-green/10 text-green border border-green/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-green/20"
          )}
        >
          <GitBranch size={14} />
          Bracket
          {matches.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green/10 text-green text-[10px] font-bold">
              {matches.length}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "disputes"}
          onClick={() => setActiveView("disputes")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "disputes"
              ? "bg-red/10 text-red border border-red/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-red/20"
          )}
        >
          <ShieldAlert size={14} />
          Disputes
          {openDisputeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red/15 text-red text-[10px] font-bold">
              {openDisputeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "payouts"}
          onClick={() => setActiveView("payouts")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "payouts"
              ? "bg-gold/10 text-gold border border-gold/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-gold/20"
          )}
        >
          <Wallet size={14} />
          Payouts
          {payouts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gold/10 text-gold text-[10px] font-bold">
              {payouts.length}
            </span>
          )}
        </button>
      </div>

      {/* ═══════ Details View ═══════ */}
      {activeView === "details" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-alt border border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Current Status:</span>
              <Badge
                color={
                  tournament.status === "open" ? "green" :
                  tournament.status === "in_progress" ? "cyan" :
                  tournament.status === "completed" ? "gold" :
                  tournament.status === "full" ? "red" : "red"
                }
                size="md"
              >
                {tournament.status === "open" ? "Open" :
                 tournament.status === "in_progress" ? "Live" :
                 tournament.status === "completed" ? "Completed" :
                 tournament.status === "full" ? "Full" : "Cancelled"}
              </Badge>
            </div>
            <span className="text-xs text-text-muted">{filledCount}/{tournament.slots} registered</span>
          </div>

          {(tournament.status === "open" || tournament.status === "full") && (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={loading} onClick={() => handleStatusChange("in_progress")} className="flex-1">
                <Play size={14} /> Start Tournament
              </Button>
              <Button variant="danger" size="sm" disabled={loading} onClick={() => handleStatusChange("cancelled")}>
                <XCircle size={14} /> Cancel
              </Button>
            </div>
          )}

          {tournament.status === "in_progress" && (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={loading} onClick={() => handleStatusChange("completed")} className="flex-1">
                <CheckCircle size={14} /> Complete Tournament
              </Button>
              <Button variant="danger" size="sm" disabled={loading} onClick={() => handleStatusChange("cancelled")}>
                <XCircle size={14} /> Cancel
              </Button>
            </div>
          )}

          {isEditable ? (
            <>
              <div className="border-t border-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Edit Details</p>
              </div>
              <Input label="Tournament Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
              <div>
                <Select label="Game" options={gameOptions} value={game} onChange={(e) => { setGame(e.target.value); if (e.target.value !== "Other") setCustomGame(""); }} />
                {showCustomGame && <div className="mt-2"><Input placeholder="Enter game name" value={customGame} onChange={(e) => setCustomGame(e.target.value)} maxLength={50} /></div>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Entry Fee (&#x20A6;)" type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} min={0} />
                <Input label="Prize Pool" value={prize} onChange={(e) => setPrize(e.target.value)} maxLength={200} />
              </div>
              <Input label="Number of Slots" type="number" value={slots} onChange={(e) => setSlots(e.target.value)} min={2} max={256} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Format" options={formatOptions} value={format} onChange={(e) => setFormat(e.target.value)} />
                <Select label="Platform" options={platformOptions} value={platform} onChange={(e) => setPlatform(e.target.value)} />
              </div>
              <Textarea label="Tournament Rules (optional)" value={rules} onChange={(e) => setRules(e.target.value)} maxLength={2000} />
              <Button variant="magenta" fullWidth disabled={!isValid || loading} onClick={handleSave}>
                {loading ? (<><Loader2 size={16} className="animate-spin" /> Saving...</>) : "Save Changes"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-text-muted text-center py-4">Tournament details cannot be edited after it has started or ended.</p>
          )}

          <div className="border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-red mb-3">Danger Zone</p>
            {!confirmDelete ? (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={loading}>
                <Trash2 size={14} /> Delete Tournament
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-xs text-red flex-1">This will permanently delete the tournament. Are you sure?</p>
                <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : "Yes, Delete"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Registrants View ═══════ */}
      {activeView === "registrants" && (
        <div>
          {registrantsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-cyan" /></div>
          ) : registrants.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-sm text-text-muted">No one has registered yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {registrants.map((registrant, index) => (
                <div key={registrant.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-alt border border-border">
                  <span className="text-xs font-bold text-text-muted w-5 text-center">{index + 1}</span>
                  {registrant.profile?.avatar_url ? (
                    <Image src={registrant.profile.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full shrink-0 bg-surface border border-border flex items-center justify-center">
                      <span className="text-xs font-bold text-text-muted">{(registrant.profile?.full_name || "?").charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{registrant.profile?.full_name || "Unknown Player"}</p>
                    {registrant.profile?.gamertag && <p className="text-xs text-text-muted">@{registrant.profile.gamertag}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {registrant.checked_in && <CheckCircle size={14} className="text-green" />}
                    <Badge color={registrant.payment_status === "paid" ? "green" : "gold"} size="sm">{registrant.payment_status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ Bracket View ═══════ */}
      {activeView === "bracket" && (
        <div>
          <div className="flex gap-2 mb-6">
            {matches.length === 0 && (
              <Button variant="primary" size="sm" disabled={bracketLoading || filledCount < 2} onClick={handleGenerateBracket} className="flex-1">
                {bracketLoading ? (<><Loader2 size={14} className="animate-spin" /> Generating...</>) : (<><GitBranch size={14} /> Generate Bracket</>)}
              </Button>
            )}
            {matches.length > 0 && !confirmResetBracket && (
              <Button variant="danger" size="sm" onClick={() => setConfirmResetBracket(true)} disabled={bracketLoading}>
                <RefreshCw size={14} /> Reset Bracket
              </Button>
            )}
            {matches.length > 0 && confirmResetBracket && (
              <div className="flex items-center gap-3 flex-1">
                <p className="text-xs text-red flex-1">Delete all matches and results?</p>
                <Button variant="danger" size="sm" onClick={handleResetBracket} disabled={bracketLoading}>
                  {bracketLoading ? <Loader2 size={14} className="animate-spin" /> : "Yes, Reset"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmResetBracket(false)}>Cancel</Button>
              </div>
            )}
          </div>

          {filledCount < 2 && matches.length === 0 && (
            <p className="text-xs text-text-muted text-center mb-4">Need at least 2 registrants to generate a bracket.</p>
          )}

          {bracketLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-green" /></div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch size={32} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-sm text-text-muted">No bracket generated yet</p>
              <p className="text-xs text-text-muted/60 mt-1">Generate a bracket to see the matchups</p>
            </div>
          ) : (
            <BracketView
              matches={matches}
              bracketType={tournament.bracket_type ?? undefined}
              onMatchClick={(match) => setSelectedMatch(match)}
            />
          )}
        </div>
      )}

      {/* ═══════ Disputes View ═══════ */}
      {activeView === "disputes" && (
        <div>
          {bracketLoading && disputes.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-red" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert size={32} className="mx-auto text-text-muted/30 mb-3" />
              <p className="text-sm text-text-muted">No disputes filed</p>
              <p className="text-xs text-text-muted/60 mt-1">
                Players can flag a match result from the bracket. Disputes show up here for you to resolve.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-surface-alt p-3">
                <p className="text-[11px] leading-relaxed text-text-muted">
                  <span className="text-red font-semibold">Uphold</span> reopens the match for a replay (clears the reported score).{" "}
                  <span className="text-gold font-semibold">Dismiss</span> keeps the original result. Add a short note so players see your decision.
                </p>
              </div>
              {disputes.map((dispute) => {
                const m = dispute.match;
                const isOpen = dispute.status === "open";
                const resolving = resolvingDisputeId === dispute.id;
                return (
                  <div
                    key={dispute.id}
                    className={cn(
                      "rounded-lg border p-3",
                      isOpen ? "border-red/30 bg-red/5" : "border-border bg-surface-alt"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text">
                          {m ? `Round ${m.round} · Match ${m.match_number}` : `Match #${dispute.match_id}`}
                        </p>
                        {m && (
                          <p className="text-xs text-text-muted truncate">
                            {m.participant1_name || "TBD"} vs {m.participant2_name || "TBD"}
                          </p>
                        )}
                      </div>
                      <Badge color={disputeBadgeColor(dispute.status)} size="sm">
                        {dispute.status}
                      </Badge>
                    </div>

                    <div className="mt-3 rounded-md bg-surface border border-border p-2.5">
                      <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1 flex items-center gap-1">
                        <Flag size={10} /> Filed by {disputeReporterName(dispute)}
                      </p>
                      <p className="text-sm text-text whitespace-pre-wrap break-words">{dispute.reason}</p>
                      <p className="text-[10px] text-text-muted mt-2">
                        {new Date(dispute.created_at).toLocaleString("en-GB")}
                      </p>
                    </div>

                    {isOpen ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          label="Resolution note"
                          value={disputeNotes[dispute.id] ?? ""}
                          onChange={(e) =>
                            setDisputeNotes((prev) => ({ ...prev, [dispute.id]: e.target.value }))
                          }
                          placeholder="Explain your decision (shown to the players)…"
                          maxLength={500}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            className="flex-1"
                            disabled={resolving}
                            onClick={() => handleResolveDispute(dispute, "resolved")}
                          >
                            {resolving ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <RefreshCw size={14} /> Uphold &amp; Replay
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1"
                            disabled={resolving}
                            onClick={() => handleResolveDispute(dispute, "dismissed")}
                          >
                            <XCircle size={14} /> Dismiss
                          </Button>
                        </div>
                      </div>
                    ) : (
                      dispute.resolution && (
                        <div className="mt-3 rounded-md bg-surface border border-border p-2.5">
                          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Resolution</p>
                          <p className="text-sm text-text whitespace-pre-wrap break-words">{dispute.resolution}</p>
                          {dispute.resolved_at && (
                            <p className="text-[10px] text-text-muted mt-2">
                              {new Date(dispute.resolved_at).toLocaleString("en-GB")}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════ Payouts View ═══════ */}
      {activeView === "payouts" && (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-surface-alt p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Paid Prize Pool</p>
                <p className="text-lg font-bold font-heading text-gold">{formatPrice(payoutPool)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Allocated</p>
                <p className="text-lg font-bold font-heading text-cyan">{formatPrice(payoutAllocated)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Net Payouts</p>
                <p className="text-lg font-bold font-heading text-green">{formatPrice(payoutNetTotal)}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
              Prize pool is calculated from paid tournament registrations. Draft payouts must be reviewed before CGE releases funds.
            </p>
          </div>

          {tournament.status !== "completed" && (
            <div className="rounded-lg border border-gold/20 bg-gold/5 p-3">
              <p className="text-xs text-gold font-semibold">Complete the tournament before generating payout drafts.</p>
              <p className="text-[11px] text-text-muted mt-1">
                This protects players by keeping prize release tied to final results.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Prize Placements</p>
            <div className="space-y-3">
              {payoutDistribution.map((item) => {
                const placement = placementsByPlace.get(item.place);
                return (
                  <div key={item.place} className="rounded-lg border border-border bg-surface-alt p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-semibold text-text">{item.label || formatPlacement(item.place)}</p>
                        <p className="text-[11px] text-text-muted">{item.percent}% of paid pool</p>
                      </div>
                      {placement && (
                        <Badge color={placement.source === "bracket_final" ? "cyan" : "magenta"} size="sm">
                          {placement.source === "bracket_final" ? "Bracket" : "Manual"}
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={placement?.user_id ?? ""}
                      onChange={(e) => handlePlacementChange(item.place, e.target.value)}
                      disabled={payoutLoading || payoutLocked || paidRegistrants.length === 0}
                      options={paidRegistrants.map((registrant) => ({
                        value: registrant.user_id,
                        label:
                          registrant.profile?.gamertag ||
                          registrant.profile?.full_name ||
                          `Player ${registrant.user_id.slice(0, 8)}`,
                      }))}
                    />
                  </div>
                );
              })}
            </div>
            {paidRegistrants.length === 0 && (
              <p className="mt-2 text-[11px] text-text-muted">
                No paid registrants are available for prize assignment yet.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              disabled={!canPreparePayouts || payoutLoading}
              onClick={handlePreparePayouts}
            >
              {payoutLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Preparing...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Generate Payout Draft
                </>
              )}
            </Button>
            <Button
              variant="magenta"
              size="sm"
              className="flex-1"
              disabled={!canApprovePayouts || payoutLoading}
              onClick={handleApprovePayouts}
            >
              <CheckCircle size={14} /> Approve Draft
            </Button>
          </div>

          {payoutError && (
            <p className="text-xs text-red text-center">{payoutError}</p>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Payout Ledger</p>
            {payoutLoading && payouts.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={22} className="animate-spin text-gold" />
              </div>
            ) : payouts.length === 0 ? (
              <div className="text-center py-10 rounded-lg border border-border bg-surface-alt">
                <Wallet size={28} className="mx-auto text-text-muted/30 mb-3" />
                <p className="text-sm text-text-muted">No payout draft generated yet</p>
                <p className="text-xs text-text-muted/60 mt-1">Assign placements, then generate a draft.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payouts.map((payout) => {
                  const recipientReady = Boolean(payout.profile?.payout_profile_verified_at);
                  const canRelease =
                    viewerIsAdmin &&
                    recipientReady &&
                    (payout.status === "approved" || payout.status === "failed");

                  return (
                    <div key={payout.id} className="rounded-lg border border-border bg-surface-alt p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text truncate">
                            {formatPlacement(payout.placement)} - {payout.profile?.gamertag || payout.profile?.full_name || "Player"}
                          </p>
                          <p className="text-[11px] text-text-muted">
                            {payout.percentage}% share - Gross {formatPrice(payout.gross_amount)}
                          </p>
                        </div>
                        <Badge color={payoutBadgeColor(payout.status)} size="sm">
                          {payout.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-md bg-surface border border-border p-2">
                          <span className="text-text-muted">Platform fee</span>
                          <p className="text-text font-semibold">{formatPrice(payout.platform_fee_amount)}</p>
                        </div>
                        <div className="rounded-md bg-surface border border-border p-2">
                          <span className="text-text-muted">Net release</span>
                          <p className="text-green font-semibold">{formatPrice(payout.net_amount)}</p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-md bg-surface border border-border p-2">
                        {recipientReady ? (
                          <p className="text-[11px] text-text-muted">
                            Recipient ready: {payout.profile?.payout_bank_name || "Bank"} ending {payout.profile?.payout_account_last4 || "****"}
                          </p>
                        ) : (
                          <p className="text-[11px] text-gold">
                            Winner needs to add payout account before CGE can release this prize.
                          </p>
                        )}
                      </div>
                      {(viewerIsAdmin || payout.status === "approved" || payout.status === "processing") && (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-[11px] text-text-muted">
                            {payout.status === "approved"
                              ? "Approved and waiting for CGE release."
                              : payout.status === "processing"
                                ? "Transfer submitted to Paystack."
                                : payout.status === "failed"
                                  ? "Release failed. Admin can retry after checking details."
                                  : payout.paystack_transfer_reference
                                    ? `Reference: ${payout.paystack_transfer_reference}`
                                    : "Release status will update here."}
                          </p>
                          {viewerIsAdmin && (payout.status === "approved" || payout.status === "failed") && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={payoutLoading || !recipientReady}
                              onClick={() => handleReleasePayout(payout)}
                            >
                              {payoutLoading ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                              Release
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <Modal open={open} onClose={onClose} title="Manage Tournament" width="lg">{content}</Modal>
      </div>
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title="Manage Tournament">
          <div className="px-4 py-3">{content}</div>
        </BottomSheet>
      </div>
      <MatchReportModal
        match={selectedMatch}
        open={selectedMatch !== null}
        onClose={() => setSelectedMatch(null)}
        onStart={handleStartMatch}
        onReport={handleReportMatch}
        onConfirm={handleConfirmMatch}
        onDispute={handleDisputeMatch}
        isHost
        loading={bracketLoading}
      />
    </>
  );
}
