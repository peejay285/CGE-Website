"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function ImageSkeleton({
  src,
  alt,
  className,
  fallback,
}: ImageSkeletonProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error && fallback) {
    return <>{fallback}</>;
  }

  // Use next/image for remote URLs, fall back to raw img for blob/data URIs
  const isOptimizable = src.startsWith("http");

  return (
    <div className="relative w-full h-full">
      {/* Skeleton placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-surface-alt animate-pulse">
          <div
            className="w-full h-full bg-gradient-to-r from-surface-alt via-border/30 to-surface-alt animate-shimmer"
            style={{ backgroundSize: "200% 100%" }}
          />
        </div>
      )}

      {/* Actual image */}
      {isOptimizable ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
        />
      )}
    </div>
  );
}
