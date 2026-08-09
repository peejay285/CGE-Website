"use client";

import { useEffect, useState } from "react";
import { Sparkles, Lock, Trophy, Loader2, Coins } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePredictions } from "@/hooks/use-predictions";
import { useAuth } from "@/hooks/use-auth";

/** Platform points formatter — points are never naira, never cashable. */
function formatPts(points: number) {
  return `${points.toLocaleString("en-NG")} pts`;
}

const QUICK_CHIPS = [50, 100, 500];
const MIN_STAKE = 10;
const MAX_STAKE = 10000;

// Twitch-style two-tone palette, cycled across up to 6 options.
// Static class strings so Tailwind picks them up.
const OPTION_STYLES = [
  {
    bar: "bg-cyan/60",
    text: "text-cyan",
    ring: "border-cyan/40 bg-cyan/5",
  },
  {
    bar: "bg-magenta/60",
    text: "text-magenta",
    ring: "border-magenta/40 bg-magenta/5",
  },
];

interface PredictionPanelProps {
  tournamentId: number;
}

/**
 * Crowd prediction panel for the tournament detail modal.
 * Renders nothing when the tournament has no (non-cancelled)
 * prediction — hosts create one from the Manage modal.
 */
export function PredictionPanel({ tournamentId }: PredictionPanelProps) {
  const { user } = useAuth();
  const {
    prediction,
    pools,
    totalPoints,
    viewerStake,
    viewerPoints,
    loading,
    actionLoading,
    placeStake,
  } = usePredictions(tournamentId);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pointsInput, setPointsInput] = useState("100");

  // Reset the stake form when a different prediction loads. Restructuring
  // this into a keyed remount of the panel body would change DOM identity
  // (focus, animations) for no user-visible gain, so the one-shot reset
  // stays an effect with a targeted exemption.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot form reset keyed on prediction id
    setSelectedOption(null);
    setPointsInput("100");
  }, [prediction?.id]);

  // Nothing to show: still loading, or no prediction exists.
  if (loading && !prediction) return null;
  if (!prediction) return null;

  const optionLabel = (optionId: string | null) =>
    prediction.options.find((o) => o.id === optionId)?.label ?? "—";

  const winningPool =
    pools.find((p) => p.option_id === prediction.winning_option)?.points ?? 0;
  const losingPool = totalPoints - winningPool;

  const isOpen = prediction.status === "open";
  const isLocked = prediction.status === "locked";
  const isSettled = prediction.status === "settled";
  const canStake = isOpen && Boolean(user) && !viewerStake;

  async function handleStake() {
    if (!prediction) return;
    if (!selectedOption) {
      toast.error("Pick an option first");
      return;
    }
    const points = Number(pointsInput);
    if (!Number.isInteger(points) || points < MIN_STAKE || points > MAX_STAKE) {
      toast.error(
        `Stake must be between ${MIN_STAKE} and ${MAX_STAKE.toLocaleString("en-NG")} points`
      );
      return;
    }
    if (viewerPoints != null && points > viewerPoints) {
      toast.error("Not enough points");
      return;
    }

    const errorMessage = await placeStake(prediction.id, selectedOption, points);
    if (errorMessage) {
      toast.error(errorMessage);
    } else {
      toast.success(
        `Stake placed — ${formatPts(points)} on ${optionLabel(selectedOption)}`
      );
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted flex items-center gap-2">
          <Sparkles size={14} className="text-cyan" />
          Crowd Prediction
        </h4>
        <Badge
          color={isOpen ? "green" : isLocked ? "gold" : isSettled ? "cyan" : "neutral"}
          size="sm"
        >
          {isOpen ? "Open" : isLocked ? "Locked" : "Settled"}
        </Badge>
      </div>

      <div className="rounded-lg border border-border bg-surface-alt p-3">
        <p className="text-sm font-semibold text-text mb-3">{prediction.question}</p>

        {/* Option pools with percentage bars */}
        <div className="space-y-2 mb-3">
          {prediction.options.map((option, index) => {
            const pool = pools.find((p) => p.option_id === option.id);
            const percent = pool?.percent ?? 0;
            const style = OPTION_STYLES[index % OPTION_STYLES.length];
            const isWinner = isSettled && prediction.winning_option === option.id;
            const isSelectable = canStake;
            const isSelected = selectedOption === option.id;
            const isYourPick = viewerStake?.option_id === option.id;

            return (
              <button
                key={option.id}
                type="button"
                disabled={!isSelectable}
                onClick={() => isSelectable && setSelectedOption(option.id)}
                className={cn(
                  "relative w-full overflow-hidden rounded-lg border p-2.5 text-left transition-colors",
                  isSelectable && "cursor-pointer",
                  isWinner
                    ? "border-gold/50 bg-gold/5"
                    : isSelected
                      ? style.ring
                      : "border-border bg-surface",
                  isSelectable && !isSelected && "hover:border-cyan/30"
                )}
              >
                {/* Pool share bar */}
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 opacity-20 transition-all duration-500",
                    isWinner ? "bg-gold" : style.bar
                  )}
                  style={{ width: `${Math.max(percent, 0)}%` }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        isWinner ? "text-gold" : "text-text"
                      )}
                    >
                      {isWinner && <Trophy size={12} className="inline mr-1.5 -mt-0.5" />}
                      {option.label}
                      {isYourPick && (
                        <span className={cn("ml-2 text-[10px] uppercase tracking-widest", style.text)}>
                          Your pick
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {formatPts(pool?.points ?? 0)}
                      {pool && pool.stakers > 0
                        ? ` · ${pool.stakers} backer${pool.stakers === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  <span className={cn("text-sm font-bold font-heading shrink-0", isWinner ? "text-gold" : style.text)}>
                    {Math.round(percent)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-text-muted mb-1">
          Total staked:{" "}
          <span className="font-semibold text-text">{formatPts(totalPoints)}</span>
          <span className="ml-1">— free platform points, never cash.</span>
        </p>

        {/* Viewer's stake summary */}
        {viewerStake && (
          <p className="text-[11px] text-cyan mb-1">
            Your pick: {optionLabel(viewerStake.option_id)} ({formatPts(viewerStake.points)})
          </p>
        )}

        {/* ── Open: stake UI ── */}
        {canStake && (
          <div className="mt-3 border-t border-border pt-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                <Coins size={12} className="text-gold" />
                Balance:{" "}
                <span className="font-semibold text-text">
                  {viewerPoints != null ? formatPts(viewerPoints) : "—"}
                </span>
              </p>
              <div className="flex gap-1.5">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setPointsInput(String(chip))}
                    className={cn(
                      "px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-colors cursor-pointer",
                      pointsInput === String(chip)
                        ? "border-cyan/40 bg-cyan/10 text-cyan"
                        : "border-border bg-surface text-text-muted hover:border-cyan/30"
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={MIN_STAKE}
                max={MAX_STAKE}
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                placeholder={`${MIN_STAKE}–${MAX_STAKE}`}
                className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-cyan/50 focus:outline-none"
                aria-label="Points to stake"
              />
              <Button
                size="sm"
                variant="primary"
                className="flex-1"
                disabled={actionLoading || !selectedOption}
                onClick={handleStake}
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Staking...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {selectedOption
                      ? `Stake on ${optionLabel(selectedOption)}`
                      : "Stake"}
                  </>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-text-muted">
              One stake per prediction, {MIN_STAKE}–{MAX_STAKE.toLocaleString("en-NG")} points.
              No edits after placing. Winners split the losing pool.
            </p>
          </div>
        )}

        {/* ── Open + already staked ── */}
        {isOpen && Boolean(user) && viewerStake && (
          <p className="mt-2 text-[11px] text-text-muted">
            Stake locked in — good luck! Payouts land when the host settles the result.
          </p>
        )}

        {/* ── Signed out ── */}
        {isOpen && !user && (
          <div className="mt-3 border-t border-border pt-3">
            <Button
              size="sm"
              variant="secondary"
              fullWidth
              onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
            >
              Sign in to predict
            </Button>
          </div>
        )}

        {/* ── Locked ── */}
        {isLocked && (
          <p className="mt-2 text-[11px] text-gold flex items-center gap-1.5">
            <Lock size={12} />
            Predictions locked — waiting for the result.
          </p>
        )}

        {/* ── Settled: viewer outcome ── */}
        {isSettled && viewerStake && (
          <div className="mt-2">
            {winningPool === 0 ? (
              <p className="text-[11px] text-text-muted">
                No one picked the winner — all stakes were refunded, including your{" "}
                {formatPts(viewerStake.points)}.
              </p>
            ) : viewerStake.option_id === prediction.winning_option ? (
              <p className="text-xs font-semibold text-green">
                You won +
                {formatPts(
                  Math.floor((losingPool * viewerStake.points) / winningPool)
                )}{" "}
                (stake returned)
              </p>
            ) : (
              <p className="text-xs font-semibold text-red">
                You lost {formatPts(viewerStake.points)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
