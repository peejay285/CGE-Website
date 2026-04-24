"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy, ShoppingBag, Users, Gamepad2 } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
}

const STATS: StatItem[] = [
  { icon: <Trophy size={20} className="text-magenta" />, value: 500, suffix: "+", label: "Tournaments Played" },
  { icon: <ShoppingBag size={20} className="text-cyan" />, value: 2000, suffix: "+", label: "Items Listed" },
  { icon: <Users size={20} className="text-green" />, value: 5000, suffix: "+", label: "Gamers Connected" },
  { icon: <Gamepad2 size={20} className="text-gold" />, value: 10000, suffix: "+", label: "Hours Gamed" },
];

function AnimatedNumber({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const step = target / (duration / 16);
          let current = 0;
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, 16);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const display = count >= 1000 ? `${(count / 1000).toFixed(count >= target ? 0 : 1)}K` : count.toString();

  return (
    <span ref={ref} className="font-heading text-3xl sm:text-4xl font-bold text-text">
      {display}{suffix}
    </span>
  );
}

export function StatsBar() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan/5 via-transparent to-magenta/5 pointer-events-none" />
      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-0">
        {STATS.map((stat, idx) => (
          <div
            key={stat.label}
            className={`flex flex-col items-center gap-2 py-8 px-4 ${
              idx < STATS.length - 1 ? "border-r border-border max-lg:odd:border-r max-lg:even:border-r-0 lg:border-r" : ""
            } ${idx < 2 ? "max-lg:border-b max-lg:border-border" : ""}`}
          >
            <div className="w-10 h-10 rounded-xl bg-surface-alt border border-border flex items-center justify-center mb-1">
              {stat.icon}
            </div>
            <AnimatedNumber target={stat.value} suffix={stat.suffix} />
            <span className="text-xs text-text-muted font-medium uppercase tracking-wider">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
