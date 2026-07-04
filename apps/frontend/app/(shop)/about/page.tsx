"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { NewsletterSection } from "@/components/shop/NewsletterSection";

/* ── Shared animation variants ── */
const ease = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const viewport = { once: true, margin: "-60px" } as const;

export default function AboutPage() {
  const imgRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <>
      <style>{`.display { letter-spacing: -0.015em; }`}</style>

      {/* ─── 1. TITLE ─────────────────────────────────────────── */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 px-6 pt-24 pb-16">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500 font-mono">
              <span>About</span>
              <span className="h-px w-8 bg-neutral-300 dark:bg-neutral-700"></span>
              <span>1NRI Worldwide Ltd.</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="display mt-8 text-5xl sm:text-7xl lg:text-[5.5rem] font-bold uppercase tracking-tight leading-[0.95]">
              Built in Accra.<br />
              <span className="text-neutral-400 dark:text-neutral-500">Worn everywhere.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-10 max-w-2xl text-lg sm:text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed">
              1NRI Worldwide is a Ghana-based fashion and manufacturing brand &mdash; built to close the gap between trend-responsive design and structured, locally-made production.
            </motion.p>

            {/* Meta strip */}
            <motion.div variants={fadeUp} className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-8 border-t border-neutral-200 dark:border-neutral-800 pt-8">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Headquartered</div>
                <div className="mt-2 text-sm font-medium">Accra, Ghana</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Production</div>
                <div className="mt-2 text-sm font-medium">Ghana</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Markets</div>
                <div className="mt-2 text-sm font-medium">GH · NG · UK · CA · US</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Sector</div>
                <div className="mt-2 text-sm font-medium">Apparel · Manufacturing</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── 2. EDITORIAL IMAGE ─────────────────────────────── */}
      <section ref={imgRef} className="relative h-[70vh] min-h-[480px] overflow-hidden">
        <motion.div className="absolute inset-0 scale-110" style={{ y: imgY }}>
          <Image
            src="/homepage/1.jpeg"
            alt="1NRI editorial shot - FW '25, Accra, Ghana"
            fill
            sizes="100vw"
            className="object-cover object-[center_0%]"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"></div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease }}
          className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 text-white"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/70">FW &rsquo;25</div>
          <div className="mt-1 text-xs uppercase tracking-widest">Shot in Accra · 2025</div>
        </motion.div>
      </section>

      {/* ─── 3. THE STORY ──────────────────────────────────── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500">Ch. 01</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">The Story</div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={stagger}
            className="space-y-6 text-base sm:text-lg leading-relaxed text-neutral-700 dark:text-neutral-300"
          >
            <motion.p variants={fadeUp} className="text-xl sm:text-2xl text-neutral-900 dark:text-neutral-100">
              1NRI was founded to address the gap between trend-responsive fashion and structured local production.
            </motion.p>
            <motion.p variants={fadeUp}>
              We combine contemporary design with disciplined, quality-controlled garment construction. Headquartered in Accra and operating production networks in Ghana, the brand serves style-conscious consumers locally and within the diaspora &mdash; people who seek fashion that reflects current trends while offering superior construction and longer wear compared to disposable alternatives.
            </motion.p>
            <motion.p variants={fadeUp}>
              Since inception, 1NRI has built a growing customer base across Ghana, Nigeria, the United Kingdom, Canada, and the United States.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── 4. PILLAR GRID ─── */}
      <section className="border-t border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
            className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500 font-mono"
          >
            <span>Ch. 02</span>
            <span className="h-px w-8 bg-neutral-300 dark:bg-neutral-700"></span>
            <span>How we work</span>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerFast}
            className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800"
          >
            <motion.article variants={fadeUp} className="bg-neutral-50 dark:bg-neutral-950 p-8">
              <div className="font-mono text-2xl font-semibold tabular-nums">01</div>
              <h3 className="mt-6 text-xl font-semibold uppercase tracking-tight">Direct-to-consumer fashion</h3>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Contemporary streetwear, designed in Accra, built around durability, fit precision, and efficient material use.
              </p>
            </motion.article>

            <motion.article variants={fadeUp} className="bg-neutral-50 dark:bg-neutral-950 p-8">
              <div className="font-mono text-2xl font-semibold tabular-nums">02</div>
              <h3 className="mt-6 text-xl font-semibold uppercase tracking-tight">Structured manufacturing</h3>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                We provide apparel manufacturing services to corporate institutions and African fashion brands seeking reliable, locally based alternatives to overseas production.
              </p>
            </motion.article>

            <motion.article variants={fadeUp} className="bg-neutral-50 dark:bg-neutral-950 p-8">
              <div className="font-mono text-2xl font-semibold tabular-nums">03</div>
              <h3 className="mt-6 text-xl font-semibold uppercase tracking-tight">Inclusive production</h3>
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Through a distributed manufacturing network, we engage women and youth &mdash; particularly in Ghana &mdash; with technical garment construction skills and structured income.
              </p>
            </motion.article>
          </motion.div>
        </div>
      </section>

      {/* ─── 5. CIRCULAR STRATEGY ─── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 lg:gap-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={fadeUp}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500">Ch. 03</div>
            <div className="mt-2 text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">What&rsquo;s next</div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="display text-3xl sm:text-4xl lg:text-5xl font-semibold uppercase tracking-tight leading-tight text-neutral-900 dark:text-neutral-100">
              We&rsquo;re building a circular production strategy &mdash;{" "}
              <span className="text-neutral-400 dark:text-neutral-500">textile recovery, upcycling, waste reduction</span>{" "}
              &mdash; into the way we make clothes.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-8 max-w-2xl text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              By combining environmental responsibility, local capacity building, and commercially viable design, the goal is to strengthen Ghana&rsquo;s textile ecosystem &mdash; and to show that durable fashion and climate-conscious manufacturing can scale together.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── 6. ROAD TO HQ CTA ─── */}
      <section className="relative overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
        <div className="absolute inset-0">
          <Image
            src="/homepage/3.png"
            alt="1NRI manufacturing and production in Ghana"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={stagger}
          className="relative z-10 mx-auto max-w-5xl px-6 py-24 sm:py-32 text-white"
        >
          <motion.div variants={fadeUp} className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/60">Currently underway</motion.div>
          <motion.h2 variants={fadeUp} className="display mt-4 text-3xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight">
            Road to HQ &mdash; Accra, by 26.12.2026.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-base text-white/70 leading-relaxed">
            Six thousand units. One headquarters. Six milestones along the way. Every piece sold gets us a little closer.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              href="/products"
              className="mt-10 inline-block border border-white/80 bg-white/5 px-12 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              Shop the brand
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── 7. CONNECT ─── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500 font-mono">
              <span>Ch. 04</span>
              <span className="h-px w-8 bg-neutral-300 dark:bg-neutral-700"></span>
              <span>Find us</span>
            </motion.div>

            <motion.h2 variants={fadeUp} className="display mt-6 text-3xl sm:text-5xl font-bold uppercase tracking-tight">Stay close to the work.</motion.h2>
            <motion.p variants={fadeUp} className="mt-4 max-w-xl text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Drops, sit-downs from the studio, behind-the-machines footage from Ghana &mdash; choose your platform.
            </motion.p>
          </motion.div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">
            <a
              href="https://instagram.com/_1nriworldwide"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-neutral-50 dark:bg-neutral-950 p-6 flex flex-col gap-6 transition hover:bg-white dark:hover:bg-neutral-900"
            >
              <svg className="h-7 w-7 text-neutral-900 dark:text-neutral-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">Instagram</div>
                <div className="mt-1 text-sm font-medium">@_1nriworldwide</div>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-900 dark:group-hover:text-white transition">
                Follow
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>

            <a
              href="https://www.tiktok.com/@1nriworldwide"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-neutral-50 dark:bg-neutral-950 p-6 flex flex-col gap-6 transition hover:bg-white dark:hover:bg-neutral-900"
            >
              <svg className="h-7 w-7 text-neutral-900 dark:text-neutral-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">TikTok</div>
                <div className="mt-1 text-sm font-medium">@1nriworldwide</div>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-900 dark:group-hover:text-white transition">
                Follow
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>

            <a
              href="https://youtube.com/@1nriworldwide"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-neutral-50 dark:bg-neutral-950 p-6 flex flex-col gap-6 transition hover:bg-white dark:hover:bg-neutral-900"
            >
              <svg className="h-7 w-7 text-neutral-900 dark:text-neutral-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
              </svg>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">YouTube</div>
                <div className="mt-1 text-sm font-medium">@1nriworldwide</div>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-900 dark:group-hover:text-white transition">
                Subscribe
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>

            <a
              href="https://www.linkedin.com/in/1nriworldwide/"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-neutral-50 dark:bg-neutral-950 p-6 flex flex-col gap-6 transition hover:bg-white dark:hover:bg-neutral-900"
            >
              <svg className="h-7 w-7 text-neutral-900 dark:text-neutral-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">LinkedIn</div>
                <div className="mt-1 text-sm font-medium">1NRI Worldwide LTD</div>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-900 dark:group-hover:text-white transition">
                Connect
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>
          </div>

          {/* Direct contact */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={stagger}
            className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-neutral-200 dark:border-neutral-800 pt-8"
          >
            <motion.div variants={fadeUp}>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
                For partnerships &amp; manufacturing
              </div>
              <a
                href="mailto:info@1nri.store"
                className="mt-2 inline-block text-lg sm:text-xl font-medium underline underline-offset-4 hover:opacity-60"
              >
                info@1nri.store
              </a>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Link
                href="/products"
                className="inline-block bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-3 text-xs font-semibold uppercase tracking-[0.25em] hover:opacity-90 transition"
              >
                Shop the brand
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <NewsletterSection />
    </>
  );
}
