"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  CommunityPost,
  CommunityTopic,
  ReactionType,
  ReactionCount,
  PostPoll,
  ReportReason,
  Profile,
} from "@/lib/types";
import { extractHashtags, extractMentions } from "@/lib/community-constants";
import { escapePostgrestSearch } from "@/lib/utils";

const PAGE_SIZE = 15;

export function useCommunityEnhanced() {
  const supabase = createClient();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Fetch Posts (with topic, sort, search filters) ─────────

  const getPosts = useCallback(
    async (
      offset = 0,
      options?: {
        topic?: CommunityTopic | "all";
        sort?: "recent" | "trending" | "most_liked" | "my_posts";
        search?: string;
        bookmarksOnly?: boolean;
        eventId?: number;
        tournamentId?: number;
        append?: boolean;
      }
    ) => {
      const isAppend = options?.append ?? false;
      if (isAppend) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let query = supabase
          .from("community_posts")
          .select(
            "*, author:profiles!community_posts_author_id_fkey(id, full_name, avatar_url, gamertag, trust_level)"
          )
          // Moderator-hidden posts never appear in the public feed.
          .eq("is_hidden", false);

        // Scope to an event or tournament discussion thread
        if (options?.eventId != null) {
          query = query.eq("event_id", options.eventId);
        }
        if (options?.tournamentId != null) {
          query = query.eq("tournament_id", options.tournamentId);
        }

        // Topic filter
        if (options?.topic && options.topic !== "all") {
          query = query.eq("topic", options.topic);
        }

        // Search filter (sanitized to prevent PostgREST injection)
        if (options?.search) {
          const safe = escapePostgrestSearch(options.search);
          query = query.or(
            `content.ilike.%${safe}%`
          );
        }

        // Bookmarks only
        if (options?.bookmarksOnly && user) {
          const { data: bookmarks } = await supabase
            .from("post_bookmarks")
            .select("post_id")
            .eq("user_id", user.id);
          const bookmarkedIds = bookmarks?.map((b: { post_id: string }) => b.post_id) ?? [];
          if (bookmarkedIds.length === 0) {
            setPosts([]);
            setHasMore(false);
            setLoading(false);
            setLoadingMore(false);
            return;
          }
          query = query.in("id", bookmarkedIds);
        }

        // My posts filter
        if (options?.sort === "my_posts" && user) {
          query = query.eq("author_id", user.id);
        }

        // Sorting
        if (options?.sort === "most_liked") {
          query = query.order("likes_count", { ascending: false });
        } else {
          query = query
            .order("is_pinned", { ascending: false })
            .order("created_at", { ascending: false });
        }

        query = query.range(offset, offset + PAGE_SIZE - 1);

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        let enriched: CommunityPost[] = (data ?? []) as CommunityPost[];

        // Enrich with user-specific data
        if (user && enriched.length > 0) {
          const postIds = enriched.map((p) => p.id);

          // Likes
          const { data: likes } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          const likedIds = new Set(likes?.map((l: { post_id: string }) => l.post_id) ?? []);

          // Bookmarks
          const { data: bookmarks } = await supabase
            .from("post_bookmarks")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds);
          const bookmarkedIds = new Set(bookmarks?.map((b: { post_id: string }) => b.post_id) ?? []);

          // Reactions
          const { data: allReactions } = await supabase
            .from("post_reactions")
            .select("post_id, reaction_type, user_id")
            .in("post_id", postIds);

          // Build reaction counts per post
          const reactionsByPost: Record<string, ReactionCount[]> = {};
          for (const r of allReactions ?? []) {
            if (!reactionsByPost[r.post_id]) reactionsByPost[r.post_id] = [];
            const existing = reactionsByPost[r.post_id].find(
              (rc) => rc.reaction_type === r.reaction_type
            );
            if (existing) {
              existing.count++;
              if (r.user_id === user.id) existing.user_reacted = true;
            } else {
              reactionsByPost[r.post_id].push({
                reaction_type: r.reaction_type as ReactionType,
                count: 1,
                user_reacted: r.user_id === user.id,
              });
            }
          }

          enriched = enriched.map((p) => ({
            ...p,
            user_has_liked: likedIds.has(p.id),
            bookmarked: bookmarkedIds.has(p.id),
            reactions: reactionsByPost[p.id] ?? [],
            author_trust_level: (p.author as Profile & { trust_level?: string })
              ?.trust_level ?? null,
          }));
        }

        if (isAppend) {
          setPosts((prev) => [...prev, ...enriched]);
        } else {
          setPosts(enriched);
        }
        setHasMore(enriched.length === PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [supabase]
  );

  // ── Create Post ────────────────────────────────────

  const createPost = useCallback(
    async (
      content: string,
      options?: {
        imageUrl?: string | null;
        topic?: CommunityTopic;
        embedUrl?: string | null;
        pollQuestion?: string;
        pollOptions?: string[];
        pollDuration?: number; // ms, 0 = no end
        eventId?: number | null;
        tournamentId?: number | null;
      }
    ) => {
      setActionLoading(true);
      setActionError(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const hashtags = extractHashtags(content);
        const mentions = extractMentions(content);

        const { data: post, error: postError } = await supabase
          .from("community_posts")
          .insert({
            author_id: user.id,
            content,
            image_url: options?.imageUrl ?? null,
            topic: options?.topic ?? "general",
            embed_url: options?.embedUrl ?? null,
            hashtags: hashtags.length > 0 ? hashtags : null,
            mentions: mentions.length > 0 ? mentions : null,
            event_id: options?.eventId ?? null,
            tournament_id: options?.tournamentId ?? null,
          })
          .select(
            "*, author:profiles!community_posts_author_id_fkey(id, full_name, avatar_url, gamertag, trust_level)"
          )
          .single();

        if (postError) throw postError;

        // Create poll if provided
        if (
          options?.pollQuestion &&
          options?.pollOptions &&
          options.pollOptions.length >= 2
        ) {
          const endsAt =
            options.pollDuration && options.pollDuration > 0
              ? new Date(Date.now() + options.pollDuration).toISOString()
              : null;

          const { data: poll, error: pollError } = await supabase
            .from("post_polls")
            .insert({
              post_id: post.id,
              question: options.pollQuestion,
              ends_at: endsAt,
            })
            .select()
            .single();

          if (!pollError && poll) {
            const optionInserts = options.pollOptions.map((label: string) => ({
              poll_id: poll.id,
              label,
            }));
            await supabase.from("poll_options").insert(optionInserts);
          }
        }

        // Insert mentions
        if (mentions.length > 0) {
          // Resolve gamertags to user IDs
          const { data: mentionedUsers } = await supabase
            .from("profiles")
            .select("id, gamertag")
            .in("gamertag", mentions);

          if (mentionedUsers && mentionedUsers.length > 0) {
            const mentionInserts = mentionedUsers.map((mu: { id: string; gamertag: string }) => ({
              post_id: post.id,
              mentioned_user_id: mu.id,
              mentioned_by: user.id,
            }));
            await supabase.from("user_mentions").insert(mentionInserts);
          }
        }

        const enrichedPost: CommunityPost = {
          ...post,
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false,
          bookmarked: false,
          reactions: [],
          has_poll: !!(options?.pollQuestion && options?.pollOptions),
        };

        setPosts((prev) => [enrichedPost, ...prev]);
        return post;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create post";
        setActionError(msg);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  // ── Edit Post ─────────────────────────────────────

  const editPost = useCallback(
    async (postId: string, content: string) => {
      setActionLoading(true);
      setActionError(null);
      try {
        const hashtags = extractHashtags(content);
        const mentions = extractMentions(content);

        const { error: editError } = await supabase
          .from("community_posts")
          .update({ content, hashtags, mentions })
          .eq("id", postId);
        if (editError) throw editError;

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, content, hashtags, mentions } : p
          )
        );
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to edit post");
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  // ── Delete Post ───────────────────────────────────

  const deletePost = useCallback(
    async (postId: string) => {
      setActionLoading(true);
      try {
        const { error: delError } = await supabase
          .from("community_posts")
          .delete()
          .eq("id", postId);
        if (delError) throw delError;
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete");
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  // ── Toggle Like ───────────────────────────────────

  const toggleLike = useCallback(
    async (postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const liked = post.user_has_liked;

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                user_has_liked: !liked,
                likes_count: p.likes_count + (liked ? -1 : 1),
              }
            : p
        )
      );

      if (liked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
      }
    },
    [supabase, posts]
  );

  // ── Toggle Reaction ───────────────────────────────

  const toggleReaction = useCallback(
    async (postId: string, reactionType: ReactionType) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find((p) => p.id === postId);
      const existingReaction = post?.reactions?.find(
        (r) => r.reaction_type === reactionType
      );
      const userReacted = existingReaction?.user_reacted ?? false;

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const reactions = [...(p.reactions ?? [])];
          const idx = reactions.findIndex(
            (r) => r.reaction_type === reactionType
          );
          if (userReacted) {
            if (idx >= 0) {
              reactions[idx] = {
                ...reactions[idx],
                count: reactions[idx].count - 1,
                user_reacted: false,
              };
              if (reactions[idx].count <= 0) reactions.splice(idx, 1);
            }
          } else {
            if (idx >= 0) {
              reactions[idx] = {
                ...reactions[idx],
                count: reactions[idx].count + 1,
                user_reacted: true,
              };
            } else {
              reactions.push({
                reaction_type: reactionType,
                count: 1,
                user_reacted: true,
              });
            }
          }
          return { ...p, reactions };
        })
      );

      if (userReacted) {
        await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("reaction_type", reactionType);
      } else {
        await supabase.from("post_reactions").insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        });
      }
    },
    [supabase, posts]
  );

  // ── Toggle Bookmark ───────────────────────────────

  const toggleBookmark = useCallback(
    async (postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find((p) => p.id === postId);
      const isBookmarked = post?.bookmarked ?? false;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, bookmarked: !isBookmarked } : p
        )
      );

      if (isBookmarked) {
        await supabase
          .from("post_bookmarks")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_bookmarks")
          .insert({ post_id: postId, user_id: user.id });
      }
    },
    [supabase, posts]
  );

  // ── Report Post ───────────────────────────────────

  const reportPost = useCallback(
    async (postId: string, reason: ReportReason, details?: string) => {
      setActionLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { error: reportError } = await supabase
          .from("post_reports")
          .insert({
            post_id: postId,
            reporter_id: user.id,
            reason,
            details: details ?? null,
          });
        if (reportError) throw reportError;

        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, is_reported: true } : p))
        );
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to report post"
        );
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [supabase]
  );

  // ── Vote on Poll ──────────────────────────────────

  const votePoll = useCallback(
    async (pollId: string, optionId: string, postId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: voteError } = await supabase
        .from("poll_votes")
        .insert({ poll_id: pollId, option_id: optionId, user_id: user.id });

      if (voteError) return;

      // Update local state
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId || !p.poll) return p;
          return {
            ...p,
            poll: {
              ...p.poll,
              total_votes: p.poll.total_votes + 1,
              user_has_voted: true,
              options: p.poll.options.map((o) =>
                o.id === optionId
                  ? { ...o, votes_count: o.votes_count + 1, user_voted: true }
                  : o
              ),
            },
          };
        })
      );
    },
    [supabase]
  );

  // ── Get Poll for Post ─────────────────────────────

  const getPoll = useCallback(
    async (postId: string): Promise<PostPoll | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: poll } = await supabase
        .from("post_polls")
        .select("*, options:poll_options(*)")
        .eq("post_id", postId)
        .single();

      if (!poll) return null;

      let userHasVoted = false;
      let votedOptionId: string | null = null;

      if (user) {
        const { data: vote } = await supabase
          .from("poll_votes")
          .select("option_id")
          .eq("poll_id", poll.id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (vote) {
          userHasVoted = true;
          votedOptionId = vote.option_id;
        }
      }

      const totalVotes =
        poll.options?.reduce(
          (sum: number, o: { votes_count: number }) => sum + (o.votes_count ?? 0),
          0
        ) ?? 0;

      return {
        id: poll.id,
        post_id: postId,
        question: poll.question,
        ends_at: poll.ends_at,
        total_votes: totalVotes,
        user_has_voted: userHasVoted,
        options: (poll.options ?? []).map(
          (o: { id: string; poll_id: string; label: string; votes_count: number }) => ({
            id: o.id,
            poll_id: o.poll_id,
            label: o.label,
            votes_count: o.votes_count ?? 0,
            user_voted: o.id === votedOptionId,
          })
        ),
      };
    },
    [supabase]
  );

  // ── Get Likers ────────────────────────────────────

  const getLikers = useCallback(
    async (postId: string) => {
      const { data } = await supabase
        .from("post_likes")
        .select("user_id, profiles:profiles!post_likes_user_id_fkey(id, full_name, avatar_url, gamertag)")
        .eq("post_id", postId);
      return data ?? [];
    },
    [supabase]
  );

  // ── Comments ──────────────────────────────────────

  const getComments = useCallback(
    async (postId: string) => {
      const { data } = await supabase
        .from("post_comments")
        .select(
          "*, author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url, gamertag)"
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    [supabase]
  );

  const addComment = useCallback(
    async (postId: string, content: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error: commentError } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, author_id: user.id, content })
        .select(
          "*, author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url, gamertag)"
        )
        .single();

      // Surface DB-enforced rules (rate limit / blocked words) to the caller.
      if (commentError) throw new Error(commentError.message);

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        )
      );

      return data;
    },
    [supabase]
  );

  const deleteComment = useCallback(
    async (commentId: string, postId: string) => {
      const { error: delError } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", commentId);

      if (!delError) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, comments_count: Math.max(0, p.comments_count - 1) }
              : p
          )
        );
      }
    },
    [supabase]
  );

  // ── Upload Image ──────────────────────────────────

  const uploadPostImage = useCallback(
    async (file: File): Promise<string | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("community-images")
        .upload(path, file);
      if (uploadError) return null;

      const {
        data: { publicUrl },
      } = supabase.storage.from("community-images").getPublicUrl(path);
      return publicUrl;
    },
    [supabase]
  );

  // ── Search Users (for mentions) ───────────────────

  const searchUsers = useCallback(
    async (query: string) => {
      if (query.length < 2) return [];
      const safe = escapePostgrestSearch(query);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, gamertag")
        .or(`gamertag.ilike.%${safe}%,full_name.ilike.%${safe}%`)
        .limit(5);
      return data ?? [];
    },
    [supabase]
  );

  // ── Get Trending Hashtags ─────────────────────────

  const getTrendingHashtags = useCallback(async () => {
    // Get posts from last 48 hours with hashtags
    const since = new Date(Date.now() - 48 * 3600000).toISOString();
    const { data } = await supabase
      .from("community_posts")
      .select("hashtags")
      .gte("created_at", since)
      .not("hashtags", "is", null);

    if (!data) return [];

    const tagCounts: Record<string, number> = {};
    for (const post of data) {
      const tags = post.hashtags as string[] | null;
      if (tags) {
        for (const tag of tags) {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        }
      }
    }

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }, [supabase]);

  // ── Real-time Subscriptions ───────────────────────

  const subscribeToFeed = useCallback(
    (callback: () => void) => {
      const channel = supabase
        .channel("community-feed")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "community_posts" },
          callback
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
    [supabase]
  );

  const subscribeToComments = useCallback(
    (
      postId: string,
      onInsert: (comment: unknown) => void,
      onDelete: (commentId: string) => void
    ) => {
      const channel = supabase
        .channel(`comments-${postId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "post_comments",
            filter: `post_id=eq.${postId}`,
          },
          (payload: { new: Record<string, unknown> }) => onInsert(payload.new)
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "post_comments",
            filter: `post_id=eq.${postId}`,
          },
          (payload: { old: Record<string, unknown> }) => onDelete((payload.old as { id: string }).id)
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
    [supabase]
  );

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    actionLoading,
    actionError,
    getPosts,
    createPost,
    editPost,
    deletePost,
    toggleLike,
    toggleReaction,
    toggleBookmark,
    reportPost,
    votePoll,
    getPoll,
    getLikers,
    getComments,
    addComment,
    deleteComment,
    uploadPostImage,
    searchUsers,
    getTrendingHashtags,
    subscribeToFeed,
    subscribeToComments,
  };
}
