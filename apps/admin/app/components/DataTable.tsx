"use client";

import { useIsNewUi } from "@/lib/ui/UiModeContext";

/** Breakpoint below which a low-priority column is hidden. */
export type HideBelow = "sm" | "md" | "lg" | "xl";

// Literal strings so Tailwind sees every class it needs to generate.
const HIDE_BELOW: Record<HideBelow, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /**
   * Hide this column on screens narrower than the breakpoint. Use for
   * secondary detail (dates, references, providers) so phones and tablets
   * keep the columns that matter; what's left scrolls sideways if needed.
   */
  hideBelow?: HideBelow;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
}

const hideClass = (c: { hideBelow?: HideBelow }) => (c.hideBelow ? HIDE_BELOW[c.hideBelow] : "");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SkeletonRows<T>({ columns, count = 5, isNew }: { columns: Column<T>[]; count?: number; isNew: boolean }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className={`animate-pulse border-t ${isNew ? "border-[var(--iris-line)]" : "border-slate-200"}`}>
          {columns.map((c) => (
            <td key={c.key} className={`${isNew ? "px-4 py-5 sm:px-6" : "px-4 py-3"} ${hideClass(c)}`}>
              <div className="h-4 w-3/4 rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  emptyMessage = "No data to display.",
  loading = false,
  onRowClick,
}: DataTableProps<T>) {
  const isNew = useIsNewUi();
  // New IRIS: kit table — card container, no header fill, roomier rows
  // (a little tighter on phones so more of the row fits).
  const cell = isNew ? "px-4 py-4 sm:px-6" : "px-4 py-3";
  const rowLine = isNew ? "border-[var(--iris-line)]" : "border-slate-200";
  return (
    // Both interfaces scroll sideways when the remaining columns still don't
    // fit, rather than clipping the right-hand ones out of reach.
    <div
      className={
        isNew
          ? "overflow-x-auto rounded-2xl border border-[var(--iris-line)] bg-white shadow-sm"
          : "overflow-x-auto rounded-lg border border-slate-200"
      }
    >
      <table className="w-full border-collapse text-sm">
        <thead className={isNew ? "text-left text-slate-900" : "bg-slate-100 text-left text-slate-600"}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`${isNew ? "whitespace-nowrap px-4 py-5 font-semibold sm:px-6" : "px-4 py-3 font-medium"} ${hideClass(column)}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows columns={columns} isNew={isNew} />
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={`px-4 py-6 text-center ${isNew ? "border-t border-[var(--iris-line)] text-[var(--iris-muted)]" : "text-slate-500"}`}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={index}
                className={`border-t ${rowLine} ${
                  onRowClick ? `cursor-pointer ${isNew ? "hover:bg-[var(--iris-hover)]" : "hover:bg-slate-50"}` : ""
                }`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`${cell} ${hideClass(column)}`}>
                    {column.render
                      ? column.render(row)
                      : (row[column.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
