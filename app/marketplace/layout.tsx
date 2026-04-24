import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace — Buy, Sell & Swap Gaming Gear",
  description:
    "Nigeria's gaming marketplace. Buy, sell, and swap controllers, consoles, games, and accessories with trusted gamers across Africa. Download the CGE app to start trading.",
  keywords: [
    "gaming marketplace Nigeria", "buy gaming gear Lagos", "sell PS5 controller",
    "swap gaming accessories", "CGE marketplace", "gaming trade Africa",
  ],
  openGraph: {
    title: "CGE Marketplace — Buy, Sell & Swap Gaming Gear",
    description: "Trade gaming gear with trusted gamers across Nigeria. Controllers, consoles, games & accessories.",
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
