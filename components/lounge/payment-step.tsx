"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/ui/section-title";
import { formatPrice, formatBookingDate, cn } from "@/lib/utils";
import { PRICING } from "@/lib/constants";
import { ArrowLeft, CreditCard, MapPin, CheckCircle, XCircle, Loader2, ShieldCheck } from "lucide-react";

const PRICE_MAP: Record<string, number> = {};
for (const item of [...PRICING.drinks, ...PRICING.snacks]) {
  PRICE_MAP[item.name] = item.price;
}

interface BookingData {
  zone: string;
  zoneName: string;
  game: string;
  date: string;
  time: string;
  duration: number;
  drinks: Record<string, number>;
  sessionTotal: number;
  drinksTotal: number;
  total: number;
}

interface VoucherResult {
  valid: boolean;
  error?: string;
  voucher?: {
    id: string;
    code: string;
    prize_label: string;
    zone_id: string;
    duration: number;
    expires_at: string;
  };
}

interface PaymentStepProps {
  bookingData: BookingData;
  onConfirm: (payMethod: "paystack" | "venue", passCode: string) => void;
  onBack: () => void;
}

export function PaymentStep({ bookingData, onConfirm, onBack }: PaymentStepProps) {
  const [payMethod, setPayMethod] = useState<"paystack" | "venue">("paystack");
  const [passCode, setPassCode] = useState("");
  const [voucherState, setVoucherState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drinkEntries = Object.entries(bookingData.drinks).filter(
    ([, qty]) => qty > 0
  );

  // Debounced voucher validation
  useEffect(() => {
    if (checkTimer.current) clearTimeout(checkTimer.current);

    const trimmed = passCode.trim().toUpperCase();

    // Reset if empty
    if (!trimmed) {
      setVoucherState("idle");
      setVoucherMessage("");
      setVoucherDiscount(0);
      return;
    }

    // Only check codes that look like vouchers (CGE-XXXXXXXX)
    if (!trimmed.startsWith("CGE-")) {
      setVoucherState("idle");
      setVoucherMessage("");
      setVoucherDiscount(0);
      return;
    }

    setVoucherState("checking");

    checkTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/giveaway/voucher-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: trimmed, zone_id: bookingData.zone }),
        });
        const data: VoucherResult = await res.json();

        if (data.valid && data.voucher) {
          setVoucherState("valid");
          setVoucherMessage(data.voucher.prize_label);
          // The voucher covers the full session cost for the matching zone
          setVoucherDiscount(bookingData.sessionTotal);
        } else {
          setVoucherState("invalid");
          setVoucherMessage(data.error || "Invalid code");
          setVoucherDiscount(0);
        }
      } catch {
        setVoucherState("invalid");
        setVoucherMessage("Could not validate code");
        setVoucherDiscount(0);
      }
    }, 600);

    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [passCode, bookingData.zone, bookingData.sessionTotal]);

  const finalTotal = Math.max(0, bookingData.total - voucherDiscount);

  return (
    <div className="max-w-2xl mx-auto">
      <SectionTitle
        eyebrow="Step 4"
        title="Review & Pay"
        subtitle="Review your booking details and choose how to pay."
        align="center"
      />

      {/* Payment Method */}
      <div className="space-y-3 mb-8">
        <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Payment Method
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Paystack Option */}
          <button
            type="button"
            onClick={() => setPayMethod("paystack")}
            className={cn(
              "relative rounded-xl border p-5 text-left transition-all duration-200 cursor-pointer",
              payMethod === "paystack"
                ? "border-cyan bg-cyan/5 shadow-[0_0_20px_rgba(0,240,255,0.1)]"
                : "border-border bg-surface hover:border-cyan/30"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  payMethod === "paystack"
                    ? "bg-cyan/15 text-cyan"
                    : "bg-surface-alt text-text-muted"
                )}
              >
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">
                  Pay with Paystack
                </p>
                <p className="text-xs text-text-muted">Card / Bank Transfer</p>
              </div>
            </div>
            {payMethod === "paystack" && (
              <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
            )}
          </button>

          {/* Venue Option */}
          <button
            type="button"
            onClick={() => setPayMethod("venue")}
            className={cn(
              "relative rounded-xl border p-5 text-left transition-all duration-200 cursor-pointer",
              payMethod === "venue"
                ? "border-magenta bg-magenta/5 shadow-[0_0_20px_rgba(255,45,120,0.1)]"
                : "border-border bg-surface hover:border-magenta/30"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  payMethod === "venue"
                    ? "bg-magenta/15 text-magenta"
                    : "bg-surface-alt text-text-muted"
                )}
              >
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">
                  Reserve at Venue
                </p>
                <p className="text-xs text-text-muted">Pay when you arrive</p>
              </div>
            </div>
            {payMethod === "venue" && (
              <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-magenta shadow-[0_0_8px_rgba(255,45,120,0.4)]" />
            )}
          </button>
        </div>

        {/* Trust signal */}
        <div className="flex items-center gap-1.5 mt-2">
          <ShieldCheck size={13} className="text-green" />
          <span className="text-[11px] text-text-muted">
            Payments secured by Paystack — 256-bit SSL encryption
          </span>
        </div>
      </div>

      {/* Pass Code with live validation */}
      <div className="mb-8">
        <Input
          label="Voucher / Pass Code (optional)"
          placeholder="e.g. CGE-XXXXXXXX"
          value={passCode}
          onChange={(e) => setPassCode(e.target.value)}
        />
        {voucherState === "checking" && (
          <div className="flex items-center gap-2 mt-2 text-text-muted">
            <Loader2 size={14} className="animate-spin" />
            <span className="text-xs">Checking code...</span>
          </div>
        )}
        {voucherState === "valid" && (
          <div className="flex items-center gap-2 mt-2 text-green">
            <CheckCircle size={14} />
            <span className="text-xs font-semibold">{voucherMessage} — Session is free!</span>
          </div>
        )}
        {voucherState === "invalid" && (
          <div className="flex items-center gap-2 mt-2 text-red-400">
            <XCircle size={14} />
            <span className="text-xs">{voucherMessage}</span>
          </div>
        )}
      </div>

      {/* Booking Summary */}
      <Card className="mb-8">
        <h4 className="text-sm font-bold uppercase tracking-wider text-text mb-4">
          Booking Summary
        </h4>

        <div className="space-y-3">
          <SummaryRow label="Zone" value={bookingData.zoneName} />
          <SummaryRow label="Game" value={bookingData.game} />
          <SummaryRow label="Date" value={formatBookingDate(bookingData.date)} />
          <SummaryRow label="Time" value={bookingData.time} />
          <SummaryRow
            label="Duration"
            value={
              bookingData.zone === "vr"
                ? `${bookingData.duration} session${bookingData.duration > 1 ? "s" : ""} (${bookingData.duration * 15} min)`
                : `${bookingData.duration} hour${bookingData.duration > 1 ? "s" : ""}`
            }
          />

          <div className="border-t border-border my-3" />

          <SummaryRow
            label="Session Cost"
            value={formatPrice(bookingData.sessionTotal)}
          />

          {drinkEntries.length > 0 && (
            <>
              {drinkEntries.map(([name, qty]) => (
                <SummaryRow
                  key={name}
                  label={`${name} x${qty}`}
                  value={formatPrice(qty * (PRICE_MAP[name] || 0))}
                />
              ))}
              <SummaryRow
                label="Extras Subtotal"
                value={formatPrice(bookingData.drinksTotal)}
              />
            </>
          )}

          {voucherDiscount > 0 && (
            <>
              <div className="border-t border-border my-3" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-green uppercase tracking-wider font-semibold">
                  Voucher Discount
                </span>
                <span className="text-sm font-semibold text-green">
                  -{formatPrice(voucherDiscount)}
                </span>
              </div>
            </>
          )}

          <div className="border-t border-border my-3" />

          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-text">
              Total
            </span>
            <div className="text-right">
              {voucherDiscount > 0 && (
                <span className="text-xs text-text-muted line-through mr-2">
                  {formatPrice(bookingData.total)}
                </span>
              )}
              <span className="text-lg font-bold font-heading text-cyan">
                {formatPrice(finalTotal)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Cancellation Policy */}
      <div className="rounded-lg border border-border bg-surface-alt px-5 py-4 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
          Cancellation Policy
        </p>
        <ul className="space-y-1 text-xs" style={{ color: "#C4C4CC" }}>
          <li>• Cancel up to 2 hours before your session for a full refund</li>
          <li>• Late cancellations or no-shows are non-refundable</li>
          <li>• Venue reservations can be cancelled anytime before arrival</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button
          variant={payMethod === "paystack" ? "primary" : "magenta"}
          size="lg"
          onClick={() => onConfirm(payMethod, passCode)}
        >
          {voucherDiscount > 0 && finalTotal === 0
            ? "Confirm Free Session"
            : payMethod === "paystack"
              ? "Confirm & Pay"
              : "Reserve Session"}
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted uppercase tracking-wider">
        {label}
      </span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  );
}
