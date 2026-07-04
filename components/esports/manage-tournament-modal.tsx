"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Loader2, Users, Settings, Trash2, Play, CheckCircle, XCircle, GitBranch, RefreshCw, Wallet, ShieldAlert, Flag, Sparkles, Lock, Plus, Trophy } from "lucide-react";
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
import { usePredictions } from "@/hooks/use-predictions";
import { useAuth } from "@/hooks/use-auth";
import type { Tournament, TournamentMatch, TournamentPayout, TournamentRegistrant, MatchDispute } from "@/lib/types";
import type { BracketParticipant, BracketType } from "@/lib/bracket-engine";

type ManageView = "details" | "registrants" | "bracket" | "disputes" | "payouts" | "prediction";

/** Platform points formatter — predictions never touch naira. */
function formatPts(points: number) {
  return `${points.toLocaleString("en-NG")} pts`;
}

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

function refundBadgeColor(status: string | null | undefined) {
  if (status === "refunded") return "green" as const;
  if (status === "failed") return "red" as const;
  return "gold" as const;
}

function refundBadgeLabel(status: string | null | undefined) {
  if (status === "refund_pending") return "pending";
  return status ?? "pending";
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
  // Cancellation + refund pipeline state
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  // Set after a successful cancel_tournament RPC so the modal reflects the
  // new state immediately (the parent's tournament prop refreshes on reload).
  const [cancelledLocally, setCancelledLocally] = useState(false);
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  // Prediction (Twitch-style, platform points) host tools state
  const [predQuestion, setPredQuestion] = useState("");
  const [predOptionLabels, setPredOptionLabels] = useState<string[]>(["", ""]);
  const [settleOptionId, setSettleOptionId] = useState("");
  const [confirmSettlePrediction, setConfirmSettlePrediction] = useState(false);
  const [confirmCancelPrediction, setConfirmCancelPrediction] = useState(false);

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
  const {
    prediction,
    pools: predictionPools,
    totalPoints: predictionTotal,
    loading: predictionLoading,
    actionLoading: predictionActionLoading,
    createPrediction,
    lockPrediction,
    settlePrediction,
    cancelPrediction,
  } = usePredictions(open && tournament ? tournament.id : null);

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
      setConfirmCancel(false);
      setCancelReason("");
      setCancelledLocally(false);
      setProcessingRefundId(null);
      setPredQuestion(`Who wins ${tournament.title}?`);
      setPredOptionLabels(["", ""]);
      setSettleOptionId("");
      setConfirmSettlePrediction(false);
      setConfirmCancelPrediction(false);
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

  const handleCancelTournament = useCallback(async () => {
    if (!tournament) return;

    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("Add a short reason — players will see it");
      return;
    }

    setCancelLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_tournament", {
      p_tournament_id: tournament.id,
      p_reason: reason,
    });
    setCancelLoading(false);

    if (error) {
      toast.error(error.message || "Could not cancel tournament");
      return;
    }

    toast.success("Tournament cancelled — paid entries queued for refund");
    setCancelledLocally(true);
    setConfirmCancel(false);
    if (onLoadRegistrants) {
      onLoadRegistrants(tournament.id).then(setRegistrants);
    }
  }, [tournament, cancelReason, onLoadRegistrants]);

  const handleProcessRefund = useCallback(
    async (registrant: TournamentRegistrant) => {
      if (!tournament) return;

      setProcessingRefundId(registrant.id);
      try {
        const response = await fetch(
          `/api/tournament-refunds/${registrant.id}/process`,
          { method: "POST" }
        );
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; status?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to process refund");
        }

        toast.success("Refund processed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to process refund");
      } finally {
        setProcessingRefundId(null);
        if (onLoadRegistrants) {
          onLoadRegistrants(tournament.id).then(setRegistrants);
        }
      }
    },
    [tournament, onLoadRegistrants]
  );

  const handleCreatePrediction = useCallback(async () => {
    const question = predQuestion.trim();
    const labels = predOptionLabels.map((label) => label.trim()).filter(Boolean);

    if (!question) {
      toast.error("Add a prediction question");
      return;
    }
    if (labels.length < 2) {
      toast.error("Add at least 2 option labels");
      return;
    }

    const errorMessage = await createPrediction(
      question,
      labels.map((label, index) => ({ id: `opt-${index + 1}`, label }))
    );
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.success("Prediction opened — viewers can stake points now");
      setPredOptionLabels(["", ""]);
    }
  }, [predQuestion, predOptionLabels, createPrediction]);

  const handleLockPrediction = useCallback(async () => {
    if (!prediction) return;
    const errorMessage = await lockPrediction(prediction.id);
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.success("Prediction locked — no more stakes");
    }
  }, [prediction, lockPrediction]);

  const handleSettlePrediction = useCallback(async () => {
    if (!prediction || !settleOptionId) return;
    const errorMessage = await settlePrediction(prediction.id, settleOptionId);
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.success("Prediction settled — winners have been paid out");
    }
    setConfirmSettlePrediction(false);
    setSettleOptionId("");
  }, [prediction, settleOptionId, settlePrediction]);

  const handleCancelPrediction = useCallback(async () => {
    if (!prediction) return;
    const errorMessage = await cancelPrediction(prediction.id);
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.success("Prediction cancelled — all stakes refunded");
    }
    setConfirmCancelPrediction(false);
  }, [prediction, cancelPrediction]);

  if (!tournament) return null;

  const showCustomGame = game === "Other";
  const resolvedGame = showCustomGame ? customGame.trim() : game;
  const effectiveStatus = cancelledLocally ? "cancelled" : tournament.status;
  const isEditable = effectiveStatus === "open" || effectiveStatus === "full";
  const filledCount = getFilledCount(tournament);
  const openDisputeCount = disputes.filter((d) => d.status === "open").length;
  const payoutDistribution = getPayoutDistribution(tournament);
  const placementsByPlace = new Map(placements.map((p) => [p.placement, p]));
  const paidRegistrants = registrants.filter((r) => r.payment_status === "paid");
  // Entries queued through cancel_tournament (pending / refunded / failed)
  const refundableRegistrants = registrants.filter((r) => Boolean(r.refund_status));
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
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "prediction"}
          onClick={() => setActiveView("prediction")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0",
            "active:scale-95",
            activeView === "prediction"
              ? "bg-cyan/10 text-cyan border border-cyan/25"
              : "bg-surface-alt text-text-muted border border-border hover:border-cyan/20"
          )}
        >
          <Sparkles size={14} />
          Prediction
          {prediction && (prediction.status === "open" || prediction.status === "locked") && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan/10 text-cyan text-[10px] font-bold uppercase">
              {prediction.status === "open" ? "Live" : "Locked"}
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
                  effectiveStatus === "open" ? "green" :
                  effectiveStatus === "in_progress" ? "cyan" :
                  effectiveStatus === "completed" ? "gold" :
                  effectiveStatus === "full" ? "red" : "red"
                }
                size="md"
              >
                {effectiveStatus === "open" ? "Open" :
                 effectiveStatus === "in_progress" ? "Live" :
                 effectiveStatus === "completed" ? "Completed" :
                 effectiveStatus === "full" ? "Full" : "Cancelled"}
              </Badge>
            </div>
            <span className="text-xs text-text-muted">{filledCount}/{tournament.slots} registered</span>
          </div>

          {effectiveStatus === "cancelled" && (
            <div className="rounded-lg border border-red/20 bg-red/5 p-3">
              <p className="text-xs font-semibold text-red">Tournament cancelled</p>
              {(tournament.cancellation_reason || (cancelledLocally && cancelReason.trim())) && (
                <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                  Reason: {tournament.cancellation_reason || cancelReason.trim()}
                </p>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                Paid entries are queued for refund — track them in the Payouts tab.
              </p>
            </div>
          )}

          {(effectiveStatus === "open" || effectiveStatus === "full") && !confirmCancel && (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={loading || cancelLoading} onClick={() => handleStatusChange("in_progress")} className="flex-1">
                <Play size={14} /> Start Tournament
              </Button>
              <Button variant="danger" size="sm" disabled={loading || cancelLoading} onClick={() => setConfirmCancel(true)}>
                <XCircle size={14} /> Cancel Tournament
              </Button>
            </div>
          )}

          {(effectiveStatus === "open" || effectiveStatus === "full") && confirmCancel && (
            <div className="rounded-lg border border-red/30 bg-red/5 p-3 space-y-3">
              <p className="text-xs font-semibold text-red">Cancel this tournament?</p>
              <p className="text-[11px] leading-relaxed text-text-muted">
                All paid entries will be refunded. Players will see your reason on the tournament page.
              </p>
              <Textarea
                label="Reason for cancellation"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Not enough registrations to run the bracket"
                maxLength={300}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  className="flex-1"
                  disabled={cancelLoading || cancelReason.trim().length === 0}
                  onClick={handleCancelTournament}
                >
                  {cancelLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <XCircle size={14} /> Cancel &amp; Refund Entries
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" disabled={cancelLoading} onClick={() => setConfirmCancel(false)}>
                  Keep Tournament
                </Button>
              </div>
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

          {tournament.status !== "completed" && effectiveStatus !== "cancelled" && (
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

          {(effectiveStatus === "cancelled" || refundableRegistrants.length > 0) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">Entry Fee Refunds</p>
              {refundableRegistrants.length === 0 ? (
                <div className="rounded-lg border border-border bg-surface-alt p-3">
                  <p className="text-[11px] text-text-muted">No paid entries to refund.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {refundableRegistrants.map((registrant) => {
                    const processing = processingRefundId === registrant.id;
                    const canProcess =
                      viewerIsAdmin &&
                      (registrant.refund_status === "refund_pending" ||
                        registrant.refund_status === "failed");

                    return (
                      <div key={registrant.id} className="rounded-lg border border-border bg-surface-alt p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text truncate">
                              {registrant.profile?.gamertag || registrant.profile?.full_name || "Player"}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              Entry {formatPrice(registrant.total ?? 0)}
                            </p>
                          </div>
                          <Badge color={refundBadgeColor(registrant.refund_status)} size="sm">
                            {refundBadgeLabel(registrant.refund_status)}
                          </Badge>
                        </div>
                        {registrant.refund_status === "refunded" && registrant.refunded_at && (
                          <p className="mt-2 text-[11px] text-text-muted">
                            Refunded on {new Date(registrant.refunded_at).toLocaleDateString("en-GB")}
                            {registrant.refund_reference ? ` — ref ${registrant.refund_reference}` : ""}
                          </p>
                        )}
                        {registrant.refund_status === "failed" && registrant.refund_notes && (
                          <p className="mt-2 text-[11px] text-red">{registrant.refund_notes}</p>
                        )}
                        {canProcess && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={processing}
                              onClick={() => handleProcessRefund(registrant)}
                            >
                              {processing ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                              {registrant.refund_status === "failed" ? "Retry refund" : "Process refund"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!viewerIsAdmin && refundableRegistrants.length > 0 && (
                <p className="mt-2 text-[11px] text-text-muted">
                  CGE admins release Paystack refunds from here. Players see their refund status on the tournament page.
                </p>
              )}
            </div>
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
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge color={payoutBadgeColor(payout.status)} size="sm">
                            {payout.status.replace(/_/g, " ")}
                          </Badge>
                          {payout.host_is_payee && (
                            <Badge color="red" size="sm">
                              <ShieldAlert size={10} /> Host is payee
                            </Badge>
                          )}
                        </div>
                      </div>
                      {payout.host_is_payee && (
                        <p className="mt-2 text-[11px] text-red">
                          This prize goes to the tournament host. Verify the bracket
                          result before approving or releasing.
                        </p>
                      )}
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

      {/* ═══════ Prediction View (platform points, never cash) ═══════ */}
      {activeView === "prediction" && (
        <div className="space-y-5">
          <div className="rounded-lg border border-cyan/20 bg-cyan/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan flex items-center gap-1.5">
              <Sparkles size={12} /> Crowd Predictions
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Viewers stake free platform points on an outcome. Winners split the
              losing pool proportionally and get their stake back. Points are never
              cash and never refundable to naira.
            </p>
          </div>

          {predictionLoading && !prediction ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="animate-spin text-cyan" />
            </div>
          ) : (
            <>
              {/* ── Existing prediction: pool overview + controls ── */}
              {prediction && (
                <div className="rounded-lg border border-border bg-surface-alt p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-text">{prediction.question}</p>
                    <Badge
                      color={
                        prediction.status === "open"
                          ? "green"
                          : prediction.status === "locked"
                            ? "gold"
                            : "cyan"
                      }
                      size="sm"
                    >
                      {prediction.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    {prediction.options.map((option) => {
                      const pool = predictionPools.find((p) => p.option_id === option.id);
                      const percent = Math.round(pool?.percent ?? 0);
                      const isWinner = prediction.winning_option === option.id;
                      return (
                        <div
                          key={option.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-md border p-2",
                            isWinner ? "border-gold/40 bg-gold/5" : "border-border bg-surface"
                          )}
                        >
                          <p className={cn("text-xs font-semibold truncate", isWinner ? "text-gold" : "text-text")}>
                            {isWinner && <Trophy size={11} className="inline mr-1 -mt-0.5" />}
                            {option.label}
                          </p>
                          <p className="text-[11px] text-text-muted shrink-0">
                            {formatPts(pool?.points ?? 0)} · {percent}%
                            {pool && pool.stakers > 0 ? ` · ${pool.stakers} backer${pool.stakers === 1 ? "" : "s"}` : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-text-muted">
                    Total staked: <span className="font-semibold text-text">{formatPts(predictionTotal)}</span>
                  </p>

                  {effectiveStatus === "cancelled" &&
                    (prediction.status === "open" || prediction.status === "locked") && (
                      <div className="rounded-md border border-gold/25 bg-gold/5 p-2.5">
                        <p className="text-[11px] leading-relaxed text-gold">
                          This tournament is cancelled — staking is already blocked. Cancel
                          the prediction below to refund everyone&apos;s points (or settle it
                          if the result was already decided).
                        </p>
                      </div>
                    )}

                  {/* Lifecycle controls */}
                  {(prediction.status === "open" || prediction.status === "locked") && (
                    <div className="space-y-3 border-t border-border pt-3">
                      {prediction.status === "open" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          disabled={predictionActionLoading}
                          onClick={handleLockPrediction}
                        >
                          <Lock size={14} /> Lock Predictions
                        </Button>
                      )}

                      {/* Settle: pick winner + confirm */}
                      {!confirmSettlePrediction ? (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Select
                              value={settleOptionId}
                              onChange={(e) => setSettleOptionId(e.target.value)}
                              options={prediction.options.map((option) => ({
                                value: option.id,
                                label: option.label,
                              }))}
                            />
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={predictionActionLoading || !settleOptionId}
                            onClick={() => setConfirmSettlePrediction(true)}
                          >
                            <CheckCircle size={14} /> Settle
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-3 space-y-2">
                          <p className="text-xs font-semibold text-cyan">
                            Settle with &quot;
                            {prediction.options.find((o) => o.id === settleOptionId)?.label}
                            &quot; as the winner?
                          </p>
                          <p className="text-[11px] leading-relaxed text-text-muted">
                            Winners get their stake back plus a share of the losing pool.
                            This pays out points immediately and cannot be undone.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex-1"
                              disabled={predictionActionLoading}
                              onClick={handleSettlePrediction}
                            >
                              {predictionActionLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle size={14} /> Confirm &amp; Pay Out
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={predictionActionLoading}
                              onClick={() => setConfirmSettlePrediction(false)}
                            >
                              Back
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Cancel + refund */}
                      {!confirmCancelPrediction ? (
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={predictionActionLoading}
                          onClick={() => setConfirmCancelPrediction(true)}
                        >
                          <XCircle size={14} /> Cancel Prediction
                        </Button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-red flex-1">
                            Cancel and refund all {formatPts(predictionTotal)} staked?
                          </p>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={predictionActionLoading}
                            onClick={handleCancelPrediction}
                          >
                            {predictionActionLoading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              "Yes, Refund All"
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={predictionActionLoading}
                            onClick={() => setConfirmCancelPrediction(false)}
                          >
                            Keep
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {prediction.status === "settled" && (
                    <p className="text-[11px] text-text-muted">
                      Settled{prediction.settled_at ? ` on ${new Date(prediction.settled_at).toLocaleString("en-GB")}` : ""}
                      {" — winning option: "}
                      <span className="font-semibold text-gold">
                        {prediction.options.find((o) => o.id === prediction.winning_option)?.label ?? "—"}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* ── Create form (no active prediction) ── */}
              {(!prediction || prediction.status === "settled") &&
                (effectiveStatus === "completed" || effectiveStatus === "cancelled" ? (
                  <p className="text-xs text-text-muted text-center py-4">
                    Predictions can only be opened while the tournament is running.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="border-t border-border pt-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
                        {prediction ? "New Prediction" : "Open a Prediction"}
                      </p>
                    </div>
                    <Input
                      label="Question"
                      value={predQuestion}
                      onChange={(e) => setPredQuestion(e.target.value)}
                      maxLength={140}
                      placeholder={`Who wins ${tournament.title}?`}
                    />
                    <div className="space-y-2">
                      <p className="text-xs text-text-muted">Options (2–6)</p>
                      {predOptionLabels.map((label, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={label}
                            onChange={(e) =>
                              setPredOptionLabels((prev) =>
                                prev.map((l, i) => (i === index ? e.target.value : l))
                              )
                            }
                            maxLength={60}
                            placeholder={`Option ${index + 1}`}
                          />
                          {predOptionLabels.length > 2 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Remove option ${index + 1}`}
                              onClick={() =>
                                setPredOptionLabels((prev) => prev.filter((_, i) => i !== index))
                              }
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      ))}
                      {predOptionLabels.length < 6 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPredOptionLabels((prev) => [...prev, ""])}
                        >
                          <Plus size={14} /> Add Option
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="magenta"
                      fullWidth
                      disabled={
                        predictionActionLoading ||
                        !predQuestion.trim() ||
                        predOptionLabels.filter((l) => l.trim()).length < 2
                      }
                      onClick={handleCreatePrediction}
                    >
                      {predictionActionLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Opening...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Open Prediction
                        </>
                      )}
                    </Button>
                  </div>
                ))}
            </>
          )}
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
