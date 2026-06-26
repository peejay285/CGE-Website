"use client";

import { useMemo } from "react";
import { Medal, Trophy, Swords } from "lucide-react";
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

interface StandingRow {
  participantId: string;
  participantName: string;
  seed: number | null;
  played: number;
  wins: number;
  losses: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
  points: number;
}

function addParticipant(
  standings: Map<string, StandingRow>,
  id: string | null,
  name: string | null,
  seed: number | null | undefined
) {
  if (!id || id === "bye") return;
  if (standings.has(id)) return;

  standings.set(id, {
    participantId: id,
    participantName: name || "Player",
    seed: seed ?? null,
    played: 0,
    wins: 0,
    losses: 0,
    scoreFor: 0,
    scoreAgainst: 0,
    scoreDiff: 0,
    points: 0,
  });
}

function getStandings(matches: TournamentMatch[]): StandingRow[] {
  const standings = new Map<string, StandingRow>();

  matches.forEach((match) => {
    addParticipant(standings, match.participant1_id, match.participant1_name, match.participant1_seed);
    addParticipant(standings, match.participant2_id, match.participant2_name, match.participant2_seed);

    if (
      match.status !== "completed" ||
      !match.participant1_id ||
      !match.participant2_id ||
      match.participant1_score === null ||
      match.participant2_score === null
    ) {
      return;
    }

    const p1 = standings.get(match.participant1_id);
    const p2 = standings.get(match.participant2_id);
    if (!p1 || !p2) return;

    p1.played += 1;
    p2.played += 1;
    p1.scoreFor += match.participant1_score;
    p1.scoreAgainst += match.participant2_score;
    p2.scoreFor += match.participant2_score;
    p2.scoreAgainst += match.participant1_score;

    if (match.winner_id === match.participant1_id) {
      p1.wins += 1;
      p1.points += 3;
      p2.losses += 1;
    } else if (match.winner_id === match.participant2_id) {
      p2.wins += 1;
      p2.points += 3;
      p1.losses += 1;
    }

    p1.scoreDiff = p1.scoreFor - p1.scoreAgainst;
    p2.scoreDiff = p2.scoreFor - p2.scoreAgainst;
  });

  return Array.from(standings.values()).sort((a, b) => {
    return (
      b.points - a.points ||
      b.wins - a.wins ||
      b.scoreDiff - a.scoreDiff ||
      b.scoreFor - a.scoreFor ||
      (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER) ||
      a.participantName.localeCompare(b.participantName)
    );
  });
}

function StandingsTable({ standings }: { standings: StandingRow[] }) {
  if (standings.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-cyan mb-3 flex items-center gap-2">
        <Medal size={14} />
        Standings
      </h4>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface-alt">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="border-b border-border bg-surface">
            <tr className="text-[10px] uppercase tracking-widest text-text-muted">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Player</th>
              <th className="px-3 py-2 text-center font-semibold">P</th>
              <th className="px-3 py-2 text-center font-semibold">W</th>
              <th className="px-3 py-2 text-center font-semibold">L</th>
              <th className="px-3 py-2 text-center font-semibold">For</th>
              <th className="px-3 py-2 text-center font-semibold">Against</th>
              <th className="px-3 py-2 text-center font-semibold">+/-</th>
              <th className="px-3 py-2 text-center font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {standings.map((row, index) => (
              <tr key={row.participantId} className="text-text">
                <td className="px-3 py-2 font-semibold text-text-muted">{index + 1}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {row.seed && (
                      <span className="w-5 rounded bg-surface px-1.5 py-0.5 text-center text-[10px] font-bold text-text-muted">
                        {row.seed}
                      </span>
                    )}
                    <span className="font-semibold">{row.participantName}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">{row.played}</td>
                <td className="px-3 py-2 text-center text-green">{row.wins}</td>
                <td className="px-3 py-2 text-center text-text-muted">{row.losses}</td>
                <td className="px-3 py-2 text-center">{row.scoreFor}</td>
                <td className="px-3 py-2 text-center">{row.scoreAgainst}</td>
                <td className={cn("px-3 py-2 text-center font-semibold", row.scoreDiff > 0 ? "text-green" : row.scoreDiff < 0 ? "text-red" : "text-text-muted")}>
                  {row.scoreDiff > 0 ? `+${row.scoreDiff}` : row.scoreDiff}
                </td>
                <td className="px-3 py-2 text-center font-bold text-cyan">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
  const isAwaiting = match.status === "awaiting_confirmation";

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
        isAwaiting && "border-gold/50 bg-gold/5",
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
        {isAwaiting && <Badge color="gold" size="sm">Awaiting</Badge>}
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

interface EliminationBracketProps {
  rounds: { round: number; matches: TournamentMatch[] }[];
  roundLabel: (round: number) => string;
  connectors: boolean;
  currentUserId?: string;
  onMatchClick?: (match: TournamentMatch) => void;
}

// Renders rounds as equal-height columns. When `connectors` is on and a round
// pairs cleanly into the next (count === 2× next), it draws lead-in/out lines
// and vertical pair joiners so the tree reads like a traditional bracket.
function EliminationBracket({
  rounds,
  roundLabel,
  connectors,
  currentUserId,
  onMatchClick,
}: EliminationBracketProps) {
  const firstRoundCount = rounds[0]?.matches.length ?? 1;
  const columnMinHeight = Math.max(firstRoundCount * 96, 96);

  return (
    <div className="overflow-x-auto pb-4 -mx-4 px-4">
      <div className="flex min-w-max">
        {rounds.map(({ round, matches: roundMatches }, colIdx) => {
          const isFirst = colIdx === 0;
          const isLast = colIdx === rounds.length - 1;
          const nextCount = rounds[colIdx + 1]?.matches.length ?? 0;
          const pairsCleanly = connectors && !isLast && nextCount > 0 && roundMatches.length === nextCount * 2;

          return (
            <div key={round} className="flex flex-col" style={{ minHeight: columnMinHeight }}>
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3 text-center">
                {roundLabel(round)}
              </p>
              <div className="flex flex-1 flex-col">
                {roundMatches.map((match, i) => (
                  <div
                    key={match.id}
                    className="relative flex flex-1 flex-col justify-center px-4"
                  >
                    {connectors && !isFirst && (
                      <span aria-hidden className="absolute left-0 top-1/2 h-px w-4 bg-border" />
                    )}
                    {pairsCleanly && (
                      <>
                        <span aria-hidden className="absolute right-0 top-1/2 h-px w-4 bg-border" />
                        <span
                          aria-hidden
                          className={cn(
                            "absolute right-0 w-px bg-border",
                            i % 2 === 0 ? "top-1/2 h-1/2" : "top-0 h-1/2"
                          )}
                        />
                      </>
                    )}
                    <MatchCard
                      match={match}
                      currentUserId={currentUserId}
                      onClick={() => onMatchClick?.(match)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  const standings = useMemo(() => getStandings(matches), [matches]);

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
        <StandingsTable standings={standings} />
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

  // Elimination bracket: horizontal scroll layout with connector lines.
  // Winners rounds halve cleanly so connectors align; the losers bracket is
  // irregular, so we render it without connectors to avoid misaligned lines.
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

        <EliminationBracket
          rounds={winnersRounds}
          roundLabel={(round) => getRoundName(round, totalRoundsCount)}
          connectors
          currentUserId={currentUserId}
          onMatchClick={onMatchClick}
        />
      </div>

      {/* Losers bracket (double elimination only) */}
      {losersRounds.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-magenta mb-4 flex items-center gap-2">
            <Swords size={14} />
            Losers Bracket
          </h4>

          <EliminationBracket
            rounds={losersRounds}
            roundLabel={(round) => `Losers R${round}`}
            connectors={false}
            currentUserId={currentUserId}
            onMatchClick={onMatchClick}
          />
        </div>
      )}
    </div>
  );
}
