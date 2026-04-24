"use client";

import Link from "next/link";
import { Trophy, ShoppingBag, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PillarQuickNavProps {
  /** Which pillar page we're currently on — it won't show a link to itself */
  current: "marketplace" | "esports" | "community";
}

// Use full class names so Tailwind can detect them at build time
const PILLARS = [
  {
    key: "esports" as const,
    label: "Esports",
    description: "Compete in tournaments",
    href: "/esports",
    icon: Trophy,
    iconClass: "text-magenta",
    cardClass: "border-magenta/20 hover:border-magenta/40 bg-magenta/5",
    iconBg: "bg-magenta/10",
  },
  {
    key: "marketplace" as const,
    label: "Marketplace",
    description: "Buy, sell & swap gear",
    href: "/marketplace",
    icon: ShoppingBag,
    iconClass: "text-cyan",
    cardClass: "border-cyan/20 hover:border-cyan/40 bg-cyan/5",
    iconBg: "bg-cyan/10",
  },
  {
    key: "community" as const,
    label: "Community",
    description: "Connect with gamers",
    href: "/community",
    icon: Users,
    iconClass: "text-green",
    cardClass: "border-green/20 hover:border-green/40 bg-green/5",
    iconBg: "bg-green/10",
  },
];

export function PillarQuickNav({ current }: PillarQuickNavProps) {
  const others = PILLARS.filter((p) => p.key !== current);

  return (
    <div className="mt-8 mb-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted/50 mb-3">
        Explore CGE
      </p>
      <div className="grid grid-cols-2 gap-3">
        {others.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <Link
              key={pillar.key}
              href={pillar.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl border p-3 transition-all press-feedback",
                pillar.cardClass
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                pillar.iconBg
              )}>
                <Icon size={16} className={pillar.iconClass} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text group-hover:text-cyan transition-colors">
                  {pillar.label}
                </p>
                <p className="text-[10px] text-text-muted">
                  {pillar.description}
                </p>
              </div>
              <ArrowRight size={14} className="text-text-muted group-hover:text-cyan transition-colors shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
