"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";
import { formatBookingDate, formatPrice } from "@/lib/utils";
import { CalendarPlus, CheckCircle, Home, RotateCcw, Share2 } from "lucide-react";

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
  onBookAnother: () => void;
  onGoHome: () => void;
}

function getCalendarUrl(data: ConfirmationData): string {
  const dateStr = data.date; // "2026-03-15"
  const timeStr = data.time; // "3:00 PM"

  const [time, period] = timeStr.split(" ");
  const [hourStr, minStr] = time.split(":");
  let hour = parseInt(hourStr);
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const startDate = dateStr.replace(/-/g, "");
  const startTime = `${String(hour).padStart(2, "0")}${minStr}00`;

  const durationHours =
    data.zone === "vr" ? Math.ceil((data.duration * 15) / 60) : data.duration;
  const endHour = hour + durationHours;
  const endTime = `${String(endHour).padStart(2, "0")}${minStr}00`;

  const title = encodeURIComponent(
    `CGE Gaming Session - ${data.zoneName}`
  );
  const details = encodeURIComponent(
    `Game: ${data.game}\nZone: ${data.zoneName}\nBooking at ${BRAND.name}`
  );
  const location = encodeURIComponent(BRAND.address);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}T${startTime}/${startDate}T${endTime}&details=${details}&location=${location}`;
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

      {/* Arrival Tip */}
      <div className="rounded-lg border border-border bg-surface-alt px-5 py-4 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
          Before You Arrive
        </p>
        <ul className="space-y-1.5 text-xs" style={{ color: "#C4C4CC" }}>
          <li>• Arrive 5 minutes early to get set up</li>
          <li>• Bring a valid ID (age policy: {BRAND.agePolicy})</li>
          <li>• 📍 {BRAND.address}</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={() =>
            window.open(getCalendarUrl(bookingData), "_blank", "noopener")
          }
        >
          <CalendarPlus size={16} />
          Add to Calendar
        </Button>
        <Button
          variant="secondary"
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
        <Button variant="primary" onClick={onBookAnother}>
          <RotateCcw size={16} />
          Book Another
        </Button>
        <Button variant="secondary" onClick={onGoHome}>
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
