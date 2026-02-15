"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Warehouse,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  PanelLeftOpen,
  PanelLeftClose,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission, UserRole } from "@/lib/rbac/permissions";
import { roleHasPermission } from "@/lib/rbac/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package, permission: "products:read" },
  { href: "/orders", label: "Orders", icon: ShoppingCart, permission: "orders:read" },
  { href: "/payments", label: "Payments", icon: CreditCard, permission: "orders:read" },
  { href: "/inventory", label: "Inventory", icon: Warehouse, permission: "inventory:read" },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers:read" },
  { href: "/waitlist", label: "Waitlist", icon: ClipboardList, permission: "waitlist:read" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:read" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:read" },
];

type SidebarProps = {
  role?: UserRole;
  mobileOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ role = "admin", mobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);

  const expanded = pinned || hovered;

  const filteredItems = navItems.filter(
    (item) => !item.permission || roleHasPermission(role, item.permission)
  );

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Brand / pin area */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-800 px-3">
        <span
          className={`whitespace-nowrap text-sm font-semibold text-white transition-opacity duration-300 ${
            expanded || mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          Iris Admin
        </span>
        {/* Desktop: pin button, Mobile: close button */}
        {mobileOpen ? (
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setPinned((p) => !p)}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white md:flex"
            title={pinned ? "Collapse sidebar" : "Pin sidebar open"}
          >
            {pinned ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={expanded || mobileOpen ? undefined : item.label}
              className={`flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity duration-300 ${
                  expanded || mobileOpen ? "opacity-100" : "opacity-0"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`${
          expanded ? "w-56" : "w-16"
        } hidden shrink-0 border-r border-neutral-800 bg-black transition-[width] duration-300 overflow-hidden md:block`}
      >
        {navContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-black md:hidden">
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}
