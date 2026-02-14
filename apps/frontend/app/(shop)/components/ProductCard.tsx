import Link from "next/link";
import type { Product } from "@/lib/api/products";

export function ProductCard({ product }: { product: Product }) {
  const image = product.product_images?.[0];
  const price = product.base_price;
  const comparePrice = product.product_variants?.[0]?.compare_at_price ?? null;
  const isNew =
    new Date(product.created_at) >
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return (
    <Link
      href={`/product/${product.handle || product.id}`}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {image ? (
          <img
            src={image.src}
            alt={image.alt_text || product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No image
          </div>
        )}
        {isNew && (
          <span className="absolute left-2 top-2 rounded bg-black px-2 py-0.5 text-xs font-medium text-white dark:bg-white dark:text-black">
            New
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-medium text-gray-900 group-hover:underline dark:text-gray-100">
          {product.title}
        </h3>
        <div className="flex items-center gap-2">
          {price != null && (
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              ₦{price.toLocaleString()}
            </span>
          )}
          {comparePrice != null && comparePrice > (price || 0) && (
            <span className="text-xs text-gray-400 line-through dark:text-gray-500">
              ₦{comparePrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
