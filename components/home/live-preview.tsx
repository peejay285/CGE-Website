import Link from "next/link";
import Image from "next/image";
import {
  Trophy,
  ShoppingBag,
  Users,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice, timeAgo } from "@/lib/utils";

interface RawTournament {
  id: string;
  title: string;
  game: string;
  date: string;
  status: string;
  prize_pool?: number | null;
}

interface RawListing {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  listing_type: string;
  location_state: string | null;
  created_at: string;
}

interface RawPost {
  id: string;
  content: string;
  topic: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string;
  author: { full_name: string | null; gamertag: string | null } | null;
}

/**
 * Live data preview rail for the homepage. Pulls one upcoming tournament,
 * two recent listings, and two recent community posts. Hides any section
 * that's empty so the homepage never reads "we have nothing for you."
 */
export async function LivePreview() {
  const supabase = await createServerSupabaseClient();

  const nowDate = new Date();
  const sevenDaysAgoDate = new Date(nowDate);
  sevenDaysAgoDate.setDate(nowDate.getDate() - 7);
  const now = nowDate.toISOString();
  const sevenDaysAgo = sevenDaysAgoDate.toISOString();

  const [tournamentsRes, listingsRes, postsRes] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, title, game, date, status, prize_pool")
      .gte("date", now)
      .in("status", ["open", "registration_open", "in_progress"])
      .order("date", { ascending: true })
      .limit(1),
    supabase
      .from("marketplace_listings")
      .select("id, title, price, images, listing_type, location_state, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("community_posts")
      .select(
        "id, content, topic, likes_count, comments_count, created_at, author:profiles!community_posts_author_id_fkey(full_name, gamertag)",
      )
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  const tournament = (tournamentsRes.data as RawTournament[] | null)?.[0];
  const listings = (listingsRes.data as RawListing[] | null) ?? [];
  const posts = ((postsRes.data as unknown) as RawPost[] | null) ?? [];

  // Pre-beta: if everything is empty, hide the rail entirely.
  if (!tournament && listings.length === 0 && posts.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-magenta">
            What&apos;s happening
          </p>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-text mt-1">
            Live across the platform
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tournament && <TournamentCard t={tournament} />}
        {posts.slice(0, 2).map((p) => (
          <PostCard key={p.id} p={p} />
        ))}
        {listings
          .slice(0, tournament ? (posts.length === 2 ? 1 : 2) : posts.length === 2 ? 2 : 4)
          .map((l) => (
            <ListingCard key={l.id} l={l} />
          ))}
      </div>
    </section>
  );
}

function TournamentCard({ t }: { t: RawTournament }) {
  const date = new Date(t.date);
  const dayLabel = date.toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return (
    <Link
      href={`/esports/${t.id}`}
      className="group rounded-xl border border-border bg-surface-alt p-4 hover:border-cyan/40 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-cyan" />
        <span className="text-[10px] uppercase tracking-widest font-semibold text-cyan">
          Tournament
        </span>
      </div>
      <h3 className="text-sm font-bold text-text line-clamp-2 mb-1">
        {t.title}
      </h3>
      <p className="text-xs text-text-muted">{t.game}</p>
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1 text-text-muted">
          <Calendar size={10} />
          {dayLabel}
        </span>
        {t.prize_pool ? (
          <span className="font-semibold text-gold">
            {formatPrice(t.prize_pool)}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[11px] text-cyan flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        View tournament
        <ArrowRight size={10} />
      </p>
    </Link>
  );
}

function ListingCard({ l }: { l: RawListing }) {
  const img = l.images?.[0];
  const isSwap = l.listing_type === "swap" || l.listing_type === "sell_or_swap";
  return (
    <Link
      href="/marketplace"
      className="group rounded-xl border border-border bg-surface-alt overflow-hidden hover:border-magenta/40 transition-colors flex flex-col"
    >
      <div className="aspect-video bg-base relative">
        {img ? (
          <Image
            src={img}
            alt={l.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            📦
          </div>
        )}
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-base/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-magenta">
          <ShoppingBag size={10} />
          {isSwap ? "Swap" : "Sell"}
        </span>
      </div>
      <div className="p-3 flex-1 flex flex-col justify-between">
        <h3 className="text-sm font-bold text-text line-clamp-2 mb-1">
          {l.title}
        </h3>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-text-muted">
            {l.location_state ?? "Nigeria"}
          </span>
          {l.price > 0 && (
            <span className="font-semibold text-cyan">
              {formatPrice(l.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function PostCard({ p }: { p: RawPost }) {
  const name = p.author?.gamertag
    ? `@${p.author.gamertag}`
    : (p.author?.full_name ?? "CGE Member");
  return (
    <Link
      href="/community"
      className="group rounded-xl border border-border bg-surface-alt p-4 hover:border-green/40 transition-colors flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <Users size={14} className="text-green" />
        <span className="text-[10px] uppercase tracking-widest font-semibold text-green">
          Community
        </span>
      </div>
      <p className="text-xs text-text line-clamp-3 mb-3 leading-relaxed">
        {p.content}
      </p>
      <div className="mt-auto flex items-center justify-between text-[11px] text-text-muted">
        <span className="truncate">{name}</span>
        <span className="shrink-0">{timeAgo(p.created_at)}</span>
      </div>
    </Link>
  );
}
