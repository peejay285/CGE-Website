"use client";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "magenta" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-cyan to-[#00C8D4] text-base hover:from-[#33F3FF] hover:to-cyan hover:shadow-[0_4px_20px_rgba(0,240,255,0.3)]",
  secondary:
    "bg-transparent text-cyan border border-cyan/40 hover:bg-cyan/5",
  magenta:
    "bg-gradient-to-br from-magenta to-[#D41860] text-white hover:from-[#FF5A96] hover:to-magenta hover:shadow-[0_4px_20px_rgba(255,45,120,0.3)]",
  ghost: "bg-transparent text-text-muted hover:bg-surface-alt",
  danger: "bg-transparent text-red border border-red/30 hover:bg-red/10",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-6 py-2.5 text-[13px]",
  lg: "px-8 py-3.5 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer",
        "hover:-translate-y-0.5 active:translate-y-0",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
