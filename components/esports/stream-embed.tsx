"use client";

import { useState } from "react";
import { Video, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, sanitizeUrl } from "@/lib/utils";

interface StreamEmbedProps {
  url: string;
  title?: string;
  compact?: boolean;
}

function getEmbedUrl(url: string): { type: "twitch" | "youtube" | "kick" | "unknown"; embedUrl: string | null } {
  try {
    const parsed = new URL(url);

    // Twitch
    if (parsed.hostname.includes("twitch.tv")) {
      const channel = parsed.pathname.split("/").filter(Boolean)[0];
      if (channel) {
        return {
          type: "twitch",
          embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}`,
        };
      }
    }

    // YouTube
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      let videoId = "";
      if (parsed.hostname.includes("youtu.be")) {
        videoId = parsed.pathname.slice(1);
      } else {
        videoId = parsed.searchParams.get("v") || "";
        // Handle /live/ URLs
        if (!videoId && parsed.pathname.includes("/live/")) {
          videoId = parsed.pathname.split("/live/")[1]?.split("/")[0] || "";
        }
      }
      if (videoId) {
        return {
          type: "youtube",
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0`,
        };
      }
    }

    // Kick
    if (parsed.hostname.includes("kick.com")) {
      const channel = parsed.pathname.split("/").filter(Boolean)[0];
      if (channel) {
        return { type: "kick", embedUrl: null }; // Kick doesn't support easy embeds
      }
    }

    return { type: "unknown", embedUrl: null };
  } catch {
    return { type: "unknown", embedUrl: null };
  }
}

export function StreamEmbed({ url, title, compact = false }: StreamEmbedProps) {
  const [copied, setCopied] = useState(false);
  const { type, embedUrl } = getEmbedUrl(url);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Compact mode — just a link badge
  if (compact) {
    return (
      <a
        href={sanitizeUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
          "bg-red/10 border border-red/20 text-red hover:bg-red/15",
          type === "twitch" && "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/15"
        )}
      >
        <Video size={12} />
        {type === "twitch" ? "Watch on Twitch" :
         type === "youtube" ? "Watch on YouTube" :
         type === "kick" ? "Watch on Kick" :
         "Watch Stream"}
        <ExternalLink size={10} />
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            {title || "Live Stream"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
            title="Copy stream link"
          >
            {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
          </button>
          <a
            href={sanitizeUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Embed */}
      {embedUrl ? (
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={embedUrl}
            title={title || "Tournament Stream"}
            className="absolute inset-0 w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Video size={32} className="text-text-muted/30 mb-3" />
          <p className="text-sm text-text-muted mb-3">
            Stream preview not available for this platform
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.open(url, "_blank")}
          >
            <ExternalLink size={14} />
            Open Stream
          </Button>
        </div>
      )}
    </div>
  );
}
