import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PhoneMockup } from "@/components/preview/phone-mockup";

/**
 * The close. One promise, one action, and the product itself in a real
 * device rather than an abstract illustration.
 */
export function BetaClose() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6 md:py-28">
        <div>
          <p className="font-heading text-xs tracking-[0.35em] text-text-muted">CLOSED BETA</p>
          <h2 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-text md:text-5xl">
            Be first through the door.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-text-muted">
            We are opening CGE to a small first wave: real tournaments, real listings, real
            bookings, and a direct line to the people building it. Testers keep their accounts,
            history and head start when we open to everyone.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/beta"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan px-6 py-3 text-sm font-semibold text-base transition-colors hover:bg-[#33F3FF]"
            >
              Join the beta waitlist
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/esports" className="text-sm font-semibold text-text-muted transition-colors hover:text-text">
              Browse first, sign in later
            </Link>
          </div>
        </div>

        <div className="hidden justify-center md:flex">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}
