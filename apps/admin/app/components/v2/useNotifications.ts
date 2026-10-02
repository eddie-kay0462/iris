"use client";

import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Boxes, MessageSquareText, ShoppingBasket, ShoppingCart } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { PaginatedOrders } from "@/lib/api/orders";
import type { PaginatedCustomers } from "@/lib/api/orders";
import type { InventoryItem } from "@/lib/api/inventory";
import type { PaginatedReviews } from "@/lib/api/reviews";
import type { AbandonedCheckoutsResponse } from "@/lib/api/analytics";
import { formatGHS } from "@/lib/charts/theme";
import { roleHasPermission, type UserRole } from "@/lib/rbac/permissions";
import { fetchActivityFeed } from "@/app/(dashboard)/activity/actions";

export type NotificationItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  /** ISO time, or null for state-based alerts (e.g. low stock). */
  time: string | null;
  meta?: string;
  href: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  time: string;
  kind: "admin" | "sale";
  href: string;
};

export type NewCustomer = { id: string; name: string; email: string; time: string };

const POLL = 60_000;

/** "status_change" → "Status change". */
function humanize(s: string) {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Data for the new IRIS notification bar. Each source is only fetched when the
 * role can read it, so staff never trigger a 403. Queries poll every minute.
 */
export function useNotifications(role: UserRole) {
  const can = (p: Parameters<typeof roleHasPermission>[1]) => roleHasPermission(role, p);

  const orders = useQuery({
    queryKey: ["iris-panel", "orders"],
    queryFn: () => apiClient<PaginatedOrders>("/orders/admin/list?limit=5"),
    enabled: can("orders:read"),
    refetchInterval: POLL,
  });
  const lowStock = useQuery({
    queryKey: ["iris-panel", "low-stock"],
    queryFn: () => apiClient<InventoryItem[]>("/inventory/low-stock"),
    enabled: can("inventory:read"),
    refetchInterval: POLL,
  });
  const reviews = useQuery({
    queryKey: ["iris-panel", "reviews"],
    queryFn: () => apiClient<PaginatedReviews>("/reviews?is_approved=false&limit=3"),
    enabled: can("reviews:read"),
    refetchInterval: POLL,
  });
  const abandoned = useQuery({
    queryKey: ["iris-panel", "abandoned"],
    queryFn: () => apiClient<AbandonedCheckoutsResponse>("/analytics/abandoned-checkouts?page=1"),
    enabled: can("analytics:read"),
    refetchInterval: POLL,
  });
  const activity = useQuery({
    queryKey: ["iris-panel", "activity"],
    queryFn: () => fetchActivityFeed(),
    enabled: can("settings:read"),
    refetchInterval: POLL,
  });
  const customers = useQuery({
    queryKey: ["iris-panel", "customers"],
    queryFn: () => apiClient<PaginatedCustomers>("/orders/admin/customers?limit=4"),
    enabled: can("customers:read"),
    refetchInterval: POLL,
  });

  const timed: NotificationItem[] = [
    ...(orders.data?.data ?? []).map((o) => ({
      id: `order-${o.id}`,
      icon: ShoppingCart,
      title: `New order #${o.order_number}`,
      meta: formatGHS(Number(o.total)),
      time: o.created_at,
      href: `/orders/${o.id}`,
    })),
    ...(reviews.data?.data ?? []).map((r) => ({
      id: `review-${r.id}`,
      icon: MessageSquareText,
      title: `${r.rating}★ review${r.products?.title ? ` on ${r.products.title}` : ""}`,
      meta: "Awaiting approval",
      time: r.created_at,
      href: "/reviews",
    })),
    ...(abandoned.data?.checkouts ?? [])
      .filter((c) => c.status === "abandoned")
      .slice(0, 3)
      .map((c) => ({
        id: `abandoned-${c.id}`,
        icon: ShoppingBasket,
        title: `Checkout abandoned${c.customer.name ? ` by ${c.customer.name}` : ""}`,
        meta: formatGHS(Number(c.subtotal)),
        time: c.date,
        href: `/orders/abandoned/${c.id}`,
      })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 5);

  const stock: NotificationItem[] = (lowStock.data ?? []).slice(0, 2).map((v) => ({
    id: `stock-${v.id}`,
    icon: Boxes,
    title: `Running low on ${v.product.title}`,
    meta: `${v.inventory_quantity} left${v.option1_value ? ` · ${v.option1_value}` : ""}`,
    time: null,
    href: `/products/${v.product_id}`,
  }));

  const notifications = [...timed, ...stock];

  const team: ActivityItem[] = [
    ...(activity.data?.adminLogs ?? []).map((l) => ({
      id: `log-${l.id}`,
      kind: "admin" as const,
      title: `${humanize(l.action)} · ${humanize(l.entity_type).replace(/\bb2b\b/i, "B2B")}`,
      time: l.created_at,
      href: "/activity",
    })),
    ...(activity.data?.sales ?? []).map((s) => ({
      id: `sale-${s.id}`,
      kind: "sale" as const,
      title: `${s.ally_name ?? "An ally"} sold #${s.order_number}`,
      time: s.sale_date,
      href: "/markets",
    })),
  ]
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 5);

  const newCustomers: NewCustomer[] = (customers.data?.data ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email,
    email: c.email,
    time: c.created_at,
  }));

  return {
    notifications,
    team,
    newCustomers,
    /** Newest timestamped notification, for the bell's unseen dot. */
    latest: timed[0]?.time ?? null,
    show: {
      notifications: can("orders:read") || can("inventory:read") || can("reviews:read") || can("analytics:read"),
      team: can("settings:read"),
      customers: can("customers:read"),
    },
    loading: orders.isLoading || activity.isLoading || customers.isLoading,
  };
}
