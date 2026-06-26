"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, ShieldAlert, EyeOff, Eye, Trash2, Check, Plus, X, Ban, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { TOPICS } from "@/lib/community-constants";
import type { CommunityTopic } from "@/lib/types";

export interface ReportItem {
  id: string;
  reason: string;
  details: string | null;
  reporter_name: string | null;
  created_at: string;
}

export interface ReportGroup {
  post_id: string;
  content: string;
  image_url: string | null;
  author_name: string | null;
  created_at: string;
  is_hidden: boolean;
  reports: ReportItem[];
}

export interface HiddenPost {
  id: string;
  content: string;
  image_url: string | null;
  author_name: string | null;
  created_at: string;
  moderated_at: string | null;
}

type ModAction = "dismiss" | "hide" | "unhide" | "remove";

function reasonLabel(reason: string) {
  return reason.replace(/_/g, " ");
}

function PostPreview({
  content,
  imageUrl,
  authorName,
  createdAt,
}: {
  content: string;
  imageUrl: string | null;
  authorName: string | null;
  createdAt: string;
}) {
  return (
    <div className="flex gap-3">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-md object-cover border border-border"
        />
      )}
      <div className="min-w-0">
        <p className="text-[11px] text-text-muted">
          {authorName || "Unknown"} · {new Date(createdAt).toLocaleString("en-GB")}
        </p>
        <p className="text-sm text-text whitespace-pre-wrap break-words line-clamp-4">
          {content || <span className="italic text-text-muted">(no text)</span>}
        </p>
      </div>
    </div>
  );
}

export function CommunityModerationClient({
  reportGroups,
  hiddenPosts,
  blockedWords,
}: {
  reportGroups: ReportGroup[];
  hiddenPosts: HiddenPost[];
  blockedWords: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"reports" | "hidden" | "blocklist" | "seed">("reports");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [newWord, setNewWord] = useState("");
  const [wordBusy, setWordBusy] = useState(false);
  const [seedContent, setSeedContent] = useState("");
  const [seedTopic, setSeedTopic] = useState<CommunityTopic>("general");
  const [seedPin, setSeedPin] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);

  async function seedPost() {
    const content = seedContent.trim();
    if (content.length < 3) return;
    setSeedBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSeedBusy(false);
      toast.error("Not signed in");
      return;
    }
    const { error } = await supabase.from("community_posts").insert({
      author_id: user.id,
      content,
      topic: seedTopic,
      is_seeded: true,
      is_pinned: seedPin,
    });
    setSeedBusy(false);
    if (error) {
      toast.error(error.message || "Could not publish");
      return;
    }
    setSeedContent("");
    setSeedPin(false);
    toast.success("Official post published");
    router.refresh();
  }

  async function addWord() {
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    setWordBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("community_blocked_words").insert({ word });
    setWordBusy(false);
    if (error) {
      toast.error(error.message || "Could not add word");
      return;
    }
    setNewWord("");
    toast.success("Added to blocklist");
    router.refresh();
  }

  async function removeWord(word: string) {
    setWordBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("community_blocked_words").delete().eq("word", word);
    setWordBusy(false);
    if (error) {
      toast.error(error.message || "Could not remove word");
      return;
    }
    toast.success("Removed from blocklist");
    router.refresh();
  }

  async function act(postId: string, action: ModAction) {
    setBusyId(postId);
    const supabase = createClient();
    const { error } = await supabase.rpc("moderate_post", {
      p_post_id: postId,
      p_action: action,
    });
    setBusyId(null);
    setConfirmRemoveId(null);
    if (error) {
      toast.error(error.message || "Action failed");
      return;
    }
    toast.success(
      action === "dismiss"
        ? "Reports dismissed"
        : action === "hide"
          ? "Post hidden"
          : action === "unhide"
            ? "Post restored"
            : "Post removed",
    );
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-base">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-magenta" />
          <h1 className="text-lg font-bold font-heading text-text">Community Moderation</h1>
        </div>
        <p className="text-xs text-text-muted">
          Review reported posts. Dismiss clears the reports, Hide removes the post from the feed
          (reversible), Remove deletes it permanently.
        </p>

        <div className="flex gap-2">
          {(
            [
              { key: "reports", label: "Reports", count: reportGroups.length },
              { key: "hidden", label: "Hidden", count: hiddenPosts.length },
              { key: "blocklist", label: "Blocked words", count: blockedWords.length },
              { key: "seed", label: "Seed post", count: undefined },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                tab === t.key
                  ? "bg-magenta/10 text-magenta border-magenta/25"
                  : "bg-surface-alt text-text-muted border-border hover:border-magenta/20",
              )}
            >
              {t.label}
              {t.count !== undefined ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>

        {/* ── Reports ── */}
        {tab === "reports" &&
          (reportGroups.length === 0 ? (
            <div className="text-center py-12 text-sm text-text-muted">No pending reports. 🎉</div>
          ) : (
            <div className="space-y-3">
              {reportGroups.map((g) => {
                const busy = busyId === g.post_id;
                return (
                  <div key={g.post_id} className="rounded-lg border border-border bg-surface p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge color="red" size="sm">
                        {g.reports.length} report{g.reports.length === 1 ? "" : "s"}
                      </Badge>
                      {g.is_hidden && <Badge color="gold" size="sm">Hidden</Badge>}
                    </div>

                    <PostPreview
                      content={g.content}
                      imageUrl={g.image_url}
                      authorName={g.author_name}
                      createdAt={g.created_at}
                    />

                    <div className="space-y-1.5 border-t border-border pt-2">
                      {g.reports.map((r) => (
                        <div key={r.id} className="text-[11px]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-semibold uppercase tracking-wide text-red">
                              {reasonLabel(r.reason)}
                            </span>
                            <span className="text-text-muted">· {r.reporter_name || "Anonymous"}</span>
                          </span>
                          {r.details && (
                            <p className="text-text-muted italic">&ldquo;{r.details}&rdquo;</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => act(g.post_id, "dismiss")}>
                        <Check size={14} /> Dismiss
                      </Button>
                      {!g.is_hidden ? (
                        <Button variant="secondary" size="sm" disabled={busy} onClick={() => act(g.post_id, "hide")}>
                          <EyeOff size={14} /> Hide
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled={busy} onClick={() => act(g.post_id, "unhide")}>
                          <Eye size={14} /> Unhide
                        </Button>
                      )}
                      {confirmRemoveId === g.post_id ? (
                        <Button variant="danger" size="sm" disabled={busy} onClick={() => act(g.post_id, "remove")}>
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Confirm remove
                        </Button>
                      ) : (
                        <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirmRemoveId(g.post_id)}>
                          <Trash2 size={14} /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        {/* ── Hidden ── */}
        {tab === "hidden" &&
          (hiddenPosts.length === 0 ? (
            <div className="text-center py-12 text-sm text-text-muted">No hidden posts.</div>
          ) : (
            <div className="space-y-3">
              {hiddenPosts.map((p) => {
                const busy = busyId === p.id;
                return (
                  <div key={p.id} className="rounded-lg border border-border bg-surface p-3 space-y-3">
                    <PostPreview
                      content={p.content}
                      imageUrl={p.image_url}
                      authorName={p.author_name}
                      createdAt={p.created_at}
                    />
                    <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                      <Button variant="secondary" size="sm" disabled={busy} onClick={() => act(p.id, "unhide")}>
                        <Eye size={14} /> Unhide
                      </Button>
                      {confirmRemoveId === p.id ? (
                        <Button variant="danger" size="sm" disabled={busy} onClick={() => act(p.id, "remove")}>
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          Confirm remove
                        </Button>
                      ) : (
                        <Button variant="danger" size="sm" disabled={busy} onClick={() => setConfirmRemoveId(p.id)}>
                          <Trash2 size={14} /> Remove
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

        {/* ── Blocked words ── */}
        {tab === "blocklist" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-[11px] text-text-muted mb-2">
                Posts or comments containing any of these phrases are rejected automatically
                (case-insensitive substring match). Posting is also rate-limited.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addWord();
                    }
                  }}
                  placeholder="Add a word or phrase…"
                  className="flex-1 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-magenta/40"
                />
                <Button variant="magenta" size="sm" disabled={wordBusy || !newWord.trim()} onClick={addWord}>
                  {wordBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add
                </Button>
              </div>
            </div>

            {blockedWords.length === 0 ? (
              <div className="text-center py-10 text-sm text-text-muted">
                <Ban size={26} className="mx-auto text-text-muted/30 mb-2" />
                No blocked words yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {blockedWords.map((w) => (
                  <span
                    key={w}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-alt pl-3 pr-1.5 py-1 text-xs text-text"
                  >
                    {w}
                    <button
                      type="button"
                      aria-label={`Remove ${w}`}
                      disabled={wordBusy}
                      onClick={() => removeWord(w)}
                      className="rounded-full p-0.5 text-text-muted hover:text-red hover:bg-red/10 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Seed an official post ── */}
        {tab === "seed" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-cyan/20 bg-cyan/5 p-3 flex items-start gap-2">
              <BadgeCheck size={15} className="mt-0.5 shrink-0 text-cyan" />
              <p className="text-[11px] text-text-muted">
                Published as a CGE <span className="text-cyan font-semibold">Official</span> post — it
                carries an Official badge and skips spam checks. Use it to seed quality starter
                threads for each topic.
              </p>
            </div>

            <textarea
              value={seedContent}
              onChange={(e) => setSeedContent(e.target.value)}
              placeholder="Write a starter discussion the community can reply to…"
              rows={5}
              maxLength={2000}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-cyan/40 resize-none"
            />

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={seedTopic}
                onChange={(e) => setSeedTopic(e.target.value as CommunityTopic)}
                className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan/40"
              >
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedPin}
                  onChange={(e) => setSeedPin(e.target.checked)}
                  className="accent-magenta"
                />
                Pin to top
              </label>

              <div className="ml-auto">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={seedBusy || seedContent.trim().length < 3}
                  onClick={seedPost}
                >
                  {seedBusy ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                  Publish official post
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
