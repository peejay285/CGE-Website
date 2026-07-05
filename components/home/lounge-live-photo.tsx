"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Play, Volume2, VolumeX } from "lucide-react";

/**
 * The "Game in Person" feature image that comes alive: hovering (or tapping,
 * on touch screens) fades in a muted 25s documentary montage of the real
 * lounge. Video is preload="none" so it costs nothing until interacted with.
 */
export function LoungeLivePhoto() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) {
      v.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
  };

  const start = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play()
      .then(() => setPlaying(true))
      .catch(() => {
        /* autoplay blocked — leave the photo */
      });
  };

  const stop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    v.muted = true;
    setMuted(true);
    setPlaying(false);
  };

  const toggle = () => (playing ? stop() : start());

  return (
    <figure className="mt-8">
      <div
        className="group relative aspect-[21/9] rounded-xl overflow-hidden border border-cyan/30 shadow-[0_0_30px_rgba(0,240,255,0.08)] cursor-pointer"
        onMouseEnter={start}
        onMouseLeave={stop}
        onClick={toggle}
        role="button"
        aria-label={playing ? "Pause the lounge video" : "Play a short video of the CGE lounge"}
      >
        <Image
          src="/images/lounge/lounge-interior-hero.webp"
          alt="Inside the CGE gaming lounge in Bonny Island"
          fill
          loading="lazy"
          sizes="(max-width: 1280px) 100vw, 1232px"
          className={`object-cover transition-opacity duration-500 ${playing ? "opacity-0" : "opacity-100"}`}
        />
        <video
          ref={videoRef}
          src="/Videos/events/lounge-montage.mp4"
          muted
          loop
          playsInline
          preload="none"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base/60 via-transparent to-transparent pointer-events-none" />

        {/* Hint chip */}
        <div
          className={`absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-cyan/30 bg-base/70 px-3 py-1.5 backdrop-blur-sm transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`}
        >
          <Play size={11} className="text-cyan" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan">
            <span className="hidden sm:inline">Hover to watch</span>
            <span className="sm:hidden">Tap to watch</span>
          </span>
        </div>

        {/* Sound toggle — appears while playing */}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-cyan/30 bg-base/70 px-3 py-1.5 backdrop-blur-sm transition-opacity duration-300 cursor-pointer hover:bg-base/90 ${playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {muted ? (
            <VolumeX size={12} className="text-text-muted" />
          ) : (
            <Volume2 size={12} className="text-cyan" />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            {muted ? "Sound on" : "Mute"}
          </span>
        </button>
      </div>
      <figcaption className="mt-3 text-center text-xs uppercase tracking-widest text-text-muted">
        The CGE Lounge &mdash; Bonny Island
      </figcaption>
    </figure>
  );
}
