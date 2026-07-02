import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createTransferRecipient } from "@/lib/paystack";
import { payoutProfileLimiter, rateLimit } from "@/lib/rate-limit";
import { sendSMS } from "@/lib/sms";

const payoutRecipientSchema = z.object({
  account_name: z.string().min(2).max(120),
  account_number: z.string().regex(/^\d{10}$/),
  bank_code: z.string().min(2).max(20),
  bank_name: z.string().min(2).max(120).optional(),
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

    const rl = await rateLimit(payoutProfileLimiter, {
      user: user.id,
      request,
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many payout profile updates. Please try again later." },
        {
          status: 429,
          headers: rl.resetAt
            ? { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
            : undefined,
        }
      );
    }

    const body = await request.json();
    const parsed = payoutRecipientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payout account details",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { account_name, account_number, bank_code, bank_name } = parsed.data;
    const accountLast4 = account_number.slice(-4);

    const serviceClient = createServiceRoleClient();
    const { data: currentProfile } = await serviceClient
      .from("profiles")
      .select("payout_account_last4, payout_bank_name, payout_profile_verified_at, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (
      currentProfile?.payout_profile_verified_at &&
      currentProfile.payout_account_last4 === accountLast4 &&
      (!bank_name || currentProfile.payout_bank_name === bank_name)
    ) {
      return NextResponse.json(
        { error: "This payout account is already saved." },
        { status: 409 }
      );
    }

    const recipient = await createTransferRecipient({
      name: account_name,
      account_number,
      bank_code,
      currency: "NGN",
      description: "CGE tournament prize payout recipient",
      metadata: { user_id: user.id },
    });

    if (!recipient.status || !recipient.data.recipient_code) {
      return NextResponse.json(
        { error: recipient.message || "Could not create payout recipient" },
        { status: 400 }
      );
    }

    const details = recipient.data.details;

    // payout_* columns are admin/service-role-only (see security-hardening
    // migration) — write with the service client after verifying the user.
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({
        payout_recipient_code: recipient.data.recipient_code,
        payout_account_name: details?.account_name || account_name,
        payout_bank_name: details?.bank_name || bank_name || null,
        payout_account_last4: accountLast4,
        payout_profile_verified_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Could not save payout profile" },
        { status: 500 }
      );
    }

    const newBankName = details?.bank_name || bank_name || null;

    // Audit trail: a silent payout-account swap is the classic
    // prize-theft move, so record who changed what, from where.
    // Service-role write only — the table has no insert RLS policy.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const userAgent = request.headers.get("user-agent") || null;
    const { error: auditError } = await serviceClient
      .from("payout_recipient_changes")
      .insert({
        user_id: user.id,
        old_account_last4: currentProfile?.payout_account_last4 ?? null,
        old_bank_name: currentProfile?.payout_bank_name ?? null,
        new_account_last4: accountLast4,
        new_bank_name: newBankName,
        ip,
        user_agent: userAgent,
      });
    if (auditError) {
      console.error("[payout-profile/recipient] audit insert failed", {
        userId: user.id,
        error: auditError.message,
      });
    }

    // Notify the user their payout account changed. The app has no
    // email provider wired up (no Resend/SendGrid/nodemailer), so the
    // notice goes out over SMS via Termii — the same channel used for
    // booking confirmations. Fire-and-forget: never block the response.
    // TODO: also send an email once an email provider is added.
    if (currentProfile?.phone) {
      sendSMS({
        to: currentProfile.phone as string,
        body: `CGE security notice: your payout bank account was changed to ${
          newBankName || "a new bank"
        } ending ${accountLast4}. If this wasn't you, contact us on WhatsApp 08160658509 immediately.`,
      }).catch((e) =>
        console.error("[payout-profile/recipient] change SMS threw", {
          message: e instanceof Error ? e.message : String(e),
        })
      );
    }

    return NextResponse.json({
      recipient_code: recipient.data.recipient_code,
      account_name: details?.account_name || account_name,
      bank_name: newBankName,
      account_last4: accountLast4,
      security_notice:
        "Your payout account was updated. If you did not make this change, contact CGE support immediately.",
    });
  } catch (error) {
    console.error("[payout-profile/recipient] unhandled", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to create payout recipient" },
      { status: 500 }
    );
  }
}
