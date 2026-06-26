import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Admin-only: mark a pay-at-venue booking as paid at the counter.
 * Replaces the old client-side write, which relied on a permissive
 * bookings UPDATE policy (any user could mark their own booking paid).
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const parsed = paramsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: booking, error: fetchError } = await serviceClient
      .from("bookings")
      .select("id, payment_status, status")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.payment_status === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot mark a cancelled booking as paid" },
        { status: 409 }
      );
    }

    const { error: updateError } = await serviceClient
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", booking.id);

    if (updateError) {
      return NextResponse.json({ error: "Could not update booking" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/bookings/mark-paid] unhandled", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to mark booking paid" }, { status: 500 });
  }
}
