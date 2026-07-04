"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Gamepad2, Users, Trophy, Swords, Medal, Loader2, Settings, Share2, Video, CheckCircle, GitBranch, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { UnverifiedOrganizerDialog } from "@/components/esports/unverified-organizer-dialog";
import { cn, formatPrice, sanitizeUrl } from "@/lib/utils";
import {
  getGameEmoji,
  STATUS_CONFIG,
  getFilledCount,
  getPayoutDistribution,
  estimatePrizePool,
  placementAmount,
  formatPlacement,
  DEFAULT_TOURNAMENT_RULES,
  formatTournamentDate,
  formatTournamentTime,
} from "@/lib/esports-utils";
import type { TournamentWithCount } from "@/lib/esports-utils";
import { useCountdown } from "@/hooks/use-countdown";
import type { Team, TournamentRegistration, TournamentTeamRegistration } from "@/lib/types";

interface TournamentDetailModalProps {
  tournament: TournamentWithCount | null;
  open: boolean;
  onClose: () => void;
  onRegister?: (tournamentId: number) => void;
  onPayRegistration?: (tournamentId: number) => void;
  onUnregister?: (tournamentId: number) => void;
  registerLoading?: boolean;
  isRegistered?: boolean;
  registration?: TournamentRegistration | TournamentTeamRegistration | null;
  currentTeam?: Team | null;
  currentTeamMemberCount?: number;
  currentUserId?: string;
  onCreateTeam?: () => void;
  isPast?: boolean;
  isHost?: boolean;
  onManage?: () => void;
}

export function TournamentDetailModal({
  tournament,
  open,
  onClose,
  onRegister,
  onPayRegistration,
  onUnregister,
  registerLoading,
  isRegistered,
  registration,
  currentTeam,
  currentTeamMemberCount,
  currentUserId,
  onCreateTeam,
  isPast,
  isHost,
  onManage,
}: TournamentDetailModalProps) {
  const [showUnverifiedGate, setShowUnverifiedGate] = useState(false);
  // Client-side gate (Battlefy pattern): must confirm the rules before
  // the register CTA unlocks. Nothing is stored server-side.
  const [rulesAgreed, setRulesAgreed] = useState(false);

  // Reset the agreement whenever a different tournament opens.
  useEffect(() => {
    setRulesAgreed(false);
  }, [tournament?.id, open]);

  // Live countdown — hooks must run before the early return below.
  const liveCountdown = useCountdown(
    tournament?.date ?? "",
    tournament?.time ?? "",
    Boolean(tournament) && tournament?.status === "open"
  );

  // The rules section renders twice (desktop Modal + mobile BottomSheet),
  // so scroll to whichever instance is actually visible.
  const scrollToRules = useCallback(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-tournament-rules]");
    for (const node of nodes) {
      if (node.offsetParent !== null) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (!tournament) return;
    // Canonical shareable tournament page URL.
    const shareUrl = `${window.location.origin}/esports/${tournament.id}`;
    const shareText = `${tournament.title} — ${tournament.game} tournament on CGE Esports`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: tournament.title,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled — do nothing
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      } catch {
        // Ignore
      }
    }
  }, [tournament]);

  if (!tournament) return null;

  const emoji = getGameEmoji(tournament.game);
  const status = STATUS_CONFIG[tournament.status];
  const isFull = tournament.status === "full";
  const isTeamEvent = Number(tournament.team_size ?? 1) > 1;
  const requiredTeamSize = Math.max(2, Number(tournament.team_size ?? 2));
  const resolvedTeamMemberCount =
    currentTeamMemberCount ?? currentTeam?.member_count ?? 0;
  const isTeamCaptain = Boolean(
    currentTeam && currentUserId && currentTeam.captain_id === currentUserId
  );
  const teamMissingCount = Math.max(0, requiredTeamSize - resolvedTeamMemberCount);
  const filledCount = getFilledCount(tournament);
  const countdown = liveCountdown;
  const distribution = getPayoutDistribution(tournament);
  const pool = estimatePrizePool(tournament);
  const isDynamicPool = pool.isEstimate && tournament.entry_fee > 0;
  // Compact "1st ₦X · 2nd ₦Y · 3rd ₦Z" line (percent-only when no pool yet).
  const breakdownLine = distribution
    .map((entry) =>
      pool.amount > 0
        ? `${formatPlacement(entry.place)} ${formatPrice(
            placementAmount(pool.amount, entry.percent)
          )}`
        : `${formatPlacement(entry.place)} ${entry.percent}%`
    )
    .join(" · ");
  const organizer = tournament.organizer;
  const organizerName = organizer?.gamertag || organizer?.full_name || "Organizer";
  const organizerVerified =
    organizer?.is_id_verified ||
    organizer?.trust_level === "verified" ||
    organizer?.trust_level === "trusted" ||
    organizer?.trust_level === "power";
  const organizerEventCount = organizer?.tournament_count ?? 0;
  const registrationTotal = registration?.total ?? tournament.entry_fee;
  const paymentPending =
    Boolean(isRegistered) &&
    registrationTotal > 0 &&
    registration?.payment_status !== "paid";
  const isCancelled = tournament.status === "cancelled";
  // Paid entry that gets refunded when the tournament is cancelled.
  const hasPaidEntry =
    Boolean(isRegistered) &&
    registration?.payment_status === "paid" &&
    (registration?.total ?? 0) > 0;
  // Warn before registering for an unverified organizer's event (not for the host).
  const shouldWarnUnverified = Boolean(organizer) && !organizerVerified && !isHost;

  function handleRegisterClick() {
    if (!rulesAgreed) return;
    if (shouldWarnUnverified) {
      setShowUnverifiedGate(true);
      return;
    }
    onRegister?.(tournament!.id);
  }

  const rules = tournament.rules
    ? tournament.rules.split("\n").filter(Boolean)
    : DEFAULT_TOURNAMENT_RULES;

  /* ── Main action (register / pay / withdraw states) ─────
   * Rendered inline on desktop and inside a sticky bottom bar on
   * mobile so the entry fee + CTA are visible at the decision moment. */
  const actionSection =
    isCancelled ? (
      <Button fullWidth size="lg" variant="primary" disabled>
        <XCircle size={16} />
        Tournament Cancelled
      </Button>
    ) : isPast || tournament.status === "completed" ? (
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
            disabled={registerLoading}
            onClick={() => onPayRegistration?.(tournament.id)}
          >
            {registerLoading ? (
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
        {paymentPending && (
          <p className="text-[11px] text-center text-gold">
            {isTeamEvent
              ? "Your team slot is reserved while payment is pending."
              : "Your slot is reserved while payment is pending."}
          </p>
        )}
        <button
          type="button"
          onClick={() => onUnregister?.(tournament.id)}
          disabled={registerLoading}
          className="w-full text-center text-[11px] text-text-muted hover:text-magenta transition-colors cursor-pointer py-1"
        >
          {registerLoading
            ? "Withdrawing..."
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
      <div className="space-y-2.5">
        {/* Rules agreement gate — the CTA stays locked until checked */}
        <label className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-alt px-3 py-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rulesAgreed}
            onChange={(e) => setRulesAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-cyan cursor-pointer"
          />
          <span className="text-[11px] leading-relaxed text-text-muted">
            I have read the{" "}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                scrollToRules();
              }}
              className="text-cyan underline underline-offset-2 hover:text-cyan/80 cursor-pointer"
            >
              tournament rules
            </button>{" "}
            and agree to them
          </span>
        </label>
        <Button
          fullWidth
          size="lg"
          variant="primary"
          disabled={registerLoading || !rulesAgreed}
          onClick={handleRegisterClick}
        >
          {registerLoading ? (
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
      </div>
    );

  /* ── Sticky bottom bar (mobile): entry fee + CTA always visible ── */
  const stickyMobileActions = (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-surface border-t border-border px-4 py-3 safe-area-pb">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Entry Fee</p>
          <p className="text-base font-bold font-heading text-magenta">
            {tournament.entry_fee > 0 ? formatPrice(tournament.entry_fee) : "Free"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Prize Pool</p>
          <p className="text-base font-bold font-heading text-gold truncate max-w-[160px]">
            {tournament.prize}
          </p>
        </div>
      </div>
      {actionSection}
    </div>
  );

  const content = (
    <div className="pb-36 sm:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-5xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1">{tournament.game}</p>
          <h3 className="text-xl font-bold font-heading tracking-tight text-text">
            {tournament.title}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Badge color={status.color} size="md">{status.label}</Badge>
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-lg bg-surface-alt border border-border hover:border-cyan/30 transition-all duration-200 cursor-pointer"
            aria-label="Share tournament"
          >
            <Share2 size={16} className="text-text-muted hover:text-cyan transition-colors" />
          </button>
        </div>
      </div>

      {/* Cancelled banner — refund status for registered players */}
      {isCancelled && (
        <div className="mb-6 rounded-lg border border-red/25 bg-red/5 p-3">
          <div className="flex items-start gap-2.5">
            <XCircle size={16} className="mt-0.5 shrink-0 text-red" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-red">
                Tournament Cancelled
              </p>
              {tournament.cancellation_reason && (
                <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                  Reason: {tournament.cancellation_reason}
                </p>
              )}
              {hasPaidEntry && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-text">
                  {registration?.refund_status === "refunded"
                    ? `Your entry fee was refunded${
                        registration.refunded_at
                          ? ` on ${new Date(registration.refunded_at).toLocaleDateString("en-GB")}`
                          : ""
                      }.`
                    : "This tournament was cancelled — your entry fee refund is on the way."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Organizer trust */}
      {organizer && (
        <div className="mb-6 rounded-lg border border-border bg-surface-alt p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">
                Organizer
              </p>
              <p className="text-sm font-semibold text-text truncate">{organizerName}</p>
              {organizerEventCount > 0 && (
                <p className="text-[11px] text-text-muted mt-0.5">
                  {organizerEventCount} tournament{organizerEventCount === 1 ? "" : "s"} hosted
                </p>
              )}
            </div>
            <Badge color={organizerVerified ? "green" : "gold"}>
              {organizerVerified ? "Verified Organizer" : "Unverified Organizer"}
            </Badge>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
            {organizerVerified
              ? "CGE has verified this organizer profile or trust level."
              : "This organizer has not completed CGE verification yet. Review the rules, prize details, and communication before registering."}
          </p>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-alt border border-border">
          <Calendar size={16} className="text-cyan/70 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Date</p>
            <p className="text-sm font-semibold text-text">{formatTournamentDate(tournament.date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-alt border border-border">
          <Clock size={16} className="text-cyan/70 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Time</p>
            <p className="text-sm font-semibold text-text">{formatTournamentTime(tournament.time)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-alt border border-border">
          <Swords size={16} className="text-cyan/70 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Format</p>
            <p className="text-sm font-semibold text-text">{tournament.format}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-alt border border-border">
          <Gamepad2 size={16} className="text-cyan/70 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Platform</p>
            <p className="text-sm font-semibold text-text">{tournament.platform}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {tournament.description && (
        <p className="text-sm text-text-muted mb-6 leading-relaxed">{tournament.description}</p>
      )}

      {/* Extra info badges */}
      {(tournament.bracket_type || tournament.team_size && tournament.team_size > 1 || tournament.check_in_required || tournament.stream_url) && (
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
              href={sanitizeUrl(tournament.stream_url)}
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

      {isTeamEvent && (
        <div className="mb-6 rounded-lg border border-magenta/20 bg-magenta/5 p-3">
          <div className="flex items-start gap-2.5">
            <Users size={16} className="mt-0.5 shrink-0 text-magenta" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-magenta">
                Team Entry
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                {!currentTeam
                  ? `This is a ${requiredTeamSize}v${requiredTeamSize} event. Create or join a team first; the captain registers one team slot.`
                  : !isTeamCaptain
                    ? `${currentTeam.name} can enter this event when the team captain registers the roster.`
                    : teamMissingCount > 0
                      ? `${currentTeam.name} needs ${teamMissingCount} more member${teamMissingCount === 1 ? "" : "s"} before it can enter this ${requiredTeamSize}v${requiredTeamSize} event.`
                      : `${currentTeam.name} is ready with ${resolvedTeamMemberCount} member${resolvedTeamMemberCount === 1 ? "" : "s"}. The captain can register this team.`}
              </p>
              {!currentTeam && onCreateTeam && (
                <div className="mt-3">
                  <Button size="sm" variant="magenta" onClick={onCreateTeam}>
                    <UserPlus size={14} />
                    Create Team
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Entry fee & Prize */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 p-3 rounded-lg bg-surface-alt border border-border text-center">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Entry Fee</p>
          <p className="text-lg font-bold font-heading text-magenta">{formatPrice(tournament.entry_fee)}</p>
        </div>
        <div className="flex-1 p-3 rounded-lg bg-surface-alt border border-gold/20 text-center">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Prize Pool</p>
          <p className="text-lg font-bold font-heading text-gold">{tournament.prize}</p>
        </div>
      </div>

      {/* Prize breakdown: per-placement amounts from distribution + pool */}
      {breakdownLine && (
        <div className="-mt-3 mb-6 rounded-lg border border-gold/15 bg-gold/5 px-3 py-2 text-center">
          <p className="text-xs font-semibold text-gold">{breakdownLine}</p>
          {isDynamicPool && (
            <p className="mt-0.5 text-[10px] text-text-muted">
              {pool.amount > 0
                ? `Based on the current pool estimate of ${formatPrice(pool.amount)} from paid entries — grows as more players register.`
                : "Amounts are set from the prize pool once paid entries come in."}
            </p>
          )}
        </div>
      )}

      {tournament.entry_fee > 0 && (
        <div className="mb-6 rounded-lg border border-cyan/20 bg-cyan/5 p-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-cyan" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
                CGE Checkout Protected
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                Paid entries go through CGE checkout and are recorded against this tournament before confirmation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Slots */}
      <div className="mb-6">
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

      {/* Prize distribution */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
          <Trophy size={14} className="text-gold" />
          Prize Distribution
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {distribution.map((entry) => {
            const medal =
              entry.place === 1
                ? "\uD83E\uDD47"
                : entry.place === 2
                  ? "\uD83E\uDD48"
                  : entry.place === 3
                    ? "\uD83E\uDD49"
                    : "\uD83C\uDFC5";
            const amount =
              pool.amount > 0 ? placementAmount(pool.amount, entry.percent) : 0;
            return (
              <div
                key={entry.place}
                className={cn(
                  "p-3 rounded-lg bg-surface-alt border text-center",
                  entry.place === 1 ? "border-gold/20" : "border-border"
                )}
              >
                <p className="text-lg mb-1">{medal}</p>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">
                  {entry.label || `${formatPlacement(entry.place)} Place`}
                </p>
                <p
                  className={cn(
                    "text-sm font-bold font-heading",
                    entry.place === 1 ? "text-gold" : "text-text"
                  )}
                >
                  {amount > 0 ? formatPrice(amount) : `${entry.percent}%`}
                </p>
                {amount > 0 && (
                  <p className="text-[10px] text-text-muted mt-0.5">{entry.percent}%</p>
                )}
              </div>
            );
          })}
        </div>
        {isDynamicPool && pool.amount > 0 && (
          <p className="mt-2 text-[10px] text-text-muted">
            Estimated from paid entries so far. Final amounts are confirmed when the
            tournament completes.
          </p>
        )}
      </div>

      {/* Rules */}
      <div className="mb-6 scroll-mt-4" data-tournament-rules>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
          <Medal size={14} className="text-cyan" />
          Tournament Rules
        </h4>
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li
              key={rule}
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
        <div className="mb-6 p-3 rounded-lg bg-cyan/5 border border-cyan/20 text-center">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Starts In</p>
          <p className="text-lg font-bold font-heading text-cyan">{countdown}</p>
        </div>
      )}

      {/* Manage button for host */}
      {isHost && onManage && (
        <div className="mb-3">
          <Button fullWidth variant="magenta" onClick={onManage}>
            <Settings size={16} />
            Manage Tournament
          </Button>
        </div>
      )}

      {/* Action button (inline on desktop; mobile uses the sticky bar) */}
      <div className="hidden sm:block">{actionSection}</div>
    </div>
  );

  // Use BottomSheet on mobile, Modal on desktop
  return (
    <>
      {/* Desktop: Modal */}
      <div className="hidden sm:block">
        <Modal open={open} onClose={onClose} width="lg">
          {content}
        </Modal>
      </div>

      {/* Mobile: BottomSheet */}
      <div className="block sm:hidden">
        <BottomSheet open={open} onClose={onClose} title={tournament.title}>
          <div className="px-4 py-3">
            {content}
          </div>

          {stickyMobileActions}
        </BottomSheet>
      </div>

      <UnverifiedOrganizerDialog
        open={showUnverifiedGate}
        onClose={() => setShowUnverifiedGate(false)}
        onConfirm={() => {
          setShowUnverifiedGate(false);
          onRegister?.(tournament.id);
        }}
        organizerName={organizerName}
        isPaid={tournament.entry_fee > 0}
        entryFeeLabel={tournament.entry_fee > 0 ? formatPrice(tournament.entry_fee) : undefined}
        isTeamEvent={isTeamEvent}
        loading={registerLoading}
      />
    </>
  );
}
