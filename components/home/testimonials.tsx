"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn, getInitials } from "@/lib/utils";

interface Testimonial {
  name: string;
  text: string;
  rating: number;
  color: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Emeka Johnson",
    text: "The PS5 VIP lounge is incredible — crystal-clear display and the controllers are always in perfect condition. Best gaming spot in Nigeria, hands down.",
    rating: 5,
    color: "bg-cyan/20 text-cyan",
  },
  {
    name: "Amara Obi",
    text: "Sold my old PS4 controller on the marketplace in under a day. The community here actually buys and sells — it's not dead like other platforms.",
    rating: 5,
    color: "bg-magenta/20 text-magenta",
  },
  {
    name: "David Nwachukwu",
    text: "Won my first FC 26 tournament here. The esports scene is growing fast — real brackets, real prizes, real competition. CGE is building something special.",
    rating: 5,
    color: "bg-gold/20 text-gold",
  },
  {
    name: "Blessing Adekunle",
    text: "The community feed keeps me connected even when I can't make it to the lounge. Found my Tekken crew through CGE — we run sets every weekend now.",
    rating: 5,
    color: "bg-green/20 text-green",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={cn(
            "w-4 h-4",
            i < rating ? "text-gold" : "text-border"
          )}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
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

  const testimonial = TESTIMONIALS[activeIndex];

  return (
    <div
      className="flex flex-col items-center"
      onMouseEnter={stopAutoRotate}
      onMouseLeave={startAutoRotate}
    >
      {/* Testimonial card */}
      <div className="w-full max-w-2xl mx-auto text-center">
        <div className="mb-6 flex justify-center">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold font-heading",
              testimonial.color
            )}
          >
            {getInitials(testimonial.name)}
          </div>
        </div>

        <div className="flex justify-center">
          <StarRating rating={testimonial.rating} />
        </div>

        <blockquote className="mt-6 text-lg sm:text-xl text-text leading-relaxed">
          &ldquo;{testimonial.text}&rdquo;
        </blockquote>

        <p className="mt-4 text-sm font-semibold text-cyan tracking-wide uppercase">
          {testimonial.name}
        </p>
      </div>

      {/* Dot navigation */}
      <div className="flex gap-2 mt-10">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer",
              i === activeIndex
                ? "bg-cyan w-8"
                : "bg-border hover:bg-text-muted"
            )}
            aria-label={`Go to testimonial ${i + 1} of ${TESTIMONIALS.length}`}
          />
        ))}
      </div>
    </div>
  );
}
