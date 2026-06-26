import { describe, expect, it } from "vitest";
import {
  numericTeamId,
  winnerForScore,
} from "@/lib/tournament-operations";

describe("tournament operation validation", () => {
  it("only interprets positive integer-looking participant ids as teams", () => {
    expect(numericTeamId("42")).toBe(42);
    expect(numericTeamId("0042")).toBe(42);
    expect(numericTeamId("user-42")).toBeNull();
    expect(numericTeamId("4.2")).toBeNull();
    expect(numericTeamId(null)).toBeNull();
  });

  it("derives the winner from the submitted participant scores", () => {
    expect(winnerForScore("p1", "p2", 3, 1)).toBe("p1");
    expect(winnerForScore("p1", "p2", 0, 2)).toBe("p2");
    expect(winnerForScore("p1", "p2", 2, 2)).toBeNull();
  });
});
