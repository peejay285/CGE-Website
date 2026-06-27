import type { Metadata } from "next";
import { Sora, Orbitron, Rajdhani, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { isEnvValid } from "@/lib/env";
import { StructuredData } from "@/components/structured-data";
import {
  getCanonicalSiteUrl,
  isProductionDeployment,
  shouldDisableIndexing,
} from "@/lib/site-config";

if (!isEnvValid && isProductionDeployment()) {
  throw new Error("Invalid production environment configuration");
}

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "CGE | Nigeria's Gaming Platform — Esports, Marketplace, Community & Lounge",
    template: "%s | CGE Gaming",
  },
  description:
    "Nigeria's gaming platform — esports tournaments nationwide, a peer-to-peer gaming marketplace with safe swaps, a community for gamers across the country, and our first physical lounge on Bonny Island.",
  keywords: [
    "gaming Nigeria", "esports tournaments Nigeria", "gaming marketplace Nigeria",
    "swap gaming gear", "Nigerian gamers community", "PS5 gaming", "PS4 gaming",
    "VR gaming", "FIFA tournament", "Tekken tournament", "CGE",
    "Creative Gaming Entertainment", "Bonny Island gaming lounge",
  ],
  authors: [{ name: "Creative Gaming Entertainment" }],
  creator: "CGE",
  metadataBase: new URL(getCanonicalSiteUrl()),
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "CGE — Creative Gaming Entertainment",
    title: "CGE | Nigeria's Gaming Platform",
    description:
      "Esports tournaments, peer-to-peer marketplace, gaming community, and physical lounges. Built for Nigerian gamers.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "CGE Gaming Lounge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CGE | Creative Gaming Entertainment",
    description:
      "Nigeria's gaming platform — tournaments, marketplace, community, and lounges. First branch on Bonny Island.",
    images: ["/og-image.jpg"],
  },
  robots: shouldDisableIndexing()
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      }
    : {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sora.variable} ${orbitron.variable} ${rajdhani.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <StructuredData />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-cyan focus:text-base focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold"
        >
          Skip to main content
        </a>
        <AppShell>{children}</AppShell>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#18181B",
              color: "#FAFAFA",
              border: "1px solid #27272A",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
