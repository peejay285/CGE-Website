"use client";

import { useRef, useState, useEffect } from "react";
import {
  MessageSquare,
  Newspaper,
  Users,
  Video,
  Laugh,
  ShoppingBag,
  Trophy,
  Monitor,
  Hand,
  ChevronLeft,
  ChevronRight,
  Hash,
} from "lucide-react";
import type { CommunityTopic } from "@/lib/types";
import { TOPICS } from "@/lib/community-constants";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  MessageSquare,
  Newspaper,
  Users,
  Video,
  Laugh,
  ShoppingBag,
  Trophy,
  Monitor,
  Hand,
};

interface TopicBarProps {
  selected: CommunityTopic | "all";
  onSelect: (topic: CommunityTopic | "all") => void;
}

export default function TopicBar({ selected, onSelect }: TopicBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 8);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll);
    return () => el?.removeEventListener("scroll", checkScroll);
  }, []);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      {/* Scroll arrows */}
      {showLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft size={14} />
        </button>
      )}
      {showRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight size={14} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {/* All topics pill */}
        <button
          onClick={() => onSelect("all")}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            selected === "all"
              ? "bg-cyan/20 text-cyan border border-cyan/40"
              : "bg-surface-alt border border-border text-text-muted hover:text-text hover:border-border/80"
          }`}
        >
          <Hash size={12} />
          All
        </button>

        {TOPICS.map((topic) => {
          const Icon = ICON_MAP[topic.icon];
          const isActive = selected === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => onSelect(topic.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? "border"
                  : "bg-surface-alt border border-border text-text-muted hover:text-text hover:border-border/80"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: `${topic.color}20`,
                      color: topic.color,
                      borderColor: `${topic.color}60`,
                    }
                  : undefined
              }
              title={topic.description}
            >
              {Icon && <Icon size={12} />}
              {topic.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
