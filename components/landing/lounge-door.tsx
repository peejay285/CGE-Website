import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LoungeStatus } from "./lounge-status";
import { BRAND, ZONES } from "@/lib/constants";

/**
 * The third door is a real one: the CGE Lounge on Bonny Island.
 * Photograph of the actual door, the real address, live opening status.
 */
export function LoungeDoor() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-2">
        <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[560px]">
          <Image
            src="/images/lounge/lounge-brand-door.webp"
            alt="The entrance of the CGE Lounge on Bonny Island"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-center px-4 py-14 md:px-12 md:py-20">
          <p className="font-heading text-xs tracking-[0.35em] text-text-muted">THE LOUNGE</p>
          <h2 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-text md:text-5xl">
            The third door is a real one.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
            {BRAND.address}. {BRAND.hours.weekday} Monday to Saturday, {BRAND.hours.sunday} on
            Sundays. Walk in, or book a station before you leave the house.
          </p>

          <div className="mt-6">
            <LoungeStatus />
          </div>

          <ul className="mt-8 divide-y divide-border border-y border-border">
            {ZONES.map((zone) => (
              <li key={zone.id} className="flex items-baseline justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-text">{zone.name}</p>
                  <p className="text-xs text-text-muted">{zone.tagline}</p>
                </div>
                <p className="shrink-0 text-xs text-text-muted">
                  {zone.console} · {zone.capacityLabel}
                </p>
              </li>
            ))}
          </ul>

          <Link
            href="/lounge"
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-lg bg-cyan px-6 py-3 text-sm font-semibold text-base transition-colors hover:bg-[#33F3FF]"
          >
            Book a session
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
