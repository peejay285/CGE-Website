"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useCommunityEnhanced } from "@/hooks/use-community-enhanced";
import { useAuth } from "@/hooks/use-auth";
import { calculateTrendingScore } from "@/lib/community-constants";
import type {
  PostComment,
  Profile,
  CommunityTopic,
  ReactionType,
  PostPoll,
} from "@/lib/types";

export type SortMode = "recent" | "trending" | "most_liked" | "my_posts" | "bookmarks";

export function useCommunityPage(scope?: { eventId?: number; tournamentId?: number }) {
  const { user } = useAuth();
  // Stable primitives so callbacks/effects don't churn on the object identity.
  const scopeEventId = scope?.eventId;
  const scopeTournamentId = scope?.tournamentId;
  const {
    posts,
    loading,
    loadingMore,
    hasMore,
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
  } = useCommunityEnhanced();

  // State
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | "all">("all");
  const [reportingPost, setReportingPost] = useState<string | null>(null);

  // Liked-by modal
  const [likersModal, setLikersModal] = useState<{
    open: boolean;
    postId: string | null;
    likers: Pick<Profile, "id" | "full_name" | "avatar_url" | "gamertag">[];
    loading: boolean;
  }>({ open: false, postId: null, likers: [], loading: false });

  // Build fetch options helper
  const fetchOpts = useCallback(
    () => ({
      topic: selectedTopic,
      sort: (sortMode === "bookmarks" ? "recent" : sortMode) as
        | "recent"
        | "trending"
        | "most_liked"
        | "my_posts",
      search: searchQuery || undefined,
      bookmarksOnly: sortMode === "bookmarks",
      eventId: scopeEventId,
      tournamentId: scopeTournamentId,
    }),
    [selectedTopic, sortMode, searchQuery, scopeEventId, scopeTournamentId]
  );

  // Initial load
  useEffect(() => {
    getPosts(0, fetchOpts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic, sortMode]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      getPosts(0, fetchOpts());
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Realtime feed
  useEffect(() => {
    const unsub = subscribeToFeed(() => {
      getPosts(0, fetchOpts());
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeToFeed, selectedTopic, sortMode, searchQuery]);

  // Realtime comments
  useEffect(() => {
    if (!expandedPost) return;
    const unsub = subscribeToComments(
      expandedPost,
      (newComment) => {
        const c = newComment as PostComment;
        setComments((prev) => {
          const existing = prev[expandedPost] ?? [];
          if (existing.some((x) => x.id === c.id)) return prev;
          return { ...prev, [expandedPost]: [...existing, c] };
        });
      },
      (deletedId) => {
        setComments((prev) => ({
          ...prev,
          [expandedPost]: (prev[expandedPost] ?? []).filter((c) => c.id !== deletedId),
        }));
      }
    );
    return unsub;
  }, [expandedPost, subscribeToComments]);

  const requireAuth = useCallback(
    (message = "Sign in to join the conversation"): boolean => {
      if (user) return true;
      window.dispatchEvent(new Event("open-auth-modal"));
      toast(message);
      return false;
    },
    [user]
  );

  /* ── Sort & filter (client-side for trending) ── */
  const displayPosts = (() => {
    const result = [...posts];

    if (sortMode === "trending") {
      result.sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a));
    }

    // Pinned first
    const pinned = result.filter((p) => p.is_pinned);
    const unpinned = result.filter((p) => !p.is_pinned);
    return pinned.concat(unpinned);
  })();

  /* ── Handlers ── */
  const handleLike = useCallback(
    async (postId: string) => {
      if (!requireAuth()) return;
      await toggleLike(postId);
    },
    [requireAuth, toggleLike]
  );

  const handleReaction = useCallback(
    async (postId: string, type: ReactionType) => {
      if (!requireAuth()) return;
      await toggleReaction(postId, type);
    },
    [requireAuth, toggleReaction]
  );

  const handleBookmark = useCallback(
    async (postId: string) => {
      if (!requireAuth("Sign in to save posts")) return;
      await toggleBookmark(postId);
      toast.success(
        posts.find((p) => p.id === postId)?.bookmarked ? "Removed from saved" : "Saved!"
      );
    },
    [requireAuth, toggleBookmark, posts]
  );

  const handleToggleComments = useCallback(
    async (postId: string) => {
      if (expandedPost === postId) {
        setExpandedPost(null);
        return;
      }
      setExpandedPost(postId);
      if (!comments[postId]) {
        setLoadingComments(postId);
        const fetched = await getComments(postId);
        setComments((prev) => ({ ...prev, [postId]: fetched }));
        setLoadingComments(null);
      }
    },
    [expandedPost, comments, getComments]
  );

  const handleNewPost = useCallback(
    async (
      content: string,
      options?: {
        imageUrl?: string | null;
        topic?: CommunityTopic;
        embedUrl?: string | null;
        pollQuestion?: string;
        pollOptions?: string[];
        pollDuration?: number;
      }
    ) => {
      if (!requireAuth("Sign in to post in the community")) return;
      try {
        await createPost(content, {
          imageUrl: options?.imageUrl,
          topic: options?.topic ?? (selectedTopic !== "all" ? selectedTopic : "general"),
          embedUrl: options?.embedUrl,
          pollQuestion: options?.pollQuestion,
          pollOptions: options?.pollOptions,
          pollDuration: options?.pollDuration,
          eventId: scopeEventId,
          tournamentId: scopeTournamentId,
        });
        toast.success("Post published!");
      } catch (e) {
        const msg = (e as { message?: string })?.message;
        toast.error(msg || "Failed to create post");
      }
    },
    [requireAuth, createPost, selectedTopic, scopeEventId, scopeTournamentId]
  );

  const handleEditPost = useCallback(
    async (postId: string, content: string) => {
      await editPost(postId, content);
      toast.success("Post updated");
    },
    [editPost]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      await deletePost(postId);
      toast.success("Post deleted");
      if (expandedPost === postId) setExpandedPost(null);
    },
    [deletePost, expandedPost]
  );

  const handleAddComment = useCallback(
    async (postId: string, text: string) => {
      if (!requireAuth("Sign in to comment")) return;
      try {
        const comment = await addComment(postId, text);
        if (comment) {
          setComments((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] ?? []), comment],
          }));
        } else {
          toast.error("Failed to add comment");
        }
      } catch (e) {
        const msg = (e as { message?: string })?.message;
        toast.error(msg || "Failed to add comment");
      }
    },
    [requireAuth, addComment]
  );

  const handleDeleteComment = useCallback(
    async (postId: string, commentId: string) => {
      await deleteComment(commentId, postId);
      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId),
      }));
    },
    [deleteComment]
  );

  const handleShowLikers = useCallback(
    async (postId: string) => {
      setLikersModal({ open: true, postId, likers: [], loading: true });
      const likers = await getLikers(postId);
      const mapped = likers.map((l: Record<string, unknown>) => {
        const p = l.profiles as unknown as Pick<
          Profile,
          "id" | "full_name" | "avatar_url" | "gamertag"
        > | null;
        return p ?? {
          id: l.user_id as string,
          full_name: "Anonymous",
          avatar_url: null,
          gamertag: null,
        };
      });
      setLikersModal({ open: true, postId, likers: mapped, loading: false });
    },
    [getLikers]
  );

  const handleVotePoll = useCallback(
    async (pollId: string, optionId: string, postId: string) => {
      if (!requireAuth("Sign in to vote")) return;
      await votePoll(pollId, optionId, postId);
    },
    [requireAuth, votePoll]
  );

  const handleLoadPoll = useCallback(
    async (postId: string): Promise<PostPoll | null> => {
      return getPoll(postId);
    },
    [getPoll]
  );

  const handleHashtagClick = (tag: string) => {
    setSearchQuery(`#${tag}`);
  };

  const handleLoadMore = () => {
    getPosts(posts.length, {
      ...fetchOpts(),
      append: true,
    });
  };

  const closeLikersModal = () => {
    setLikersModal({ open: false, postId: null, likers: [], loading: false });
  };

  // Pull-to-refresh: reload the feed from the top with current filters
  const refresh = useCallback(async () => {
    await getPosts(0, fetchOpts());
  }, [getPosts, fetchOpts]);

  return {
    // Auth
    user,
    refresh,

    // Data
    posts,
    displayPosts,
    loading,
    loadingMore,
    hasMore,
    comments,
    loadingComments,
    expandedPost,

    // Filters
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    selectedTopic,
    setSelectedTopic,

    // Modals
    reportingPost,
    setReportingPost,
    likersModal,
    closeLikersModal,

    // Handlers
    handleLike,
    handleReaction,
    handleBookmark,
    handleToggleComments,
    handleNewPost,
    handleEditPost,
    handleDeletePost,
    handleAddComment,
    handleDeleteComment,
    handleShowLikers,
    handleVotePoll,
    handleLoadPoll,
    handleHashtagClick,
    handleLoadMore,

    // Pass-through for sidebar
    getTrendingHashtags,
    reportPost,
    uploadPostImage,
    searchUsers,
  };
}
