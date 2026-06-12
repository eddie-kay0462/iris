"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { useReportsList, ReportCategory } from "@/lib/api/analytics";

const CATEGORIES: ReportCategory[] = [
  "Sales",
  "Orders",
  "Customers",
  "Behavior",
  "Inventory",
  "Finances",
];

export default function ReportsIndexPage() {
  const { data, isLoading } = useReportsList();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ReportCategory | "all">("all");

  const filtered = useMemo(() => {
    const reports = data?.reports ?? [];
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (q && !`${r.name} ${r.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, category]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-400">
          Metrics by topic — each report opens with a chart, period comparison and a day-by-day table.
        </p>
      </header>

      {/* Search + category filter */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                category === c
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Reports table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-2 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </th>
                <th className="border-b border-slate-200 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </th>
                <th className="hidden border-b border-slate-200 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 md:table-cell">
                  Description
                </th>
                <th className="border-b border-slate-200 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="group hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-5 py-3">
                    <Link
                      href={`/analytics/reports/${r.id}`}
                      className="font-medium text-slate-900 group-hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="border-b border-slate-100 px-5 py-3">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                      {r.category}
                    </span>
                  </td>
                  <td className="hidden border-b border-slate-100 px-5 py-3 text-xs text-slate-400 md:table-cell">
                    {r.description}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 text-right">
                    <Link href={`/analytics/reports/${r.id}`}>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-xs text-slate-400">
                    No reports match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
