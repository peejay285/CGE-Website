import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { BRAND } from "@/lib/constants";
import { formatBookingDate, formatPrice } from "@/lib/utils";
import { absoluteUrl } from "@/lib/site-url";
import { bookingReceiptPath } from "@/lib/booking-receipt";
import { ReceiptQR } from "./receipt-qr";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function BookingReceiptPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;
  const supabase = await createServerSupabaseClient();

  // Staff scans use an unguessable receipt token in the QR/SMS URL. Owners
  // and admins can still view while signed in, but UUID-only public access
  // is blocked.
  const { data: booking, error } = await createServiceRoleClient()
    .from("bookings")
    .select(
      "id, user_id, zone_id, game_name, booking_date, time_slot, duration, total, payment_status, payment_method, receipt_token, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !booking) notFound();

  const isPaid = booking.payment_status === "paid";

  // Best-effort: only used to render an "Admin actions" link for staff. Page
  // itself is public-by-UUID — anyone with the unguessable link can view.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let viewerIsAdmin = false;
  if (user) {
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    viewerIsAdmin = !!viewerProfile?.is_admin;
  }

  const viewerIsOwner = user?.id === booking.user_id;
  const hasValidToken =
    typeof token === "string" &&
    token.length > 0 &&
    token === booking.receipt_token;

  if (!viewerIsOwner && !viewerIsAdmin && !hasValidToken) {
    notFound();
  }

  // QR points back at this same receipt page with the receipt token.
  const headerList = await headers();
  const verifyUrl = absoluteUrl(
    bookingReceiptPath(booking.id, booking.receipt_token),
    headerList,
  );

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {viewerIsAdmin && (
          <Link
            href={`/admin/booking/${booking.id}`}
            className="inline-flex items-center gap-1 text-sm text-cyan hover:text-cyan/80 mb-4"
          >
            <ShieldCheck size={14} />
            Admin actions
          </Link>
        )}

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
