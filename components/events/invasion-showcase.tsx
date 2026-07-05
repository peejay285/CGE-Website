import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { InvasionReel } from "./invasion-reel";

/**
 * Invasion Tournament event-brand showcase.
 *
 * Static brand content (no hooks, no data fetching) rendered at the top of
 * the /events page, above the DB-driven lounge/community events listing.
 * Note: the video lives under /public/Videos (capital V) — the src below
 * matches the on-disk casing so it resolves on case-sensitive hosting.
 */

const TITLE_CARDS: {
  title: string;
  pool: string;
  image: string;
  alt: string;
  format?: string;
  breakdown?: { place: string; prize: string }[];
}[] = [
  {
    title: "EA FC 26",
    pool: "₦800,000 pool",
    image: "/images/invasion/fc26-flyer.webp",
    alt: "EA FC 26 tournament flyer — Invasion Tournament",
    format: "1v1 & 2v2 knockout",
    breakdown: [
      { place: "1st", prize: "₦500K" },
      { place: "2nd", prize: "₦200K" },
      { place: "3rd", prize: "₦100K" },
    ],
  },
  {
    title: "Mortal Kombat 1",
    pool: "₦100,000 pool",
    image: "/images/invasion/mk-flyer.webp",
    alt: "Mortal Kombat 1 tournament flyer — Invasion Tournament",
  },
  {
    title: "Call of Duty Mobile",
    pool: "₦100,000 pool",
    image: "/images/invasion/codm-flyer.webp",
    alt: "Call of Duty Mobile tournament flyer — Invasion Tournament",
  },
];

const META_CHIPS = [
  { label: "₦1M+ in prize pools", color: "gold" as const },
  { label: "3 titles", color: "cyan" as const },
  { label: "Live at Bonny Island", color: "magenta" as const },
];

// Mirrors the Button primitive's md-size link styling (base + variant + size,
// in that order, exactly as components/ui/button.tsx composes them).
const buttonBase =
  "inline-flex items-center justify-center gap-2 font-semibold font-sans uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5 active:translate-y-0";
const buttonSizeMd = "px-6 py-2.5 text-[13px]";

export function InvasionShowcase({ className }: { className?: string }) {
  return (
    <section aria-label="Invasion Tournament showcase" className={cn("space-y-10", className)}>
      {/* ── a. Brand hero band — live drone sweep of the venue behind ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <video
          aria-hidden
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/invasion/drone-stage.webp"
          className="absolute inset-0 h-full w-full object-cover opacity-25 pointer-events-none"
        >
          <source src="/Videos/events/invasion-drone-loop.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-base/85 via-base/60 to-base/85 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 via-transparent to-magenta/10 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-center gap-6 p-6 md:p-8">
          <div className="relative w-28 h-28 md:w-36 md:h-36 shrink-0 rounded-2xl overflow-hidden border border-cyan/25 shadow-[0_0_40px_rgba(0,240,255,0.18)]">
            <Image
              src="/images/invasion/logo-white.webp"
              alt="Invasion Tournament logo"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 112px, 144px"
              priority
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan mb-2">
              Forging New Legacies
            </p>
            <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-text">
              CGE INVASION TOURNAMENT
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Our flagship live esports event — Bonny Island&apos;s biggest gaming stage.
            </p>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
              {META_CHIPS.map((chip) => (
                <Badge key={chip.label} color={chip.color}>
                  {chip.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── b. Last-edition recap ──────────────────────────────────── */}
      <div>
        <div className="mb-5">
          <h3 className="font-heading text-lg md:text-xl font-bold tracking-tight text-text">
            DECEMBER 2025 — IBANISE HALL
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Last edition · 29th December 2025 · Abalamabie, Bonny Island
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          {/* The aftermovie — real footage, front and center */}
          <InvasionReel />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {TITLE_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-border bg-surface overflow-hidden transition-all duration-300 hover:border-cyan/30"
            >
              <div className="relative aspect-[3/4] w-full">
                <Image
                  src={card.image}
                  alt={card.alt}
                  fill
                  loading="lazy"
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 350px"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-heading text-sm font-bold text-text">{card.title}</h4>
                  <Badge color="gold">{card.pool}</Badge>
                </div>
                {card.format && (
                  <p className="mt-1.5 text-xs text-text-muted">{card.format}</p>
                )}
                {card.breakdown && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {card.breakdown.map((row) => (
                      <div
                        key={row.place}
                        className="rounded-lg border border-border bg-surface-alt px-2 py-1.5 text-center"
                      >
                        <p className="text-[10px] uppercase tracking-wider text-text-muted">
                          {row.place}
                        </p>
                        <p className="text-xs font-semibold text-text">{row.prize}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Real moments from the floor */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              src: "/images/invasion/reel-champion.webp",
              alt: "Mortal Kombat grand winner holding the prize cheque and trophy at Invasion 2025",
              caption: "The MK grand winner",
            },
            {
              src: "/images/invasion/reel-station.webp",
              alt: "Player competing at a branded station during Invasion 2025",
              caption: "Locked in",
            },
            {
              src: "/images/invasion/reel-award.webp",
              alt: "Winner congratulated on stage at Invasion 2025",
              caption: "Podium moments",
            },
            {
              src: "/images/invasion/reel-fan.webp",
              alt: "Smiling attendee in an Invasion Tournament shirt",
              caption: "The Invasion faithful",
            },
          ].map((photo) => (
            <figure key={photo.src} className="group">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-border">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  loading="lazy"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </div>
              <figcaption className="mt-1.5 text-[11px] text-text-muted text-center">
                {photo.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* ── c + d. Promo video & Warfare Series returning ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Promo video block */}
        <figure className="min-w-0">
          <video
            className="w-full rounded-xl border border-border bg-surface"
            controls
            muted
            playsInline
            preload="none"
            poster="/images/invasion/warfare-flyer.webp"
          >
            <source src="/Videos/events/warfare-promo.mp4" type="video/mp4" />
          </video>
          <figcaption className="mt-2 text-xs text-text-muted">
            CGE Warfare Series — aftermovie
          </figcaption>
        </figure>

        {/* Warfare Series returning card */}
        <div className="rounded-xl border border-cyan/40 bg-gradient-to-b from-cyan/5 to-transparent bg-surface p-5">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="relative w-full sm:w-36 shrink-0 aspect-[3/4] rounded-lg overflow-hidden border border-border">
              <Image
                src="/images/invasion/warfare-prizes.webp"
                alt="CGE Warfare Series prize breakdown"
                fill
                loading="lazy"
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 144px"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-base font-bold text-text">
                  CGE WARFARE SERIES
                </h3>
                <Badge color="green">Returning soon</Badge>
              </div>
              <p className="mt-2 text-sm text-text-muted">
                Online · Free Fire + Call of Duty Mobile · ₦200K last pool
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Next edition date to be announced — announcements land in the community hub.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/community"
                  className={cn(
                    buttonBase,
                    "bg-gradient-to-br from-cyan to-[#00C8D4] text-base hover:from-[#33F3FF] hover:to-cyan hover:shadow-[0_4px_20px_rgba(0,240,255,0.3)]",
                    buttonSizeMd
                  )}
                >
                  Get notified
                </Link>
                <a
                  href="https://instagram.com/invasiontournament"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-cyan hover:text-text transition-colors underline-offset-4 hover:underline"
                >
                  Follow @invasiontournament
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── e. Sponsor strip ───────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-surface-alt/50 p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Backed by
          </span>
          <span className="inline-flex items-center bg-white/90 rounded px-4 py-2">
            <Image
              src="/images/invasion/sponsor-jumbo.webp"
              alt="Jumbo Capital"
              width={112}
              height={36}
              loading="lazy"
              className="h-7 w-auto object-contain"
            />
          </span>
          <Badge color="neutral" size="md">
            GameEvo Esports
          </Badge>
          <Badge color="neutral" size="md">
            Technoville
          </Badge>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Media: Bonny Island Magazine · Kristina Reports
        </p>
      </div>

      {/* ── f. CTA row ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/esports"
          className={cn(
            buttonBase,
            "bg-gradient-to-br from-magenta to-[#D41860] text-white hover:from-[#FF5A96] hover:to-magenta hover:shadow-[0_4px_20px_rgba(255,45,120,0.3)]",
            buttonSizeMd
          )}
        >
          See open tournaments
        </Link>
        <span className="text-xs text-text-muted">
          Compete online year-round on the CGE esports platform.
        </span>
      </div>
    </section>
  );
}
