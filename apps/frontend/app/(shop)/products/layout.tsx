import { SITE_URL } from "@/lib/seo/site";
import { getPublishedProducts, productPath } from "@/lib/api/products.server";

// Title/description/canonical now come from page.tsx's generateMetadata, which
// varies per gender/category/product_type filter combo — layouts can't read
// searchParams, so that logic can't live here anymore.

/**
 * Server layout for the (client-rendered) products catalogue. Its job for SEO is
 * to emit an ItemList of every published product in the server HTML — so crawlers
 * see the product names, prices and URLs even though the interactive grid hydrates
 * on the client. The visual page is untouched.
 */
export default async function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const products = await getPublishedProducts();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "1NRI - All Products",
    url: `${SITE_URL}/products`,
    numberOfItems: products.length,
    itemListElement: products.map((product, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}${productPath(product)}`,
      name: product.title,
    })),
  };

  return (
    <>
      {children}
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}
    </>
  );
}
