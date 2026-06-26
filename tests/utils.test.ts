import { describe, it, expect } from "vitest";
import {
  formatPrice,
  getInitials,
  isSunday,
  escapePostgrestSearch,
  haversineKm,
} from "@/lib/utils";

describe("formatPrice", () => {
  it("formats naira with thousands separators", () => {
    expect(formatPrice(1500)).toBe("₦1,500");
    expect(formatPrice(0)).toBe("₦0");
    expect(formatPrice(1000000)).toBe("₦1,000,000");
  });
});

describe("getInitials", () => {
  it("takes up to two uppercase initials", () => {
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("madonna")).toBe("M");
    expect(getInitials("John Ronald Reuel")).toBe("JR");
  });
});

describe("isSunday", () => {
  it("detects Sundays at local midnight", () => {
    expect(isSunday("2024-01-07")).toBe(true); // a Sunday
    expect(isSunday("2024-01-08")).toBe(false); // Monday
  });
  it("returns false for empty input", () => {
    expect(isSunday("")).toBe(false);
  });
});

describe("escapePostgrestSearch", () => {
  it("escapes wildcards and backslashes", () => {
    expect(escapePostgrestSearch("50%")).toBe("50\\%");
    expect(escapePostgrestSearch("a_b")).toBe("a\\_b");
    expect(escapePostgrestSearch("c\\d")).toBe("c\\\\d");
  });
});

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm({ lat: 4.45, lng: 7.16 }, { lat: 4.45, lng: 7.16 })).toBeCloseTo(0, 5);
  });
  it("approximates a known short distance", () => {
    // ~1 degree of latitude ≈ 111 km
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(112);
  });
});
