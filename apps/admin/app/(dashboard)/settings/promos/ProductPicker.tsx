"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useAdminProducts, Product } from "@/lib/api/products";

interface Props {
  /** Selected product ids. Single-select passes at most one. */
  value: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
}

/**
 * Type-to-search product picker.
 *
 * Replaces the comma-separated-UUID input this page used to carry — nobody
 * running a promotion has product UUIDs to hand.
 */
export default function ProductPicker({
  value,
  onChange,
  multiple = false,
  placeholder = "Search products…",
}: Props) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(t);
  }, [term]);

  // Search results for the dropdown.
  const { data: results, isLoading } = useAdminProducts({
    search: debounced || undefined,
    limit: 10,
  });

  // A separate wide fetch so already-selected products render by title even
  // before the user types anything.
  const { data: all } = useAdminProducts({ limit: 200 });

  const selected = useMemo(() => {
    const byId = new Map<string, Product>();
    [...(all?.data ?? []), ...(results?.data ?? [])].forEach((p) =>
      byId.set(p.id, p),
    );
    return value.map((id) => byId.get(id)).filter(Boolean) as Product[];
  }, [value, all, results]);

  function pick(id: string) {
    if (multiple) {
      onChange(value.includes(id) ? value : [...value, id]);
    } else {
      onChange([id]);
      setOpen(false);
      setTerm("");
    }
  }

  const inputCls =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
            >
              {p.title}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== p.id))}
                className="text-slate-400 hover:text-slate-700"
                aria-label={`Remove ${p.title}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={`${inputCls} pl-8`}
        />

        {open && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {isLoading ? (
              <div className="px-3 py-2 text-xs text-slate-400">Searching…</div>
            ) : (results?.data ?? []).length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">
                No products found
              </div>
            ) : (
              (results?.data ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    value.includes(p.id) ? "bg-slate-50 text-slate-400" : ""
                  }`}
                  disabled={value.includes(p.id)}
                >
                  <span>{p.title}</span>
                  <span className="text-xs text-slate-400">
                    {p.status !== "active" ? p.status : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
