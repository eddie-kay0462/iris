"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/* ------------------------------------------------------------------ */
/*  Scroll engine                                                      */
/*  • Sets --p (0 → 1) on every [data-scene] element                  */
/*  • Applies translate3d on every [data-speed] parallax element       */
/*  • GPU-composited: only transform + opacity, via rAF batching       */
/* ------------------------------------------------------------------ */

function useScrollEngine() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let ticking = false;

    const update = () => {
      const vh = window.innerHeight;

      root.querySelectorAll<HTMLElement>("[data-scene]").forEach((s) => {
        const r = s.getBoundingClientRect();
        const scrollable = s.offsetHeight - vh;
        const p = scrollable > 0 ? clamp(-r.top / scrollable) : 0;
        s.style.setProperty("--p", p.toFixed(4));
      });

      root.querySelectorAll<HTMLElement>("[data-speed]").forEach((el) => {
        const speed = parseFloat(el.dataset.speed || "0");
        const r = el.getBoundingClientRect();
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = `translate3d(0,${offset}px,0)`;
      });

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  return ref;
}

/* ------------------------------------------------------------------ */
/*  Collections data                                                   */
/* ------------------------------------------------------------------ */

const collections = [
  {
    image: "/homepage/1.jpeg",
    alt: "Realtree Camo Collection",
    title: "Realtree Camo",
    subtitle: "Intercessory Department — Latest Drop",
    cta: "Shop Now",
    href: "/products",
    objectPos: "object-top",
  },
  {
    image: "/homepage/2.jpeg",
    alt: "Psalm 52 — Black INRI set",
    title: "Psalm 52",
    subtitle: "The Black Set — Jersey & Sweats",
    cta: "View Collection",
    href: "/products",
    objectPos: "object-top",
  },
  {
    image: "/homepage/3.png",
    alt: "INRI branded pants in four colorways",
    title: "Essentials",
    subtitle: "Signature sweats in every colour you need",
    cta: "Shop Bottoms",
    href: "/products",
    objectPos: "object-center",
  },
  {
    image: "/homepage/4.jpeg",
    alt: "Betrayer\u2019s Kiss jacket — Apoluo Fall/Winter",
    title: "Betrayer\u2019s Kiss",
    subtitle: "Apoluo \u2014 Fall / Winter 2024",
    cta: "Explore",
    href: "/products",
    objectPos: "object-top",
  },
];

/* ------------------------------------------------------------------ */
/*  Newsletter Form                                                    */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <p className="mt-8 text-sm font-medium text-green-600 dark:text-green-400">
        You&rsquo;re in! We&rsquo;ll keep you posted on new drops.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex items-center gap-0">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        className="h-12 flex-1 border border-neutral-300 bg-white px-4 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-12 whitespace-nowrap border border-neutral-900 bg-neutral-900 px-6 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-transparent hover:text-neutral-900 disabled:opacity-50 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-transparent dark:hover:text-white"
      >
        {status === "loading" ? "..." : "Subscribe"}
      </button>
      {status === "error" && (
        <p className="ml-3 text-xs text-red-500">Something went wrong. Try again.</p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const containerRef = useScrollEngine();

  return (
    <div
      ref={containerRef}
      className="bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
    >
      {/* ══════════════════════════════════════════════════════════════
          SCENE 1 — CINEMATIC HERO
          Deep parallax zoom · title splits apart with expanding
          letter-spacing & counter-rotation · divider line widens
          ══════════════════════════════════════════════════════════════ */}
      <section data-scene="hero" className="relative" style={{ height: "220vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {/* Background video — zooms 1× → 1.35× */}
          <div
            className="absolute inset-0 will-change-transform"
            style={{ transform: "scale(calc(1 + var(--p,0) * 0.35))" }}
          >
            <video
              src="https://krnnifoypyilajatsmva.supabase.co/storage/v1/object/public/product-images/homepage/main-video/1NRI-2.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="h-full w-full object-cover object-top"
            />
          </div>

          {/* Overlay that darkens with scroll */}
          <div
            className="absolute inset-0 transition-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,calc(0.25 + var(--p,0) * 0.35)) 0%, rgba(0,0,0,calc(0.15 + var(--p,0) * 0.25)) 50%, rgba(0,0,0,calc(0.35 + var(--p,0) * 0.35)) 100%)",
            }}
          />

          {/* Title block */}
          <div className="relative text-center">
            {/* Top line — drifts UP + letter-spacing fans out + slight rotation */}
            <h1
              className="text-4xl font-bold uppercase text-white will-change-transform sm:text-6xl lg:text-7xl"
              style={{
                opacity: "calc(1 - var(--p,0) * 2.2)",
                transform:
                  "translateY(calc(var(--p,0) * -90px)) rotate(calc(var(--p,0) * -1.5deg))",
                letterSpacing: "calc(0.05em + var(--p,0) * 0.6em)",
              }}
            >
              Intercessory
            </h1>

            {/* Expanding horizontal divider */}
            <div
              className="mx-auto my-4 h-px bg-white/50 transition-none sm:my-6"
              style={{
                width: "calc(40px + var(--p,0) * 260px)",
                opacity: "calc(1 - var(--p,0) * 3)",
              }}
            />

            {/* Bottom line — drifts DOWN + fans out + counter-rotation */}
            <p
              className="text-4xl font-bold uppercase text-white will-change-transform sm:text-6xl lg:text-7xl"
              style={{
                opacity: "calc(1 - var(--p,0) * 2.2)",
                transform:
                  "translateY(calc(var(--p,0) * 90px)) rotate(calc(var(--p,0) * 1.5deg))",
                letterSpacing: "calc(0.05em + var(--p,0) * 0.6em)",
              }}
            >
              Department
            </p>

            {/* Subtitle */}
            <p
              className="mt-6 text-sm text-white/70 will-change-transform sm:text-base"
              style={{
                opacity: "calc(1 - var(--p,0) * 3.5)",
                transform: "translateY(calc(var(--p,0) * 50px))",
              }}
            >
              Realtree Camo Collection
            </p>

            {/* CTA */}
            <div
              className="mt-8"
              style={{ opacity: "calc(1 - var(--p,0) * 4.5)" }}
            >
              <Link
                href="/products"
                className="inline-block border border-white/80 bg-white/10 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
              >
                Shop Now
              </Link>
            </div>
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            style={{ opacity: "calc(1 - var(--p,0) * 8)" }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40">
                Scroll
              </span>
              <div className="relative h-10 w-px bg-white/20">
                <div className="absolute inset-x-0 top-0 h-1/2 animate-bounce bg-white/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SCENE 2 — HORIZONTAL SCROLL SHOWCASE
          Vertical scroll maps to horizontal panel translation.
          4 full-viewport panels glide left as the user scrolls down.
          ══════════════════════════════════════════════════════════════ */}
      <section
        data-scene="hscroll"
        className="relative"
        style={{ height: "500vh" }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* Horizontal track: 4 × 100vw = 400vw → translates 0 … −300vw */}
          <div
            className="flex h-full will-change-transform"
            style={{
              width: "400vw",
              transform: "translate3d(calc(var(--p,0) * -300vw), 0px, 0px)",
            }}
          >
            {collections.map((col, i) => (
              <div
                key={col.image}
                className="relative h-full flex-shrink-0"
                style={{ width: "100vw" }}
              >
                {/* Panel image — subtle inner parallax (shifts against scroll) */}
                <div
                  className="absolute inset-0 will-change-transform"
                  style={{
                    transform: `scale(1.15)`,
                  }}
                >
                  <Image
                    src={col.image}
                    alt={col.alt}
                    fill
                    className={`object-cover ${col.objectPos}`}
                    sizes="100vw"
                    priority={i < 2}
                  />
                </div>

                <div className="absolute inset-0 bg-black/35" />

                {/* Panel content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                  <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/40">
                    {String(i + 1).padStart(2, "0")} /{" "}
                    {String(collections.length).padStart(2, "0")}
                  </span>
                  <h2 className="mt-4 text-3xl font-bold uppercase tracking-wide text-white sm:text-5xl lg:text-6xl">
                    {col.title}
                  </h2>
                  <p className="mt-3 max-w-md text-sm text-white/70 sm:text-base">
                    {col.subtitle}
                  </p>
                  <Link
                    href={col.href}
                    className="mt-8 inline-block border border-white/80 bg-white/10 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
                  >
                    {col.cta}
                  </Link>
                </div>

                {/* Thin panel divider on the right */}
                {i < collections.length - 1 && (
                  <div className="absolute bottom-0 right-0 top-0 w-px bg-white/10" />
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="h-px w-24 overflow-hidden bg-white/20 sm:w-40">
              <div
                className="h-full bg-white/70 transition-none"
                style={{ width: "calc(var(--p,0) * 100%)" }}
              />
            </div>
          </div>

          {/* Directional arrows */}
          <div
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center sm:left-6"
            style={{ opacity: "calc(min(1, var(--p,0) * 10))" }}
          >
            <svg
              className="h-5 w-5 text-white/20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center sm:right-6"
            style={{ opacity: "calc(1 - var(--p,0))" }}
          >
            <svg
              className="h-5 w-5 text-white/20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SCENE 3 — CIRCLE REVEAL
          Image hidden behind an expanding clip-path circle; text
          fades in once the circle is large enough to read against.
          ══════════════════════════════════════════════════════════════ */}
      <section
        data-scene="reveal"
        className="relative"
        style={{ height: "220vh" }}
      >
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-950">
          {/* Image behind expanding circle */}
          <div
            className="absolute inset-0 transition-none"
            style={{
              clipPath: "circle(calc(3% + var(--p,0) * 72%) at 50% 50%)",
            }}
          >
            <Image
              src="/homepage/3.png"
              alt="Essentials collection"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/25" />
          </div>

          {/* Text — appears after circle is mostly open (p > 0.5) */}
          <div
            className="relative z-10 text-center"
            style={{
              opacity:
                "calc(min(max(0, (var(--p,0) - 0.5) * 4), 1))",
              transform:
                "translateY(calc((1 - min(max(0, (var(--p,0) - 0.5) * 4), 1)) * 40px))",
            }}
          >
            <h2 className="text-4xl font-bold uppercase tracking-wide text-white sm:text-6xl">
              Essentials
            </h2>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              Signature sweats in every colour you need
            </p>
            <Link
              href="/products"
              className="mt-8 inline-block border border-white/80 bg-white/10 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              Shop Bottoms
            </Link>
          </div>

          {/* Hint ring before the reveal begins */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6"
            style={{ opacity: "calc(1 - var(--p,0) * 5)" }}
          >
            <div className="h-20 w-20 rounded-full border border-neutral-300 dark:border-neutral-700 sm:h-28 sm:w-28" />
            <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-neutral-400">
              Keep scrolling
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SCENE 4 — ZOOM-THROUGH
          Image starts as a centred card (45 % scale, rounded corners)
          and zooms to full-bleed as the user scrolls through.
          ══════════════════════════════════════════════════════════════ */}
      <section
        data-scene="zoom"
        className="relative"
        style={{ height: "220vh" }}
      >
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-950">
          {/* Image card → full bleed */}
          <div
            className="absolute inset-0 will-change-transform transition-none"
            style={{
              transform: "scale(calc(0.4 + var(--p,0) * 0.6))",
              borderRadius: "calc((1 - var(--p,0)) * 24px)",
              overflow: "hidden",
            }}
          >
            <Image
              src="/homepage/4.jpeg"
              alt="Betrayer's Kiss"
              fill
              className="object-cover object-top"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/25" />
          </div>

          {/* Text overlay — fades in once zoom is ~60 % complete */}
          <div
            className="relative z-10 text-center"
            style={{
              opacity:
                "calc(min(max(0, (var(--p,0) - 0.55) * 3.5), 1))",
              transform:
                "translateY(calc((1 - min(max(0, (var(--p,0) - 0.55) * 3.5), 1)) * 50px))",
            }}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/60">
              Apoluo &mdash; Fall / Winter 2024
            </p>
            <h2 className="mt-4 text-4xl font-bold uppercase tracking-wide text-white sm:text-6xl">
              Betrayer&rsquo;s Kiss
            </h2>
            <Link
              href="/products"
              className="mt-8 inline-block border border-white/80 bg-white/10 px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              Explore
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SCENE 5 — COUNTER-SCROLL PARALLAX GALLERY
          Three columns of images scrolling at opposing speeds, with
          staggered vertical offsets for a layered editorial feel.
          ══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-32 sm:py-48">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-3 px-4 sm:gap-6">
          {/* Left column — drifts upward (against scroll) */}
          <div
            className="col-span-4 space-y-6 will-change-transform"
            data-speed="-0.18"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/homepage/1.jpeg"
                alt="Editorial 1"
                fill
                className="object-cover object-top"
                sizes="33vw"
              />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src="/homepage/3.png"
                alt="Editorial 2"
                fill
                className="object-cover"
                sizes="33vw"
              />
            </div>
          </div>

          {/* Centre column — drifts downward, offset start */}
          <div
            className="col-span-4 mt-24 space-y-6 will-change-transform sm:mt-40"
            data-speed="0.15"
          >
            <div className="relative aspect-[3/5] overflow-hidden">
              <Image
                src="/homepage/2.jpeg"
                alt="Editorial 3"
                fill
                className="object-cover object-top"
                sizes="33vw"
              />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/homepage/4.jpeg"
                alt="Editorial 4"
                fill
                className="object-cover object-top"
                sizes="33vw"
              />
            </div>
          </div>

          {/* Right column — drifts upward, smaller offset */}
          <div
            className="col-span-4 mt-12 space-y-6 will-change-transform sm:mt-20"
            data-speed="-0.1"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src="/homepage/4.jpeg"
                alt="Editorial 5"
                fill
                className="object-cover"
                sizes="33vw"
              />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/homepage/1.jpeg"
                alt="Editorial 6"
                fill
                className="object-cover object-top"
                sizes="33vw"
              />
            </div>
          </div>
        </div>

        {/* Floating centre manifesto */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="bg-neutral-50/80 px-10 py-6 text-center backdrop-blur-md dark:bg-neutral-950/80">
            <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-500">
              FW &rsquo;24
            </p>
            <p className="mt-2 font-serif text-2xl italic text-neutral-800 dark:text-neutral-200 sm:text-3xl">
              Faith-inspired streetwear
            </p>
            <p className="mt-1 font-serif text-lg italic text-neutral-500 dark:text-neutral-400 sm:text-xl">
              for the bold &amp; the believing
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SCENE 6 — CLOSING CTA
          Staggered text reveal with rising transforms
          ══════════════════════════════════════════════════════════════ */}
      <section
        data-scene="closing"
        className="relative"
        style={{ height: "140vh" }}
      >
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center border-t border-neutral-200 px-6 dark:border-neutral-800">
          {/* Line 1 — earliest */}
          <p
            className="text-[10px] font-medium uppercase tracking-[0.4em] text-neutral-400 dark:text-neutral-500"
            style={{
              opacity: "calc(min(var(--p,0) * 5, 1))",
              transform:
                "translateY(calc((1 - min(var(--p,0) * 5, 1)) * 30px))",
            }}
          >
            The Collection Awaits
          </p>

          {/* Line 2 — slight delay */}
          <h2
            className="mt-4 text-center text-3xl font-bold uppercase tracking-wide sm:text-5xl"
            style={{
              opacity: "calc(min(max(0, (var(--p,0) - 0.06) * 5), 1))",
              transform:
                "translateY(calc((1 - min(max(0, (var(--p,0) - 0.06) * 5), 1)) * 40px))",
            }}
          >
            Explore Everything
          </h2>

          {/* CTA — appears last */}
          <div
            className="mt-8"
            style={{
              opacity: "calc(min(max(0, (var(--p,0) - 0.15) * 5), 1))",
              transform:
                "translateY(calc((1 - min(max(0, (var(--p,0) - 0.15) * 5), 1)) * 30px))",
            }}
          >
            <Link
              href="/products"
              className="inline-block border border-neutral-900 bg-neutral-900 px-12 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-transparent hover:text-neutral-900 dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-transparent dark:hover:text-white"
            >
              Shop All
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          NEWSLETTER
          ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-neutral-200 bg-neutral-50 py-20 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto max-w-xl px-6 text-center">
          <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400 dark:text-neutral-500">
            Stay in the loop
          </h3>
          <p className="mt-3 text-2xl font-bold uppercase tracking-wide text-neutral-900 dark:text-neutral-100 sm:text-3xl">
            Join Our Newsletter
          </p>
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            Be the first to know about new drops, exclusive offers, and
            behind-the-scenes content.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
