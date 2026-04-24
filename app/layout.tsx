import type { Metadata } from "next";
import { Sora, Orbitron, Rajdhani, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { StructuredData } from "@/components/structured-data";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "CGE | Creative Gaming Entertainment — Bonny Island Gaming Lounge",
    template: "%s | CGE Gaming",
  },
  description:
    "Nigeria's premier gaming lounge on Bonny Island. PS4, PS5 & VR gaming, esports tournaments, marketplace, and a thriving gaming community.",
  keywords: [
    "gaming lounge", "bonny island", "PS5 gaming", "PS4 gaming", "VR gaming",
    "esports tournaments Nigeria", "gaming center", "CGE", "Creative Gaming Entertainment",
    "Bonny Island gaming", "FIFA gaming lounge", "Tekken tournament",
  ],
  authors: [{ name: "Creative Gaming Entertainment" }],
  creator: "CGE",
  metadataBase: new URL("https://cge.ng"),
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: "CGE — Creative Gaming Entertainment",
    title: "CGE | Creative Gaming Entertainment — Bonny Island Gaming Lounge",
    description:
      "Premium PS4, PS5 & VR gaming on Bonny Island. Esports tournaments, gaming marketplace, and community.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "CGE Gaming Lounge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CGE | Creative Gaming Entertainment",
    description:
      "Nigeria's premier gaming lounge. PS4, PS5, VR, esports & more on Bonny Island.",
    images: ["/og-image.jpg"],
  },
  robots: {
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
