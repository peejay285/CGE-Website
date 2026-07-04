import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { refundTransaction } from "@/lib/paystack";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// The [id] can be a solo or a team registration — both are uuids, so we
// probe the solo table first and fall back to the team table.
const REGISTRATION_TABLES = [
  "tournament_registrations",
  "tournament_team_registrations",
] as const;

interface RefundableRegistration {
  id: string;
  tournament_id: number;
  total: number;
  payment_status: string;
  paystack_reference: string | null;
  refund_status: string | null;
  refund_reference: string | null;
  refunded_at: string | null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const admin = getAdminClient();

    let registration: RefundableRegistration | null = null;
    let table: (typeof REGISTRATION_TABLES)[number] | null = null;
    for (const candidate of REGISTRATION_TABLES) {
      const { data } = await admin
        .from(candidate)
        .select(
          "id, tournament_id, total, payment_status, paystack_reference, refund_status, refund_reference, refunded_at"
        )
        .eq("id", id)
        .maybeSingle();

      if (data) {
        registration = data as RefundableRegistration;
        table = candidate;
        break;
      }
    }

    if (!registration || !table) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Idempotent: already refunded — report success without touching Paystack.
    if (registration.refund_status === "refunded") {
      return NextResponse.json({
        registration_id: registration.id,
        status: "refunded",
        refund_reference: registration.refund_reference,
        already_refunded: true,
      });
    }

    if (
      registration.refund_status !== "refund_pending" &&
      registration.refund_status !== "failed"
    ) {
      return NextResponse.json(
        {
          error: `Registration is not awaiting a refund (status: ${
            registration.refund_status ?? "none"
          })`,
        },
        { status: 409 }
      );
    }

    if (
      registration.payment_status !== "paid" ||
      !registration.paystack_reference ||
      registration.total <= 0
    ) {
      return NextResponse.json(
        { error: "Registration has no refundable Paystack payment" },
        { status: 400 }
      );
    }

    try {
      // Refund exactly the stored entry fee — the amount always comes
      // from the registration row, never from the request.
      const refund = await refundTransaction({
        transaction: registration.paystack_reference,
        amount: registration.total * 100,
        merchant_note: `CGE tournament ${registration.tournament_id} cancelled - entry fee refund`,
      });

      if (!refund.status) {
        throw new Error(refund.message || "Paystack refund was not accepted");
      }

      const refundReference = refund.data?.id
        ? String(refund.data.id)
        : registration.paystack_reference;
      const now = new Date().toISOString();

      await admin
        .from(table)
        .update({
          refund_status: "refunded",
          refund_reference: refundReference,
          refunded_at: now,
          refund_notes: `Paystack refund status: ${refund.data?.status ?? "accepted"}`,
        })
        .eq("id", registration.id);

      return NextResponse.json({
        registration_id: registration.id,
        status: "refunded",
        refund_reference: refundReference,
      });
    } catch (refundError) {
      const message =
        refundError instanceof Error
          ? refundError.message
          : "Paystack refund failed";

      await admin
        .from(table)
        .update({
          refund_status: "failed",
          refund_notes: message,
        })
        .eq("id", registration.id);

      return NextResponse.json(
        { registration_id: registration.id, status: "failed", error: message },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[tournament-refunds/process] unhandled", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
