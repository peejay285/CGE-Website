"use client";

import { ExternalLink, Play, Video } from "lucide-react";
import { parseEmbedUrl } from "@/lib/community-constants";
import { sanitizeUrl } from "@/lib/utils";

interface MediaEmbedProps {
  url: string;
  compact?: boolean;
}

export default function MediaEmbed({ url, compact = false }: MediaEmbedProps) {
  const parsed = parseEmbedUrl(url);

  if (!parsed) {
    // Unknown URL — just show a link card
    return (
      <a
        href={sanitizeUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-alt border border-border text-xs text-text-muted hover:text-cyan transition-colors"
      >
        <ExternalLink size={14} />
        <span className="truncate">{url}</span>
      </a>
    );
  }

  if (compact) {
    const platformLabel =
      parsed.platform === "youtube"
        ? "YouTube"
        : parsed.platform === "twitch"
        ? "Twitch"
        : "Kick";
    const platformColor =
      parsed.platform === "youtube"
        ? "#FF0000"
        : parsed.platform === "twitch"
        ? "#9146FF"
        : "#53FC18";

    return (
      <a
        href={sanitizeUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-surface-alt hover:bg-surface transition-colors"
        style={{ color: platformColor }}
      >
        <Video size={12} />
        {platformLabel}
        <ExternalLink size={10} className="text-text-muted" />
      </a>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-black">
      {/* Thumbnail mode for YouTube */}
      {parsed.thumbnailUrl ? (
        <div className="relative group">
          <div className="aspect-video">
            <iframe
              src={parsed.embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Embedded video"
            />
          </div>
        </div>
      ) : (
        <div className="aspect-video">
          <iframe
            src={parsed.embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded stream"
          />
        </div>
      )}

      {/* Platform badge */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface border-t border-border">
        <div className="flex items-center gap-1.5">
          <Play
            size={12}
            style={{
              color:
                parsed.platform === "youtube"
                  ? "#FF0000"
                  : parsed.platform === "twitch"
                  ? "#9146FF"
                  : "#53FC18",
            }}
          />
          <span className="text-[11px] text-text-muted capitalize">
            {parsed.platform}
          </span>
        </div>
        <a
          href={sanitizeUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-text-muted hover:text-cyan transition-colors flex items-center gap-1"
        >
          Open <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );
}
