"use client";

import { useMyPreorders } from "@/lib/api/preorders";
import { prefetchImage } from "@/hooks/useImagePrefetch";
import { StatusPip, EndLabel, fmt, fmtDate, supabaseImg } from "./atoms";

export default function PreordersTab() {
  const { data: preorders = [], isLoading } = useMyPreorders();

  return (
    <div>
      <div
        className="tab-hero"
        style={{
          backgroundImage: "url(/images/preorders-cover.jpg)",
          backgroundPosition: "center 50%",
        }}
      >
        <div className="tab-hero-overlay">
          <div className="tab-hero-title">Pre-orders</div>
          <div className="tab-hero-sub">Reserve upcoming pieces before they drop</div>
        </div>
      </div>

      {isLoading ? (
        <div className="order-list">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{ height: 80, borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}
            />
          ))}
        </div>
      ) : preorders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", fontSize: 13, color: "#999" }}>
          No pre-orders yet.
        </div>
      ) : (
        <div className="order-list">
          {preorders.map((order) => {
            const isReady = order.status === "stock_held";
            const rawImage = order.product_variants?.product_images?.[0]?.src ?? null;
            const image = supabaseImg(rawImage);
            const variantParts = [
              order.product_variants?.option1_value,
              order.product_variants?.option2_value,
              order.product_variants?.option3_value,
            ]
              .filter(Boolean)
              .join(" · ");
            const variantDisplay = order.variant_title ?? variantParts ?? "";

            return (
              <div
                key={order.id}
                className="preorder-card"
                onMouseEnter={() => image && prefetchImage(image, 800, 75)}
                onTouchStart={() => image && prefetchImage(image, 800, 75)}
              >
                <div
                  className="preorder-img"
                  style={image ? { backgroundImage: `url(${image})` } : undefined}
                />
                <div className="preorder-body">
                  <div className="preorder-header">
                    <div className="preorder-product">{order.product_name}</div>
                    <StatusPip status={order.status} />
                  </div>
                  {variantDisplay && (
                    <div className="preorder-variant">
                      {variantDisplay} · Qty {order.quantity}
                    </div>
                  )}
                  <div className="preorder-meta">
                    <span>{order.order_number}</span>
                    <span>{fmtDate(order.created_at)}</span>
                    <span className="preorder-price">
                      {fmt(order.unit_price * order.quantity)}
                    </span>
                  </div>
                  {isReady && (
                    <div className="preorder-notice">
                      Your item is ready — our team will reach out to arrange delivery.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EndLabel>End of pre-orders</EndLabel>
    </div>
  );
}
