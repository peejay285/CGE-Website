"use client";

import { Trophy, UserPlus, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeaderboardPlayer {
  rank: number;
  name: string;
  points: number;
  wins: number;
  losses: number;
  userId?: string;
  avatarUrl?: string | null;
}

interface LeaderboardTableProps {
  players: LeaderboardPlayer[];
  currentUserId?: string;
  followingIds?: Set<string>;
  onFollow?: (userId: string) => void;
  onUnfollow?: (userId: string) => void;
}

const rankMedal: Record<number, string> = {
  1: "\uD83E\uDD47",
  2: "\uD83E\uDD48",
  3: "\uD83E\uDD49",
};

const rankBadgeColor: Record<number, "gold" | "cyan" | "magenta"> = {
  1: "gold",
  2: "cyan",
  3: "magenta",
};

export function LeaderboardTable({ players, currentUserId, followingIds, onFollow, onUnfollow }: LeaderboardTableProps) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden" role="table" aria-label="Player leaderboard">
      {/* Table header */}
      <div className={cn(
        "grid gap-2 px-4 py-3 bg-surface-alt border-b border-border",
        onFollow
          ? "grid-cols-[48px_1fr_72px_64px_64px_36px] md:grid-cols-[60px_1fr_80px_72px_56px_80px_40px]"
          : "grid-cols-[48px_1fr_72px_64px_64px] md:grid-cols-[60px_1fr_80px_72px_56px_80px]"
      )} role="row">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted" role="columnheader">Rank</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted" role="columnheader">Player</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted text-right" role="columnheader">Points</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted text-center" role="columnheader">W/L</span>
        <span className="hidden md:block text-[10px] font-semibold uppercase tracking-widest text-text-muted text-center" role="columnheader">Rate</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted text-center" role="columnheader">Badge</span>
        {onFollow && <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted text-center" role="columnheader" />}
      </div>

      {/* Table rows */}
      {players.map((player, index) => {
        const medal = rankMedal[player.rank];
        const isTop3 = player.rank <= 3;
        const isCurrentUser = currentUserId && player.userId === currentUserId;
        const totalGames = player.wins + player.losses;
        const winRate = totalGames > 0 ? Math.round((player.wins / totalGames) * 100) : 0;

        return (
          <div
            key={player.rank}
            role="row"
            className={cn(
              "grid gap-2 px-4 py-3 items-center transition-colors",
              onFollow
                ? "grid-cols-[48px_1fr_72px_64px_64px_36px] md:grid-cols-[60px_1fr_80px_72px_56px_80px_40px]"
                : "grid-cols-[48px_1fr_72px_64px_64px] md:grid-cols-[60px_1fr_80px_72px_56px_80px]",
              index % 2 === 0 ? "bg-surface" : "bg-surface-alt/50",
              isTop3 && "hover:bg-cyan/5",
              isCurrentUser && "bg-cyan/10 ring-1 ring-inset ring-cyan/20"
            )}
          >
            {/* Rank */}
            <div className="flex items-center gap-1.5">
              {medal ? (
                <span className="text-lg">{medal}</span>
              ) : (
                <span className="text-sm font-bold font-heading text-text-muted pl-1">
                  {player.rank}
                </span>
              )}
            </div>

            {/* Player name + avatar */}
            <div className="flex items-center gap-2 min-w-0">
              {player.avatarUrl ? (
                <img
                  src={player.avatarUrl}
                  alt=""
                  className="w-6 h-6 rounded-full shrink-0 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full shrink-0 bg-surface-alt border border-border flex items-center justify-center">
                  <span className="text-[10px] font-bold text-text-muted">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span
                className={cn(
                  "text-sm font-semibold truncate",
                  isTop3 ? "text-text" : "text-text-muted",
                  isCurrentUser && "text-cyan"
                )}
              >
                {player.name}
                {isCurrentUser && (
                  <span className="text-[10px] text-cyan ml-1">(you)</span>
                )}
              </span>
            </div>

            {/* Points */}
            <div className="text-right">
              <span className="text-sm font-bold font-heading text-cyan">
                {player.points.toLocaleString()}
              </span>
            </div>

            {/* W/L */}
            <div className="text-center">
              <span className="text-xs font-semibold">
                <span className="text-green">{player.wins}</span>
                <span className="text-text-muted mx-0.5">/</span>
                <span className="text-red">{player.losses}</span>
              </span>
            </div>

            {/* Win Rate (hidden on mobile) */}
            <div className="hidden md:block text-center">
              <span className={cn(
                "text-xs font-semibold",
                winRate >= 60 ? "text-green" : winRate >= 40 ? "text-gold" : "text-red"
              )}>
                {winRate}%
              </span>
            </div>

            {/* Badge */}
            <div className="flex justify-center">
              {isTop3 ? (
                <Badge color={rankBadgeColor[player.rank]} size="sm">
                  {player.rank === 1 ? "Champion" : player.rank === 2 ? "Elite" : "Pro"}
                </Badge>
              ) : (
                <Badge color="cyan" size="sm">Contender</Badge>
              )}
            </div>

            {/* Follow button */}
            {onFollow && player.userId && !isCurrentUser && (
              <div className="flex justify-center">
                {followingIds?.has(player.userId) ? (
                  <button
                    type="button"
                    onClick={() => onUnfollow?.(player.userId!)}
                    className="p-1.5 rounded-full bg-cyan/10 text-cyan hover:bg-cyan/20 transition-colors"
                    title="Unfollow"
                    aria-label={`Unfollow ${player.name}`}
                  >
                    <UserCheck size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onFollow(player.userId!)}
                    className="p-1.5 rounded-full bg-surface-alt text-text-muted hover:bg-cyan/10 hover:text-cyan transition-colors"
                    title="Follow"
                    aria-label={`Follow ${player.name}`}
                  >
                    <UserPlus size={12} />
                  </button>
                )}
              </div>
            )}
            {onFollow && (isCurrentUser || !player.userId) && <div />}
          </div>
        );
      })}
    </div>
  );
}
