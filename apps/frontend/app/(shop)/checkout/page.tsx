"use client";

import dynamic from "next/dynamic";
import { PageLoading } from "@/components/shop/Loading";

const CheckoutClient = dynamic(() => import("./CheckoutClient"), {
  ssr: false,
  loading: () => <PageLoading label="Loading checkout" />,
});

export default function CheckoutPage() {
  return <CheckoutClient />;
}
