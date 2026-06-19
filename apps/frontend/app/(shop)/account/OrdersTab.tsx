"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useMyOrders } from "@/lib/api/orders";
import { prefetchImage } from "@/hooks/useImagePrefetch";
import { StatusPip, EndLabel, fmt, fmtDate, supabaseImg } from "./atoms";
import type { Order } from "@/lib/api/orders";
import type { Product } from "@/lib/api/products";

export default function OrdersTab() {
  const { data, isLoading } = useMyOrders({ limit: 100 });
  const orders = data?.data ?? [];
  const [expanded, setExpanded] = useState<string | null>(null);
  // Keyed by variant_id (preferred) or product_id (fallback)
  const [imgMap, setImgMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (orders.length > 0) fetchImages(orders);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function fetchImages(orders: Order[]) {
    // Build a map: product_id → Set of variant_ids used in these orders
    const productVariants = new Map<string, Set<string>>();
    for (const order of orders) {
      for (const item of order.order_items ?? []) {
        if (!item.product_id) continue;
        if (!productVariants.has(item.product_id)) {
          productVariants.set(item.product_id, new Set());
        }
        if (item.variant_id) productVariants.get(item.product_id)!.add(item.variant_id);
      }
    }
    if (productVariants.size === 0) return;

    const productIds = [...productVariants.keys()];
    const results = await Promise.allSettled(
      productIds.map((id) => apiClient<Product>(`/products/${id}`)),
    );

    const map: Record<string, string> = {};
    results.forEach((result, idx) => {
      if (result.status !== "fulfilled") return;
      const product = result.value;
      const productId = productIds[idx];
      const images = product.product_images ?? [];

      // Store variant-specific images (keyed by variant_id)
      for (const variantId of productVariants.get(productId) ?? []) {
        const variantImg = images.find((img) => img.variant_id === variantId);
        const src = variantImg?.src ?? null;
        const url = supabaseImg(src);
        if (url) map[variantId] = url;
      }

      // Store product-level fallback (keyed by product_id)
      const fallback =
        images.find((img) => img.image_type === "product") ?? images[0];
      const fallbackUrl = supabaseImg(fallback?.src);
      if (fallbackUrl) map[productId] = fallbackUrl;
    });

    setImgMap(map);
  }

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  // Prefetch all product images for an order via /_next/image so they're cache hits on expand
  function prefetchOrderImages(order: Order) {
    for (const item of order.order_items ?? []) {
      const url =
        (item.variant_id ? imgMap[item.variant_id] : null) ??
        (item.product_id ? imgMap[item.product_id] : null);
      if (url) prefetchImage(url, 800, 75);
    }
  }

  return (
    <div>
      {/* Hero */}
      <div
        className="relative h-[25rem] overflow-hidden bg-[#f5f5f5] dark:bg-[#111] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/orders-cover.jpg)", backgroundPosition: "center 50%" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/55 flex flex-col justify-end p-6">
          <div className="text-[28px] font-bold text-white uppercase tracking-[-0.01em] leading-none">
            Your Orders
          </div>
          <div className="mt-1 text-[11px] text-white/65 tracking-[0.04em]">
            {isLoading
              ? "Loading…"
              : `${orders.length} order${orders.length !== 1 ? "s" : ""} placed`}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="border-t border-[#e5e5e5] dark:border-neutral-800 mt-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[52px] border-b border-[#f0f0f0] dark:border-neutral-900 bg-[#fafafa] dark:bg-[#111]"
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-[60px] text-[13px] text-[#999] dark:text-neutral-500">
          No orders yet.
        </div>
      ) : (
        <div className="border-t border-[#e5e5e5] dark:border-neutral-800 mt-8">
          {orders.map((order) => (
            <div key={order.id}>
              <div
                className="grid grid-cols-[1fr_auto_auto_20px] gap-6 max-sm:gap-3 items-center py-4 cursor-pointer border-b border-[#f0f0f0] dark:border-neutral-900 transition-colors duration-150 hover:bg-[#fafafa] dark:hover:bg-neutral-900"
                onClick={() => toggle(order.id)}
                onMouseEnter={() => prefetchOrderImages(order)}
                onTouchStart={() => prefetchOrderImages(order)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && toggle(order.id)}
                aria-expanded={expanded === order.id}
              >
                <div>
                  <div className="text-[13px] font-medium text-[#111] dark:text-[#ededed]">
                    {order.order_number}
                  </div>
                  <div className="text-[11px] text-[#999] dark:text-neutral-500 mt-0.5">
                    {fmtDate(order.created_at)}
                  </div>
                </div>
                <StatusPip status={order.status} />
                <div className="text-[13px] font-medium text-right min-w-[80px] text-[#111] dark:text-[#ededed]">
                  {fmt(order.total)}
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`text-[#111] dark:text-[#ededed] flex-shrink-0 transition-transform duration-[250ms] ${expanded === order.id ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              {expanded === order.id && (
                <div className="border-b border-[#f0f0f0] dark:border-neutral-900">
                  <div className="order-detail-inner pt-2 pb-5 flex flex-col gap-3">
                    {(order.order_items ?? []).map((item, i) => {
                      const imgUrl =
                        (item.variant_id ? imgMap[item.variant_id] : null) ??
                        (item.product_id ? imgMap[item.product_id] : null) ??
                        null;
                      return (
                        <div key={item.id ?? i} className="flex gap-3.5 items-center">
                          <div
                            className="w-14 h-[70px] flex-shrink-0 bg-[#f5f5f5] dark:bg-[#1a1a1a] bg-cover bg-center bg-no-repeat"
                            style={imgUrl ? { backgroundImage: `url(${imgUrl})` } : undefined}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#111] dark:text-[#ededed]">
                              {item.product_name}
                            </div>
                            <div className="text-[11px] text-[#999] dark:text-neutral-500 mt-0.5">
                              {item.variant_title ? `${item.variant_title} · ` : ""}Qty{" "}
                              {item.quantity}
                            </div>
                          </div>
                          <div className="text-[12px] font-medium text-[#111] dark:text-[#ededed]">
                            {fmt(item.unit_price)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <EndLabel>End of orders</EndLabel>
    </div>
  );
}
