"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ChevronRight, ChevronDown, User } from "lucide-react";
import { hasToken } from "@/lib/api/client";
import { useProfile } from "@/lib/api/profile";
import { useCart } from "@/lib/cart";
import { useFavourites } from "@/lib/favourites";
import { useFavouritesDrawer } from "@/lib/favourites-drawer";
import { useLocale, CURRENCIES } from "@/lib/locale/locale-provider";
import styles from "./StorefrontSidebar.module.css";

/* ── Nav model (real storefront routes) ─────────────────────
   The handoff prototype lists placeholder categories (Jerseys, Collections,
   Journal, Stockists…) that don't exist in this catalogue, so the live routes
   from the previous drawer are kept. Visual structure follows the handoff. */
interface SubLink { label: string; href: string }
interface NavCategory { label: string; href?: string; sub?: SubLink[]; tag?: string }

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

// Bag and Saved Items are deliberately NOT links: they open their side
// drawers instead of navigating, so a signed-out shopper isn't bounced to
// /login (which /favourites does) and never leaves the page they're browsing.
const INFO: SubLink[] = [
  { label: "Track Your Order", href: "/track" },
  { label: "Returns", href: "/returns" },
  { label: "My Account", href: "/account" },
];

/* Country label and header short form per currency. No flag emoji (brand rule). */
const CURRENCY_META: Record<string, { country: string; short: string }> = {
  GHS: { country: "Ghana", short: "GH / GHS" },
  USD: { country: "United States", short: "US / USD" },
  GBP: { country: "United Kingdom", short: "UK / GBP" },
  EUR: { country: "Europe", short: "EU / EUR" },
  NGN: { country: "Nigeria", short: "NG / NGN" },
  AUD: { country: "Australia", short: "AU / AUD" },
  CAD: { country: "Canada", short: "CA / CAD" },
};
export function currencyShortLabel(code: string): string {
  return CURRENCY_META[code]?.short ?? `${code.slice(0, 2)} / ${code}`;
}
/* The handoff shows "GH₵" for the cedi symbol box. */
function currencySymbol(code: string, fallback: string) {
  return code === "GHS" ? "GH₵" : fallback;
}

const CLOSE_MS = 520;
const HOVER_INTENT_MS = 90;

/* ── Account row (pinned footer) ─────────────────────────── */
function AccountRow({ onNavigate }: { onNavigate: () => void }) {
  const loggedIn = hasToken();
  const { data: profile } = useProfile(loggedIn);

  if (loggedIn) {
    const name = profile?.first_name ?? "there";
    const avatarUrl = profile?.avatar_url ?? null;
    const initials =
      ((profile?.first_name?.[0] ?? "") + (profile?.last_name?.[0] ?? "")).toUpperCase() ||
      profile?.email?.[0]?.toUpperCase() ||
      "1";
    return (
      <Link href="/account" onClick={onNavigate} className={styles.acct}>
        <span className={styles.ava}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={40}
              height={40}
              className="h-full w-full object-cover"
              unoptimized={avatarUrl.includes("googleusercontent.com")}
            />
          ) : (
            initials
          )}
        </span>
        <span className={styles.meta}>
          <span className={styles.metaT}>Welcome back, {name}</span>
          {/* No loyalty tier / points exist in the profile yet; see README. */}
          <span className={styles.metaB}>View your account</span>
        </span>
        <span className={styles.go}><ChevronRight size={16} strokeWidth={1.5} /></span>
      </Link>
    );
  }

  return (
    <Link href="/login" onClick={onNavigate} className={styles.acct}>
      <span className={`${styles.ava} ${styles.guest}`}><User size={18} strokeWidth={1.5} /></span>
      <span className={styles.meta}>
        <span className={styles.metaT}>Sign In</span>
        <span className={styles.metaB}>or create an account</span>
      </span>
      <span className={styles.go}><ChevronRight size={16} strokeWidth={1.5} /></span>
    </Link>
  );
}

/* ── Currency row (pinned footer; menu opens upward) ─────── */
function CurrencyRow({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { currency, setCurrency } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const active = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const meta = CURRENCY_META[active.code] ?? { country: active.name, short: active.code };

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  return (
    <div className={styles.footRow}>
      <div ref={ref} className={styles.cur}>
        <button
          type="button"
          className={styles.curBtn}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span className={styles.sym}>{currencySymbol(active.code, active.symbol)}</span>
          <span>{meta.country} · {active.code}</span>
          <span className={styles.curChev}><ChevronDown size={12} strokeWidth={1.6} /></span>
        </button>
        <div className={styles.curMenu} role="listbox" aria-label="Currency" data-open={open}>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              role="option"
              aria-selected={c.code === currency}
              className={styles.curOpt}
              tabIndex={open ? 0 : -1}
              onClick={() => { setCurrency(c.code); setOpen(false); }}
            >
              <span className={styles.sym}>{currencySymbol(c.code, c.symbol)}</span>
              <span>{CURRENCY_META[c.code]?.country ?? c.name} · {c.code}</span>
            </button>
          ))}
        </div>
      </div>
      <span className={styles.lang}>English</span>
    </div>
  );
}

/* ── Desktop primary-panel row ───────────────────────────── */
function DesktopRow({
  c, delay, inCls, active, onHover, onSelect,
}: {
  c: NavCategory;
  delay: number;
  inCls: string;
  active: boolean;
  onHover: (c: NavCategory) => void;
  onSelect: (c: NavCategory) => void;
}) {
  const isParent = !!c.sub;
  return (
    <button
      type="button"
      className={`${styles.row}${inCls}`}
      style={{ animationDelay: `${delay}ms` }}
      data-active={isParent && active}
      aria-haspopup={isParent ? "true" : undefined}
      aria-expanded={isParent ? active : undefined}
      onMouseEnter={() => onHover(c)}
      onClick={() => onSelect(c)}
    >
      <span className={styles.lbl}>{c.label}</span>
      <span className={styles.rowEnd}>
        {c.tag && <span className={styles.tag}>{c.tag}</span>}
        {isParent && <span className={styles.chev}><ChevronRight size={16} strokeWidth={1.5} /></span>}
      </span>
    </button>
  );
}

/* ── Sidebar ─────────────────────────────────────────────── */
export default function StorefrontSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  // Desktop secondary panel / mobile accordion / currency menu.
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Rows keep their entrance class until the close transition has finished so
  // they don't blink out while the drawer slides away.
  const [rowsIn, setRowsIn] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { itemCount, hydrated, openDrawer: openCart } = useCart();
  const { openDrawer: openFavourites } = useFavouritesDrawer();
  const { data: favourites } = useFavourites();

  // Open: entrance animation, scroll lock with scrollbar compensation, focus.
  // Close: release and reset transient state after the 520ms exit.
  useEffect(() => {
    const de = document.documentElement;
    if (open) {
      const scrollbar = window.innerWidth - de.clientWidth;
      de.style.overflow = "hidden";
      if (scrollbar > 0) de.style.paddingRight = `${scrollbar}px`;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- entrance class is tied to the open transition
      setRowsIn(true);
      const focus = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(focus);
    }
    const t = setTimeout(() => {
      de.style.overflow = "";
      de.style.paddingRight = "";
      setRowsIn(false);
      setActiveCategory(null);
      setExpandedCategory(null);
      setCurrencyMenuOpen(false);
      setQuery("");
    }, CLOSE_MS);
    return () => {
      clearTimeout(t);
      de.style.overflow = "";
      de.style.paddingRight = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const showSub = useCallback((label: string | null) => {
    setActiveCategory(label);
  }, []);

  function hoverRow(c: NavCategory) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => showSub(c.sub ? c.label : null), HOVER_INTENT_MS);
  }

  function go(href: string) {
    onClose();
    router.push(href);
  }

  // Close this drawer and hand off to the other one in the same click.
  function openSideDrawer(fn: () => void) {
    onClose();
    fn();
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    go(`/products?search=${encodeURIComponent(q)}`);
  }

  const activeCat = SHOP.find((c) => c.label === activeCategory && c.sub) ?? null;
  const bagCount = hydrated ? itemCount : 0;
  const savedCount = favourites?.length ?? 0;
  const inCls = rowsIn ? ` ${styles.in}` : "";

  function selectRow(c: NavCategory) {
    if (c.sub) showSub(activeCategory === c.label ? null : c.label);
    else if (c.href) go(c.href);
  }
  const rowProps = (c: NavCategory, delay: number) => ({
    c, delay, inCls, active: activeCategory === c.label, onHover: hoverRow, onSelect: selectRow,
  });

  return (
    <div className={styles.root} data-open={open}>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />

      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        onMouseLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }}
      >
        <div className={styles.primary}>
          {/* Head */}
          <div className={styles.head}>
            <button ref={closeRef} type="button" className={styles.close} onClick={onClose}>
              <X size={16} strokeWidth={1.6} />
              <span>Close</span>
            </button>
            <Link href="/" onClick={onClose} aria-label="1NRI home">
              <Image
                src="/homepage_img/no-bg-1NRI.png"
                alt="1NRI"
                width={80}
                height={20}
                className={styles.logo}
                unoptimized
              />
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={submitSearch} className={styles.search} role="search">
            <Search size={18} strokeWidth={1.5} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the store"
              aria-label="Search"
            />
          </form>

          {/* Desktop body: two-panel */}
          <div className={`${styles.body} ${styles.dOnly}`}>
            <div className={styles.label}>Shop</div>
            <div className={styles.group}>
              {SHOP.map((c, i) => <DesktopRow key={c.label} {...rowProps(c, 80 + i * 38)} />)}
            </div>
            <div className={styles.label}>Explore</div>
            <div className={styles.group}>
              {EXPLORE.map((l, i) => (
                <DesktopRow key={l.href} {...rowProps(l, 80 + (SHOP.length + i) * 38)} />
              ))}
            </div>
            <div className={styles.label}>Yours</div>
            <div className={styles.group}>
              <button
                type="button"
                className={`${styles.row}${inCls}`}
                style={{ animationDelay: `${80 + (SHOP.length + EXPLORE.length) * 38}ms` }}
                onMouseEnter={() => hoverRow({ label: "Bag" })}
                onClick={() => openSideDrawer(openCart)}
              >
                <span className={styles.lbl}>Bag</span>
                {bagCount > 0 && <span className={styles.count}>{bagCount > 99 ? "99+" : bagCount}</span>}
              </button>
              <button
                type="button"
                className={`${styles.row}${inCls}`}
                style={{ animationDelay: `${80 + (SHOP.length + EXPLORE.length + 1) * 38}ms` }}
                onMouseEnter={() => hoverRow({ label: "Saved Items" })}
                onClick={() => openSideDrawer(openFavourites)}
              >
                <span className={styles.lbl}>Saved Items</span>
                {savedCount > 0 && <span className={styles.count}>{savedCount}</span>}
              </button>
            </div>
            <div className={styles.label}>Info</div>
            <div className={styles.group}>
              {INFO.map((l, i) => (
                <DesktopRow key={l.href} {...rowProps(l, 80 + (SHOP.length + EXPLORE.length + 2 + i) * 38)} />
              ))}
            </div>
          </div>

          {/* Mobile body: accordion */}
          <div className={`${styles.body} ${styles.mOnly}`}>
            {SHOP.map((c, i) => {
              const isParent = !!c.sub;
              const expanded = expandedCategory === c.label;
              return (
                <div key={c.label}>
                  <button
                    type="button"
                    className={`${styles.row}${inCls}`}
                    style={{ animationDelay: `${60 + i * 38}ms` }}
                    data-expanded={isParent ? expanded : undefined}
                    aria-expanded={isParent ? expanded : undefined}
                    onClick={() => {
                      if (isParent) setExpandedCategory(expanded ? null : c.label);
                      else if (c.href) go(c.href);
                    }}
                  >
                    <span className={styles.lbl}>{c.label}</span>
                    <span className={styles.rowEnd}>
                      {c.tag && <span className={styles.tag}>{c.tag}</span>}
                      {isParent && <span className={styles.chev}><ChevronRight size={16} strokeWidth={1.5} /></span>}
                    </span>
                  </button>
                  {isParent && (
                    <div className={styles.acc} data-open={expanded}>
                      <div>
                        <div className={styles.accInner}>
                          {c.sub!.map((s) => (
                            <Link key={s.href} href={s.href} onClick={onClose} tabIndex={expanded ? 0 : -1}>
                              {s.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className={styles.label}>Explore</div>
            <div className={styles.mini}>
              {EXPLORE.map((l) => (
                <Link key={l.href} href={l.href} onClick={onClose}>{l.label}</Link>
              ))}
            </div>
            <div className={styles.label}>Yours</div>
            <div className={styles.mini}>
              <button type="button" onClick={() => openSideDrawer(openCart)}>
                <span>Bag</span>
                {bagCount > 0 && <span className={styles.count}>{bagCount > 99 ? "99+" : bagCount}</span>}
              </button>
              <button type="button" onClick={() => openSideDrawer(openFavourites)}>
                <span>Saved Items</span>
                {savedCount > 0 && <span className={styles.count}>{savedCount}</span>}
              </button>
            </div>
            <div className={styles.label}>Info</div>
            <div className={styles.mini}>
              {INFO.map((l) => (
                <Link key={l.href} href={l.href} onClick={onClose}>{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Pinned footer */}
          <div className={styles.foot}>
            <AccountRow onNavigate={onClose} />
            <CurrencyRow open={currencyMenuOpen} setOpen={setCurrencyMenuOpen} />
          </div>
        </div>

        {/* Desktop secondary panel: slides out from behind the primary */}
        <div className={`${styles.secondary} ${styles.dOnly}`} data-show={!!activeCat} aria-hidden={!activeCat}>
          <div className={styles.subWrap}>
            {activeCat && (
              <>
                <div className={styles.subTitle}>{activeCat.label}</div>
                {activeCat.sub!.map((s, i) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={onClose}
                    className={`${styles.sub} ${styles.in}`}
                    style={{ animationDelay: `${30 + i * 34}ms` }}
                  >
                    <span>{s.label}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
