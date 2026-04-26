import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming gaming events at CGE — game nights, launch parties, and special community events. Hosted at our Bonny Island branch (more locations coming).",
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
