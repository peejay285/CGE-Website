import { describe, it, expect } from "vitest";
import {
  generateSingleElimination,
  generateRoundRobin,
  generateBracket,
  getRoundName,
  getBracketStats,
  type BracketParticipant,
  type GeneratedMatch,
} from "@/lib/bracket-engine";

function players(n: number): BracketParticipant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    seed: i + 1,
  }));
}

describe("generateSingleElimination", () => {
  it("produces N-1 matches for a power-of-two field", () => {
    expect(generateSingleElimination(players(4))).toHaveLength(3);
    expect(generateSingleElimination(players(8))).toHaveLength(7);
    expect(generateSingleElimination(players(16))).toHaveLength(15);
  });

  it("seeds round 1 so the top seed faces the bottom seed", () => {
    const m = generateSingleElimination(players(4));
    const r1 = m.filter((x) => x.round === 1);
    expect(r1).toHaveLength(2);
    // Match 1: seed 1 vs seed 4
    expect([r1[0].participant1_seed, r1[0].participant2_seed].sort()).toEqual([1, 4]);
    // Match 2: seed 2 vs seed 3
    expect([r1[1].participant1_seed, r1[1].participant2_seed].sort()).toEqual([2, 3]);
  });

  it("pads a non-power-of-two field with byes and auto-advances them", () => {
    const m = generateSingleElimination(players(6)); // bracket size 8
    expect(m).toHaveLength(7);
    const byes = m.filter((x) => x.status === "bye");
    expect(byes).toHaveLength(2);
    // Every bye has a winner and feeds the next round
    for (const b of byes) {
      expect(b.winner_id).toBeTruthy();
      expect(b.next_match_id_ref).not.toBeNull();
    }
  });

  it("links round-1 winners into round 2", () => {
    const m = generateSingleElimination(players(4));
    const r1 = m.filter((x) => x.round === 1);
    // Both round-1 matches point at the same final, in slots 1 and 2
    const finalIdx = m.findIndex((x) => x.round === 2);
    expect(r1[0].next_match_id_ref).toBe(finalIdx);
    expect(r1[1].next_match_id_ref).toBe(finalIdx);
    expect([r1[0].next_match_slot, r1[1].next_match_slot].sort()).toEqual([1, 2]);
  });
});

describe("getRoundName", () => {
  it("names the final rounds of a winners bracket", () => {
    expect(getRoundName(2, 2)).toBe("Grand Final");
    expect(getRoundName(1, 2)).toBe("Semi-Final");
    expect(getRoundName(2, 3)).toBe("Semi-Final");
    expect(getRoundName(1, 4)).toBe("Round 1");
  });

  it("names losers-bracket rounds", () => {
    expect(getRoundName(3, 5, "losers")).toBe("Losers Round 3");
  });
});

describe("generateRoundRobin", () => {
  it("schedules every pair exactly once", () => {
    const m = generateRoundRobin(players(4));
    expect(m).toHaveLength(6); // C(4,2)
    const pairs = new Set(
      m.map((x) => [x.participant1_id, x.participant2_id].sort().join("-")),
    );
    expect(pairs.size).toBe(6);
  });

  it("handles an odd field (drops the bye matchups)", () => {
    const m = generateRoundRobin(players(3));
    expect(m).toHaveLength(3); // C(3,2)
    expect(m.every((x) => x.participant1_id !== "bye" && x.participant2_id !== "bye")).toBe(true);
  });
});

describe("generateBracket dispatch", () => {
  it("routes by type and falls back to single elimination", () => {
    expect(generateBracket("single_elimination", players(4))).toHaveLength(3);
    expect(generateBracket("round_robin", players(4))).toHaveLength(6);
    // double elimination = winners (3) + losers + grand final
    expect(generateBracket("double_elimination", players(4)).length).toBeGreaterThan(3);
  });
});

describe("getBracketStats", () => {
  it("computes progress from completed vs total non-bye matches", () => {
    const matches = [
      { status: "completed", round: 1 },
      { status: "completed", round: 1 },
      { status: "pending", round: 2 },
      { status: "bye", round: 1 },
    ] as unknown as GeneratedMatch[];
    const stats = getBracketStats(matches);
    expect(stats.totalMatches).toBe(3); // byes excluded
    expect(stats.completedMatches).toBe(2);
    expect(stats.progress).toBe(67); // round(2/3*100)
  });
});
