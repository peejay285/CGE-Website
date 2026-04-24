import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming gaming events at CGE Bonny Island. Game nights, tournaments, launch parties, and special community events.",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
