"use client";

import { useState, useEffect, useCallback } from "react";
import { GAME_OPTIONS, TIME_SLOTS, SUNDAY_TIME_SLOTS, BRAND } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { Select, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { cn, isSunday, formatPrice, slotToHour } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

interface BookingFormData {
  game: string;
  date: string;
  time: string;
  duration: number;
}

interface BookingFormProps {
  zone: string;
  zoneName: string;
  zoneConsole: string;
  getUnitPrice: (game: string) => number;
  onNext: (data: BookingFormData) => void;
  onBack: () => void;
}

export function BookingForm({
  zone,
  zoneName,
  zoneConsole,
  getUnitPrice,
  onNext,
  onBack,
}: BookingFormProps) {
  const [game, setGame] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(1);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);

  const isVr = zone === "vr";
  const games = GAME_OPTIONS[zone] || [];
  const sunday = isSunday(date);
  const activeSlots = sunday ? SUNDAY_TIME_SLOTS : TIME_SLOTS;

  const today = new Date().toISOString().split("T")[0];

  const gameOptions = games.map((g) => ({ value: g, label: g }));

  const durationOptions = isVr
    ? [
        { value: "1", label: "1 session (15 min)" },
        { value: "2", label: "2 sessions (30 min)" },
        { value: "3", label: "3 sessions (45 min)" },
        { value: "4", label: "4 sessions (1 hr)" },
      ]
    : [
        { value: "1", label: "1 hour" },
        { value: "2", label: "2 hours" },
        { value: "3", label: "3 hours" },
        { value: "4", label: "4 hours" },
      ];

  // Fetch booked slots when date or duration changes.
  // Uses the aggregate `get_slot_availability` RPC (SECURITY DEFINER) —
  // the old client-side count only saw the caller's own bookings under
  // RLS, and ignored multi-hour bookings entirely.
  const fetchBookedSlots = useCallback(async () => {
    if (!date || !zone) {
      setBookedSlots(new Set());
      return;
    }

    setLoadingSlots(true);
    try {
      const supabase = createClient();

      const { data: rows } = await supabase.rpc("get_slot_availability", {
        p_zone_id: zone,
        p_booking_date: date,
      });

      if (rows) {
        const byHour = new Map<number, { booked: number; capacity: number }>();
        for (const r of rows as { slot_hour: number; booked_count: number; capacity: number }[]) {
          byHour.set(r.slot_hour, { booked: Number(r.booked_count), capacity: r.capacity });
        }

        // A slot is unavailable if ANY hour the session would span is full.
        const span = isVr ? 1 : Math.max(duration, 1);
        const full = new Set<string>();
        const slots = isSunday(date) ? SUNDAY_TIME_SLOTS : TIME_SLOTS;
        for (const slot of slots) {
          const start = slotToHour(slot);
          if (start < 0) continue;
          for (let h = start; h < start + span; h++) {
            const info = byHour.get(h);
            if (info && info.booked >= info.capacity) {
              full.add(slot);
              break;
            }
          }
        }
        setBookedSlots(full);
      }
    } catch {
      // Silently fail — slots just won't show availability
      setBookedSlots(new Set());
    } finally {
      setLoadingSlots(false);
    }
  }, [date, zone, duration, isVr]);

  useEffect(() => {
    fetchBookedSlots();
  }, [fetchBookedSlots]);

  // Clear selected time when date changes and the slot is no longer available
  useEffect(() => {
    if (time && !(activeSlots as readonly string[]).includes(time)) {
      setTime("");
    }
  }, [date, activeSlots, time]);

  // Clear selected time if slot becomes booked
  useEffect(() => {
    if (time && bookedSlots.has(time)) {
      setTime("");
    }
  }, [bookedSlots, time]);

  // Price estimate
  const estimate = game ? getUnitPrice(game) * duration : 0;

  const canContinue = game && date && time && duration > 0;

  function handleSubmit() {
    if (!canContinue) return;
    onNext({ game, date, time, duration });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Zone Context Badge */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan/20 bg-cyan/5">
          <span className="text-xs font-semibold text-cyan">
            {zoneName} &middot; {zoneConsole}
          </span>
        </div>
      </div>

      <SectionTitle
        eyebrow="Step 2"
        title="Session Details"
        subtitle="Pick your game, date, time, and how long you want to play."
        align="center"
      />

      <div className="space-y-6">
        {/* Game Selection */}
        <Select
          label="Game"
          options={gameOptions}
          value={game}
          onChange={(e) => setGame(e.target.value)}
        />

        {/* Date Picker */}
        <div className="flex flex-col gap-1.5">
          <Input
            label="Date"
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {sunday && (
            <p className="text-xs text-text-muted">
              Sunday hours: {BRAND.hours.sunday}
            </p>
          )}
        </div>

        {/* Time Slot Chips */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Time Slot
            {loadingSlots && (
              <span className="ml-2 text-text-muted/50 font-normal normal-case">
                checking...
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {activeSlots.map((slot) => {
              const isFull = bookedSlots.has(slot);

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => !isFull && setTime(slot)}
                  disabled={isFull}
                  className={cn(
                    "px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide border transition-all duration-200",
                    isFull
                      ? "bg-surface-alt/50 text-text-muted/30 border-border/50 line-through cursor-not-allowed"
                      : time === slot
                        ? "bg-cyan/15 text-cyan border-cyan shadow-[0_0_12px_rgba(0,240,255,0.15)] cursor-pointer"
                        : "bg-surface-alt text-text-muted border-border hover:border-cyan/30 hover:text-text cursor-pointer"
                  )}
                  title={isFull ? "This slot is fully booked" : undefined}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          {bookedSlots.size > 0 && (
            <p className="text-[11px] text-text-muted/60 mt-0.5">
              Slots with strikethrough are fully booked
            </p>
          )}
          {/* Operating Hours Note */}
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={12} className="text-text-muted" />
            <span className="text-xs text-text-muted">
              Mon&ndash;Sat: {BRAND.hours.weekday} &middot; Sun: {BRAND.hours.sunday}
            </span>
          </div>
        </div>

        {/* Duration Selector */}
        <Select
          label="Duration"
          options={durationOptions}
          value={String(duration)}
          onChange={(e) => setDuration(Number(e.target.value))}
        />

        {/* Live Price Estimate */}
        {game && estimate > 0 && (
          <div className="text-center py-3">
            <span className="text-sm text-text-muted">
              Estimated session cost:{" "}
            </span>
            <span className="text-lg font-bold text-cyan">
              {formatPrice(estimate)}
            </span>
          </div>
        )}

        {/* Actions */}

        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canContinue}
          >
            Continue
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
