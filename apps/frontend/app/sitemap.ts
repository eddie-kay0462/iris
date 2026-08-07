import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { getPublishedProducts, productPath } from "@/lib/api/products.server";

// Revalidate the sitemap hourly so newly published products get picked up.
export const revalidate = 3600;

// Must mirror the recognized gender/category values in
// app/(shop)/products/page.tsx — these are the only filter combos that get
// their own canonical URL, so they're the only ones worth listing here.
const CATEGORIES = ["Tops", "Bottoms", "Accessories", "Footwear"];
const GENDERS = ["men", "women"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/size-guide`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Key gender × category filtered catalog views — each self-canonicalizes
  // (see products/page.tsx generateMetadata), so they're real, distinct,
  // indexable pages worth surfacing to crawlers rather than relying on
  // internal links alone.
  const filteredCatalogRoutes: MetadataRoute.Sitemap = [
    ...GENDERS.map((gender) => ({
      url: `${SITE_URL}/products?gender=${gender}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...CATEGORIES.map((category) => ({
      url: `${SITE_URL}/products?category=${encodeURIComponent(category)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...GENDERS.flatMap((gender) =>
      CATEGORIES.map((category) => ({
        url: `${SITE_URL}/products?gender=${gender}&category=${encodeURIComponent(category)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ),
  ];

  const products = await getPublishedProducts();
  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}${productPath(product)}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...filteredCatalogRoutes, ...productRoutes];
}
