import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Flag,
  Gamepad2,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  Users,
} from "lucide-react";
import { PreviewHero } from "@/components/preview/preview-hero";
import { PhotoBand } from "@/components/preview/photo-band";
import { VariantSwitcher } from "@/components/preview/variant-switcher";
import { EVENT_PRIZES_AWARDED_NAIRA, formatNairaCompact } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Preview C — CGE",
  robots: { index: false, follow: false },
};

const STEPS = [
  {
    number: "01",
    title: "Create your account",
    description:
      "One free profile for everything — lounge bookings, tournaments, swaps, and the community feed.",
  },
  {
    number: "02",
    title: "Pick your game",
    description:
      "Book a station, enter a tournament, or put your gear up for a swap. Whatever your play is.",
  },
  {
    number: "03",
    title: "Get paid for real",
    description:
      "Tournament winnings and marketplace deals settle through Paystack-protected payments.",
  },
];

const PILLARS = [
  {
    icon: Gamepad2,
    title: "Gaming lounge",
    description: "Walk in, pick up a controller, game on — PS4, PS5, and VR.",
    href: "/lounge",
    cta: "Book a session",
  },
  {
    icon: Trophy,
    title: "Esports",
    description: "Weekly tournaments with real cash prizes, online and live.",
    href: "/esports",
    cta: "View tournaments",
  },
  {
    icon: ShoppingBag,
    title: "Marketplace",
    description: "Buy, sell, and swap gaming gear with verified sellers.",
    href: "/marketplace",
    cta: "Browse listings",
  },
  {
    icon: Users,
    title: "Community",
    description: "A real-time feed to find your squad across Nigeria.",
    href: "/community",
    cta: "Join the community",
  },
];

const TRUST_CARDS = [
  {
    icon: ShieldCheck,
    title: "Verified players",
    description:
      "Every account has a real profile and reputation, so you always know who you're competing or trading with.",
  },
  {
    icon: Lock,
    title: "Paystack-protected payments",
    description:
      "Entries, bookings, and marketplace deals run through Paystack — not hand-to-hand transfers to strangers.",
  },
  {
    icon: Flag,
    title: "Report & block built in",
    description:
      "Reporting and blocking are part of the platform, backed by a real team at a real venue on Bonny Island.",
  },
];

export default function PreviewHomeC() {
  return (
    <div className="bg-base">
      {/* Dark: shared hero (same component as variant A) */}
      <PreviewHero />

      {/* Light: how it works */}
      <section className="bg-[#f7f8f9] text-[#16181d]">
        <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              How it works
            </h2>
            <p className="mt-3 text-base text-[#5d6b7a]">
              Three steps from signing up to your first session, match, or
              swap.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-[#e4e7ea] bg-white p-7 shadow-[0_1px_3px_rgba(22,24,29,0.05)]"
              >
                <span className="text-sm font-semibold text-[#0a8fa0]">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[#16181d]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5d6b7a]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark: four pillars, all-cyan accent */}
      <section className="bg-base">
        <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text">
              Four ways to play
            </h2>
            <p className="mt-3 text-base text-text-muted">
              One platform for the lounge, tournaments, gear, and your crew.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <Link
                key={pillar.title}
                href={pillar.href}
                className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/40"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                  <pillar.icon size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-text">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {pillar.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan">
                  {pillar.cta}
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Light: trust layers + the big prize stat */}
      <section className="bg-[#f7f8f9] text-[#16181d]">
        <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="text-center">
            <p className="text-5xl md:text-6xl font-semibold tracking-tight text-[#16181d]">
              {formatNairaCompact(EVENT_PRIZES_AWARDED_NAIRA)}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-base text-[#5d6b7a]">
              paid out in prizes at real CGE events — and counting.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {TRUST_CARDS.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl border border-[#e4e7ea] bg-white p-7 shadow-[0_1px_3px_rgba(22,24,29,0.05)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0a8fa0]/10 text-[#0a8fa0]">
                  <card.icon size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[#16181d]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5d6b7a]">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark: real-photo band (shared with variant A) */}
      <PhotoBand />

      {/* Light: final beta CTA */}
      <section className="bg-[#f7f8f9]">
        <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
          <div className="rounded-3xl border border-[#e4e7ea] bg-white px-6 py-16 text-center shadow-[0_1px_3px_rgba(22,24,29,0.05)] md:px-10 md:py-20">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#16181d]">
              Be first through the door.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-[#5d6b7a]">
              We&apos;re opening CGE to a small first wave. Join the beta
              waitlist.
            </p>
            <Link
              href="/beta"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#0a8fa0] px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#0ca4b8] hover:shadow-[0_4px_20px_rgba(10,143,160,0.3)]"
            >
              Join the beta waitlist
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <VariantSwitcher />
    </div>
  );
}
