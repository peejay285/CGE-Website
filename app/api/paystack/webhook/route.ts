import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { sendBookingSMS } from "@/lib/sms";
import { absoluteUrl } from "@/lib/site-url";
import { bookingReceiptPath } from "@/lib/booking-receipt";
import { verifyTransaction } from "@/lib/paystack";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

// Use service role for webhook (no user session)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!signature) {
      console.error("[Webhook] Missing x-paystack-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature using timing-safe comparison
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    const hashBuffer = Buffer.from(hash);
    const signatureBuffer = Buffer.from(signature);

    if (
      hashBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(hashBuffer, signatureBuffer)
    ) {
      console.error("[Webhook] Invalid signature", {
        receivedLength: signature.length,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const supabase = getAdminClient();

    if (event.event === "charge.success") {
      const { reference, metadata, amount } = event.data;

      // Defense-in-depth: re-verify the transaction directly with
      // Paystack. The signature check above already proves origin, but
      // pulling the canonical record ensures: (a) the reference exists,
      // (b) status is genuinely "success", (c) amount matches what
      // Paystack actually collected. If the secret key ever leaks, an
      // attacker who could spoof a signed payload still cannot fake the
      // verify call — it goes to api.paystack.co with our key.
      try {
        const verified = await verifyTransaction(reference);
        if (
          !verified.status ||
          verified.data.status !== "success" ||
          verified.data.amount !== amount ||
          verified.data.reference !== reference
        ) {
          console.error("[Webhook] Paystack verify mismatch", {
            reference,
            verifiedStatus: verified.data?.status,
            verifiedAmount: verified.data?.amount,
            payloadAmount: amount,
          });
          return NextResponse.json(
            { error: "Verification failed" },
            { status: 400 }
          );
        }
      } catch (e) {
        console.error("[Webhook] verifyTransaction threw", {
          reference,
          message: e instanceof Error ? e.message : String(e),
        });
        return NextResponse.json(
          { error: "Verification unavailable" },
          { status: 502 }
        );
      }

      if (metadata?.type === "booking") {
        // Fetch the booking to check idempotency and verify amount
        const { data: booking, error: fetchError } = await supabase
          .from("bookings")
          .select("id, payment_status, total, zone_id, booking_date, time_slot, user_id, receipt_token")
          .eq("paystack_reference", reference)
          .single();

        if (fetchError || !booking) {
          console.error("[Webhook] Booking not found", {
            reference,
            error: fetchError?.message,
          });
          return NextResponse.json({ received: true });
        }

        // Idempotency: skip if already paid
        if (booking.payment_status === "paid") {
          console.info("[Webhook] Booking already paid, skipping", {
            reference,
            bookingId: booking.id,
          });
          return NextResponse.json({ received: true });
        }

        // Verify amount matches (Paystack sends amount in kobo, booking.total is in Naira)
        const paidAmountNaira = amount / 100;
        if (paidAmountNaira !== booking.total) {
          console.error("[Webhook] Amount mismatch", {
            reference,
            bookingId: booking.id,
            expectedNaira: booking.total,
            paidNaira: paidAmountNaira,
          });
          return NextResponse.json(
            { error: "Amount mismatch" },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from("bookings")
          .update({
            payment_status: "paid",
            paystack_reference: reference,
          })
          .eq("id", booking.id);

        if (updateError) {
          console.error("[Webhook] Failed to update booking", {
            reference,
            bookingId: booking.id,
            error: updateError.message,
          });
        } else {
          // Fire-and-forget SMS confirmation. No-ops cleanly if Termii isn't
          // configured. Don't block the webhook response on its outcome.
          const { data: profile } = await supabase
            .from("profiles")
            .select("phone")
            .eq("id", (booking as { user_id: string }).user_id)
            .maybeSingle();
          if (profile?.phone) {
            const b = booking as {
              id: string;
              zone_id: string;
              booking_date: string;
              time_slot: string;
              receipt_token: string | null;
            };
            const receiptUrl = absoluteUrl(
              bookingReceiptPath(b.id, b.receipt_token),
              request.headers,
            );
            sendBookingSMS({
              to: profile.phone,
              zoneName: b.zone_id,
              date: b.booking_date,
              time: b.time_slot,
              bookingId: b.id,
              isPaid: true,
              receiptUrl,
            }).catch((e) =>
              console.error("[Webhook] sendBookingSMS threw", {
                message: e instanceof Error ? e.message : String(e),
              }),
            );
          }
        }
      } else if (metadata?.type === "tournament") {
        // Fetch the registration to check idempotency and verify amount
        const { data: registration, error: fetchError } = await supabase
          .from("tournament_registrations")
          .select("id, payment_status, total")
          .eq("paystack_reference", reference)
          .single();

        if (fetchError || !registration) {
          console.error("[Webhook] Tournament registration not found", {
            reference,
            error: fetchError?.message,
          });
          return NextResponse.json({ received: true });
        }

        // Idempotency: skip if already paid
        if (registration.payment_status === "paid") {
          console.info(
            "[Webhook] Tournament registration already paid, skipping",
            {
              reference,
              registrationId: registration.id,
            }
          );
          return NextResponse.json({ received: true });
        }

        const paidAmountNaira = amount / 100;
        if (paidAmountNaira !== registration.total) {
          console.error("[Webhook] Tournament amount mismatch", {
            reference,
            registrationId: registration.id,
            expectedNaira: registration.total,
            paidNaira: paidAmountNaira,
          });
          return NextResponse.json(
            { error: "Amount mismatch" },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from("tournament_registrations")
          .update({
            payment_status: "paid",
            paystack_reference: reference,
            paid_at: new Date().toISOString(),
          })
          .eq("id", registration.id);

        if (updateError) {
          console.error(
            "[Webhook] Failed to update tournament registration",
            {
              reference,
              registrationId: registration.id,
              error: updateError.message,
            }
          );
        }
      } else if (metadata?.type === "tournament_team") {
        const { data: registration, error: fetchError } = await supabase
          .from("tournament_team_registrations")
          .select("id, payment_status, total")
          .eq("paystack_reference", reference)
          .single();

        if (fetchError || !registration) {
          console.error("[Webhook] Team tournament registration not found", {
            reference,
            error: fetchError?.message,
          });
          return NextResponse.json({ received: true });
        }

        if (registration.payment_status === "paid") {
          console.info(
            "[Webhook] Team tournament registration already paid, skipping",
            {
              reference,
              registrationId: registration.id,
            }
          );
          return NextResponse.json({ received: true });
        }

        const paidAmountNaira = amount / 100;
        if (paidAmountNaira !== registration.total) {
          console.error("[Webhook] Team tournament amount mismatch", {
            reference,
            registrationId: registration.id,
            expectedNaira: registration.total,
            paidNaira: paidAmountNaira,
          });
          return NextResponse.json(
            { error: "Amount mismatch" },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from("tournament_team_registrations")
          .update({
            payment_status: "paid",
            paystack_reference: reference,
            paid_at: new Date().toISOString(),
          })
          .eq("id", registration.id);

        if (updateError) {
          console.error(
            "[Webhook] Failed to update team tournament registration",
            {
              reference,
              registrationId: registration.id,
              error: updateError.message,
            }
          );
        }
      } else if (metadata?.type === "premium") {
        // Premium subscription. metadata should include user_id and
        // period_days (default 30). Idempotent: skip if reference is
        // already recorded.
        const userId = metadata.user_id as string | undefined;
        const periodDays = Number(metadata.period_days ?? 30);

        if (!userId) {
          console.error("[Webhook] Premium payment missing user_id", {
            reference,
          });
          return NextResponse.json({ received: true });
        }

        const { data: existing } = await supabase
          .from("premium_subscriptions")
          .select("id")
          .eq("paystack_reference", reference)
          .maybeSingle();

        if (existing) {
          console.info("[Webhook] Premium subscription already recorded", {
            reference,
          });
          return NextResponse.json({ received: true });
        }

        const periodStart = new Date();
        const periodEnd = new Date(
          periodStart.getTime() + periodDays * 24 * 60 * 60 * 1000,
        );

        const { error: insertError } = await supabase
          .from("premium_subscriptions")
          .insert({
            user_id: userId,
            paystack_reference: reference,
            amount: amount / 100,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            status: "active",
          });

        if (insertError) {
          console.error("[Webhook] Failed to record premium subscription", {
            reference,
            error: insertError.message,
          });
          return NextResponse.json({ received: true });
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            premium_tier: "premium",
            premium_expires_at: periodEnd.toISOString(),
          })
          .eq("id", userId);

        if (profileError) {
          console.error(
            "[Webhook] Failed to flip premium_tier on profile",
            { reference, error: profileError.message },
          );
        }
      } else if (metadata?.type === "swap_assist") {
        // One party's half of a CGE-assisted swap. Mark it paid, then
        // activate the assistance once both halves are settled.
        const { data: payment, error: fetchError } = await supabase
          .from("swap_assist_payments")
          .select("id, proposal_id, payment_status, total")
          .eq("paystack_reference", reference)
          .single();

        if (fetchError || !payment) {
          console.error("[Webhook] Swap assist payment not found", {
            reference,
            error: fetchError?.message,
          });
          return NextResponse.json({ received: true });
        }

        if (payment.payment_status === "paid") {
          console.info("[Webhook] Swap assist share already paid, skipping", {
            reference,
            paymentId: payment.id,
          });
          return NextResponse.json({ received: true });
        }

        const paidAmountNaira = amount / 100;
        if (paidAmountNaira !== payment.total) {
          console.error("[Webhook] Swap assist amount mismatch", {
            reference,
            paymentId: payment.id,
            expectedNaira: payment.total,
            paidNaira: paidAmountNaira,
          });
          return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
        }

        const { error: updateError } = await supabase
          .from("swap_assist_payments")
          .update({
            payment_status: "paid",
            method: "paystack",
            paid_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (updateError) {
          console.error("[Webhook] Failed to update swap assist payment", {
            reference,
            paymentId: payment.id,
            error: updateError.message,
          });
          return NextResponse.json({ received: true });
        }

        // Both halves settled? Activate the assistance.
        const { count } = await supabase
          .from("swap_assist_payments")
          .select("id", { count: "exact", head: true })
          .eq("proposal_id", payment.proposal_id)
          .not("payment_status", "in", "(paid,free)");

        if ((count ?? 0) === 0) {
          await supabase
            .from("swap_proposals")
            .update({
              assist_status: "active",
              assist_activated_at: new Date().toISOString(),
            })
            .eq("id", payment.proposal_id)
            .eq("assist_status", "awaiting_payment");
        }
      } else {
        console.error("[Webhook] Unknown metadata type", {
          reference,
          type: metadata?.type,
        });
      }
    }

    if (
      event.event === "transfer.success" ||
      event.event === "transfer.failed" ||
      event.event === "transfer.reversed"
    ) {
      const { reference, transfer_code } = event.data;
      const nextStatus = event.event === "transfer.success" ? "paid" : "failed";

      const { data: payout, error: payoutError } = await supabase
        .from("tournament_payouts")
        .select("id, tournament_id, status")
        .eq("paystack_transfer_reference", reference)
        .maybeSingle();

      if (payoutError || !payout) {
        console.error("[Webhook] Tournament payout not found", {
          reference,
          transferCode: transfer_code,
          error: payoutError?.message,
        });
        return NextResponse.json({ received: true });
      }

      if (payout.status === "paid" && nextStatus === "paid") {
        return NextResponse.json({ received: true });
      }

      const { error: updateError } = await supabase
        .from("tournament_payouts")
        .update({
          status: nextStatus,
          paystack_transfer_code: transfer_code ?? null,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes:
            nextStatus === "paid"
              ? "Paystack transfer success webhook received"
              : `Paystack ${event.event} webhook received`,
        })
        .eq("id", payout.id);

      if (updateError) {
        console.error("[Webhook] Failed to update tournament payout", {
          reference,
          payoutId: payout.id,
          error: updateError.message,
        });
        return NextResponse.json({ received: true });
      }

      if (nextStatus === "paid") {
        const { count } = await supabase
          .from("tournament_payouts")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", payout.tournament_id)
          .neq("status", "paid");

        if ((count ?? 0) === 0) {
          await supabase
            .from("tournaments")
            .update({
              payout_status: "paid",
              payout_released_at: new Date().toISOString(),
            })
            .eq("id", payout.tournament_id);
        }
      } else {
        await supabase
          .from("tournaments")
          .update({ payout_status: "failed" })
          .eq("id", payout.tournament_id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Unhandled error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
