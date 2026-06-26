import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

interface TournamentMeta {
  title: string;
  game: string;
  date: string;
  time: string;
  prize: string;
  entry_fee: number;
  status: string;
}

const FALLBACK_METADATA: Metadata = {
  title: "Tournament — CGE Esports",
  description:
    "Compete in gaming tournaments across Nigeria. FIFA, Tekken, Mortal Kombat and more. Cash prizes, team competitions, and leaderboards on CGE.",
  openGraph: {
    title: "CGE Esports — Gaming Tournaments in Nigeria",
    description:
      "Compete in tournaments, build teams, climb leaderboards. Cash prizes and achievements.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CGE Esports — Gaming Tournaments in Nigeria",
    description:
      "Compete in tournaments, build teams, climb leaderboards. Cash prizes and achievements.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return FALLBACK_METADATA;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return FALLBACK_METADATA;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("tournaments")
      .select("title, game, date, time, prize, entry_fee, status")
      .eq("id", numericId)
      .maybeSingle<TournamentMeta>();

    if (error || !data) return FALLBACK_METADATA;

    const title = `${data.title} — CGE Esports`;
    const detailParts: string[] = [];
    if (data.game) detailParts.push(data.game);
    if (data.date) detailParts.push(data.date);
    if (data.time) detailParts.push(data.time);
    if (data.prize) detailParts.push(`Prize: ${data.prize}`);
    const description = `${detailParts.join(" · ")}${
      detailParts.length > 0 ? ". " : ""
    }Register and compete on CGE — Nigeria's gaming platform.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url: `/esports/${numericId}`,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return FALLBACK_METADATA;
  }
}

export default function TournamentDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
