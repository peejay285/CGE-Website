import { NextResponse } from "next/server";
import { listBanks } from "@/lib/paystack";
import { bankListLimiter, rateLimit } from "@/lib/rate-limit";

const allowedOrigins = new Set([
  "http://127.0.0.1:3003",
  "http://localhost:3003",
]);

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return origin && allowedOrigins.has(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Accept, Content-Type",
        Vary: "Origin",
      }
    : undefined;
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function GET(request: Request) {
  try {
    const rl = await rateLimit(bankListLimiter, { request });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429, headers: corsHeaders(request) }
      );
    }

    const response = await listBanks();
    const banks = response.data
      .filter((bank) => bank.active && bank.code)
      .map((bank) => ({
        name: bank.name,
        code: bank.code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ banks }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error("[paystack/banks] unhandled", {
      message: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Failed to load banks" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}
