"use client";

import { useState } from "react";
import Image from "next/image";

interface GameTile {
  name: string;
  image: string;
}

const ROW_1: GameTile[] = [
  { name: "FC 26", image: "/games/fc-25.jpg" },
  { name: "Mortal Kombat 1", image: "/games/mortal-kombat-1.jpg" },
  { name: "GTA VI", image: "/games/gta-6.jpg" },
  { name: "Spider-Man 2", image: "/games/spider-man-2.jpg" },
  { name: "NBA 2K25", image: "/games/nba-2k25.jpg" },
  { name: "Elden Ring", image: "/games/elden-ring.jpg" },
];

const ROW_2: GameTile[] = [
  { name: "Tekken 8", image: "/games/tekken-8.jpg" },
  { name: "Call of Duty", image: "/games/cod-warzone.jpg" },
  { name: "God of War", image: "/games/god-of-war.jpg" },
  { name: "Fortnite", image: "/games/fortnite.jpg" },
  { name: "MK Scorpion", image: "/games/mortal-kombat-scorpion.jpg" },
  { name: "Miles Morales", image: "/games/miles-morales.jpg" },
];

const ROW_3: GameTile[] = [
  { name: "Street Fighter 6", image: "/games/street-fighter-6.jpg" },
  { name: "Tekken 8 Jin", image: "/games/tekken-8-jin.jpg" },
  { name: "COD Warzone", image: "/games/cod-warzone-2.jpg" },
  { name: "NBA 2K25", image: "/games/nba-2k25-alt.jpg" },
  { name: "Fortnite BR", image: "/games/fortnite-2.jpg" },
  { name: "PS5", image: "/games/ps5.jpg" },
];

function TileRow({
  games,
  direction,
  speed,
}: {
  games: GameTile[];
  direction: "left" | "right";
  speed: number;
}) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const tiles = [...games, ...games];

  const handleImageError = (imageSrc: string) => {
    setFailedImages((prev) => {
      const next = new Set(prev);
      next.add(imageSrc);
      return next;
    });
  };

  return (
    <div className="overflow-hidden py-1.5">
      <div
        className={`scroll-row ${direction === "left" ? "scroll-left" : "scroll-right"}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {tiles.map((game, i) => (
          <div
            key={`${game.name}-${i}`}
            className="game-tile relative mx-2 w-[220px] h-[130px] sm:w-[280px] sm:h-[160px] md:w-[320px] md:h-[180px] rounded-xl overflow-hidden cursor-pointer group"
          >
            {failedImages.has(game.image) ? (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/20 via-surface-alt to-magenta/20 flex items-center justify-center">
                <span className="font-heading text-sm sm:text-base font-bold text-text/70 text-center px-3">
                  {game.name}
                </span>
              </div>
            ) : (
              <Image
                src={game.image}
                alt={game.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 220px, (max-width: 768px) 280px, 320px"
                onError={() => handleImageError(game.image)}
              />
            )}

            {/* Hover border glow */}
            <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-cyan/50 transition-all duration-300 pointer-events-none" />

            {/* Game name at bottom — always visible */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2.5 pt-8">
              <span className="font-heading text-xs sm:text-sm font-semibold text-white tracking-wide drop-shadow-md">
                {game.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GameShowcase() {
  return (
    <div className="flex flex-col gap-1">
      <TileRow games={ROW_1} direction="left" speed={50} />
      <TileRow games={ROW_2} direction="right" speed={55} />
      <TileRow games={ROW_3} direction="left" speed={48} />
    </div>
  );
}
