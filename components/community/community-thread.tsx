"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { MessageSquare, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community/post-card";
import { CommentSection } from "@/components/community/comment-section";
import { CreatePost } from "@/components/community/create-post";
import { getInitials } from "@/lib/utils";
import { useCommunityPage } from "@/hooks/use-community-page";
import type { CommunityTopic } from "@/lib/types";

const ReportModal = dynamic(() => import("@/components/community/report-modal"), { ssr: false });

interface CommunityThreadProps {
  eventId?: number;
  tournamentId?: number;
  /** Default topic for new posts in this thread. */
  defaultTopic?: CommunityTopic;
  title?: string;
}

export function CommunityThread({
  eventId,
  tournamentId,
  defaultTopic = "general",
  title = "Discussion",
}: CommunityThreadProps) {
  const cp = useCommunityPage({ eventId, tournamentId });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-green" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text">{title}</h3>
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-green/15 text-green text-[10px] font-bold px-1.5">
          {cp.displayPosts.length}
        </span>
      </div>

      {/* Composer */}
      <div className="mb-5">
        {cp.user ? (
          <CreatePost
            onSubmit={cp.handleNewPost}
            onUploadImage={cp.uploadPostImage}
            onSearchUsers={cp.searchUsers}
            defaultTopic={defaultTopic}
          />
        ) : (
          <div className="rounded-xl border border-border bg-surface-alt px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-muted">Sign in to join the discussion.</p>
            <Button size="sm" onClick={() => window.dispatchEvent(new Event("open-auth-modal"))}>
              Sign In
            </Button>
          </div>
        )}
      </div>

      {/* Feed */}
      {cp.loading ? (
        <div className="flex items-center justify-center py-10 text-green">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : cp.displayPosts.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare size={28} className="mx-auto text-text-muted/30 mb-3" />
          <p className="text-sm text-text-muted">No posts yet — start the conversation.</p>
        </div>
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
                onVotePoll={(pollId, optionId) => cp.handleVotePoll(pollId, optionId, post.id)}
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
                      onDeleteComment={(commentId) => cp.handleDeleteComment(post.id, commentId)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {cp.hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={cp.handleLoadMore}
                disabled={cp.loadingMore}
              >
                {cp.loadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Liked-by modal */}
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

      {cp.reportingPost && (
        <ReportModal
          postId={cp.reportingPost}
          onReport={cp.reportPost}
          onClose={() => cp.setReportingPost(null)}
        />
      )}
    </div>
  );
}
