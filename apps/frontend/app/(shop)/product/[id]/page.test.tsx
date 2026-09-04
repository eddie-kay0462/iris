import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Regression cover for the cold-cache PDP crash.
 *
 * A product link straight from Google (or any share) lands with an empty React
 * Query cache, so the page renders once while loading and again once the
 * product arrives. Any hook called below those early returns runs only on the
 * second render, and React throws "Rendered more hooks than during the previous
 * render." — surfacing as the site's 500 page.
 *
 * In-site navigation hid this: ProductCard prefetches the product on hover, so
 * the first render already has data. These tests therefore drive the *cold*
 * path deliberately, with `apiClient` resolving asynchronously.
 */

let currentQuery = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(currentQuery),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/product/clogs",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

vi.mock("framer-motion", () => {
  const passthrough = new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) => {
          const domProps = Object.fromEntries(
            Object.entries(rest).filter(([k]) => k === "className" || k === "style"),
          );
          return <div {...domProps}>{children as React.ReactNode}</div>;
        },
    },
  );
  return { motion: passthrough, AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</> };
});

vi.mock("@/hooks/useImagePrefetch", () => ({
  prefetchImage: vi.fn(),
  useImagePrefetch: vi.fn(),
}));

vi.mock("@/lib/cart", () => ({ useCart: () => ({ addItem: vi.fn(), items: [] }) }));
vi.mock("@/lib/locale/locale-provider", () => ({
  useLocale: () => ({ formatPrice: (n: number) => `GHS ${n}` }),
}));
vi.mock("@/lib/favourites", () => ({
  useToggleFavourite: () => ({ isFavourited: false, toggle: vi.fn() }),
}));
vi.mock("@/lib/recently-viewed", () => ({
  addRecentlyViewed: vi.fn(),
  useRecentlyViewed: () => ({ items: [] }),
}));
vi.mock("@/lib/api/recommendations", () => ({
  useSimilarProducts: () => ({ data: [] }),
}));
vi.mock("../../components/ProductCard", () => ({ ProductCard: () => null }));

/**
 * The only network seam. Everything above it — useProduct, useProducts and
 * crucially useBundleOfferFor — stays real so the hook order under test is the
 * production one.
 */
const apiClient = vi.fn(async (path: string) => {
  if (path.startsWith("/products/")) return product;
  if (path.startsWith("/products")) return { data: [] };
  if (path.startsWith("/promos/bundles")) return [];
  return null;
});
vi.mock("@/lib/api/client", () => ({
  apiClient: (path: string) => apiClient(path),
  getToken: () => null,
}));

import ProductDetailPage from "./page";

function variant(color: string, size: string) {
  return {
    id: `${color}-${size}`,
    option1_name: "Color",
    option1_value: color,
    option2_name: "Size",
    option2_value: size,
    // Mirrors the live `clogs` data: every variant is out of stock.
    inventory_quantity: 0,
    available: true,
    preorder_enabled: false,
    price: 450,
    compare_at_price: null,
    image_id: null,
    sku: `${color}-${size}`,
  };
}

function image(id: string, position: number, tags: string[]) {
  return {
    id,
    src: `https://example.test/${id}.jpg`,
    alt_text: null,
    position,
    color_tags: tags,
  };
}

let product: Record<string, unknown>;

/**
 * `use()` reads a settled thenable synchronously via its `status`/`value`
 * fields. Handing it one already fulfilled keeps the route out of Suspense,
 * which jsdom never flushes — the point here is the data-loading render pass
 * inside the page, not Next's params plumbing.
 */
function resolvedParams(id: string) {
  const value = { id };
  return Object.assign(Promise.resolve(value), { status: "fulfilled", value });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProductDetailPage params={resolvedParams("clogs")} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  currentQuery = "";
  apiClient.mockClear();
  product = {
    id: "prod-1",
    handle: "clogs",
    title: "Clogs",
    base_price: 450,
    description: "A clog.",
    vendor: null,
    product_variants: [
      variant("Forest Green", "38"),
      variant("Forest Green", "39"),
      variant("Black", "38"),
      variant("Black", "39"),
    ],
    product_images: [
      image("img-green", 0, ["Forest Green"]),
      image("img-black", 1, ["Black"]),
    ],
  };
});

/**
 * The chosen value for an option group, read from the label that sits opposite
 * the group name. Returns null when nothing is selected — the swatch buttons
 * repeat these strings, so a plain text query is ambiguous.
 */
function selectedValueFor(groupName: string): string | null {
  // The group name also appears elsewhere on the page (e.g. the size guide), so
  // match only the heading span inside an option group's label row.
  const label = screen
    .getAllByText(groupName, { selector: "span" })
    .find((el) => el.parentElement?.className.includes("justify-between"));
  if (!label) throw new Error(`No option group labelled "${groupName}"`);
  const spans = label.parentElement!.querySelectorAll("span");
  return spans.length > 1 ? spans[1].textContent : null;
}

describe("product detail page, cold cache", () => {
  it("renders without a color param", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Clogs" })).toBeInTheDocument();
  });

  it("renders with a color param", async () => {
    currentQuery = "color=Black";
    renderPage();
    expect(await screen.findByRole("heading", { name: "Clogs" })).toBeInTheDocument();
  });

  it("preselects the color from the URL", async () => {
    currentQuery = "color=Black";
    renderPage();
    await screen.findByRole("heading", { name: "Clogs" });
    expect(selectedValueFor("Color")).toBe("Black");
  });

  it("falls back to the first variant's color when none is given", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Clogs" });
    expect(selectedValueFor("Color")).toBe("Forest Green");
  });

  it("leaves size unselected so the shopper has to pick one", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Clogs" });
    expect(selectedValueFor("Size")).toBeNull();
  });

  it("still shows the gallery when the selected color has no tagged image", async () => {
    // "Forest Green" is a variant option, but no image carries that tag — the
    // gallery must fall back to the full set rather than render an empty box.
    (product.product_images as unknown[]) = [image("img-only", 0, ["Khaki"])];
    renderPage();
    await screen.findByRole("heading", { name: "Clogs" });
    expect(document.querySelectorAll("img").length).toBeGreaterThan(0);
  });
});
