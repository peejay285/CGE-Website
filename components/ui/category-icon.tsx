"use client";

import {
  Gamepad2,
  Disc3,
  Headphones,
  Armchair,
  Monitor,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG: Record<
  string,
  { icon: typeof Gamepad2; color: string; bg: string }
> = {
  Controllers: {
    icon: Gamepad2,
    color: "text-cyan",
    bg: "bg-cyan/10",
  },
  Games: {
    icon: Disc3,
    color: "text-magenta",
    bg: "bg-magenta/10",
  },
  Accessories: {
    icon: Headphones,
    color: "text-gold",
    bg: "bg-gold/10",
  },
  Furniture: {
    icon: Armchair,
    color: "text-green",
    bg: "bg-green/10",
  },
  Consoles: {
    icon: Monitor,
    color: "text-cyan",
    bg: "bg-cyan/10",
  },
};

const DEFAULT_CONFIG = {
  icon: Package,
  color: "text-text-muted",
  bg: "bg-surface-alt",
};

interface CategoryIconProps {
  category: string;
  size?: number;
  showBg?: boolean;
  className?: string;
}

export function CategoryIcon({
  category,
  size = 16,
  showBg = false,
  className,
}: CategoryIconProps) {
  const config = CATEGORY_CONFIG[category] || DEFAULT_CONFIG;
  const Icon = config.icon;

  if (showBg) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg",
          config.bg,
          className
        )}
      >
        <Icon size={size} className={config.color} />
      </div>
    );
  }

  return <Icon size={size} className={cn(config.color, className)} />;
}

export function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || DEFAULT_CONFIG;
}
