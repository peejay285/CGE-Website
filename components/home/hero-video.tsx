"use client";

import { useEffect, useState } from "react";

/**
 * Desktop-only hero video. CSS `hidden md:block` alone still DOWNLOADS
 * the ~3 MB mp4 on phones — display:none doesn't cancel the media
 * fetch, and autoPlay forces a full download past preload="metadata".
 * On mobile we simply never mount the element, so nothing is fetched
 * and phones keep the still photo behind the hero.
 */
export function HeroVideo() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!isDesktop) return null;

  return (
    <video
      aria-hidden
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster="/images/invasion/drone-stage.webp"
      className="absolute inset-0 h-full w-full object-cover opacity-[0.32]"
    >
      <source src="/Videos/events/invasion-drone-loop.mp4" type="video/mp4" />
    </video>
  );
}
