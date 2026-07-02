"use client";

import { memo } from "react";
import { AlertTriangle, Calendar, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn, formatPrice } from "@/lib/utils";
import {
  getGameEmoji,
  STATUS_CONFIG,
  getCountdown,
  getFilledCount,
  formatTournamentDate,
  formatTournamentTime,
} from "@/lib/esports-utils";
import type { TournamentWithCount } from "@/lib/esports-utils";

interface TournamentCardProps {
  tournament: TournamentWithCount;
  onClick: () => void;
  isRegistered?: boolean;
  isPast?: boolean;
  isHost?: boolean;
  style?: React.CSSProperties;
}

export const TournamentCard = memo(function TournamentCard({
  tournament,
  onClick,
  isRegistered,
  isPast,
  isHost,
  style,
}: TournamentCardProps) {
  const emoji = getGameEmoji(tournament.game);
  const status = STATUS_CONFIG[tournament.status];
  const filledCount = getFilledCount(tournament);
  const isFull = filledCount >= tournament.slots;
  const progressColor = isFull ? "var(--color-red)" : "var(--color-cyan)";
  const countdown = getCountdown(tournament.date, tournament.time);
  const organizer = tournament.organizer;
  const organizerName = organizer?.gamertag || organizer?.full_name;
  const organizerVerified =
    organizer?.is_id_verified ||
    organizer?.trust_level === "verified" ||
    organizer?.trust_level === "trusted" ||
    organizer?.trust_level === "power";
  const isPaidEntry = tournament.entry_fee > 0;
  // Same condition the detail modal uses to gate registration warnings.
  const unverifiedPaidWarning = Boolean(organizer) && !organizerVerified && isPaidEntry;
  const teamSize = Number(tournament.team_size ?? 1);
  const isTeamEvent = teamSize > 1;
  const entryLabel = `${isTeamEvent ? `Team (${teamSize})` : "Solo"} · ${
    isPaidEntry ? `${formatPrice(tournament.entry_fee)} entry` : "Free"
  }`;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${tournament.title} — ${tournament.game}, ${status.label}`}
      style={style}
      className={cn(
        "group overflow-hidden rounded-xl border border-border bg-surface p-4 cursor-pointer animate-fadeInUp",
        "transition-all duration-300 hover:border-cyan/30 hover:shadow-[0_4px_24px_rgba(0,240,255,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50",
        "active:scale-[0.98]",
        isPast && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl" aria-hidden="true">{emoji}</span>
        <div className="flex flex-col items-end gap-1.5">
          <Badge color={status.color}>{status.label}</Badge>
          {organizer && (
            <Badge color={organizerVerified ? "green" : "gold"}>
              {organizerVerified ? "Verified" : "Unverified"}
            </Badge>
          )}
          {isHost && <Badge color="magenta">Host</Badge>}
          {isRegistered && !isPast && <Badge color="cyan">Registered</Badge>}
        </div>
      </div>

      {/* Title & Game */}
      <h3 className="text-base font-bold font-heading tracking-tight text-text mb-1 group-hover:text-cyan transition-colors">
        {tournament.title}
      </h3>
      <p className="text-xs text-text-muted mb-1.5">{tournament.game}</p>

      {/* Entry format at a glance: "Solo · ₦2,000 entry" / "Team (5) · Free" */}
      <p
        className={cn(
          "text-xs font-semibold mb-2",
          isPaidEntry ? "text-magenta" : "text-green"
        )}
      >
        {entryLabel}
      </p>

      {/* Paid entry from an unverified organizer — flag it before the click */}
      {unverifiedPaidWarning && (
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gold bg-gold/10 border border-gold/25 rounded-md px-2 py-1 mb-2 w-fit">
          <AlertTriangle size={11} aria-hidden="true" />
          Paid entry · unverified organizer
        </p>
      )}

      {organizerName && (
        <p className="text-[11px] text-text-muted/80 mb-3 truncate">
          Hosted by <span className="text-text/80">{organizerName}</span>
        </p>
      )}

      {/* Date & Time */}
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Calendar size={13} className="text-cyan/60" aria-hidden="true" />
          <span>{formatTournamentDate(tournament.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Clock size={13} className="text-cyan/60" aria-hidden="true" />
          <span>{formatTournamentTime(tournament.time)}</span>
        </div>
        {countdown && tournament.status === "open" && (
          <div className="flex items-center gap-2 text-xs mt-0.5">
            <span className="text-[10px] uppercase tracking-widest text-cyan font-semibold">
              Starts in {countdown}
            </span>
          </div>
        )}
      </div>

      {/* Format & Platform badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Badge color="cyan">{tournament.format}</Badge>
        <Badge color="magenta">{tournament.platform}</Badge>
      </div>

      {/* Slots progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-text-muted flex items-center gap-1.5">
            <Users size={13} className="text-cyan/60" aria-hidden="true" />
            Slots
          </span>
          <span className="font-semibold text-text">
            {filledCount}/{tournament.slots}
          </span>
        </div>
        <ProgressBar value={filledCount} max={tournament.slots} color={progressColor} />
      </div>

      {/* Entry fee & Prize */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">Entry</p>
          <span
            className={cn(
              "text-sm font-bold font-heading",
              isPaidEntry ? "text-magenta" : "text-green"
            )}
          >
            {isPaidEntry ? formatPrice(tournament.entry_fee) : "Free"}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">Prize</p>
          <span className="text-sm font-bold font-heading text-gold">
            {tournament.prize}
          </span>
        </div>
      </div>
    </article>
  );
});
