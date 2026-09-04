"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Caveat } from "next/font/google";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { NewsletterSection } from "@/components/shop/NewsletterSection";

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "700"] });

/* ── Config ── */
// Fallbacks used only if the live figures can't be fetched (e.g. backend down
// at request time). Real values come from GET /analytics/road-to-hq via props.
const DEFAULT_TARGET_UNITS = 6000;
const DEFAULT_UNITS_SOLD = 0;
const DEADLINE = "2026-12-26";

/* ── SVG Geometry ── */
const CIRCLE = { cx: 400, cy: 400, r: 280 };
const GAP_DEG = 44;
const ARC_START_DEG = GAP_DEG / 2;
const ARC_END_DEG = 360 - GAP_DEG / 2;
const ARC_SWEEP_DEG = ARC_END_DEG - ARC_START_DEG;

function ptOnArc(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CIRCLE.cx + CIRCLE.r * Math.sin(rad), y: CIRCLE.cy - CIRCLE.r * Math.cos(rad) };
}

function arcPath(from: number, to: number) {
  const s = ptOnArc(from), e = ptOnArc(to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${CIRCLE.r} ${CIRCLE.r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const FULL_LEN = ((ARC_SWEEP_DEG / 360) * 2 * Math.PI * CIRCLE.r).toFixed(2);
const FULL_PATH = arcPath(ARC_START_DEG, ARC_END_DEG);
const START_PT = ptOnArc(ARC_START_DEG);
const END_PT = ptOnArc(ARC_END_DEG);
const MS_POSITIONS_DEG = Array.from({ length: 6 }, (_, i) =>
  ARC_START_DEG + ARC_SWEEP_DEG * ((i + 1) / 6)
);

/* ── Milestone data ── */
const MILESTONES = [
  {
    units: 1000, kicker: "Promise", title: "A day out with a customer",
    body: "When we hit our first thousand units, we're showing up - in person - for one customer who's been with us. A whole day, on us. Coffee, the city, the wardrobe edit they didn't know they needed.",
    window: "Q2 · 2026",
    image: "https://krnnifoypyilajatsmva.supabase.co/storage/v1/object/public/product-images/originals/1nri-quarter-zip/black__shot-3__1770027218488.jpg",
    objectPos: "object-[center_30%]",
  },
  {
    units: 2000, kicker: "Promise", title: "Climb Mount Afadjato",
    body: "Two thousand deep. The team climbs Mount Afadjato - Ghana's highest peak, 885 m. Full 1NRI kit, filmed start to summit. If we're asking you to back us, we should be willing to suffer a little too.",
    window: "Q2 · 2026",
    image: "https://krnnifoypyilajatsmva.supabase.co/storage/v1/object/public/product-images/originals/genesis-basic-top/product__main__1774011630200.jpg",
  },
  {
    units: 3000, kicker: "Promise", title: "Wildcard - a customer decides",
    body: "Halfway there, we hand the wheel over. One customer gets to pick the milestone - whatever they want us to do, build, or attempt. No veto, no committee. Their call, our commitment. (Nothing too crazy tho🫠)",
    window: "Q3 · 2026",
    image: "https://krnnifoypyilajatsmva.supabase.co/storage/v1/object/public/product-images/originals/intercessory-dept-hoodie-real-tree/product__shot-4__1774018322078.jpg",
  },
  {
    units: 4000, kicker: "Promise", title: "Charity Donation",
    body: "Four thousand units moved. We make a meaningful donation to a cause close to the community we're building in - chosen transparently, receipts shared. The road isn't just about us.",
    window: "Q3 · 2026",
    image: "https://krnnifoypyilajatsmva.supabase.co/storage/v1/object/public/product-images/originals/olive-grove/product__shot-4__1779112535448.jpg",
    objectPos: "object-[center_15%]",
  },
  {
    units: 5000, kicker: "Promise", title: "Street Interviews About Our Brand",
    body: "Five thousand in and we go to the streets - camera rolling, no script. We ask real people what they think of 1NRI: the clothes, the price, the name, all of it. Uncut, unfiltered, published raw.",
    window: "Q4 · 2026",
    image: "https://krnnifoypyilajatsmva.supabase.co/storage/v1/object/public/product-images/originals/sackcloth/product__shot-2__1774014162916.jpg",
    objectPos: "object-[center_10%]",
  },
  {
    units: 6000, kicker: "Goal", title: "HQ Tour & Party",
    body: "We close the road and open the doors. The new Accra headquarters, live and in person. A tour of the studio, the fitting room, the lounge - then a party for every customer who helped us get here.",
    window: "Dec · 2026",
    image: "https://krnnifoypyilajatsmva.supabase.co/storage/v1/object/public/product-images/originals/dusk-before-dawn-button-up/beige__main__1770027225978.jpg",
    objectPos: "object-[center_20%]",
  },
];

/* ── Image prefetch ── */
function prefetchImage(src: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = src;
}

/* ── Smooth scroll ──
   The fixed header overlays the page, so we land the target just below it.
   Hand-rolled rather than `scrollIntoView({ behavior: "smooth" })` so the
   easing and duration are consistent across browsers, and so a wheel/touch
   nudge mid-flight hands control straight back to the user. */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* Breathing room between the header and a "start"-aligned target. */
const START_GAP = 16;
/* How far a `fitBottom` target may slide up past the header to show its tail. */
const MAX_FIT_SHIFT = 140;

function headerOffset() {
  const h = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
  return Math.min(h, 96);
}

/* A sticky element reports the rect of wherever it's currently pinned, not of
   its place in the layout — which is the spot we actually want to scroll to.
   Briefly drop it out of sticky to read the real one. */
function layoutRect(el: HTMLElement) {
  if (getComputedStyle(el).position !== "sticky") return el.getBoundingClientRect();
  const prev = el.style.position;
  el.style.position = "static";
  const rect = el.getBoundingClientRect();
  el.style.position = prev;
  return rect;
}

function smoothScrollTo(
  el: HTMLElement,
  { block = "start", fitBottom = false }: { block?: "start" | "center"; fitBottom?: boolean } = {}
) {
  const from = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const rect = layoutRect(el);
  const header = headerOffset();
  // "start" parks the element under the header; "center" splits the leftover
  // viewport around it, so a tall section still reads as centred.
  let raw = block === "center"
    ? from + rect.top - header - Math.max(0, (window.innerHeight - header - rect.height) / 2)
    : from + rect.top - header - START_GAP;

  // When the element runs just past the fold, nudge down far enough to catch
  // its tail — capped so the top never scrolls out of sight on short screens.
  if (fitBottom) {
    const overflow = rect.height + START_GAP * 2 - (window.innerHeight - header);
    raw += Math.min(Math.max(0, overflow), MAX_FIT_SHIFT);
  }

  const to = Math.min(Math.max(0, raw), Math.max(0, maxScroll));
  const distance = to - from;
  if (Math.abs(distance) < 2) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    window.scrollTo(0, to);
    return;
  }

  // Longer trips get a little more time, but never a sluggish crawl.
  const duration = Math.min(1400, Math.max(650, Math.abs(distance) * 0.6));
  const start = performance.now();
  let frame = 0;
  let cancelled = false;

  function cancel() {
    cancelled = true;
    cancelAnimationFrame(frame);
    teardown();
  }
  function teardown() {
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
  }
  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancel);

  function step(now: number) {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, from + distance * easeInOutCubic(t));
    if (t < 1) {
      frame = requestAnimationFrame(step);
    } else {
      teardown();
    }
  }
  frame = requestAnimationFrame(step);
}

/* ── Shared animation variants ── */
const ease = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/* ── Page ── */
export default function RoadToHQPage({
  unitsSold = DEFAULT_UNITS_SOLD,
  targetUnits = DEFAULT_TARGET_UNITS,
}: {
  unitsSold?: number;
  targetUnits?: number;
} = {}) {
  const UNITS_SOLD = unitsSold;
  const TARGET_UNITS = targetUnits;
  const [active, setActive] = useState(0);
  const [displayUnits, setDisplayUnits] = useState(0);
  const [daysLeft, setDaysLeft] = useState(0);
  const activeRef = useRef(0);

  /* Parallax refs */
  const heroRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  /* Scroll target for the timeline list — lands on the milestone card itself */
  const cardRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const { scrollYProgress: ctaProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "end start"],
  });

  const heroImageY = useTransform(heroProgress, [0, 1], ["0%", "18%"]);
  const ctaImageY  = useTransform(ctaProgress,  [0, 1], ["-8%", "8%"]);

  useEffect(() => { activeRef.current = active; }, [active]);

  // Warm the browser cache for all milestone images so switching between
  // them feels instant. Deferred so it doesn't compete with the hero image.
  useEffect(() => {
    const ric = typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 300);
    const cic = typeof window.cancelIdleCallback === "function"
      ? window.cancelIdleCallback
      : clearTimeout;

    const handle = ric(() => {
      MILESTONES.forEach((ms) => prefetchImage(ms.image));
    });

    return () => cic(handle as never);
  }, []);

  useEffect(() => {
    const target = new Date(DEADLINE + "T00:00:00");
    // Depends on the visitor's clock, so it has to land after mount — computing
    // it during render would disagree with the server-rendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDaysLeft(Math.max(0, Math.ceil((target.getTime() - Date.now()) / 86400000)));
  }, []);

  useEffect(() => {
    if (UNITS_SOLD === 0) return;
    const start = performance.now();
    const dur = 1200;
    function step(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayUnits(Math.round(UNITS_SOLD * eased));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, []);

  const scrollToLearnMore = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (new tab/window) behave normally.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const el = document.getElementById("learn-more");
    if (!el) return;
    e.preventDefault();
    smoothScrollTo(el);
    // Keep the URL shareable without letting the browser jump there itself.
    window.history.replaceState(null, "", "#learn-more");
  }, []);

  const goTo = useCallback((i: number) => {
    const next = ((i % MILESTONES.length) + MILESTONES.length) % MILESTONES.length;
    setActive(next);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft")  goTo(activeRef.current - 1);
      if (e.key === "ArrowRight") goTo(activeRef.current + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo]);

  const ratio = displayUnits / TARGET_UNITS;
  const curDeg = ARC_START_DEG + ARC_SWEEP_DEG * ratio;
  const progressPath = ratio > 0.0005 ? arcPath(ARC_START_DEG, curDeg) : "";
  const posPt = ptOnArc(curDeg);

  const m = MILESTONES[active];
  const mDone = m.units <= UNITS_SOLD;

  return (
    <>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 38s linear infinite; }

        @keyframes ring-pulse {
          0%   { transform: scale(1); opacity: .6; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .ring-pulse::after {
          content: ""; position: absolute; inset: 0;
          border-radius: 9999px; background: currentColor;
          animation: ring-pulse 2.2s ease-out infinite;
        }

        @keyframes draw-road {
          from { stroke-dashoffset: ${FULL_LEN}; }
          to   { stroke-dashoffset: 0; }
        }
        .road-draw {
          stroke-dasharray: ${FULL_LEN};
          stroke-dashoffset: ${FULL_LEN};
          animation: draw-road 2.4s cubic-bezier(0.2,0.7,0.2,1) 0.4s both;
        }

        .ms-dot { transition: transform .2s cubic-bezier(0.2,0.7,0.2,1); cursor: pointer; }
        .ms-dot:hover, .ms-dot.is-active { transform: scale(1.18); }
        .road-centerline { stroke-dasharray: 1 14; stroke-linecap: round; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .display { letter-spacing: -0.015em; }
      `}</style>

      {/* ── 1. HERO ── */}
      <section id="rthq-hero" ref={heroRef} className="relative h-screen min-h-[720px] overflow-hidden bg-neutral-900">
        {/* Parallax image */}
        <motion.div className="absolute inset-0 will-change-transform" style={{ y: heroImageY }}>
          <Image
            src="/homepage/7.jpg"
            alt="1NRI model wearing streetwear in Accra, Ghana"
            fill
            sizes="100vw"
            quality={85}
            className="hidden sm:block object-cover object-[center_5%] scale-110"
            priority
          />
          <Image
            src="/homepage/7.jpg"
            alt="1NRI model wearing streetwear in Accra, Ghana"
            fill
            sizes="100vw"
            quality={85}
            className="block sm:hidden object-cover object-[50%_25%] scale-110"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/70" />
        <div className="absolute inset-0 bg-black/20" />

        {/* Deadline kicker */}
        <motion.div
          className="absolute left-0 right-0 top-[150px] flex flex-col items-center gap-1 px-6 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
        >
          <div className="flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-white/60">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
            <span><span className="text-green-400">Live</span> · Deadline</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
          </div>
          <div className={`${caveat.className} text-[2.4375rem] sm:text-6xl lg:text-7xl text-white leading-none`} style={{ fontWeight: 500 }}>
            26.12.2026
          </div>
        </motion.div>

        {/* Center copy — staggered */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center sm:translate-y-8"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={fadeUp} className="display mt-1 sm:mt-4 text-[2.25rem] font-bold uppercase tracking-tight text-white sm:text-7xl lg:text-[7.5rem]">
            Road to HQ
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 max-w-xl text-sm text-white/100 sm:text-base">
            Six thousand units stand between us and a permanent home in Accra. Every piece moves the needle.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 w-full max-w-xs sm:max-w-lg grid grid-cols-3 items-end sm:items-center gap-2 sm:gap-6 text-white">
            <div className="text-left">
              <div className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">Sold</div>
              <div className="mt-1 font-mono text-xl sm:text-3xl font-semibold tabular-nums md:text-4xl">{displayUnits.toLocaleString()}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-px w-16 sm:w-40 md:w-56 bg-white/20 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${ratio * 100}%` }} />
              </div>
              <div className="mt-2 text-[9px] sm:text-[13px] font-medium uppercase tracking-[0.15em] sm:tracking-[0.3em] text-white/80 font-mono">
                {(ratio * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.3em] text-white/50">Target</div>
              <div className="mt-1 font-mono text-xl sm:text-3xl font-semibold tabular-nums md:text-4xl">6,000</div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 flex w-full max-w-xs sm:max-w-none flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/products" className="inline-block w-full sm:w-56 bg-white px-6 sm:px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-white/85 text-center">
              Shop Now
            </Link>
            <a href="#learn-more" onClick={scrollToLearnMore} className="inline-block w-full sm:w-56 border border-white/80 bg-white/5 px-6 sm:px-10 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black text-center">
              Learn More
            </a>
          </motion.div>
        </motion.div>

        <motion.a
          href="#learn-more"
          onClick={scrollToLearnMore}
          className="cursor-pointer absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 transition-colors hover:text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <span className="text-[9px] font-medium uppercase tracking-[0.4em] font-mono">Keep scrolling</span>
          <svg className="h-4 w-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.a>
      </section>

      {/* ── 2. MANIFESTO ── */}
      <section id="learn-more" className="border-t border-line py-24 sm:py-32 px-6">
        <motion.div
          className="mx-auto max-w-4xl"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-text-muted font-mono">
            <span>Ch. 01</span>
            <span className="h-px w-8 bg-line-strong" />
            <span>The plan, plainly</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="display mt-6 text-center text-3xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight">
            We have to sell <span className="font-mono tabular-nums">6,000</span> units<br />
            <span className="text-text-muted">to afford a place to live.</span>
            {" "}<span className="font-mono text-text-placeholder">LOL</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-8 mx-auto max-w-2xl text-center text-base sm:text-lg text-text-secondary leading-relaxed">
            1NRI is moving into its first permanent headquarters in Accra by{" "}
            <span className="font-mono">26.12.2026</span>; a studio, a fitting room, and somewhere
            our distributed production network in Northern Ghana can finally call home. The math is simple.
            The road is not.
          </motion.p>

          <motion.div variants={staggerFast} className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { value: "6,000", label: "Units to sell" },
              { value: daysLeft > 0 ? daysLeft.toLocaleString() : "-", label: "Days remaining", border: true },
              { value: "06", label: "Milestones" },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp} className={stat.border ? "border-x border-line" : ""}>
                <div className="font-mono text-2xl sm:text-3xl md:text-4xl font-semibold tabular-nums">{stat.value}</div>
                <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.3em] text-text-muted font-mono">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── 3. THE ROAD ── */}
      <section id="road-section" className="relative bg-surface-subtle border-y border-line py-24 sm:py-32 px-6 overflow-hidden">
        <motion.div
          className="mx-auto max-w-7xl mb-12 sm:mb-20"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-text-muted font-mono">
            <span>Ch. 02</span>
            <span className="h-px w-8 bg-line-strong" />
            <span>The road, charted</span>
          </motion.div>
          <motion.h2 variants={fadeUp} className="display mt-6 text-center text-3xl sm:text-5xl font-bold uppercase tracking-tight">
            Six milestones.<br />
            <span className="text-text-muted">One headquarters.</span>
          </motion.h2>
        </motion.div>

        <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-12 items-start">

          {/* SVG Road */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease }}
            viewport={{ once: true, margin: "-40px" }}
          >
            <svg viewBox="-60 0 920 820" className="w-full max-w-[760px] mx-auto block overflow-visible" aria-label="Road to HQ - milestone circle">
              <defs>
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
                  <stop offset="60%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx={CIRCLE.cx} cy={CIRCLE.cy} r={280} fill="url(#centerGlow)" className="text-text" />
              <path d={FULL_PATH} fill="none" className="stroke-line-strong" strokeWidth={64} strokeLinecap="round" opacity={0.35} />
              <path d={FULL_PATH} fill="none" className="road-draw stroke-text" strokeWidth={2} strokeLinecap="round" />
              <path d={FULL_PATH} fill="none" className="road-centerline stroke-text" strokeWidth={2} opacity={0.55} />
              {progressPath && (
                <path d={progressPath} fill="none" className="stroke-text" strokeWidth={8} strokeLinecap="round" />
              )}
              <g>
                <line x1={START_PT.x} y1={START_PT.y - 22} x2={START_PT.x} y2={START_PT.y + 22} className="stroke-text" strokeWidth={2} />
                <text x={START_PT.x - 14} y={START_PT.y - 30} textAnchor="end" className="fill-text-secondary font-mono" style={{ fontSize: 11, letterSpacing: ".32em", textTransform: "uppercase" }}>Start</text>
                <text x={START_PT.x - 14} y={START_PT.y - 14} textAnchor="end" className="fill-text" style={{ fontSize: 14, fontWeight: 600 }}>0 sold</text>
              </g>
              <g>
                <line x1={END_PT.x} y1={END_PT.y - 22} x2={END_PT.x} y2={END_PT.y + 22} className="stroke-text" strokeWidth={2} />
                <text x={END_PT.x + 14} y={END_PT.y - 30} className="fill-text-secondary font-mono" style={{ fontSize: 11, letterSpacing: ".32em", textTransform: "uppercase" }}>Finish</text>
                <text x={END_PT.x + 14} y={END_PT.y - 14} className="fill-text" style={{ fontSize: 14, fontWeight: 600 }}>HQ open</text>
              </g>
              {MS_POSITIONS_DEG.map((deg, i) => {
                const p = ptOnArc(deg);
                const rad = (deg * Math.PI) / 180;
                const lx = CIRCLE.cx + (CIRCLE.r + 40) * Math.sin(rad);
                const ly = CIRCLE.cy - (CIRCLE.r + 40) * Math.cos(rad);
                const anchor = Math.sin(rad) > 0.1 ? "start" : Math.sin(rad) < -0.1 ? "end" : "middle";
                const dy = Math.cos(rad) > 0.3 ? -4 : Math.cos(rad) < -0.3 ? 18 : 6;
                const past = MILESTONES[i].units <= UNITS_SOLD;
                return (
                  <g
                    key={i}
                    className={`ms-dot${active === i ? " is-active" : ""}`}
                    onClick={() => goTo(i)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(i); } }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Milestone ${i + 1}: ${MILESTONES[i].title}`}
                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                  >
                    <circle cx={p.x} cy={p.y} r={22}
                      className={past ? "fill-text stroke-text" : "fill-bg stroke-text"}
                      strokeWidth={2} />
                    <text x={p.x} y={p.y + 5} textAnchor="middle"
                      className={past ? "fill-bg font-mono" : "fill-text font-mono"}
                      style={{ fontSize: 13, fontWeight: 600 }}>
                      {String(i + 1).padStart(2, "0")}
                    </text>
                    <text x={lx} y={ly + dy} textAnchor={anchor as "start" | "end" | "middle"}
                      className="fill-text-secondary font-mono"
                      style={{ fontSize: 10, letterSpacing: ".32em", textTransform: "uppercase" }}>
                      {MILESTONES[i].units.toLocaleString()} units
                    </text>
                  </g>
                );
              })}
              <foreignObject x={posPt.x - 14} y={posPt.y - 14} width={28} height={28}>
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 ring-pulse text-text" />
                  <div className="absolute inset-0 rounded-full bg-invert-bg border-2 border-bg" />
                </div>
              </foreignObject>
              <g textAnchor="middle">
                <text x={400} y={376} className="fill-text-muted font-mono" style={{ fontSize: 11, letterSpacing: ".32em", textTransform: "uppercase" }}>Goal</text>
                <text x={400} y={420} className="fill-text" style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.02em" }}>HQ</text>
                <text x={400} y={448} className="fill-text-secondary font-mono" style={{ fontSize: 11, letterSpacing: ".32em", textTransform: "uppercase" }}>Accra · 26.12.2026</text>
              </g>
            </svg>
            <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-[0.4em] text-text-muted font-mono">
              Click a milestone · ←/→ to cycle
            </p>
          </motion.div>

          {/* Milestone detail card — AnimatePresence swap */}
          <motion.aside
            ref={cardRef}
            className="lg:sticky lg:top-28"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            viewport={{ once: true }}
          >
            <AnimatePresence mode="wait">
              <motion.article
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease }}
                className="border border-line bg-bg"
              >
                <div className="flex items-center justify-between border-b border-line px-5 py-4 font-mono text-[10px] uppercase tracking-[0.3em] text-text-secondary">
                  <span>Milestone {String(active + 1).padStart(2, "0")} / 06</span>
                  <span>{m.units.toLocaleString()} units</span>
                </div>
                <div className="relative aspect-[4/3] bg-surface-subtle overflow-hidden">
                  <Image src={m.image} alt={m.title} fill sizes="(max-width: 768px) 100vw, 50vw" className={`object-cover ${m.objectPos ?? "object-center"}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.3em] text-white font-mono">
                    <span className={`h-1.5 w-1.5 rounded-full ${mDone ? "bg-emerald-400" : "bg-amber-300"}`} />
                    <span>{mDone ? "Reached" : "Upcoming"}</span>
                  </div>
                </div>
                <div className="px-5 py-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-muted">{m.kicker}</p>
                  <h3 className="display mt-2 text-2xl sm:text-3xl font-bold uppercase tracking-tight">{m.title}</h3>
                  <p className="mt-3 text-sm text-text-secondary leading-relaxed">{m.body}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-[11px] font-mono uppercase tracking-[0.2em] text-text-secondary border-t border-line pt-4">
                    <div>
                      <div className="text-text-muted">Trigger</div>
                      <div className="mt-1 text-text">{m.units.toLocaleString()} sold</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Window</div>
                      <div className="mt-1 text-text">{m.window}</div>
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-line">
                  <button onClick={() => goTo(active - 1)} className="flex-1 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.25em] text-text-secondary hover:text-text transition flex items-center justify-center gap-2">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M15 18l-6-6 6-6" /></svg>
                    Prev
                  </button>
                  <div className="w-px bg-fill" />
                  <button onClick={() => goTo(active + 1)} className="flex-1 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.25em] text-text-secondary hover:text-text transition flex items-center justify-center gap-2">
                    Next
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                </div>
              </motion.article>
            </AnimatePresence>

            <motion.div
              className="mt-4 flex flex-col gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Link href="/products" className="block w-full text-center bg-invert-bg text-invert-fg px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] hover:opacity-90 transition">
                Add one to the count
              </Link>
              <p className="text-center text-[10px] font-mono uppercase tracking-[0.3em] text-text-muted">
                Every piece sold = one notch closer
              </p>
            </motion.div>
          </motion.aside>
        </div>

        {/* Mobile horizontal strip */}
        <div className="lg:hidden mt-14 -mx-6 px-6 overflow-x-auto no-scrollbar">
          <div className="flex gap-4 min-w-max">
            {MILESTONES.map((ms, i) => (
              <button key={i} onClick={() => goTo(i)} className="w-64 shrink-0 text-left border border-line bg-bg p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-text-muted">{String(i + 1).padStart(2, "0")} · {ms.units.toLocaleString()} units</div>
                <div className="mt-2 text-sm font-semibold uppercase tracking-tight">{ms.title}</div>
                <div className="mt-2 text-xs text-text-secondary leading-snug">{ms.body.slice(0, 110)}…</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. MARQUEE ── */}
      <section className="overflow-hidden border-b border-line py-6 bg-surface-subtle">
        <div className="flex whitespace-nowrap marquee-track">
          {[0, 1].map((k) => (
            <div key={k} className="flex items-center gap-8 px-8 text-2xl sm:text-4xl font-bold uppercase tracking-tight text-text" aria-hidden={k === 1 ? true : undefined}>
              <span>Road to HQ</span><span className="text-text-placeholder">·</span>
              <span className="font-mono">26.12.2026</span><span className="text-text-placeholder">·</span>
              <span>Accra, Ghana</span><span className="text-text-placeholder">·</span>
              <span>6,000 units</span><span className="text-text-placeholder">·</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. TIMELINE ── */}
      <section className="py-24 sm:py-32 px-6">
        <div className="mx-auto max-w-5xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.4em] text-text-muted font-mono">
              <span>Ch. 03</span>
              <span className="h-px w-8 bg-line-strong" />
              <span>The whole list</span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="display mt-6 text-center text-3xl sm:text-5xl font-bold uppercase tracking-tight">
              Every promise, in order.
            </motion.h2>
          </motion.div>

          <motion.ol
            className="mt-14 divide-y divide-line border-t border-b border-line"
            variants={staggerFast}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {MILESTONES.map((ms, i) => {
              const done = ms.units <= UNITS_SOLD;
              return (
                <motion.li
                  key={i}
                  variants={fadeUp}
                  className="grid grid-cols-[40px_1fr] sm:grid-cols-[60px_140px_1fr_180px] items-start sm:items-center gap-3 sm:gap-4 py-5 sm:py-6 px-2 cursor-pointer hover:bg-surface-subtle transition"
                  onClick={() => {
                    goTo(i);
                    if (cardRef.current) smoothScrollTo(cardRef.current, { fitBottom: true });
                  }}
                >
                  <div className="font-mono text-xl sm:text-2xl md:text-3xl font-semibold text-text-placeholder tabular-nums">{String(i + 1).padStart(2, "0")}</div>
                  <div className="hidden sm:block font-mono text-sm tabular-nums text-text">{ms.units.toLocaleString()} units</div>
                  <div>
                    <div className="text-sm sm:text-base md:text-lg font-semibold uppercase tracking-tight">{ms.title}</div>
                    <div className="sm:hidden mt-0.5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">
                      {ms.units.toLocaleString()} units · {done ? "Reached" : ms.window}
                    </div>
                    <div className="text-xs text-text-secondary mt-1 leading-snug max-w-xl">{ms.body}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <span className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] ${done ? "text-emerald-600" : "text-text-secondary"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-line-strong"}`} />
                      {done ? "Reached" : ms.window}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>
        </div>
      </section>

      {/* ── 6. CLOSING CTA ── */}
      <section ref={ctaRef} className="relative h-[80vh] min-h-[560px] overflow-hidden">
        <motion.div className="absolute inset-0 will-change-transform" style={{ y: ctaImageY }}>
          <Image src="/homepage/2.jpeg" alt="1NRI clothing collection - shop the drop" fill sizes="100vw" quality={85} className="object-cover object-top scale-110" />
        </motion.div>
        <div className="absolute inset-0 bg-black/55" />
        <motion.div
          className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p variants={fadeUp} className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/60 font-mono">Be part of it</motion.p>
          <motion.h2 variants={fadeUp} className="display mt-4 text-4xl sm:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-white">
            One unit at a time.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 max-w-md text-sm text-white/70">Pick a piece. Move the dial. Watch the road close.</motion.p>
          <motion.div variants={fadeUp} className="mt-10">
            <Link href="/products" className="inline-block whitespace-nowrap bg-white px-12 py-4 text-xs font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-white/85">
              Shop the drop
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <NewsletterSection />
    </>
  );
}
