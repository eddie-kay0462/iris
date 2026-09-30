import { B2B_STATUS_LABELS, type B2bStatus } from "@/lib/api/b2b";

const STATUS_COLORS: Record<B2bStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-50 text-blue-700",
  in_production: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

export function B2bStatusBadge({ status, overdue }: { status: B2bStatus; overdue?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
      >
        {B2B_STATUS_LABELS[status]}
      </span>
      {overdue && (
        <span className="inline-block whitespace-nowrap rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
          Overdue
        </span>
      )}
    </span>
  );
}
