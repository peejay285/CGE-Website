/**
 * Distributed rate limiter, with a graceful in-memory fallback for local dev.
 *
 * Production: backed by Upstash Redis (works in serverless — survives
 * redeploys, shares state across Vercel/Lambda instances). Configure with:
 *   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=...
 *
 * Dev / unconfigured: falls back to a per-process Map. This means rate
 * limits reset on every redeploy and don't share state across instances —
 * acceptable for local development, NOT for production.
 *
 * Always rate-limit on the most-trustworthy key available — userId for
 * authenticated routes, IP for the rest. The helpers below take both
 * and let the caller pick.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* ─── Upstash Redis client (singleton) ─────────────────────── */

let redis: Redis | null = null;

let warnedMissingUpstash = false;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // In production the in-memory fallback is effectively NO rate limiting
    // (each serverless instance has its own counter). Fail loudly at the
    // first rate-limited request rather than silently degrading.
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are required in production — rate limiting cannot run in-memory on serverless."
      );
    }
    if (!warnedMissingUpstash) {
      warnedMissingUpstash = true;
      console.warn(
        "[rate-limit] Upstash not configured — using per-process in-memory fallback (dev only)."
      );
    }
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

/* ─── Limiter definitions ──────────────────────────────────── */

export interface Limiter {
  /** Stable identifier for logs / fallback storage. */
  name: string;
  /** Max requests per window per (user|ip). */
  limit: number;
  /** Window length, e.g. "1 m", "10 s", "1 h". */
  window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`;
  /** Lazy-built sliding-window ratelimit instance (Upstash). */
  _instance?: Ratelimit;
}

function getRatelimit(limiter: Limiter): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!limiter._instance) {
    limiter._instance = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(limiter.limit, limiter.window),
      analytics: true,
      prefix: `cge:${limiter.name}`,
    });
  }
  return limiter._instance;
}

/** Payment initialization — per-user (auth required). */
export const paystackInitLimiter: Limiter = {
  name: "paystack-init",
  limit: 8,
  window: "1 m",
};

/** Per-IP fallback / coarse abuse limit. */
export const paystackIpLimiter: Limiter = {
  name: "paystack-ip",
  limit: 20,
  window: "1 m",
};

/** AI concierge — expensive upstream call, tighter cap. */
export const aiConciergeLimiter: Limiter = {
  name: "ai-concierge",
  limit: 10,
  window: "1 m",
};

/** Voucher check — cheap but spammable. */
export const voucherCheckLimiter: Limiter = {
  name: "voucher-check",
  limit: 30,
  window: "1 m",
};

/** Payout profile creation calls Paystack and should be rare. */
export const payoutProfileLimiter: Limiter = {
  name: "payout-profile",
  limit: 3,
  window: "1 h",
};

/** Bank list is cached, but keep public endpoint abuse bounded. */
export const bankListLimiter: Limiter = {
  name: "paystack-banks",
  limit: 60,
  window: "1 m",
};

/* ─── In-memory fallback ───────────────────────────────────── */

interface MemEntry {
  count: number;
  resetAt: number;
}
const memStore = new Map<string, MemEntry>();

const cleanupHandle = setInterval(() => {
  const now = Date.now();
  for (const [k, e] of memStore) if (now > e.resetAt) memStore.delete(k);
}, 60_000);
// Don't keep the Node event loop alive on shutdown.
if (typeof cleanupHandle.unref === "function") cleanupHandle.unref();

function windowToMs(w: Limiter["window"]): number {
  const [n, unit] = w.split(" ") as [string, "ms" | "s" | "m" | "h" | "d"];
  const v = Number(n);
  switch (unit) {
    case "ms": return v;
    case "s": return v * 1000;
    case "m": return v * 60_000;
    case "h": return v * 3_600_000;
    case "d": return v * 86_400_000;
  }
}

function memLimit(limiter: Limiter, key: string): RateLimitResult {
  const now = Date.now();
  const fullKey = `${limiter.name}:${key}`;
  const entry = memStore.get(fullKey);
  const windowMs = windowToMs(limiter.window);

  if (!entry || now > entry.resetAt) {
    memStore.set(fullKey, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limiter.limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limiter.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return {
    success: true,
    remaining: limiter.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/* ─── Public API ──────────────────────────────────────────── */

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimitArgs {
  /** Authenticated user id — preferred key when available. */
  user?: string;
  /** Request — used to extract IP as a secondary key. */
  request?: Request;
  /** Prefix used when only an IP is available (legacy callers). */
  prefix?: string;
}

/**
 * Apply a limiter. When both `user` and `request` are supplied, BOTH
 * keys are checked and the stricter result wins — so an attacker can't
 * bypass per-user limits by rotating IPs, and can't bypass per-IP
 * limits by rotating accounts.
 */
export async function rateLimit(
  limiter: Limiter,
  args: RateLimitArgs
): Promise<RateLimitResult> {
  const keys: string[] = [];
  if (args.user) keys.push(`user:${args.user}`);
  if (args.request) {
    const ip = extractIp(args.request);
    keys.push(`ip:${ip}`);
  }
  if (keys.length === 0) {
    keys.push(`anon:${args.prefix ?? limiter.name}`);
  }

  const rl = getRatelimit(limiter);

  let worst: RateLimitResult = {
    success: true,
    remaining: Number.MAX_SAFE_INTEGER,
    resetAt: 0,
  };

  for (const k of keys) {
    const result = rl
      ? await rl.limit(k).then((r) => ({
          success: r.success,
          remaining: r.remaining,
          resetAt: r.reset,
        }))
      : memLimit(limiter, k);

    if (!result.success && worst.success) {
      worst = result;
    } else if (result.remaining < worst.remaining) {
      worst = { ...worst, remaining: result.remaining, resetAt: result.resetAt };
    }
  }

  return worst;
}

/** Legacy helper kept for callers that haven't been migrated yet. */
export function getRateLimitKey(request: Request, prefix: string): string {
  const ip = extractIp(request);
  return `${prefix}:${ip}`;
}

function extractIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anon";
}
