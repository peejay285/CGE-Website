import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Esports — Tournaments, Teams & Leaderboards",
  description:
    "Compete in gaming tournaments across Nigeria. FIFA, Tekken, Mortal Kombat and more. Cash prizes, team competitions, leaderboards, and achievements on the web.",
  keywords: [
    "esports Nigeria", "gaming tournaments Lagos", "FIFA tournament",
    "Tekken competition", "CGE esports", "competitive gaming Africa",
  ],
  openGraph: {
    title: "CGE Esports — Gaming Tournaments in Nigeria",
    description: "Compete in tournaments, build teams, climb leaderboards. Cash prizes and achievements.",
  },
};

export default function EsportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
