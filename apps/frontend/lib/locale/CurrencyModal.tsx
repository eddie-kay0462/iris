"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useLocale, CURRENCIES } from "./locale-provider";

export default function CurrencyModal() {
  // Foreign currencies alphabetical, then GHS (the store's home currency) last as
  // a full-width row. Computed in-component to avoid a circular-import TDZ on
  // CURRENCIES.
  const modalCurrencies = useMemo(() => {
    const foreign = CURRENCIES.filter((c) => c.code !== "GHS").sort((a, b) =>
      a.code.localeCompare(b.code),
    );
    const ghs = CURRENCIES.find((c) => c.code === "GHS");
    return ghs ? [...foreign, ghs] : foreign;
  }, []);

  const {
    region,
    currency,
    setCurrency,
    suggestedCurrency,
    showCurrencyModal,
    dismissCurrencyModal,
  } = useLocale();

  const [selected, setSelected] = useState(suggestedCurrency);

  // Re-seed the preselection each time the modal opens.
  useEffect(() => {
    if (showCurrencyModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(suggestedCurrency !== "GHS" ? suggestedCurrency : currency);
    }
  }, [showCurrencyModal, suggestedCurrency, currency]);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!showCurrencyModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissCurrencyModal();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [showCurrencyModal, dismissCurrencyModal]);

  if (!showCurrencyModal) return null;

  function handleConfirm() {
    setCurrency(selected);
    dismissCurrencyModal();
  }

  const detectedKnown = region.countryCode !== "GL";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
      onClick={dismissCurrencyModal}
      role="dialog"
      aria-modal="true"
      aria-label="Select currency"
    >
      <div
        className="relative w-full max-w-md border border-neutral-200 bg-white px-7 pb-7 pt-9 shadow-2xl sm:px-9 sm:pb-9 dark:border-neutral-800 dark:bg-neutral-950"
        style={{ fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismissCurrencyModal}
          aria-label="Close"
          className="absolute right-4 top-4 text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-600 dark:hover:text-white"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>

        {/* Wordmark */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/homepage_img/no-bg-1NRI.png"
            alt="1NRI"
            className="h-6 w-auto object-contain dark:brightness-0 dark:invert"
          />
        </div>

        {/* Eyebrow + readout */}
        <div className="mt-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-900 dark:text-white">
            Select Currency
          </p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.28em] text-neutral-400 dark:text-neutral-500">
            <span className="h-px w-4 bg-neutral-300 dark:bg-neutral-700" />
            {detectedKnown ? (
              <span>
                Detected&nbsp;·&nbsp;
                <span className="text-neutral-900 dark:text-white">{region.country}</span>
              </span>
            ) : (
              <span>Choose your currency</span>
            )}
            <span className="h-px w-4 bg-neutral-300 dark:bg-neutral-700" />
          </div>
        </div>

        {/* Currency grid — connected hairline spec-sheet */}
        <div className="mt-8 grid grid-cols-2 border-l border-t border-neutral-200 dark:border-neutral-800">
          {modalCurrencies.map((cur) => {
            const isSelected = selected === cur.code;
            // GHS (the home currency) sits on its own full-width row at the bottom.
            const fullWidth = cur.code === "GHS";
            return (
              <button
                key={cur.code}
                type="button"
                onClick={() => setSelected(cur.code)}
                aria-pressed={isSelected}
                className={`group relative flex flex-col items-center justify-center gap-1.5 border-b border-r border-neutral-200 py-7 transition-colors dark:border-neutral-800 ${
                  fullWidth ? "col-span-2" : ""
                } ${
                  isSelected
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-white text-neutral-900 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-900"
                }`}
              >
                {/* Selected marker: filled square, echoing the site's technical dots */}
                <span
                  className={`absolute right-3 top-3 h-1.5 w-1.5 ${
                    isSelected
                      ? "bg-white dark:bg-neutral-900"
                      : "bg-transparent"
                  }`}
                />
                <span className="text-xl font-bold tracking-[0.12em]">
                  {cur.code}
                </span>
                <span
                  className={`text-[9px] uppercase tracking-[0.2em] ${
                    isSelected
                      ? "text-white/60 dark:text-neutral-900/60"
                      : "text-neutral-400 dark:text-neutral-500"
                  }`}
                >
                  {cur.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-8 w-full bg-neutral-900 py-4 text-[11px] uppercase tracking-[0.3em] text-white transition hover:bg-black dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={dismissCurrencyModal}
          className="mt-5 block w-full text-center text-[10px] uppercase tracking-[0.28em] text-neutral-400 transition hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
