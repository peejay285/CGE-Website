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

  it("accepts the allowlisted metadata keys", () => {
    const parsed = paystackInitializeSchema.safeParse({
      type: "tournament_team",
      metadata: {
        registration_id: "reg-1",
        team_registration_id: "reg-1",
        tournament_id: 7,
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects smuggled metadata keys (forged-premium exploit)", () => {
    // The webhook dispatches on metadata.type / period_days / user_id.
    // A crafted initialize call must never be able to inject them.
    for (const smuggled of [
      { booking_id: "b-1", type: "premium" },
      { booking_id: "b-1", period_days: 36500 },
      { booking_id: "b-1", user_id: "someone-else" },
      { booking_id: "b-1", anything: true },
    ]) {
      const parsed = paystackInitializeSchema.safeParse({
        type: "booking",
        metadata: smuggled,
      });
      expect(parsed.success).toBe(false);
    }
  });
});
