"use client";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
}

function SkeletonRows({ cols, count = 5 }: { cols: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-t border-slate-200 animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
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
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-100 text-left text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={columns.length} />
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={index}
                className={`border-t border-slate-200 ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
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
