import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: "Your Profile",
  description: "Manage your CGE profile, bookings, payout details, and verification.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary section="your profile">{children}</ErrorBoundary>;
}
