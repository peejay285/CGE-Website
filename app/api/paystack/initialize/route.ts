import { NextResponse } from "next/server";
import { initializeTransaction, generateReference } from "@/lib/paystack";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { paystackInitializeSchema } from "@/lib/validations";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 10 payment initializations per minute per IP
    const rl = rateLimit(getRateLimitKey(request, "paystack"), {
      limit: 10,
      windowSec: 60,
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
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

    const { amount, type, metadata } = parsed.data;

    if (!user.email) {
      return NextResponse.json(
        { error: "Account does not have an email address. Please update your profile." },
        { status: 400 }
      );
    }

    const reference = generateReference(type);
    const origin = new URL(request.url).origin;

    const result = await initializeTransaction({
      email: user.email,
      amount: amount * 100, // Convert Naira to kobo
      reference,
      callback_url: `${origin}/lounge?payment_ref=${reference}`,
      metadata: {
        user_id: user.id,
        type, // 'booking', 'tournament', or 'event'
        ...metadata,
      },
    });

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    });
  } catch (error) {
    console.error("Paystack initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
