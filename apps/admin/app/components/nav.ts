import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  MessageSquare,
  Star,
  ShoppingBag,
  Store,
  Sliders,
  Activity,
  ShoppingBasket,
  FileBarChart,
  DoorOpen,
  Briefcase,
  TicketPercent,
  UserCog,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Permission, UserRole } from "@/lib/rbac/permissions";
import { roleHasPermission } from "@/lib/rbac/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  /** Nested pages, shown under a chevron in the new IRIS sidebar. */
  children?: NavItem[];
};

/** Classic sidebar: one flat list. */
export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package, permission: "products:read" },
  { href: "/orders", label: "Orders", icon: ShoppingCart, permission: "orders:read" },
  { href: "/orders/abandoned", label: "Abandoned Checkouts", icon: ShoppingBasket, permission: "analytics:read" },
  { href: "/popup-sales", label: "Pop-up Sales", icon: ShoppingBag, permission: "popup:read" },
  { href: "/walkin-sales", label: "Walk-in Sales", icon: DoorOpen, permission: "orders:read" },
  { href: "/b2b", label: "B2B", icon: Briefcase, permission: "b2b:read" },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers:read" },
  { href: "/markets", label: "Markets", icon: Store, permission: "markets:read" },
  { href: "/reviews", label: "Reviews", icon: Star, permission: "reviews:read" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:read" },
  { href: "/analytics/reports", label: "Reports", icon: FileBarChart, permission: "analytics:read" },
  { href: "/activity", label: "Activity", icon: Activity, permission: "settings:read" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:read" },
  { href: "/settings/general", label: "General", icon: Sliders, permission: "settings:read" },
  { href: "/settings/communications", label: "Communications", icon: MessageSquare, permission: "settings:read" },
];

export type NavGroup = { label: string; items: NavItem[] };

/** New IRIS sidebar: the same pages, grouped the way the kit groups them. */
export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      {
        href: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        permission: "analytics:read",
        children: [
          { href: "/analytics/reports", label: "Reports", icon: FileBarChart, permission: "analytics:read" },
        ],
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        href: "/orders",
        label: "Orders",
        icon: ShoppingCart,
        permission: "orders:read",
        children: [
          { href: "/orders/abandoned", label: "Abandoned Checkouts", icon: ShoppingBasket, permission: "analytics:read" },
        ],
      },
      { href: "/popup-sales", label: "Pop-up Sales", icon: ShoppingBag, permission: "popup:read" },
      { href: "/walkin-sales", label: "Walk-in Sales", icon: DoorOpen, permission: "orders:read" },
      { href: "/b2b", label: "B2B", icon: Briefcase, permission: "b2b:read" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/products", label: "Products", icon: Package, permission: "products:read" },
      { href: "/reviews", label: "Reviews", icon: Star, permission: "reviews:read" },
    ],
  },
  {
    label: "Relationships",
    items: [
      { href: "/customers", label: "Customers", icon: Users, permission: "customers:read" },
      { href: "/settings/communications", label: "Communications", icon: MessageSquare, permission: "settings:read" },
      { href: "/markets", label: "Markets", icon: Store, permission: "markets:read" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/activity", label: "Activity", icon: Activity, permission: "settings:read" },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        permission: "settings:read",
        children: [
          { href: "/settings/general", label: "General", icon: Sliders, permission: "settings:read" },
          { href: "/settings/promos", label: "Promos", icon: TicketPercent, permission: "settings:read" },
          { href: "/settings/users", label: "Users", icon: UserCog, permission: "settings:read" },
          { href: "/settings/roles", label: "Roles", icon: ShieldCheck, permission: "settings:read" },
        ],
      },
    ],
  },
];

function allowed(role: UserRole, item: NavItem) {
  return !item.permission || roleHasPermission(role, item.permission);
}

/** navGroups with everything the role can't open removed (and empty groups dropped). */
export function navGroupsForRole(role: UserRole): NavGroup[] {
  return navGroups
    .map((g) => ({
      label: g.label,
      items: g.items
        .filter((i) => allowed(role, i))
        .map((i) => ({ ...i, children: i.children?.filter((c) => allowed(role, c)) })),
    }))
    .filter((g) => g.items.length > 0);
}

/** Every page in the new IRIS nav, flattened — for search and breadcrumbs. */
export function flattenNav(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items.flatMap((i) => [i, ...(i.children ?? [])]));
}

/** The nav href that best matches `pathname` (longest prefix wins). */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: string | null = null;
  for (const { href } of items) {
    const hit = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    if (hit && (!best || href.length > best.length)) best = href;
  }
  return best;
}

const SEGMENT_LABELS: Record<string, string> = {
  new: "New",
  abandoned: "Abandoned Checkouts",
  reports: "Reports",
  clients: "Clients",
  redemptions: "Redemptions",
};

/** Breadcrumb trail for a path, e.g. /products/abc → Products / Details. */
export function breadcrumbFor(pathname: string): { label: string; href: string }[] {
  const all = flattenNav(navGroups);
  if (pathname === "/") return [{ label: "Dashboard", href: "/" }, { label: "Overview", href: "/" }];
  const parts = pathname.split("/").filter(Boolean);
  // Every trail starts at the dashboard, as in the kit ("Dashboard / Products").
  const crumbs: { label: string; href: string }[] = [{ label: "Dashboard", href: "/" }];
  let href = "";
  for (const part of parts) {
    href += `/${part}`;
    const nav = all.find((i) => i.href === href);
    // Uuids / record ids read as "Details"; known segments get a nice label.
    const label =
      nav?.label ??
      SEGMENT_LABELS[part] ??
      (/^[0-9a-f-]{8,}$/i.test(part) || /\d/.test(part)
        ? "Details"
        : part.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
    crumbs.push({ label, href });
  }
  return crumbs;
}
