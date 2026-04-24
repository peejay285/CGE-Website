"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Users, MessageCircle, Heart, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface PostPreview {
  id: string;
  content: string;
  topic: string | null;
  likes_count: number;
  comments_count: number;
  author: {
    full_name: string;
    avatar_url: string | null;
    gamertag: string | null;
  } | null;
}

interface CommunityBuzzWidgetProps {
  /** Filter by topic — useful for showing tournament-talk on esports page */
  topic?: string;
  title?: string;
}

export function CommunityBuzzWidget({
  topic,
  title = "Community Buzz",
}: CommunityBuzzWidgetProps) {
  const [posts, setPosts] = useState<PostPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let query = supabase
      .from("community_posts")
      .select(`
        id, content, topic, likes_count, comments_count,
        author:profiles!community_posts_author_id_fkey(full_name, avatar_url, gamertag)
      `)
      .order("likes_count", { ascending: false })
      .limit(3);

    if (topic) {
      query = query.eq("topic", topic);
    }

    query.then(({ data }: { data: Record<string, unknown>[] | null }) => {
      if (cancelled) return;
      const mapped = (data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        author: Array.isArray(p.author) ? p.author[0] ?? null : p.author,
      }));
      setPosts(mapped as PostPreview[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [topic]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-green" />
          <h3 className="font-heading text-xs tracking-wide text-text">{title}</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={14} className="animate-spin text-text-muted" />
        </div>
      </div>
    );
  }

  if (posts.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-green" />
          <h3 className="font-heading text-xs tracking-wide text-text">{title}</h3>
        </div>
        <Link
          href="/community"
          className="text-[10px] text-cyan hover:text-cyan/80 transition-colors flex items-center gap-0.5"
        >
          View all <ChevronRight size={10} />
        </Link>
      </div>

      <div className="space-y-2">
        {posts.map((post) => {
          const authorName = post.author?.full_name ?? "Anonymous";
          const initials = authorName.slice(0, 2).toUpperCase();
          const preview = post.content.length > 80
            ? post.content.slice(0, 80) + "..."
            : post.content;

          return (
            <Link
              key={post.id}
              href="/community"
              className="block rounded-lg bg-surface-alt border border-border p-2.5 hover:border-green/30 transition-all group"
            >
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-green/10 border border-green/20 flex items-center justify-center shrink-0 mt-0.5">
                  {post.author?.avatar_url ? (
                    <Image
                      src={post.author.avatar_url}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[7px] font-bold text-green">{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-text mb-0.5">
                    {authorName}
                    {post.author?.gamertag && (
                      <span className="text-text-muted font-normal ml-1">
                        @{post.author.gamertag}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-text-muted leading-relaxed line-clamp-2">
                    {preview}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-0.5 text-[9px] text-text-muted">
                      <Heart size={8} />
                      {post.likes_count}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-text-muted">
                      <MessageCircle size={8} />
                      {post.comments_count}
                    </span>
                    {post.topic && (
                      <span className="text-[8px] text-cyan/60">
                        #{post.topic}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
