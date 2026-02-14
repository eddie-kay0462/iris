"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/* ------------------------------------------------------------------ */
/*  Scroll engine — updates CSS vars on [data-scene] elements and      */
/*  applies transform on [data-speed] parallax elements every frame.   */
/*  Uses only transform / opacity for GPU-composited 60 fps.           */
/* ------------------------------------------------------------------ */

function useScrollEngine() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let ticking = false;

    const update = () => {
      const vh = window.innerHeight;

      /* --p: 0 → 1 progress through each scene's scrollable area ---- */
      root.querySelectorAll<HTMLElement>("[data-scene]").forEach((s) => {
        const r = s.getBoundingClientRect();
        const scrollable = s.offsetHeight - vh;
        const p = scrollable > 0 ? clamp(-r.top / scrollable) : 0;
        s.style.setProperty("--p", p.toFixed(4));
      });

      /* parallax: offset based on distance from viewport centre ------ */
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
/*  Stacking card — each card sticks at top:0, next card slides over   */
/*  Image subtly zooms out and darkens as the card "recedes" behind    */
/* ------------------------------------------------------------------ */

function StackCard({
  src,
  alt,
  label,
  sublabel,
  index,
}: {
  src: string;
  alt: string;
  label: string;
  sublabel: string;
  index: number;
}) {
  return (
    <div data-scene={`card-${index}`} style={{ height: "140vh" }}>
      <div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ zIndex: index + 1 }}
      >
        {/* Image with slow zoom-out as card recedes */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: "scale(calc(1.08 - var(--p,0) * 0.08))" }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover object-top"
            sizes="100vw"
            priority={index === 0}
          />
        </div>

        {/* Bottom gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

        {/* Darkening veil as next card covers this one */}
        <div
          className="pointer-events-none absolute inset-0 bg-black transition-none"
          style={{ opacity: "calc(var(--p,0) * 0.35)" }}
        />

        {/* Top-edge hairline for depth between cards */}
        {index > 0 && (
          <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        )}

        {/* Caption */}
        <div
          className="absolute bottom-0 left-0 right-0 p-8 sm:p-16 will-change-transform"
          style={{
            opacity: "calc(1 - var(--p,0) * 2)",
            transform: "translateY(calc(var(--p,0) * -30px))",
          }}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/50">
            {sublabel}
          </p>
          <h2 className="mt-2 font-serif text-3xl font-light text-white sm:text-5xl">
            {label}
          </h2>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LookbookPage() {
  const containerRef = useScrollEngine();

  return (
    <div
      ref={containerRef}
      className="bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
    >
      {/* ═══════════════════════════════════════════════════════════════
          SCENE 1 — Hero
          Full-viewport, zoom-on-scroll background, centred title
          ═══════════════════════════════════════════════════════════════ */}
      <section data-scene="hero" className="relative" style={{ height: "200vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {/* Background — scales up gently as you scroll */}
          <div
            className="absolute inset-0 will-change-transform"
            style={{ transform: "scale(calc(1 + var(--p,0) * 0.2))" }}
          >
            <Image
              src="/homepage/1.jpeg"
              alt="FW24 Hero"
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>

          <div className="absolute inset-0 bg-black/40" />

          {/* Title block — fades & floats upward */}
          <div
            className="relative text-center will-change-transform"
            style={{
              opacity: "calc(1 - var(--p,0) * 2.5)",
              transform: "translateY(calc(var(--p,0) * -100px))",
            }}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.5em] text-white/60 sm:text-xs">
              Fall / Winter 2024
            </p>
            <h1 className="mt-4 text-5xl font-extralight uppercase tracking-[0.25em] text-white sm:mt-6 sm:text-[7rem] sm:leading-none">
              Apoluo
            </h1>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.5em] text-white/60 sm:mt-5 sm:text-xs">
              Lookbook
            </p>
          </div>

          {/* Scroll hint */}
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            style={{ opacity: "calc(1 - var(--p,0) * 6)" }}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/40">
                Scroll
              </span>
              <div className="relative h-8 w-px overflow-hidden bg-white/20">
                <div className="absolute inset-x-0 top-0 h-full w-full animate-pulse bg-white/60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SCENE 2 — Editorial statement
          Large serif text fades in, holds, then fades out
          ═══════════════════════════════════════════════════════════════ */}
      <section data-scene="statement" className="relative" style={{ height: "160vh" }}>
        <div className="sticky top-0 flex h-screen items-center justify-center px-6">
          <div className="max-w-3xl text-center">
            <p
              className="font-serif text-2xl leading-relaxed sm:text-4xl sm:leading-relaxed"
              style={{
                opacity:
                  "calc(min(var(--p,0) * 4, 1) * (1 - max(0, (var(--p,0) - 0.7) * 3.33)))",
                transform: "translateY(calc((1 - min(var(--p,0) * 4, 1)) * 50px))",
              }}
            >
              The year it all makes sense.
            </p>

            <p
              className="mt-8 font-serif text-lg italic text-neutral-500 dark:text-neutral-400 sm:mt-12 sm:text-2xl"
              style={{
                opacity:
                  "calc(min(max(0, (var(--p,0) - 0.12) * 4), 1) * (1 - max(0, (var(--p,0) - 0.7) * 3.33)))",
                transform:
                  "translateY(calc((1 - min(max(0, (var(--p,0) - 0.12) * 4), 1)) * 50px))",
              }}
            >
              Apoluo means to fall away&hellip;
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SCENE 3 — Stacking cards
          Three full-viewport images stack via sticky positioning.
          Each card darkens & zooms out as the next slides over it.
          ═══════════════════════════════════════════════════════════════ */}
      <section>
        <StackCard
          src="/homepage/1.jpeg"
          alt="Chapter I"
          label="Origins"
          sublabel="Chapter I"
          index={0}
        />
        <StackCard
          src="/homepage/2.jpeg"
          alt="Chapter II"
          label="Evolution"
          sublabel="Chapter II"
          index={1}
        />
        <StackCard
          src="/homepage/4.jpeg"
          alt="Chapter III"
          label="Identity"
          sublabel="Chapter III"
          index={2}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SCENE 4 — Parallax split
          Two images scroll at opposing speeds; centre overlay text
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-32 sm:py-48">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:gap-8">
          <div data-speed="-0.15" className="will-change-transform">
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/homepage/3.png"
                alt="Detail left"
                fill
                className="object-cover"
                sizes="50vw"
              />
            </div>
          </div>
          <div data-speed="0.15" className="mt-16 will-change-transform sm:mt-32">
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/homepage/4.jpeg"
                alt="Detail right"
                fill
                className="object-cover"
                sizes="50vw"
              />
            </div>
          </div>
        </div>

        {/* Floating centre caption */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="bg-neutral-50/80 px-8 py-4 font-serif text-lg italic text-neutral-600 backdrop-blur-sm dark:bg-neutral-950/80 dark:text-neutral-400 sm:text-2xl">
            Between stillness &amp; motion
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SCENE 5 — Full-bleed zoom
          Sticky full-viewport image that scales on scroll; overlay
          text fades in at the midpoint and out near the end
          ═══════════════════════════════════════════════════════════════ */}
      <section data-scene="bleed" className="relative" style={{ height: "180vh" }}>
        <div className="sticky top-0 h-screen overflow-hidden">
          <div
            className="absolute inset-0 will-change-transform"
            style={{ transform: "scale(calc(1 + var(--p,0) * 0.15))" }}
          >
            <Image
              src="/homepage/2.jpeg"
              alt="Full bleed editorial"
              fill
              className="object-cover object-top"
              sizes="100vw"
            />
          </div>

          <div className="absolute inset-0 bg-black/25" />

          {/* Text overlay — appears at ~30 % progress, fades at ~80 % */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              opacity:
                "calc(min(max(0, (var(--p,0) - 0.3) * 3.33), 1) * (1 - max(0, (var(--p,0) - 0.8) * 5)))",
            }}
          >
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/60">
                The Collection
              </p>
              <p className="mt-4 font-serif text-3xl font-light text-white sm:text-6xl">
                Fall / Winter 2024
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SCENE 6 — Detail gallery
          Offset three-column grid; each column parallaxes at its own
          speed for a subtle layered depth effect
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden py-24 sm:py-40">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 px-4">
          {/* Left — tall, slow */}
          <div data-speed="-0.1" className="col-span-5 will-change-transform">
            <div className="relative aspect-[3/5] overflow-hidden">
              <Image
                src="/homepage/4.jpeg"
                alt="Detail 1"
                fill
                className="object-cover object-top"
                sizes="40vw"
              />
            </div>
          </div>

          {/* Centre — offset down, faster */}
          <div
            data-speed="0.12"
            className="col-span-4 mt-20 will-change-transform sm:mt-32"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src="/homepage/1.jpeg"
                alt="Detail 2"
                fill
                className="object-cover"
                sizes="33vw"
              />
            </div>
          </div>

          {/* Right — small, pushed down further */}
          <div
            data-speed="-0.08"
            className="col-span-3 mt-40 will-change-transform sm:mt-56"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src="/homepage/3.png"
                alt="Detail 3"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SCENE 7 — Closing
          ═══════════════════════════════════════════════════════════════ */}
      <section data-scene="closing" className="relative" style={{ height: "130vh" }}>
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center border-t border-neutral-200 dark:border-neutral-800">
          <div
            className="text-center"
            style={{
              opacity: "calc(min(var(--p,0) * 3.5, 1))",
              transform: "translateY(calc((1 - min(var(--p,0) * 3.5, 1)) * 50px))",
            }}
          >
            <p className="font-serif text-lg italic text-neutral-500 dark:text-neutral-400 sm:text-2xl">
              Fall / Winter 2024
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Image
                src="/homepage_img/no-bg-1NRI.png"
                alt="1NRI"
                width={72}
                height={29}
                className="h-5 w-auto min-w-[36px] dark:invert"
                unoptimized
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] sm:text-xs">
                &mdash; Apoluo Collection
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
