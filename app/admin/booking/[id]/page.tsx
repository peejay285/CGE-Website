import { notFound } from "next/navigation";
import { CheckCircle, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { formatBookingDate, formatPrice } from "@/lib/utils";
import { MarkPaidButton } from "./mark-paid-button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminBookingPage({ params }: Props) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id, user_id, zone_id, game_name, booking_date, time_slot, duration, total, payment_status, payment_method, paystack_reference, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !booking) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, gamertag, phone")
    .eq("id", booking.user_id)
    .maybeSingle();

  const isPaid = booking.payment_status === "paid";
  const today = new Date().toISOString().slice(0, 10);
  const isFuture = booking.booking_date >= today;

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/admin/verifications"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
        >
          <ArrowLeft size={14} />
          Admin
        </Link>

        {/* Status banner — big visual signal */}
        <div
          className={`rounded-2xl border p-6 mb-5 text-center ${
            isPaid
              ? "border-green/40 bg-green/10"
              : "border-gold/40 bg-gold/10"
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
              isPaid ? "bg-green/25 text-green" : "bg-gold/25 text-gold"
            }`}
          >
            {isPaid ? <CheckCircle size={36} /> : <Clock size={36} />}
          </div>
          <h1 className="text-2xl font-bold font-heading text-text">
            {isPaid ? "PAID" : "RESERVED — UNPAID"}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isPaid
              ? "Customer has paid online. Check them in."
              : `Collect ${formatPrice(booking.total)} before you check the customer in.`}
          </p>
          {!isFuture && (
            <p className="text-xs text-red mt-3 inline-flex items-center gap-1">
              <AlertCircle size={12} />
              Booking date is in the past
            </p>
          )}
        </div>

        {/* Customer */}
        <div className="rounded-2xl border border-border bg-surface-alt p-6 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
            Customer
          </p>
          <p className="text-lg font-bold text-text">
            {profile?.full_name ?? "Unknown"}
          </p>
          {profile?.gamertag && (
            <p className="text-sm text-cyan">@{profile.gamertag}</p>
          )}
          {profile?.phone && (
            <p className="text-xs text-text-muted mt-1">📞 {profile.phone}</p>
          )}
        </div>

        {/* Booking details */}
        <div className="rounded-2xl border border-border bg-surface-alt p-6 mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">
            Booking
          </p>
          <Row label="Zone" value={booking.zone_id.toUpperCase()} />
          <Row label="Game" value={booking.game_name} />
          <Row label="Date" value={formatBookingDate(booking.booking_date)} />
          <Row label="Time" value={booking.time_slot} />
          <Row
            label="Duration"
            value={
              booking.zone_id === "vr"
                ? `${booking.duration} session${booking.duration > 1 ? "s" : ""} (${booking.duration * 15} min)`
                : `${booking.duration} hour${booking.duration > 1 ? "s" : ""}`
            }
          />
          <Row label="Total" value={formatPrice(booking.total)} />
          <Row
            label="Payment Method"
            value={
              booking.payment_method === "paystack"
                ? "Online (Paystack)"
                : "At Venue"
            }
          />
          {booking.paystack_reference && (
            <Row
              label="Paystack Ref"
              value={booking.paystack_reference}
              monospace
            />
          )}
          <Row
            label="Booking ID"
            value={booking.id}
            monospace
          />
        </div>

        {/* Action — only for unpaid bookings */}
        {!isPaid && (
          <MarkPaidButton bookingId={booking.id} />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1.5 gap-3">
      <span className="text-xs uppercase tracking-wider text-text-muted shrink-0">
        {label}
      </span>
      <span
        className={`text-sm font-medium text-text text-right ${monospace ? "font-mono text-xs break-all" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
