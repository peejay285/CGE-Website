import { describe, it, expect } from "vitest";
import { assistFeeForValue, ASSISTED_SWAP_FEE_TIERS } from "@/lib/constants";

describe("assistFeeForValue", () => {
  it("charges the low tier at and below ₦20,000", () => {
    expect(assistFeeForValue(0)).toBe(1000);
    expect(assistFeeForValue(15000)).toBe(1000);
    expect(assistFeeForValue(20000)).toBe(1000);
  });

  it("charges the mid tier between ₦20,001 and ₦50,000", () => {
    expect(assistFeeForValue(20001)).toBe(2500);
    expect(assistFeeForValue(35000)).toBe(2500);
    expect(assistFeeForValue(50000)).toBe(2500);
  });

  it("charges the top tier above ₦50,000", () => {
    expect(assistFeeForValue(50001)).toBe(5000);
    expect(assistFeeForValue(250000)).toBe(5000);
  });

  it("each half (split 50/50) stays a whole naira amount", () => {
    for (const tier of ASSISTED_SWAP_FEE_TIERS) {
      expect(tier.fee % 2).toBe(0);
    }
  });
});
