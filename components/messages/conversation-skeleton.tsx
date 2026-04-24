"use client";

export function ConversationSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-surface-alt shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 bg-surface-alt rounded" />
            <div className="h-3 w-2/3 bg-surface-alt rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
