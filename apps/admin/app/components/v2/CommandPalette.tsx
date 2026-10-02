"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import type { NavItem } from "../nav";
import { requestNavigation } from "@/lib/navigationGuard";

/** ⌘/ (or ⌘K) jump-to-page search over every page the role can open. */
export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.href.toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  function go(item: NavItem | undefined) {
    if (!item) return;
    onClose();
    // A page with unsaved work (e.g. a product being edited) may stop the jump.
    if (requestNavigation(item.href)) router.push(item.href);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Search pages"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--iris-line)] bg-[var(--iris-bg)] shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--iris-line)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--iris-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") go(results[index]);
            }}
            placeholder="Jump to a page…"
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-[var(--iris-faint)]"
          />
          <kbd className="rounded-md bg-[var(--iris-hover)] px-1.5 py-0.5 text-[10px] text-[var(--iris-muted)]">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-[var(--iris-muted)]">No pages match “{query}”.</li>
          )}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-900 ${
                    i === index ? "bg-[var(--iris-hover)]" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="hidden truncate text-xs text-[var(--iris-faint)] sm:inline">{item.href}</span>
                  {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-[var(--iris-muted)]" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
