"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  ChevronDown,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  X,
  Search,
} from "lucide-react";
import {
  usePopupEvents,
  usePopupStats,
  usePopupOrders,
  useCreatePopupOrder,
  useUpdatePopupOrder,
  useCreatePopupEvent,
  type PopupEvent,
  type PopupOrder,
  type PopupOrderStatus,
  type PopupPaymentMethod,
  type CreateOrderItemInput,
} from "@/lib/api/popup-sales";
import { apiClient } from "@/lib/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return `GH₵ ${amount.toFixed(2)}`;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name: string | null | undefined) {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function avatarColor(name: string | null | undefined) {
  if (!name) return AVATAR_COLORS[0];
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

const STATUS_LABELS: Record<PopupOrderStatus, string> = {
  active: "Active",
  awaiting_payment: "Awaiting",
  confirmed: "Confirmed",
  completed: "Completed",
  on_hold: "On Hold",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<PopupOrderStatus, string> = {
  active: "bg-blue-50 text-blue-700",
  awaiting_payment: "bg-amber-50 text-amber-700",
  confirmed: "bg-green-50 text-green-700",
  completed: "bg-slate-100 text-slate-600",
  on_hold: "bg-orange-50 text-orange-700",
  cancelled: "bg-red-50 text-red-500",
};

const PAYMENT_LABELS: Record<PopupPaymentMethod, string> = {
  cash: "Cash",
  momo: "MoMo",
  bank_transfer: "Bank Transfer",
};

type Tab = "active" | "on_hold" | "completed" | "awaiting_payment";

const TABS: { id: Tab; label: string; status: PopupOrderStatus }[] = [
  { id: "active", label: "Active", status: "active" },
  { id: "on_hold", label: "On Hold", status: "on_hold" },
  { id: "completed", label: "Completed", status: "completed" },
  { id: "awaiting_payment", label: "Confirmation Queue", status: "awaiting_payment" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={iconColor}>{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function OrderActionsMenu({
  order,
  onUpdate,
}: {
  order: PopupOrder;
  onUpdate: (id: string, status: PopupOrderStatus, paymentMethod?: PopupPaymentMethod) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const actions: { label: string; status: PopupOrderStatus; show: boolean }[] = (
    [
      {
        label: "Mark as Awaiting Payment",
        status: "awaiting_payment" as PopupOrderStatus,
        show: order.status === "active",
      },
      {
        label: "Confirm Payment",
        status: "confirmed" as PopupOrderStatus,
        show: order.status === "awaiting_payment",
      },
      {
        label: "Mark as Completed",
        status: "completed" as PopupOrderStatus,
        show: order.status === "confirmed" || order.status === "active",
      },
      {
        label: "Put On Hold",
        status: "on_hold" as PopupOrderStatus,
        show: order.status === "active" || order.status === "awaiting_payment",
      },
      {
        label: "Reactivate",
        status: "active" as PopupOrderStatus,
        show: order.status === "on_hold",
      },
      {
        label: "Cancel Order",
        status: "cancelled" as PopupOrderStatus,
        show: order.status !== "completed" && order.status !== "cancelled",
      },
    ] as { label: string; status: PopupOrderStatus; show: boolean }[]
  ).filter((a) => a.show);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => {
                onUpdate(order.id, action.status);
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                action.status === "cancelled"
                  ? "text-red-600"
                  : "text-slate-700"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New Order Modal ──────────────────────────────────────────────────────────

interface ProductSearchResult {
  id: string;
  title: string;
  product_variants: {
    id: string;
    title: string | null;
    sku: string | null;
    price: number;
  }[];
}

function NewOrderModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const createOrder = useCreatePopupOrder(eventId);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PopupPaymentMethod | "">("");
  const [items, setItems] = useState<CreateOrderItemInput[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!productSearch.trim()) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient<{ data: ProductSearchResult[] }>(
          `/products?search=${encodeURIComponent(productSearch)}&limit=8`
        );
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [productSearch]);

  function addItem(
    product: ProductSearchResult,
    variant: ProductSearchResult["product_variants"][0]
  ) {
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.variant_id === variant.id);
      if (existing >= 0) {
        return prev.map((i, idx) =>
          idx === existing ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          variant_id: variant.id,
          product_name: product.title,
          variant_title: variant.title || undefined,
          sku: variant.sku || undefined,
          quantity: 1,
          unit_price: variant.price,
        },
      ];
    });
    setProductSearch("");
    setSearchResults([]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateQty(idx: number, qty: number) {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, quantity: qty } : item))
    );
  }

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    await createOrder.mutateAsync({
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      payment_method: paymentMethod || undefined,
      items,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">New Order</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Customer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Product search */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Add Items
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            {(searchResults.length > 0 || searching) && (
              <div className="mt-1 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                {searching && (
                  <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>
                )}
                {searchResults.map((product) =>
                  product.product_variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => addItem(product, variant)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="text-slate-800">
                        {product.title}
                        {variant.title && (
                          <span className="ml-1 text-slate-400">
                            — {variant.title}
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500">
                        {formatCurrency(variant.price)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {item.product_name}
                      {item.variant_title && (
                        <span className="ml-1 text-slate-400">
                          — {item.variant_title}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatCurrency(item.unit_price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQty(idx, item.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-white"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(idx, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-white"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-20 text-right text-sm font-medium text-slate-700">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-slate-300 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex justify-end pt-1">
                <p className="text-sm font-semibold text-slate-900">
                  Total: {formatCurrency(total)}
                </p>
              </div>
            </div>
          )}

          {/* Payment method */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PopupPaymentMethod | "")
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">Select (optional)</option>
              <option value="cash">Cash</option>
              <option value="momo">MoMo</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={items.length === 0 || createOrder.isPending}
              className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {createOrder.isPending ? "Creating…" : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── New Event Modal ──────────────────────────────────────────────────────────

function NewEventModal({ onClose }: { onClose: () => void }) {
  const createEvent = useCreatePopupEvent();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [status, setStatus] = useState<"draft" | "active">("active");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createEvent.mutateAsync({
      name,
      location: location || undefined,
      event_date: eventDate || undefined,
      status,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">New Pop-up Event</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Black Saturday Pop-up Event"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Accra Mall, Ground Floor"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Event Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "active")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createEvent.isPending}
              className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {createEvent.isPending ? "Creating…" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Event Selector ───────────────────────────────────────────────────────────

function EventSelector({
  events,
  selectedId,
  onSelect,
  onNewEvent,
}: {
  events: PopupEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewEvent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = events.find((e) => e.id === selectedId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <span>{selected?.name ?? "Select event"}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => {
                onSelect(event.id);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                event.id === selectedId
                  ? "font-medium text-slate-900"
                  : "text-slate-700"
              }`}
            >
              <span>{event.name}</span>
              <span
                className={`text-xs ${
                  event.status === "active"
                    ? "text-green-600"
                    : event.status === "closed"
                    ? "text-slate-400"
                    : "text-amber-500"
                }`}
              >
                {event.status}
              </span>
            </button>
          ))}
          {events.length > 0 && (
            <div className="my-1 border-t border-slate-100" />
          )}
          <button
            onClick={() => {
              onNewEvent();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            New Event
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Order Table ─────────────────────────────────────────────────────────────

function OrderTable({
  orders,
  isLoading,
  onUpdate,
}: {
  orders: PopupOrder[];
  isLoading: boolean;
  onUpdate: (id: string, status: PopupOrderStatus, paymentMethod?: PopupPaymentMethod) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-slate-400">
        No orders in this category
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
            <th className="px-5 py-3">Order #</th>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">Served by</th>
            <th className="px-5 py-3">Items</th>
            <th className="px-5 py-3">Total</th>
            <th className="px-5 py-3">Payment Method</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Time</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const staffName = order.profiles
                  ? [order.profiles.first_name, order.profiles.last_name].filter(Boolean).join(" ") || null
                  : null;
            const itemCount = order.popup_order_items?.length ?? 0;
            return (
              <tr
                key={order.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-5 py-4 text-sm font-medium text-slate-800">
                  {order.order_number}
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-slate-800">
                    {order.customer_name || (
                      <span className="text-slate-400">Walk-in</span>
                    )}
                  </p>
                  {order.customer_phone && (
                    <p className="text-xs text-slate-400">
                      {order.customer_phone}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(staffName)}`}
                    >
                      {initials(staffName)}
                    </span>
                    <span className="text-sm text-slate-700">
                      {staffName ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </td>
                <td className="px-5 py-4 text-sm font-medium text-slate-800">
                  {formatCurrency(Number(order.total))}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">
                  {order.payment_method
                    ? PAYMENT_LABELS[order.payment_method]
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[order.status]
                    }`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">
                  {timeAgo(order.created_at)}
                </td>
                <td className="px-5 py-4">
                  <OrderActionsMenu order={order} onUpdate={onUpdate} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PopupSalesPage() {
  const { data: events = [], isLoading: eventsLoading } = usePopupEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);

  // Auto-select first active event, then first event
  useEffect(() => {
    if (selectedEventId || events.length === 0) return;
    const active = events.find((e) => e.status === "active");
    setSelectedEventId(active?.id ?? events[0].id);
  }, [events, selectedEventId]);

  const { data: stats } = usePopupStats(selectedEventId);
  const { data: ordersData, isLoading: ordersLoading } = usePopupOrders(
    selectedEventId,
    { status: TABS.find((t) => t.id === activeTab)?.status }
  );

  const updateOrder = useUpdatePopupOrder();

  function handleUpdateOrder(
    id: string,
    status: PopupOrderStatus,
    paymentMethod?: PopupPaymentMethod
  ) {
    updateOrder.mutate({ id, dto: { status, ...(paymentMethod ? { payment_method: paymentMethod } : {}) } });
  }

  const orders = ordersData?.data ?? [];
  const awaitingCount = stats?.awaiting_payment ?? 0;

  if (eventsLoading) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Pop-up Sales</h1>
          <div className="flex items-center gap-3">
            <EventSelector
              events={events}
              selectedId={selectedEventId}
              onSelect={setSelectedEventId}
              onNewEvent={() => setShowNewEvent(true)}
            />
            {selectedEventId && (
              <button
                onClick={() => setShowNewOrder(true)}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New Order
              </button>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-24 text-center">
            <p className="text-slate-500">No pop-up events yet.</p>
            <button
              onClick={() => setShowNewEvent(true)}
              className="mt-4 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create First Event
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatsCard
                label="Session Revenue"
                value={stats ? formatCurrency(stats.session_revenue) : "—"}
                icon={<TrendingUp className="h-4 w-4" />}
                iconColor="text-emerald-500"
              />
              <StatsCard
                label="Orders Completed"
                value={stats?.orders_completed ?? "—"}
                icon={<CheckCircle className="h-4 w-4" />}
                iconColor="text-green-500"
              />
              <StatsCard
                label="On Hold"
                value={stats?.on_hold ?? "—"}
                icon={<Clock className="h-4 w-4" />}
                iconColor="text-amber-500"
              />
              <StatsCard
                label="Awaiting Payment"
                value={stats?.awaiting_payment ?? "—"}
                icon={<AlertCircle className="h-4 w-4" />}
                iconColor="text-amber-500"
              />
            </div>

            {/* Tabs + Table */}
            <div className="rounded-xl border border-slate-200 bg-white">
              {/* Tab bar */}
              <div className="flex items-center gap-1 border-b border-slate-100 px-4 pt-3">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "border-b-2 border-slate-900 text-slate-900"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                    {tab.id === "awaiting_payment" && awaitingCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-semibold text-white">
                        {awaitingCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Confirmation banner */}
              {activeTab === "active" && awaitingCount > 0 && (
                <div className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-sm text-amber-700">
                  {awaitingCount} order{awaitingCount !== 1 ? "s" : ""} awaiting
                  payment confirmation. Serve next customer while you wait.
                </div>
              )}

              <OrderTable
                orders={orders}
                isLoading={ordersLoading}
                onUpdate={handleUpdateOrder}
              />
            </div>
          </>
        )}
      </section>

      {showNewOrder && selectedEventId && (
        <NewOrderModal
          eventId={selectedEventId}
          onClose={() => setShowNewOrder(false)}
        />
      )}
      {showNewEvent && (
        <NewEventModal onClose={() => setShowNewEvent(false)} />
      )}
    </>
  );
}
