/**
 * Two parallel paths, three plain steps each. Numbers instead of icons,
 * sentences instead of slogans.
 */
const PATHS = [
  {
    key: "arena",
    label: "ARENA",
    accent: "text-cyan",
    rule: "border-cyan/40",
    title: "From sign-up to prize money",
    steps: [
      {
        title: "Register and pay the entry through Paystack",
        body: "Entry fees are held on the platform, not sent to a stranger's account.",
      },
      {
        title: "Play your bracket",
        body: "Report the result, your opponent confirms it. Disputes go to the host.",
      },
      {
        title: "Prize paid to your bank",
        body: "Placements are confirmed, CGE approves the payout, Paystack transfers it.",
      },
    ],
  },
  {
    key: "market",
    label: "MARKET",
    accent: "text-gold",
    rule: "border-gold/40",
    title: "From listing to hand-over",
    steps: [
      {
        title: "List your gear in two minutes",
        body: "Sell it, swap it, or both. Say what you'd take in exchange.",
      },
      {
        title: "Agree the deal in chat",
        body: "Propose a swap, add a cash top-up if the values don't match.",
      },
      {
        title: "Meet at the lounge, or pay through Paystack",
        body: "Swap at the Lounge is the safe exchange point: staff present, no strangers' addresses.",
      },
    ],
  },
];

export function HowItWorksDoors() {
  return (
    <section className="border-t border-border bg-surface/40">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-20 md:grid-cols-2 md:gap-8 md:px-6 md:py-28">
        {PATHS.map((path) => (
          <div key={path.key}>
            <p className={`font-heading text-xs tracking-[0.35em] ${path.accent}`}>{path.label}</p>
            <h3 className="mt-3 font-sans text-2xl font-semibold tracking-tight text-text md:text-3xl">
              {path.title}
            </h3>
            <ol className="mt-8 space-y-6">
              {path.steps.map((step, i) => (
                <li key={step.title} className={`border-l pl-5 ${path.rule}`}>
                  <p className="text-[11px] tracking-[0.2em] text-text-muted">0{i + 1}</p>
                  <p className="mt-1 text-base font-semibold text-text">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
