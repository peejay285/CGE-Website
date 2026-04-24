"use client";

import { cn } from "@/lib/utils";
import type { Achievement, AchievementRarity } from "@/lib/types";

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showTooltip?: boolean;
}

const RARITY_CONFIG: Record<AchievementRarity, {
  border: string;
  bg: string;
  glow: string;
  label: string;
  labelColor: string;
}> = {
  common: {
    border: "border-border",
    bg: "bg-surface-alt",
    glow: "",
    label: "Common",
    labelColor: "text-text-muted",
  },
  rare: {
    border: "border-cyan/30",
    bg: "bg-cyan/5",
    glow: "shadow-[0_0_12px_rgba(0,240,255,0.1)]",
    label: "Rare",
    labelColor: "text-cyan",
  },
  epic: {
    border: "border-magenta/30",
    bg: "bg-magenta/5",
    glow: "shadow-[0_0_16px_rgba(255,45,120,0.15)]",
    label: "Epic",
    labelColor: "text-magenta",
  },
  legendary: {
    border: "border-gold/40",
    bg: "bg-gold/5",
    glow: "shadow-[0_0_20px_rgba(255,215,0,0.2)]",
    label: "Legendary",
    labelColor: "text-gold",
  },
};

const SIZE_CONFIG = {
  sm: { wrapper: "w-10 h-10", icon: "text-lg", text: "text-[9px]" },
  md: { wrapper: "w-14 h-14", icon: "text-2xl", text: "text-[10px]" },
  lg: { wrapper: "w-20 h-20", icon: "text-4xl", text: "text-xs" },
};

export function AchievementBadge({
  achievement,
  unlocked = false,
  size = "md",
  onClick,
  showTooltip = true,
}: AchievementBadgeProps) {
  const rarity = RARITY_CONFIG[achievement.rarity];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group relative flex flex-col items-center gap-1.5 transition-all",
        onClick && "cursor-pointer hover:scale-105",
        !onClick && "cursor-default"
      )}
      aria-label={`${achievement.title} — ${rarity.label} achievement${unlocked ? " (unlocked)" : " (locked)"}`}
    >
      {/* Badge circle */}
      <div
        className={cn(
          "rounded-full border-2 flex items-center justify-center transition-all",
          sizeConfig.wrapper,
          unlocked ? rarity.border : "border-border/50",
          unlocked ? rarity.bg : "bg-surface-alt/50",
          unlocked && rarity.glow,
          !unlocked && "grayscale opacity-40"
        )}
      >
        <span className={cn(sizeConfig.icon, !unlocked && "opacity-50")}>
          {achievement.icon}
        </span>
      </div>

      {/* Title */}
      {size !== "sm" && (
        <span
          className={cn(
            "font-semibold text-center leading-tight max-w-[80px] truncate",
            sizeConfig.text,
            unlocked ? "text-text" : "text-text-muted/50"
          )}
        >
          {achievement.title}
        </span>
      )}

      {/* Tooltip on hover */}
      {showTooltip && (
        <div
          className={cn(
            "absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full",
            "bg-surface border border-border rounded-lg px-3 py-2 shadow-lg",
            "opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity",
            "z-50 min-w-[160px]"
          )}
        >
          <p className="text-xs font-bold text-text mb-0.5">{achievement.title}</p>
          <p className="text-[10px] text-text-muted mb-1">{achievement.description}</p>
          <div className="flex items-center justify-between">
            <span className={cn("text-[10px] font-semibold", rarity.labelColor)}>
              {rarity.label}
            </span>
            <span className="text-[10px] text-gold font-bold">
              +{achievement.points}pts
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
