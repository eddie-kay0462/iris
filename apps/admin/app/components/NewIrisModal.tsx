"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  PROMPT_COOKIE,
  readCookie,
  useUiMode,
  writeCookie,
  type UiMode,
} from "@/lib/ui/UiModeContext";

/**
 * Shown once per login (the login page sets PROMPT_COOKIE): asks whether to
 * use the new IRIS. The highlighted answer is whatever was picked last time.
 * Styled in plain classic tokens so it reads the same in either interface.
 */
export function NewIrisModal() {
  const { ui, setUi } = useUiMode();
  const [open, setOpen] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (readCookie(PROMPT_COOKIE)) setOpen(true);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => primaryRef.current?.focus());
  }, [open]);

  function choose(mode: UiMode) {
    writeCookie(PROMPT_COOKIE, "", 0);
    setOpen(false);
    setUi(mode);
  }

  const lastWasNew = ui === "new";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onKeyDown={(e) => e.key === "Escape" && choose(ui)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-iris-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <Preview />
            <div className="space-y-2 px-6 pt-5">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                {lastWasNew ? "Welcome back" : "New look available"}
              </p>
              <h2 id="new-iris-title" className="text-xl font-semibold text-slate-900">
                {lastWasNew ? "Continue with the new IRIS?" : "Switch to the new IRIS?"}
              </h2>
              <p className="text-sm leading-relaxed text-slate-500">
                Same pages, same data, a cleaner interface: grouped navigation, quick search, a live
                notification panel and dark mode. You can switch back any time from the header.
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 px-6 pb-6 pt-5 sm:flex-row sm:justify-end">
              <button
                ref={lastWasNew ? undefined : primaryRef}
                onClick={() => choose("classic")}
                className={
                  lastWasNew
                    ? "rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    : "rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                }
              >
                {lastWasNew ? "Use classic" : "Keep classic"}
              </button>
              <button
                ref={lastWasNew ? primaryRef : undefined}
                onClick={() => choose("new")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                {lastWasNew ? "Continue with new IRIS" : "Try the new IRIS"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A tiny drawn mock of the new layout: sidebar, KPI cards, chart, notification bar. */
function Preview() {
  const line = "#1c1c1c";
  return (
    <div className="border-b border-slate-200 bg-[#f9f9fa] p-4">
      <div className="flex h-36 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
        <div className="w-14 space-y-1.5 border-r border-[#efefef] p-2">
          <div className="mb-2 h-3 w-3 rounded-full bg-[#1c1c1c]" />
          {[70, 90, 60, 80, 55, 75].map((w, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full ${i === 1 ? "bg-[#1c1c1c]/60" : "bg-[#1c1c1c]/10"}`}
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        <div className="flex-1 space-y-2 p-2">
          <div className="h-1.5 w-16 rounded-full bg-[#1c1c1c]/15" />
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-md border border-[#efefef] p-1.5">
                <div className="h-1 w-6 rounded-full bg-[#1c1c1c]/20" />
                <div className="mt-1 h-2 w-9 rounded-full bg-[#1c1c1c]/80" />
              </div>
            ))}
          </div>
          <div className="rounded-md border border-[#efefef] p-1.5">
            <svg viewBox="0 0 120 36" className="h-12 w-full" preserveAspectRatio="none">
              <path
                d="M0 28 C 12 20, 18 34, 30 26 S 48 10, 60 16 S 80 4, 92 12 S 110 8, 120 6"
                fill="none"
                stroke={line}
                strokeWidth="1.5"
              />
              <path
                d="M0 32 C 14 24, 24 22, 36 26 S 56 30, 68 20 S 96 22, 120 14"
                fill="none"
                stroke="#a8c5da"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </svg>
          </div>
        </div>
        <div className="w-16 space-y-2 border-l border-[#efefef] p-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#a8c5da]/70" />
              <div className="h-1 flex-1 rounded-full bg-[#1c1c1c]/15" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
