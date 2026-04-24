import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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
          .select("id, payment_status, total")
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
