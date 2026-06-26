import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateReference, initiateTransfer } from "@/lib/paystack";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function mapPaystackTransferStatus(status: string) {
  if (status === "success") return "paid";
  if (
    status === "failed" ||
    status === "reversed" ||
    status === "abandoned" ||
    status === "blocked" ||
    status === "rejected"
  ) {
    return "failed";
  }
  return "processing";
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
    const { data: payout, error: payoutError } = await admin
      .from("tournament_payouts")
      .select("id, tournament_id, user_id, placement, net_amount, status, paystack_transfer_reference")
      .eq("id", id)
      .single();

    if (payoutError || !payout) {
      return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    }

    if (payout.status !== "approved" && payout.status !== "failed") {
      return NextResponse.json(
        { error: `Payout is not releasable from status: ${payout.status}` },
        { status: 409 }
      );
    }

    const { data: recipientProfile } = await admin
      .from("profiles")
      .select("payout_recipient_code")
      .eq("id", payout.user_id)
      .maybeSingle();

    if (!recipientProfile?.payout_recipient_code) {
      return NextResponse.json(
        { error: "Winner has no verified payout recipient yet" },
        { status: 400 }
      );
    }

    const reference =
      payout.paystack_transfer_reference ?? generateReference("payout");

    await admin
      .from("tournament_payouts")
      .update({
        status: "processing",
        paystack_transfer_reference: reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payout.id);

    const transfer = await initiateTransfer({
      amount: payout.net_amount * 100,
      recipient: recipientProfile.payout_recipient_code,
      reference,
      reason: `CGE tournament prize - place ${payout.placement}`,
    });

    const nextStatus = mapPaystackTransferStatus(transfer.data.status);
    const now = new Date().toISOString();

    await admin
      .from("tournament_payouts")
      .update({
        status: nextStatus,
        paystack_transfer_code: transfer.data.transfer_code,
        processed_at: nextStatus === "paid" || nextStatus === "failed" ? now : null,
        updated_at: now,
        notes: `Paystack transfer status: ${transfer.data.status}`,
      })
      .eq("id", payout.id);

    if (nextStatus === "paid") {
      const { count } = await admin
        .from("tournament_payouts")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", payout.tournament_id)
        .neq("status", "paid");

      if ((count ?? 0) === 0) {
        await admin
          .from("tournaments")
          .update({
            payout_status: "paid",
            payout_released_at: now,
          })
          .eq("id", payout.tournament_id);
      }
    } else if (nextStatus === "failed") {
      await admin
        .from("tournaments")
        .update({ payout_status: "failed" })
        .eq("id", payout.tournament_id);
    } else {
      await admin
        .from("tournaments")
        .update({ payout_status: "processing" })
        .eq("id", payout.tournament_id);
    }

    return NextResponse.json({
      payout_id: payout.id,
      reference,
      status: nextStatus,
      transfer_status: transfer.data.status,
    });
  } catch (error) {
    console.error("[tournament-payouts/release] unhandled", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to release payout" },
      { status: 500 }
    );
  }
}
