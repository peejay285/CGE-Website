import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Trophy } from "lucide-react";
import { GameShowcase } from "@/components/home/game-showcase";
import { StatsBar } from "@/components/home/stats-bar";
import { Pillars } from "@/components/home/pillars";
import { HowItWorks } from "@/components/home/how-it-works";
import { ZoneComparison } from "@/components/home/zone-comparison";
import { LoungeLivePhoto } from "@/components/home/lounge-live-photo";
import { Testimonials } from "@/components/home/testimonials";
import { SectionTitle } from "@/components/ui/section-title";
import { VariantSwitcher } from "@/components/preview/variant-switcher";

export const metadata: Metadata = {
  title: "Preview B — CGE",
  robots: { index: false, follow: false },
};

/**
 * Decluttered take on the current hero: badge + headline + subcopy + two
 * CTAs only (no pillar chips, no swap hook), with ~1.5x vertical padding.
 */
function TightHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background effects — same identity as the live hero */}
      <div className="absolute inset-0 bg-base">
        <Image
          src="/images/lounge/lounge-silhouettes.webp"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-[0.16]"
        />
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/invasion/drone-stage.webp"
          className="hidden md:block absolute inset-0 h-full w-full object-cover opacity-[0.32]"
        >
          <source src="/Videos/events/invasion-drone-loop.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-base/60 via-base/25 to-base" />
        <div className="absolute inset-0 bg-gradient-to-r from-base via-transparent to-base" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-magenta/5 animate-gradientShift" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan/8 rounded-full blur-[75px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-magenta/8 rounded-full blur-[75px]" />
      </div>

      {/* Hero content — 1.5x the live hero's vertical padding */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 md:px-6 text-center pt-20 pb-10 sm:pt-32 sm:pb-14">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-cyan/20 bg-cyan/5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
            <span className="text-xs font-ui font-semibold text-cyan uppercase tracking-widest">
              Built in Nigeria &middot; Bonny Island
            </span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-text">THE GAMING</span>
            <br />
            <span className="text-text">PLATFORM FOR </span>
            <span className="text-gradient">AFRICA</span>
          </h1>

          <p className="text-text-muted text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Book a gaming session, join a tournament, or swap your gear &mdash;
            all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/lounge"
              className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-br from-cyan to-[#00C8D4] text-base hover:from-[#33F3FF] hover:to-cyan hover:shadow-[0_4px_20px_rgba(0,240,255,0.3)] px-8 py-3.5 text-[15px]"
            >
              Book a Session
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/esports"
              className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-transparent text-magenta border border-magenta/40 hover:bg-magenta/5 hover:shadow-[0_4px_20px_rgba(255,45,120,0.1)] px-8 py-3.5 text-[15px]"
            >
              <Trophy size={18} />
              Join Tournaments
            </Link>
          </div>
        </div>
      </div>

      {/* Game carousel */}
      <div className="relative z-10 pt-8 pb-10">
        <div className="text-center mb-4 px-4">
          <p className="text-xs font-ui font-semibold uppercase tracking-[0.3em] text-text-muted/60">
            What We Play
          </p>
        </div>
        <GameShowcase />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-base to-transparent pointer-events-none" />
      </div>
    </section>
  );
}

export default function PreviewHomeB() {
  return (
    <>
      <TightHero />

      {/* Stats bar */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-24">
        <StatsBar />
      </section>

      {/* Four pillars */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 border-t border-border/50">
        <SectionTitle
          eyebrow="The Platform"
          title="FOUR WAYS TO PLAY"
          subtitle="Compete in tournaments, trade gear, connect with gamers nationwide, or game in person at the lounge."
          align="center"
        />
        <div className="mt-14">
          <Pillars />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 border-t border-border/50">
        <SectionTitle
          eyebrow="Get Started"
          title="THREE STEPS TO GAME ON"
          subtitle="From discovery to your first tournament, listing, post, or lounge session in minutes."
          align="center"
        />
        <div className="mt-14">
          <HowItWorks />
        </div>
      </section>

      {/* The lounge */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 border-t border-border/50">
        <SectionTitle
          eyebrow="The Lounge"
          title="GAME IN PERSON"
          subtitle="Visit our gaming lounge — PS4, PS5, and VR zones with transparent pricing."
          align="center"
        />
        <LoungeLivePhoto />
        <div className="mt-12">
          <ZoneComparison />
        </div>
      </section>

      {/* Event highlights */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-24 border-t border-border/50">
        <SectionTitle
          eyebrow="Event Highlights"
          title="MOMENTS FROM OUR EVENTS"
          subtitle="Real tournaments, real prizes — straight from the CGE lounge floor."
          align="center"
        />
        <div className="mt-10">
          <Testimonials />
        </div>
      </section>

      <VariantSwitcher />
    </>
  );
}
