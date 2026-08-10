import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Size Guide",
  description:
    "1NRI sizing guide - coming soon. In the meantime, check the fit notes on each product page or reach out and we'll help you find your size.",
  alternates: {
    canonical: "/size-guide",
  },
  openGraph: {
    title: "Size Guide | 1NRI",
    description: "1NRI sizing guide - coming soon.",
  },
};

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-xs font-semibold uppercase tracking-widest text-text">
        Size Guide
      </h1>
      <p className="mt-6 text-sm leading-relaxed text-text-secondary">
        Full sizing guide coming soon. In the meantime, check the fit notes on
        each product page, or reach out and we&apos;ll help you find your
        size.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/products"
          className="text-xs font-semibold uppercase tracking-widest text-text underline underline-offset-4 hover:no-underline"
        >
          Browse products
        </Link>
        <Link
          href="/about"
          className="text-xs font-semibold uppercase tracking-widest text-text-secondary underline underline-offset-4 hover:no-underline"
        >
          Contact us
        </Link>
      </div>
    </div>
  );
}
