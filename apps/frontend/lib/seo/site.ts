/**
 * Canonical, production base URL for the storefront.
 *
 * SEO artifacts (sitemap, robots, canonical/OG tags) must always point at the
 * real public origin — never at the `NEXT_PUBLIC_SITE_URL` used in local dev
 * (which is http://localhost:3000). Override only via SITE_URL for a staging
 * host if ever needed.
 */
export const SITE_URL =
  process.env.SITE_URL?.replace(/\/$/, "") || "https://storefront.1nri.store";

/** Absolute URL helper for a path on the storefront. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
