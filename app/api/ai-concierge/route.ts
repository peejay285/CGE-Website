import { NextResponse } from "next/server";
import { aiConciergeSchema } from "@/lib/validations";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MODAL_AI_ENDPOINT = process.env.MODAL_AI_ENDPOINT;
const MODAL_AUTH_TOKEN = process.env.MODAL_AUTH_TOKEN;

const CGE_SYSTEM_PROMPT = `You are the CGE (Creative Gaming Entertainment) AI Assistant. You help customers with questions about the gaming lounge on Bonny Island, Nigeria.

KEY INFORMATION:
- Location: 1 IT William Street, Akiama, Bonny Island
- Phone/WhatsApp: 08160658509
- Email: Creativegamingent@gmail.com
- Hours: Mon-Sat 10 AM – 9 PM, Sunday 1 PM – 9 PM
- Age Policy: 13+

PRICING:
- Main Lounge (PS4, 6 players): FC 26 = ₦3,000/hr, Other Games = ₦2,000/hr
- VIP Lounge (PS5, 2 consoles): Single Console = ₦5,000/hr, Both Consoles = ₦10,000/hr
- VR Zone: ₦2,000 per 15-minute session
- Drinks: Coca-Cola, Fanta, Water = ₦500 each

FEATURES:
- Esports tournaments with cash prizes (FC 26, Tekken 8, COD, MK1)
- Community social platform for gamers
- Marketplace to buy/sell gaming gear
- Events: game nights, VR demos, birthday packages (from ₦15,000)
- Online booking with Paystack payment

Keep responses concise, friendly, and helpful. Use Nigerian English naturally. If you don't know something specific, direct them to WhatsApp for personalized help.`;

export async function POST(request: Request) {
  try {
    // Rate limit: 20 AI requests per minute per IP
    const rl = rateLimit(getRateLimitKey(request, "ai-concierge"), {
      limit: 20,
      windowSec: 60,
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    // Require authentication — AI requests cost money
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to use the AI assistant" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body with Zod
    const parsed = aiConciergeSchema.safeParse(body);
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

    const { message, history } = parsed.data;

    // If Modal endpoint is configured, use it
    if (MODAL_AI_ENDPOINT && MODAL_AUTH_TOKEN) {
      const res = await fetch(MODAL_AI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MODAL_AUTH_TOKEN}`,
        },
        body: JSON.stringify({
          prompt: message,
          system: CGE_SYSTEM_PROMPT,
          history: history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: 500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          response: data.response || data.result,
        });
      }
    }

    // Fallback: return a signal to use local responses
    return NextResponse.json(
      { error: "AI endpoint not configured" },
      { status: 503 }
    );
  } catch (error) {
    console.error("AI Concierge error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
