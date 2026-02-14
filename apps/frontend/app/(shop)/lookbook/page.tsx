"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Image data — reusing homepage images in editorial arrangements     */
/* ------------------------------------------------------------------ */

const rows: {
  layout: "triple" | "double" | "single" | "offset";
  images: { src: string; alt: string; aspect?: string }[];
}[] = [
  {
    layout: "triple",
    images: [
      { src: "/homepage/1.jpeg", alt: "Camo look — left", aspect: "aspect-[3/4]" },
      { src: "/homepage/2.jpeg", alt: "Black set — center", aspect: "aspect-[3/4]" },
      { src: "/homepage/4.jpeg", alt: "Jacket — right", aspect: "aspect-[3/4]" },
    ],
  },
  {
    layout: "double",
    images: [
      { src: "/homepage/3.png", alt: "Pants detail", aspect: "aspect-[16/9]" },
      { src: "/homepage/1.jpeg", alt: "Camo look — wide", aspect: "aspect-[16/9]" },
    ],
  },
  {
    layout: "offset",
    images: [
      { src: "/homepage/4.jpeg", alt: "Betrayer's Kiss close", aspect: "aspect-[4/5]" },
      { src: "/homepage/2.jpeg", alt: "Black set", aspect: "aspect-[4/5]" },
      { src: "/homepage/3.png", alt: "Essentials lineup", aspect: "aspect-[4/5]" },
    ],
  },
  {
    layout: "single",
    images: [
      { src: "/homepage/1.jpeg", alt: "Camo hero — full width", aspect: "aspect-[21/9]" },
    ],
  },
  {
    layout: "triple",
    images: [
      { src: "/homepage/2.jpeg", alt: "Model portrait", aspect: "aspect-[3/4]" },
      { src: "/homepage/4.jpeg", alt: "Back detail", aspect: "aspect-[3/4]" },
      { src: "/homepage/3.png", alt: "Colour range", aspect: "aspect-[3/4]" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Scroll-reveal hook                                                 */
/* ------------------------------------------------------------------ */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    const items = el.querySelectorAll(".reveal-item");
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ------------------------------------------------------------------ */
/*  Row renderers                                                      */
/* ------------------------------------------------------------------ */

function TripleRow({ images }: { images: typeof rows[0]["images"] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {images.map((img, i) => (
        <div
          key={i}
          className="reveal-item translate-y-8 opacity-0 transition-all duration-700 ease-out"
          style={{ transitionDelay: `${i * 150}ms` }}
        >
          <div className={`relative overflow-hidden ${img.aspect || "aspect-[3/4]"}`}>
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover object-top"
              sizes="33vw"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DoubleRow({ images }: { images: typeof rows[0]["images"] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
      {images.map((img, i) => (
        <div
          key={i}
          className="reveal-item translate-y-8 opacity-0 transition-all duration-700 ease-out"
          style={{ transitionDelay: `${i * 200}ms` }}
        >
          <div className={`relative overflow-hidden ${img.aspect || "aspect-[16/9]"}`}>
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover object-center"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SingleRow({ images }: { images: typeof rows[0]["images"] }) {
  const img = images[0];
  return (
    <div className="reveal-item translate-y-8 opacity-0 transition-all duration-1000 ease-out">
      <div className={`relative overflow-hidden ${img.aspect || "aspect-[21/9]"}`}>
        <Image
          src={img.src}
          alt={img.alt}
          fill
          className="object-cover object-top"
          sizes="100vw"
        />
      </div>
    </div>
  );
}

function OffsetRow({ images }: { images: typeof rows[0]["images"] }) {
  return (
    <div className="grid grid-cols-12 gap-2 sm:gap-3">
      {/* Left — spans 5 cols, pushed down */}
      <div
        className="reveal-item col-span-5 translate-y-8 opacity-0 transition-all duration-700 ease-out pt-12 sm:pt-20"
      >
        <div className={`relative overflow-hidden ${images[0]?.aspect || "aspect-[4/5]"}`}>
          <Image
            src={images[0].src}
            alt={images[0].alt}
            fill
            className="object-cover object-top"
            sizes="40vw"
          />
        </div>
      </div>
      {/* Center — spans 4 cols */}
      <div
        className="reveal-item col-span-4 translate-y-8 opacity-0 transition-all duration-700 ease-out"
        style={{ transitionDelay: "150ms" }}
      >
        <div className={`relative overflow-hidden ${images[1]?.aspect || "aspect-[4/5]"}`}>
          <Image
            src={images[1].src}
            alt={images[1].alt}
            fill
            className="object-cover object-top"
            sizes="33vw"
          />
        </div>
      </div>
      {/* Right — spans 3 cols, pushed down more */}
      <div
        className="reveal-item col-span-3 translate-y-8 opacity-0 transition-all duration-700 ease-out pt-24 sm:pt-36"
        style={{ transitionDelay: "300ms" }}
      >
        <div className={`relative overflow-hidden ${images[2]?.aspect || "aspect-[4/5]"}`}>
          <Image
            src={images[2].src}
            alt={images[2].alt}
            fill
            className="object-cover object-center"
            sizes="25vw"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LookbookPage() {
  const containerRef = useScrollReveal();

  return (
    <div ref={containerRef}>
      {/* ---- Lookbook header ---- */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            FW&apos;24
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.3em] text-gray-900 dark:text-white">
            Apoluo
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            Lookbook
          </span>
        </div>
      </div>

      {/* ---- Intro text ---- */}
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:py-28">
        <p className="reveal-item translate-y-6 font-serif text-xl italic leading-relaxed text-gray-700 opacity-0 transition-all duration-1000 ease-out dark:text-gray-300 sm:text-2xl">
          The year it all makes sense.
        </p>
        <p className="reveal-item mt-6 translate-y-6 font-serif text-lg italic text-gray-500 opacity-0 transition-all duration-1000 ease-out dark:text-gray-400 sm:text-xl"
          style={{ transitionDelay: "300ms" }}
        >
          Apoluo means to fall away&hellip;
        </p>
      </div>

      {/* ---- Image rows ---- */}
      <div className="mx-auto max-w-7xl space-y-16 px-4 pb-24 sm:space-y-24">
        {rows.map((row, i) => {
          const key = `row-${i}`;
          switch (row.layout) {
            case "triple":
              return <TripleRow key={key} images={row.images} />;
            case "double":
              return <DoubleRow key={key} images={row.images} />;
            case "single":
              return <SingleRow key={key} images={row.images} />;
            case "offset":
              return <OffsetRow key={key} images={row.images} />;
          }
        })}
      </div>

      {/* ---- Closing ---- */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:py-24">
          <p className="reveal-item translate-y-6 font-serif text-lg italic text-gray-500 opacity-0 transition-all duration-1000 ease-out dark:text-gray-400">
            Fall / Winter 2024
          </p>
          <p className="reveal-item mt-4 translate-y-6 text-[10px] font-semibold uppercase tracking-[0.3em] text-gray-900 opacity-0 transition-all duration-1000 ease-out dark:text-white"
            style={{ transitionDelay: "200ms" }}
          >
            IRIS &mdash; Apoluo Collection
          </p>
        </div>
      </div>

      {/* Global styles for reveal animation */}
      <style jsx global>{`
        .revealed {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </div>
  );
}
