import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/constants";
import { formatBookingDate, formatPrice } from "@/lib/utils";
import { ReceiptQR } from "./receipt-qr";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingReceiptPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?auth=required");
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id, user_id, zone_id, game_name, booking_date, time_slot, duration, total, payment_status, payment_method, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !booking) notFound();
  if (booking.user_id !== user.id) {
    // Don't expose existence of other people's bookings; just 404.
    notFound();
  }

  const isPaid = booking.payment_status === "paid";

  // Build the absolute admin verification URL the QR points to. The host comes
  // from the incoming request so this works for ngrok dev, Vercel preview and
  // production without a hardcoded base URL.
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host") ?? "localhost:3000";
  const verifyUrl = `${proto}://${host}/admin/booking/${booking.id}`;

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
        >
          <ArrowLeft size={14} />
          Back to profile
        </Link>

        {/* Status header */}
        <div
          className={`rounded-2xl border p-6 mb-5 text-center ${
            isPaid
              ? "border-green/30 bg-green/5"
              : "border-gold/30 bg-gold/5"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center ${
              isPaid ? "bg-green/15 text-green" : "bg-gold/15 text-gold"
            }`}
          >
            {isPaid ? <CheckCircle size={28} /> : <Clock size={28} />}
          </div>
          <h1 className="text-xl font-bold font-heading text-text">
            {isPaid ? "Payment Received" : "Booking Reserved"}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isPaid
              ? "Your session is paid in full. Show this receipt at the counter."
              : "You'll pay when you arrive. Show this receipt at the counter — staff will collect payment then check you in."}
          </p>
        </div>

        {/* QR card */}
        <div className="rounded-2xl border border-border bg-surface-alt p-6 mb-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
            Scan at the counter
          </p>
          <div className="inline-block bg-white p-3 rounded-xl">
            <ReceiptQR url={verifyUrl} />
          </div>
          <p className="text-xs text-text-muted mt-3">
            Booking ID
          </p>
          <p className="font-mono text-xs text-text font-bold mt-0.5">
            {booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Details */}
        <div className="rounded-2xl border border-border bg-surface-alt p-6 mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">
            Booking Details
          </h2>
          <Row label="Zone" value={booking.zone_id.toUpperCase()} />
          <Row label="Game" value={booking.game_name} />
          <Row
            label="Date"
            value={formatBookingDate(booking.booking_date)}
          />
          <Row label="Time" value={booking.time_slot} />
          <Row
            label="Duration"
            value={
              booking.zone_id === "vr"
                ? `${booking.duration} session${booking.duration > 1 ? "s" : ""} (${booking.duration * 15} min)`
                : `${booking.duration} hour${booking.duration > 1 ? "s" : ""}`
            }
          />
          <Row
            label="Payment Method"
            value={
              booking.payment_method === "paystack"
                ? "Paid Online (Paystack)"
                : "Pay at Venue"
            }
          />
          <div className="border-t border-border my-3" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-text">
              {isPaid ? "Paid" : "Amount Due at Venue"}
            </span>
            <span className={`text-lg font-bold font-heading ${isPaid ? "text-green" : "text-gold"}`}>
              {formatPrice(booking.total)}
            </span>
          </div>
        </div>

        {/* Getting there */}
        <div className="rounded-2xl border border-border bg-surface-alt p-6 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
            Getting There — Bonny Island Branch
          </p>
          <p className="text-sm text-text mb-3 flex items-start gap-2">
            <MapPin size={14} className="text-cyan shrink-0 mt-0.5" />
            {BRAND.address}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan hover:bg-cyan/15"
            >
              <MapPin size={12} />
              Open in Maps
            </a>
            <a
              href={BRAND.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-green/30 bg-green/10 px-3 py-2 text-xs font-semibold text-green hover:bg-green/15"
            >
              <MessageCircle size={12} />
              Message us
            </a>
          </div>
        </div>

        {/* Pre-arrival tips */}
        <div className="rounded-2xl border border-border bg-surface-alt p-6 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
            Before You Arrive
          </p>
          <ul className="space-y-1.5 text-xs text-text-muted">
            <li className="flex items-start gap-2">
              <Calendar size={12} className="text-cyan shrink-0 mt-0.5" />
              Arrive 5 minutes early to get set up
            </li>
            <li className="flex items-start gap-2">
              <Calendar size={12} className="text-cyan shrink-0 mt-0.5" />
              Bring a valid ID (age policy: {BRAND.agePolicy})
            </li>
            {!isPaid && (
              <li className="flex items-start gap-2">
                <Calendar size={12} className="text-gold shrink-0 mt-0.5" />
                Bring {formatPrice(booking.total)} in cash, transfer, or card
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs uppercase tracking-wider text-text-muted">
        {label}
      </span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  );
}
