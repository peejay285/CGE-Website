import type { NextConfig } from "next";

function truthy(value: string | undefined) {
  return value === "1" || value === "true" || value === "yes";
}

function falsey(value: string | undefined) {
  return value === "0" || value === "false" || value === "no";
}

const disableIndexing =
  truthy(process.env.NEXT_PUBLIC_BETA_MODE) ||
  process.env.NEXT_PUBLIC_SITE_PHASE === "beta" ||
  process.env.VERCEL_ENV === "preview" ||
  falsey(process.env.NEXT_PUBLIC_ALLOW_INDEXING);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uornrrryktpigignayre.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  async headers() {
    // 'unsafe-eval' is required only by React Fast Refresh in development.
    // Production drops it — XSS payloads can no longer reach eval().
    // 'unsafe-inline' remains for Next.js's inline runtime scripts; moving
    // to nonces would force every page dynamic, hurting mobile performance.
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = [
      "'self'",
      ...(isDev ? ["'unsafe-eval'"] : []),
      "'unsafe-inline'",
      "https://challenges.cloudflare.com",
    ].join(" ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ...(disableIndexing
            ? [
                {
                  key: "X-Robots-Tag",
                  value: "noindex, nofollow, noarchive",
                },
              ]
            : []),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' https: data: blob:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://challenges.cloudflare.com",
              "frame-src https://www.youtube.com https://youtube.com https://player.twitch.tv https://kick.com https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
              "media-src 'self' https://*.supabase.co",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.paystack.com",
              ...(isDev ? [] : ["upgrade-insecure-requests"]),
            ].join("; ") + ";",
          },
          {
            // geolocation=(self): the signup flow offers optional location
            // detection via useGeolocation — geolocation=() was blocking it.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
