"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ZONES, PRICING, BRAND } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { Gamepad2, Crown, Glasses, CalendarDays, Zap, Clock, ArrowRight, Check } from "lucide-react";
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

// Real lounge photography per zone; unmapped ids fall back to zone.image
const ZONE_PHOTOS: Record<string, string> = {
  main: "/images/lounge/stations-detail.webp",
  vip: "/images/lounge/dual-screen-crowd.webp",
  vr: "/images/lounge/vr-aiming.webp",
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
      "6 gaming stations",
    ],
  },
  vip: {
    from: formatPrice(PRICING.vipLounge[0].price) + "/hr",
    includes: [
      "PS5 console access",
      "Premium controllers",
      "Private room, 1 ticket",
    ],
  },
  vr: {
    from: formatPrice(PRICING.vr[0].price) + "/session",
    includes: [
      "VR headset provided",
      "15 min per session",
      "Up to 2 players",
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

// Live open/closed status helpers for useSyncExternalStore: the clock isn't
// subscribable, so subscribe is a no-op; the server (and hydration pass)
// snapshot is null, and the client snapshot reads the real time — SSR-safe
// without any setState-in-effect.
const subscribeToNothing = () => () => {};
const getServerOpenNow = () => null;
function isLoungeOpenNow(): boolean {
  const now = new Date();
  const startHour = now.getDay() === 0 ? 13 : 10; // Sun 1 PM, else 10 AM
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= startHour * 60 && mins < 21 * 60; // closes 9 PM
}

export function ZoneSelector({ selected, onSelect }: ZoneSelectorProps) {
  const [picked, setPicked] = useState<string | null>(selected);

  const openNow = useSyncExternalStore<boolean | null>(
    subscribeToNothing,
    isLoungeOpenNow,
    getServerOpenNow
  );

  const pickedZone = picked ? ZONES.find((z) => z.id === picked) : null;

  return (
    <div className={cn(picked && "pb-24")}>
      {/* Page intro — real lounge photo with heading overlaid */}
      <div className="relative h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden mb-8">
        <Image
          src="/images/lounge/lounge-interior-hero.webp"
          alt="Inside the CGE gaming lounge"
          fill
          priority
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/55 to-base/10" />
        <div className="absolute inset-x-0 bottom-0 text-center px-4 pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-cyan/20 bg-cyan/5 backdrop-blur-sm">
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

      {/* Operating Hours — with live status */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10">
        {openNow !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              openNow
                ? "border-green/30 bg-green/10 text-green"
                : "border-border bg-surface-alt text-text-muted"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                openNow ? "bg-green animate-pulse" : "bg-text-muted"
              )}
            />
            {openNow ? "Open now" : "Closed now"}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
          <Clock size={12} className="text-text-muted" />
          Mon&ndash;Sat {BRAND.hours.weekday} &middot; Sun {BRAND.hours.sunday}
        </span>
      </div>

      {/* Zone Cards — behaves like a radio group for keyboard/AT users */}
      <div
        role="radiogroup"
        aria-label="Choose a zone"
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto"
      >
        {ZONES.map((zone, zoneIndex) => {
          const isPicked = picked === zone.id;
          const details = ZONE_DETAILS[zone.id];
          const icon = ZONE_ICONS[zone.id];

          return (
            <Card
              key={zone.id}
              onClick={() => setPicked(zone.id)}
              role="radio"
              aria-checked={isPicked}
              aria-label={zone.name}
              // Roving tabindex: the picked zone (or the first zone before any
              // pick) is the group's single tab stop, like native radios.
              tabIndex={isPicked || (!picked && zone.id === ZONES[0].id) ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPicked(zone.id);
                } else if (
                  e.key === "ArrowRight" ||
                  e.key === "ArrowDown" ||
                  e.key === "ArrowLeft" ||
                  e.key === "ArrowUp"
                ) {
                  e.preventDefault();
                  const delta =
                    e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
                  const nextIndex =
                    (zoneIndex + delta + ZONES.length) % ZONES.length;
                  setPicked(ZONES[nextIndex].id);
                  // Arrow keys move selection AND focus, like native radios.
                  const group = e.currentTarget.parentElement;
                  (group?.children[nextIndex] as HTMLElement | undefined)?.focus();
                }
              }}
              className={cn(
                "text-center group relative !p-0 overflow-hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60",
                isPicked &&
                  "border-cyan bg-cyan/5 shadow-[0_0_25px_rgba(0,240,255,0.12)]"
              )}
            >
              {/* Zone badges */}
              {zone.id === "vip" && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge color="gold" size="sm">
                    Premium
                  </Badge>
                </div>
              )}
              {zone.id === "main" && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge color="cyan" size="sm">
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Selected check chip */}
              {isPicked && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-cyan px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-base shadow-[0_0_12px_rgba(0,240,255,0.5)]">
                  <Check size={11} strokeWidth={3} />
                  Selected
                </div>
              )}

              {/* Photo header — falls back to gradient + icon if /public/zones/{id}.jpg is missing */}
              <ZoneHeader
                src={ZONE_PHOTOS[zone.id] ?? zone.image}
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

              <p className="text-xs italic text-text-muted mb-2">
                {zone.tagline}
              </p>

              <div className="flex items-center justify-center gap-2 mb-3">
                <Badge color="cyan" size="sm">
                  {zone.console}
                </Badge>
                <Badge color="gold" size="sm">
                  {zone.capacityLabel}
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

      {/* Floating selection bar — your pick follows you to the CTA.
          Sits above the mobile bottom nav (bottom-16) and flush on desktop. */}
      {picked && pickedZone && (
        <div className="fixed inset-x-0 bottom-16 lg:bottom-0 z-40 animate-slideUp pointer-events-none">
          <div className="mx-auto max-w-4xl px-4 pb-3 lg:pb-4">
            <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-cyan/30 bg-surface/95 backdrop-blur-xl px-4 py-3 shadow-[0_-4px_30px_rgba(0,240,255,0.15)]">
              <div className="min-w-0">
                <p className="text-sm font-bold font-heading text-text truncate">
                  {pickedZone.name}
                </p>
                {ZONE_DETAILS[picked] && (
                  <p className="text-xs text-cyan">
                    From {ZONE_DETAILS[picked].from}
                  </p>
                )}
              </div>
              <Button variant="primary" onClick={() => onSelect(picked)}>
                Continue
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
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
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, 33vw"
        className="object-cover opacity-90"
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
