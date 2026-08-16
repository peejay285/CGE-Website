import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

/**
 * Full-width real-photo band shared by preview variants A and C:
 * one Invasion 2025 crowd shot, one factual caption, one link to /events.
 */
export function PhotoBand() {
  return (
    <section className="relative overflow-hidden bg-base">
      <div className="relative h-[340px] sm:h-[420px] md:h-[480px]">
        <Image
          src="/images/invasion/inv25-match-crowd.webp"
          alt="The crowd watching a match at CGE Invasion 2025 in Bonny Island"
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-base via-base/25 to-base/10"
        />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-4 pb-10 md:px-6 md:pb-12">
            <p className="max-w-2xl text-lg md:text-xl font-semibold tracking-tight text-text">
              Invasion 2025 &mdash; a &#8358;1,000,000 prize pool, live on
              Bonny Island.
            </p>
            <Link
              href="/events"
              className="group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan transition-colors hover:text-[#33F3FF]"
            >
              See our events
              <ArrowRight
                size={15}
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
