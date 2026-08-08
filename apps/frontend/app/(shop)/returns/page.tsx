import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Return Policy",
  description:
    "1NRI return policy. We accept returns within 14 days of delivery, offer free replacement or refund on damaged items, and are here to help via returns@1nri.store.",
  alternates: {
    canonical: "/returns",
  },
  openGraph: {
    title: "Return Policy | 1NRI",
    description:
      "Returns accepted within 14 days of delivery. Damaged items replaced or refunded at no cost.",
  },
};

export default function ReturnsPage() {
  return (
    <>
      <style>{`.display { letter-spacing: -0.015em; }`}</style>

      {/* ─── TITLE ─────────────────────────────────────────── */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 px-6 pt-24 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500 font-mono">
            <span>Policies</span>
            <span className="h-px w-8 bg-neutral-300 dark:bg-neutral-700"></span>
            <span>1NRI Worldwide Ltd.</span>
          </div>

          <h1 className="display mt-8 text-4xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight leading-[0.95]">
            Returns &amp;<br />
            <span className="text-neutral-400 dark:text-neutral-500">Refunds.</span>
          </h1>

          <p className="mt-10 max-w-2xl text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed">
            At 1NRI, we want every piece you receive to feel right. If it doesn&rsquo;t, here&rsquo;s how we make it right.
          </p>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-8 border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Return window</div>
              <div className="mt-2 text-sm font-medium">14 days from delivery</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Damaged items</div>
              <div className="mt-2 text-sm font-medium">Replaced or refunded, free</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Resale</div>
              <div className="mt-2 text-sm font-medium">Items not eligible for resale</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── POLICY DETAILS ─── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-16">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500">01</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Our Policy</div>
          </div>

          <div className="space-y-6 text-base sm:text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
            <p className="text-xl sm:text-2xl text-neutral-900 dark:text-neutral-100">
              We accept returns within 14 days of delivery.
            </p>
            <p>
              Items can be refunded, with customers responsible for return shipping. If your item arrives damaged, we&rsquo;ll either replace it at no cost, or issue a full refund and cover the return shipping ourselves.
            </p>
            <p>
              Note: 1NRI products are not eligible for resale. 
            </p>
          </div>
        </div>
      </section>

      {/* ─── POLICY GRID ─── */}
      <section className="border-t border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500 font-mono">
            <span>02</span>
            <span className="h-px w-8 bg-neutral-300 dark:bg-neutral-700"></span>
            <span>What to expect</span>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">
            <article className="bg-neutral-50 dark:bg-neutral-950 p-8">
              <div className="font-mono text-2xl font-semibold tabular-nums">01</div>
              <h3 className="mt-6 text-xl font-semibold uppercase tracking-tight">Refunds</h3>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Not the right fit? Items can be refunded within the 14-day window. Customers are responsible for return shipping costs.
              </p>
            </article>

            <article className="bg-neutral-50 dark:bg-neutral-950 p-8">
              <div className="font-mono text-2xl font-semibold tabular-nums">02</div>
              <h3 className="mt-6 text-xl font-semibold uppercase tracking-tight">Damaged items</h3>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                If your item arrives damaged, we&rsquo;ll replace it at no cost, or issue a full refund and cover the return shipping.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500 font-mono">
            <span>03</span>
            <span className="h-px w-8 bg-neutral-300 dark:bg-neutral-700"></span>
            <span>Start a return</span>
          </div>

          <h2 className="display mt-6 text-3xl sm:text-5xl font-bold uppercase tracking-tight">
            Questions or concerns?
          </h2>
          <p className="mt-4 max-w-xl text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Reach out and we&rsquo;ll walk you through it. You can email us, call, or message us on any of our social media handles.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-10 sm:gap-16 border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                For returns &amp; refunds
              </div>
              <a
                href="mailto:returns@1nri.store"
                className="mt-2 inline-block text-lg sm:text-xl font-medium underline underline-offset-4 hover:opacity-60"
              >
                returns@1nri.store
              </a>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                Call or message us
              </div>
              <a
                href="tel:+233542509315"
                className="mt-2 inline-block text-lg sm:text-xl font-medium underline underline-offset-4 hover:opacity-60"
              >
                +233 54 250 9315
              </a>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                General enquiries
              </div>
              <a
                href="mailto:hello@1nri.store"
                className="mt-2 inline-block text-lg sm:text-xl font-medium underline underline-offset-4 hover:opacity-60"
              >
                hello@1nri.store
              </a>
            </div>
            <Link
              href="/products"
              className="block w-full text-center sm:inline-block sm:w-auto bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-3.5 sm:py-3 text-xs font-semibold uppercase tracking-[0.25em] hover:opacity-90 transition"
            >
              Shop the brand
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
