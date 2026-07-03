"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Heart } from "lucide-react";
import { hasToken } from "@/lib/api/client";
import { useFavourites, useToggleFavourite } from "@/lib/favourites";
import { useFavouritesDrawer } from "@/lib/favourites-drawer";
import { useLocale } from "@/lib/locale/locale-provider";
import type { FavouriteProduct } from "@/lib/api/favourites";

export default function FavouritesDrawer() {
  const { open, closeDrawer } = useFavouritesDrawer();
  const { data: favourites, isLoading } = useFavourites();
  const loggedIn = hasToken();
  const count = favourites?.length ?? 0;

  // Lock body scroll + escape-to-close while open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeDrawer]);

  return (
    <>
      {/* Scrim */}
      <div
        onClick={closeDrawer}
        aria-hidden
        className={`fixed inset-0 z-[80] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        aria-hidden={!open}
        aria-label="Saved items"
        className={`fixed inset-y-0 right-0 z-[90] flex w-[92vw] max-w-[420px] flex-col bg-white transition-transform duration-300 ease-out dark:bg-[#0a0a0a] ${
          open
            ? "translate-x-0 shadow-[-20px_0_60px_rgba(0,0,0,0.16)]"
            : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-[#e5e5e5] px-5 pb-4 pt-5 dark:border-neutral-800">
          <h2 className="text-[15px] font-semibold tracking-tight text-[#111] dark:text-[#ededed]">
            Saved Items{" "}
            <span className="text-[#999] dark:text-neutral-500">({count})</span>
          </h2>
          <button
            onClick={closeDrawer}
            aria-label="Close saved items"
            className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center text-[#111] transition-colors duration-200 hover:bg-[#fafafa] dark:text-[#ededed] dark:hover:bg-[#111]"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        {!loggedIn ? (
          <EmptyState
            title="Sign in to save favourites"
            body="You need to be signed in to save products to your favourites."
            ctaLabel="Sign in"
            ctaHref="/login"
            onClose={closeDrawer}
          />
        ) : isLoading ? (
          <div className="flex-1 space-y-4 px-5 py-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3.5">
                <div className="h-[88px] w-[70px] shrink-0 animate-pulse bg-[#f0f0f0] dark:bg-neutral-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[#f0f0f0] dark:bg-neutral-800" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#f0f0f0] dark:bg-neutral-800" />
                </div>
              </div>
            ))}
          </div>
        ) : count === 0 ? (
          <EmptyState
            title="No saved items yet"
            body="Tap the heart on any product to save it here for later."
            ctaLabel="Shop now"
            ctaHref="/products"
            onClose={closeDrawer}
          />
        ) : (
          <ul className="flex-1 divide-y divide-[#f0f0f0] overflow-y-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none] dark:divide-neutral-900 [&::-webkit-scrollbar]:hidden">
            {favourites!.map((fav) => (
              <FavouriteRow key={fav.id} fav={fav} onClose={closeDrawer} />
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}

/* ── A single saved item ───────────────────────────────────────────── */

function FavouriteRow({
  fav,
  onClose,
}: {
  fav: FavouriteProduct;
  onClose: () => void;
}) {
  const { formatPrice } = useLocale();
  const { toggle, isPending } = useToggleFavourite(fav.product_id);
  const p = fav.products;
  const image = (p.product_images ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)[0]?.src;

  return (
    <li className="flex gap-3.5 py-4">
      <Link href={`/product/${p.handle || p.id}`} onClick={onClose} className="shrink-0">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={p.title}
            className="h-[88px] w-[70px] object-cover"
          />
        ) : (
          <div className="flex h-[88px] w-[70px] items-center justify-center bg-[#f4f4f4] text-[9px] text-[#bbb] dark:bg-neutral-900">
            No image
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/product/${p.handle || p.id}`}
            onClick={onClose}
            className="text-[12px] font-medium uppercase leading-snug tracking-wide text-[#111] hover:underline dark:text-[#ededed]"
          >
            {p.title}
          </Link>
          {p.base_price != null && (
            <span className="shrink-0 text-[12px] font-medium text-[#111] dark:text-[#ededed]">
              {formatPrice(p.base_price)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <Link
            href={`/product/${p.handle || p.id}`}
            onClick={onClose}
            className="text-[11px] uppercase tracking-[0.12em] text-[#999] underline-offset-4 transition-colors hover:text-[#111] hover:underline dark:text-neutral-500 dark:hover:text-[#ededed]"
          >
            View product
          </Link>
          <button
            onClick={() => toggle()}
            disabled={isPending}
            aria-label="Remove from saved items"
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#999] transition-colors hover:text-[#111] disabled:opacity-50 dark:text-neutral-500 dark:hover:text-[#ededed]"
          >
            <Heart className="h-3.5 w-3.5 fill-current" strokeWidth={1.5} />
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

/* ── Empty / signed-out state ───────────────────────────────────────── */

function EmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
  onClose,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <Heart className="h-8 w-8 text-[#ccc] dark:text-neutral-700" strokeWidth={1.25} />
      <p className="mt-4 text-[14px] font-medium text-[#111] dark:text-[#ededed]">
        {title}
      </p>
      <p className="mt-1 text-[12px] text-[#999] dark:text-neutral-500">{body}</p>
      <Link
        href={ctaHref}
        onClick={onClose}
        className="mt-6 inline-block bg-[#111] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white dark:bg-[#ededed] dark:text-[#0a0a0a]"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
