import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getBookingTotals } from "@/lib/pricing";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Server-owned booking creation. The client no longer inserts into
 * `bookings` directly — the table's insert policy is now disabled (see
 * supabase/lockdown-bookings-insert-migration.sql). This route is the
 * only path that can write a booking, and it recomputes session_total,
 * drinks_total and total from authoritative pricing in lib/pricing.ts —
 * so a tampered client total cannot result in a cheap (or free) session.
 */

const createBookingSchema = z.object({
  zone_id: z.enum(["main", "vip", "vr"]),
  game_name: z.string().min(1).max(100),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_slot: z.string().min(1).max(40),
  duration: z.number().int().positive().max(8),
  drinks: z.record(z.string().max(60), z.number().int().min(0).max(50)).default({}),
  payment_method: z.enum(["paystack", "venue"]),
  voucher_code: z.string().trim().min(6).max(40).optional(),
});

const bookingCreateLimiter = {
  name: "booking-create",
  limit: 6,
  window: "1 m" as const,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BOOKING_ADVANCE_DAYS = 30;
const MAX_ACTIVE_USER_BOOKINGS = 6;
const MAX_USER_BOOKINGS_PER_DAY = 4;
const MAX_PENDING_VENUE_BOOKINGS = 3;

function dateOnlyUtcMs(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

function todayIsoDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const rl = await rateLimit(bookingCreateLimiter, {
      user: user.id,
      request,
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many booking attempts. Please slow down." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.issues.map((i) => ({
            path: (i.path ?? []).join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { zone_id, game_name, booking_date, time_slot, duration, drinks, payment_method, voucher_code } = parsed.data;

    const requestedDateMs = dateOnlyUtcMs(booking_date);
    const todayMs = dateOnlyUtcMs(todayIsoDate());
    if (requestedDateMs == null || todayMs == null) {
      return NextResponse.json(
        { error: "Invalid booking date" },
        { status: 400 }
      );
    }
    if (requestedDateMs < todayMs) {
      return NextResponse.json(
        { error: "Choose today or a future date" },
        { status: 400 }
      );
    }
    if (requestedDateMs > todayMs + MAX_BOOKING_ADVANCE_DAYS * DAY_MS) {
      return NextResponse.json(
        { error: `Bookings can only be made ${MAX_BOOKING_ADVANCE_DAYS} days ahead` },
        { status: 400 }
      );
    }

    // ── Authoritative price calculation ────────────────────────
    const totals = getBookingTotals(zone_id, game_name, duration, drinks);
    if (totals.total <= 0 || totals.unitPrice <= 0) {
      return NextResponse.json(
        { error: "Could not price this booking. Check zone/game selection." },
        { status: 400 }
      );
    }

    // ── Service client for the actual write (RLS now blocks user-context inserts).
    const admin = getServiceClient();
    const today = todayIsoDate();

    const [activeCountResult, sameDayCountResult, venueCountResult] =
      await Promise.all([
        admin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .gte("booking_date", today),
        admin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .eq("booking_date", booking_date),
        admin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("payment_method", "venue")
          .eq("payment_status", "pending")
          .neq("status", "cancelled")
          .gte("booking_date", today),
      ]);

    if (
      activeCountResult.error ||
      sameDayCountResult.error ||
      venueCountResult.error
    ) {
      return NextResponse.json(
        { error: "Could not verify booking limits" },
        { status: 500 }
      );
    }

    if ((activeCountResult.count ?? 0) >= MAX_ACTIVE_USER_BOOKINGS) {
      return NextResponse.json(
        {
          error: `You can only hold ${MAX_ACTIVE_USER_BOOKINGS} active bookings at a time. Cancel an old booking first.`,
        },
        { status: 409 }
      );
    }

    if ((sameDayCountResult.count ?? 0) >= MAX_USER_BOOKINGS_PER_DAY) {
      return NextResponse.json(
        {
          error: `You can only make ${MAX_USER_BOOKINGS_PER_DAY} bookings for the same day.`,
        },
        { status: 409 }
      );
    }

    if (
      payment_method === "venue" &&
      (venueCountResult.count ?? 0) >= MAX_PENDING_VENUE_BOOKINGS
    ) {
      return NextResponse.json(
        {
          error: `You can only hold ${MAX_PENDING_VENUE_BOOKINGS} unpaid pay-at-venue reservations at a time.`,
        },
        { status: 409 }
      );
    }

    // ── Voucher validation + atomic claim (server-owned) ───────
    // The voucher covers up to `voucher.duration` units of session time in
    // its zone. We validate ownership/zone/expiry, then claim it with a
    // conditional update so two concurrent bookings can't both redeem it.
    let voucherDiscount = 0;
    let claimedVoucherId: string | null = null;
    let claimedVoucherCode: string | null = null;

    if (voucher_code) {
      const normalized = voucher_code.toUpperCase();
      const { data: voucher } = await admin
        .from("vouchers")
        .select("id, code, user_id, zone_id, duration, status, expires_at")
        .eq("code", normalized)
        .maybeSingle();

      if (!voucher || voucher.user_id !== user.id) {
        return NextResponse.json(
          { error: "Invalid voucher code" },
          { status: 400 }
        );
      }
      if (voucher.status !== "active" || new Date(voucher.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "This voucher has expired or was already redeemed" },
          { status: 400 }
        );
      }
      if (voucher.zone_id !== zone_id) {
        return NextResponse.json(
          { error: "This voucher is for a different zone" },
          { status: 400 }
        );
      }

      // Atomic claim — only succeeds if still active.
      const { data: claimed } = await admin
        .from("vouchers")
        .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
        .eq("id", voucher.id)
        .eq("status", "active")
        .select("id")
        .maybeSingle();

      if (!claimed) {
        return NextResponse.json(
          { error: "This voucher was already redeemed" },
          { status: 409 }
        );
      }

      claimedVoucherId = voucher.id;
      claimedVoucherCode = normalized;
      voucherDiscount = Math.min(
        totals.sessionTotal,
        totals.unitPrice * voucher.duration
      );
    }

    const finalSessionTotal = totals.sessionTotal - voucherDiscount;
    const finalTotal = finalSessionTotal + totals.drinksTotal;

    // Helper: hand the voucher back if booking creation fails downstream.
    const releaseVoucher = async () => {
      if (!claimedVoucherId) return;
      await admin
        .from("vouchers")
        .update({ status: "active", redeemed_at: null })
        .eq("id", claimedVoucherId);
    };

    // Resolve game id (FK). Look up first matching row for zone+name; fall
    // back to the cheapest row in the zone — same behaviour as the
    // previous client code, but now done server-side.
    const { data: gameRow } = await admin
      .from("games")
      .select("id")
      .eq("zone_id", zone_id)
      .eq("name", game_name)
      .limit(1)
      .maybeSingle();

    const gameId = (gameRow as { id: number } | null)?.id ?? null;
    if (!gameId) {
      await releaseVoucher();
      return NextResponse.json(
        { error: "Game not available in this zone" },
        { status: 400 }
      );
    }

    // ── Insert booking through capacity-safe DB function ───────
    const { data: inserted, error: insertError } = await admin
      .rpc("create_booking_with_capacity", {
        p_user_id: user.id,
        p_zone_id: zone_id,
        p_game_id: gameId,
        p_booking_date: booking_date,
        p_time_slot: time_slot,
        p_duration: duration,
        p_drinks: drinks,
        p_session_total: finalSessionTotal,
        p_drinks_total: totals.drinksTotal,
        p_total: finalTotal,
        p_payment_method: payment_method,
      })
      .single();

    if (insertError || !inserted) {
      await releaseVoucher();
      console.error("[bookings/create] insert failed", insertError);
      const message = insertError?.message ?? "";
      if (message.includes("Time slot is full")) {
        return NextResponse.json(
          { error: "Time slot is full" },
          { status: 409 }
        );
      }
      if (message.includes("Zone not found")) {
        return NextResponse.json(
          { error: "Zone not found" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Could not create booking" },
        { status: 500 }
      );
    }

    let bookingRow = inserted as {
      id: string;
      total: number;
      payment_status: string;
      receipt_token: string | null;
    };

    // Link the redeemed voucher to its booking, stamp the code on the
    // booking, and settle payment if the voucher covers the full amount.
    if (claimedVoucherId) {
      await admin
        .from("vouchers")
        .update({ redeemed_booking_id: bookingRow.id })
        .eq("id", claimedVoucherId);

      const bookingPatch: Record<string, unknown> = { pass_code: claimedVoucherCode };
      if (finalTotal === 0) {
        bookingPatch.payment_status = "paid"; // fully covered — nothing to charge
      }
      const { data: patched } = await admin
        .from("bookings")
        .update(bookingPatch)
        .eq("id", bookingRow.id)
        .select()
        .single();
      if (patched) bookingRow = patched as typeof bookingRow;
    }

    // Auto-enter monthly giveaway (best effort — don't fail the booking).
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await admin
      .from("giveaway_entries")
      .insert({
        user_id: user.id,
        booking_id: bookingRow.id,
        month,
      })
      .then(({ error }) => {
        if (error) {
          console.warn("[bookings/create] giveaway entry failed", error.message);
        }
      });

    return NextResponse.json({
      booking: bookingRow,
      voucher_applied: claimedVoucherCode
        ? { code: claimedVoucherCode, discount: voucherDiscount }
        : null,
    });
  } catch (error) {
    console.error("[bookings/create] unhandled", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
