import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LoungeStatus } from "./lounge-status";
import { EVENT_PRIZES_AWARDED_NAIRA, formatNairaCompact } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { LandingListing, LandingTournament } from "@/lib/landing-data";

/**
 * The landing hero. The choice between the two sides of CGE IS the page:
 * Arena on the left, Market on the right, each standing on a photograph
 * taken at a CGE event, each carrying one real piece of live data.
 * On desktop the door you point at opens wider; on phones they stack.
 *
 * Above them, a ticker of live facts. Nothing on this strip is decorative
 * copy: every item is either real platform data or a real number.
 */

function shortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

function TickerItem({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">{label}</span>
      <span className={accent ? "text-sm font-semibold text-text" : "text-sm text-text"}>{value}</span>
    </span>
  );
}

export function TwoDoorsHero({
  tournament,
  listing,
}: {
  tournament: LandingTournament | null;
  listing: LandingListing | null;
}) {
  const slotsLeft = tournament ? Math.max(0, tournament.slots - (tournament.filled ?? 0)) : 0;

  return (
    <section className="relative">
      {/* Live ticker */}
      <div className="border-b border-border bg-base">
        <div className="mx-auto flex max-w-7xl items-center gap-8 overflow-x-auto px-4 py-3 scrollbar-hide md:px-6">
          <TickerItem label="Lounge" value={<LoungeStatus />} />
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <TickerItem
            label="Next tournament"
            value={tournament ? `${tournament.title} · ${shortDate(tournament.date)}` : "Announced with the beta cohort"}
          />
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <TickerItem
            label="Latest listing"
            value={listing ? `${listing.title} · ${formatPrice(listing.price)}` : "First listings arrive with the beta"}
          />
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
          <TickerItem label="Paid out at CGE events" value={formatNairaCompact(EVENT_PRIZES_AWARDED_NAIRA)} accent />
        </div>
      </div>

      {/* The two doors */}
      <div className="flex flex-col md:h-[calc(100svh-7.5rem)] md:min-h-[600px] md:max-h-[820px] md:flex-row">
        {/* ARENA */}
        <Link
          href="/esports"
          className="group relative flex flex-1 basis-1/2 flex-col justify-end overflow-hidden transition-[flex-basis] duration-700 ease-[cubic-bezier(.22,1,.36,1)] md:hover:basis-[60%] md:focus-visible:basis-[60%]"
        >
          <Image
            src="/images/invasion/inv25-center-stage.webp"
            alt="The Invasion 2025 grand final stage on Bonny Island"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-base via-base/70 to-base/10" />
          <div className="absolute inset-y-0 right-0 hidden w-px bg-border md:block" />

          <div className="relative p-6 pb-10 sm:p-10 md:pb-14">
            <p className="font-heading text-xs tracking-[0.35em] text-cyan">ARENA</p>
            <h1 className="mt-3 max-w-md font-sans text-4xl font-semibold leading-[1.05] tracking-tight text-text sm:text-5xl">
              Compete for real money.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
              Open brackets in FC 26, Call of Duty Mobile and Mortal Kombat.
              Entry through Paystack, prizes paid to your bank.
            </p>

            {/* One real card */}
            <div className="mt-6 max-w-sm rounded-lg border border-cyan/25 bg-base/80 p-4 backdrop-blur-sm">
              {tournament ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{tournament.title}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {tournament.game} · {shortDate(tournament.date)} · {tournament.time}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-cyan">
                      {slotsLeft > 0 ? `${slotsLeft} slots left` : "Full"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    Entry {tournament.entry_fee > 0 ? formatPrice(tournament.entry_fee) : "free"} · Prize {tournament.prize}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-text">Next open tournament</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    The first brackets open with the beta cohort. Join the waitlist and you will hear first.
                  </p>
                </>
              )}
            </div>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan">
              Enter the Arena
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>
        </Link>

        {/* MARKET */}
        <Link
          href="/marketplace"
          className="group relative flex flex-1 basis-1/2 flex-col justify-end overflow-hidden transition-[flex-basis] duration-700 ease-[cubic-bezier(.22,1,.36,1)] md:hover:basis-[60%] md:focus-visible:basis-[60%]"
        >
          <Image
            src="/images/lounge/stations-detail.webp"
            alt="Consoles and controllers at the CGE Lounge"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-base via-base/70 to-base/10" />

          <div className="relative p-6 pb-10 sm:p-10 md:pb-14">
            <p className="font-heading text-xs tracking-[0.35em] text-gold">MARKET</p>
            <h2 className="mt-3 max-w-md font-sans text-4xl font-semibold leading-[1.05] tracking-tight text-text sm:text-5xl">
              Trade gear with people you can actually meet.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
              Swap your PS4 for a PS5, sell a controller, find a headset.
              Deals in chat, exchanges at the lounge.
            </p>

            <div className="mt-6 max-w-sm rounded-lg border border-gold/25 bg-base/80 p-4 backdrop-blur-sm">
              {listing ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{listing.title}</p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {listing.category}
                        {listing.location ? ` · ${listing.location}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-gold">{formatPrice(listing.price)}</span>
                  </div>
                  <p className="mt-3 text-xs text-text-muted">
                    {listing.listing_type === "swap"
                      ? "Open to swaps"
                      : listing.listing_type === "sell_or_swap"
                        ? "Sell or swap"
                        : "For sale"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-text">Latest listing</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    The first gear goes up with the beta cohort. List early and be first in the feed.
                  </p>
                </>
              )}
            </div>

            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold">
              Open the Market
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
