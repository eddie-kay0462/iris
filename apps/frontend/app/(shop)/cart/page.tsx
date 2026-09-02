"use client";

import Link from "next/link";
import { outlineButton } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale/locale-provider";
import VolumeNudge from "@/app/(shop)/components/VolumeNudge";

export default function CartPage() {
  const { items, subtotal, removeItem, updateQuantity } = useCart();
  const { formatPrice } = useLocale();

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
        <p className="select-none text-[64px] font-semibold leading-none tracking-tight text-fill sm:text-[96px]">
          0/1NRI
        </p>
        <p className="mt-6 text-[13px] uppercase tracking-[0.2em] text-text-secondary">
          Your cart is running on empty
        </p>
        <p className="mt-2 max-w-xs text-[12px] leading-relaxed tracking-[0.04em] text-text-placeholder">
          Nothing in here yet. The fit doesn&apos;t build itself - go find
          something worth carrying.
        </p>
        <Link
          href="/products"
          className={`mt-8 px-8 py-3 ${outlineButton}`}
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-text">
        Cart ({items.length} {items.length === 1 ? "item" : "items"})
      </h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex gap-4 rounded-lg border border-line p-4"
          >
            {/* Image */}
            {item.image ? (
              <img
                src={item.image}
                alt={item.productTitle}
                className="h-24 w-24 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md bg-fill text-xs text-text-muted">
                No image
              </div>
            )}

            {/* Details */}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link
                  href={`/product/${item.productId}`}
                  className="font-medium text-text hover:underline"
                >
                  {item.productTitle}
                </Link>
                {item.variantTitle && (
                  <p className="text-sm text-text-secondary">
                    {item.variantTitle}
                  </p>
                )}
                {item.isPreorder && (
                  <span className="mt-1 inline-flex w-fit items-center border border-invert-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text">
                    Pre-order · ships in 10-15 working days
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                {/* Quantity controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity - 1)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded border border-line-strong text-text-secondary hover:bg-fill"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-text">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity + 1)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded border border-line-strong text-text-secondary hover:bg-fill"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      removeItem(item.variantId);
                      toast.success(`${item.productTitle} removed from cart.`);
                    }}
                    className="ml-2 flex h-8 w-8 items-center justify-center rounded text-text-muted hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Price */}
                <span className="font-medium text-text">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 border-t border-line pt-6">
        <VolumeNudge className="mb-4 text-sm text-text-secondary" />
        <div className="flex items-center justify-between text-lg font-semibold text-text">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Shipping calculated at checkout.
        </p>

        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-lg bg-invert-bg py-3 text-center text-sm font-semibold text-invert-fg"
        >
          Proceed to checkout
        </Link>

        <Link
          href="/products"
          className="mt-3 block w-full text-center text-sm text-text-secondary hover:text-text"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
