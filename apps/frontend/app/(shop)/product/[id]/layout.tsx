import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { getProductServer, productPath } from "@/lib/api/products.server";

type LayoutParams = { params: Promise<{ id: string }> };

function priceFor(product: NonNullable<Awaited<ReturnType<typeof getProductServer>>>) {
  const variantPrice = product.product_variants?.find((v) => v.price != null)?.price;
  return variantPrice ?? product.base_price ?? null;
}

function inStock(product: NonNullable<Awaited<ReturnType<typeof getProductServer>>>) {
  return (product.product_variants ?? []).some(
    (v) => v.inventory_quantity > 0 && v.available !== false,
  );
}

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductServer(id);

  if (!product) {
    return { title: "Product Not Found" };
  }

  const title = product.seo_title || product.title;
  const description =
    product.seo_description ||
    product.description ||
    `Shop ${product.title} by 1NRI — Ghana-made contemporary streetwear, designed in Accra and built to last.`;
  const image = product.product_images?.[0]?.src;

  return {
    title,
    description,
    alternates: {
      canonical: productPath(product),
    },
    openGraph: {
      title: `${product.title} | 1NRI`,
      description,
      type: "website",
      url: `${SITE_URL}${productPath(product)}`,
      images: image
        ? [{ url: image, width: 800, height: 800, alt: `${product.title} by 1NRI` }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | 1NRI`,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductServer(id);

  if (!product) return <>{children}</>;

  const url = `${SITE_URL}${productPath(product)}`;
  const price = priceFor(product);
  const image = product.product_images?.[0]?.src;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: image ?? undefined,
    sku: product.product_variants?.[0]?.sku ?? undefined,
    brand: {
      "@type": "Brand",
      name: "1NRI Worldwide",
    },
    ...(price != null && {
      offers: {
        "@type": "Offer",
        priceCurrency: "GHS",
        price,
        availability: inStock(product)
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url,
        seller: {
          "@type": "Organization",
          name: "1NRI Worldwide",
        },
      },
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Products", item: `${SITE_URL}/products` },
      { "@type": "ListItem", position: 3, name: product.title, item: url },
    ],
  };

  return (
    <>
      {children}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
