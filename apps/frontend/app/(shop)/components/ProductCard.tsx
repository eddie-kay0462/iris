import Link from "next/link";
import type { Product } from "@/lib/api/products";

export function ProductCard({ product }: { product: Product }) {
  const image = product.product_images?.[0];
  const price = product.base_price;

  return (
    <Link
      href={`/product/${product.handle || product.id}`}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 dark:bg-gray-900">
        {image ? (
          <img
            src={image.src}
            alt={image.alt_text || product.title}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400 dark:text-gray-600">
            No image
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-900 dark:text-gray-100">
          {product.title}
        </h3>
        {price != null && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            GH₵{price.toLocaleString()}
          </p>
        )}
      </div>
    </Link>
  );
}
