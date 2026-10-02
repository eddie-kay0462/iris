"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const WIDTHS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Dialog for the new IRIS (ported from the Gold Coast Tokota admin's UiModal):
 * scrim, Esc to close, focus kept inside, background scroll locked, focus
 * returned to whatever opened it. Centred in the viewport at every size,
 * with 16px of breathing room on phones. The body scrolls inside a height
 * cap, so a long body never pushes the header or footer off-screen.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: keyof typeof WIDTHS;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const lastFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
        (el) => el.offsetParent !== null,
      );
    requestAnimationFrame(() => focusables()[0]?.focus());

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      lastFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 p-4 dark:bg-black/70"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-[var(--iris-line,#e2e8f0)] bg-[var(--iris-bg,#ffffff)] shadow-xl dark:border-[#333] dark:bg-[#1f1f1f] dark:shadow-[0_24px_64px_rgb(0_0_0/0.6)] ${WIDTHS[size]}`}
      >
        {title && (
          <div className="flex shrink-0 items-start gap-3 border-b border-[var(--iris-line,#e2e8f0)] p-4 md:p-5">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-medium text-slate-900">{title}</h2>
              {description && <p className="mt-1 text-xs text-[var(--iris-muted,#64748b)]">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--iris-muted,#64748b)] hover:bg-[var(--iris-hover,#f1f5f9)] hover:text-slate-900 pointer-coarse:h-9 pointer-coarse:w-9"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--iris-line,#e2e8f0)] p-4 md:p-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
