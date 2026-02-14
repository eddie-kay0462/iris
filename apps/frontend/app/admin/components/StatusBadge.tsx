const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-600",
};

export function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}
    >
      {status}
    </span>
  );
}
