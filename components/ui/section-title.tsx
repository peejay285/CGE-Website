import { cn } from "@/lib/utils";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** Heading element — defaults to h2. Pass "h1" for the page-primary title
      so every page exposes exactly one H1. */
  as?: "h1" | "h2" | "h3";
}

export function SectionTitle({ eyebrow, title, subtitle, align = "left", as: Heading = "h2" }: SectionTitleProps) {
  return (
    <div className={cn("mb-10", align === "center" && "text-center")}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan mb-3">
          {eyebrow}
        </p>
      )}
      <Heading className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-text">
        {title}
      </Heading>
      {subtitle && (
        <p className={cn("mt-2 text-sm text-text-muted max-w-xl", align === "center" && "mx-auto")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
