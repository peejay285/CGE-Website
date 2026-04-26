import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { sendBookingSMS } from "@/lib/sms";

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

    if (event.event === "charge.success") {
      const { reference, metadata, amount } = event.data;
      const supabase = getAdminClient();

      if (metadata?.type === "booking") {
        // Fetch the booking to check idempotency and verify amount
        const { data: booking, error: fetchError } = await supabase
          .from("bookings")
          .select("id, payment_status, total, zone_id, booking_date, time_slot, user_id")
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
            };
            const origin =
              new URL(request.url).origin ?? process.env.NEXT_PUBLIC_SITE_URL;
            const receiptUrl = `${origin}/booking/${b.id}/receipt`;
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
        // Fetch the registration to check idempotency
        const { data: registration, error: fetchError } = await supabase
          .from("tournament_registrations")
          .select("id, payment_status")
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

        const { error: updateError } = await supabase
          .from("tournament_registrations")
          .update({
            payment_status: "paid",
            paystack_reference: reference,
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
      } else {
        console.error("[Webhook] Unknown metadata type", {
          reference,
          type: metadata?.type,
        });
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
