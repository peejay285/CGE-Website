import { Hero } from "@/components/home/hero";
import { StatsBar } from "@/components/home/stats-bar";
import { LivePreview } from "@/components/home/live-preview";
import { Pillars } from "@/components/home/pillars";
import { HowItWorks } from "@/components/home/how-it-works";
import { ZoneComparison } from "@/components/home/zone-comparison";
import { PricingGrid } from "@/components/home/pricing-grid";
import { Testimonials } from "@/components/home/testimonials";
import { SectionTitle } from "@/components/ui/section-title";

export default function Home() {
  return (
    <>
      {/* 1. Hero - brand statement + web platform CTAs */}
      <Hero />

      {/* 2. Stats bar — social proof with animated counters */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 -mt-4 relative z-20">
        <StatsBar />
      </section>

      {/* 3. Live preview — real tournaments, posts, listings (auto-hides if empty) */}
      <LivePreview />

      {/* 4. Four pillars — esports, marketplace, community, lounge */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20">
        <SectionTitle
          eyebrow="The Platform"
          title="FOUR WAYS TO PLAY"
          subtitle="Compete in tournaments, trade gear, connect with gamers nationwide, or game in person at the lounge."
          align="center"
        />
        <div className="mt-12">
          <Pillars />
        </div>
      </section>

      {/* 5. How It Works — 3 steps */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20 border-t border-border/50">
        <SectionTitle
          eyebrow="Get Started"
          title="THREE STEPS TO GAME ON"
          subtitle="From discovery to your first tournament, listing, post, or lounge session in minutes."
          align="center"
        />
        <div className="mt-12">
          <HowItWorks />
        </div>
      </section>

      {/* 6. Lounge — zones + pricing (the physical venue) */}
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

      {/* 7. Event highlights — real social proof */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-20 border-t border-border/50">
        <SectionTitle
          eyebrow="Event Highlights"
          title="MOMENTS FROM OUR EVENTS"
          subtitle="Real tournaments, real prizes — straight from the CGE lounge floor."
          align="center"
        />
        <div className="mt-8">
          <Testimonials />
        </div>
      </section>
    </>
  );
}
