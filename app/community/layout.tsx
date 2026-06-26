import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community — Gaming Forum, Discussions & Gamer Network",
  description:
    "Join Nigeria's most active gaming community. Discuss games, share clips, find teammates, and connect with fellow gamers across Africa on the web.",
  keywords: [
    "gaming community Nigeria", "gaming forum Lagos", "gamer network Africa",
    "CGE community", "gaming discussions", "find gaming teammates",
  ],
  openGraph: {
    title: "CGE Community — Nigeria's Gaming Forum & Network",
    description: "Discuss games, share clips, find teammates. Join the conversation with gamers across Africa.",
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
