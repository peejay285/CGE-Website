"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/lib/types";

interface EventCalendarProps {
  events: Event[];
  onEventSelect: (event: Event) => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const typeDotColor: Record<Event["type"], string> = {
  Party: "bg-magenta",
  Special: "bg-gold",
  Demo: "bg-cyan",
  Package: "bg-green",
};

const typeTextColor: Record<Event["type"], string> = {
  Party: "bg-magenta/15 text-magenta",
  Special: "bg-gold/15 text-gold",
  Demo: "bg-cyan/15 text-cyan",
  Package: "bg-green/15 text-green",
};

function parseEventDate(dateStr: string): Date | null {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

export function EventCalendar({ events, onEventSelect }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExpandedDay(null);
      }
    }
    if (expandedDay !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [expandedDay]);

  // Reset expanded day when month changes
  useEffect(() => {
    setExpandedDay(null);
  }, [month, year]);

  // Map dates to events for the current month
  const eventsByDay = useMemo(() => {
    const map = new Map<number, Event[]>();
    events.forEach((event) => {
      const date = parseEventDate(event.date);
      if (date && date.getMonth() === month && date.getFullYear() === year) {
        const day = date.getDate();
        const existing = map.get(day) || [];
        existing.push(event);
        map.set(day, existing);
      }
    });
    return map;
  }, [events, month, year]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const isPastDay = (day: number) => {
    const cellDate = new Date(year, month, day);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return cellDate < todayStart;
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayClick = (day: number, dayEvents: Event[]) => {
    if (dayEvents.length === 1) {
      onEventSelect(dayEvents[0]);
    } else if (dayEvents.length > 1) {
      setExpandedDay(expandedDay === day ? null : day);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4 md:p-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg text-text-muted hover:text-cyan hover:bg-surface-alt transition-colors cursor-pointer"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-lg font-bold font-heading tracking-tight text-text">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg text-text-muted hover:text-cyan hover:bg-surface-alt transition-colors cursor-pointer"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-semibold uppercase tracking-widest text-text-muted py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayEvents = day ? eventsByDay.get(day) : undefined;
          const hasEvents = dayEvents && dayEvents.length > 0;
          const past = day !== null && isPastDay(day);
          const isExpanded = expandedDay === day;

          return (
            <div
              key={i}
              className="relative"
              ref={isExpanded ? dropdownRef : undefined}
            >
              <div
                onClick={() => {
                  if (hasEvents) handleDayClick(day!, dayEvents!);
                }}
                className={cn(
                  "relative flex flex-col items-center justify-start rounded-lg p-1.5 min-h-[56px] md:min-h-[72px] transition-all",
                  day === null && "opacity-0",
                  day !== null && "hover:bg-surface-alt",
                  hasEvents && "cursor-pointer hover:border-cyan/30 border border-transparent",
                  isToday(day ?? 0) && "ring-1 ring-cyan/40 bg-cyan/5",
                  past && !isToday(day ?? 0) && "opacity-50",
                  isExpanded && "bg-surface-alt border-cyan/30 border"
                )}
              >
                {day !== null && (
                  <>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isToday(day) ? "text-cyan font-bold" : "text-text-muted",
                        hasEvents && "text-text"
                      )}
                    >
                      {day}
                    </span>
                    {/* Event dots */}
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {dayEvents.map((ev) => (
                          <span
                            key={ev.id}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              typeDotColor[ev.type]
                            )}
                          />
                        ))}
                      </div>
                    )}
                    {/* Event label on larger screens (single event) */}
                    {hasEvents && dayEvents.length === 1 && (
                      <div className="hidden md:flex flex-col gap-0.5 mt-1 w-full">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventSelect(dayEvents[0]);
                          }}
                          className={cn(
                            "text-[9px] font-semibold truncate w-full rounded px-1 py-0.5 text-left cursor-pointer transition-opacity hover:opacity-80",
                            typeTextColor[dayEvents[0].type]
                          )}
                        >
                          {dayEvents[0].title}
                        </button>
                      </div>
                    )}
                    {/* Multi-event indicator on larger screens */}
                    {hasEvents && dayEvents.length > 1 && (
                      <div className="hidden md:flex flex-col gap-0.5 mt-1 w-full">
                        <span className="text-[9px] font-semibold text-text-muted text-center">
                          {dayEvents.length} events
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Expanded dropdown for multi-event days */}
              {isExpanded && hasEvents && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 mt-1 w-48 rounded-lg border border-border bg-surface shadow-lg p-2 space-y-1">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => {
                        onEventSelect(ev);
                        setExpandedDay(null);
                      }}
                      className={cn(
                        "w-full text-left text-xs font-semibold rounded px-2 py-1.5 cursor-pointer transition-opacity hover:opacity-80",
                        typeTextColor[ev.type]
                      )}
                    >
                      {ev.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border">
        {(["Party", "Special", "Demo", "Package"] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", typeDotColor[type])} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
