import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult = {
  data?: unknown;
  error?: null | { message?: string };
  count?: number | null;
};

function query(
  result: QueryResult,
  options: {
    onUpdate?: (patch: Record<string, unknown>) => void;
    onInsert?: (row: Record<string, unknown>) => void;
  } = {}
) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    not: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    update: vi.fn((patch: Record<string, unknown>) => {
      options.onUpdate?.(patch);
      return chain;
    }),
    insert: vi.fn((row: Record<string, unknown>) => {
      options.onInsert?.(row);
      return chain;
    }),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
  };

  return chain;
}

function queuedClient(queues: Record<string, Array<ReturnType<typeof query>>>) {
  return {
    from: vi.fn((table: string) => {
      const next = queues[table]?.shift();
      if (!next) throw new Error(`Unexpected table query: ${table}`);
      return next;
    }),
  };
}

function signBody(body: string) {
  return crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest("hex");
}

function webhookRequest(body: string, signature: string) {
  return new Request("http://localhost.test/api/paystack/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": signature },
    body,
  });
}

function mockAdmin(admin: ReturnType<typeof queuedClient>) {
  vi.doMock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => admin),
  }));
  vi.doMock("@/lib/sms", () => ({
    sendBookingSMS: vi.fn(async () => undefined),
  }));
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  process.env.PAYSTACK_SECRET_KEY = "test-paystack-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "https://cgelounge.com";
});

describe("paystack webhook security", () => {
  it("rejects an invalid signature without touching the database or Paystack", async () => {
    const admin = queuedClient({});
    mockAdmin(admin);
    const verifyTransaction = vi.fn();
    vi.doMock("@/lib/paystack", () => ({ verifyTransaction }));

    const { POST } = await import("../app/api/paystack/webhook/route");
    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference: "booking_ref_evil",
        amount: 500000,
        metadata: { type: "booking" },
      },
    });
    // Same length as a real sha512 hex digest, but wrong value.
    const forged = "0".repeat(128);

    const response = await POST(webhookRequest(body, forged));

    expect(response.status).toBe(400);
    expect(verifyTransaction).not.toHaveBeenCalled();
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("rejects a signed payload when the Paystack verify amount does not match", async () => {
    const admin = queuedClient({});
    mockAdmin(admin);
    const reference = "booking_ref_verify";
    vi.doMock("@/lib/paystack", () => ({
      verifyTransaction: vi.fn(async () => ({
        status: true,
        // Paystack says only 1,000 kobo were collected.
        data: { status: "success", amount: 1000, reference },
      })),
    }));

    const { POST } = await import("../app/api/paystack/webhook/route");
    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference,
        amount: 500000,
        metadata: { type: "booking" },
      },
    });

    const response = await POST(webhookRequest(body, signBody(body)));

    expect(response.status).toBe(400);
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("does not double-process a booking that is already paid", async () => {
    const reference = "booking_ref_replay";
    const updates: Record<string, unknown>[] = [];
    const admin = queuedClient({
      bookings: [
        query({
          data: {
            id: "booking-1",
            payment_status: "paid",
            total: 5000,
            zone_id: "vip",
            booking_date: "2026-07-01",
            time_slot: "18:00",
            user_id: "user-1",
            receipt_token: "receipt-token",
          },
          error: null,
        }),
        // Spare update query: the route must never reach it.
        query({ data: null, error: null }, { onUpdate: (patch) => updates.push(patch) }),
      ],
    });
    mockAdmin(admin);
    vi.doMock("@/lib/paystack", () => ({
      verifyTransaction: vi.fn(async () => ({
        status: true,
        data: { status: "success", amount: 500000, reference },
      })),
    }));

    const { POST } = await import("../app/api/paystack/webhook/route");
    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference,
        amount: 500000,
        metadata: { type: "booking", booking_id: "booking-1" },
      },
    });

    const response = await POST(webhookRequest(body, signBody(body)));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ received: true });
    expect(updates).toHaveLength(0);
    // Only the idempotency fetch ran; no second query hit the table.
    expect(admin.from).toHaveBeenCalledTimes(1);
  });

  it("rejects a tournament payment whose amount does not match the registration total", async () => {
    const reference = "tournament_ref_short";
    const updates: Record<string, unknown>[] = [];
    const admin = queuedClient({
      tournament_registrations: [
        query({
          data: { id: "reg-1", payment_status: "pending", total: 5000 },
          error: null,
        }),
        // Spare update query: the route must never reach it.
        query({ data: null, error: null }, { onUpdate: (patch) => updates.push(patch) }),
      ],
    });
    mockAdmin(admin);
    vi.doMock("@/lib/paystack", () => ({
      verifyTransaction: vi.fn(async () => ({
        // Verify agrees with the payload — the underpayment is caught
        // against the server-stored registration total instead.
        status: true,
        data: { status: "success", amount: 100000, reference },
      })),
    }));

    const { POST } = await import("../app/api/paystack/webhook/route");
    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference,
        // 1,000 Naira paid for a 5,000 Naira entry fee.
        amount: 100000,
        metadata: { type: "tournament" },
      },
    });

    const response = await POST(webhookRequest(body, signBody(body)));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Amount mismatch");
    expect(updates).toHaveLength(0);
  });
});
