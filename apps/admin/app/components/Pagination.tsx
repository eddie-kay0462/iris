"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsNewUi } from "@/lib/ui/UiModeContext";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface PaginationOptions {
  /** Extra context after "of N", e.g. "412 checkouts". */
  summary?: string;
  /** Divider line + side padding, for a pager at the foot of a card (default). */
  framed?: boolean;
  /** Freeze the controls, e.g. while a page is loading. */
  disabled?: boolean;
}

/**
 * "Page [ 2 ] of 155": the current page is an editable number, so any page is
 * one jump away. Enter (or leaving the field) goes there; out-of-range
 * numbers are clamped to the first/last page; anything else, or Escape,
 * puts the current page back.
 */
function PageJump({
  page,
  totalPages,
  onPageChange,
  inputClassName,
  summary,
  disabled,
}: PaginationProps & { inputClassName: string; summary?: string; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(page));

  // Follow page changes made elsewhere (Previous / Next, a filter reset).
  useEffect(() => setDraft(String(page)), [page]);

  function commit() {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(page));
      return;
    }
    const target = Math.min(Math.max(n, 1), totalPages);
    setDraft(String(target));
    if (target !== page) onPageChange(target);
  }

  return (
    <label className="flex items-center gap-1.5 whitespace-nowrap">
      <span>Page</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(String(page));
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={`Page number, 1 to ${totalPages}`}
        // Wide enough for the largest page number, plus padding.
        style={{ width: `calc(${String(totalPages).length}ch + 1.75rem)` }}
        className={inputClassName}
      />
      <span>
        of {totalPages}
        {summary && <span className="hidden sm:inline"> · {summary}</span>}
      </span>
    </label>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  summary,
  framed = true,
  disabled = false,
}: PaginationProps & PaginationOptions) {
  const isNew = useIsNewUi();
  if (totalPages <= 1) return null;

  if (isNew) {
    return (
      <div className={`flex items-center justify-between gap-3 text-sm ${framed ? "border-t border-[var(--iris-line)] px-4 py-3" : ""}`}>
        <div className="text-[var(--iris-muted)]">
          <PageJump
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            summary={summary}
            disabled={disabled}
            inputClassName="h-7 rounded-lg border border-[var(--iris-line)] bg-[var(--iris-hover)] px-2 text-center tabular-nums text-slate-900 outline-none focus:border-slate-400 focus:bg-[var(--iris-bg)] pointer-coarse:h-9"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-900 hover:bg-[var(--iris-hover)] disabled:cursor-not-allowed disabled:opacity-30 pointer-coarse:h-9 pointer-coarse:w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Next page"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-900 hover:bg-[var(--iris-hover)] disabled:cursor-not-allowed disabled:opacity-30 pointer-coarse:h-9 pointer-coarse:w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${framed ? "border-t border-slate-200 px-4 py-3" : ""}`}>
      <div className="text-slate-500">
        <PageJump
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          summary={summary}
          disabled={disabled}
          inputClassName="rounded border border-slate-200 bg-white px-2 py-1 text-center tabular-nums text-slate-700 outline-none focus:border-slate-400"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          className="rounded border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className="rounded border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
