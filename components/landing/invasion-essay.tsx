import Image from "next/image";

/**
 * Invasion 2025 as a photo essay. Asymmetric grid, square corners,
 * captions that are true. This is the section that proves CGE is a
 * place and an event, not a template.
 */
const PHOTOS = [
  {
    src: "/images/invasion/inv25-center-stage.webp",
    alt: "The Invasion 2025 grand final stage",
    caption: "The grand final stage.",
    span: "md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto",
  },
  {
    src: "/images/invasion/inv25-grand-cheque.webp",
    alt: "The Invasion 2025 champion holding the prize cheque",
    caption: "₦1,000,000. A real cheque, handed over on the night.",
    span: "aspect-[4/3]",
  },
  {
    src: "/images/invasion/inv25-redcarpet-kid.webp",
    alt: "A young guest on the Invasion red carpet",
    caption: "A red carpet. For a gaming tournament.",
    span: "aspect-[4/3]",
  },
  {
    src: "/images/invasion/inv25-match-crowd.webp",
    alt: "The crowd watching a knockout match at Invasion",
    caption: "The crowd during a knockout match.",
    span: "aspect-[4/3]",
  },
  {
    src: "/images/invasion/inv25-champion-kiss.webp",
    alt: "The champion kissing the Invasion trophy",
    caption: "The champion and the trophy.",
    span: "aspect-[4/3]",
  },
  {
    src: "/images/invasion/inv25-mk-winners.webp",
    alt: "Mortal Kombat winners on stage at Invasion",
    caption: "Mortal Kombat winners.",
    span: "md:col-span-2 aspect-[16/7]",
  },
];

export function InvasionEssay() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="font-heading text-xs tracking-[0.35em] text-text-muted">DECEMBER 2025</p>
          <h2 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-text md:text-5xl">
            Invasion, Bonny Island.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-text-muted md:text-right">
          Every photograph on this page was taken at a CGE event. Nothing here is stock, and nothing is generated.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 md:auto-rows-[220px] lg:auto-rows-[260px]">
        {PHOTOS.map((photo) => (
          <figure key={photo.src} className={`group relative overflow-hidden bg-surface ${photo.span}`}>
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-base/90 to-transparent px-3 pb-3 pt-10 text-xs text-text">
              {photo.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
