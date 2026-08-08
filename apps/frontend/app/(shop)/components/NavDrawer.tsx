"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, ChevronDown, User, Sun, Moon } from "lucide-react";
import { hasToken } from "@/lib/api/client";
import { useProfile } from "@/lib/api/profile";
import { useCart } from "@/lib/cart";
import { useFavourites } from "@/lib/favourites";
import { useFavouritesDrawer } from "@/lib/favourites-drawer";
import { useLocale, CURRENCIES } from "@/lib/locale/locale-provider";
import { useTheme } from "@/lib/theme/theme-provider";

// ── Nav model (real storefront routes) ─────────────────────
interface SubLink {
  label: string;
  href: string;
}
interface NavCategory {
  label: string;
  href?: string;
  sub?: SubLink[];
}

const SHOP: NavCategory[] = [
  { label: "Shop All", href: "/products" },
  { label: "New Arrivals", href: "/products?tag=new" },
  {
    label: "Tops",
    sub: [
      { label: "All Tops", href: "/products?category=Tops" },
      { label: "T-Shirts", href: "/products?category=Tops&product_type=T-Shirts" },
      { label: "Shirts", href: "/products?category=Tops&product_type=Shirts" },
      { label: "Sweatshirts & Tracksuits", href: "/products?category=Tops&product_type=Sweatshirts+%26+Tracksuits" },
    ],
  },
  {
    label: "Bottoms",
    sub: [
      { label: "All Bottoms", href: "/products?category=Bottoms" },
      { label: "Shorts", href: "/products?category=Bottoms&product_type=Shorts" },
      { label: "Pants", href: "/products?category=Bottoms&product_type=Pants" },
    ],
  },
  {
    label: "Accessories",
    sub: [
      { label: "All Accessories", href: "/products?category=Accessories" },
      { label: "Bags", href: "/products?category=Accessories&product_type=Bags" },
      { label: "Caps", href: "/products?category=Accessories&product_type=Caps" },
      { label: "Socks", href: "/products?category=Accessories&product_type=Socks" },
    ],
  },
  {
    label: "Footwear",
    sub: [
      { label: "All Footwear", href: "/products?category=Footwear" },
      { label: "Mules", href: "/products?category=Footwear&product_type=Mules" },
    ],
  },
];

const EXPLORE: SubLink[] = [
  { label: "Road to HQ", href: "/" },
  { label: "About", href: "/about" },
];

// Bag and Saved Items are deliberately NOT in here: they open their side
// drawers instead of navigating, so a signed-out shopper isn't bounced to
// /login (which /favourites does) and never leaves the page they're browsing.
const INFO: SubLink[] = [
  { label: "Track Your Order", href: "/track" },
  { label: "My Account", href: "/account" },
];

const SECTION_LABEL =
  "px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted";

// ── Account footer block ───────────────────────────────────
function AccountBlock({ onNavigate }: { onNavigate: () => void }) {
  const loggedIn = hasToken();
  const { data: profile } = useProfile(loggedIn);

  const rowCls =
    "group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-200 hover:bg-surface-subtle";

  if (loggedIn) {
    const name = profile?.first_name ?? "there";
    const avatarUrl = profile?.avatar_url ?? null;
    const letter =
      profile?.first_name?.[0]?.toUpperCase() ??
      profile?.email?.[0]?.toUpperCase() ??
      "1";
    return (
      <Link href="/account" onClick={onNavigate} className={rowCls}>
        {avatarUrl ? (
          <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full">
            <Image
              src={avatarUrl}
              alt="Profile"
              fill
              sizes="36px"
              className="object-cover"
              unoptimized={avatarUrl.includes("googleusercontent.com")}
            />
          </span>
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-invert-bg text-[13px] font-semibold text-invert-fg">
            {letter}
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[13px] text-text">
            Welcome back, {name}
          </span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
            View your account
          </span>
        </span>
        <ChevronRight
          className="ml-auto h-4 w-4 shrink-0 text-text-placeholder transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={1.5}
        />
      </Link>
    );
  }

  return (
    <Link href="/login" onClick={onNavigate} className={rowCls}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-invert-bg text-text">
        <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[13px] text-text">Sign In</span>
        <span className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
          or create an account
        </span>
      </span>
      <ChevronRight
        className="ml-auto h-4 w-4 shrink-0 text-text-placeholder transition-transform duration-200 group-hover:translate-x-0.5"
        strokeWidth={1.5}
      />
    </Link>
  );
}

// ── Currency switcher (drawer footer) ──────────────────────
function CurrencySwitcher() {
  const { region, currency, setCurrency } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative px-5 pb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 border border-line px-3 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-text-secondary transition-colors duration-200 hover:border-invert-bg hover:text-text"
      >
        <span className="text-[14px] leading-none">{region.flag}</span>
        <span>
          {region.countryCode} <span className="opacity-30">/</span> {active.code}
        </span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-5 right-5 z-10 border border-invert-bg bg-bg shadow-[0_-12px_40px_rgba(0,0,0,0.12)]">
          {CURRENCIES.map((c) => {
            const isActive = c.code === currency;
            return (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left font-mono transition-colors duration-150 ${
                  isActive
                    ? "bg-invert-bg text-invert-fg"
                    : "text-text-secondary hover:bg-invert-bg hover:text-invert-fg"
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 ${isActive ? "bg-current" : "bg-transparent"}`} />
                <span className="text-[12px] font-bold tracking-[0.1em]">{c.code}</span>
                <span className="text-[9px] uppercase tracking-[0.18em] opacity-60">{c.name}</span>
                <span className="ml-auto text-[12px] opacity-70">{c.symbol}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Theme switch (drawer footer) ───────────────────────────
function ThemeSwitch() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const segCls = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors duration-200 ${
      active
        ? "bg-invert-bg text-invert-fg"
        : "text-text-muted hover:text-text"
    }`;
  return (
    <div className="px-5 pt-2">
      <div className="flex items-center border border-line">
        <button
          onClick={() => isDark && toggleTheme()}
          aria-pressed={!isDark}
          className={segCls(!isDark)}
        >
          <Sun className="h-3.5 w-3.5" strokeWidth={1.8} />
          Light
        </button>
        <button
          onClick={() => !isDark && toggleTheme()}
          aria-pressed={isDark}
          className={segCls(isDark)}
        >
          <Moon className="h-3.5 w-3.5" strokeWidth={1.8} />
          Dark
        </button>
      </div>
    </div>
  );
}

// ── Leaf link row (Explore / Info) ─────────────────────────
function LeafRow({ label, href, onClose }: SubLink & { onClose: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="group flex items-center justify-between border-b border-line-subtle px-5 py-3 text-[14px] text-text transition-colors duration-200 hover:bg-surface-subtle"
    >
      <span>{label}</span>
      <ChevronRight
        className="h-4 w-4 text-text-placeholder opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
        strokeWidth={1.5}
      />
    </Link>
  );
}

// ── Drawer-opening row (Bag / Saved Items) ─────────────────
// Same shape as LeafRow, but it hands off to a side drawer rather than routing.
function ActionRow({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between border-b border-line-subtle px-5 py-3 text-left text-[14px] text-text transition-colors duration-200 hover:bg-surface-subtle"
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {count > 0 && (
          <span className="text-[12px] tabular-nums text-text-muted">
            {count > 99 ? "99+" : count}
          </span>
        )}
        <ChevronRight
          className="h-4 w-4 text-text-placeholder opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
          strokeWidth={1.5}
        />
      </span>
    </button>
  );
}

// ── Drawer ─────────────────────────────────────────────────
export default function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { itemCount, hydrated, openDrawer: openCart } = useCart();
  const { openDrawer: openFavourites } = useFavouritesDrawer();
  const { data: favourites } = useFavourites();

  // Close this drawer and hand off to the other one in the same click. Both
  // scroll locks settle correctly because NavDrawer's effect (release) runs
  // before the target drawer's (lock) — it sits earlier in the tree.
  function openSideDrawer(open: () => void) {
    onClose();
    open();
  }

  // reset transient state shortly after closing
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setExpanded(null);
      setQuery("");
    }, 300);
    return () => clearTimeout(t);
  }, [open]);

  // lock body scroll + escape to close
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    go(`/products?search=${encodeURIComponent(q)}`);
  }

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-[80] bg-scrim transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[90] flex w-[86vw] max-w-[380px] flex-col border-r border-line bg-bg transition-transform duration-300 ease-out ${
          open ? "translate-x-0 shadow-[20px_0_60px_rgba(0,0,0,0.14)]" : "-translate-x-full"
        }`}
      >
        {/* Head */}
        <div className="relative flex h-[65px] shrink-0 items-center border-b border-line px-5">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="-ml-2 flex h-9 w-9 items-center justify-center text-text transition-colors duration-200 hover:bg-surface-subtle"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <Link
            href="/"
            onClick={onClose}
            aria-label="1NRI home"
            className="absolute left-1/2 flex -translate-x-1/2 items-center"
          >
            <Image
              src="/homepage_img/no-bg-1NRI.png"
              alt="1NRI"
              width={88}
              height={22}
              className="h-[22px] w-auto dark:brightness-0 dark:invert"
              unoptimized
            />
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={submitSearch} className="shrink-0 px-5 pt-4">
          <div className="flex items-center gap-2.5 border border-line px-3 py-2.5 transition-colors duration-200 focus-within:border-invert-bg">
            <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" strokeWidth={1.8} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the store"
              aria-label="Search"
              className="w-full bg-transparent text-[13px] text-text outline-none placeholder:text-text-placeholder"
            />
          </div>
        </form>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-4">
          {/* Shop */}
          <p className={SECTION_LABEL}>Shop</p>
          {SHOP.map((c) => {
            const isOpen = expanded === c.label;
            return (
              <div key={c.label}>
                <button
                  aria-expanded={c.sub ? isOpen : undefined}
                  onClick={() => {
                    if (c.sub) setExpanded(isOpen ? null : c.label);
                    else if (c.href) go(c.href);
                  }}
                  className="group flex w-full items-center justify-between border-b border-line-subtle px-5 py-3 text-left text-[14px] text-text transition-colors duration-200 hover:bg-surface-subtle"
                >
                  <span>{c.label}</span>
                  <ChevronRight
                    className={`h-4 w-4 text-text-placeholder transition-all duration-200 group-hover:text-text-muted ${
                      c.sub ? (isOpen ? "rotate-90 text-text" : "") : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100"
                    }`}
                    strokeWidth={1.5}
                  />
                </button>

                {/* Accordion subcategories */}
                {c.sub && (
                  <div
                    className="overflow-hidden bg-surface-subtle transition-[max-height] duration-300 ease-out"
                    style={{ maxHeight: isOpen ? c.sub.length * 42 + 16 : 0 }}
                  >
                    <div className="py-2 pl-5 pr-5">
                      {c.sub.map((s) => (
                        <Link
                          key={s.href}
                          href={s.href}
                          onClick={onClose}
                          className="block border-l border-line py-2 pl-4 text-[13px] text-text-secondary transition-colors duration-150 hover:border-invert-bg hover:text-text"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Explore */}
          <p className={SECTION_LABEL}>Explore</p>
          {EXPLORE.map((l) => (
            <LeafRow key={l.href} {...l} onClose={onClose} />
          ))}

          {/* Yours */}
          <p className={SECTION_LABEL}>Yours</p>
          <ActionRow
            label="Bag"
            // Pre-hydration the cart is still empty, so render 0 to match SSR.
            count={hydrated ? itemCount : 0}
            onClick={() => openSideDrawer(openCart)}
          />
          <ActionRow
            label="Saved Items"
            count={favourites?.length ?? 0}
            onClick={() => openSideDrawer(openFavourites)}
          />

          {/* Info */}
          <p className={SECTION_LABEL}>Info</p>
          {INFO.map((l) => (
            <LeafRow key={l.href} {...l} onClose={onClose} />
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-line pb-3">
          <AccountBlock onNavigate={onClose} />
          <CurrencySwitcher />
          <ThemeSwitch />
        </div>
      </aside>
    </>
  );
}
