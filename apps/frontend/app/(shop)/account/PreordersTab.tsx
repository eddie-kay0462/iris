"use client";

import { useMyPreorders } from "@/lib/api/preorders";
import { prefetchImage } from "@/hooks/useImagePrefetch";
import { StatusPip, EndLabel, fmt, fmtDate, supabaseImg } from "./atoms";

export default function PreordersTab() {
  const { data: preorders = [], isLoading } = useMyPreorders();

  return (
    <div>
      {/* Hero */}
      <div
        className="relative h-[25rem] overflow-hidden bg-[#f5f5f5] dark:bg-[#111] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/preorders-cover.jpg)", backgroundPosition: "center 50%" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/55 flex flex-col justify-end p-6">
          <div className="text-[28px] font-bold text-white uppercase tracking-[-0.01em] leading-none">
            Pre-orders
          </div>
          <div className="mt-1 text-[11px] text-white/65 tracking-[0.04em]">
            Reserve upcoming pieces before they drop
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="border-t border-[#e5e5e5] dark:border-neutral-800 mt-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[80px] border-b border-[#f0f0f0] dark:border-neutral-900 bg-[#fafafa] dark:bg-[#111]"
            />
          ))}
        </div>
      ) : preorders.length === 0 ? (
        <div className="text-center py-[60px] text-[13px] text-[#999] dark:text-neutral-500">
          No pre-orders yet.
        </div>
      ) : (
        <div className="border-t border-[#e5e5e5] dark:border-neutral-800 mt-8">
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
                className="flex gap-4 items-start py-5 border-b border-[#f0f0f0] dark:border-neutral-900"
                onMouseEnter={() => image && prefetchImage(image, 800, 75)}
                onTouchStart={() => image && prefetchImage(image, 800, 75)}
              >
                <div
                  className="w-20 h-[100px] flex-shrink-0 bg-[#f5f5f5] dark:bg-[#1a1a1a] bg-cover bg-center bg-no-repeat"
                  style={image ? { backgroundImage: `url(${image})` } : undefined}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-3 mb-1">
                    <div className="text-[13px] font-medium uppercase tracking-[0.02em] text-[#111] dark:text-[#ededed]">
                      {order.product_name}
                    </div>
                    <StatusPip status={order.status} />
                  </div>
                  {variantDisplay && (
                    <div className="text-[11px] text-[#999] dark:text-neutral-500 mb-2">
                      {variantDisplay} · Qty {order.quantity}
                    </div>
                  )}
                  <div className="flex gap-4 text-[11px] text-[#999] dark:text-neutral-500 font-mono flex-wrap">
                    <span>{order.order_number}</span>
                    <span>{fmtDate(order.created_at)}</span>
                    <span className="text-[#111] dark:text-[#ededed]">
                      {fmt(order.unit_price * order.quantity)}
                    </span>
                  </div>
                  {isReady && (
                    <div className="mt-2.5 px-3 py-2.5 bg-[#f5f5f5] dark:bg-[#111] text-[12px] text-[#666] dark:text-neutral-400 border-l-2 border-[#111] dark:border-[#ededed] leading-[1.5]">
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
