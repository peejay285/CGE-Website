"use client";

import { cn } from "@/lib/utils";

type BadgeColor = "cyan" | "magenta" | "gold" | "green" | "red";

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  size?: "sm" | "md";
  className?: string;
}

const colorMap: Record<BadgeColor, string> = {
  cyan: "bg-cyan/10 text-cyan border-cyan/25",
  magenta: "bg-magenta/10 text-magenta border-magenta/25",
  gold: "bg-gold/10 text-gold border-gold/25",
  green: "bg-green/10 text-green border-green/25",
  red: "bg-red/10 text-red border-red/25",
};

export function Badge({ children, color = "cyan", size = "sm", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold font-sans border rounded-full uppercase tracking-widest",
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3.5 py-1 text-xs",
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
