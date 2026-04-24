import type { CommunityTopic, TopicConfig, ReactionType } from "./types";

// ── Topic Definitions ────────────────────────────────
export const TOPICS: TopicConfig[] = [
  {
    id: "general",
    label: "General",
    icon: "MessageSquare",
    color: "var(--color-cyan)",
    description: "General discussion about anything gaming",
  },
  {
    id: "gaming-news",
    label: "Gaming News",
    icon: "Newspaper",
    color: "#FF6B35",
    description: "Latest gaming industry news and announcements",
  },
  {
    id: "lfg",
    label: "LFG",
    icon: "Users",
    color: "#00FF88",
    description: "Looking for group — find teammates and squads",
  },
  {
    id: "clips",
    label: "Clips & Highlights",
    icon: "Video",
    color: "#9B59B6",
    description: "Share your best gaming moments",
  },
  {
    id: "memes",
    label: "Memes",
    icon: "Laugh",
    color: "#FFD700",
    description: "Gaming memes and funny content",
  },
  {
    id: "marketplace-talk",
    label: "Marketplace",
    icon: "ShoppingBag",
    color: "#FF2D78",
    description: "Discuss deals, pricing, and marketplace tips",
  },
  {
    id: "tournament-talk",
    label: "Tournaments",
    icon: "Trophy",
    color: "#00F0FF",
    description: "Tournament discussion, strategies, and results",
  },
  {
    id: "tech-talk",
    label: "Tech Talk",
    icon: "Monitor",
    color: "#4ECDC4",
    description: "Hardware, setups, and tech discussion",
  },
  {
    id: "introductions",
    label: "Introductions",
    icon: "Hand",
    color: "#FF9FF3",
    description: "Introduce yourself to the community",
  },
];

export function getTopicConfig(topicId: CommunityTopic | null | undefined): TopicConfig | undefined {
  if (!topicId) return undefined;
  return TOPICS.find((t) => t.id === topicId);
}

// ── Reaction Definitions ────────────────────────────

export interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
}

export const REACTIONS: ReactionConfig[] = [
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "laugh", emoji: "😂", label: "Haha" },
  { type: "mind_blown", emoji: "🤯", label: "Mind Blown" },
  { type: "heart", emoji: "❤️", label: "Love" },
  { type: "gg", emoji: "🎮", label: "GG" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😤", label: "Angry" },
];

export function getReactionConfig(type: ReactionType): ReactionConfig | undefined {
  return REACTIONS.find((r) => r.type === type);
}

// ── Report Reasons ──────────────────────────────────

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or Scam" },
  { value: "harassment", label: "Harassment or Bullying" },
  { value: "hate_speech", label: "Hate Speech" },
  { value: "misinformation", label: "Misinformation" },
  { value: "nsfw", label: "Inappropriate Content" },
  { value: "self_harm", label: "Self-Harm / Dangerous" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
] as const;

// ── Poll Duration Options ───────────────────────────

export const POLL_DURATIONS = [
  { value: "1h", label: "1 Hour", ms: 3600000 },
  { value: "6h", label: "6 Hours", ms: 21600000 },
  { value: "24h", label: "24 Hours", ms: 86400000 },
  { value: "3d", label: "3 Days", ms: 259200000 },
  { value: "7d", label: "1 Week", ms: 604800000 },
  { value: "none", label: "No End Date", ms: 0 },
] as const;

// ── Hashtag Helpers ─────────────────────────────────

export function extractHashtags(text: string): string[] {
  const regex = /#([a-zA-Z0-9_]+)/g;
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return [...new Set(tags)];
}

export function extractMentions(text: string): string[] {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  return [...new Set(mentions)];
}

// ── Embed URL Parsing ───────────────────────────────

export interface ParsedEmbed {
  platform: "youtube" | "twitch" | "kick" | "unknown";
  embedUrl: string;
  thumbnailUrl?: string;
}

export function parseEmbedUrl(url: string): ParsedEmbed | null {
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let videoId = "";
      if (u.hostname.includes("youtu.be")) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get("v") || "";
        // Handle /shorts/ URLs
        const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/);
        if (shortsMatch) videoId = shortsMatch[1];
      }
      if (videoId) {
        return {
          platform: "youtube",
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    }

    // Twitch clips
    if (u.hostname.includes("twitch.tv")) {
      const clipMatch = u.pathname.match(/\/clip\/([^/?]+)/) || u.pathname.match(/\/([^/]+)\/clip\/([^/?]+)/);
      if (clipMatch) {
        const clipId = clipMatch[2] || clipMatch[1];
        return {
          platform: "twitch",
          embedUrl: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}`,
        };
      }
      // Twitch channel
      const channelMatch = u.pathname.match(/^\/([a-zA-Z0-9_]+)$/);
      if (channelMatch) {
        return {
          platform: "twitch",
          embedUrl: `https://player.twitch.tv/?channel=${channelMatch[1]}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}`,
        };
      }
    }

    // Kick
    if (u.hostname.includes("kick.com")) {
      const kickMatch = u.pathname.match(/^\/([a-zA-Z0-9_]+)/);
      if (kickMatch) {
        return {
          platform: "kick",
          embedUrl: `https://player.kick.com/${kickMatch[1]}`,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ── Trending Score ──────────────────────────────────

export function calculateTrendingScore(post: {
  likes_count: number;
  comments_count: number;
  share_count?: number;
  reactions?: { count: number }[];
  created_at: string;
}): number {
  const ageHours =
    (Date.now() - new Date(post.created_at).getTime()) / 3600000;
  const reactionTotal =
    post.reactions?.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const engagement =
    post.likes_count * 1 +
    post.comments_count * 2 +
    (post.share_count ?? 0) * 3 +
    reactionTotal * 1.5;
  // Decay factor: engagement loses weight over time
  return engagement / Math.pow(ageHours + 2, 1.5);
}
