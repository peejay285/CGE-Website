import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PhoneMockup } from "./phone-mockup";
import { TrustTicks } from "./trust-ticks";

/**
 * Shared hero for preview variants A ("Bolt discipline") and C ("Light
 * rhythm"): flat dark background, one subtle radial tint, sentence-case
 * headline with a single cyan accent line, and the phone mockup as the prop.
 */
export function PreviewHero() {
  return (
    <section className="relative overflow-hidden bg-base">
      {/* The one permitted tint — very subtle cyan radial, top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_72%_18%,rgba(0,240,255,0.07),transparent_70%)]"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 py-24 md:grid-cols-[1.15fr_0.85fr] md:gap-10 md:px-6 md:py-32">
        {/* Copy */}
        <div className="max-w-xl">
          <h1 className="font-sans text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-text">
            Game more.
            <br />
            <span className="text-cyan">Get paid for real.</span>
          </h1>

          <p className="mt-6 max-w-md text-base md:text-lg leading-relaxed text-text-muted">
            Book a session, enter a tournament, swap your gear &mdash; built in
            Bonny Island for gamers across Nigeria.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/beta"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan px-7 py-3 text-sm font-semibold text-base transition-all duration-200 hover:bg-[#33F3FF] hover:shadow-[0_4px_24px_rgba(0,240,255,0.25)]"
            >
              Join the beta
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/lounge"
              className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3 text-sm font-semibold text-text transition-colors duration-200 hover:border-cyan/40 hover:text-cyan"
            >
              Book a session
            </Link>
          </div>

          <TrustTicks className="mt-9" />
        </div>

        {/* Phone prop */}
        <div className="flex justify-center md:justify-end md:pr-6">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
