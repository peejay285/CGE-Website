"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Gamepad2,
  Loader2,
  ReceiptText,
  XCircle, Ticket} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-bookings";
import { bookingReceiptPath } from "@/lib/booking-receipt";
import { ZONES, RESCHEDULE_POLICY } from "@/lib/constants";
import { cn, formatPrice, slotToHour } from "@/lib/utils";
import type { Booking } from "@/lib/types";

/**
 * My Bookings — the page the profile menu always promised. Every
 * booking with its receipt, a pay-now path for pending Paystack
 * bookings, and cancellation for upcoming sessions.
 */

function zoneName(zoneId: string) {
  return ZONES.find((z) => z.id === zoneId)?.name ?? zoneId;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sessionStartMs(b: Booking) {
  const [y, m, d] = b.booking_date.split("-").map(Number);
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d, slotToHour(b.time_slot) || 0).getTime();
}

function statusChip(b: Booking): { label: string; className: string } {
  if (b.status === "cancelled")
    return { label: "Cancelled", className: "border-border text-text-muted" };
  if (b.payment_status === "refunded")
    return { label: "Refunded", className: "border-border text-text-muted" };
  if (b.payment_status === "paid")
    return { label: "Paid", className: "border-green/40 bg-green/10 text-green" };
  if (b.payment_method === "venue")
    return {
      label: "Reserved — pay at venue",
      className: "border-gold/40 bg-gold/10 text-gold",
    };
  return {
    label: "Payment pending",
    className: "border-gold/40 bg-gold/10 text-gold",
  };
}

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { bookings, loading, cancelBooking, actionLoading } = useBookings();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancelArmedId, setCancelArmedId] = useState<string | null>(null);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: Booking[] = [];
    const pa: Booking[] = [];
    for (const b of bookings) {
      // A session is "upcoming" until its start hour has passed.
      if (b.status !== "cancelled" && sessionStartMs(b) >= now - 60 * 60 * 1000) {
        up.push(b);
      } else {
        pa.push(b);
      }
    }
    up.sort((a, b) => sessionStartMs(a) - sessionStartMs(b));
    return { upcoming: up, past: pa };
  }, [bookings]);

  async function handlePayNow(b: Booking) {
    try {
      setPayingId(b.id);
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "booking", metadata: { booking_id: b.id } }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Could not start payment");
      window.location.href = (body as { authorization_url: string })
        .authorization_url;
    } catch (err) {
      setPayingId(null);
      toast.error(err instanceof Error ? err.message : "Could not start payment");
    }
  }

  async function handleCancel(b: Booking) {
    const hoursToStart = (sessionStartMs(b) - Date.now()) / (60 * 60 * 1000);
    if (hoursToStart < RESCHEDULE_POLICY.hoursNotice) {
      toast.error(
        `Cancellations need at least ${RESCHEDULE_POLICY.hoursNotice} hours' notice. Message us on WhatsApp and we'll help.`
      );
      setCancelArmedId(null);
      return;
    }
    const ok = await cancelBooking(b.id);
    setCancelArmedId(null);
    if (ok) toast.success("Booking cancelled.");
    else toast.error("Could not cancel this booking. Please try again.");
  }

  function renderCard(b: Booking) {
    const chip = statusChip(b);
    const isUpcoming =
      b.status !== "cancelled" && sessionStartMs(b) >= Date.now();
    const canPayNow =
      b.status !== "cancelled" &&
      b.payment_method === "paystack" &&
      b.payment_status === "pending" &&
      isUpcoming;
    const armed = cancelArmedId === b.id;

    return (
      <div
        key={b.id}
        className="rounded-xl border border-border bg-surface p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text truncate">
              {zoneName(b.zone_id)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
              <Gamepad2 size={12} className="shrink-0" />
              <span className="truncate">{b.game_name}</span>
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              chip.className
            )}
          >
            {chip.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} /> {formatDate(b.booking_date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={12} /> {b.time_slot}
            {b.zone_id !== "vr" && b.duration > 1 ? ` · ${b.duration} hrs` : ""}
          </span>
          <span className="font-semibold text-text">{formatPrice(b.total)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href={bookingReceiptPath(b.id, b.receipt_token)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-cyan/40 hover:text-cyan"
          >
            <ReceiptText size={13} />
            Receipt
          </Link>
          {canPayNow && (
            <Button
              size="sm"
              variant="primary"
              disabled={payingId === b.id}
              onClick={() => handlePayNow(b)}
            >
              {payingId === b.id ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Starting...
                </>
              ) : (
                "Pay now"
              )}
            </Button>
          )}
          {isUpcoming && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => {
                if (!armed) {
                  setCancelArmedId(b.id);
                  window.setTimeout(
                    () => setCancelArmedId((id) => (id === b.id ? null : id)),
                    5000
                  );
                  return;
                }
                handleCancel(b);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                armed
                  ? "border-red/50 bg-red/10 text-red"
                  : "border-border bg-surface-alt text-text-muted hover:border-red/40 hover:text-red"
              )}
            >
              <XCircle size={13} />
              {armed ? "Tap again to cancel" : "Cancel"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-text">My Bookings</h1>
            <p className="text-xs text-text-muted">
              Receipts, payments and cancellations
            </p>
          </div>
        </div>

        {authLoading || loading ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : !user ? (
          <EmptyState
            icon={Ticket}
            title="Sign in to see your bookings"
            subtitle="Your booking history and receipts live here once you're signed in."
            action={{
              label: "Sign in",
              onClick: () =>
                window.dispatchEvent(new CustomEvent("open-auth-modal")),
            }}
          />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={Gamepad2}
            title="No bookings yet"
            subtitle="Book a station and your sessions, receipts and passes will show up here."
            action={{
              label: "Book a session",
              onClick: () => {
                window.location.href = "/lounge";
              },
            }}
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Upcoming
                </h2>
                {upcoming.map(renderCard)}
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Past
                </h2>
                {past.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
