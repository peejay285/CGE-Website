"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  glow?: boolean;
  featured?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({ children, glow, featured, onClick, className }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-xl border bg-surface p-6 transition-all duration-300",
        "border-border hover:border-cyan/30",
        glow && "animate-glow",
        featured && "border-cyan/40 bg-gradient-to-b from-cyan/5 to-transparent",
        onClick && "cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,240,255,0.1)]",
        className
      )}
    >
      {children}
    </div>
  );
}
