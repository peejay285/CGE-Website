export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-base px-4 pt-20">
      <div className="mx-auto max-w-4xl">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-surface-alt" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-alt" />
        </div>

        {/* Topic bar skeleton */}
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-surface-alt"
              style={{ animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Post feed skeleton */}
          <div className="space-y-4">
            {/* Create post placeholder */}
            <div className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />

            {/* Post cards */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border bg-surface p-4"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-surface-alt" />
                  <div className="space-y-1">
                    <div className="h-4 w-28 rounded bg-surface-alt" />
                    <div className="h-3 w-20 rounded bg-surface-alt" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-surface-alt" />
                  <div className="h-4 w-4/5 rounded bg-surface-alt" />
                  <div className="h-4 w-2/3 rounded bg-surface-alt" />
                </div>
                <div className="mt-4 flex gap-4">
                  <div className="h-8 w-16 rounded bg-surface-alt" />
                  <div className="h-8 w-16 rounded bg-surface-alt" />
                  <div className="h-8 w-16 rounded bg-surface-alt" />
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar skeleton (desktop) */}
          <div className="hidden space-y-4 lg:block">
            <div className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
            <div className="h-36 animate-pulse rounded-2xl border border-border bg-surface" />
          </div>
        </div>
      </div>
    </div>
  );
}
