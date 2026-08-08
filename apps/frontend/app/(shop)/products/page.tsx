import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsCatalogClient } from "./ProductsCatalogClient";

const CATEGORIES = ["Tops", "Bottoms", "Accessories", "Footwear"] as const;
const GENDERS = ["men", "women"] as const;
const SUBCATEGORIES: Record<string, string[]> = {
  Tops: ["T-Shirts", "Shirts", "Sweatshirts & Tracksuits"],
  Bottoms: ["Shorts", "Pants"],
  Accessories: ["Bags", "Caps", "Socks"],
  Footwear: ["Mules"],
};

type SearchParams = { [key: string]: string | string[] | undefined };

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) || "";
}

function buildFilterState(searchParams: SearchParams) {
  return {
    gender: firstParam(searchParams.gender),
    category: firstParam(searchParams.category),
    productType: firstParam(searchParams.product_type),
    search: firstParam(searchParams.search),
  };
}

/**
 * Only these gender/category/product_type combinations are "real" filtered
 * pages worth their own canonical + indexing. A free-text search or an
 * unrecognized value still collapses onto the base /products canonical, so we
 * never hand Google a thin or duplicate page for an arbitrary query string.
 */
function isRecognizedFilterState({
  gender,
  category,
  productType,
  search,
}: ReturnType<typeof buildFilterState>): boolean {
  if (search) return false;
  if (gender && !(GENDERS as readonly string[]).includes(gender)) return false;
  if (category && !(CATEGORIES as readonly string[]).includes(category)) return false;
  if (productType) {
    if (!category) return false;
    if (!(SUBCATEGORIES[category] || []).includes(productType)) return false;
  }
  return true;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const state = buildFilterState(sp);
  const recognized = isRecognizedFilterState(state);
  const hasFilter = state.gender || state.category || state.productType;

  if (!recognized || !hasFilter) {
    return {
      title: "Shop All Products",
      description:
        "Browse the full 1NRI collection - contemporary streetwear designed in Accra and made in Ghana. Hoodies, tees, quarter-zips and more, shipped worldwide.",
      // Collapse tag/search/unrecognized filter variants onto the single
      // canonical products URL so they don't compete in search.
      alternates: { canonical: "/products" },
      openGraph: {
        title: "Shop 1NRI - Ghana-Made Streetwear",
        description:
          "Contemporary streetwear designed in Accra, made in Ghana. Browse the full 1NRI collection and shop now.",
      },
    };
  }

  const labelParts: string[] = [];
  if (state.gender) labelParts.push(state.gender === "men" ? "Men's" : "Women's");
  if (state.productType || state.category) labelParts.push(state.productType || state.category);
  const label = labelParts.length > 0 ? labelParts.join(" ") : "All Products";

  const params = new URLSearchParams();
  if (state.gender) params.set("gender", state.gender);
  if (state.category) params.set("category", state.category);
  if (state.productType) params.set("product_type", state.productType);
  const canonicalPath = `/products?${params.toString()}`;

  return {
    title: `${label} | Shop 1NRI`,
    description: `Shop ${label} - contemporary streetwear designed in Accra and made in Ghana, shipped worldwide.`,
    // Each recognized filter combo is a real, distinct page and self-canonicalizes
    // (rather than collapsing to /products) so it can be indexed on its own.
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${label} | 1NRI`,
      description: `Shop ${label} from 1NRI - Ghana-made streetwear.`,
    },
  };
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-4 w-48 animate-pulse rounded bg-fill" />
        </div>
      }
    >
      <ProductsCatalogClient />
    </Suspense>
  );
}
