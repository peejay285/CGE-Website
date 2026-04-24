import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
}

export function ProgressBar({ value, max, color, className }: ProgressBarProps) {
  const percent = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("h-1.5 rounded-full bg-surface-alt overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${percent}%`,
          background: color || "var(--color-cyan)",
        }}
      />
    </div>
  );
}
