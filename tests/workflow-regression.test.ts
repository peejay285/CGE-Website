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

function jsonRequest(body: unknown, headers?: HeadersInit) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");
  return new Request("http://localhost.test/api", {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  process.env.PAYSTACK_SECRET_KEY = "test-paystack-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "https://cgelounge.com";
});

describe("booking payment workflow", () => {
  it("initializes Paystack with the server-stored booking total and owner check", async () => {
    const reference = "booking_ref_123";
    const updates: Record<string, unknown>[] = [];
    const supabase = queuedClient({
      bookings: [
        query({
          data: {
            id: "booking-1",
            user_id: "user-1",
            total: 5000,
            payment_status: "pending",
          },
          error: null,
        }),
        query({ data: null, error: null }, { onUpdate: (patch) => updates.push(patch) }),
      ],
    });

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn(async () => ({
        auth: {
          getUser: vi.fn(async () => ({
            data: { user: { id: "user-1", email: "player@example.com" } },
          })),
        },
        from: supabase.from,
      })),
    }));
    vi.doMock("@/lib/rate-limit", () => ({
      paystackInitLimiter: { name: "paystack-init", limit: 6, window: "1 m" },
      rateLimit: vi.fn(async () => ({ success: true })),
    }));
    const initializeTransaction = vi.fn(async () => ({
      data: { authorization_url: "https://paystack.test/checkout", reference },
    }));
    vi.doMock("@/lib/paystack", () => ({
      generateReference: vi.fn(() => reference),
      initializeTransaction,
    }));

    const { POST } = await import("../app/api/paystack/initialize/route");
    const response = await POST(
      jsonRequest({
        type: "booking",
        client: "web",
        metadata: { booking_id: "booking-1" },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.amount).toBe(5000);
    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 500000, reference })
    );
    expect(updates).toContainEqual({ paystack_reference: reference });
  });

  it("marks a booking paid only after signed and verified Paystack webhook", async () => {
    const reference = "booking_ref_456";
    const updates: Record<string, unknown>[] = [];
    const admin = queuedClient({
      bookings: [
        query({
          data: {
            id: "booking-1",
            payment_status: "pending",
            total: 5000,
            zone_id: "vip",
            booking_date: "2026-07-01",
            time_slot: "18:00",
            user_id: "user-1",
            receipt_token: "receipt-token",
          },
          error: null,
        }),
        query({ data: null, error: null }, { onUpdate: (patch) => updates.push(patch) }),
      ],
      profiles: [query({ data: { phone: null }, error: null })],
    });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => admin),
    }));
    vi.doMock("@/lib/paystack", () => ({
      verifyTransaction: vi.fn(async () => ({
        status: true,
        data: { status: "success", amount: 500000, reference },
      })),
    }));
    vi.doMock("@/lib/sms", () => ({
      sendBookingSMS: vi.fn(async () => undefined),
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
    const signature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    const response = await POST(
      new Request("http://localhost.test/api/paystack/webhook", {
        method: "POST",
        headers: { "x-paystack-signature": signature },
        body,
      })
    );

    expect(response.status).toBe(200);
    expect(updates).toContainEqual({
      payment_status: "paid",
      paystack_reference: reference,
    });
  });

  it("activates swap assist after the final Paystack share is paid", async () => {
    const reference = "assist_ref_789";
    const paymentUpdates: Record<string, unknown>[] = [];
    const proposalUpdates: Record<string, unknown>[] = [];
    const admin = queuedClient({
      swap_assist_payments: [
        query({
          data: {
            id: "payment-1",
            proposal_id: "proposal-1",
            payment_status: "pending",
            total: 2500,
          },
          error: null,
        }),
        query({ data: null, error: null }, { onUpdate: (patch) => paymentUpdates.push(patch) }),
        query({ data: null, error: null, count: 0 }),
      ],
      swap_proposals: [
        query({ data: null, error: null }, { onUpdate: (patch) => proposalUpdates.push(patch) }),
      ],
    });

    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => admin),
    }));
    vi.doMock("@/lib/paystack", () => ({
      verifyTransaction: vi.fn(async () => ({
        status: true,
        data: { status: "success", amount: 250000, reference },
      })),
    }));
    vi.doMock("@/lib/sms", () => ({
      sendBookingSMS: vi.fn(async () => undefined),
    }));

    const { POST } = await import("../app/api/paystack/webhook/route");
    const body = JSON.stringify({
      event: "charge.success",
      data: {
        reference,
        amount: 250000,
        metadata: { type: "swap_assist", assist_payment_id: "payment-1" },
      },
    });
    const signature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest("hex");

    const response = await POST(
      new Request("http://localhost.test/api/paystack/webhook", {
        method: "POST",
        headers: { "x-paystack-signature": signature },
        body,
      })
    );

    expect(response.status).toBe(200);
    expect(paymentUpdates[0]).toMatchObject({
      payment_status: "paid",
      method: "paystack",
    });
    expect(proposalUpdates[0]).toMatchObject({ assist_status: "active" });
  });
});

describe("tournament match workflow", () => {
  async function loadTournamentRoute(
    admin: ReturnType<typeof queuedClient>,
    access: { isAdmin?: boolean; isHost?: boolean; isParticipant?: boolean },
    userId: string | { current: string } = "p1"
  ) {
    const advanceTournamentMatch = vi.fn(async () => undefined);
    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn(async () => ({
        auth: {
          getUser: vi.fn(async () => ({
            data: {
              user: {
                id: typeof userId === "string" ? userId : userId.current,
              },
            },
          })),
        },
      })),
    }));
    vi.doMock("@/lib/supabase/service", () => ({
      createServiceRoleClient: vi.fn(() => admin),
    }));
    vi.doMock("@/lib/tournament-operations", async () => {
      const actual = await vi.importActual<typeof import("@/lib/tournament-operations")>(
        "@/lib/tournament-operations"
      );
      return {
        ...actual,
        getTournamentActorAccess: vi.fn(async () => ({
          isAdmin: false,
          isHost: false,
          isParticipant: false,
          ...access,
        })),
        advanceTournamentMatch,
      };
    });
    const route = await import("../app/api/tournament-matches/[id]/route");
    return { POST: route.POST, advanceTournamentMatch };
  }

  it("parks participant reports for confirmation, then advances on confirm", async () => {
    const reportUpdates: Record<string, unknown>[] = [];
    const confirmUpdates: Record<string, unknown>[] = [];
    const baseMatch = {
      id: 10,
      tournament_id: 7,
      status: "in_progress",
      participant1_id: "p1",
      participant2_id: "p2",
      participant1_name: "Player 1",
      participant2_name: "Player 2",
      participant1_seed: 1,
      participant2_seed: 2,
      next_match_id: 20,
      next_match_slot: 1,
      loser_next_match_id: null,
      loser_next_match_slot: null,
    };
    const reportedMatch = {
      ...baseMatch,
      status: "awaiting_confirmation",
      winner_id: "p1",
      loser_id: "p2",
      reported_by: "p1",
      participant1_score: 3,
      participant2_score: 1,
    };
    const admin = queuedClient({
      tournament_matches: [
        query({ data: baseMatch, error: null }),
        query({ data: reportedMatch, error: null }, { onUpdate: (patch) => reportUpdates.push(patch) }),
        query({ data: reportedMatch, error: null }),
        query(
          { data: { ...reportedMatch, status: "completed" }, error: null },
          { onUpdate: (patch) => confirmUpdates.push(patch) }
        ),
      ],
    });

    const actor = { current: "p1" };
    const { POST, advanceTournamentMatch } = await loadTournamentRoute(
      admin,
      { isParticipant: true },
      actor
    );

    const reportResponse = await POST(
      jsonRequest({
        action: "report",
        winner_id: "p1",
        participant1_score: 3,
        participant2_score: 1,
      }),
      { params: Promise.resolve({ id: "10" }) }
    );
    expect(reportResponse.status).toBe(200);
    expect(reportUpdates[0]).toMatchObject({
      status: "awaiting_confirmation",
      winner_id: "p1",
      loser_id: "p2",
    });
    expect(advanceTournamentMatch).not.toHaveBeenCalled();

    actor.current = "p2";
    const confirmResponse = await POST(
      jsonRequest({ action: "confirm" }),
      { params: Promise.resolve({ id: "10" }) }
    );
    expect(confirmResponse.status).toBe(200);
    expect(confirmUpdates[0]).toMatchObject({ status: "completed" });
    expect(advanceTournamentMatch).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ id: 10 }),
      "p1",
      "p2"
    );
  });

  it("advances the bracket when a host dismisses a dispute and original result stands", async () => {
    const disputedMatch = {
      id: 10,
      tournament_id: 7,
      status: "disputed",
      participant1_id: "p1",
      participant2_id: "p2",
      participant1_name: "Player 1",
      participant2_name: "Player 2",
      participant1_seed: 1,
      participant2_seed: 2,
      participant1_score: 3,
      participant2_score: 1,
      winner_id: "p1",
      loser_id: "p2",
      next_match_id: 20,
      next_match_slot: 1,
      loser_next_match_id: null,
      loser_next_match_slot: null,
      completed_at: null,
    };
    const admin = queuedClient({
      tournament_matches: [
        query({ data: disputedMatch, error: null }),
        query({ data: { ...disputedMatch, status: "completed" }, error: null }),
      ],
      match_disputes: [
        query({ data: { id: 5, match_id: 10, status: "open" }, error: null }),
        query({ data: { id: 5, match_id: 10, status: "dismissed" }, error: null }),
      ],
    });

    const { POST, advanceTournamentMatch } = await loadTournamentRoute(
      admin,
      { isHost: true },
      "host-1"
    );

    const response = await POST(
      jsonRequest({
        action: "resolve_dispute",
        dispute_id: 5,
        decision: "dismissed",
        resolution: "Original result verified by admin.",
      }),
      { params: Promise.resolve({ id: "10" }) }
    );

    expect(response.status).toBe(200);
    expect(advanceTournamentMatch).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ id: 10 }),
      "p1",
      "p2"
    );
  });
});

describe("payout release workflow", () => {
  it("releases an approved payout through Paystack and marks tournament paid when all payouts settle", async () => {
    const payoutUpdates: Record<string, unknown>[] = [];
    const tournamentUpdates: Record<string, unknown>[] = [];
    const serverClient = queuedClient({
      profiles: [query({ data: { is_admin: true }, error: null })],
    });
    const admin = queuedClient({
      tournament_payouts: [
        query({
          data: {
            id: "payout-1",
            tournament_id: 7,
            user_id: "winner-1",
            placement: 1,
            net_amount: 15000,
            status: "approved",
            paystack_transfer_reference: null,
          },
          error: null,
        }),
        query({ data: null, error: null }, { onUpdate: (patch) => payoutUpdates.push(patch) }),
        query({ data: null, error: null }, { onUpdate: (patch) => payoutUpdates.push(patch) }),
        query({ data: null, error: null, count: 0 }),
      ],
      profiles: [query({ data: { payout_recipient_code: "RCP_123" }, error: null })],
      tournaments: [
        query({ data: null, error: null }, { onUpdate: (patch) => tournamentUpdates.push(patch) }),
      ],
    });

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: vi.fn(async () => ({
        auth: {
          getUser: vi.fn(async () => ({ data: { user: { id: "admin-1" } } })),
        },
        from: serverClient.from,
      })),
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: vi.fn(() => admin),
    }));
    vi.doMock("@/lib/paystack", () => ({
      generateReference: vi.fn(() => "payout_ref_1"),
      initiateTransfer: vi.fn(async () => ({
        data: { status: "success", transfer_code: "TRF_123" },
      })),
    }));

    const { POST } = await import("../app/api/tournament-payouts/[id]/release/route");
    const response = await POST(jsonRequest({}), {
      params: Promise.resolve({ id: "payout-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("paid");
    expect(payoutUpdates[0]).toMatchObject({
      status: "processing",
      paystack_transfer_reference: "payout_ref_1",
    });
    expect(payoutUpdates[1]).toMatchObject({
      status: "paid",
      paystack_transfer_code: "TRF_123",
    });
    expect(tournamentUpdates[0]).toMatchObject({ payout_status: "paid" });
  });
});

describe("chat and swap database hardening contracts", () => {
  it("keeps chat conversations tied to the actual listing seller and limits message updates", async () => {
    const sql = await import("node:fs/promises").then((fs) =>
      fs.readFile("supabase/chat-integrity-hardening-migration.sql", "utf8")
    );

    expect(sql).toContain("ml.user_id = conversations.seller_id");
    expect(sql).toContain("buyer_id <> seller_id");
    expect(sql).toContain("grant update (is_read) on public.messages");
    expect(sql).toContain("revoke update on table public.conversations");
  });

  it("moves swap lifecycle writes behind RPCs and revokes direct row update", async () => {
    const sql = await import("node:fs/promises").then((fs) =>
      fs.readFile("supabase/swap-lifecycle-rpc-hardening-migration.sql", "utf8")
    );

    expect(sql).toContain("create or replace function public.set_swap_proposal_decision");
    expect(sql).toContain("create or replace function public.mark_swap_shipped");
    expect(sql).toContain("create or replace function public.mark_swap_received");
    expect(sql).toContain("create or replace function public.dispute_swap_proposal");
    expect(sql).toContain("revoke update on table public.swap_proposals");
    expect(sql).toContain("Users can create valid proposals");
    expect(sql).toContain("offered.user_id = auth.uid()");
    expect(sql).toContain("target.user_id <> auth.uid()");
    expect(sql).not.toContain("select sp, ml.user_id");
    expect(sql).not.toContain("into v_prop, v_owner");
    expect(sql).toContain("select sp.*");
    expect(sql).toContain("Swap listing owner not found");
  });
});
