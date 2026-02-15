"use client";

const STAGE_LABELS: Record<string, string> = {
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

const STAGE_COLORS: Record<string, string> = {
  paid: "bg-blue-500",
  processing: "bg-amber-500",
  shipped: "bg-indigo-500",
  delivered: "bg-green-500",
};

interface OrderFunnelProps {
  funnelCounts: Record<string, number>;
}

export function OrderFunnel({ funnelCounts }: OrderFunnelProps) {
  const stages = ["paid", "processing", "shipped", "delivered"];
  const maxCount = Math.max(
    ...stages.map((s) => funnelCounts[s] || 0),
    1,
  );

  if (maxCount <= 0 || !funnelCounts.paid) {
    return <p className="text-sm text-slate-500">No funnel data available.</p>;
  }

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const count = funnelCounts[stage] || 0;
        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const prevCount = i > 0 ? funnelCounts[stages[i - 1]] || 0 : count;
        const dropOff =
          i > 0 && prevCount > 0
            ? (((prevCount - count) / prevCount) * 100).toFixed(0)
            : null;

        return (
          <div key={stage}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                {STAGE_LABELS[stage] || stage}
              </span>
              <span className="text-slate-500">
                {count} order{count !== 1 ? "s" : ""}
                {dropOff !== null && (
                  <span className="ml-2 text-xs text-red-500">
                    -{dropOff}% drop
                  </span>
                )}
              </span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded bg-slate-100">
              <div
                className={`h-full rounded transition-all ${STAGE_COLORS[stage] || "bg-slate-400"}`}
                style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
