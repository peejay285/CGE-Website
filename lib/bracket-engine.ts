/**
 * Bracket Generation Engine
 * Generates tournament brackets for single/double elimination and round robin.
 * Works entirely client-side — produces match objects ready for DB insertion.
 */

import type { TournamentMatch } from "@/lib/types";

// ── Types ────────────────────────────────────────────

export interface BracketParticipant {
  id: string;
  name: string;
  seed: number;
}

export interface GeneratedMatch {
  round: number;
  match_number: number;
  bracket_position: string;
  participant1_id: string | null;
  participant2_id: string | null;
  participant1_name: string | null;
  participant2_name: string | null;
  participant1_seed: number | null;
  participant2_seed: number | null;
  status: "pending" | "bye";
  next_match_id_ref: number | null; // local ref, not DB id
  next_match_slot: number | null;
  loser_next_match_id_ref: number | null;
  loser_next_match_slot: number | null;
  winner_id: string | null;
}

// ── Helpers ──────────────────────────────────────────

/** Round up to the nearest power of 2 */
function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Calculate total rounds for single elimination */
function totalRounds(bracketSize: number): number {
  return Math.log2(bracketSize);
}

/**
 * Standard seeding order for a bracket of size n.
 * Ensures top seeds meet latest (e.g., 1 vs 16, 2 vs 15, etc.)
 */
function seedOrder(bracketSize: number): number[] {
  if (bracketSize === 1) return [1];
  if (bracketSize === 2) return [1, 2];

  const half = seedOrder(bracketSize / 2);
  const result: number[] = [];

  for (const seed of half) {
    result.push(seed);
    result.push(bracketSize + 1 - seed);
  }

  return result;
}

/**
 * Map participants to seeded positions, adding BYEs for empty slots
 */
function seedParticipants(
  participants: BracketParticipant[],
  bracketSize: number
): (BracketParticipant | null)[] {
  const order = seedOrder(bracketSize);
  const sorted = [...participants].sort((a, b) => a.seed - b.seed);
  const bySeed = new Map(sorted.map((participant) => [participant.seed, participant]));
  const result: (BracketParticipant | null)[] = new Array(bracketSize).fill(null);

  for (let i = 0; i < bracketSize; i++) {
    result[i] = bySeed.get(order[i]) ?? null;
  }

  return result;
}

// ── Round Names ─────────────────────────────────────

export function getRoundName(round: number, totalRoundsCount: number, bracketPosition = "winners"): string {
  if (bracketPosition === "losers") {
    return `Losers Round ${round}`;
  }

  const roundsFromEnd = totalRoundsCount - round;

  if (roundsFromEnd === 0) return "Grand Final";
  if (roundsFromEnd === 1) return "Semi-Final";
  if (roundsFromEnd === 2) return "Quarter-Final";
  return `Round ${round}`;
}

// ── Single Elimination ──────────────────────────────

export function generateSingleElimination(participants: BracketParticipant[]): GeneratedMatch[] {
  const bracketSize = nextPowerOf2(participants.length);
  const rounds = totalRounds(bracketSize);
  const seeded = seedParticipants(participants, bracketSize);
  const matches: GeneratedMatch[] = [];

  // Generate first round
  const firstRoundMatches = bracketSize / 2;
  for (let i = 0; i < firstRoundMatches; i++) {
    const p1 = seeded[i * 2];
    const p2 = seeded[i * 2 + 1];
    const isBye = !p1 || !p2;

    matches.push({
      round: 1,
      match_number: i + 1,
      bracket_position: "winners",
      participant1_id: p1?.id ?? null,
      participant2_id: p2?.id ?? null,
      participant1_name: p1?.name ?? null,
      participant2_name: p2?.name ?? null,
      participant1_seed: p1?.seed ?? null,
      participant2_seed: p2?.seed ?? null,
      status: isBye ? "bye" : "pending",
      next_match_id_ref: null, // will link below
      next_match_slot: null,
      loser_next_match_id_ref: null,
      loser_next_match_slot: null,
      winner_id: isBye ? (p1?.id ?? p2?.id ?? null) : null,
    });
  }

  // Generate subsequent rounds
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        round,
        match_number: i + 1,
        bracket_position: "winners",
        participant1_id: null,
        participant2_id: null,
        participant1_name: null,
        participant2_name: null,
        participant1_seed: null,
        participant2_seed: null,
        status: "pending",
        next_match_id_ref: null,
        next_match_slot: null,
        loser_next_match_id_ref: null,
        loser_next_match_slot: null,
        winner_id: null,
      });
    }
  }

  // Link matches: winners of round N go to round N+1
  let currentIdx = 0;
  for (let round = 1; round < rounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    const nextRoundStart = currentIdx + matchesInRound;

    for (let i = 0; i < matchesInRound; i++) {
      const nextMatchIdx = nextRoundStart + Math.floor(i / 2);
      const slot = (i % 2) + 1;
      matches[currentIdx + i].next_match_id_ref = nextMatchIdx;
      matches[currentIdx + i].next_match_slot = slot;
    }

    currentIdx += matchesInRound;
  }

  // Auto-advance BYE winners
  for (const match of matches) {
    if (match.status === "bye" && match.winner_id && match.next_match_id_ref !== null) {
      const nextMatch = matches[match.next_match_id_ref];
      if (nextMatch) {
        if (match.next_match_slot === 1) {
          nextMatch.participant1_id = match.winner_id;
          nextMatch.participant1_name =
            match.participant1_id === match.winner_id
              ? match.participant1_name
              : match.participant2_name;
          nextMatch.participant1_seed =
            match.participant1_id === match.winner_id
              ? match.participant1_seed
              : match.participant2_seed;
        } else {
          nextMatch.participant2_id = match.winner_id;
          nextMatch.participant2_name =
            match.participant1_id === match.winner_id
              ? match.participant1_name
              : match.participant2_name;
          nextMatch.participant2_seed =
            match.participant1_id === match.winner_id
              ? match.participant1_seed
              : match.participant2_seed;
        }
      }
    }
  }

  return matches;
}

// ── Double Elimination ──────────────────────────────

export function generateDoubleElimination(participants: BracketParticipant[]): GeneratedMatch[] {
  // Generate winners bracket first
  const winnersMatches = generateSingleElimination(participants);
  winnersMatches.forEach((m) => (m.bracket_position = "winners"));

  // Generate losers bracket
  const bracketSize = nextPowerOf2(participants.length);
  const winnersRounds = totalRounds(bracketSize);
  const losersRounds = (winnersRounds - 1) * 2; // Losers bracket has roughly double the rounds
  const losersMatches: GeneratedMatch[] = [];

  // Losers bracket starts with losers from round 1, then progressively
  for (let round = 1; round <= losersRounds; round++) {
    // Losers bracket has varying match counts per round
    const matchCount = Math.max(
      1,
      Math.floor(bracketSize / Math.pow(2, Math.ceil(round / 2) + 1))
    );

    for (let i = 0; i < matchCount; i++) {
      losersMatches.push({
        round,
        match_number: i + 1,
        bracket_position: "losers",
        participant1_id: null,
        participant2_id: null,
        participant1_name: null,
        participant2_name: null,
        participant1_seed: null,
        participant2_seed: null,
        status: "pending",
        next_match_id_ref: null,
        next_match_slot: null,
        loser_next_match_id_ref: null,
        loser_next_match_slot: null,
        winner_id: null,
      });
    }
  }

  // Grand final
  const grandFinal: GeneratedMatch = {
    round: winnersRounds + 1,
    match_number: 1,
    bracket_position: "winners",
    participant1_id: null, // winners bracket champion
    participant2_id: null, // losers bracket champion
    participant1_name: null,
    participant2_name: null,
    participant1_seed: null,
    participant2_seed: null,
    status: "pending",
    next_match_id_ref: null,
    next_match_slot: null,
    loser_next_match_id_ref: null,
    loser_next_match_slot: null,
    winner_id: null,
  };

  return [...winnersMatches, ...losersMatches, grandFinal];
}

// ── Round Robin ─────────────────────────────────────

export function generateRoundRobin(participants: BracketParticipant[]): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  const n = participants.length;
  const totalParticipants = n % 2 === 0 ? n : n + 1; // Add a dummy if odd
  const allParticipants = [...participants];

  // Add a "BYE" participant if odd number
  if (n % 2 !== 0) {
    allParticipants.push({ id: "bye", name: "BYE", seed: totalParticipants });
  }

  const rounds = totalParticipants - 1;
  const half = totalParticipants / 2;

  // Circle algorithm for round robin scheduling
  const fixed = allParticipants[0];
  const rotating = allParticipants.slice(1);

  for (let round = 0; round < rounds; round++) {
    const currentRotation = [fixed, ...rotating];

    for (let i = 0; i < half; i++) {
      const p1 = currentRotation[i];
      const p2 = currentRotation[totalParticipants - 1 - i];

      // Skip BYE matches
      if (p1.id === "bye" || p2.id === "bye") continue;

      matches.push({
        round: round + 1,
        match_number: i + 1,
        bracket_position: "round_robin",
        participant1_id: p1.id,
        participant2_id: p2.id,
        participant1_name: p1.name,
        participant2_name: p2.name,
        participant1_seed: p1.seed,
        participant2_seed: p2.seed,
        status: "pending",
        next_match_id_ref: null,
        next_match_slot: null,
        loser_next_match_id_ref: null,
        loser_next_match_slot: null,
        winner_id: null,
      });
    }

    // Rotate: move last element to position 1
    rotating.push(rotating.shift()!);
  }

  return matches;
}

// ── Swiss System ────────────────────────────────────

export function generateSwissRound(
  participants: BracketParticipant[],
  standings: Map<string, { wins: number; losses: number }>,
  roundNumber: number
): GeneratedMatch[] {
  // Swiss pairs players with similar records
  const sorted = [...participants].sort((a, b) => {
    const aRecord = standings.get(a.id) || { wins: 0, losses: 0 };
    const bRecord = standings.get(b.id) || { wins: 0, losses: 0 };
    return bRecord.wins - aRecord.wins || aRecord.losses - bRecord.losses;
  });

  const matches: GeneratedMatch[] = [];
  const paired = new Set<string>();

  for (let i = 0; i < sorted.length; i++) {
    if (paired.has(sorted[i].id)) continue;

    // Find the next unpaired opponent
    for (let j = i + 1; j < sorted.length; j++) {
      if (paired.has(sorted[j].id)) continue;

      paired.add(sorted[i].id);
      paired.add(sorted[j].id);

      matches.push({
        round: roundNumber,
        match_number: matches.length + 1,
        bracket_position: "swiss",
        participant1_id: sorted[i].id,
        participant2_id: sorted[j].id,
        participant1_name: sorted[i].name,
        participant2_name: sorted[j].name,
        participant1_seed: sorted[i].seed,
        participant2_seed: sorted[j].seed,
        status: "pending",
        next_match_id_ref: null,
        next_match_slot: null,
        loser_next_match_id_ref: null,
        loser_next_match_slot: null,
        winner_id: null,
      });
      break;
    }
  }

  // Handle BYE if odd number of participants
  const unpaired = sorted.find((p) => !paired.has(p.id));
  if (unpaired) {
    matches.push({
      round: roundNumber,
      match_number: matches.length + 1,
      bracket_position: "swiss",
      participant1_id: unpaired.id,
      participant2_id: null,
      participant1_name: unpaired.name,
      participant2_name: "BYE",
      participant1_seed: unpaired.seed,
      participant2_seed: null,
      status: "bye",
      next_match_id_ref: null,
      next_match_slot: null,
      loser_next_match_id_ref: null,
      loser_next_match_slot: null,
      winner_id: unpaired.id,
    });
  }

  return matches;
}

// ── Main Generator ──────────────────────────────────

export type BracketType = "single_elimination" | "double_elimination" | "round_robin" | "swiss";

export function generateBracket(
  type: BracketType,
  participants: BracketParticipant[]
): GeneratedMatch[] {
  switch (type) {
    case "single_elimination":
      return generateSingleElimination(participants);
    case "double_elimination":
      return generateDoubleElimination(participants);
    case "round_robin":
      return generateRoundRobin(participants);
    case "swiss":
      // Swiss generates round by round, so return first round
      return generateSwissRound(participants, new Map(), 1);
    default:
      return generateSingleElimination(participants);
  }
}

// ── Bracket stats ───────────────────────────────────

export function getBracketStats(matches: (GeneratedMatch | TournamentMatch)[]) {
  const totalMatches = matches.filter((m) => m.status !== "bye").length;
  const completedMatches = matches.filter((m) => m.status === "completed").length;
  const pendingMatches = matches.filter((m) => m.status === "pending").length;
  const disputedMatches = matches.filter((m) => m.status === "disputed").length;
  const currentRound = Math.max(
    ...matches.filter((m) => m.status === "in_progress" || m.status === "pending").map((m) => m.round),
    1
  );

  return {
    totalMatches,
    completedMatches,
    pendingMatches,
    disputedMatches,
    currentRound,
    progress: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
  };
}
