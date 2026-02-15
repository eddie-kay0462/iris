"use client";

import { useAdminCollections } from "@/lib/api/collections";

interface CollectionsPickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function CollectionsPicker({
  selected,
  onChange,
}: CollectionsPickerProps) {
  const { data: collections, isLoading } = useAdminCollections();

  if (isLoading) {
    return <div className="text-sm text-slate-400">Loading collections...</div>;
  }

  if (!collections || collections.length === 0) {
    return <div className="text-sm text-slate-400">No collections yet.</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-700">Collections</h3>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {collections.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(c.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, c.id]);
                } else {
                  onChange(selected.filter((id) => id !== c.id));
                }
              }}
              className="rounded border-slate-300"
            />
            {c.title}
          </label>
        ))}
      </div>
    </div>
  );
}
