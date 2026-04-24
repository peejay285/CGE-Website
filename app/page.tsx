import { Hero } from "@/components/home/hero";
import { StatsBar } from "@/components/home/stats-bar";
import { EsportsShowcase, MarketplaceShowcase, CommunityShowcase } from "@/components/home/feature-showcase";
import { HowItWorks } from "@/components/home/how-it-works";
import { ZoneComparison } from "@/components/home/zone-comparison";
import { PricingGrid } from "@/components/home/pricing-grid";
import { Testimonials } from "@/components/home/testimonials";
import { AppDownloadCta } from "@/components/home/app-download-cta";
import { SectionTitle } from "@/components/ui/section-title";

export default function Home() {
  return (
    <>
      {/* 1. Hero — brand statement + app download CTA */}
      <Hero />

      {/* 2. Stats bar — social proof with animated counters */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 -mt-4 relative z-20">
        <StatsBar />
      </section>

      {/* 3. Esports showcase — tournament system preview */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <EsportsShowcase />
      </section>

      {/* 4. Marketplace showcase — buy/sell/swap preview */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20 border-t border-border/50">
        <MarketplaceShowcase />
      </section>

      {/* 5. Community showcase — social features preview */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20 border-t border-border/50">
        <CommunityShowcase />
      </section>

      {/* 6. How It Works — 3 steps */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20 border-t border-border/50">
        <SectionTitle
          eyebrow="Get Started"
          title="THREE STEPS TO GAME ON"
          subtitle="From download to your first tournament in minutes."
          align="center"
        />
        <div className="mt-12">
          <HowItWorks />
        </div>
      </section>

      {/* 7. Lounge — zones + pricing (the physical venue) */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20 border-t border-border/50">
        <SectionTitle
          eyebrow="The Lounge"
          title="GAME IN PERSON"
          subtitle="Visit our gaming lounge — PS4, PS5, and VR zones with transparent pricing."
          align="center"
        />
        <div className="mt-8">
          <ZoneComparison />
        </div>
        <div className="mt-12">
          <PricingGrid />
        </div>
      </section>

      {/* 8. Testimonials — social proof */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20 border-t border-border/50">
        <SectionTitle
          eyebrow="The People"
          title="WHAT GAMERS SAY"
          subtitle="From the lounge to the leaderboard to the marketplace."
          align="center"
        />
        <div className="mt-8">
          <Testimonials />
        </div>
      </section>

      {/* 9. App download CTA — final conversion */}
      <section id="download" className="max-w-7xl mx-auto px-4 md:px-6 py-20 border-t border-border/50">
        <AppDownloadCta />
      </section>
    </>
  );
}
