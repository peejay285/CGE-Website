import type { Metadata } from "next";
import { TwoDoorsHero } from "@/components/landing/two-doors-hero";
import { ProofNumbers } from "@/components/landing/proof-numbers";
import { InvasionEssay } from "@/components/landing/invasion-essay";
import { HowItWorksDoors } from "@/components/landing/how-it-works-doors";
import { LoungeDoor } from "@/components/landing/lounge-door";
import { FounderNote } from "@/components/landing/founder-note";
import { BetaClose } from "@/components/landing/beta-close";
import { VariantSwitcher } from "@/components/preview/variant-switcher";
import { getLandingData } from "@/lib/landing-data";

export const metadata: Metadata = {
  title: "Preview — Two Doors landing | CGE",
  robots: { index: false, follow: false },
};

// Live ticker and hero cards read public data; cache the page for a
// minute so the landing stays fast and the numbers stay honest.
export const revalidate = 60;

/**
 * "Two Doors, told like a broadcast, ending like a story."
 * The choice between Arena and Market is the page. Real photographs,
 * real numbers, real data. No emoji, no glow, no template.
 */
export default async function LandingPreview() {
  const { tournament, listing } = await getLandingData();

  return (
    <div className="bg-base">
      <TwoDoorsHero tournament={tournament} listing={listing} />
      <ProofNumbers />
      <InvasionEssay />
      <HowItWorksDoors />
      <LoungeDoor />
      <FounderNote />
      <BetaClose />
      <VariantSwitcher />
    </div>
  );
}
