"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  glow?: boolean;
  featured?: boolean;
  onClick?: () => void;
  className?: string;
  /** Optional a11y/interaction passthroughs — used by selectable card groups
      (e.g. the lounge zone picker's radiogroup). All default to undefined,
      so existing call sites are unaffected. */
  role?: React.AriaRole;
  tabIndex?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  "aria-checked"?: boolean;
  "aria-label"?: string;
}

export function Card({
  children,
  glow,
  featured,
  onClick,
  className,
  role,
  tabIndex,
  onKeyDown,
  "aria-checked": ariaChecked,
  "aria-label": ariaLabel,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={onKeyDown}
      aria-checked={ariaChecked}
      aria-label={ariaLabel}
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
