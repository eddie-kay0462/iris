"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, ChevronDown, User, Sun, Moon } from "lucide-react";
import { hasToken } from "@/lib/api/client";
import { useProfile } from "@/lib/api/profile";
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

const INFO: SubLink[] = [
  { label: "Track Your Order", href: "/track" },
  { label: "My Account", href: "/account" },
  { label: "Saved Items", href: "/favourites" },
];

const SECTION_LABEL =
  "px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#999] dark:text-neutral-500";

// ── Account footer block ───────────────────────────────────
function AccountBlock({ onNavigate }: { onNavigate: () => void }) {
  const loggedIn = hasToken();
  const { data: profile } = useProfile(loggedIn);

  const rowCls =
    "group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-200 hover:bg-[#fafafa] dark:hover:bg-[#111]";

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
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#111] text-[13px] font-semibold text-white dark:bg-[#ededed] dark:text-[#0a0a0a]">
            {letter}
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[13px] text-[#111] dark:text-[#ededed]">
            Welcome back, {name}
          </span>
          <span className="text-[11px] uppercase tracking-[0.12em] text-[#999] dark:text-neutral-500">
            View your account
          </span>
        </span>
        <ChevronRight
          className="ml-auto h-4 w-4 shrink-0 text-[#ccc] transition-transform duration-200 group-hover:translate-x-0.5 dark:text-neutral-600"
          strokeWidth={1.5}
        />
      </Link>
    );
  }

  return (
    <Link href="/login" onClick={onNavigate} className={rowCls}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#111] text-[#111] dark:border-[#ededed] dark:text-[#ededed]">
        <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[13px] text-[#111] dark:text-[#ededed]">Sign In</span>
        <span className="text-[11px] uppercase tracking-[0.12em] text-[#999] dark:text-neutral-500">
          or create an account
        </span>
      </span>
      <ChevronRight
        className="ml-auto h-4 w-4 shrink-0 text-[#ccc] transition-transform duration-200 group-hover:translate-x-0.5 dark:text-neutral-600"
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
        className="flex w-full items-center gap-2.5 border border-[#ddd] px-3 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-[#666] transition-colors duration-200 hover:border-[#111] hover:text-[#111] dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-[#ededed]"
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
        <div className="absolute bottom-[calc(100%+6px)] left-5 right-5 z-10 border border-[#111] bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.12)] dark:border-white dark:bg-[#0a0a0a]">
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
                    ? "bg-[#111] text-white dark:bg-[#ededed] dark:text-[#0a0a0a]"
                    : "text-[#666] hover:bg-[#111] hover:text-white dark:text-neutral-400 dark:hover:bg-[#ededed] dark:hover:text-[#0a0a0a]"
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
        ? "bg-[#111] text-white dark:bg-[#ededed] dark:text-[#0a0a0a]"
        : "text-[#999] hover:text-[#111] dark:text-neutral-500 dark:hover:text-[#ededed]"
    }`;
  return (
    <div className="px-5 pt-2">
      <div className="flex items-center border border-[#ddd] dark:border-neutral-700">
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
      className="group flex items-center justify-between border-b border-[#f0f0f0] px-5 py-3 text-[14px] text-[#111] transition-colors duration-200 hover:bg-[#fafafa] dark:border-neutral-900 dark:text-[#ededed] dark:hover:bg-[#111]"
    >
      <span>{label}</span>
      <ChevronRight
        className="h-4 w-4 text-[#ccc] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-neutral-600"
        strokeWidth={1.5}
      />
    </Link>
  );
}

// ── Drawer ─────────────────────────────────────────────────
export default function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
        className={`fixed inset-0 z-[80] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[90] flex w-[86vw] max-w-[380px] flex-col border-r border-[#e5e5e5] bg-white transition-transform duration-300 ease-out dark:border-neutral-800 dark:bg-[#0a0a0a] ${
          open ? "translate-x-0 shadow-[20px_0_60px_rgba(0,0,0,0.14)]" : "-translate-x-full"
        }`}
      >
        {/* Head */}
        <div className="relative flex h-[65px] shrink-0 items-center border-b border-[#e5e5e5] px-5 dark:border-neutral-800">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="-ml-2 flex h-9 w-9 items-center justify-center text-[#111] transition-colors duration-200 hover:bg-[#fafafa] dark:text-[#ededed] dark:hover:bg-[#111]"
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
          <div className="flex items-center gap-2.5 border border-[#ddd] px-3 py-2.5 transition-colors duration-200 focus-within:border-[#111] dark:border-neutral-700 dark:focus-within:border-white">
            <Search className="h-[18px] w-[18px] shrink-0 text-[#999] dark:text-neutral-500" strokeWidth={1.8} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the store"
              aria-label="Search"
              className="w-full bg-transparent text-[13px] text-[#111] outline-none placeholder:text-[#bbb] dark:text-[#ededed] dark:placeholder:text-neutral-600"
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
                  className="group flex w-full items-center justify-between border-b border-[#f0f0f0] px-5 py-3 text-left text-[14px] text-[#111] transition-colors duration-200 hover:bg-[#fafafa] dark:border-neutral-900 dark:text-[#ededed] dark:hover:bg-[#111]"
                >
                  <span>{c.label}</span>
                  <ChevronRight
                    className={`h-4 w-4 text-[#ccc] transition-all duration-200 group-hover:text-[#999] dark:text-neutral-600 ${
                      c.sub ? (isOpen ? "rotate-90 text-[#111] dark:text-[#ededed]" : "") : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100"
                    }`}
                    strokeWidth={1.5}
                  />
                </button>

                {/* Accordion subcategories */}
                {c.sub && (
                  <div
                    className="overflow-hidden bg-[#fafafa] transition-[max-height] duration-300 ease-out dark:bg-[#0d0d0d]"
                    style={{ maxHeight: isOpen ? c.sub.length * 42 + 16 : 0 }}
                  >
                    <div className="py-2 pl-5 pr-5">
                      {c.sub.map((s) => (
                        <Link
                          key={s.href}
                          href={s.href}
                          onClick={onClose}
                          className="block border-l border-[#e5e5e5] py-2 pl-4 text-[13px] text-[#666] transition-colors duration-150 hover:border-[#111] hover:text-[#111] dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-white dark:hover:text-[#ededed]"
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

          {/* Info */}
          <p className={SECTION_LABEL}>Info</p>
          {INFO.map((l) => (
            <LeafRow key={l.href} {...l} onClose={onClose} />
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-[#e5e5e5] pb-3 dark:border-neutral-800">
          <AccountBlock onNavigate={onClose} />
          <CurrencySwitcher />
          <ThemeSwitch />
        </div>
      </aside>
    </>
  );
}
