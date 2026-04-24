import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Session",
  description: "Book your gaming session at CGE. Choose from Main Lounge (PS4), VIP (PS5), or VR Zone. Easy online booking with flexible time slots.",
};

export default function LoungeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
