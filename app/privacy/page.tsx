import type { Metadata } from "next";
import Link from "next/link";
import { SectionTitle } from "@/components/ui/section-title";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How CGE (Creative Gaming Entertainment) collects, uses, and protects your personal data, in line with the Nigeria Data Protection Act (NDPA).",
};

const LAST_UPDATED = "June 10, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-base px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <SectionTitle
          eyebrow="Legal"
          title="Privacy Policy"
          subtitle={`Last updated: ${LAST_UPDATED}`}
        />

        <div className="space-y-10 text-sm leading-relaxed text-text-muted [&_h2]:text-text [&_h2]:font-bold [&_h2]:text-base [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-text">
          <section>
            <h2>1. Overview</h2>
            <p>
              This policy explains what personal data Creative Gaming Entertainment
              (&quot;CGE&quot;) collects, why, and your rights — in line with the
              Nigeria Data Protection Act 2023 (NDPA). It applies to the CGE website
              and the CGE Lounge on Bonny Island.
            </p>
          </section>

          <section>
            <h2>2. What we collect</h2>
            <ul>
              <li>
                <strong>Account data:</strong> name, email, phone number, gamertag,
                avatar, and optional location (state/city) you provide.
              </li>
              <li>
                <strong>Bookings & payments:</strong> booking details and payment
                references. <strong>Card details are processed by Paystack</strong> —
                we never see or store your full card number.
              </li>
              <li>
                <strong>Esports payouts:</strong> bank account name, bank, and last 4
                digits of your account number (the full number is held by Paystack as
                a transfer recipient).
              </li>
              <li>
                <strong>ID verification (optional):</strong> if you apply for a
                verified badge, the ID document you upload is stored in a private
                bucket and reviewed by our admins.
              </li>
              <li>
                <strong>Content you post:</strong> listings, posts, comments, and
                messages on the platform.
              </li>
              <li>
                <strong>Technical data:</strong> IP address and basic device info used
                for security and rate limiting.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. How we use it</h2>
            <ul>
              <li>To run bookings, tournaments, payouts, the marketplace, and community features.</li>
              <li>To process payments and prevent fraud and abuse.</li>
              <li>To contact you about your bookings, vouchers, or account (including via SMS/WhatsApp where you provide a phone number).</li>
              <li>To moderate content and keep the community safe.</li>
              <li>We do <strong>not</strong> sell your personal data.</li>
            </ul>
          </section>

          <section>
            <h2>4. Who we share it with</h2>
            <ul>
              <li>
                <strong>Paystack</strong> — payment processing and prize transfers.
              </li>
              <li>
                <strong>Supabase</strong> — our database, authentication, and file
                storage provider.
              </li>
              <li>
                <strong>SMS/notification providers</strong> — to deliver booking
                confirmations where applicable.
              </li>
              <li>
                Other members see your public profile (name, gamertag, avatar,
                listings, posts). Your phone number is only shared where you choose
                to share it (e.g. WhatsApp contact on a trade).
              </li>
              <li>Authorities, where Nigerian law requires it.</li>
            </ul>
          </section>

          <section>
            <h2>5. Retention & security</h2>
            <ul>
              <li>
                We keep account data while your account is active. Booking and
                payment records are kept as required for accounting and dispute
                resolution.
              </li>
              <li>
                ID verification documents are retained only as long as needed to
                review your application and maintain the verified status.
              </li>
              <li>
                Data is protected with encryption in transit, row-level security in
                our database, and access controls on admin functions.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Your rights (NDPA)</h2>
            <p>
              You can request access to, correction of, or deletion of your personal
              data, withdraw consent, or object to certain processing. To exercise
              any of these rights, contact us — we respond within 30 days. You can
              also lodge a complaint with the Nigeria Data Protection Commission
              (NDPC).
            </p>
          </section>

          <section>
            <h2>7. Children</h2>
            <p>
              The platform is intended for users aged 13 and above. Lounge visitors
              aged 10–15 must be accompanied by a guardian, and accounts for online
              features should be created by users 13+. If you believe a child has
              created an account, contact us and we will remove it.
            </p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>
              Data questions or requests: email{" "}
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
              <Link href="/terms" className="text-cyan hover:underline">
                Terms of Service
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
