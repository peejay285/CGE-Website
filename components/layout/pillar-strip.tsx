"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, ShoppingBag, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// activeClass uses full Tailwind class names so JIT picks them up at build.
const PILLARS = [
  { key: "esports", label: "Esports", href: "/esports", icon: Trophy,
    activeClass: "bg-magenta/15 text-magenta" },
  { key: "marketplace", label: "Marketplace", href: "/marketplace", icon: ShoppingBag,
    activeClass: "bg-cyan/15 text-cyan" },
  { key: "community", label: "Community", href: "/community", icon: Users,
    activeClass: "bg-green/15 text-green" },
  { key: "lounge", label: "Lounge", href: "/lounge", icon: Calendar,
    activeClass: "bg-gold/15 text-gold" },
] as const;

const PILLAR_ROUTES = ["/esports", "/marketplace", "/community", "/lounge"];

/**
 * Cross-pillar quick-jump strip. Sits under the main navbar on pillar pages
 * so users discover the other surfaces without scrolling. Hidden on the
 * homepage and non-pillar routes.
 */
export function PillarStrip() {
  const pathname = usePathname();
  const onPillar = PILLAR_ROUTES.some((p) => pathname.startsWith(p));
  if (!onPillar) return null;

  return (
    <div className="fixed top-14 lg:top-16 left-0 right-0 z-40 border-b border-border bg-base/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 h-10">
          {PILLARS.map((p) => {
            const active = pathname.startsWith(p.href);
            const Icon = p.icon;
            return (
              <Link
                key={p.key}
                href={p.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors",
                  active
                    ? p.activeClass
                    : "text-text-muted hover:text-text hover:bg-surface-alt",
                )}
              >
                <Icon size={12} />
                {p.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
