import { NextResponse } from "next/server";
import { initializeTransaction, generateReference } from "@/lib/paystack";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { paystackInitializeSchema } from "@/lib/validations";
import { rateLimit, paystackInitLimiter } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site-url";

const PAYSTACK_RECORD_CONFIG = {
  booking: { table: "bookings", ownerColumn: "user_id" },
  tournament: { table: "tournament_registrations", ownerColumn: "user_id" },
  tournament_team: { table: "tournament_team_registrations", ownerColumn: "registered_by" },
  event: { table: "event_registrations", ownerColumn: "user_id" },
  swap_assist: { table: "swap_assist_payments", ownerColumn: "payer_id" },
} as const;

type PaystackRecordType = keyof typeof PAYSTACK_RECORD_CONFIG;

function isRecordPaymentType(type: string): type is PaystackRecordType {
  return type in PAYSTACK_RECORD_CONFIG;
}

function buildCallbackPath(
  type: PaystackRecordType,
  reference: string,
  metadata: Record<string, unknown>,
  client: "web" | "mobile"
) {
  const params = new URLSearchParams({
    payment_ref: reference,
    payment_type: type,
  });
  if (typeof metadata.tournament_id === "number") {
    params.set("tournament_id", String(metadata.tournament_id));
  }
  if (client === "mobile") {
    return `/payment/mobile-return?${params.toString()}`;
  }

  if (type === "booking") {
    return `/lounge?payment_ref=${reference}`;
  }

  if ((type === "tournament" || type === "tournament_team") && typeof metadata.tournament_id === "number") {
    return `/esports/${metadata.tournament_id}?${params.toString()}`;
  }

  if (type === "tournament" || type === "tournament_team") {
    return `/esports?${params.toString()}`;
  }

  if (type === "swap_assist") {
    return `/profile/swaps?${params.toString()}`;
  }

  return `/events?${params.toString()}`;
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

    // Rate limit per-user AND per-IP. Per-user is the trustworthy key
    // (auth required); IP is a coarse fallback against abusive subnets.
    const rl = await rateLimit(paystackInitLimiter, {
      user: user.id,
      request,
      prefix: "paystack",
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: rl.resetAt
            ? { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
            : undefined,
        }
      );
    }

    const body = await request.json();

    // Validate request body with Zod
    const parsed = paystackInitializeSchema.safeParse(body);
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

    const { type, metadata, client } = parsed.data;

    if (!user.email) {
      return NextResponse.json(
        { error: "Account does not have an email address. Please update your profile." },
        { status: 400 }
      );
    }

    // Server-side amount resolution. The client cannot influence the
    // amount we charge — we look up the row by id, verify ownership and
    // payment_status, then use its server-stored total.
    const recordId =
      metadata?.booking_id ?? metadata?.registration_id ?? metadata?.assist_payment_id ?? null;
    if (typeof recordId !== "string" || !recordId) {
      return NextResponse.json(
        { error: "Missing booking_id / registration_id / assist_payment_id in metadata" },
        { status: 400 }
      );
    }

    let amountNaira: number;
    if (type === "premium") {
      // Premium has a fixed server-side price catalog (separate route).
      // Reject premium initialization through this generic endpoint —
      // premium upgrades go through /api/premium/initialize which owns
      // its own pricing. (Keeping the type in the schema for now so
      // the webhook continues to dispatch correctly.)
      return NextResponse.json(
        { error: "Premium upgrades must use the /api/premium/initialize route" },
        { status: 400 }
      );
    } else {
      if (!isRecordPaymentType(type)) {
        return NextResponse.json(
          { error: `Unsupported payment type: ${type}` },
          { status: 400 }
        );
      }

      const config = PAYSTACK_RECORD_CONFIG[type];
      const { data: record, error: fetchError } = await supabase
        .from(config.table)
        .select(`id, ${config.ownerColumn}, total, payment_status`)
        .eq("id", recordId)
        .single();

      if (fetchError || !record) {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      }
      const r = record as Record<string, unknown> & {
        total: number | null;
        payment_status: string | null;
      };
      if (r[config.ownerColumn] !== user.id) {
        return NextResponse.json(
          { error: "Not authorized to pay for this record" },
          { status: 403 }
        );
      }
      if (r.payment_status === "paid") {
        return NextResponse.json(
          { error: "This record has already been paid" },
          { status: 409 }
        );
      }
      if (r.total == null || r.total <= 0) {
        return NextResponse.json(
          { error: "Record has no billable total" },
          { status: 400 }
        );
      }
      amountNaira = r.total;
    }

    const reference = generateReference(type);
    const callbackPath = buildCallbackPath(type, reference, metadata, client);
    const callbackUrl = absoluteUrl(callbackPath, request.headers);

    const idMetadata =
      type === "booking"
        ? { booking_id: recordId }
        : type === "tournament_team"
          ? { registration_id: recordId, team_registration_id: recordId }
        : type === "tournament"
          ? { registration_id: recordId }
        : type === "swap_assist"
          ? { assist_payment_id: recordId }
          : { registration_id: recordId };

    const result = await initializeTransaction({
      email: user.email,
      amount: amountNaira * 100, // Convert Naira to kobo
      reference,
      callback_url: callbackUrl,
      metadata: {
        user_id: user.id,
        type,
        ...idMetadata,
        ...metadata,
      },
    });

    // Stamp the reference onto the record so the webhook can find it.
    {
      if (isRecordPaymentType(type)) {
        const config = PAYSTACK_RECORD_CONFIG[type];
        await supabase
          .from(config.table)
          .update({ paystack_reference: result.data.reference })
          .eq("id", recordId)
          .eq(config.ownerColumn, user.id);
      }
    }

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
      amount: amountNaira,
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
