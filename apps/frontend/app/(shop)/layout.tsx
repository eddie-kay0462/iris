"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ShoppingBag, Search, User, Heart, ChevronDown } from "lucide-react";
import { ThemeProvider, useTheme } from "@/lib/theme/theme-provider";
import { CartProvider, useCart } from "@/lib/cart";
import { hasToken } from "@/lib/api/client";
import { useProfile } from "@/lib/api/profile";
import { useFavourites } from "@/lib/favourites";
import { FavouritesDrawerProvider, useFavouritesDrawer } from "@/lib/favourites-drawer";
import { LocaleProvider, useLocale, CURRENCIES } from "@/lib/locale/locale-provider";
import { useAnnouncementBanner, type AnnouncementBanner } from "@/lib/api/settings";
import AnalyticsBeacon from "@/components/AnalyticsBeacon";
import NavDrawer from "./components/NavDrawer";
import CartDrawer from "./components/CartDrawer";
import FavouritesDrawer from "./components/FavouritesDrawer";

// Runs synchronously before the browser paints on the client (so scroll-derived
// header state is applied without a visible flash), while falling back to a
// no-op useEffect on the server to avoid the SSR useLayoutEffect warning.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function ThemeToggle({ isTransparent = false }: { isTransparent?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className={`p-1 transition ${
        isTransparent
          ? "text-white/80 hover:text-white"
          : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
      }`}
    >
      {theme === "light" ? (
        <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  );
}

function FavouritesLink({ isTransparent = false }: { isTransparent?: boolean }) {
  const { data: favourites } = useFavourites();
  const { openDrawer } = useFavouritesDrawer();
  const count = favourites?.length ?? 0;
  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label="Saved items"
      className={`group relative p-1 transition ${
        isTransparent
          ? "text-white/80 hover:text-white"
          : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
      }`}
    >
      <Heart className="h-[16px] w-[16px] md:h-[18px] md:w-[18px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={1.5} />
      {count > 0 && (
        <span className={`absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
          isTransparent
            ? "bg-white text-black"
            : "bg-black text-white dark:bg-white dark:text-black"
        }`}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

function CartLink({ isTransparent = false }: { isTransparent?: boolean }) {
  const { itemCount, hydrated, openDrawer } = useCart();
  const [bump, setBump] = useState(false);
  const prevCount = useRef(itemCount);
  const wasHydrated = useRef(false);

  // Pulse the badge (and nudge the bag) whenever the count goes up — i.e. an
  // item was just added. Skip the hydration jump (count snaps from 0 to the
  // saved value) and any decrease.
  useEffect(() => {
    if (!hydrated) return;
    // First settle after hydration: adopt the count without animating.
    if (!wasHydrated.current) {
      wasHydrated.current = true;
      prevCount.current = itemCount;
      return;
    }
    if (itemCount > prevCount.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 450);
      prevCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevCount.current = itemCount;
  }, [itemCount, hydrated]);

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label="Open bag"
      className={`group relative p-1 transition ${
        isTransparent
          ? "text-white/80 hover:text-white"
          : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
      }`}
    >
      <ShoppingBag
        className={`h-[16px] w-[16px] md:h-[18px] md:w-[18px] transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5 ${
          bump ? "animate-cart-nudge" : ""
        }`}
        strokeWidth={1.5}
      />
      {itemCount > 0 && (
        <span
          className={`absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
            bump ? "animate-cart-bump" : ""
          } ${
            isTransparent
              ? "bg-white text-black"
              : "bg-black text-white dark:bg-white dark:text-black"
          }`}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}

function UserLink({ isTransparent = false }: { isTransparent?: boolean }) {
  const router = useRouter();
  const loggedIn = hasToken();
  const { data: profile } = useProfile(loggedIn);

  const avatarUrl = profile?.avatar_url ?? null;
  const avatarLetter =
    profile?.first_name?.[0]?.toUpperCase() ??
    profile?.email?.[0]?.toUpperCase() ??
    null;

  function handleClick() {
    if (loggedIn) {
      router.push("/account");
    } else {
      router.push("/login");
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-label={loggedIn ? "My account" : "Log in"}
      className={`group p-1 transition ${
        isTransparent
          ? "text-white/80 hover:text-white"
          : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
      }`}
    >
      {loggedIn && avatarUrl ? (
        <span className="relative flex h-[22px] w-[22px] overflow-hidden rounded-full transition-transform duration-200 group-hover:scale-110">
          <Image
            src={avatarUrl}
            alt="Profile"
            fill
            sizes="22px"
            className="object-cover"
            unoptimized={avatarUrl.includes("googleusercontent.com")}
          />
        </span>
      ) : loggedIn && avatarLetter ? (
        <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-semibold transition-transform duration-200 group-hover:scale-110 ${
          isTransparent
            ? "bg-white text-black"
            : "bg-black text-white dark:bg-white dark:text-black"
        }`}>
          {avatarLetter}
        </span>
      ) : (
        <User className="h-[16px] w-[16px] md:h-[18px] md:w-[18px] transition-transform duration-200 group-hover:scale-110" strokeWidth={1.5} />
      )}
    </button>
  );
}

const QUICK_LINKS = [
  { label: "Shop All",    href: "/products" },
  { label: "Tops",        href: "/products?category=Tops" },
  { label: "Bottoms",     href: "/products?category=Bottoms" },
  { label: "Accessories", href: "/products?category=Accessories" },
  { label: "Footwear",    href: "/products?category=Footwear" },
];

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit() {
    const q = query.trim();
    if (!q) return;
    router.push(`/products?search=${encodeURIComponent(q)}`);
    onClose();
  }

  function handleQuickLink(href: string) {
    router.push(href);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50  pt-[18vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] mx-4 overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.25)] dark:bg-[#1c1c1e] dark:shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="flex items-center gap-3 px-5 py-4">
            <Search className="h-5 w-5 shrink-0 text-gray-400 dark:text-gray-500" strokeWidth={2} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="flex-1 bg-transparent text-[17px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white dark:placeholder:text-gray-500"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-gray-600 transition hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300"
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            ) : (
              <kbd className="hidden select-none items-center gap-0.5 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500 sm:flex dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                ESC
              </kbd>
            )}
          </div>
        </form>

        {/* Divider */}
        <div className="h-px bg-gray-100 dark:bg-gray-700/60" />

        {/* Body */}
        <div className="max-h-[340px] overflow-y-auto">
          {query.trim() ? (
            /* Search suggestion row */
            <button
              onClick={submit}
              className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                <Search className="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-[14px] text-gray-900 dark:text-white">
                  Search for <span className="font-semibold">"{query.trim()}"</span>
                </p>
                <p className="text-[12px] text-gray-400 dark:text-gray-500">Browse all matching products</p>
              </div>
              <span className="ml-auto text-[11px] text-gray-300 dark:text-gray-600">↵</span>
            </button>
          ) : (
            /* Quick links */
            <div className="px-5 pb-4 pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Quick Access
              </p>
              <div className="space-y-0.5">
                {QUICK_LINKS.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleQuickLink(link.href)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                      <Search className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" strokeWidth={1.8} />
                    </span>
                    <span className="text-[14px] text-gray-700 dark:text-gray-300">{link.label}</span>
                    <span className="ml-auto text-[11px] text-gray-300 dark:text-gray-600">→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-2.5 dark:border-gray-700/60">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {query.trim() ? "Press ↵ to search" : "Start typing to search"}
          </span>
          <div className="flex items-center gap-3 text-[11px] text-gray-300 dark:text-gray-600">
            <span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-50 px-1 dark:border-gray-700 dark:bg-gray-800">↑</kbd><kbd className="rounded border border-gray-200 bg-gray-50 px-1 dark:border-gray-700 dark:bg-gray-800">↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border border-gray-200 bg-gray-50 px-1 dark:border-gray-700 dark:bg-gray-800">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocaleSelectorButton({ isTransparent = false }: { isTransparent?: boolean }) {
  const { region, currency, setCurrency } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeCurrency = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const textClass = isTransparent
    ? "text-white/80 hover:text-white"
    : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white";

  return (
    <div
      ref={ref}
      className="relative hidden md:flex"
      style={{ fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] transition ${textClass}`}
      >
        <span className="text-sm leading-none">{region.flag}</span>
        <span>{region.countryCode}</span>
        <span className="opacity-30">/</span>
        <span>{activeCurrency.code}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 min-w-[240px] border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
          <p className="border-b border-neutral-200 px-4 py-3 text-[9px] uppercase tracking-[0.28em] text-neutral-400 dark:border-neutral-800 dark:text-neutral-500">
            Currency
          </p>
          {CURRENCIES.map((cur) => {
            const isActive = cur.code === currency;
            return (
              <button
                key={cur.code}
                onClick={() => { setCurrency(cur.code); setOpen(false); }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-900"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 ${
                    isActive ? "bg-white dark:bg-neutral-900" : "bg-transparent"
                  }`}
                />
                <span className="text-[12px] font-bold tracking-[0.1em]">{cur.code}</span>
                <span
                  className={`text-[9px] uppercase tracking-[0.18em] ${
                    isActive ? "text-white/60 dark:text-neutral-900/60" : "text-neutral-400 dark:text-neutral-500"
                  }`}
                >
                  {cur.name}
                </span>
                <span
                  className={`ml-auto text-[12px] ${
                    isActive ? "text-white/70 dark:text-neutral-900/70" : "text-neutral-400 dark:text-neutral-500"
                  }`}
                >
                  {cur.symbol}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const navLinks = [
  { href: "/", label: "Road to HQ" },
  { href: "/about", label: "About" },
];

// Fixed announcement bar (36px tall) pinned above the header. Content is set in
// admin → Settings → General. Inverts black/white with the theme to stay loud.
const BANNER_HEIGHT = "h-9"; // 36px tall strip
const BANNER_PX = 36; // matches BANNER_HEIGHT; used to offset the home hero

function AnnouncementBar({
  banner,
  onDismiss,
}: {
  banner: AnnouncementBanner;
  onDismiss: () => void;
}) {
  const textClass =
    "block w-full truncate px-10 text-center text-[11px] font-medium uppercase leading-none tracking-[0.18em]";
  return (
    <div
      className={`relative flex ${BANNER_HEIGHT} w-full items-center justify-center overflow-hidden bg-neutral-950 text-white dark:bg-white dark:text-neutral-950`}
    >
      {banner.link ? (
        <Link href={banner.link} className={`${textClass} transition-opacity hover:opacity-70`}>
          {banner.text}
        </Link>
      ) : (
        <span className={textClass}>{banner.text}</span>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-current transition-opacity hover:opacity-60"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function ShopHeader({
  banner,
  bannerVisible = false,
  onDismiss,
  onMeasure,
}: {
  banner?: AnnouncementBanner | null;
  bannerVisible?: boolean;
  onDismiss?: () => void;
  onMeasure?: (height: number) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isTransparent = !scrolled;
  const isTransparentWhite = isHome && !scrolled;

  // Layout effect (not useEffect) so the scroll-derived state is applied before
  // paint. The header lives in the persistent (shop) layout and does not remount
  // on client-side navigation, so `scrolled` carries over between pages — e.g.
  // navigating to home from a scrolled inner page would otherwise paint a white
  // bar over the dark hero for one frame before this correction lands.
  useIsomorphicLayoutEffect(() => {
    // On the home page the hero is a full-screen dark section, so keep the
    // header transparent until we've scrolled (almost) past it — otherwise it
    // flips to a solid white bar while the dark hero is still on screen.
    const handleScroll = () => {
      // Read the viewport height defensively: on the first (and, in a prod
      // build, only) run of this effect `window.innerHeight` can still be 0 /
      // unsettled, which would make the home threshold negative and force the
      // bar solid at the very top. Fall back to clientHeight and clamp to a
      // positive floor so scrollY === 0 can never read as "scrolled".
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      const threshold = isHome ? Math.max(vh - 80, 200) : 10;
      setScrolled(window.scrollY > threshold);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();
    // Re-measure after the first paint so a too-early viewport read on initial
    // load self-corrects on the same load, not only after a client-side re-nav.
    const raf = requestAnimationFrame(handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      cancelAnimationFrame(raf);
    };
  }, [isHome]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function isActive(href: string) {
    if (href.includes("?")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  }

  // Report the real rendered height of the banner+nav bar so the layout can
  // offset page content by exactly that much — no hardcoded pixel guesses, and it
  // stays correct as the banner toggles or the bar wraps on small screens.
  useIsomorphicLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const report = () => onMeasure?.(el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [bannerVisible, banner?.text, onMeasure]);

  return (
    <header className="fixed top-0 z-50 w-full">
      <div ref={barRef}>
        {bannerVisible && banner && (
          <AnnouncementBar banner={banner} onDismiss={onDismiss ?? (() => {})} />
        )}
        <div
          className={`flex w-full items-center justify-between px-6 py-4 transition-all duration-150 ${
            isTransparent
              ? "border-b border-transparent bg-transparent"
              : "border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
          }`}
        >
        {/* Left nav (desktop) */}
        <nav className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => setDrawerOpen(true)}
            data-open={drawerOpen}
            className={`group flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest transition ${
              isTransparentWhite
                ? "text-white/70 hover:text-white"
                : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Shop
            <ChevronDown
              className="h-3 w-3 transition-transform duration-200 group-data-[open=true]:rotate-180"
              strokeWidth={2}
            />
          </button>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-medium uppercase tracking-widest transition ${
                isTransparentWhite
                  ? isActive(link.href)
                    ? "text-white"
                    : "text-white/70 hover:text-white"
                  : isActive(link.href)
                    ? "text-black dark:text-white"
                    : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex h-8 w-8 items-center justify-center md:hidden transition ${
            isTransparentWhite ? "text-white" : ""
          }`}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>

        {/* Centered logo */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center"
        >
          <Image
            src="/homepage_img/no-bg-1NRI.png"
            alt="1NRI Worldwide logo"
            width={120}
            height={48}
            className={`h-8 w-auto min-w-[60px] transition-all duration-150 ${
              isTransparentWhite ? "brightness-0 invert" : "dark:brightness-0 dark:invert"
            }`}
            priority
            unoptimized
          />
        </Link>

        {/* Right icons */}
        <div className="flex items-center gap-2 md:gap-4">
          <LocaleSelectorButton isTransparent={isTransparentWhite} />
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className={`group p-1 transition ${
              isTransparentWhite
                ? "text-white/80 hover:text-white"
                : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Search className="h-[16px] w-[16px] md:h-[18px] md:w-[18px] transition-transform duration-200 group-hover:scale-110" strokeWidth={1.5} />
          </button>
          <FavouritesLink isTransparent={isTransparentWhite} />
          <CartLink isTransparent={isTransparentWhite} />
          <UserLink isTransparent={isTransparentWhite} />
        </div>
      </div>
      </div>

      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

function ShopFooter() {
  return (
    <footer className="border-t border-[#e5e5e5] bg-white dark:border-neutral-800 dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Image
              src="/homepage_img/no-bg-1NRI.png"
              alt="1NRI"
              width={96}
              height={38}
              className="h-6 w-auto min-w-[48px] dark:brightness-0 dark:invert"
              unoptimized
            />
            <p className="mt-3 text-[12px] leading-relaxed text-[#666] dark:text-neutral-400">
              Quality streetwear for the tasteful and stylish.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111] dark:text-[#ededed]">
              Shop
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/products" className="text-[12px] text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?tag=new" className="text-[12px] text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]">
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          {/* Brand */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111] dark:text-[#ededed]">
              Brand
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/about" className="text-[12px] text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]">
                  About
                </Link>
              </li>
              {/* <li>
                <Link href="/lookbook" className="text-[12px] text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]">
                  Lookbook
                </Link>
              </li> */}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111] dark:text-[#ededed]">
              Help
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/track" className="text-[12px] text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/account" className="text-[12px] text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#111] dark:text-[#ededed]">
              Connect
            </h4>
            <div className="mt-3 flex items-center gap-4">
              {/* Instagram */}
              <a
                href="https://instagram.com/_1nriworldwide"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              {/* X / Twitter */}
              <a
                href="https://x.com/1nriiworldwide"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@1nriworldwide"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="text-[#666] transition-colors hover:text-[#111] dark:text-neutral-400 dark:hover:text-[#ededed]"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-[#e5e5e5] pt-6 dark:border-neutral-800">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#999] dark:text-neutral-500">
            &copy; {new Date().getFullYear()} 1NRI Worldwide LTD. All rights reserved.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}

function ShopLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const { data: banner } = useAnnouncementBanner();
  // Start hidden so SSR/first paint matches; the effect reveals it after we've
  // read this browser's dismissal. Dismissal is keyed to the banner text, so
  // editing the message re-shows it to everyone.
  const [bannerDismissed, setBannerDismissed] = useState(true);
  useEffect(() => {
    // Reads this browser's dismissal (client-only) once the banner setting loads.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!banner?.enabled || !banner.text) {
      setBannerDismissed(true);
      return;
    }
    let dismissedText = "";
    try { dismissedText = localStorage.getItem("iris_banner_dismissed") ?? ""; } catch {}
    setBannerDismissed(dismissedText === banner.text);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [banner?.enabled, banner?.text]);

  const bannerVisible = !!banner?.enabled && !!banner?.text && !bannerDismissed;

  function dismissBanner() {
    setBannerDismissed(true);
    try { if (banner?.text) localStorage.setItem("iris_banner_dismissed", banner.text); } catch {}
  }

  // Measured banner+nav height, so content clears the header exactly. The home
  // hero deliberately sits UNDER the transparent nav, so there it only offsets by
  // the solid banner strip; every other page offsets by the full header.
  const [headerHeight, setHeaderHeight] = useState(65);
  const handleMeasure = useCallback((h: number) => setHeaderHeight(h), []);
  const mainPaddingTop = isHome ? (bannerVisible ? BANNER_PX : 0) : headerHeight;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white dark:bg-gray-950">
      <AnalyticsBeacon />
      <ShopHeader
        banner={banner}
        bannerVisible={bannerVisible}
        onDismiss={dismissBanner}
        onMeasure={handleMeasure}
      />
      <main style={{ paddingTop: mainPaddingTop }}>{children}</main>
      <ShopFooter />
      <CartDrawer />
      <FavouritesDrawer />
    </div>
  );
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <CartProvider>
          <FavouritesDrawerProvider>
            <ShopLayoutInner>{children}</ShopLayoutInner>
          </FavouritesDrawerProvider>
        </CartProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
