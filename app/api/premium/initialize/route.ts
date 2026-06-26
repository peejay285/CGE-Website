import { NextResponse } from "next/server";
import { initializeTransaction, generateReference } from "@/lib/paystack";
import { PREMIUM_PERIOD_DAYS, PREMIUM_PRICE_NAIRA } from "@/lib/premium";
import { rateLimit, paystackInitLimiter } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const requestSchema = z.object({
  client: z.enum(["web", "mobile"]).optional().default("web"),
});

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

    if (!user.email) {
      return NextResponse.json(
        { error: "Account does not have an email address. Please update your profile." },
        { status: 400 }
      );
    }

    const rl = await rateLimit(paystackInitLimiter, {
      user: user.id,
      request,
      prefix: "premium",
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

    const parsed = requestSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const reference = generateReference("premium");
    const callbackUrl = absoluteUrl(
      parsed.data.client === "mobile"
        ? `/payment/mobile-return?payment_ref=${reference}&payment_type=premium`
        : `/profile/upgrade?payment_ref=${reference}&payment_type=premium`,
      request.headers
    );

    const result = await initializeTransaction({
      email: user.email,
      amount: PREMIUM_PRICE_NAIRA * 100,
      reference,
      callback_url: callbackUrl,
      metadata: {
        user_id: user.id,
        type: "premium",
        period_days: PREMIUM_PERIOD_DAYS,
      },
    });

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
      amount: PREMIUM_PRICE_NAIRA,
      period_days: PREMIUM_PERIOD_DAYS,
    });
  } catch (error) {
    console.error("[premium/initialize] unhandled", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to initialize premium payment" },
      { status: 500 }
    );
  }
}
