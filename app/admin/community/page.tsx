import { requireAdmin } from "@/lib/require-admin";
import {
  CommunityModerationClient,
  type ReportGroup,
  type ReportItem,
  type HiddenPost,
} from "./client";

export const dynamic = "force-dynamic";

interface RawReport {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  created_at: string;
  post: {
    id: string;
    content: string;
    image_url: string | null;
    author_id: string;
    is_hidden: boolean;
    created_at: string;
  } | null;
}

export default async function CommunityModerationPage() {
  const { supabase } = await requireAdmin();

  const [
    { data: reportsData, error: reportsError },
    { data: hiddenData, error: hiddenError },
    { data: blockedData },
  ] = await Promise.all([
    supabase
      .from("post_reports")
      .select(
        "id, post_id, reporter_id, reason, details, created_at, post:community_posts!post_id(id, content, image_url, author_id, is_hidden, created_at)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("community_posts")
      .select("id, content, image_url, author_id, created_at, moderated_at")
      .eq("is_hidden", true)
      .order("moderated_at", { ascending: false }),
    supabase
      .from("community_blocked_words")
      .select("word")
      .order("word", { ascending: true }),
  ]);

  if (reportsError || hiddenError) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center px-4">
        <p className="text-sm text-red">
          Failed to load moderation data: {(reportsError ?? hiddenError)?.message}
        </p>
      </div>
    );
  }

  const rawReports = (reportsData ?? []) as unknown as RawReport[];
  const hiddenRaw = (hiddenData ?? []) as {
    id: string;
    content: string;
    image_url: string | null;
    author_id: string;
    created_at: string;
    moderated_at: string | null;
  }[];

  // Resolve display names for reporters + post authors in one query.
  const ids = new Set<string>();
  rawReports.forEach((r) => {
    ids.add(r.reporter_id);
    if (r.post?.author_id) ids.add(r.post.author_id);
  });
  hiddenRaw.forEach((p) => ids.add(p.author_id));

  const nameById = new Map<string, string | null>();
  if (ids.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, gamertag")
      .in("id", Array.from(ids));
    ((profiles ?? []) as { id: string; full_name: string | null; gamertag: string | null }[]).forEach(
      (p) => nameById.set(p.id, p.gamertag || p.full_name),
    );
  }

  // Group pending reports by post (skip reports whose post was already deleted).
  const groups = new Map<string, ReportGroup>();
  for (const r of rawReports) {
    if (!r.post) continue;
    let g = groups.get(r.post_id);
    if (!g) {
      g = {
        post_id: r.post_id,
        content: r.post.content,
        image_url: r.post.image_url,
        author_name: nameById.get(r.post.author_id) ?? null,
        created_at: r.post.created_at,
        is_hidden: r.post.is_hidden,
        reports: [],
      };
      groups.set(r.post_id, g);
    }
    const item: ReportItem = {
      id: r.id,
      reason: r.reason,
      details: r.details,
      reporter_name: nameById.get(r.reporter_id) ?? null,
      created_at: r.created_at,
    };
    g.reports.push(item);
  }

  const reportGroups = Array.from(groups.values());
  const hiddenPosts: HiddenPost[] = hiddenRaw.map((p) => ({
    id: p.id,
    content: p.content,
    image_url: p.image_url,
    author_name: nameById.get(p.author_id) ?? null,
    created_at: p.created_at,
    moderated_at: p.moderated_at,
  }));

  const blockedWords = ((blockedData ?? []) as { word: string }[]).map((b) => b.word);

  return (
    <CommunityModerationClient
      reportGroups={reportGroups}
      hiddenPosts={hiddenPosts}
      blockedWords={blockedWords}
    />
  );
}
