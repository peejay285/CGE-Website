"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BRAND, RESCHEDULE_POLICY, ZONES } from "@/lib/constants";
import { formatBookingDate, formatPrice } from "@/lib/utils";
import { bookingReceiptPath } from "@/lib/booking-receipt";
import { buildIcsString, downloadIcsFile } from "@/lib/calendar";
import {
  CalendarPlus,
  CheckCircle,
  Clock,
  Home,
  RotateCcw,
  Share2,
  MapPin,
  MessageCircle,
  QrCode,
} from "lucide-react";

interface ConfirmationData {
  zoneName: string;
  game: string;
  date: string;
  time: string;
  duration: number;
  zone: string;
  total: number;
  payMethod: "paystack" | "venue";
}

interface BookingConfirmationProps {
  bookingData: ConfirmationData;
  bookingId: string | null;
  receiptToken: string | null;
  onBookAnother: () => void;
  onGoHome: () => void;
}

/** Parse the booking's local date ("2026-03-15") + time ("3:00 PM") into a Date. */
function getSessionStart(data: ConfirmationData): Date {
  const [time, period] = data.time.split(" ");
  const [hourStr, minStr] = time.split(":");
  let hour = parseInt(hourStr);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const [year, month, day] = data.date.split("-").map(Number);
  return new Date(year, month - 1, day, hour, parseInt(minStr));
}

function downloadCalendarFile(data: ConfirmationData): void {
  const durationHours =
    data.zone === "vr" ? (data.duration * 15) / 60 : data.duration;
  const consoleName =
    ZONES.find((z) => z.id === data.zone)?.console ?? "Gaming";

  const ics = buildIcsString({
    title: `CGE Lounge — ${consoleName} Session`,
    start: getSessionStart(data),
    durationHours,
    location: BRAND.address,
    description: `Game: ${data.game}\nZone: ${data.zoneName}\nBooking at ${BRAND.name}`,
  });
  downloadIcsFile(`cge-session-${data.date}`, ics);
}

function getWhatsAppShareUrl(data: ConfirmationData): string {
  const text = encodeURIComponent(
    `I just booked a gaming session at CGE! 🎮\n\n` +
      `📍 ${data.zoneName}\n` +
      `🎯 ${data.game}\n` +
      `📅 ${formatBookingDate(data.date)} at ${data.time}\n\n` +
      `Book yours at cge.ng/lounge`
  );
  return `https://wa.me/?text=${text}`;
}

export function BookingConfirmation({
  bookingData,
  bookingId,
  receiptToken,
  onBookAnother,
  onGoHome,
}: BookingConfirmationProps) {
  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Success Icon */}
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green/10 border border-green/25 flex items-center justify-center">
          <CheckCircle size={40} className="text-green" />
        </div>
      </div>

      <h2 className="text-2xl font-bold font-heading tracking-tight text-text mb-2">
        Booking Confirmed!
      </h2>
      <p className="text-sm text-text-muted mb-8">
        {bookingData.payMethod === "paystack"
          ? "Your payment was successful. See you at the lounge!"
          : "Your session is reserved. Pay when you arrive at the venue."}
      </p>

      {/* Summary Card */}
      <Card className="text-left mb-8" glow>
        <h4 className="text-sm font-bold uppercase tracking-wider text-text mb-4">
          Booking Details
        </h4>

        <div className="space-y-3">
          <DetailRow label="Zone" value={bookingData.zoneName} />
          <DetailRow label="Game" value={bookingData.game} />
          <DetailRow
            label="Date"
            value={formatBookingDate(bookingData.date)}
          />
          <DetailRow label="Time" value={bookingData.time} />
          <DetailRow
            label="Duration"
            value={
              bookingData.zone === "vr"
                ? `${bookingData.duration} session${bookingData.duration > 1 ? "s" : ""} (${bookingData.duration * 15} min)`
                : `${bookingData.duration} hour${bookingData.duration > 1 ? "s" : ""}`
            }
          />
          <DetailRow
            label="Payment"
            value={
              bookingData.payMethod === "paystack"
                ? "Paid Online"
                : "Pay at Venue"
            }
          />

          <div className="border-t border-border my-3" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-text">
              Total
            </span>
            <span className="text-lg font-bold font-heading text-cyan">
              {formatPrice(bookingData.total)}
            </span>
          </div>
        </div>
      </Card>

      {/* Getting there */}
      <div className="rounded-lg border border-border bg-surface-alt px-5 py-4 mb-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Getting There — Bonny Island Branch
        </p>
        <p className="text-sm text-text mb-2 flex items-start gap-2">
          <MapPin size={14} className="text-cyan shrink-0 mt-0.5" />
          {BRAND.address}
        </p>
        <p className="text-xs text-text-muted mb-3 flex items-start gap-2">
          <Clock size={14} className="text-cyan shrink-0 mt-0.5" />
          Open Mon–Sat {BRAND.hours.weekday} · Sun {BRAND.hours.sunday}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BRAND.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan hover:bg-cyan/15 transition-colors"
          >
            <MapPin size={12} />
            Get directions
          </a>
          <a
            href={BRAND.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 rounded-lg border border-green/30 bg-green/10 px-3 py-2 text-xs font-semibold text-green hover:bg-green/15 transition-colors"
          >
            <MessageCircle size={12} />
            Message us
          </a>
        </div>
      </div>

      {/* Arrival Tip */}
      <div className="rounded-lg border border-border bg-surface-alt px-5 py-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
          Before You Arrive
        </p>
        <ul className="space-y-1.5 text-xs text-left" style={{ color: "#C4C4CC" }}>
          <li>• Arrive 5 minutes early to get set up</li>
          <li>• Bring a valid ID (age policy: {BRAND.agePolicy})</li>
          <li>• Show this confirmation at the counter</li>
          <li>
            • What to bring: just yourself — pads and games are on us
          </li>
        </ul>
      </div>

      {/* Change of plans? */}
      <div className="rounded-lg border border-border bg-surface-alt px-5 py-4 mb-8 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
          Change of Plans?
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "#C4C4CC" }}>
          Need to reschedule or cancel? Contact us on{" "}
          <a
            href={BRAND.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-green hover:text-green/80 transition-colors"
          >
            WhatsApp ({BRAND.phone})
          </a>{" "}
          at least {RESCHEDULE_POLICY.hoursNotice} hours before your session
          and we&apos;ll move it free of charge.
        </p>
      </div>

      {/* Receipt + QR call-to-action */}
      {bookingId && (
        <Link
          href={bookingReceiptPath(bookingId, receiptToken)}
          className="block mb-4"
        >
          <Button variant="primary" fullWidth className="min-h-11">
            <QrCode size={16} />
            View Receipt & QR Code
          </Button>
        </Link>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          className="min-h-11"
          onClick={() => downloadCalendarFile(bookingData)}
        >
          <CalendarPlus size={16} />
          Add to Calendar
        </Button>
        <Button
          variant="secondary"
          className="min-h-11"
          onClick={() =>
            window.open(
              getWhatsAppShareUrl(bookingData),
              "_blank",
              "noopener"
            )
          }
        >
          <Share2 size={16} />
          Share
        </Button>
        <Button variant="primary" className="min-h-11" onClick={onBookAnother}>
          <RotateCcw size={16} />
          Book Another
        </Button>
        <Button variant="secondary" className="min-h-11" onClick={onGoHome}>
          <Home size={16} />
          Go Home
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  );
}
