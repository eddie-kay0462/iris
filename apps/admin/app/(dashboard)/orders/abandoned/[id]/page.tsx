"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, User } from "lucide-react";
import { useAbandonedCheckout } from "@/lib/api/analytics";
import { formatGHS } from "@/lib/charts/theme";

export default function AbandonedCheckoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useAbandonedCheckout(id);

  return (
    <section className="space-y-6">
      <Link
        href="/orders/abandoned"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Abandoned checkouts
      </Link>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error || !data ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm text-rose-800">Could not load this checkout.</p>
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900">
                Abandoned checkout · {formatGHS(data.subtotal)}
              </h1>
              <p className="text-sm text-slate-400">
                Started {new Date(data.date).toLocaleString()} · last activity{" "}
                {new Date(data.lastActivity).toLocaleString()}
              </p>
            </div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${
                data.status === "recovered"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              {data.status}
            </span>
          </header>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* Items */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <h2 className="border-b border-slate-100 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cart contents
              </h2>
              <div className="divide-y divide-slate-100">
                {data.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                        —
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-400">
                        {[item.variantTitle, item.sku].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="tabular-nums text-slate-600">
                        {item.quantity} × {formatGHS(item.unitPrice)}
                      </p>
                      <p className="font-semibold tabular-nums text-slate-900">
                        {formatGHS(item.lineTotal ?? item.quantity * item.unitPrice)}
                      </p>
                    </div>
                  </div>
                ))}
                {data.items.length === 0 && (
                  <p className="px-5 py-8 text-center text-xs text-slate-400">No items captured.</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <span className="text-sm font-semibold text-slate-900">Subtotal</span>
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {formatGHS(data.subtotal)}
                </span>
              </div>
            </div>

            {/* Customer + recovery */}
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </h2>
                {data.customer.name || data.customer.email || data.customer.phone ? (
                  <div className="space-y-3 text-sm">
                    {data.customer.name && (
                      <p className="flex items-center gap-2 text-slate-900">
                        <User className="h-4 w-4 text-slate-400" /> {data.customer.name}
                      </p>
                    )}
                    {data.customer.email && (
                      <p className="flex items-center gap-2 text-slate-600">
                        <Mail className="h-4 w-4 text-slate-400" /> {data.customer.email}
                      </p>
                    )}
                    {data.customer.phone && (
                      <p className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400" /> {data.customer.phone}
                      </p>
                    )}
                    {data.customer.profileId && (
                      <Link
                        href={`/customers/${data.customer.profileId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 underline-offset-2 hover:underline"
                      >
                        View customer profile →
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    The customer left before entering any contact details.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recovery
                </h2>
                {data.recoveredBy ? (
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-900">
                      Recovered by order{" "}
                      <span className="font-semibold">{data.recoveredBy.orderNumber}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(data.recoveredBy.date).toLocaleString()} ·{" "}
                      {formatGHS(data.recoveredBy.total)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    No later order from this customer yet. Reach out via the contact details above to
                    recover the sale.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
