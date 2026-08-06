import type { Metadata } from "next";
import {
  Gamepad2,
  MessageCircle,
  Bug,
  Medal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";
import { JoinBetaCta } from "@/components/beta/join-beta-cta";

export const metadata: Metadata = {
  title: "Join the Beta",
  description:
    "CGE is in closed beta. Apply to join the first wave of testers on Nigeria's gaming platform — esports tournaments, a swap-first marketplace, community, and lounge booking.",
};

const PERKS = [
  {
    icon: <Gamepad2 size={20} />,
    title: "First access",
    line: "Tournaments, the marketplace, and lounge booking before anyone else.",
    color: "text-cyan bg-cyan/10",
  },
  {
    icon: <MessageCircle size={20} />,
    title: "Direct line to the builders",
    line: "Talk to the team on WhatsApp — your feedback lands straight with us.",
    color: "text-green bg-green/10",
  },
  {
    icon: <Bug size={20} />,
    title: "Your bugs shape the platform",
    line: "Every issue you find gets fixed for the whole country's launch.",
    color: "text-magenta bg-magenta/10",
  },
  {
    icon: <Medal size={20} />,
    title: "First in line at launch",
    line: "Beta testers keep their accounts, history, and head start when we open up.",
    color: "text-gold bg-gold/10",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Create your account",
    line: "Sign up with email or Google — it takes a minute.",
  },
  {
    step: "2",
    title: "You're on the waitlist",
    line: "Your account is registered and in line for the next wave.",
  },
  {
    step: "3",
    title: "We approve testers in waves",
    line: "Watch WhatsApp — we'll message you when your spot opens.",
  },
];

export default function BetaPage() {
  return (
    <>
      {/* Hero band */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan/5 via-magenta/5 to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-20 pb-12 md:pt-28 md:pb-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan mb-3">
            Closed Beta
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading tracking-tight text-text mb-4">
            JOIN THE <span className="text-gradient">CGE</span> BETA
          </h1>
          <p className="text-sm md:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
            We&apos;re hand-picking the first wave of testers for Nigeria&apos;s
            gaming platform &mdash; esports tournaments, a swap-first marketplace, a
            nationwide community, and lounge booking on Bonny Island. Get in
            early and help us build it right.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-20 space-y-12">
        {/* What testers get */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PERKS.map((perk) => (
              <div
                key={perk.title}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${perk.color}`}
                >
                  {perk.icon}
                </div>
                <h3 className="font-heading text-base font-bold text-text tracking-wide mb-1">
                  {perk.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {perk.line}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section>
          <Card className="p-6 md:p-8">
            <h2 className="font-heading text-lg font-bold text-text tracking-wide mb-6 text-center">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {STEPS.map((s) => (
                <div key={s.step} className="text-center">
                  <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-cyan/15 border border-cyan/30 text-sm font-bold text-cyan">
                    {s.step}
                  </div>
                  <p className="text-sm font-semibold text-text mb-1">{s.title}</p>
                  <p className="text-xs text-text-muted leading-relaxed">{s.line}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <JoinBetaCta />
              <a
                href={BRAND.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-green hover:text-green/80 transition-colors"
              >
                Questions? Message us on WhatsApp
              </a>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
