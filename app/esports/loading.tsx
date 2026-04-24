export default function EsportsLoading() {
  return (
    <div className="min-h-screen bg-base px-4 pt-20">
      <div className="mx-auto max-w-7xl">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-surface-alt" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-surface-alt" />
        </div>

        {/* Tab bar skeleton */}
        <div className="mb-6 flex gap-1 rounded-xl bg-surface p-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-9 flex-1 animate-pulse rounded-lg bg-surface-alt"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        {/* Tournament cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-border bg-surface p-4"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="h-5 w-32 rounded bg-surface-alt" />
                <div className="h-5 w-16 rounded-full bg-surface-alt" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-surface-alt" />
                <div className="h-4 w-40 rounded bg-surface-alt" />
                <div className="h-3 w-full rounded bg-surface-alt" />
              </div>
              <div className="mt-4 h-10 w-full rounded-lg bg-surface-alt" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
