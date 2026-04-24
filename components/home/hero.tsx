import Link from "next/link";
import { Gamepad2, Trophy, ShoppingBag, Users, Download, ArrowRight } from "lucide-react";
import { GameShowcase } from "./game-showcase";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-base">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-magenta/5 animate-gradientShift" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-magenta/8 rounded-full blur-[150px]" />
      </div>
      <div className="absolute inset-0 dot-grid opacity-30" />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 md:px-6 text-center pt-12 pb-6 sm:pt-20 sm:pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-cyan/20 bg-cyan/5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
            <span className="text-xs font-ui font-semibold text-cyan uppercase tracking-widest">
              Africa&apos;s Gaming Platform
            </span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-text">THE GAMING</span>
            <br />
            <span className="text-text">ECOSYSTEM FOR </span>
            <span className="text-gradient">AFRICA</span>
          </h1>

          <p className="text-text-muted text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Compete in tournaments. Buy, sell & swap gear. Connect with gamers.
            Book sessions. All in one platform.
          </p>

          {/* Four pillars */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-ui font-medium uppercase tracking-wider text-text-muted/70">
              <Trophy size={14} className="text-magenta" /> Esports
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-ui font-medium uppercase tracking-wider text-text-muted/70">
              <ShoppingBag size={14} className="text-cyan" /> Marketplace
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-ui font-medium uppercase tracking-wider text-text-muted/70">
              <Users size={14} className="text-green" /> Community
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-ui font-medium uppercase tracking-wider text-text-muted/70">
              <Gamepad2 size={14} className="text-gold" /> Lounge
            </span>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <a
              href="#download"
              className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-gradient-to-br from-cyan to-[#00C8D4] text-base hover:from-[#33F3FF] hover:to-cyan hover:shadow-[0_4px_20px_rgba(0,240,255,0.3)] px-8 py-3.5 text-[15px]"
            >
              <Download size={18} />
              Download the App
            </a>
            <Link
              href="/lounge"
              className="inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-transparent text-cyan border border-cyan/40 hover:bg-cyan/5 hover:shadow-[0_4px_20px_rgba(0,240,255,0.1)] px-8 py-3.5 text-[15px]"
            >
              Book a Session
              <ArrowRight size={16} />
            </Link>
          </div>

          <p className="text-text-muted/40 text-xs tracking-wide">
            Available on iOS & Android — Free to download
          </p>
        </div>
      </div>

      {/* Game carousel */}
      <div className="relative z-10 pt-4 pb-8">
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
