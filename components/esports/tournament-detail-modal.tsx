"use client";

import { Calendar, Clock, Gamepad2, Users, Trophy, Swords, Medal, Loader2, Settings, Video, CheckCircle, GitBranch } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatPrice, sanitizeUrl } from "@/lib/utils";
import {
  getGameEmoji,
  STATUS_CONFIG,
  getCountdown,
  getFilledCount,
  DEFAULT_TOURNAMENT_RULES,
  formatTournamentDate,
  formatTournamentTime,
} from "@/lib/esports-utils";
import type { TournamentWithCount } from "@/lib/esports-utils";

interface TournamentDetailModalProps {
  tournament: TournamentWithCount | null;
  open: boolean;
  onClose: () => void;
  onRegister?: (tournamentId: number) => void;
  onUnregister?: (tournamentId: number) => void;
  registerLoading?: boolean;
  isRegistered?: boolean;
  isPast?: boolean;
  isHost?: boolean;
  onManage?: () => void;
}

export function TournamentDetailModal({
  tournament,
  open,
  onClose,
  onRegister,
  onUnregister,
  registerLoading,
  isRegistered,
  isPast,
  isHost,
  onManage,
}: TournamentDetailModalProps) {
  if (!tournament) return null;

  const emoji = getGameEmoji(tournament.game);
  const status = STATUS_CONFIG[tournament.status];
  const isFull = tournament.status === "full";
  const filledCount = getFilledCount(tournament);
  const countdown = getCountdown(tournament.date, tournament.time);

  const rules = tournament.rules
    ? tournament.rules.split("\n").filter(Boolean)
    : DEFAULT_TOURNAMENT_RULES;

  const content = (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-5xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1">{tournament.game}</p>
          <h3 className="text-xl font-bold font-heading tracking-tight text-text">
            {tournament.title}
          </h3>
        </div>
        <Badge color={status.color} size="md">{status.label}</Badge>
      </div>

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

      {/* Slots */}
      <div className="mb-6">
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
      <div className="mb-6">
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
      <div className="mb-6">
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

      {/* Action button */}
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
            onClick={() => onUnregister?.(tournament.id)}
            disabled={registerLoading}
            className="w-full text-center text-[11px] text-text-muted hover:text-magenta transition-colors cursor-pointer py-1"
          >
            {registerLoading ? "Withdrawing..." : "Withdraw from tournament"}
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
          disabled={registerLoading}
          onClick={() => onRegister?.(tournament.id)}
        >
          {registerLoading ? (
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
        </BottomSheet>
      </div>
    </>
  );
}
