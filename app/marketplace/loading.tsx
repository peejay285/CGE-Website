export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen bg-base px-4 pt-20">
      <div className="mx-auto max-w-7xl">
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-alt" />
          <div className="h-10 w-28 animate-pulse rounded-lg bg-surface-alt" />
        </div>

        {/* Search bar skeleton */}
        <div className="mb-6 h-12 w-full animate-pulse rounded-xl bg-surface-alt" />

        {/* Category bar skeleton */}
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-surface-alt"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-border bg-surface"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="aspect-square rounded-t-2xl bg-surface-alt" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 rounded bg-surface-alt" />
                <div className="h-3 w-1/2 rounded bg-surface-alt" />
                <div className="h-5 w-20 rounded bg-surface-alt" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
