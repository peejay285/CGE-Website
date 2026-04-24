import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/giveaway/draw
 * Runs the monthly giveaway draw.
 * Body: { month: "2026-03", adminSecret: "..." }
 *
 * Picks 3 random winners from that month's entries:
 *   - Winner 1: 1 hour VIP session
 *   - Winner 2: 1 hour Main Lounge session
 *   - Winner 3: 1 VR session
 *
 * Generates unique voucher codes and stores them.
 */

const PRIZES = [
  { prize_label: "1 Hour VIP Session", zone_id: "vip", duration: 1 },
  { prize_label: "1 Hour Main Lounge Session", zone_id: "main", duration: 1 },
  { prize_label: "1 VR Session", zone_id: "vr", duration: 1 },
];

function generateVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "CGE-";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { month, adminSecret } = body;

    // Simple admin auth — compare against env secret
    const expectedSecret = process.env.GIVEAWAY_ADMIN_SECRET;
    if (!expectedSecret || adminSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM (e.g. 2026-03)" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if draw already happened for this month
    const { data: existingDraw } = await supabase
      .from("giveaway_draws")
      .select("id")
      .eq("month", month)
      .single();

    if (existingDraw) {
      return NextResponse.json(
        { error: `Draw already completed for ${month}` },
        { status: 409 }
      );
    }

    // Get all entries for this month
    const { data: entries, error: entriesError } = await supabase
      .from("giveaway_entries")
      .select("id, user_id")
      .eq("month", month);

    if (entriesError) throw entriesError;

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: `No entries found for ${month}` },
        { status: 404 }
      );
    }

    // Get unique users (for fair display) but pick from ALL entries (more bookings = more chances)
    // Fisher-Yates shuffle with crypto-secure randomness
    const shuffled = [...entries];
    const randomBytes = crypto.getRandomValues(new Uint32Array(shuffled.length));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomBytes[i] % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const winners: { user_id: string; entry_id: string }[] = [];
    const usedUserIds = new Set<string>();

    for (const entry of shuffled) {
      if (winners.length >= 3) break;
      if (usedUserIds.has(entry.user_id)) continue; // one prize per person
      winners.push({ user_id: entry.user_id, entry_id: entry.id });
      usedUserIds.add(entry.user_id);
    }

    if (winners.length === 0) {
      return NextResponse.json(
        { error: "Not enough unique users to draw winners" },
        { status: 400 }
      );
    }

    // Create the draw record
    const { data: draw, error: drawError } = await supabase
      .from("giveaway_draws")
      .insert({ month })
      .select("id")
      .single();

    if (drawError) throw drawError;

    // Vouchers expire at the end of next month
    const [yearStr, monthStr] = month.split("-");
    const expiryDate = new Date(
      Number(yearStr),
      Number(monthStr) + 1, // +1 for next month, then day 0 = last day
      0,
      23, 59, 59
    );

    // Create vouchers for each winner
    const vouchers = winners.map((winner, i) => {
      const prize = PRIZES[i % PRIZES.length];
      return {
        code: generateVoucherCode(),
        user_id: winner.user_id,
        draw_id: draw.id,
        prize_label: prize.prize_label,
        zone_id: prize.zone_id,
        duration: prize.duration,
        status: "active",
        expires_at: expiryDate.toISOString(),
        notified: false,
      };
    });

    const { data: createdVouchers, error: voucherError } = await supabase
      .from("vouchers")
      .insert(vouchers)
      .select("id, code, user_id, prize_label, zone_id, expires_at");

    if (voucherError) throw voucherError;

    // Fetch winner profiles for the response
    const winnerIds = winners.map((w) => w.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, phone, gamertag")
      .in("id", winnerIds);

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; full_name: string; phone: string | null; gamertag: string | null }) => [p.id, p])
    );

    const results = (createdVouchers || []).map((v: { id: string; code: string; user_id: string; prize_label: string; zone_id: string; expires_at: string }) => ({
      ...v,
      winner: profileMap.get(v.user_id) || null,
    }));

    return NextResponse.json({
      success: true,
      month,
      total_entries: entries.length,
      unique_participants: new Set(entries.map((e: { user_id: string }) => e.user_id)).size,
      winners: results,
    });
  } catch (err) {
    console.error("Giveaway draw error:", err);
    return NextResponse.json(
      { error: "Failed to run draw" },
      { status: 500 }
    );
  }
}
