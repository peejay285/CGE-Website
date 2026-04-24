"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Hash, Flame } from "lucide-react";

interface TrendingSidebarProps {
  onHashtagClick: (tag: string) => void;
  getTrendingHashtags: () => Promise<{ tag: string; count: number }[]>;
}

export default function TrendingSidebar({
  onHashtagClick,
  getTrendingHashtags,
}: TrendingSidebarProps) {
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrendingHashtags()
      .then(setTags)
      .finally(() => setLoading(false));
  }, [getTrendingHashtags]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-4 space-y-3 animate-pulse">
        <div className="h-4 w-24 bg-surface-alt rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-3 w-full bg-surface-alt rounded" />
        ))}
      </div>
    );
  }

  if (tags.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-cyan">
        <TrendingUp size={16} />
        <h3 className="font-heading text-xs tracking-wide">Trending</h3>
      </div>

      <div className="space-y-1">
        {tags.map((tag, idx) => (
          <button
            key={tag.tag}
            onClick={() => onHashtagClick(tag.tag)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-surface-alt transition-colors group"
          >
            {idx < 3 ? (
              <Flame size={12} className="text-magenta shrink-0" />
            ) : (
              <Hash size={12} className="text-text-muted shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-text group-hover:text-cyan transition-colors truncate">
                #{tag.tag}
              </p>
              <p className="text-[10px] text-text-muted">
                {tag.count} post{tag.count !== 1 ? "s" : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
