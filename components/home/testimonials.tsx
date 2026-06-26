"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface EventHighlight {
  initials: string;
  event: string;
  text: string;
  attribution: string;
  color: string;
}

const HIGHLIGHTS: EventHighlight[] = [
  {
    initials: "FC",
    event: "CGE Invasion",
    text: "A stacked FC 26 bracket, a grand final that went the distance, and ₦500,000 on the line — CGE Invasion crowned its grand winner in front of a packed lounge.",
    attribution: "FC 26 Grand Winner — CGE Invasion",
    color: "bg-gold/20 text-gold",
  },
  {
    initials: "CD",
    event: "CODM Tournament",
    text: "From group stage grind to a clutch final circle — our Call of Duty: Mobile tournament went down to the wire before the champion took home the ₦100,000 prize.",
    attribution: "CODM Champion — ₦100K Tournament",
    color: "bg-magenta/20 text-magenta",
  },
  {
    initials: "CGE",
    event: "Tournament Day",
    text: "Every station running, brackets on every screen, and gamers from across the island packing the lounge — this is what tournament day at CGE looks like.",
    attribution: "Match Day — CGE Lounge, Bonny Island",
    color: "bg-cyan/20 text-cyan",
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % HIGHLIGHTS.length);
  }, []);

  const startAutoRotate = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(next, 9000);
  }, [next]);

  const stopAutoRotate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoRotate();
    return () => stopAutoRotate();
  }, [startAutoRotate, stopAutoRotate]);

  const highlight = HIGHLIGHTS[activeIndex];

  return (
    <div
      className="flex flex-col items-center"
      onMouseEnter={stopAutoRotate}
      onMouseLeave={startAutoRotate}
    >
      {/* Event highlight card */}
      <div className="w-full max-w-2xl mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold font-heading",
              highlight.color
            )}
          >
            {highlight.initials}
          </div>
        </div>

        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">
          {highlight.event}
        </p>

        <blockquote className="mt-6 text-lg sm:text-xl text-text leading-relaxed">
          {highlight.text}
        </blockquote>

        <p className="mt-4 text-sm font-semibold text-cyan tracking-wide uppercase">
          {highlight.attribution}
        </p>
      </div>

      {/* Dot navigation */}
      <div className="flex gap-2 mt-10">
        {HIGHLIGHTS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer",
              i === activeIndex
                ? "bg-cyan w-8"
                : "bg-border hover:bg-text-muted"
            )}
            aria-label={`Go to highlight ${i + 1} of ${HIGHLIGHTS.length}`}
          />
        ))}
      </div>
    </div>
  );
}
