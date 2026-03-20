"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Minus,
  ChevronDown,
  TrendingUp,
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  X,
  Search,
  Pause,
  Trash2,
  ShoppingCart,
  Banknote,
  Smartphone,
  Landmark,
} from "lucide-react";
import {
  usePopupEvents,
  usePopupStats,
  usePopupOrders,
  useCreatePopupOrder,
  useUpdatePopupOrder,
  useCreatePopupEvent,
  useChargePopupOrder,
  useSubmitPopupOtp,
  useVerifyPopupPayment,
  useCreatePopupCustomer,
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

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="p-6">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">{message}</p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              No, go back
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white ${danger
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-slate-900 hover:bg-slate-800"
                }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderActionsMenu({
  order,
  onUpdate,
  onChargeMomo,
}: {
  order: PopupOrder;
  onUpdate: (id: string, status: PopupOrderStatus, paymentMethod?: PopupPaymentMethod) => void;
  onChargeMomo: (order: PopupOrder) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [confirm, setConfirm] = useState<{ status: PopupOrderStatus; label: string } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 208; // w-52
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.right - menuWidth,
    });
    setOpen((v) => !v);
  }

  function handleActionClick(action: { label: string; status: PopupOrderStatus }) {
    setOpen(false);
    if (action.status === "cancelled" || action.status === "completed") {
      setConfirm({ status: action.status, label: action.label });
    } else {
      onUpdate(order.id, action.status);
    }
  }

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

  const showMomoCharge =
    order.status === "active" || order.status === "on_hold" || order.status === "awaiting_payment";

  const confirmConfigs: Partial<Record<PopupOrderStatus, { title: string; message: string; confirmLabel: string; danger: boolean }>> = {
    cancelled: {
      title: "Cancel this order?",
      message: `Order ${order.order_number} will be cancelled. This cannot be undone.`,
      confirmLabel: "Yes, cancel order",
      danger: true,
    },
    completed: {
      title: "Mark as completed?",
      message: `Order ${order.order_number} will be marked as completed and inventory will be deducted.`,
      confirmLabel: "Yes, complete order",
      danger: false,
    },
  };
  const confirmConfig = confirm ? confirmConfigs[confirm.status] : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 50 }}
          className="w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {showMomoCharge && (
            <button
              onClick={() => {
                onChargeMomo(order);
                setOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm font-medium text-violet-700 hover:bg-violet-50"
            >
              Charge via MoMo
            </button>
          )}
          {showMomoCharge && actions.length > 0 && (
            <div className="my-1 border-t border-slate-100" />
          )}
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => handleActionClick(action)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${action.status === "cancelled" ? "text-red-600" : "text-slate-700"
                }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      {confirm && confirmConfig && (
        <ConfirmDialog
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel={confirmConfig.confirmLabel}
          danger={confirmConfig.danger}
          onConfirm={() => {
            onUpdate(order.id, confirm.status);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ─── MoMo Charge Modal ───────────────────────────────────────────────────────

function MoMoChargeModal({
  order,
  onClose,
}: {
  order: PopupOrder;
  onClose: () => void;
}) {
  const charge = useChargePopupOrder();
  const submitOtp = useSubmitPopupOtp();
  const verify = useVerifyPopupPayment();
  const [phone, setPhone] = useState(order.customer_phone || "");
  const [provider, setProvider] = useState<"mtn" | "vod" | "tgo">("mtn");
  const [step, setStep] = useState<"charge" | "otp" | "waiting" | "confirmed">("charge");
  const [otp, setOtp] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start polling Paystack every 5 seconds until payment is confirmed
  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const result = await verify.mutateAsync(id);
        if (result.confirmed) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setStep("confirmed");
        }
      } catch {
        // keep polling silently on transient errors
      }
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleCharge(e: React.FormEvent) {
    e.preventDefault();
    const result = await charge.mutateAsync({ id: order.id, dto: { phone, provider } });
    if (result.paystack_status === "send_otp") {
      setStep("otp");
    } else {
      setStep("waiting");
      startPolling(order.id);
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    await submitOtp.mutateAsync({ id: order.id, otp });
    setStep("waiting");
    startPolling(order.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Charge via MoMo</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          {step === "confirmed" ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
                <p className="font-medium text-base">✅ Payment confirmed!</p>
                <p className="mt-1">
                  Order #{order.order_number} has been paid and confirmed automatically.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          ) : step === "waiting" ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-lg bg-amber-50 p-6 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-300 border-t-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                  Waiting for customer to confirm...
                </p>
                <p className="text-xs text-amber-700">
                  The customer should approve the USSD prompt or enter their PIN on their phone.
                </p>
                <p className="text-xs text-amber-600">
                  Order #{order.order_number} · {formatCurrency(Number(order.total))}
                </p>
              </div>
              <p className="text-center text-xs text-slate-400">
                This will confirm automatically. You can also close and confirm later.
              </p>
              <button
                onClick={onClose}
                className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Close (confirm later)
              </button>
            </div>
          ) : step === "otp" ? (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
                <p className="font-medium">OTP sent to customer</p>
                <p className="mt-1">Ask the customer for the OTP they received via SMS and enter it below.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  OTP *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              {submitOtp.isError && (
                <p className="text-xs text-red-500">
                  {(submitOtp.error as any)?.message || "OTP submission failed. Please try again."}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!otp.trim() || submitOtp.isPending}
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitOtp.isPending ? "Submitting…" : "Submit OTP"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCharge} className="space-y-4">
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-medium">Order:</span> {order.order_number} &nbsp;·&nbsp;
                <span className="font-medium">Total:</span> {formatCurrency(Number(order.total))}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  MoMo Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0244000000"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Network Provider *
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as "mtn" | "vod" | "tgo")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                >
                  <option value="mtn">MTN MoMo</option>
                  <option value="vod">Vodafone Cash</option>
                  <option value="tgo">AirtelTigo Money</option>
                </select>
              </div>
              {charge.isError && (
                <p className="text-xs text-red-500">
                  {(charge.error as any)?.message || "Charge failed. Please try again."}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!phone.trim() || charge.isPending}
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {charge.isPending ? "Sending…" : "Send USSD Prompt"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Order Modal ──────────────────────────────────────────────────────────

type PaymentMethodLocal = "cash" | "momo" | "bank_transfer";
type MoMoNetwork = "mtn" | "telecel" | "airteltigo";
type DiscountType = "none" | "percentage" | "fixed";

interface SplitEntry {
  id: string;
  method: PaymentMethodLocal;
  amount: string;
  receivedAmount?: string;
  network?: MoMoNetwork;
  phone?: string;
  reference?: string;
  bankName?: string;
  sentToPaystack?: boolean;
}

interface ProductSearchResult {
  id: string;
  title: string;
  product_images: { src: string; alt_text: string | null; position: number }[];
  product_variants: {
    id: string;
    title: string | null;
    sku: string | null;
    price: number;
    inventory_quantity?: number;
    option1_value?: string | null;
    option2_value?: string | null;
    option3_value?: string | null;
  }[];
}

type CartItem = CreateOrderItemInput & {
  _localId: string;
  inventory_quantity?: number;
};

const HOLD_DURATIONS = [
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 },
];

const QUICK_PCT = [5, 10, 15, 20];

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function NewOrderModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const createOrder = useCreatePopupOrder(eventId);
  const updateOrder = useUpdatePopupOrder();
  const saveCustomer = useCreatePopupCustomer();

  // ── Product state ──────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Cart state ─────────────────────────────────────────────────────────────
  const [items, setItems] = useState<CartItem[]>([]);

  // ── Customer state ────────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<{ id: string; name: string; email: string; phone: string }[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", email: "", saveToDatabase: true });
  const [customerStats, setCustomerStats] = useState<{ totalOrders: number; totalSpent: number } | null>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const customerSearchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Discount state ─────────────────────────────────────────────────────────
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");

  // ── Payment state ──────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodLocal>("cash");
  const [isSplit, setIsSplit] = useState(false);
  const [splits, setSplits] = useState<SplitEntry[]>([{ id: "1", method: "cash", amount: "" }]);
  const [cashReceived, setCashReceived] = useState("");
  const [momoNetwork, setMomoNetwork] = useState<MoMoNetwork>("mtn");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoReference, setMomoReference] = useState("");
  const [momoSentToPaystack, setMomoSentToPaystack] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [bankSentToPaystack, setBankSentToPaystack] = useState(false);

  // ── Hold state ─────────────────────────────────────────────────────────────
  const [showHold, setShowHold] = useState(false);
  const [holdDuration, setHoldDuration] = useState(15);
  const [holdNote, setHoldNote] = useState("");

  // ── Product search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productSearch.trim()) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient<{ data: ProductSearchResult[] }>(
          `/products/admin/list?search=${encodeURIComponent(productSearch)}&limit=12`
        );
        setSearchResults(res.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [productSearch]);

  // ── Customer search (best-effort) ──────────────────────────────────────────
  useEffect(() => {
    if (!customerSearch.trim()) { setCustomerResults([]); return; }
    clearTimeout(customerSearchTimeout.current);
    customerSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await apiClient<{ data: { id: string; first_name: string | null; last_name: string | null; email: string | null; phone_number: string | null }[] }>(
          `/orders/admin/customers?search=${encodeURIComponent(customerSearch)}&limit=6`
        );
        setCustomerResults(
          (res.data || []).map((c) => ({
            id: c.id,
            name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown",
            email: c.email || "",
            phone: c.phone_number || "",
          }))
        );
      } catch { setCustomerResults([]); }
    }, 300);
    return () => clearTimeout(customerSearchTimeout.current);
  }, [customerSearch]);

  // Customer dropdown close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Computed ───────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discountNum = parseFloat(discountValue) || 0;
  const discountAmount =
    discountType === "percentage" ? (subtotal * discountNum) / 100
      : discountType === "fixed" ? discountNum
        : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const changeDue = cashReceived ? parseFloat(cashReceived) - total : null;
  const allocatedAmount = splits.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const isAllocatedOk = Math.abs(allocatedAmount - total) < 0.01;
  const hasAwaitingConfirmation = isSplit
    ? splits.some((p) => p.sentToPaystack)
    : (paymentMethod === "momo" && momoSentToPaystack) || (paymentMethod === "bank_transfer" && bankSentToPaystack);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const addItem = useCallback((product: ProductSearchResult, variant: ProductSearchResult["product_variants"][0]) => {
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.variant_id === variant.id);
      if (existing >= 0) {
        return prev.map((item, idx) => idx === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        _localId: `${variant.id}-${Date.now()}`,
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.title,
        // Build variant_title from option values (product_variants.title is null in the DB)
        variant_title: [
          variant.option1_value,
          variant.option2_value,
          variant.option3_value,
        ].filter(Boolean).join(" / ") || variant.title || undefined,
        sku: variant.sku || undefined,
        quantity: 1,
        unit_price: variant.price,
        inventory_quantity: variant.inventory_quantity,
      }];
    });
    // Keep the variant picker open so the user can add multiple sizes
  }, []);

  const updateQty = (localId: string, delta: number) =>
    setItems((prev) => prev.map((i) => {
      if (i._localId !== localId) return i;
      const max = i.inventory_quantity ?? Infinity;
      return { ...i, quantity: Math.min(max, Math.max(1, i.quantity + delta)) };
    }));

  const removeItem = (localId: string) => setItems((prev) => prev.filter((i) => i._localId !== localId));

  // ── Split helpers ──────────────────────────────────────────────────────────
  const addSplit = () => setSplits((prev) => [...prev, { id: Date.now().toString(), method: "cash", amount: "" }]);
  const removeSplit = (id: string) => { if (splits.length > 1) setSplits((prev) => prev.filter((p) => p.id !== id)); };
  const updateSplit = (id: string, field: string, value: unknown) =>
    setSplits((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (items.length === 0) return;

    // For single MoMo payment, create a split entry to persist network/phone/sent_to_paystack
    const splitPayloads = isSplit
      ? splits.filter((p) => parseFloat(p.amount) > 0).map((p) => ({
        method: p.method as PopupPaymentMethod,
        amount: parseFloat(p.amount) || 0,
        network: p.network,
        phone: p.phone,
        reference: p.reference,
        bank_name: p.bankName,
        sent_to_paystack: p.sentToPaystack,
      }))
      : paymentMethod === "momo"
        ? [{ method: "momo" as PopupPaymentMethod, amount: total, network: momoNetwork, phone: momoPhone || undefined, reference: momoReference || undefined, sent_to_paystack: momoSentToPaystack }]
        : undefined;

    const newOrder = await createOrder.mutateAsync({
      customer_name: customerForm.name || undefined,
      customer_phone: customerForm.phone || (paymentMethod === "momo" && !isSplit ? momoPhone || undefined : undefined),
      customer_email: customerForm.email || undefined,
      payment_method: paymentMethod,
      payment_reference: isSplit ? undefined : (paymentMethod === "momo" ? momoReference || undefined : paymentMethod === "bank_transfer" ? bankReference || undefined : undefined),
      discount_type: discountType !== "none" ? discountType : undefined,
      discount_amount: discountAmount > 0 ? discountAmount : undefined,
      discount_reason: discountReason || undefined,
      notes: undefined,
      split_payments: splitPayloads,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      items: items.map(({ _localId, inventory_quantity, ...rest }) => rest),
    });

    // If MoMo charge was already sent to Paystack, move order to awaiting_payment
    if (!isSplit && paymentMethod === "momo" && momoSentToPaystack) {
      await updateOrder.mutateAsync({ id: newOrder.id, dto: { status: "awaiting_payment" } });
    }

    // Save customer to the database if requested and not already an existing customer
    if (!selectedCustomerId && customerForm.saveToDatabase && (customerForm.name || customerForm.phone || customerForm.email)) {
      await saveCustomer.mutateAsync({
        name: customerForm.name || undefined,
        phone: customerForm.phone || undefined,
        email: customerForm.email || undefined,
      });
    }

    onClose();
  }

  async function handleHoldConfirm() {
    if (items.length === 0) return;
    const newOrder = await createOrder.mutateAsync({
      customer_name: customerForm.name || undefined,
      customer_phone: customerForm.phone || undefined,
      customer_email: customerForm.email || undefined,
      payment_method: isSplit ? undefined : paymentMethod,
      payment_reference: isSplit ? undefined : (paymentMethod === "momo" ? momoReference || undefined : paymentMethod === "bank_transfer" ? bankReference || undefined : undefined),
      discount_type: discountType !== "none" ? discountType : undefined,
      discount_amount: discountAmount > 0 ? discountAmount : undefined,
      discount_reason: discountReason || undefined,
      hold_duration_minutes: holdDuration,
      hold_note: holdNote || undefined,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      items: items.map(({ _localId, inventory_quantity, ...rest }) => rest),
    });
    await updateOrder.mutateAsync({ id: newOrder.id, dto: { status: "on_hold" } });
    setShowHold(false);
    onClose();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Backdrop ────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* ── Modal shell ─────────────────────────────────────────────────── */}
        <div
          className="flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          style={{ width: "min(1100px, 100vw - 32px)", height: "min(860px, calc(100vh - 48px))" }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">New Pop-up Order</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── LEFT: Product Catalog ─────────────────────────────────── */}
            <div className="flex flex-col overflow-hidden border-r border-slate-200" style={{ width: "55%" }}>
              {/* Search bar */}
              <div className="flex-shrink-0 p-4 pb-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Product results */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {!productSearch.trim() ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                      <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-400">Search for a product to add it to the order</p>
                  </div>
                ) : searching ? (
                  <div className="space-y-2 pt-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="pt-10 text-center text-sm text-slate-400">No products found</p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {searchResults.map((product) => {
                      const thumb = product.product_images
                        ?.slice().sort((a, b) => a.position - b.position)[0]?.src;
                      const isExpanded = expandedProduct === product.id;
                      const inCart = product.product_variants.some((v) =>
                        items.some((i) => i.variant_id === v.id)
                      );

                      return (
                        <div
                          key={product.id}
                          className={cn(
                            "overflow-hidden rounded-lg border transition-colors",
                            inCart ? "border-slate-800" : "border-slate-200"
                          )}
                        >
                          {/* Product header row */}
                          <button
                            type="button"
                            onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                          >
                            {/* Thumbnail */}
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumb}
                                  alt={product.title}
                                  className="h-full w-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <ShoppingCart className="h-5 w-5 text-slate-300" />
                                </div>
                              )}
                            </div>

                            {/* Title + variant count */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{product.title}</p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {product.product_variants.length === 1
                                  ? formatCurrency(product.product_variants[0].price)
                                  : `${product.product_variants.length} variants · from ${formatCurrency(Math.min(...product.product_variants.map(v => v.price)))}`
                                }
                              </p>
                            </div>

                            {/* Cart badge + chevron */}
                            <div className="flex flex-shrink-0 items-center gap-2">
                              {inCart && (
                                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {items.filter((i) => product.product_variants.some((v) => v.id === i.variant_id))
                                    .reduce((s, i) => s + i.quantity, 0)}
                                </span>
                              )}
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 text-slate-400 transition-transform",
                                  isExpanded && "rotate-180"
                                )}
                              />
                            </div>
                          </button>

                          {/* Variant picker */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                              <div className="grid grid-cols-2 gap-1.5">
                                {product.product_variants.map((variant) => {
                                  const lineItem = items.find((i) => i.variant_id === variant.id);
                                  const outOfStock = (variant.inventory_quantity ?? 999) <= 0;
                                  const variantLabel = [
                                    variant.option1_value,
                                    variant.option2_value,
                                    variant.option3_value,
                                  ].filter(Boolean).join(" / ") || variant.title || "Default";

                                  return (
                                    <div
                                      key={variant.id}
                                      className={cn(
                                        "relative flex flex-col rounded-lg border p-2 transition-all",
                                        outOfStock
                                          ? "border-slate-100 bg-slate-50 opacity-50"
                                          : lineItem
                                            ? "border-slate-800 bg-slate-900"
                                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                      )}
                                    >
                                      <div className="mb-1 flex items-start justify-between gap-1">
                                        <span className={cn(
                                          "text-xs font-medium leading-tight",
                                          lineItem ? "text-white" : outOfStock ? "text-slate-400" : "text-slate-700"
                                        )}>
                                          {variantLabel}
                                        </span>
                                        {outOfStock && (
                                          <span className="shrink-0 rounded bg-red-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-500">Out</span>
                                        )}
                                        {!outOfStock && variant.inventory_quantity !== undefined && variant.inventory_quantity <= 5 && (
                                          <span className="shrink-0 rounded bg-amber-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600">{variant.inventory_quantity} left</span>
                                        )}
                                      </div>
                                      <p className={cn(
                                        "mb-2 text-xs",
                                        lineItem ? "text-slate-300" : "text-slate-500"
                                      )}>
                                        {formatCurrency(variant.price)}
                                      </p>
                                      {/* Add / qty controls */}
                                      {outOfStock ? null : lineItem ? (
                                        <div className="flex items-center justify-between rounded border border-slate-700">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); updateQty(lineItem._localId, -1); }}
                                            className="flex h-6 w-6 items-center justify-center text-slate-300 hover:text-white"
                                          >
                                            <Minus className="h-2.5 w-2.5" />
                                          </button>
                                          <span className="text-xs font-semibold text-white">{lineItem.quantity}</span>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); updateQty(lineItem._localId, 1); }}
                                            className="flex h-6 w-6 items-center justify-center text-slate-300 hover:text-white"
                                          >
                                            <Plus className="h-2.5 w-2.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); addItem(product, variant); }}
                                          className="flex w-full items-center justify-center gap-1 rounded border border-slate-200 py-1.5 text-[11px] font-medium text-slate-600 hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                                        >
                                          <Plus className="h-2.5 w-2.5" />
                                          Add
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Order Details ──────────────────────────────────── */}
            <div className="flex flex-col overflow-hidden" style={{ width: "45%" }}>
              <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">

                {/* CART */}
                <section className="p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Cart</p>
                  {items.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 p-4">
                      <ShoppingCart className="h-5 w-5 flex-shrink-0 text-slate-300" />
                      <p className="text-sm text-slate-400">Add products from the catalog on the left</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((item) => (
                        <div key={item._localId} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-800">
                              {item.product_name}
                              {item.variant_title && (
                                <span className="ml-1 font-normal text-slate-400">— {item.variant_title}</span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">{formatCurrency(item.unit_price)} each</p>
                          </div>
                          <div className="flex flex-shrink-0 items-center rounded border border-slate-200 bg-white">
                            <button
                              onClick={() => updateQty(item._localId, -1)}
                              className="flex h-6 w-6 items-center justify-center text-slate-500 hover:text-slate-900"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="w-5 text-center text-xs font-medium text-slate-800">{item.quantity}</span>
                            <button
                              onClick={() => updateQty(item._localId, 1)}
                              className="flex h-6 w-6 items-center justify-center text-slate-500 hover:text-slate-900"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          <span className="w-16 flex-shrink-0 text-right text-xs font-semibold text-slate-700">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeItem(item._localId)}
                            className="flex-shrink-0 rounded p-0.5 text-slate-300 hover:bg-red-50 hover:text-red-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="text-xs text-slate-500">Subtotal</span>
                        <span className="text-xs font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                      </div>
                    </div>
                  )}
                </section>

                {/* CUSTOMER */}
                <section className="p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Customer</p>

                  <div className="relative mb-3" ref={customerRef}>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search by name or phone…"
                      disabled={!!selectedCustomerId}
                      className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-8 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    {selectedCustomerId && (
                      <button
                        onClick={() => {
                          setSelectedCustomerId(null);
                          setCustomerStats(null);
                          setCustomerForm({ name: "", phone: "", email: "", saveToDatabase: true });
                          setCustomerSearch("");
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {customerResults.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCustomerForm({ name: c.name, phone: c.phone, email: c.email, saveToDatabase: false });
                              setCustomerSearch("");
                              setShowCustomerDropdown(false);
                            }}
                            className="flex w-full flex-col px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <span className="text-sm font-medium text-slate-800">{c.name}</span>
                            <span className="text-xs text-slate-400">{c.email}{c.phone ? ` · ${c.phone}` : ""}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCustomerId && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
                      <span className="text-xs font-medium text-green-800">Returning customer</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Full Name</label>
                      <input
                        type="text"
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))}
                        disabled={!!selectedCustomerId}
                        placeholder="Customer name"
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                      <div className="flex">
                        <span className="flex h-9 items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500">+233</span>
                        <input
                          type="tel"
                          value={customerForm.phone.replace("+233", "")}
                          onChange={(e) => setCustomerForm((f) => ({ ...f, phone: "+233" + e.target.value }))}
                          disabled={!!selectedCustomerId}
                          placeholder="244123456"
                          className="h-9 flex-1 rounded-r-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
                        disabled={!!selectedCustomerId}
                        placeholder="customer@email.com"
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>
                    {!selectedCustomerId && (
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={customerForm.saveToDatabase}
                          onChange={(e) => setCustomerForm((f) => ({ ...f, saveToDatabase: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                        />
                        <span className="text-xs text-slate-600">Save to customer database</span>
                      </label>
                    )}
                  </div>
                </section>

                {/* DISCOUNT */}
                <section className="p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Discount</p>
                  <div className="mb-3 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(["none", "percentage", "fixed"] as DiscountType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setDiscountType(t); setDiscountValue(""); }}
                        className={cn(
                          "flex-1 rounded-md py-1.5 text-xs font-medium transition-all",
                          discountType === t
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        {t === "none" ? "None" : t === "percentage" ? "% Off" : "GH₵ Off"}
                      </button>
                    ))}
                  </div>

                  {discountType !== "none" && (
                    <div className="space-y-2.5">
                      {discountType === "percentage" && (
                        <div className="flex gap-1.5">
                          {QUICK_PCT.map((p) => (
                            <button
                              key={p}
                              onClick={() => setDiscountValue(String(p))}
                              className={cn(
                                "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-all",
                                discountValue === String(p)
                                  ? "border-slate-800 bg-slate-900 text-white"
                                  : "border-slate-200 text-slate-600 hover:border-slate-400"
                              )}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max={discountType === "percentage" ? 100 : undefined}
                            step={discountType === "percentage" ? "1" : "0.01"}
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            placeholder={discountType === "percentage" ? "10" : "5.00"}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          placeholder="Reason (optional)"
                          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                        />
                      </div>
                      {discountAmount > 0 && (
                        <p className="text-xs font-medium text-emerald-700">Saving {formatCurrency(discountAmount)}</p>
                      )}
                    </div>
                  )}
                </section>

                {/* PAYMENT */}
                <section className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Payment</p>
                    <label className="flex cursor-pointer items-center gap-2">
                      <span className="text-xs text-slate-600">Split</span>
                      <button
                        type="button"
                        onClick={() => setIsSplit((v) => !v)}
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors focus:outline-none",
                          isSplit ? "bg-slate-800" : "bg-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            isSplit ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </label>
                  </div>

                  {!isSplit ? (
                    <>
                      {/* Method selector */}
                      <div className="mb-4 grid grid-cols-3 gap-2">
                        {([
                          { method: "cash" as PaymentMethodLocal, Icon: Banknote, label: "Cash" },
                          { method: "momo" as PaymentMethodLocal, Icon: Smartphone, label: "MoMo" },
                          { method: "bank_transfer" as PaymentMethodLocal, Icon: Landmark, label: "Bank Transfer" },
                        ]).map(({ method, Icon, label }) => (
                          <button
                            key={method}
                            onClick={() => setPaymentMethod(method)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-all",
                              paymentMethod === method
                                ? "border-slate-800 bg-slate-900 text-white"
                                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Cash fields */}
                      {paymentMethod === "cash" && (
                        <div className="space-y-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Amount Received (GH₵)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={cashReceived}
                              onChange={(e) => setCashReceived(e.target.value)}
                              placeholder="0.00"
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                            />
                          </div>
                          {cashReceived && (
                            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                              <span className="text-xs text-slate-500">
                                {changeDue !== null && changeDue < 0 ? "Amount Short" : "Change Due"}
                              </span>
                              <span className={cn("text-sm font-semibold", changeDue !== null && changeDue < 0 ? "text-red-600" : "text-slate-900")}>
                                {formatCurrency(changeDue !== null ? Math.abs(changeDue) : 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* MoMo fields */}
                      {paymentMethod === "momo" && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-slate-600">Network</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(["mtn", "telecel", "airteltigo"] as MoMoNetwork[]).map((net) => (
                                <button
                                  key={net}
                                  onClick={() => setMomoNetwork(net)}
                                  className={cn(
                                    "rounded-lg border py-2 text-xs font-semibold transition-all",
                                    momoNetwork === net
                                      ? net === "mtn"
                                        ? "border-yellow-400 bg-yellow-400 text-black"
                                        : "border-slate-800 bg-slate-900 text-white"
                                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                                  )}
                                >
                                  {net === "mtn" ? "MTN" : net === "telecel" ? "Telecel" : "AirtelTigo"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Phone Number</label>
                            <div className="flex">
                              <span className="flex h-9 items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500">+233</span>
                              <input
                                type="tel"
                                value={momoPhone}
                                onChange={(e) => setMomoPhone(e.target.value)}
                                placeholder="244123456"
                                className="h-9 flex-1 rounded-r-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Reference (Optional)</label>
                            <input
                              type="text"
                              value={momoReference}
                              onChange={(e) => setMomoReference(e.target.value)}
                              placeholder="MTN-REF-001234"
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                            />
                          </div>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={momoSentToPaystack}
                              onChange={(e) => setMomoSentToPaystack(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                            />
                            <span className="text-xs text-slate-600">Charge sent to Paystack</span>
                          </label>
                          {momoSentToPaystack && (
                            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                              <p className="text-xs text-amber-800">Awaiting customer confirmation. You can serve the next customer.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bank Transfer fields */}
                      {paymentMethod === "bank_transfer" && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Bank Name</label>
                            <input
                              type="text"
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              placeholder="e.g. GCB, Ecobank…"
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Reference *</label>
                            <input
                              type="text"
                              value={bankReference}
                              onChange={(e) => setBankReference(e.target.value)}
                              placeholder="GCB-TRF-567890"
                              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                            />
                          </div>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={bankSentToPaystack}
                              onChange={(e) => setBankSentToPaystack(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                            />
                            <span className="text-xs text-slate-600">Charge sent to Paystack</span>
                          </label>
                          {bankSentToPaystack && (
                            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                              <p className="text-xs text-amber-800">Awaiting bank confirmation. You can serve the next customer.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* ── Split Payment Mode ───────────────────────────────── */
                    <>
                      <div className="mb-3 space-y-2">
                        {splits.map((payment, idx) => (
                          <div key={payment.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-700">Payment {idx + 1}</span>
                              {splits.length > 1 && (
                                <button
                                  onClick={() => removeSplit(payment.id)}
                                  className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Method</label>
                                <select
                                  value={payment.method}
                                  onChange={(e) => updateSplit(payment.id, "method", e.target.value)}
                                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs focus:border-slate-400 focus:outline-none"
                                >
                                  <option value="cash">Cash</option>
                                  <option value="momo">Mobile Money</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Amount (GH₵)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={payment.amount}
                                  onChange={(e) => updateSplit(payment.id, "amount", e.target.value)}
                                  placeholder="0.00"
                                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs focus:border-slate-400 focus:outline-none"
                                />
                              </div>
                            </div>

                            {payment.method === "momo" && payment.amount && (
                              <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                                <div className="grid grid-cols-3 gap-1">
                                  {(["mtn", "telecel", "airteltigo"] as MoMoNetwork[]).map((net) => (
                                    <button
                                      key={net}
                                      onClick={() => updateSplit(payment.id, "network", net)}
                                      className={cn(
                                        "rounded border py-1.5 text-xs font-medium transition-all",
                                        payment.network === net ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 hover:border-slate-300"
                                      )}
                                    >
                                      {net === "mtn" ? "MTN" : net === "telecel" ? "Telecel" : "AirtelTigo"}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  type="tel"
                                  value={payment.phone || ""}
                                  onChange={(e) => updateSplit(payment.id, "phone", e.target.value)}
                                  placeholder="+233244123456"
                                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs focus:border-slate-400 focus:outline-none"
                                />
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={payment.sentToPaystack || false}
                                    onChange={(e) => updateSplit(payment.id, "sentToPaystack", e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                                  />
                                  <span className="text-xs text-slate-600">Sent to Paystack</span>
                                </label>
                                {payment.sentToPaystack && (
                                  <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                                    <Clock className="h-3 w-3 flex-shrink-0 text-amber-600" />
                                    <span className="text-xs text-amber-800">Awaiting confirmation.</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {payment.method === "bank_transfer" && payment.amount && (
                              <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                                <input
                                  value={payment.bankName || ""}
                                  onChange={(e) => updateSplit(payment.id, "bankName", e.target.value)}
                                  placeholder="Bank name"
                                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs focus:border-slate-400 focus:outline-none"
                                />
                                <input
                                  value={payment.reference || ""}
                                  onChange={(e) => updateSplit(payment.id, "reference", e.target.value)}
                                  placeholder="Reference *"
                                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs focus:border-slate-400 focus:outline-none"
                                />
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={payment.sentToPaystack || false}
                                    onChange={(e) => updateSplit(payment.id, "sentToPaystack", e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                                  />
                                  <span className="text-xs text-slate-600">Sent to Paystack</span>
                                </label>
                                {payment.sentToPaystack && (
                                  <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-2 py-1.5">
                                    <Clock className="h-3 w-3 flex-shrink-0 text-amber-600" />
                                    <span className="text-xs text-amber-800">Awaiting confirmation.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={addSplit}
                        className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add another payment method
                      </button>

                      {/* Tally bar */}
                      <div
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium",
                          items.length === 0
                            ? "border-slate-200 bg-slate-50 text-slate-500"
                            : isAllocatedOk
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-red-200 bg-red-50 text-red-700"
                        )}
                      >
                        <span>Allocated</span>
                        <span>{formatCurrency(allocatedAmount)} / {formatCurrency(total)}</span>
                      </div>
                    </>
                  )}
                  <div className="h-2" />
                </section>
              </div>

              {/* ── Sticky Footer ─────────────────────────────────────────── */}
              <div className="flex-shrink-0 border-t border-slate-200 bg-white">
                {createOrder.isError && (
                  <p className="border-b border-red-100 bg-red-50 px-4 py-2 text-center text-xs text-red-600">
                    {(createOrder.error as { message?: string })?.message || "Failed to create order. Please try again."}
                  </p>
                )}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setShowHold(true)}
                    disabled={items.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Hold
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-slate-500">Total </span>
                    <span className="text-base font-bold text-slate-900">{formatCurrency(total)}</span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={items.length === 0 || createOrder.isPending || (isSplit && !isAllocatedOk)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {createOrder.isPending
                      ? "Saving…"
                      : hasAwaitingConfirmation
                        ? "Save & Queue Confirmation"
                        : "Complete Order"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hold Sub-Modal ────────────────────────────────────────────────── */}
      {showHold && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={(e) => e.target === e.currentTarget && setShowHold(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Put Order on Hold</h3>
              <button
                onClick={() => setShowHold(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500">
              Items will be reserved. The order moves to the &quot;On Hold&quot; tab.
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-slate-600">Hold Duration</label>
              <div className="flex gap-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {HOLD_DURATIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setHoldDuration(opt.value)}
                    className={cn(
                      "flex-1 rounded-md py-2 text-xs font-medium transition-all",
                      holdDuration === opt.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="mb-2 block text-xs font-medium text-slate-600">Note (Optional)</label>
              <textarea
                value={holdNote}
                onChange={(e) => setHoldNote(e.target.value)}
                rows={3}
                placeholder="e.g. Customer went to ATM…"
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHold(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleHoldConfirm}
                disabled={items.length === 0 || createOrder.isPending}
                className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {createOrder.isPending ? "Saving…" : "Confirm Hold"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
              className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 ${event.id === selectedId
                ? "font-medium text-slate-900"
                : "text-slate-700"
                }`}
            >
              <span>{event.name}</span>
              <span
                className={`text-xs ${event.status === "active"
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
  onChargeMomo,
}: {
  orders: PopupOrder[];
  isLoading: boolean;
  onUpdate: (id: string, status: PopupOrderStatus, paymentMethod?: PopupPaymentMethod) => void;
  onChargeMomo: (order: PopupOrder) => void;
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
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]
                      }`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">
                  {timeAgo(order.created_at)}
                </td>
                <td className="px-5 py-4">
                  <OrderActionsMenu order={order} onUpdate={onUpdate} onChargeMomo={onChargeMomo} />
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
  const [momoChargeOrder, setMomoChargeOrder] = useState<PopupOrder | null>(null);

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
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
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
                onChargeMomo={setMomoChargeOrder}
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
      {momoChargeOrder && (
        <MoMoChargeModal
          order={momoChargeOrder}
          onClose={() => setMomoChargeOrder(null)}
        />
      )}
    </>
  );
}
