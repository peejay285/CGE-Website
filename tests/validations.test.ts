import { describe, it, expect } from "vitest";
import { paystackInitializeSchema } from "@/lib/validations";

describe("paystackInitializeSchema", () => {
  it("accepts every supported payment type", () => {
    for (const type of [
      "booking",
      "tournament",
      "tournament_team",
      "event",
      "premium",
      "swap_assist",
    ]) {
      const parsed = paystackInitializeSchema.safeParse({ type, metadata: {} });
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects an unknown payment type", () => {
    const parsed = paystackInitializeSchema.safeParse({ type: "bitcoin", metadata: {} });
    expect(parsed.success).toBe(false);
  });

  it("requires a metadata object", () => {
    const parsed = paystackInitializeSchema.safeParse({ type: "swap_assist" });
    expect(parsed.success).toBe(false);
  });
});
