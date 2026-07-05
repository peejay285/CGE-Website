"use client";

import { useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

/**
 * Invasion '25 aftermovie in a vertical "reel" frame.
 * Hover (or tap on touch) plays a 50s highlight cut, muted by default with a
 * sound toggle — same interaction pattern as the home page lounge montage.
 * Video is preload="none" so the 8MB file costs nothing until interacted with.
 */
export function InvasionReel() {
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
        /* autoplay blocked — leave the poster */
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
    <figure className="mx-auto w-full max-w-[280px] lg:max-w-none">
      <div
        className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-magenta/30 shadow-[0_0_30px_rgba(255,45,120,0.10)] cursor-pointer"
        onMouseEnter={start}
        onMouseLeave={stop}
        onClick={toggle}
        role="button"
        aria-label={
          playing
            ? "Pause the Invasion 2025 highlights"
            : "Play Invasion Tournament 2025 highlights"
        }
      >
        <video
          ref={videoRef}
          src="/Videos/events/invasion-reel-25.mp4"
          poster="/images/invasion/reel-champion.webp"
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-base/60 via-transparent to-transparent pointer-events-none" />

        {/* Hint chip */}
        <div
          className={`absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-magenta/30 bg-base/70 px-3 py-1.5 backdrop-blur-sm transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`}
        >
          <Play size={11} className="text-magenta" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-magenta">
            <span className="hidden sm:inline">Hover to watch</span>
            <span className="sm:hidden">Tap to watch</span>
          </span>
        </div>

        {/* Sound toggle — appears while playing */}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          className={`absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-magenta/30 bg-base/70 px-3 py-1.5 backdrop-blur-sm transition-opacity duration-300 cursor-pointer hover:bg-base/90 ${playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {muted ? (
            <VolumeX size={12} className="text-text-muted" />
          ) : (
            <Volume2 size={12} className="text-magenta" />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            {muted ? "Sound on" : "Mute"}
          </span>
        </button>
      </div>
      <figcaption className="mt-2 text-center text-xs text-text-muted">
        Invasion &apos;25 — official aftermovie highlights
      </figcaption>
    </figure>
  );
}
