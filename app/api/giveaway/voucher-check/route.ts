import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/giveaway/voucher-check
 * Validates a voucher code at checkout.
 * Body: { code: "CGE-XXXXXXXX", zone_id: "vip" }
 *
 * Returns the voucher details if valid, or an error explaining why it's not.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, zone_id } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { valid: false, error: "No voucher code provided" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Look up the voucher
    const { data: voucher, error: voucherError } = await supabase
      .from("vouchers")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (voucherError || !voucher) {
      return NextResponse.json({
        valid: false,
        error: "Invalid voucher code",
      });
    }

    // Check if already redeemed
    if (voucher.status === "redeemed") {
      return NextResponse.json({
        valid: false,
        error: "This voucher has already been redeemed",
      });
    }

    // Check if expired
    if (voucher.status === "expired" || new Date(voucher.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "This voucher has expired",
      });
    }

    // Check if voucher matches the selected zone
    if (zone_id && voucher.zone_id !== zone_id) {
      const zoneNames: Record<string, string> = {
        main: "Main Lounge",
        vip: "VIP Lounge",
        vr: "VR Zone",
      };
      return NextResponse.json({
        valid: false,
        error: `This voucher is for ${zoneNames[voucher.zone_id] || voucher.zone_id}. Select that zone to use it.`,
      });
    }

    // Check if the authenticated user owns this voucher
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || voucher.user_id !== user.id) {
      return NextResponse.json({
        valid: false,
        error: "This voucher belongs to another account",
      });
    }

    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        prize_label: voucher.prize_label,
        zone_id: voucher.zone_id,
        duration: voucher.duration,
        expires_at: voucher.expires_at,
      },
    });
  } catch (err) {
    console.error("Voucher check error:", err);
    return NextResponse.json(
      { valid: false, error: "Failed to validate voucher" },
      { status: 500 }
    );
  }
}
