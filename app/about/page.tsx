import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Clock, Mail, Phone, Users, Trophy, Gamepad2, ShoppingBag, Instagram, Twitter, Youtube } from "lucide-react";
import { SectionTitle } from "@/components/ui/section-title";
import { Card } from "@/components/ui/card";
import { BRAND } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About CGE",
  description: "Learn about Creative Gaming Entertainment — Bonny Island's premier gaming lounge. Our mission, zones, contact info, and operating hours.",
};

const PILLARS = [
  {
    icon: <Gamepad2 className="h-8 w-8 text-cyan" />,
    emoji: "\u{1F3AE}",
    title: "Lounge",
    description: "Premium PS4, PS5 & VR gaming spaces",
    accent: "border-cyan/40 hover:border-cyan/60",
    glowColor: "hover:shadow-[0_4px_20px_rgba(0,240,255,0.15)]",
    href: "/lounge",
  },
  {
    icon: <Trophy className="h-8 w-8 text-magenta" />,
    emoji: "\u{1F3C6}",
    title: "Esports",
    description: "Competitive tournaments with real prizes",
    accent: "border-magenta/40 hover:border-magenta/60",
    glowColor: "hover:shadow-[0_4px_20px_rgba(255,45,120,0.15)]",
    href: "/esports",
  },
  {
    icon: <Users className="h-8 w-8 text-green" />,
    emoji: "\u{1F465}",
    title: "Community",
    description: "Connect with fellow gamers",
    accent: "border-green/40 hover:border-green/60",
    glowColor: "hover:shadow-[0_4px_20px_rgba(0,255,136,0.15)]",
    href: "/community",
  },
  {
    icon: <ShoppingBag className="h-8 w-8 text-gold" />,
    emoji: "\u{1F6D2}",
    title: "Marketplace",
    description: "Buy & sell gaming gear",
    accent: "border-gold/40 hover:border-gold/60",
    glowColor: "hover:shadow-[0_4px_20px_rgba(255,215,0,0.15)]",
    href: "/marketplace",
  },
] as const;

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://instagram.com/cge_lounge",
    icon: <Instagram className="h-5 w-5" />,
  },
  {
    label: "Twitter / X",
    href: "https://x.com/cge_lounge",
    icon: <Twitter className="h-5 w-5" />,
  },
  {
    label: "Discord",
    href: "https://discord.gg/cge-lounge",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@cge_lounge",
    icon: <Youtube className="h-5 w-5" />,
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-magenta/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.08),transparent_70%)]" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan mb-4">
            Who We Are
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-heading tracking-tight text-text mb-4">
            About CGE
          </h1>
          <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto">
            Powered by gamers, built for Nigeria
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <SectionTitle
          eyebrow="Why We Exist"
          title="Our Mission"
          align="center"
        />
        <p className="text-center text-base md:text-lg text-text-muted max-w-3xl mx-auto leading-relaxed">
          Building a four-pillar gaming ecosystem &mdash; Lounge, Esports,
          Community, and Marketplace &mdash; to give Nigerian gamers a
          world-class experience.
        </p>
      </section>

      {/* Four Pillars */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <SectionTitle
          eyebrow="The Ecosystem"
          title="Four Pillars"
          subtitle="Everything a gamer needs, under one roof."
          align="center"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((pillar) => (
            <Link key={pillar.title} href={pillar.href}>
              <Card
                className={`flex flex-col items-center text-center space-y-4 transition-all duration-300 cursor-pointer hover:-translate-y-1 ${pillar.accent} ${pillar.glowColor}`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-alt">
                  {pillar.icon}
                </div>
                <h3 className="text-lg font-bold font-heading tracking-tight text-text">
                  {pillar.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {pillar.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Info Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <SectionTitle
          eyebrow="Visit Us"
          title="Get In Touch"
          subtitle="Come experience gaming the CGE way."
          align="center"
        />
        <div className="max-w-xl mx-auto">
          <Card className="space-y-5">
            {/* Address */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                <MapPin className="h-5 w-5 text-cyan" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Address
                </p>
                <p className="text-sm font-semibold text-text mt-0.5">
                  {BRAND.address}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                <Phone className="h-5 w-5 text-cyan" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Phone
                </p>
                <a
                  href={`tel:${BRAND.phone}`}
                  className="text-sm font-semibold text-text mt-0.5 hover:text-cyan transition-colors"
                >
                  {BRAND.phone}
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                <Mail className="h-5 w-5 text-cyan" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Email
                </p>
                <a
                  href={`mailto:${BRAND.email}`}
                  className="text-sm font-semibold text-text mt-0.5 hover:text-cyan transition-colors"
                >
                  {BRAND.email}
                </a>
              </div>
            </div>

            {/* Weekday Hours */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                <Clock className="h-5 w-5 text-cyan" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Weekday Hours
                </p>
                <p className="text-sm font-semibold text-text mt-0.5">
                  {BRAND.hours.weekday}
                </p>
              </div>
            </div>

            {/* Saturday Hours */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                <Clock className="h-5 w-5 text-green" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Saturday Hours
                </p>
                <p className="text-sm font-semibold text-text mt-0.5">
                  {BRAND.hours.weekday}
                </p>
              </div>
            </div>

            {/* Sunday Hours */}
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                <Clock className="h-5 w-5 text-magenta" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Sunday Hours
                </p>
                <p className="text-sm font-semibold text-text mt-0.5">
                  {BRAND.hours.sunday}
                </p>
              </div>
            </div>

            {/* Age Policy */}
            <div className="flex items-start gap-4 border-t border-border pt-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                <Users className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Age Policy
                </p>
                <p className="text-sm font-semibold text-text mt-0.5">
                  {BRAND.agePolicy} — All gamers aged {BRAND.agePolicy} and
                  above are welcome
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Follow Us */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <SectionTitle
          eyebrow="Stay Connected"
          title="Follow Us"
          subtitle="Join the CGE community on social media."
          align="center"
        />
        <div className="flex justify-center gap-4">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow us on ${social.label}`}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-all duration-300 hover:text-cyan hover:border-cyan/40 hover:bg-cyan/10 hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,240,255,0.15)]"
            >
              {social.icon}
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
