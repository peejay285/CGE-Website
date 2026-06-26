import type { Metadata } from "next";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: "Messages | CGE",
  description: "Chat with buyers and sellers on the CGE Swap Market.",
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary section="messages">{children}</ErrorBoundary>;
}
