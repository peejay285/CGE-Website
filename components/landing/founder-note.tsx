import Image from "next/image";

/**
 * A real face and a true story. Black-and-white portrait, the founder's
 * own words, set like a magazine pull-quote rather than a testimonial card.
 */
export function FounderNote() {
  return (
    <section className="border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-20 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-16 md:px-6 md:py-28">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-sm overflow-hidden bg-surface grayscale">
          <Image
            src="/images/founder/asolia.webp"
            alt="Asolia Jumbo, founder of CGE"
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-cover"
          />
        </div>

        <div>
          <p className="font-heading text-xs tracking-[0.35em] text-text-muted">FROM THE FOUNDER</p>
          <blockquote className="mt-5 font-sans text-xl font-medium leading-relaxed tracking-tight text-text md:text-2xl">
            Growing up, we were told gaming was for miscreants, for people who would never
            amount to anything. We opened a lounge on Bonny Island to prove it could simply be
            fun. Then we asked ourselves: if Nigeria can raise football athletes, why not esports
            athletes? That question became Invasion. Our first champion took home ₦50,000. The
            last prize pool was ₦1,000,000. Now we&apos;re building the whole ecosystem around
            Nigerian gamers.
          </blockquote>
          <p className="mt-6 text-sm text-text">
            <span className="font-semibold">Asolia Jumbo</span>
            <span className="text-text-muted"> · Founder, CGE</span>
          </p>
        </div>
      </div>
    </section>
  );
}
