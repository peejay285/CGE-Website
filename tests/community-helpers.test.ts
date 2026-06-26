import { describe, it, expect } from "vitest";
import {
  extractHashtags,
  extractMentions,
  calculateTrendingScore,
} from "@/lib/community-constants";

describe("extractHashtags", () => {
  it("lowercases and de-duplicates tags", () => {
    expect(extractHashtags("#Gaming is #fun #gaming")).toEqual(["gaming", "fun"]);
  });
  it("returns an empty array when there are none", () => {
    expect(extractHashtags("no tags here")).toEqual([]);
  });
});

describe("extractMentions", () => {
  it("lowercases and de-duplicates mentions", () => {
    expect(extractMentions("@John hey @jane and @john again")).toEqual(["john", "jane"]);
  });
});

describe("calculateTrendingScore", () => {
  const now = new Date().toISOString();

  it("ranks higher engagement above lower for the same age", () => {
    const hot = calculateTrendingScore({
      likes_count: 50,
      comments_count: 20,
      share_count: 5,
      created_at: now,
    });
    const cold = calculateTrendingScore({
      likes_count: 1,
      comments_count: 0,
      created_at: now,
    });
    expect(hot).toBeGreaterThan(cold);
  });

  it("decays with age — a newer post outranks an older one with equal engagement", () => {
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const fresh = calculateTrendingScore({ likes_count: 10, comments_count: 5, created_at: now });
    const stale = calculateTrendingScore({
      likes_count: 10,
      comments_count: 5,
      created_at: dayAgo,
    });
    expect(fresh).toBeGreaterThan(stale);
  });

  it("weights comments and shares above plain likes", () => {
    const byComments = calculateTrendingScore({
      likes_count: 0,
      comments_count: 10,
      created_at: now,
    });
    const byLikes = calculateTrendingScore({
      likes_count: 10,
      comments_count: 0,
      created_at: now,
    });
    expect(byComments).toBeGreaterThan(byLikes);
  });
});
