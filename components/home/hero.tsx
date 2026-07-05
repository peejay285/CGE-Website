import Link from "next/link";
import Image from "next/image";
import { Gamepad2, Trophy, ShoppingBag, Users, ArrowRight } from "lucide-react";
import { GameShowcase } from "./game-showcase";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-base">
        {/* Real lounge silhouettes, faint — humanity behind the message */}
        <Image
          src="/images/lounge/lounge-silhouettes.webp"
          alt=""
          aria-hidden
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-[0.16]"
        />
        {/* Invasion venue drone sweep — desktop only, phones keep the photo */}
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

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 md:px-6 text-center pt-12 pb-6 sm:pt-20 sm:pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Eyebrow */}
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

          <p className="text-text-muted text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Book a gaming session, join a tournament, or swap your gear — all
            in one place.
          </p>

          {/* Four pillars */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-4 mb-8">
            <Link
              href="/esports"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-transparent text-xs font-ui font-medium uppercase tracking-wider text-text-muted/70 transition-colors duration-200 hover:text-magenta hover:border-magenta/30 hover:bg-magenta/5 active:bg-magenta/10"
            >
              <Trophy size={14} className="text-magenta" /> Esports
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-transparent text-xs font-ui font-medium uppercase tracking-wider text-text-muted/70 transition-colors duration-200 hover:text-cyan hover:border-cyan/30 hover:bg-cyan/5 active:bg-cyan/10"
            >
              <ShoppingBag size={14} className="text-cyan" /> Marketplace
            </Link>
            <Link
              href="/community"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-transparent text-xs font-ui font-medium uppercase tracking-wider text-text-muted/70 transition-colors duration-200 hover:text-green hover:border-green/30 hover:bg-green/5 active:bg-green/10"
            >
              <Users size={14} className="text-green" /> Community
            </Link>
            <Link
              href="/lounge"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-transparent text-xs font-ui font-medium uppercase tracking-wider text-text-muted/70 transition-colors duration-200 hover:text-gold hover:border-gold/30 hover:bg-gold/5 active:bg-gold/10"
            >
              <Gamepad2 size={14} className="text-gold" /> Lounge
            </Link>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
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

          {/* Swap hook */}
          <Link
            href="/marketplace"
            className="group inline-flex items-center gap-2 mb-4 rounded-full border border-magenta/25 bg-magenta/5 px-4 py-2 text-xs text-magenta/90 transition-all duration-200 hover:border-magenta/50 hover:bg-magenta/10 hover:text-magenta"
          >
            <ShoppingBag size={13} className="shrink-0" />
            <span>
              Nigeria&apos;s first swap-first marketplace &mdash; trade your
              PS4 for a PS5
            </span>
            <ArrowRight
              size={13}
              className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>

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
