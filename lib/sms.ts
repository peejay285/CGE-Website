/**
 * SMS sender — uses Termii (https://termii.com) when TERMII_API_KEY is set.
 *
 * The booking webhook calls sendBookingSMS once a booking is paid. If the
 * env var is missing, the function logs and returns false without throwing
 * — that way the booking flow keeps working in dev / pre-config without
 * silently dropping confirmations into the void.
 *
 * To enable in production:
 *   - Add TERMII_API_KEY to .env (server-side only, never NEXT_PUBLIC_)
 *   - Optionally TERMII_SENDER_ID (defaults to "CGE")
 *   - Restart the server.
 *
 * Phone numbers are normalised to international format (234...) before send.
 */

interface SendOptions {
  to: string;
  body: string;
}

function normaliseNigerianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // 0XXXXXXXXXX → 234XXXXXXXXXX
  if (/^0\d{10}$/.test(digits)) return "234" + digits.slice(1);
  // 234XXXXXXXXXX
  if (/^234\d{10}$/.test(digits)) return digits;
  return null;
}

export async function sendSMS({ to, body }: SendOptions): Promise<boolean> {
  const apiKey = process.env.TERMII_API_KEY;
  const sender = process.env.TERMII_SENDER_ID ?? "CGE";

  if (!apiKey) {
    console.info("[SMS] Skipped (TERMII_API_KEY not set)", {
      to,
      preview: body.slice(0, 80),
    });
    return false;
  }

  const phone = normaliseNigerianPhone(to);
  if (!phone) {
    console.error("[SMS] Invalid Nigerian phone number", { to });
    return false;
  }

  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        from: sender,
        sms: body,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[SMS] Termii returned non-2xx", {
        status: res.status,
        body: text.slice(0, 200),
      });
      return false;
    }
    return true;
  } catch (err) {
    console.error("[SMS] Termii fetch threw", {
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Booking-specific helper. Keeps the message format consistent. */
export async function sendBookingSMS(args: {
  to: string;
  zoneName: string;
  date: string;
  time: string;
  bookingId: string;
}): Promise<boolean> {
  const body =
    `CGE: Your ${args.zoneName} booking on ${args.date} at ${args.time} is confirmed. ` +
    `Show booking ID ${args.bookingId.slice(0, 8).toUpperCase()} at the counter. ` +
    `Questions? WhatsApp 08160658509.`;
  return sendSMS({ to: args.to, body });
}
