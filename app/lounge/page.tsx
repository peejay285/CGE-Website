"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { ZONES } from "@/lib/constants";
import { getUnitPrice, getBookingTotals } from "@/lib/pricing";
import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-bookings";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ZoneSelector } from "@/components/lounge/zone-selector";
import { BookingForm } from "@/components/lounge/booking-form";
import { DrinksAddon } from "@/components/lounge/drinks-addon";
import { PaymentStep } from "@/components/lounge/payment-step";
import { BookingConfirmation } from "@/components/lounge/booking-confirmation";

/* ---------- Step labels ---------- */

const STEP_LABELS = ["Zone", "Details", "Extras", "Payment"];

/* ---------- Page Component ---------- */

export default function LoungePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createBooking, actionLoading, checkAvailability } = useBookings();

  // Booking wizard state
  const [bookingStep, setBookingStep] = useState(0);
  const [zone, setZone] = useState<string | null>(null);
  const [game, setGame] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [drinks, setDrinks] = useState<Record<string, number>>({});
  const [payMethod, setPayMethod] = useState<"paystack" | "venue">("paystack");
  const [passCode, setPassCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived values — single source of truth via lib/pricing.ts
  const zoneName = useMemo(() => {
    const found = ZONES.find((z) => z.id === zone);
    return found ? found.name : "";
  }, [zone]);

  const { unitPrice, sessionTotal, drinksTotal, total } = useMemo(
    () => (zone && game ? getBookingTotals(zone, game, duration, drinks) : { unitPrice: 0, sessionTotal: 0, drinksTotal: 0, total: 0 }),
    [zone, game, duration, drinks]
  );

  /* ---------- Step handlers ---------- */

  function handleZoneSelect(zoneId: string) {
    setZone(zoneId);
    // Reset downstream state
    setGame("");
    setDate("");
    setTime("");
    setDuration(zoneId === "vr" ? 1 : 1);
    setDrinks({});
    setPayMethod("paystack");
    setPassCode("");
    setConfirmed(false);
    setBookingId(null);
    setBookingStep(1);
  }

  function handleBookingFormNext(data: {
    game: string;
    date: string;
    time: string;
    duration: number;
  }) {
    setGame(data.game);
    setDate(data.date);
    setTime(data.time);
    setDuration(data.duration);
    setBookingStep(2);
  }

  function handleDrinksNext() {
    setBookingStep(3);
  }

  const handlePaymentConfirm = useCallback(
    async (method: "paystack" | "venue", code: string) => {
      if (!user) {
        // Prompt sign-in at checkout — they've already seen the value
        const event = new CustomEvent("open-auth-modal");
        window.dispatchEvent(event);
        toast("Sign in to complete your booking", { icon: "🔒" });
        return;
      }

      if (!zone || !game || !date || !time) {
        toast.error("Missing booking details. Please go back and fill in all fields.");
        return;
      }

      setPayMethod(method);
      setPassCode(code);
      setIsSubmitting(true);

      // Check availability before creating booking
      const availability = await checkAvailability(zone, date, time);
      if (availability && !availability.available) {
        toast.error(
          `This time slot is full (${availability.booked_count}/${availability.total_capacity} booked). Please choose a different time.`
        );
        setIsSubmitting(false);
        return;
      }

      // Create the booking in Supabase (payment_status = 'pending')
      const booking = await createBooking({
        zone_id: zone,
        game_name: game,
        booking_date: date,
        time_slot: time,
        duration,
        drinks,
        session_total: sessionTotal,
        drinks_total: drinksTotal,
        total,
        payment_method: method,
      });

      if (!booking) {
        setIsSubmitting(false);
        toast.error("Failed to create booking. Please try again.");
        return;
      }

      // Venue: nothing more to do — confirmation is "Reserved, pay on arrival".
      if (method === "venue") {
        setIsSubmitting(false);
        setBookingId(booking.id);
        setConfirmed(true);
        setBookingStep(4);
        toast.success("Reservation confirmed!");
        return;
      }

      // Paystack: initialize a transaction, stamp the booking with the
      // returned reference so the webhook can find it, then redirect to
      // Paystack's hosted checkout. The webhook flips payment_status to
      // 'paid' once Paystack confirms.
      try {
        const res = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            type: "booking",
            metadata: { booking_id: booking.id },
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? "Failed to start payment");
        }
        const { authorization_url, reference } = (await res.json()) as {
          authorization_url: string;
          reference: string;
        };

        const supabase = createClient();
        await supabase
          .from("bookings")
          .update({ paystack_reference: reference })
          .eq("id", booking.id);

        // Off to Paystack. The callback URL is /lounge?payment_ref=... so
        // we'll come back here and pick up the confirmation flow.
        window.location.href = authorization_url;
      } catch (err) {
        setIsSubmitting(false);
        toast.error(
          err instanceof Error ? err.message : "Could not start Paystack",
        );
      }
    },
    [
      user,
      zone,
      game,
      date,
      time,
      duration,
      drinks,
      sessionTotal,
      drinksTotal,
      total,
      createBooking,
      checkAvailability,
    ]
  );

  // After a Paystack redirect-back: ?payment_ref=... — fetch the booking,
  // poll briefly for the webhook, and pop the confirmation step.
  const searchParams = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get("payment_ref");
    if (!ref) return;
    let cancelled = false;
    const supabase = createClient();
    let attempts = 0;
    const maxAttempts = 6; // ~12 seconds
    const tick = async () => {
      const { data: row } = await supabase
        .from("bookings")
        .select("id, zone_id, game_name, booking_date, time_slot, duration, total, payment_status")
        .eq("paystack_reference", ref)
        .maybeSingle();
      if (cancelled) return;
      if (row && row.payment_status === "paid") {
        const r = row as {
          id: string;
          zone_id: string;
          game_name: string;
          booking_date: string;
          time_slot: string;
          duration: number;
          total: number;
        };
        setZone(r.zone_id);
        setGame(r.game_name);
        setDate(r.booking_date);
        setTime(r.time_slot);
        setDuration(r.duration);
        setBookingId(r.id);
        setPayMethod("paystack");
        setConfirmed(true);
        setBookingStep(4);
        toast.success("Payment confirmed!");
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tick, 2000);
      } else if (row) {
        toast(
          "Payment is processing. We'll mark this booking as paid as soon as Paystack confirms.",
          { icon: "⏳" },
        );
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function handleBookAnother() {
    setBookingStep(0);
    setZone(null);
    setGame("");
    setDate("");
    setTime("");
    setDuration(1);
    setDrinks({});
    setPayMethod("paystack");
    setPassCode("");
    setConfirmed(false);
    setBookingId(null);
  }

  function handleGoHome() {
    router.push("/");
  }

  /* ---------- Render ---------- */

  return (
    <div className="min-h-screen bg-base px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Progress Bar - shown after zone selection, before confirmation */}
        {bookingStep >= 1 && bookingStep <= 3 && (
          <div className="mb-10">
            {/* Step indicators */}
            <div className="flex items-center justify-between mb-3 max-w-md mx-auto">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
                      i < bookingStep
                        ? "bg-cyan text-base border-cyan"
                        : i === bookingStep
                          ? "bg-cyan/15 text-cyan border-cyan"
                          : "bg-surface-alt text-text-muted border-border"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      i <= bookingStep ? "text-cyan" : "text-text-muted"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <ProgressBar
              value={bookingStep}
              max={4}
              className="max-w-md mx-auto"
            />
          </div>
        )}

        {/* Step 0: Zone Selector */}
        {bookingStep === 0 && (
          <ZoneSelector selected={zone} onSelect={handleZoneSelect} />
        )}

        {/* Step 1: Booking Form */}
        {bookingStep === 1 && zone && (
          <>
            {/* Sign-in incentive — shown if not logged in */}
            {!user && (
              <div className="max-w-2xl mx-auto mb-6">
                <div className="flex items-center gap-3 rounded-xl border border-cyan/20 bg-cyan/5 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-cyan/15 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">
                      Sign in for a chance to win a free voucher
                    </p>
                    <p className="text-xs text-text-muted">
                      Members who book while signed in are entered into our monthly free session giveaway.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const event = new CustomEvent("open-auth-modal");
                      window.dispatchEvent(event);
                    }}
                    className="text-xs font-semibold text-cyan hover:text-cyan/80 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {bookingStep === 1 && zone && (
          <BookingForm
            zone={zone}
            zoneName={zoneName}
            zoneConsole={ZONES.find((z) => z.id === zone)?.console || ""}
            getUnitPrice={(g) => getUnitPrice(zone, g)}
            onNext={handleBookingFormNext}
            onBack={() => setBookingStep(0)}
          />
        )}

        {/* Step 2: Drinks Addon */}
        {bookingStep === 2 && (
          <DrinksAddon
            drinks={drinks}
            onChange={setDrinks}
            onNext={handleDrinksNext}
            onBack={() => setBookingStep(1)}
          />
        )}

        {/* Step 3: Payment Step */}
        {bookingStep === 3 && zone && (
          <>
            {isSubmitting && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium text-text-muted">
                    Creating your booking...
                  </p>
                </div>
              </div>
            )}
            <PaymentStep
              bookingData={{
                zone,
                zoneName,
                game,
                date,
                time,
                duration,
                drinks,
                sessionTotal,
                drinksTotal,
                total,
              }}
              onConfirm={handlePaymentConfirm}
              onBack={() => setBookingStep(2)}
            />
          </>
        )}

        {/* Step 4: Confirmation */}
        {bookingStep === 4 && zone && (
          <div>
            <BookingConfirmation
              bookingData={{
                zone,
                zoneName,
                game,
                date,
                time,
                duration,
                total,
                payMethod,
              }}
              bookingId={bookingId}
              onBookAnother={handleBookAnother}
              onGoHome={handleGoHome}
            />
            {bookingId && (
              <p className="text-center text-xs text-text-muted mt-4">
                Booking ID: <span className="font-mono text-cyan">{bookingId}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
