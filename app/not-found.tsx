import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-base px-4 text-center">
      {/* Large 404 in gradient */}
      <h1 className="text-gradient font-heading text-[8rem] font-black leading-none sm:text-[10rem] md:text-[12rem]">
        404
      </h1>

      {/* Heading */}
      <h2 className="mt-4 font-heading text-2xl font-bold text-text sm:text-3xl">
        Page Not Found
      </h2>

      {/* Subtitle */}
      <p className="mt-3 max-w-md text-sm text-text-muted sm:text-base">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      {/* Back to Home button */}
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-cyan to-[#00C8D4] px-8 py-3 text-[13px] font-semibold uppercase tracking-wider text-base transition-all duration-300 hover:-translate-y-0.5 hover:from-[#33F3FF] hover:to-cyan hover:shadow-[0_4px_20px_rgba(0,240,255,0.3)] active:translate-y-0"
      >
        Back to Home
      </Link>

      {/* Decorative dot grid */}
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />
    </div>
  );
}
