"use client";

import { useState } from "react";
import { Loader2, Trophy, AlertTriangle, Flag, Play, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TournamentMatch } from "@/lib/types";

interface MatchReportModalProps {
  match: TournamentMatch | null;
  open: boolean;
  onClose: () => void;
  onStart?: (matchId: number) => Promise<void>;
  onReport?: (matchId: number, winnerId: string, score1: number, score2: number) => Promise<void>;
  onConfirm?: (matchId: number) => Promise<void>;
  onDispute?: (matchId: number, reason: string) => Promise<void>;
  currentUserId?: string;
  isHost?: boolean;
  loading?: boolean;
}

export function MatchReportModal({
  match,
  open,
  onClose,
  onStart,
  onReport,
  onConfirm,
  onDispute,
  currentUserId,
  isHost,
  loading,
}: MatchReportModalProps) {
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);

  if (!match) return null;

  const isParticipant =
    currentUserId === match.participant1_id || currentUserId === match.participant2_id;
  const isComplete = match.status === "completed";
  const isAwaiting = match.status === "awaiting_confirmation";
  const showResult = isComplete || isAwaiting;
  // Whoever reported the parked result can't confirm their own claim.
  const isReporter = Boolean(currentUserId && match.reported_by && currentUserId === match.reported_by);
  const canReport =
    (isParticipant || isHost) &&
    (match.status === "pending" || match.status === "in_progress");
  const canStart =
    Boolean(onStart) &&
    (isParticipant || isHost) &&
    match.status === "pending" &&
    Boolean(match.participant1_id) &&
    Boolean(match.participant2_id);
  // Opponent (or host) can confirm an awaiting result; the reporter waits.
  const canConfirm = isAwaiting && Boolean(onConfirm) && ((isParticipant && !isReporter) || Boolean(isHost));
  const claimedWinnerName =
    match.winner_id === match.participant1_id
      ? match.participant1_name
      : match.winner_id === match.participant2_id
        ? match.participant2_name
        : null;

  async function handleStart() {
    if (!onStart) return;
    await onStart(match!.id);
  }

  function handleReport(winnerId: string) {
    if (!onReport || !score1 || !score2) return;
    onReport(match!.id, winnerId, Number(score1), Number(score2));
  }

  async function handleConfirm() {
    if (!onConfirm) return;
    await onConfirm(match!.id);
  }

  async function handleDispute() {
    if (!onDispute || !disputeReason.trim()) return;
    await onDispute(match!.id, disputeReason.trim());
    setShowDispute(false);
    setDisputeReason("");
  }

  const content = (
    <div className="space-y-6">
      {/* Match header */}
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
          Round {match.round} &middot; Match {match.match_number}
        </p>
        {match.status === "disputed" && (
          <Badge color="red" size="md">
            <AlertTriangle size={12} className="mr-1" />
            Disputed
          </Badge>
        )}
        {match.status === "in_progress" && (
          <Badge color="cyan" size="md">Live</Badge>
        )}
        {isAwaiting && (
          <Badge color="gold" size="md">Awaiting Confirmation</Badge>
        )}
      </div>

      {/* VS Display */}
      <div className="flex items-center gap-4">
        {/* Player 1 */}
        <div
          className={cn(
            "flex-1 p-4 rounded-xl border text-center",
            showResult && match.winner_id === match.participant1_id
              ? "bg-green/5 border-green/30"
              : "bg-surface-alt border-border"
          )}
        >
          {match.participant1_seed && (
            <p className="text-[10px] text-text-muted mb-1">Seed {match.participant1_seed}</p>
          )}
          <p className={cn(
            "text-sm font-bold font-heading",
            match.participant1_id === currentUserId ? "text-cyan" : "text-text"
          )}>
            {match.participant1_name || "TBD"}
          </p>
          {showResult && match.participant1_score !== null && (
            <p className="text-2xl font-bold font-heading text-text mt-2">
              {match.participant1_score}
            </p>
          )}
          {showResult && match.winner_id === match.participant1_id && (
            <Trophy size={16} className="text-gold mx-auto mt-1" />
          )}
        </div>

        {/* VS */}
        <div className="text-sm font-bold text-text-muted">VS</div>

        {/* Player 2 */}
        <div
          className={cn(
            "flex-1 p-4 rounded-xl border text-center",
            showResult && match.winner_id === match.participant2_id
              ? "bg-green/5 border-green/30"
              : "bg-surface-alt border-border"
          )}
        >
          {match.participant2_seed && (
            <p className="text-[10px] text-text-muted mb-1">Seed {match.participant2_seed}</p>
          )}
          <p className={cn(
            "text-sm font-bold font-heading",
            match.participant2_id === currentUserId ? "text-cyan" : "text-text"
          )}>
            {match.participant2_name || "TBD"}
          </p>
          {showResult && match.participant2_score !== null && (
            <p className="text-2xl font-bold font-heading text-text mt-2">
              {match.participant2_score}
            </p>
          )}
          {showResult && match.winner_id === match.participant2_id && (
            <Trophy size={16} className="text-gold mx-auto mt-1" />
          )}
        </div>
      </div>

      {canStart && (
        <Button
          variant="primary"
          fullWidth
          disabled={loading}
          onClick={handleStart}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Start Match
        </Button>
      )}

      {/* Awaiting confirmation: opponent confirms or disputes the claim */}
      {isAwaiting && !showDispute && (
        <div className="space-y-3">
          <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-center">
            <p className="text-xs text-text">
              {claimedWinnerName ? (
                <>
                  <span className="font-semibold text-gold">{claimedWinnerName}</span> was reported as the winner.
                </>
              ) : (
                "A result has been reported."
              )}
            </p>
            {match.reported_at && (
              <p className="text-[10px] text-text-muted mt-1">
                Reported {new Date(match.reported_at).toLocaleString("en-GB")}
              </p>
            )}
          </div>

          {canConfirm ? (
            <div className="space-y-2">
              <Button variant="primary" fullWidth disabled={loading} onClick={handleConfirm}>
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Check size={14} />
                    {isHost && !isParticipant ? "Force Confirm Result" : "Confirm Result"}
                  </>
                )}
              </Button>
              {onDispute && (
                <button
                  type="button"
                  onClick={() => setShowDispute(true)}
                  className="w-full text-center text-[11px] text-text-muted hover:text-red transition-colors cursor-pointer py-2 flex items-center justify-center gap-1.5"
                >
                  <Flag size={12} />
                  This result is wrong — dispute it
                </button>
              )}
            </div>
          ) : isReporter ? (
            <p className="text-xs text-text-muted text-center">
              Waiting for your opponent to confirm this result.
            </p>
          ) : null}
        </div>
      )}

      {/* Score reporting form */}
      {canReport && !showDispute && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Report Score
          </p>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">
                {match.participant1_name || "Player 1"}
              </label>
              <input
                type="number"
                min={0}
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-alt text-center text-lg font-bold font-heading text-text focus:outline-none focus:ring-1 focus:ring-cyan/40"
                aria-label={`Score for ${match.participant1_name || "Player 1"}`}
              />
            </div>
            <span className="text-text-muted font-bold mt-5">-</span>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-text-muted block mb-1">
                {match.participant2_name || "Player 2"}
              </label>
              <input
                type="number"
                min={0}
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface-alt text-center text-lg font-bold font-heading text-text focus:outline-none focus:ring-1 focus:ring-cyan/40"
                aria-label={`Score for ${match.participant2_name || "Player 2"}`}
              />
            </div>
          </div>

          {/* Winner selection */}
          {score1 && score2 && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">Select the winner:</p>
              <div className="flex gap-2">
                {match.participant1_id && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => handleReport(match.participant1_id!)}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Trophy size={14} />
                        {match.participant1_name} Wins
                      </>
                    )}
                  </Button>
                )}
                {match.participant2_id && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    disabled={loading}
                    onClick={() => handleReport(match.participant2_id!)}
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Trophy size={14} />
                        {match.participant2_name} Wins
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Dispute button */}
          {isParticipant && onDispute && (
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              className="w-full text-center text-[11px] text-text-muted hover:text-red transition-colors cursor-pointer py-2 flex items-center justify-center gap-1.5"
            >
              <Flag size={12} />
              Dispute this match
            </button>
          )}
        </div>
      )}

      {/* Dispute form */}
      {showDispute && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-red">
            File a Dispute
          </p>
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Describe the issue (e.g., incorrect score, disconnection, rule violation)..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-red/30 bg-surface-alt text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-red/40 resize-none"
            aria-label="Dispute reason"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              disabled={!disputeReason.trim() || loading}
              onClick={handleDispute}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Submit Dispute"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowDispute(false);
                setDisputeReason("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Completed match info */}
      {isComplete && match.reported_at && (
        <p className="text-[10px] text-text-muted text-center">
          Reported {new Date(match.reported_at).toLocaleString("en-GB")}
          {match.confirmed_at && ` • Confirmed ${new Date(match.confirmed_at).toLocaleString("en-GB")}`}
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <Modal open={open} onClose={onClose} title="Match Details">
          {content}
        </Modal>
      </div>
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title="Match Details">
          <div className="px-4 py-3">{content}</div>
        </BottomSheet>
      </div>
    </>
  );
}
