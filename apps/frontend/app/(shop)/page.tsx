import Link from "next/link";
import Image from "next/image";

const sections = [
  {
    image: "/homepage/1.jpeg",
    alt: "Intercessory Department — Two models in camo print",
    title: "Intercessory Department",
    subtitle: "Realtree Camo Collection",
    cta: "Shop Now",
    href: "/products",
    overlay: "bg-black/20",
    height: "h-[85vh]",
    objectPos: "object-top",
  },
  {
    image: "/homepage/2.jpeg",
    alt: "Psalm 52 — Black INRI set",
    title: "Psalm 52",
    subtitle: "The Black Set — Jersey & Sweats",
    cta: "View Collection",
    href: "/products",
    overlay: "bg-black/30",
    height: "h-[85vh]",
    objectPos: "object-top",
  },
  {
    image: "/homepage/3.png",
    alt: "INRI branded pants in four colorways",
    title: "Essentials",
    subtitle: "Signature sweats in every colour you need",
    cta: "Shop Bottoms",
    href: "/products",
    overlay: "bg-black/20",
    height: "h-[75vh]",
    objectPos: "object-center",
  },
  {
    image: "/homepage/4.jpeg",
    alt: "Betrayer's Kiss jacket — Apoluo Fall/Winter",
    title: "Betrayer's Kiss",
    subtitle: "Apoluo — Fall / Winter 2024",
    cta: "Explore",
    href: "/products",
    overlay: "bg-black/30",
    height: "h-[75vh]",
    objectPos: "object-top",
  },
];

export default function HomePage() {
  return (
    <div>
      {sections.map((s, i) => (
        <section key={s.image} className={`relative w-full overflow-hidden ${s.height}`}>
          <Image
            src={s.image}
            alt={s.alt}
            fill
            priority={i === 0}
            className={`object-cover ${s.objectPos}`}
            sizes="100vw"
          />
          <div className={`absolute inset-0 ${s.overlay}`} />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            {i === 0 ? (
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {s.title}
              </h1>
            ) : (
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {s.title}
              </h2>
            )}
            <p className="mt-2 text-sm text-white/80 sm:text-base">
              {s.subtitle}
            </p>
            <Link
              href={s.href}
              className="mt-5 inline-block border border-white bg-white/10 px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
            >
              {s.cta}
            </Link>
          </div>
        </section>
      ))}
    </div>
  );
}
