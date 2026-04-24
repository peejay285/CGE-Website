"use client";

import dynamic from "next/dynamic";
import {
  Users,
  Search,
  ChevronDown,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { SectionTitle } from "@/components/ui/section-title";
import { PostSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PostCard } from "@/components/community/post-card";
import { CommentSection } from "@/components/community/comment-section";
import TopicBar from "@/components/community/topic-bar";
import TrendingSidebar from "@/components/community/trending-sidebar";
import { getInitials } from "@/lib/utils";
import { triggerAppGate, AppGateBanner } from "@/components/ui/app-gate";
import { LiveTournamentsWidget } from "@/components/cross-pillar/live-tournaments-widget";
import { HotListingsWidget } from "@/components/cross-pillar/hot-listings-widget";
import { PillarQuickNav } from "@/components/cross-pillar/pillar-quick-nav";
import { ErrorBoundary, WidgetErrorFallback } from "@/components/ui/error-boundary";
import { useCommunityPage, type SortMode } from "@/hooks/use-community-page";

// Lazy-loaded modal
const ReportModal = dynamic(() => import("@/components/community/report-modal"), { ssr: false });

export default function CommunityPage() {
  const cp = useCommunityPage();

  return (
    <section className="max-w-5xl mx-auto px-4 md:px-6 py-12">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6 text-green" />
        <SectionTitle
          eyebrow="Connect & Play"
          title="The Gaming Community"
          subtitle="Share your wins, find opponents, and stay connected."
        />
      </div>

      <AppGateBanner pillar="community" />

      {/* Topic bar */}
      <div className="mb-6">
        <TopicBar selected={cp.selectedTopic} onSelect={cp.setSelectedTopic} />
      </div>

      {/* Main layout: feed + sidebar */}
      <div className="flex gap-6">
        {/* Left: main feed */}
        <div className="flex-1 min-w-0 max-w-2xl">
          {/* Create Post — gated to app */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => triggerAppGate("community-post")}
              className="w-full rounded-xl border border-border bg-surface-alt px-4 py-4 text-left transition-all hover:border-cyan/30 cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-cyan">
                    {cp.user ? getInitials(cp.user.user_metadata?.full_name || "CGE") : "?"}
                  </span>
                </div>
                <span className="text-sm text-text-muted group-hover:text-text transition-colors">
                  What&apos;s on your mind? Share on the app...
                </span>
              </div>
            </button>
          </div>

          {/* Search & sort */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Search posts, @users, #tags..."
                value={cp.searchQuery}
                onChange={(e) => cp.setSearchQuery(e.target.value)}
                aria-label="Search community posts"
                className="w-full rounded-lg border border-border bg-surface-alt pl-9 pr-4 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25 transition-colors"
              />
            </div>

            <div className="relative">
              <select
                value={cp.sortMode}
                onChange={(e) => cp.setSortMode(e.target.value as SortMode)}
                aria-label="Sort posts"
                className="appearance-none rounded-lg border border-border bg-surface-alt px-4 py-2 pr-8 text-xs font-semibold uppercase tracking-wider text-text cursor-pointer focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25 transition-colors"
              >
                <option value="recent">Recent</option>
                <option value="trending">Trending</option>
                <option value="most_liked">Most Liked</option>
                <option value="my_posts">My Posts</option>
                <option value="bookmarks">Saved</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
              />
            </div>
          </div>

          {/* Feed */}
          {cp.loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          ) : cp.displayPosts.length === 0 ? (
            <EmptyState
              icon={cp.sortMode === "bookmarks" ? "🔖" : "💬"}
              title={
                cp.searchQuery
                  ? "No results found"
                  : cp.sortMode === "bookmarks"
                  ? "No saved posts"
                  : "No posts yet"
              }
              subtitle={
                cp.searchQuery
                  ? "Try a different search term or topic."
                  : cp.sortMode === "bookmarks"
                  ? "Save posts you want to come back to."
                  : "Be the first to share something!"
              }
            />
          ) : (
            <div className="space-y-4">
              {cp.displayPosts.map((post) => (
                <div key={post.id}>
                  <PostCard
                    post={post}
                    isOwner={Boolean(cp.user && cp.user.id === post.author_id)}
                    onLike={() => cp.handleLike(post.id)}
                    onComment={() => cp.handleToggleComments(post.id)}
                    onEdit={(content) => cp.handleEditPost(post.id, content)}
                    onDelete={() => cp.handleDeletePost(post.id)}
                    onShowLikers={() => cp.handleShowLikers(post.id)}
                    onToggleReaction={(type) => cp.handleReaction(post.id, type)}
                    onToggleBookmark={() => cp.handleBookmark(post.id)}
                    onReport={() => cp.setReportingPost(post.id)}
                    onVotePoll={(pollId, optionId) =>
                      cp.handleVotePoll(pollId, optionId, post.id)
                    }
                    onLoadPoll={() => cp.handleLoadPoll(post.id)}
                    onHashtagClick={cp.handleHashtagClick}
                  />
                  {cp.expandedPost === post.id && (
                    <div className="mt-2 ml-4">
                      {cp.loadingComments === post.id ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-text-muted">
                          <div className="w-4 h-4 border-2 border-cyan border-t-transparent rounded-full animate-spin" />
                          Loading comments...
                        </div>
                      ) : (
                        <CommentSection
                          comments={cp.comments[post.id] ?? []}
                          onAddComment={(text) => cp.handleAddComment(post.id, text)}
                          currentUserId={cp.user?.id}
                          onDeleteComment={(commentId) =>
                            cp.handleDeleteComment(post.id, commentId)
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Load more */}
              {cp.hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={cp.handleLoadMore}
                    disabled={cp.loadingMore}
                    aria-label="Load more posts"
                  >
                    {cp.loadingMore ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: sidebar (desktop only) */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-4 sticky top-24 self-start">
          <TrendingSidebar
            onHashtagClick={cp.handleHashtagClick}
            getTrendingHashtags={cp.getTrendingHashtags}
          />

          <ErrorBoundary fallback={<WidgetErrorFallback name="tournaments" />}>
            <LiveTournamentsWidget />
          </ErrorBoundary>

          <ErrorBoundary fallback={<WidgetErrorFallback name="listings" />}>
            <HotListingsWidget />
          </ErrorBoundary>

          {/* Community guidelines card */}
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-2">
            <h3 className="font-heading text-xs tracking-wide text-text">
              Community Rules
            </h3>
            <ul className="space-y-1.5 text-[11px] text-text-muted">
              <li className="flex items-start gap-1.5">
                <span className="text-green mt-0.5">✓</span>
                Be respectful to all members
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-green mt-0.5">✓</span>
                No spam, scams, or self-promotion
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-green mt-0.5">✓</span>
                Keep content gaming-related
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-green mt-0.5">✓</span>
                Use appropriate topics for posts
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red mt-0.5">✗</span>
                No hate speech or harassment
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Liked-by Modal */}
      <Modal open={cp.likersModal.open} onClose={cp.closeLikersModal} width="sm">
        <h3 className="text-base font-bold font-heading text-text mb-4">Liked by</h3>
        {cp.likersModal.loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-cyan" />
          </div>
        ) : cp.likersModal.likers.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No likes yet</p>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {cp.likersModal.likers.map((liker) => {
              const name = liker.full_name ?? "Anonymous";
              return (
                <div key={liker.id} className="flex items-center gap-3">
                  {liker.avatar_url ? (
                    <Image
                      src={liker.avatar_url}
                      alt={name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-cyan/20 text-cyan">
                      {getInitials(name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{name}</p>
                    {liker.gamertag && (
                      <p className="text-[11px] text-text-muted">@{liker.gamertag}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <PillarQuickNav current="community" />

      {cp.reportingPost && (
        <ReportModal
          postId={cp.reportingPost}
          onReport={cp.reportPost}
          onClose={() => cp.setReportingPost(null)}
        />
      )}
    </section>
  );
}
