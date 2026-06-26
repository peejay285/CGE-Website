import type { MetadataRoute } from "next";
import { getCanonicalSiteUrl, shouldDisableIndexing } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  if (shouldDisableIndexing()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  const baseUrl = getCanonicalSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
