import { EVENT_PRIZES_AWARDED_NAIRA, formatNairaCompact } from "@/lib/constants";

/**
 * Three facts, set large. No icons, no cards: numbers that are true
 * carry themselves.
 */
const FACTS = [
  {
    value: formatNairaCompact(EVENT_PRIZES_AWARDED_NAIRA),
    label: "paid out in prizes at CGE events, in cash",
  },
  {
    value: "4+",
    label: "tournaments hosted in person on Bonny Island",
  },
  {
    value: "6 · 1 · 1",
    label: "PS4 stations, a private PS5 room and a VR zone at the lounge",
  },
];

export function ProofNumbers() {
  return (
    <section className="border-y border-border bg-base">
      <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {FACTS.map((fact) => (
          <div key={fact.label} className="px-4 py-10 md:px-8 md:py-14">
            <p className="font-sans text-5xl font-semibold tracking-tight text-text md:text-6xl">
              {fact.value}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-muted">{fact.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
