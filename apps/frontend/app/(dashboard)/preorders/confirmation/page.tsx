"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMyPreorders } from "@/lib/api/preorders";
import { Loader2 } from "lucide-react";

const fmt = (n: number) =>
  "GH₵" + n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function PreorderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") || "";

  const { data: preorders, isLoading, isError } = useQuery({
    queryKey: ["my-preorders"],
    queryFn: getMyPreorders,
    enabled: !!orderNumber,
  });

  const preorder = preorders?.find((p) => p.order_number === orderNumber);

  if (!orderNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[#59626E] text-sm">No pre-order number found.</p>
        <Link href="/products" className="mt-4 inline-block text-sm text-[#59626E] hover:text-black underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[#59626E] text-sm">
          Could not load your pre-order details. Please check{" "}
          <Link href="/preorders" className="underline text-black">your pre-orders</Link>{" "}
          for status.
        </p>
      </div>
    );
  }

  if (isLoading || !preorder) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f3f1]">
            <Loader2 className="h-8 w-8 animate-spin text-[#59626E]" />
          </div>
        </div>
        <h1 className="text-2xl font-light text-black">Confirming pre-order…</h1>
        {orderNumber && (
          <p className="mt-2 text-sm text-[#59626E]">
            Order number: <span className="font-medium text-black">{orderNumber}</span>
          </p>
        )}
        <p className="mt-4 text-sm text-[#768293]">Please wait a moment.</p>
      </div>
    );
  }

  const total = Number(preorder.unit_price) * preorder.quantity;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="text-[28px] font-light text-black leading-tight">Pre-order Confirmed</h1>

      <p className="mt-2 text-[13px] tracking-[0.12em] uppercase text-[#59626E]">
        {preorder.order_number}
      </p>

      <p className="mt-4 text-sm text-[#59626E] leading-relaxed">
        We&apos;ll notify you as soon as your item is ready. Thank you for pre-ordering with 1NRI.
      </p>

      <div className="mt-8 border border-black/10 p-5 text-left">
        <h2 className="mb-4 text-[11px] tracking-[0.18em] uppercase text-black font-bold">Pre-order Summary</h2>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-[#3B414A]">
            <span>
              {preorder.product_name}
              {preorder.variant_title ? ` - ${preorder.variant_title}` : ""}
              {preorder.quantity > 1 ? ` × ${preorder.quantity}` : ""}
            </span>
            <span>{fmt(Number(preorder.unit_price) * preorder.quantity)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-black/10 pt-4 flex justify-between text-sm font-bold text-black">
          <span>Total paid</span>
          <span>{fmt(total)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/preorders"
          className="inline-block bg-black px-6 py-3 text-[13px] tracking-[0.14em] uppercase font-bold text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          View my pre-orders
        </Link>
        <Link
          href="/products"
          className="text-sm text-[#59626E] hover:text-black transition-colors"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

export default function PreorderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-16 text-center text-[#59626E] text-sm">
          Loading…
        </div>
      }
    >
      <PreorderConfirmationContent />
    </Suspense>
  );
}
