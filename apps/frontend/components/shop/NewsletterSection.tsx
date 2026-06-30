"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { subscribeToNewsletter } from "@/lib/api/newsletter";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const viewport = { once: true, margin: "-60px" } as const;

type Status = "idle" | "loading" | "done";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setError(null);
    try {
      const res = await subscribeToNewsletter(email.trim());
      setAlreadySubscribed(res.alreadySubscribed);
      setStatus("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <section className="border-t border-neutral-800 dark:border-neutral-200 bg-neutral-950 dark:bg-white px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-500 dark:text-neutral-400 font-mono"
          >
            <span>Newsletter</span>
            <span className="h-px w-8 bg-neutral-700 dark:bg-neutral-300" />
            <span>Stay close</span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="mt-6 text-3xl sm:text-5xl font-bold uppercase tracking-tight text-neutral-100 dark:text-neutral-900"
            style={{ letterSpacing: "-0.015em" }}
          >
            Stay on the road.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-4 max-w-xl text-base sm:text-lg text-neutral-400 dark:text-neutral-600 leading-relaxed"
          >
            Drops, milestone updates, and early access &mdash; direct to your inbox.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10">
            {status === "done" ? (
              <p className="text-base font-medium text-neutral-100 dark:text-neutral-900">
                {alreadySubscribed
                  ? "You're already on the list."
                  : "You're in. Expect drops, studio updates, and early access."}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 border border-neutral-700 dark:border-neutral-300 bg-neutral-950 dark:bg-white px-4 py-3 text-sm text-neutral-100 dark:text-neutral-900 placeholder-neutral-600 dark:placeholder-neutral-400 focus:outline-none focus:border-neutral-100 dark:focus:border-neutral-900 transition"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="shrink-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-8 py-3 text-xs font-semibold uppercase tracking-[0.25em] hover:opacity-80 disabled:opacity-40 transition"
                >
                  {status === "loading" ? "..." : "Subscribe"}
                </button>
              </form>
            )}
            {error && (
              <p className="mt-3 text-xs text-red-500">{error}</p>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
