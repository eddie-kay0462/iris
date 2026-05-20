"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMyOrderByNumber, useGuestOrderByNumber } from "@/lib/api/orders";
import { hasToken } from "@/lib/api/client";
import { Loader2 } from "lucide-react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  useEffect(() => {
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

  if (!orderNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No order number found.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Could not load your order details.{" "}
          {isSignedIn ? (
            <>
              Please check{" "}
              <Link href="/orders" className="underline">
                your orders
              </Link>{" "}
              for status.
            </>
          ) : (
            "Please check your email for your order confirmation."
          )}
        </p>
      </div>
    );
  }

  if (isLoading || !isPaid) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500 dark:text-gray-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Verifying payment...
        </h1>

        {orderNumber && (
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Order number:{" "}
            <span className="font-semibold">{orderNumber}</span>
          </p>
        )}

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Please wait while we confirm your payment. This usually takes a few
          seconds.
        </p>
      </div>
    );
  }

  const subtotal = order.subtotal ?? 0;
  const shippingCost = order.shipping_cost ?? 0;
  const total = order.total ?? 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <svg
            className="h-8 w-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Order Confirmed!
      </h1>

      <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
        Order number:{" "}
        <span className="font-semibold">{order.order_number}</span>
      </p>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Thank you for your purchase. You can track your order status below.
      </p>

      {order.order_items && order.order_items.length > 0 && (
        <div className="mt-8 rounded-lg border border-gray-200 p-4 text-left dark:border-gray-700">
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Order Summary
          </h2>
          <div className="space-y-2">
            {order.order_items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between text-sm text-gray-700 dark:text-gray-300"
              >
                <span>
                  {item.product_name}
                  {item.variant_title ? ` — ${item.variant_title}` : ""}
                  {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                </span>
                <span>GH₵ {item.total_price.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 dark:border-gray-700">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Subtotal</span>
              <span>GH₵ {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Shipping</span>
              <span>GH₵ {shippingCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-900 dark:text-white">
              <span>Total</span>
              <span>GH₵ {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {isSignedIn && (
          <Link
            href="/orders"
            className="inline-block rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black"
          >
            View my orders
          </Link>
        )}
        <Link
          href="/products"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
