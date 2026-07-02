import Link from "next/link";
import { BRAND } from "@/lib/constants";

export function CtaSection() {
  return (
    <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-cyan/5 rounded-full blur-[60px]" />
        <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] bg-magenta/5 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10 px-6 py-14 sm:px-12 sm:py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan mb-3">
          Ready to join?
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading tracking-tight text-text mb-4">
          Your next session is waiting
        </h2>
        <p className="text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: "#C4C4CC" }}>
          Book a gaming session, enter a tournament, buy, sell or swap gear,
          or just hang with the community. CGE is your home.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link
            href="/lounge"
            className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-br from-cyan to-[#00C8D4] text-base hover:from-[#33F3FF] hover:to-cyan hover:shadow-[0_4px_20px_rgba(0,240,255,0.3)] px-8 py-3.5 text-[15px]"
          >
            Book a Session
          </Link>
          <Link
            href="/esports"
            className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-transparent text-cyan border border-cyan/40 hover:bg-cyan/5 hover:shadow-[0_4px_20px_rgba(0,240,255,0.1)] px-8 py-3.5 text-[15px]"
          >
            View Tournaments
          </Link>
        </div>

        <a
          href={BRAND.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-text/60 hover:text-green transition-colors"
        >
          Or message us on WhatsApp →
        </a>
      </div>
    </div>
  );
}
