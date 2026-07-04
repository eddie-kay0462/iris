"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useCart, type CartItem } from "@/lib/cart";

interface RecoverResponse {
  status: "open" | "completed" | "recovered";
  items: CartItem[];
  dropped: number;
}

function RecoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { restoreItems } = useCart();
  const [error, setError] = useState<string | null>(null);
  // Recovery should run exactly once even under React StrictMode double-mount.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (!token) {
      setError("This recovery link is missing or invalid.");
      return;
    }

    (async () => {
      try {
        const data = await apiClient<RecoverResponse>(
          `/analytics/checkout/recover/${token}`,
        );

        if (data.status !== "open") {
          toast.info("This order has already been completed.");
          router.replace("/products");
          return;
        }

        if (data.items.length === 0) {
          toast.error("These items are no longer available.");
          router.replace("/products");
          return;
        }

        restoreItems(data.items);
        if (data.dropped > 0) {
          toast.warning(
            `${data.dropped} item${data.dropped > 1 ? "s are" : " is"} no longer available and ${
              data.dropped > 1 ? "were" : "was"
            } removed.`,
          );
        }
        toast.success("Welcome back - your cart is ready.");
        router.replace("/checkout");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't restore your cart. Please try again.",
        );
      }
    })();
  }, [token, restoreItems, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-600 dark:text-gray-300">{error}</p>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Restoring your cart…
      </p>
    </div>
  );
}

export default function RecoverPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <RecoverContent />
    </Suspense>
  );
}
