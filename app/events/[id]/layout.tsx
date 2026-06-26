import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

interface EventMeta {
  title: string;
  date: string;
  time: string;
  description: string | null;
  is_free: boolean;
  price: number | null;
}

const FALLBACK_METADATA: Metadata = {
  title: "Event — CGE Events",
  description:
    "Upcoming gaming events at CGE — game nights, launch parties, and special community events. Hosted at our Bonny Island branch.",
  openGraph: {
    title: "CGE Events — Gaming Events in Nigeria",
    description:
      "Game nights, launch parties, and special community events at CGE.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CGE Events — Gaming Events in Nigeria",
    description:
      "Game nights, launch parties, and special community events at CGE.",
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
      .from("events")
      .select("title, date, time, description, is_free, price")
      .eq("id", numericId)
      .maybeSingle<EventMeta>();

    if (error || !data) return FALLBACK_METADATA;

    const title = `${data.title} — CGE Events`;
    const detailParts: string[] = [];
    if (data.date) detailParts.push(data.date);
    if (data.time) detailParts.push(data.time);
    detailParts.push(
      data.is_free
        ? "Free entry"
        : data.price != null
          ? `Entry: ₦${Number(data.price).toLocaleString("en-NG")}`
          : "Ticketed"
    );
    const summary = data.description
      ? `${data.description.slice(0, 140)}${data.description.length > 140 ? "…" : ""} `
      : "";
    const description = `${summary}${detailParts.join(" · ")} — at CGE, Nigeria's gaming platform.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url: `/events/${numericId}`,
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

export default function EventDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
