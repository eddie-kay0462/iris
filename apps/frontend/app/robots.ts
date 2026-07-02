import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated / transactional routes with no SEO value.
      disallow: [
        "/profile",
        "/orders",
        "/preorders",
        "/cart",
        "/favourites",
        "/checkout",
        "/account",
        "/track",
        "/login",
        "/signup",
        "/reset-password",
        "/update-password",
        "/verify",
        "/sync-session",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
