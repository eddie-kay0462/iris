"use client";

/**
 * First-visit newsletter pop-up on the homepage. Shows once per browser — the
 * dismissal (or a successful subscribe) is remembered in localStorage, so a
 * returning shopper never sees it again. Switched on/off from Admin →
 * Settings → General.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { subscribeToNewsletter } from "@/lib/api/newsletter";

const STORAGE_KEY = "1nri-newsletter-popup-seen";
const OPEN_DELAY_MS = 3000;

type Status = "idle" | "loading" | "done";

export default function NewsletterModal({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(t);
  }, [enabled]);

  // Lock background scroll while the modal is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode — pop-up just reappears next visit */
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setError(null);
    try {
      const res = await subscribeToNewsletter(email.trim());
      setAlreadySubscribed(res.alreadySubscribed);
      setStatus("done");
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* noop */
      }
      setTimeout(() => setOpen(false), 2400);
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={dismiss}
            className="absolute inset-0 bg-scrim backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="newsletter-popup-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 grid w-full max-w-3xl grid-cols-1 overflow-hidden bg-surface shadow-2xl sm:grid-cols-2"
          >
            <button
              onClick={dismiss}
              aria-label="Close newsletter sign-up"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center border border-line bg-surface/90 text-text transition hover:bg-fill"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            {/* Visual */}
            <div className="relative hidden min-h-[420px] sm:block">
              <Image
                src="/homepage/6.jpg"
                alt="1NRI streetwear, made in Accra"
                fill
                sizes="(max-width: 640px) 100vw, 384px"
                quality={85}
                className="object-cover"
              />
            </div>

            {/* Copy + form */}
            <div className="flex flex-col justify-center px-7 py-12 sm:px-9">
              <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-text-muted font-mono">
                <span>Newsletter</span>
                <span className="h-px w-6 bg-line-strong" />
              </div>

              <h2
                id="newsletter-popup-title"
                className="mt-5 text-2xl sm:text-3xl font-bold uppercase leading-[1.05] tracking-tight text-text"
                style={{ letterSpacing: "-0.015em" }}
              >
                Never Miss
                <br />
                a Drop.
              </h2>

              <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                Drop dates, restock alerts, and first access straight to your inbox. Pieces sell out fast.
              </p>

              {status === "done" ? (
                <p className="mt-8 text-sm font-medium text-text">
                  {alreadySubscribed
                    ? "You're already on the list."
                    : "You're in. Expect drops, studio updates, and early access."}
                </p>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="mt-8 space-y-3">
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-line-strong bg-surface px-4 py-3 text-sm text-text placeholder-text-placeholder transition focus:border-invert-bg focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="w-full bg-invert-bg px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] text-invert-fg transition hover:opacity-85 disabled:opacity-40"
                    >
                      {status === "loading" ? "..." : "Alert Me"}
                    </button>
                  </form>

                  {error && <p className="mt-3 text-xs text-danger">{error}</p>}

                  <button
                    onClick={dismiss}
                    className="mt-5 self-center text-[10px] font-medium uppercase tracking-[0.25em] text-text-muted transition hover:text-text font-mono"
                  >
                    No thanks
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
