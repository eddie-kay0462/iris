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
      <div
        className="tab-hero"
        style={{
          backgroundImage: "url(/images/orders-cover.jpg)",
          backgroundPosition: "center 50%",
        }}
      >
        <div className="tab-hero-overlay">
          <div className="tab-hero-title">Your Orders</div>
          <div className="tab-hero-sub">
            {isLoading
              ? "Loading…"
              : `${orders.length} order${orders.length !== 1 ? "s" : ""} placed`}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="order-list">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ height: 52, borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}
            />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontSize: 13, color: "#999" }}>
          No orders yet.
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => (
            <div key={order.id}>
              <div
                className="order-row"
                onClick={() => toggle(order.id)}
                onMouseEnter={() => prefetchOrderImages(order)}
                onTouchStart={() => prefetchOrderImages(order)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && toggle(order.id)}
                aria-expanded={expanded === order.id}
              >
                <div className="order-info">
                  <div className="order-number">{order.order_number}</div>
                  <div className="order-date">{fmtDate(order.created_at)}</div>
                </div>
                <StatusPip status={order.status} />
                <div className="order-total">{fmt(order.total)}</div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`order-chevron${expanded === order.id ? " open" : ""}`}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              {expanded === order.id && (
                <div className="order-detail">
                  <div className="order-detail-inner">
                    {(order.order_items ?? []).map((item, i) => {
                      // Prefer variant-specific image, fall back to product-level
                      const imgUrl =
                        (item.variant_id ? imgMap[item.variant_id] : null) ??
                        (item.product_id ? imgMap[item.product_id] : null) ??
                        null;
                      return (
                        <div key={item.id ?? i} className="order-item">
                          <div
                            className="order-item-img"
                            style={imgUrl ? { backgroundImage: `url(${imgUrl})` } : undefined}
                          />
                          <div className="order-item-info">
                            <div className="order-item-name">{item.product_name}</div>
                            <div className="order-item-variant">
                              {item.variant_title ? `${item.variant_title} · ` : ""}Qty{" "}
                              {item.quantity}
                            </div>
                          </div>
                          <div className="order-item-price">{fmt(item.unit_price)}</div>
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
