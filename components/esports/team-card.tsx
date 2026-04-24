"use client";

import { Users, Crown, Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";

interface TeamCardProps {
  team: Team;
  onClick: () => void;
  isMyTeam?: boolean;
  style?: React.CSSProperties;
}

export function TeamCard({ team, onClick, isMyTeam, style }: TeamCardProps) {
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
      aria-label={`Team ${team.name}${team.tag ? ` [${team.tag}]` : ""}`}
      style={style}
      className={cn(
        "group overflow-hidden rounded-xl border border-border bg-surface p-4 cursor-pointer animate-fadeInUp",
        "transition-all duration-300 hover:border-magenta/30 hover:shadow-[0_4px_24px_rgba(255,45,120,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magenta/50",
        "active:scale-[0.98]",
        isMyTeam && "ring-1 ring-magenta/25"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt=""
            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-magenta/10 border border-magenta/20 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold font-heading text-magenta">
              {team.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-heading text-text truncate group-hover:text-magenta transition-colors">
              {team.name}
            </h3>
            {team.tag && (
              <span className="text-[10px] font-bold text-text-muted bg-surface-alt px-1.5 py-0.5 rounded shrink-0">
                [{team.tag}]
              </span>
            )}
          </div>
          {team.captain?.gamertag && (
            <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
              <Crown size={10} className="text-gold" />
              @{team.captain.gamertag}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isMyTeam && <Badge color="magenta">My Team</Badge>}
        </div>
      </div>

      {/* Description */}
      {team.description && (
        <p className="text-xs text-text-muted line-clamp-2 mb-3">{team.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Users size={13} className="text-magenta/60" />
          <span>{team.member_count ?? 1} member{(team.member_count ?? 1) !== 1 ? "s" : ""}</span>
        </div>
        {team.game && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Gamepad2 size={13} className="text-cyan/60" />
            <span>{team.game}</span>
          </div>
        )}
      </div>
    </article>
  );
}
