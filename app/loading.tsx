export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan" />
      </div>
      <p className="mt-4 text-sm text-text-muted animate-pulse">Loading...</p>
    </div>
  );
}
