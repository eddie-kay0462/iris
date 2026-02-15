"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { Minus, Plus, Trash2 } from "lucide-react";

export default function CartPage() {
  const { items, subtotal, removeItem, updateQuantity } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your cart is empty
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Browse our collection and add items to your cart.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
        Cart ({items.length} {items.length === 1 ? "item" : "items"})
      </h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
          >
            {/* Image */}
            {item.image ? (
              <img
                src={item.image}
                alt={item.productTitle}
                className="h-24 w-24 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">
                No image
              </div>
            )}

            {/* Details */}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link
                  href={`/product/${item.productId}`}
                  className="font-medium text-gray-900 hover:underline dark:text-white"
                >
                  {item.productTitle}
                </Link>
                {item.variantTitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.variantTitle}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                {/* Quantity controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity - 1)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity + 1)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="ml-2 flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Price */}
                <span className="font-medium text-gray-900 dark:text-white">
                  GH₵{(item.price * item.quantity).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
        <div className="flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white">
          <span>Subtotal</span>
          <span>GH₵{subtotal.toLocaleString()}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Shipping calculated at checkout.
        </p>

        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-lg bg-black py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          Proceed to checkout
        </Link>

        <Link
          href="/products"
          className="mt-3 block w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
