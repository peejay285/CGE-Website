import Link from "next/link";
import { Gamepad2, Trophy, ShoppingBag, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Pillar {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  features: string[];
  href: string;
  cta: string;
  color: "cyan" | "magenta";
}

const PILLARS: Pillar[] = [
  {
    icon: <Gamepad2 size={28} />,
    title: "Gaming Lounge",
    tagline: "Walk in. Pick up a controller. Game on.",
    features: [
      "PS4 & PS5 consoles",
      "Immersive VR zone",
      "Main, VIP & VR areas",
      "Drinks & snacks on deck",
    ],
    href: "/lounge",
    cta: "Book a Session",
    color: "cyan",
  },
  {
    icon: <Trophy size={28} />,
    title: "Esports",
    tagline: "Prove you're the best. Win real prizes.",
    features: [
      "Weekly tournaments",
      "FC 26, Tekken 8, MK1 & more",
      "Live leaderboards",
      "Cash & gear prizes",
    ],
    href: "/esports",
    cta: "View Tournaments",
    color: "magenta",
  },
  {
    icon: <ShoppingBag size={28} />,
    title: "Marketplace",
    tagline: "Buy, sell & swap gaming gear.",
    features: [
      "Controllers & consoles",
      "Games & accessories",
      "Swap with other gamers",
      "Verified sellers",
    ],
    href: "/marketplace",
    cta: "Browse Listings",
    color: "cyan",
  },
  {
    icon: <Users size={28} />,
    title: "Community",
    tagline: "Your crew. Your voice. Your space.",
    features: [
      "Real-time feed",
      "Player discussions",
      "Event announcements",
      "Find your squad",
    ],
    href: "/community",
    cta: "Join the Community",
    color: "magenta",
  },
];

const colorMap = {
  cyan: {
    iconBg: "bg-cyan/10",
    iconText: "text-cyan",
    border: "hover:border-cyan/40",
    glow: "from-cyan/8 to-transparent",
    cta: "text-cyan",
    bullet: "bg-cyan/60",
  },
  magenta: {
    iconBg: "bg-magenta/10",
    iconText: "text-magenta",
    border: "hover:border-magenta/40",
    glow: "from-magenta/8 to-transparent",
    cta: "text-magenta",
    bullet: "bg-magenta/60",
  },
};

export function Pillars() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {PILLARS.map((pillar) => {
        const c = colorMap[pillar.color];

        return (
          <Link
            key={pillar.title}
            href={pillar.href}
            className={cn(
              "group relative rounded-xl border border-border bg-surface p-6 transition-all duration-300",
              "hover:-translate-y-1 hover:shadow-lg",
              c.border
            )}
          >
            {/* Hover gradient */}
            <div
              className={cn(
                "absolute inset-0 rounded-xl bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
                c.glow
              )}
            />

            <div className="relative z-10">
              {/* Icon */}
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center mb-4",
                  c.iconBg,
                  c.iconText
                )}
              >
                {pillar.icon}
              </div>

              {/* Title */}
              <h3 className="font-heading text-lg font-bold text-text tracking-wide mb-1">
                {pillar.title}
              </h3>

              {/* Tagline */}
              <p className="text-sm text-text-muted mb-4">
                {pillar.tagline}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {pillar.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-xs text-text-muted"
                  >
                    <span
                      className={cn("w-1 h-1 rounded-full flex-shrink-0", c.bullet)}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <span
                className={cn(
                  "inline-flex items-center text-sm font-semibold transition-colors duration-300",
                  c.cta
                )}
              >
                {pillar.cta}
                <svg
                  className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
