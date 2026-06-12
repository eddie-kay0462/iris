"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ShoppingBasket } from "lucide-react";
import { useAbandonedCheckouts } from "@/lib/api/analytics";
import { formatGHS } from "@/lib/charts/theme";

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    abandoned: "bg-slate-100 text-slate-600 border-slate-200",
    recovered: "bg-slate-900 text-white border-slate-900",
    completed: "bg-slate-50 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${
        styles[status] ?? styles.abandoned
      }`}
    >
      {status}
    </span>
  );
}

export default function AbandonedCheckoutsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useAbandonedCheckouts({ page, search: search || undefined });

  const totalPages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Abandoned Checkouts</h1>
        <p className="text-sm text-slate-400">
          Checkouts left idle for over an hour — with the customer and cart details captured before they left.
        </p>
      </header>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        className="flex max-w-md items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email, name or phone…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-rose-800">Failed to load abandoned checkouts.</p>
          </div>
        ) : !data || data.checkouts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <ShoppingBasket className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No abandoned checkouts</p>
            <p className="max-w-sm text-xs text-slate-400">
              When a customer reaches checkout, enters details and leaves without paying, their cart shows
              up here after an hour of inactivity.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Date", "Customer", "Items", "Subtotal", "Status"].map((h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                      i >= 2 && i <= 3 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.checkouts.map((c) => (
                <tr key={c.id} className="group cursor-pointer hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                    <Link href={`/orders/abandoned/${c.id}`} className="block">
                      {new Date(c.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      <span className="text-xs text-slate-400">
                        {new Date(c.lastActivity).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </Link>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <Link href={`/orders/abandoned/${c.id}`} className="block">
                      <p className="font-medium text-slate-900 group-hover:underline">
                        {c.customer.name || c.customer.email || "No contact info captured"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {[c.customer.email, c.customer.phone].filter(Boolean).join(" · ")}
                      </p>
                    </Link>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right">
                    <Link href={`/orders/abandoned/${c.id}`} className="flex items-center justify-end gap-2">
                      <span className="flex -space-x-2">
                        {c.itemThumbnails.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={src}
                            alt=""
                            className="h-7 w-7 rounded-md border border-white object-cover"
                          />
                        ))}
                      </span>
                      <span className="tabular-nums text-slate-600">{c.itemCount}</span>
                    </Link>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                    <Link href={`/orders/abandoned/${c.id}`} className="block">
                      {formatGHS(c.subtotal)}
                    </Link>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <Link href={`/orders/abandoned/${c.id}`} className="block">
                      <StatusChip status={c.status} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {data.page} of {totalPages} · {data.total} checkouts
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium transition hover:border-slate-300 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium transition hover:border-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
