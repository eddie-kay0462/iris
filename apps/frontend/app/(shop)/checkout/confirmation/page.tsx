"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Check } from "lucide-react";
import { useMyOrderByNumber, useGuestOrderByNumber } from "@/lib/api/orders";
import { hasToken } from "@/lib/api/client";
import { track } from "@/lib/analytics/tracker";
import { fmt } from "../../account/atoms";

const sectionLabelCls =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted font-mono";

/* ---------- Shared item + totals rendering (editorial monochrome) ---------- */
function ItemRow({
  name,
  variant,
  quantity,
  price,
}: {
  name: string;
  variant?: string | null;
  quantity: number;
  price: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line-subtle py-3">
      <div className="min-w-0">
        <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-text truncate">
          {name}
        </div>
        <div className="mt-0.5 text-[11px] text-text-muted">
          {variant ? `${variant} · ` : ""}Qty {quantity}
        </div>
      </div>
      <div className="whitespace-nowrap text-[12px] font-medium text-text">
        {fmt(price)}
      </div>
    </div>
  );
}

function Totals({
  subtotal,
  shippingCost,
  processingFee,
  total,
}: {
  subtotal: number;
  shippingCost: number;
  processingFee: number;
  total: number;
}) {
  const line =
    "flex items-center justify-between text-[11px] text-text-muted";
  return (
    <div className="mt-4 space-y-2.5">
      <div className={line}>
        <span className="font-mono uppercase tracking-[0.1em]">Subtotal</span>
        <span className="tabular-nums">{fmt(subtotal)}</span>
      </div>
      <div className={line}>
        <span className="font-mono uppercase tracking-[0.1em]">Shipping</span>
        <span className="tabular-nums">{fmt(shippingCost)}</span>
      </div>
      <div className={line}>
        <span className="font-mono uppercase tracking-[0.1em]">Fees (1.95%)</span>
        <span className="tabular-nums">{fmt(processingFee)}</span>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-3 text-[13px] font-semibold text-text">
        <span className="uppercase tracking-[0.04em]">Total</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}

/* ---------- Centered editorial status shell for non-confirmed states ---------- */
function StatusShell({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-20">
      <div className="flex justify-center">{icon}</div>
      <div className={`${sectionLabelCls} mt-6`}>{eyebrow}</div>
      <h1 className="mt-2 text-[28px] font-bold uppercase leading-none tracking-[-0.01em] text-text">
        {title}
      </h1>
      {children}
    </div>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  useEffect(() => {
    // Auth token + guest token are client-only; read them once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSignedIn(hasToken());
    setGuestToken(sessionStorage.getItem("iris_guest_token"));
  }, []);

  const signedInQuery = useMyOrderByNumber(isSignedIn ? orderNumber : "");
  const guestQuery = useGuestOrderByNumber(
    !isSignedIn ? orderNumber : "",
    !isSignedIn ? guestToken : null,
  );

  const { data: order, isLoading, isError } = isSignedIn ? signedInQuery : guestQuery;

  const isPaid = order?.payment_status === "paid";

  // Fire the purchase event once per order (deduped across refreshes).
  useEffect(() => {
    if (!order || !isPaid) return;
    const dedupeKey = `iris_p_${order.order_number}`;
    try {
      if (localStorage.getItem(dedupeKey)) return;
      localStorage.setItem(dedupeKey, "1");
    } catch {
      // storage unavailable — still track, worst case a duplicate
    }
    track("purchase", { orderId: order.id, value: order.total ?? 0 });
  }, [order, isPaid]);

  if (!orderNumber) {
    return (
      <StatusShell
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line" />
        }
        eyebrow="Order"
        title="No Order Found"
      >
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-text-muted">
          We couldn&apos;t find an order reference in this link.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted transition-colors hover:text-text"
        >
          Continue shopping
        </Link>
      </StatusShell>
    );
  }

  if (isError) {
    return (
      <StatusShell
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line" />
        }
        eyebrow="Order"
        title="Couldn't Load Order"
      >
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-text-muted">
          {isSignedIn ? (
            <>
              Please check{" "}
              <Link href="/orders" className="text-text underline">
                your orders
              </Link>{" "}
              for status.
            </>
          ) : (
            "Please check your email for your order confirmation."
          )}
        </p>
      </StatusShell>
    );
  }

  if (isLoading || !isPaid) {
    return (
      <StatusShell
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line">
            <Loader2 className="h-6 w-6 animate-spin text-text" />
          </div>
        }
        eyebrow="Payment"
        title="Verifying Payment"
      >
        {orderNumber && (
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted font-mono">
            {orderNumber}
          </p>
        )}
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-text-muted">
          Please wait while we confirm your payment. This usually takes a few seconds.
        </p>
      </StatusShell>
    );
  }

  const subtotal = order.subtotal ?? 0;
  const shippingCost = order.shipping_cost ?? 0;
  const processingFee = order.processing_fee ?? 0;
  const total = order.total ?? 0;
  const preorders = order.preorders ?? [];
  const items = order.order_items ?? [];
  const onlyPreorders = items.length === 0 && preorders.length > 0;

  const primaryHref = isSignedIn ? "/orders" : `/track?order=${order.order_number}`;
  const primaryLabel = isSignedIn ? "View my orders" : "Track my order";

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-20">
      {/* Success header */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-invert-bg">
          <Check className="h-6 w-6 text-invert-fg" strokeWidth={2.5} />
        </div>
        <div className={`${sectionLabelCls} mt-6`}>Order Confirmed</div>
        <h1 className="mt-2 text-[28px] font-bold uppercase leading-none tracking-[-0.01em] text-text">
          Thank You
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-text-muted">
          Your order{" "}
          <span className="font-mono font-medium text-text">
            {order.order_number}
          </span>{" "}
          is confirmed. And with it, you&apos;ve moved us one step further down the{" "}
          <Link
            href="/"
            className="font-medium text-text underline decoration-line-strong underline-offset-2 transition-colors hover:decoration-invert-bg"
          >
            Road to HQ
          </Link>{" "}
          - thank you for riding with us.{" "}
          {isSignedIn
            ? "Track your order status any time from your account."
            : "Use the button below to track your order status any time."}
        </p>
      </div>

      {/* Pre-order items */}
      {preorders.length > 0 && (
        <div className="mt-12">
          <div className={`${sectionLabelCls} mb-3`}>Pre-order Items</div>
          <div className="mb-1 border-l-2 border-invert-bg bg-surface-subtle px-4 py-3 text-[12px] leading-[1.5] text-text-secondary">
            These aren&apos;t in stock yet - they ship separately within 10-15 working days. We&apos;ll
            notify you when they&apos;re on the way.
          </div>
          <div className="border-t border-line">
            {preorders.map((pre) => (
              <ItemRow
                key={pre.id}
                name={pre.product_name}
                variant={pre.variant_title}
                quantity={pre.quantity}
                price={pre.unit_price * pre.quantity}
              />
            ))}
          </div>
          {onlyPreorders && (
            <Totals subtotal={subtotal} shippingCost={shippingCost} processingFee={processingFee} total={total} />
          )}
        </div>
      )}

      {/* Order summary */}
      {items.length > 0 && (
        <div className="mt-12">
          <div className={`${sectionLabelCls} mb-3`}>Order Summary</div>
          <div className="border-t border-line">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                name={item.product_name}
                variant={item.variant_title}
                quantity={item.quantity}
                price={item.total_price}
              />
            ))}
          </div>
          <Totals subtotal={subtotal} shippingCost={shippingCost} processingFee={processingFee} total={total} />
        </div>
      )}

      {/* Actions */}
      <div className="mt-12 flex flex-col gap-3">
        <Link
          href={primaryHref}
          className="flex h-11 w-full items-center justify-center bg-invert-bg text-[11px] font-semibold uppercase tracking-[0.16em] text-invert-fg transition-colors hover:opacity-90"
        >
          {primaryLabel}
        </Link>
        <Link
          href="/products"
          className="flex h-11 w-full items-center justify-center border border-line text-[11px] font-semibold uppercase tracking-[0.16em] text-text transition-colors hover:border-invert-bg"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl px-4 py-16 text-center text-[13px] font-mono uppercase tracking-[0.1em] text-text-muted">
          Loading…
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
