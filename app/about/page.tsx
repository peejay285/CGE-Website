import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Gamepad2,
  Trophy,
  ShoppingBag,
  Users,
  MapPin,
  Clock,
  Mail,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/ui/section-title";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About CGE",
  description:
    "Creative Gaming Entertainment (CGE) is Nigeria's all-in-one gaming platform — esports tournaments with real cash prizes, a swap-first marketplace, a gamer community, and a PS4, PS5 & VR gaming lounge on Bonny Island.",
};

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  BRAND.address
)}`;

const PILLARS = [
  {
    icon: <Gamepad2 size={22} />,
    title: "Gaming Lounge",
    line: "Walk in. Pick up a controller. Game on — PS4, PS5 & VR zones.",
    href: "/lounge",
    cta: "Book a Session",
    color: "cyan" as const,
  },
  {
    icon: <Trophy size={22} />,
    title: "Esports",
    line: "Prove you're the best. Tournaments with real cash prizes.",
    href: "/esports",
    cta: "View Tournaments",
    color: "magenta" as const,
  },
  {
    icon: <ShoppingBag size={22} />,
    title: "Marketplace",
    line: "Buy, sell & swap gaming gear with verified gamers.",
    href: "/marketplace",
    cta: "Browse Listings",
    color: "cyan" as const,
  },
  {
    icon: <Users size={22} />,
    title: "Community",
    line: "Your crew. Your voice. Your space — find your squad.",
    href: "/community",
    cta: "Join the Community",
    color: "magenta" as const,
  },
];

const pillarColors = {
  cyan: {
    iconBg: "bg-cyan/10",
    iconText: "text-cyan",
    border: "hover:border-cyan/40",
    cta: "text-cyan",
  },
  magenta: {
    iconBg: "bg-magenta/10",
    iconText: "text-magenta",
    border: "hover:border-magenta/40",
    cta: "text-magenta",
  },
};

export default function AboutPage() {
  return (
    <>
      {/* 1. Header band — real lounge photo backdrop */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <Image
            src="/images/lounge/lounge-brand-door.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-base/70 via-base/85 to-base" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-24 pb-16 md:pt-32 md:pb-20 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading tracking-tight text-text mb-4">
            ABOUT <span className="text-gradient">CGE</span>
          </h1>
          <p className="text-sm md:text-lg text-text-muted">
            Creative Gaming Entertainment &mdash; Bonny Island, Nigeria
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-20 space-y-20">
        {/* 2. Story block */}
        <section>
          <SectionTitle eyebrow="Our Story" title="Built by gamers, for gamers" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
            <div className="space-y-4 text-sm md:text-base text-text-muted leading-relaxed">
              <p>
                CGE started with a simple idea: Nigerian gamers deserve one home
                &mdash; somewhere to play, compete, trade and belong. Built by
                gamers in Bonny Island, we opened our doors as a gaming lounge
                and grew into an all-in-one platform: esports tournaments with
                real cash prizes, a swap-first marketplace, and a community that
                shows up for every bracket.
              </p>
              <p>
                We&apos;re web-first and built for the realities of Nigerian
                gamers &mdash; no heavy downloads, no barriers. Whether
                you&apos;re booking a PS5 session at the lounge, chasing a
                tournament bracket from Lagos, or swapping a controller with
                someone across the country, CGE is where it happens.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border">
                <Image
                  src="/images/lounge/squad-session.webp"
                  alt="A squad mid-session at the CGE lounge"
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 50vw, 320px"
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border mt-6">
                <Image
                  src="/images/lounge/community-smiles.webp"
                  alt="Gamers sharing a laugh at the CGE lounge"
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 50vw, 320px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. What we do — four pillars */}
        <section>
          <SectionTitle
            eyebrow="The Ecosystem"
            title="What we do"
            subtitle="Everything a gamer needs, under one roof."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PILLARS.map((pillar) => {
              const c = pillarColors[pillar.color];
              return (
                <Link
                  key={pillar.title}
                  href={pillar.href}
                  className={cn(
                    "group rounded-xl border border-border bg-surface p-5 transition-all duration-300",
                    "hover:-translate-y-1 hover:shadow-lg",
                    c.border
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                      c.iconBg,
                      c.iconText
                    )}
                  >
                    {pillar.icon}
                  </div>
                  <h3 className="font-heading text-base font-bold text-text tracking-wide mb-1">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed mb-3">
                    {pillar.line}
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center text-xs font-semibold",
                      c.cta
                    )}
                  >
                    {pillar.cta}
                    <span className="ml-1 transition-transform duration-300 group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. Events strip */}
        <section>
          <Card className="overflow-hidden md:flex md:items-center md:gap-8 p-6 md:p-8">
            <div className="relative h-20 w-48 shrink-0 mx-auto md:mx-0 mb-5 md:mb-0">
              <Image
                src="/images/invasion/logo-white.webp"
                alt="CGE Invasion Tournament logo"
                fill
                loading="lazy"
                sizes="192px"
                className="object-contain"
              />
            </div>
            <div className="text-center md:text-left">
              <h2 className="font-heading text-lg font-bold text-text tracking-wide mb-2">
                Live &amp; Online Events
              </h2>
              <p className="text-sm text-text-muted leading-relaxed mb-4">
                The <span className="text-text font-semibold">Invasion Tournament</span>{" "}
                is our flagship live event &mdash; the Dec 2025 edition put over
                &#8358;1M in prize pools on the line across FC 26, Mortal Kombat 1
                and CODM at Ibanise Hall &mdash; while the{" "}
                <span className="text-text font-semibold">CGE Warfare Series</span>{" "}
                takes the fight online with Free Fire and CODM.
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan hover:text-text transition-colors"
              >
                See our events
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </Card>
        </section>

        {/* 5. Visit us */}
        <section>
          <SectionTitle
            eyebrow="Visit Us"
            title="Come game with us"
            subtitle="The CGE Lounge is open seven days a week on Bonny Island."
          />
          <Card className="p-6 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Address
                  </p>
                  <p className="text-sm text-text">{BRAND.address}</p>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-cyan hover:text-text transition-colors"
                  >
                    Get directions
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-magenta/10 text-magenta">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Hours
                  </p>
                  <p className="text-sm text-text">
                    Mon&ndash;Sat: {BRAND.hours.weekday}
                  </p>
                  <p className="text-sm text-text">
                    Sunday: {BRAND.hours.sunday}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                    WhatsApp
                  </p>
                  <a
                    href={BRAND.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-text hover:text-cyan transition-colors"
                  >
                    Chat with us
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-magenta/10 text-magenta">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
                    Email
                  </p>
                  <a
                    href={`mailto:${BRAND.email}`}
                    className="text-sm text-text hover:text-cyan transition-colors break-all"
                  >
                    {BRAND.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6 flex justify-center sm:justify-start">
              <Link href="/lounge">
                <Button>Book a Session</Button>
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
