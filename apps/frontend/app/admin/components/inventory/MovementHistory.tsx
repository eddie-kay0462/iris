"use client";

import { useState } from "react";
import { useInventoryMovements } from "@/lib/api/inventory";
import { Pagination } from "../Pagination";

const typeColors: Record<string, string> = {
  adjustment: "bg-blue-100 text-blue-800",
  sale: "bg-green-100 text-green-800",
  return: "bg-purple-100 text-purple-800",
  restock: "bg-emerald-100 text-emerald-800",
  damage: "bg-red-100 text-red-800",
  correction: "bg-yellow-100 text-yellow-800",
};

export function MovementHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInventoryMovements({ page, limit: 10 });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-slate-100" />
        ))}
      </div>
    );
  }

  const movements = data?.data || [];

  if (movements.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500">
        No movements recorded yet.
      </p>
    );
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-slate-500">
          <tr>
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium">Product</th>
            <th className="pb-2 font-medium">Type</th>
            <th className="pb-2 font-medium">Change</th>
            <th className="pb-2 font-medium">Before → After</th>
            <th className="pb-2 font-medium">Notes</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="py-2 text-slate-500">
                {new Date(m.created_at).toLocaleDateString()}
              </td>
              <td className="py-2">
                {m.variant?.product?.title || "—"}
                {m.variant?.sku && (
                  <span className="ml-1 text-slate-400">
                    ({m.variant.sku})
                  </span>
                )}
              </td>
              <td className="py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    typeColors[m.movement_type] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {m.movement_type}
                </span>
              </td>
              <td className="py-2">
                <span
                  className={
                    m.quantity_change > 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {m.quantity_change > 0 ? "+" : ""}
                  {m.quantity_change}
                </span>
              </td>
              <td className="py-2 text-slate-500">
                {m.previous_quantity} → {m.new_quantity}
              </td>
              <td className="py-2 text-slate-400">{m.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
