type Column = {
  key: string;
  header: string;
};

type DataTableProps = {
  columns: Column[];
  rows: Array<Record<string, string | number>>;
  emptyMessage?: string;
};

export function DataTable({
  columns,
  rows,
  emptyMessage = "No data to display.",
}: DataTableProps) {
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
          {rows.length === 0 ? (
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
              <tr key={index} className="border-t border-slate-200">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    {row[column.key]}
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
