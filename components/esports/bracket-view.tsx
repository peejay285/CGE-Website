"use client";

import { useMemo } from "react";
import { Trophy, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getRoundName } from "@/lib/bracket-engine";
import type { TournamentMatch } from "@/lib/types";

interface BracketViewProps {
  matches: TournamentMatch[];
  bracketType?: string;
  currentUserId?: string;
  onMatchClick?: (match: TournamentMatch) => void;
}

function MatchCard({
  match,
  currentUserId,
  onClick,
}: {
  match: TournamentMatch;
  currentUserId?: string;
  onClick?: () => void;
}) {
  const isComplete = match.status === "completed";
  const isBye = match.status === "bye";
  const isDisputed = match.status === "disputed";
  const isLive = match.status === "in_progress";

  const isUserMatch =
    currentUserId &&
    (match.participant1_id === currentUserId || match.participant2_id === currentUserId);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBye}
      className={cn(
        "w-56 rounded-lg border text-left transition-all cursor-pointer",
        "hover:border-cyan/40 hover:shadow-[0_2px_12px_rgba(0,240,255,0.1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50",
        isUserMatch && "ring-1 ring-cyan/30",
        isLive && "border-cyan/50 bg-cyan/5",
        isDisputed && "border-red/50 bg-red/5",
        isComplete ? "border-border/50 bg-surface-alt/50" : "border-border bg-surface",
        isBye && "opacity-40 cursor-default"
      )}
      aria-label={`Match: ${match.participant1_name || "TBD"} vs ${match.participant2_name || "TBD"}`}
    >
      {/* Match header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
        <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
          M{match.match_number}
        </span>
        {isLive && (
          <Badge color="cyan" size="sm">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan animate-pulse mr-1" />
            Live
          </Badge>
        )}
        {isDisputed && <Badge color="red" size="sm">Disputed</Badge>}
        {isComplete && <Badge color="green" size="sm">Done</Badge>}
      </div>

      {/* Participant 1 */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-border/30",
          isComplete && match.winner_id === match.participant1_id && "bg-green/5"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {match.participant1_seed && (
            <span className="text-[10px] font-bold text-text-muted w-4 text-center shrink-0">
              {match.participant1_seed}
            </span>
          )}
          <span
            className={cn(
              "text-xs font-semibold truncate",
              match.participant1_id
                ? match.winner_id === match.participant1_id
                  ? "text-green"
                  : "text-text"
                : "text-text-muted italic"
            )}
          >
            {match.participant1_name || "TBD"}
          </span>
        </div>
        {match.participant1_score !== null && (
          <span
            className={cn(
              "text-sm font-bold font-heading ml-2",
              match.winner_id === match.participant1_id ? "text-green" : "text-text-muted"
            )}
          >
            {match.participant1_score}
          </span>
        )}
        {isComplete && match.winner_id === match.participant1_id && (
          <Trophy size={12} className="text-gold ml-1.5 shrink-0" />
        )}
      </div>

      {/* Participant 2 */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2",
          isComplete && match.winner_id === match.participant2_id && "bg-green/5"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {match.participant2_seed && (
            <span className="text-[10px] font-bold text-text-muted w-4 text-center shrink-0">
              {match.participant2_seed}
            </span>
          )}
          <span
            className={cn(
              "text-xs font-semibold truncate",
              match.participant2_id
                ? match.winner_id === match.participant2_id
                  ? "text-green"
                  : "text-text"
                : "text-text-muted italic"
            )}
          >
            {match.participant2_name || "TBD"}
          </span>
        </div>
        {match.participant2_score !== null && (
          <span
            className={cn(
              "text-sm font-bold font-heading ml-2",
              match.winner_id === match.participant2_id ? "text-green" : "text-text-muted"
            )}
          >
            {match.participant2_score}
          </span>
        )}
        {isComplete && match.winner_id === match.participant2_id && (
          <Trophy size={12} className="text-gold ml-1.5 shrink-0" />
        )}
      </div>
    </button>
  );
}

export function BracketView({ matches, bracketType, currentUserId, onMatchClick }: BracketViewProps) {
  // Group matches by round
  const winnersRounds = useMemo(() => {
    const roundMap = new Map<number, TournamentMatch[]>();

    matches
      .filter((m) => m.bracket_position !== "losers")
      .forEach((match) => {
        const existing = roundMap.get(match.round) || [];
        existing.push(match);
        roundMap.set(match.round, existing);
      });

    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, roundMatches]) => ({
        round,
        matches: roundMatches.sort((a, b) => a.match_number - b.match_number),
      }));
  }, [matches]);

  const losersRounds = useMemo(() => {
    if (bracketType !== "double_elimination") return [];

    const roundMap = new Map<number, TournamentMatch[]>();

    matches
      .filter((m) => m.bracket_position === "losers")
      .forEach((match) => {
        const existing = roundMap.get(match.round) || [];
        existing.push(match);
        roundMap.set(match.round, existing);
      });

    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, roundMatches]) => ({
        round,
        matches: roundMatches.sort((a, b) => a.match_number - b.match_number),
      }));
  }, [matches, bracketType]);

  const totalRoundsCount = winnersRounds.length;

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <Swords size={32} className="mx-auto text-text-muted/30 mb-3" />
        <p className="text-sm text-text-muted">
          Bracket not yet generated. The host will generate brackets when ready.
        </p>
      </div>
    );
  }

  // Round robin: show as a grid/table instead of bracket
  if (bracketType === "round_robin" || bracketType === "swiss") {
    return (
      <div className="space-y-6">
        {winnersRounds.map(({ round, matches: roundMatches }) => (
          <div key={round}>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-3">
              Round {round}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roundMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  currentUserId={currentUserId}
                  onClick={() => onMatchClick?.(match)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Elimination bracket: horizontal scroll layout
  return (
    <div className="space-y-8">
      {/* Winners bracket */}
      <div>
        {bracketType === "double_elimination" && (
          <h4 className="text-xs font-semibold uppercase tracking-widest text-cyan mb-4 flex items-center gap-2">
            <Trophy size={14} />
            Winners Bracket
          </h4>
        )}

        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-8 items-start min-w-max">
            {winnersRounds.map(({ round, matches: roundMatches }) => (
              <div key={round} className="flex flex-col items-center">
                <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3 text-center">
                  {getRoundName(round, totalRoundsCount)}
                </p>
                <div
                  className="flex flex-col justify-around gap-4"
                  style={{
                    minHeight: winnersRounds[0]?.matches.length
                      ? `${winnersRounds[0].matches.length * 80}px`
                      : "auto",
                  }}
                >
                  {roundMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      currentUserId={currentUserId}
                      onClick={() => onMatchClick?.(match)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Losers bracket (double elimination only) */}
      {losersRounds.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-magenta mb-4 flex items-center gap-2">
            <Swords size={14} />
            Losers Bracket
          </h4>

          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-8 items-start min-w-max">
              {losersRounds.map(({ round, matches: roundMatches }) => (
                <div key={round} className="flex flex-col items-center">
                  <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3 text-center">
                    Losers R{round}
                  </p>
                  <div className="flex flex-col justify-around gap-4">
                    {roundMatches.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        currentUserId={currentUserId}
                        onClick={() => onMatchClick?.(match)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
