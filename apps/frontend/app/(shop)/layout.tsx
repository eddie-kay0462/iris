"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag } from "lucide-react";
import { ThemeProvider, useTheme } from "@/lib/theme/theme-provider";
import { CartProvider, useCart } from "@/lib/cart";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="p-1 text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white"
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

function CartLink() {
  const { itemCount } = useCart();
  return (
    <Link href="/cart" className="relative p-1 text-gray-600 transition hover:text-black dark:text-gray-400 dark:hover:text-white">
      <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white dark:bg-white dark:text-black">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}

const navLinks = [
  { href: "/products", label: "Shop" },
  { href: "/products?tag=new", label: "New Arrivals" },
  { href: "/lookbook", label: "Lookbook" },
];

function ShopHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href.includes("?")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        {/* Left nav (desktop) */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-xs font-medium uppercase tracking-widest transition ${
                isActive(link.href)
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
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          )}
        </button>

        {/* Centered logo */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center"
        >
          <Image
            src="/homepage_img/no-bg-1NRI.png"
            alt="1NRI"
            width={120}
            height={48}
            className="h-8 w-auto min-w-[60px] dark:invert"
            priority
            unoptimized
          />
        </Link>

        {/* Right icons */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <CartLink />
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="border-t border-gray-200 px-4 py-4 dark:border-gray-800 md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-xs font-medium uppercase tracking-widest ${
                  isActive(link.href)
                    ? "text-black dark:text-white"
                    : "text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function ShopFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Image
              src="/homepage_img/no-bg-1NRI.png"
              alt="1NRI"
              width={96}
              height={38}
              className="h-6 w-auto min-w-[48px] dark:invert"
              unoptimized
            />
            <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Faith-inspired streetwear for the bold and the believing.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
              Shop
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/products" className="text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?tag=new" className="text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link href="/products?tag=collections" className="text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                  Collections
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
              Help
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/orders" className="text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-xs text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white">
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-gray-100">
              Connect
            </h4>
            <ul className="mt-3 space-y-2">
              <li>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Instagram
                </span>
              </li>
              <li>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Twitter / X
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} 1NRI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <CartProvider>
        <div className="relative min-h-screen bg-white dark:bg-gray-950">
          <ShopHeader />
          <main>{children}</main>
          <ShopFooter />
        </div>
      </CartProvider>
    </ThemeProvider>
  );
}
