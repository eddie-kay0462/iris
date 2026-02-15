"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";

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

      {orderNumber && (
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Order number: <span className="font-semibold">{orderNumber}</span>
        </p>
      )}

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Thank you for your purchase. You will receive an email confirmation
        shortly.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/orders"
          className="inline-block rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          View my orders
        </Link>
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
