"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { ZONES, TIME_SLOTS, SUNDAY_TIME_SLOTS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ZoneAvailabilityProps {
  className?: string;
}

interface DayCell {
  isoDate: string;
  label: string;
  weekday: string;
  isToday: boolean;
}

type LoadByZone = Record<string, Record<string, number>>;

function buildNextSevenDays(): DayCell[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return {
      isoDate: iso,
      label: i === 0 ? "Today" : i === 1 ? "Tom" : String(d.getDate()),
      weekday: d.toLocaleDateString("en-NG", { weekday: "short" }),
      isToday: i === 0,
    };
  });
}

function slotCountForDate(isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.getDay() === 0 ? SUNDAY_TIME_SLOTS.length : TIME_SLOTS.length;
}

export function ZoneAvailability({ className }: ZoneAvailabilityProps) {
  const [load, setLoad] = useState<LoadByZone>({});
  const [loading, setLoading] = useState(true);
  const days = useMemo(buildNextSevenDays, []);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const startISO = days[0].isoDate;
    const endISO = days[days.length - 1].isoDate;
    supabase
      .from("bookings")
      .select("zone_id, booking_date")
      .gte("booking_date", startISO)
      .lte("booking_date", endISO)
      .neq("payment_status", "cancelled")
      .then(
        ({
          data,
        }: {
          data: { zone_id: string; booking_date: string }[] | null;
        }) => {
          if (cancelled) return;
          const next: LoadByZone = {};
          for (const row of data ?? []) {
            const z = next[row.zone_id] ?? (next[row.zone_id] = {});
            z[row.booking_date] = (z[row.booking_date] ?? 0) + 1;
          }
          setLoad(next);
          setLoading(false);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={14} className="text-cyan" />
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          Next 7 days at a glance
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface-alt p-3 sm:p-4 overflow-x-auto">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted pb-2 pr-2">
                Zone
              </th>
              {days.map((d) => (
                <th
                  key={d.isoDate}
                  className={cn(
                    "text-center text-[10px] font-semibold uppercase tracking-wider pb-2 px-1",
                    d.isToday ? "text-cyan" : "text-text-muted",
                  )}
                >
                  <div>{d.weekday}</div>
                  <div className="text-text/80 font-bold">{d.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ZONES.map((zone) => (
              <tr key={zone.id}>
                <td className="text-left text-xs font-medium text-text py-2 pr-2 whitespace-nowrap">
                  {zone.name}
                </td>
                {days.map((d) => {
                  const used = load[zone.id]?.[d.isoDate] ?? 0;
                  const total = slotCountForDate(d.isoDate) * zone.capacity;
                  const ratio = loading ? null : used / total;
                  return (
                    <td key={d.isoDate} className="text-center py-1.5 px-1">
                      <AvailabilityDot ratio={ratio} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <Legend />
      </div>
    </div>
  );
}

function AvailabilityDot({ ratio }: { ratio: number | null }) {
  if (ratio === null) {
    return <span className="inline-block w-3 h-3 rounded-full bg-border" aria-label="loading" />;
  }
  let cls = "bg-green";
  let label = "Open";
  if (ratio >= 0.85) {
    cls = "bg-red";
    label = "Full";
  } else if (ratio >= 0.5) {
    cls = "bg-gold";
    label = "Busy";
  }
  return (
    <span
      className={cn("inline-block w-3 h-3 rounded-full", cls)}
      title={label}
      aria-label={label}
    />
  );
}

function Legend() {
  return (
    <div className="flex items-center justify-end gap-4 mt-3 text-[10px] text-text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green" />
        Open
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-gold" />
        Busy
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red" />
        Full
      </span>
    </div>
  );
}
