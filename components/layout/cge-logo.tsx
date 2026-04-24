"use client";

import Image from "next/image";

interface CGELogoProps {
  size?: number;
  showText?: boolean;
}

export function CGELogo({ size = 40, showText = false }: CGELogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/cge-logo.png"
        alt="CGE Logo"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-bold font-heading tracking-wider text-text">
            CREATIVE GAMING
          </span>
          <span className="text-[10px] font-medium tracking-[0.3em] text-cyan">
            ENTERTAINMENT
          </span>
        </div>
      )}
    </div>
  );
}
