import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flag, Lock, ShieldCheck } from "lucide-react";
import { GameShowcase } from "@/components/home/game-showcase";
import { PreviewHero } from "@/components/preview/preview-hero";
import { PhotoBand } from "@/components/preview/photo-band";
import { VariantSwitcher } from "@/components/preview/variant-switcher";
import { EVENT_PRIZES_AWARDED_NAIRA, formatNairaCompact } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Preview A — CGE",
  robots: { index: false, follow: false },
};

const STATS = [
  { value: formatNairaCompact(EVENT_PRIZES_AWARDED_NAIRA), label: "prizes at real events" },
  { value: "4", label: "ways to play" },
  { value: "Bonny Island", label: "flagship lounge" },
  { value: "Nationwide", label: "online tournaments & swaps" },
];

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

export default function PreviewHomeA() {
  return (
    <div className="bg-base">
      <PreviewHero />

      {/* Game title carousel — kept from the current site; photo tiles read
          as content, not decoration, so they fit the single-accent rule */}
      <section className="relative py-10">
        <p className="mb-4 px-4 text-center text-xs font-semibold uppercase tracking-[0.3em] text-text-muted/60">
          What we play
        </p>
        <GameShowcase />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-base to-transparent" />
      </section>

      {/* Naked stats — big numbers, air, no cards */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-4xl font-semibold tracking-tight text-text">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
        <div className="max-w-xl">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text">
            How it works
          </h2>
          <p className="mt-3 text-base text-text-muted">
            Three steps from signing up to your first session, match, or swap.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-border bg-surface p-7"
            >
              <span className="text-sm font-semibold text-cyan">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-text">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Built on trust */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
        <div className="rounded-3xl border border-border bg-surface p-8 md:p-14">
          <div className="max-w-xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text">
              Built on trust
            </h2>
            <p className="mt-3 text-base text-text-muted">
              Real payments, real people, and a real venue behind every match
              and every swap.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {TRUST_CARDS.map((card) => (
              <div key={card.title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                  <card.icon size={22} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-text">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real-photo band */}
      <PhotoBand />

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
        <div className="rounded-3xl border border-cyan/25 bg-cyan/5 px-6 py-16 text-center md:px-10 md:py-20">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-text">
            Be first through the door.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-text-muted">
            We&apos;re opening CGE to a small first wave. Join the beta
            waitlist.
          </p>
          <Link
            href="/beta"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-cyan px-8 py-3.5 text-sm font-semibold text-base transition-all duration-200 hover:bg-[#33F3FF] hover:shadow-[0_4px_24px_rgba(0,240,255,0.25)]"
          >
            Join the beta waitlist
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <VariantSwitcher />
    </div>
  );
}
