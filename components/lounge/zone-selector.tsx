"use client";

import { useState } from "react";
import { ZONES, PRICING, BRAND } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { Gamepad2, Crown, Glasses, CalendarDays, Zap, Clock, ArrowRight } from "lucide-react";
import { ZoneAvailability } from "./zone-availability";

interface ZoneSelectorProps {
  selected: string | null;
  onSelect: (zoneId: string) => void;
}

const ZONE_ICONS: Record<string, React.ReactNode> = {
  main: <Gamepad2 size={32} />,
  vip: <Crown size={32} />,
  vr: <Glasses size={32} />,
};

const ZONE_DETAILS: Record<
  string,
  { from: string; includes: string[] }
> = {
  main: {
    from: formatPrice(PRICING.mainLounge[1].price) + "/hr",
    includes: [
      "PS4 console access",
      "Controllers provided",
      "Up to 6 players",
    ],
  },
  vip: {
    from: formatPrice(PRICING.vipLounge[0].price) + "/hr",
    includes: [
      "PS5 console access",
      "Premium controllers",
      "Private area, 2 consoles",
    ],
  },
  vr: {
    from: formatPrice(PRICING.vr[0].price) + "/session",
    includes: [
      "VR headset provided",
      "15 min per session",
      "Multiple games available",
    ],
  },
};

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: <Gamepad2 size={20} />,
    title: "Pick Your Zone",
    desc: "Choose from Main Lounge, VIP, or VR",
  },
  {
    step: 2,
    icon: <CalendarDays size={20} />,
    title: "Book Online",
    desc: "Select your game, date, and time slot",
  },
  {
    step: 3,
    icon: <Zap size={20} />,
    title: "Walk In & Play",
    desc: "Show up, grab a controller, and game on",
  },
];

export function ZoneSelector({ selected, onSelect }: ZoneSelectorProps) {
  const [picked, setPicked] = useState<string | null>(selected);

  return (
    <div>
      {/* Page intro */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-cyan/20 bg-cyan/5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          <span className="text-xs font-ui font-semibold text-cyan uppercase tracking-widest">
            Book a Session
          </span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-text mb-3">
          CHOOSE YOUR ZONE
        </h1>
        <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: "#C4C4CC" }}>
          Three zones, one mission — game at the highest level.
          Pick your arena and lock in your session.
        </p>
      </div>

      {/* How It Works */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="grid grid-cols-3 gap-3">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.step}
              className="bg-surface-alt border border-border rounded-xl px-3 py-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-cyan/15 text-cyan text-[10px] font-bold flex items-center justify-center">
                  {item.step}
                </span>
                <span className="text-cyan">{item.icon}</span>
              </div>
              <h4 className="text-xs font-bold font-heading text-text mb-1">
                {item.title}
              </h4>
              <p className="text-[11px] leading-snug text-text-muted">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Operating Hours */}
      <div className="flex items-center justify-center gap-1.5 mb-10">
        <Clock size={12} className="text-text-muted" />
        <span className="text-xs text-text-muted">
          Open Mon&ndash;Sat {BRAND.hours.weekday} &middot; Sun {BRAND.hours.sunday}
        </span>
      </div>

      {/* Zone Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {ZONES.map((zone) => {
          const isPicked = picked === zone.id;
          const details = ZONE_DETAILS[zone.id];
          const icon = ZONE_ICONS[zone.id];

          return (
            <Card
              key={zone.id}
              onClick={() => setPicked(zone.id)}
              className={cn(
                "text-center group relative !p-0 overflow-hidden",
                isPicked &&
                  "border-cyan bg-cyan/5 shadow-[0_0_25px_rgba(0,240,255,0.12)]"
              )}
            >
              {/* VIP badge */}
              {zone.id === "vip" && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge color="gold" size="sm">
                    Premium
                  </Badge>
                </div>
              )}

              {/* Photo header — falls back to gradient + icon if /public/zones/{id}.jpg is missing */}
              <ZoneHeader
                src={zone.image}
                gradient={zone.gradient}
                alt={zone.name}
                isPicked={isPicked}
              >
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center transition-colors backdrop-blur-md bg-base/40 border border-white/10",
                    isPicked
                      ? "text-cyan"
                      : "text-white group-hover:text-cyan",
                  )}
                >
                  {icon}
                </div>
              </ZoneHeader>

              <div className="p-6 pt-5">

              <h3 className="text-lg font-bold font-heading tracking-tight text-text mb-1">
                {zone.name}
              </h3>

              <div className="flex items-center justify-center gap-2 mb-3">
                <Badge color="cyan" size="sm">
                  {zone.console}
                </Badge>
                <Badge color="gold" size="sm">
                  {zone.capacity} {zone.capacity === 1 ? "player" : "players"}
                </Badge>
              </div>

              <p className="text-sm text-text-muted leading-relaxed mb-4">
                {zone.desc}
              </p>

              {/* Pricing */}
              {details && (
                <div className="text-lg font-bold font-heading text-cyan mb-4">
                  From {details.from}
                </div>
              )}

              {/* What's included */}
              {details && (
                <div className="border-t border-border pt-4 space-y-2">
                  {details.includes.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-xs text-text-muted"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-green flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              )}

              {isPicked && (
                <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-cyan">
                  Selected
                </div>
              )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Next 7 days at a glance — actual booking-load per zone */}
      <ZoneAvailability className="mt-10" />

      {/* Continue Button */}
      <div className="flex justify-center mt-8">
        <Button
          variant="primary"
          size="lg"
          disabled={!picked}
          onClick={() => picked && onSelect(picked)}
        >
          Continue
          <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}

/**
 * Photo header for a zone card. If the configured /public/zones/{id}.jpg
 * is missing, the <img> hides itself onError and the gradient + icon block
 * underneath is what shows. So pre-photos this still looks intentional;
 * post-photos it just becomes a real image.
 */
function ZoneHeader({
  src,
  gradient,
  alt,
  isPicked,
  children,
}: {
  src: string;
  gradient: string;
  alt: string;
  isPicked: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative h-28 sm:h-32 w-full overflow-hidden bg-gradient-to-br",
        gradient,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover opacity-90"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity",
          isPicked ? "bg-base/30" : "bg-base/15 group-hover:bg-base/25",
        )}
      >
        {children}
      </div>
    </div>
  );
}
