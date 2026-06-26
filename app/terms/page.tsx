import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/ui/section-title";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for CGE (Creative Gaming Entertainment) — bookings, payments, tournaments, marketplace, and community rules.",
};

const LAST_UPDATED = "June 10, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-base px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <SectionTitle
          eyebrow="Legal"
          title="Terms of Service"
          subtitle={`Last updated: ${LAST_UPDATED}`}
        />

        <div className="space-y-10 text-sm leading-relaxed text-text-muted [&_h2]:text-text [&_h2]:font-bold [&_h2]:text-base [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-text">
          <section>
            <h2>1. Who we are</h2>
            <p>
              These terms govern your use of the CGE platform and the CGE Lounge,
              operated by Creative Gaming Entertainment (&quot;CGE&quot;, &quot;we&quot;,
              &quot;us&quot;), Bonny Island, Rivers State, Nigeria. By creating an
              account, booking a session, registering for a tournament, or using the
              marketplace or community, you agree to these terms.
            </p>
          </section>

          <section>
            <h2>2. Accounts & eligibility</h2>
            <ul>
              <li>You must provide accurate information when creating an account.</li>
              <li>
                Lounge age policy: ages 10+ may visit with a guardian; ages 16+ may
                visit and book solo. We may request ID at the venue.
              </li>
              <li>
                You are responsible for activity on your account. Keep your password
                safe and tell us immediately if you suspect unauthorized access.
              </li>
              <li>
                We may suspend or close accounts that break these terms, abuse other
                members, or attempt to defraud the platform.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. Lounge bookings & payments</h2>
            <ul>
              <li>
                Bookings can be paid online via Paystack or reserved for payment at
                the venue. Prices shown at checkout are in Nigerian Naira (₦) and are
                computed by our servers — the amount you authorize with Paystack is
                the amount charged.
              </li>
              <li>
                <strong>Cancellations:</strong> cancel up to 2 hours before your
                session for a full refund. Late cancellations and no-shows are
                non-refundable. Venue reservations can be cancelled anytime before
                arrival.
              </li>
              <li>
                Pay-at-venue reservations are held for your booked time slot. If you
                do not arrive within a reasonable time, the slot may be released.
              </li>
              <li>
                Refunds, where due, are returned to the original payment method via
                Paystack and may take several business days to reflect.
              </li>
              <li>
                Giveaway vouchers are single-use, non-transferable, tied to the
                winning account and a specific zone, and expire on the date shown.
                Vouchers have no cash value.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Esports & tournaments</h2>
            <ul>
              <li>
                Entry fees, where charged, are stated before registration. If a
                tournament is cancelled by the organizer or CGE, entry fees are
                refunded.
              </li>
              <li>
                Prize payouts are made to the verified payout account on the winner&apos;s
                profile after results are confirmed. We may withhold payouts where we
                reasonably suspect cheating, account sharing, or fraud.
              </li>
              <li>
                Match results, dispute decisions, and admin rulings are final.
              </li>
              <li>
                Community-hosted tournaments are run by their organizers. Treat
                unverified organizers with the same caution you would any stranger —
                CGE is not a party to side arrangements made outside the platform.
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Marketplace & swaps</h2>
            <ul>
              <li>
                The CGE Marketplace connects buyers, sellers, and swappers. Unless a
                listing explicitly uses CGE Swap Assist, <strong>trades are made
                directly between members at their own risk</strong> — CGE does not
                hold items or funds and is not a party to the transaction.
              </li>
              <li>
                Meet in public places for in-person trades; the CGE Lounge is a safe
                meetup point on Bonny Island. Inspect items before paying.
              </li>
              <li>
                Listings must be accurate, lawful, and yours to sell. Counterfeit,
                stolen, or prohibited items will be removed and may lead to a ban.
              </li>
              <li>
                CGE Swap Assist, where offered, is a paid facilitation service with
                its own fee shown before you commit.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Community rules</h2>
            <ul>
              <li>No harassment, hate speech, threats, or doxxing.</li>
              <li>No spam, scams, or deceptive content.</li>
              <li>No sexually explicit content; keep content appropriate for a 13+ audience.</li>
              <li>
                We may remove content and restrict accounts that break these rules.
                Repeated or severe violations result in permanent bans.
              </li>
            </ul>
          </section>

          <section>
            <h2>7. Liability</h2>
            <p>
              We provide the platform &quot;as is&quot;. To the maximum extent
              permitted by Nigerian law, CGE is not liable for indirect or
              consequential losses, for member-to-member transactions made outside
              CGE-facilitated flows, or for events beyond our reasonable control.
              Nothing in these terms limits liability that cannot be limited by law.
            </p>
          </section>

          <section>
            <h2>8. Changes</h2>
            <p>
              We may update these terms as the platform evolves. Material changes
              will be announced on the platform. Continuing to use CGE after changes
              take effect means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2>9. Contact</h2>
            <p>
              Questions about these terms: email{" "}
              <a href={`mailto:${BRAND.email}`} className="text-cyan hover:underline">
                {BRAND.email}
              </a>{" "}
              or message us on{" "}
              <a
                href={BRAND.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="text-cyan hover:underline"
              >
                WhatsApp
              </a>
              . See also our{" "}
              <Link href="/privacy" className="text-cyan hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
