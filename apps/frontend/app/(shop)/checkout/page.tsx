"use client";

import dynamic from "next/dynamic";

const CheckoutClient = dynamic(() => import("./CheckoutClient"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center text-text-muted">
      Loading checkout...
    </div>
  ),
});

export default function CheckoutPage() {
  return <CheckoutClient />;
}
