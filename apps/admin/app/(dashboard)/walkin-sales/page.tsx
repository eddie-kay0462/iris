"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Search,
  UserPlus,
  X,
  Minus,
  Trash2,
  DoorOpen,
  Wallet,
  ShoppingBag,
  AlertCircle,
  Package,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import PhoneInput from "@/app/components/PhoneInput";
import { DataTable, type Column } from "@/app/components/DataTable";
import { StatsCard } from "@/app/components/StatsCard";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SearchInput } from "@/app/components/SearchInput";
import { Pagination } from "@/app/components/Pagination";
import {
  useWalkinOrders,
  useWalkinStats,
  useCreateWalkinOrder,
  useCreateWalkinPreorder,
  useRefundWalkinOrder,
  useCreateWalkinCustomer,
  useChargeWalkinOrder,
  useSubmitWalkinOtp,
  useVerifyWalkinPayment,
  searchWalkinCustomers,
  type WalkinOrder,
  type WalkinOrderStatus,
  type WalkinPaymentMethod,
  type WalkinCustomer,
} from "@/lib/api/walkin-sales";

const GHS = (n: number) =>
  `GH₵${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function toLocalPhone(p: string): string {
  if (p.startsWith("+233")) return "0" + p.slice(4);
  if (p.startsWith("233")) return "0" + p.slice(3);
  return p;
}

function detectProvider(p: string): "mtn" | "vod" | "tgo" {
  let n = p.trim().replace(/\s+/g, "");
  if (n.startsWith("+233")) n = "0" + n.slice(4);
  else if (n.startsWith("233")) n = "0" + n.slice(3);
  else if (!n.startsWith("0")) n = "0" + n;
  const prefix = n.slice(0, 3);
  if (["024", "025", "053", "054", "055", "059"].includes(prefix)) return "mtn";
  if (["020", "050"].includes(prefix)) return "vod";
  if (["026", "027", "056", "057"].includes(prefix)) return "tgo";
  return "mtn";
}

const STATUS_FILTERS: { label: string; value: WalkinOrderStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Completed", value: "completed" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WalkinSalesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WalkinOrderStatus | "">("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<WalkinOrder | null>(null);

  const { data: stats } = useWalkinStats();
  const { data, isLoading } = useWalkinOrders({
    search: search || undefined,
    status: status || undefined,
    page,
  });

  const columns: Column<WalkinOrder>[] = [
    { key: "order_number", header: "Order #", render: (o) => <span className="font-medium">{o.order_number}</span> },
    {
      key: "customer",
      header: "Customer",
      render: (o) => (
        <div>
          <div>{o.customer_name || "Walk-in customer"}</div>
          <div className="text-xs text-slate-500">{o.customer_phone || o.customer_email || "—"}</div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (o) =>
        `${(o.walkin_order_items || []).reduce((s, i) => s + i.quantity, 0)} item(s)`,
    },
    { key: "payment", header: "Payment", render: (o) => <span className="capitalize">{o.payment_method || "—"}</span> },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
    { key: "total", header: "Total", render: (o) => GHS(o.total) },
    {
      key: "date",
      header: "Date",
      render: (o) => new Date(o.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DoorOpen className="h-6 w-6 text-slate-700" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Walk-in Sales</h1>
            <p className="text-sm text-slate-500">Record in-person purchases and pre-orders made at HQ.</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> New Walk-in Sale
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard label="Today's Revenue" value={GHS(stats?.today_revenue ?? 0)} icon={Wallet} color="text-green-700" />
        <StatsCard label="Orders Today" value={stats?.orders_today ?? 0} icon={ShoppingBag} />
        <StatsCard label="Total Revenue" value={GHS(stats?.total_revenue ?? 0)} icon={Wallet} />
        <StatsCard label="Orders Completed" value={stats?.orders_completed ?? 0} icon={Package} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search order # or customer..." />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm ${status === f.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        loading={isLoading}
        emptyMessage="No walk-in sales yet."
        onRowClick={(o) => setDetailOrder(o)}
      />

      <Pagination page={page} totalPages={data?.totalPages ?? 1} onPageChange={setPage} />

      {showModal && <NewWalkinModal onClose={() => setShowModal(false)} />}
      {detailOrder && <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
    </div>
  );
}

// ─── New Walk-in Sale Modal ────────────────────────────────────────────────────

interface ProductSearchResult {
  id: string;
  title: string;
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

interface CartItem {
  _localId: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  inventory_quantity: number;
}

function variantLabel(v: ProductSearchResult["product_variants"][0]): string {
  return (
    [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(" / ") ||
    v.title ||
    "Default"
  );
}

function NewWalkinModal({ onClose }: { onClose: () => void }) {
  const createOrder = useCreateWalkinOrder();
  const createPreorder = useCreateWalkinPreorder();
  const createCustomer = useCreateWalkinCustomer();

  const [isPreorderMode, setIsPreorderMode] = useState(false);

  // Products
  const [productSearch, setProductSearch] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cart
  const [items, setItems] = useState<CartItem[]>([]);

  // Customer
  const [customer, setCustomer] = useState<WalkinCustomer | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState<WalkinCustomer[]>([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: "", last_name: "", phone_number: "", email: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const custTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Discount + payment
  const [discountType, setDiscountType] = useState<"none" | "percentage" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<WalkinPaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  // MoMo charge target (opens the Paystack charge modal once the order exists)
  const [chargeOrder, setChargeOrder] = useState<WalkinOrder | null>(null);

  // ── Product search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productSearch.trim()) { setResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient<{ data: ProductSearchResult[] }>(
          `/products/admin/list?search=${encodeURIComponent(productSearch)}&limit=12`
        );
        setResults(res.data || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [productSearch]);

  // ── Customer search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!custSearch.trim()) { setCustResults([]); return; }
    clearTimeout(custTimeout.current);
    custTimeout.current = setTimeout(async () => {
      try {
        setCustResults(await searchWalkinCustomers(custSearch));
      } catch { setCustResults([]); }
    }, 250);
    return () => clearTimeout(custTimeout.current);
  }, [custSearch]);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  function addVariant(p: ProductSearchResult, v: ProductSearchResult["product_variants"][0]) {
    const stock = v.inventory_quantity ?? 0;
    if (!isPreorderMode && stock <= 0) {
      toast.error("Out of stock — switch to pre-order mode to accept this item.");
      return;
    }
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.variant_id === v.id);
      if (idx >= 0) {
        return prev.map((it, i) => {
          if (i !== idx) return it;
          const max = isPreorderMode ? Infinity : stock;
          return { ...it, quantity: Math.min(max, it.quantity + 1) };
        });
      }
      return [
        ...prev,
        {
          _localId: `${v.id}-${Date.now()}`,
          product_id: p.id,
          variant_id: v.id,
          product_name: p.title,
          variant_title: variantLabel(v),
          sku: v.sku || undefined,
          quantity: 1,
          unit_price: v.price,
          inventory_quantity: stock,
        },
      ];
    });
  }

  function updateQty(localId: string, delta: number) {
    setItems((prev) =>
      prev.map((i) => {
        if (i._localId !== localId) return i;
        const max = isPreorderMode ? Infinity : i.inventory_quantity || Infinity;
        return { ...i, quantity: Math.min(max, Math.max(1, i.quantity + delta)) };
      })
    );
  }

  const removeItem = (localId: string) => setItems((prev) => prev.filter((i) => i._localId !== localId));

  // ── Computed ───────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discountNum = parseFloat(discountValue) || 0;
  const discountAmount =
    discountType === "percentage" ? (subtotal * discountNum) / 100
    : discountType === "fixed" ? discountNum
    : 0;
  const total = Math.max(0, subtotal - discountAmount);

  // ── Customer actions ─────────────────────────────────────────────────────────
  function pickCustomer(c: WalkinCustomer) {
    setCustomer(c);
    setCustSearch("");
    setCustResults([]);
    setShowNewCustomer(false);
  }

  async function saveNewCustomer() {
    if (!newCustomer.first_name && !newCustomer.email && !newCustomer.phone_number) {
      toast.error("Enter a name, phone, or email for the customer.");
      return;
    }
    setSavingCustomer(true);
    try {
      const c = await createCustomer.mutateAsync(newCustomer);
      setCustomer(c);
      setShowNewCustomer(false);
      setNewCustomer({ first_name: "", last_name: "", phone_number: "", email: "" });
      toast.success(c.invited_at ? "Customer saved & invited to storefront." : "Customer saved.");
    } catch (e: any) {
      toast.error(e.message || "Failed to save customer.");
    } finally {
      setSavingCustomer(false);
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (items.length === 0) { toast.error("Add at least one product."); return; }

    if (isPreorderMode) {
      if (!customer?.phone_number && !newCustomer.phone_number) {
        toast.error("A phone number is required for pre-orders.");
        return;
      }
      try {
        await createPreorder.mutateAsync({
          items: items.map((i) => ({
            variantId: i.variant_id,
            productTitle: i.product_name,
            variantTitle: i.variant_title,
            quantity: i.quantity,
            price: i.unit_price,
          })),
          customer_name: customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || undefined : undefined,
          customer_email: customer?.email || undefined,
          customer_phone: (customer?.phone_number || newCustomer.phone_number)!,
          payment_method: paymentMethod,
          payment_reference: paymentReference || undefined,
          notes: notes || undefined,
        });
        toast.success("Pre-order recorded. Customer notified.");
        onClose();
      } catch (e: any) {
        toast.error(e.message || "Failed to record pre-order.");
      }
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        customer_name: customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || undefined : undefined,
        customer_phone: customer?.phone_number || undefined,
        customer_email: customer?.email || undefined,
        customer_profile_id: customer?.id,
        payment_method: paymentMethod,
        payment_reference: paymentMethod !== "momo" ? paymentReference || undefined : undefined,
        discount_type: discountType,
        discount_amount: Math.round(discountAmount * 100) / 100,
        discount_reason: discountReason || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          product_name: i.product_name,
          variant_title: i.variant_title,
          sku: i.sku,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });

      // MoMo: the order is created unpaid — open the Paystack charge modal to
      // send the USSD prompt and confirm before it completes.
      if (paymentMethod === "momo") {
        setChargeOrder(order);
        return;
      }

      toast.success("Walk-in sale recorded.");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to record sale.");
    }
  }

  const submitting = createOrder.isPending || createPreorder.isPending;

  return (
    <>
    {chargeOrder && (
      <WalkinMoMoChargeModal
        order={chargeOrder}
        onDone={() => { setChargeOrder(null); toast.success("MoMo payment confirmed."); onClose(); }}
        onCancel={() => { setChargeOrder(null); onClose(); }}
      />
    )}
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">New Walk-in Sale</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={isPreorderMode} onChange={(e) => setIsPreorderMode(e.target.checked)} />
              Pre-order (out of stock)
            </label>
            <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-5">
          {/* Left: products */}
          <div className="col-span-3 overflow-y-auto border-r border-slate-200 p-5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <div className="mt-3 space-y-2">
              {searching && <p className="text-sm text-slate-400">Searching...</p>}
              {!searching && productSearch && results.length === 0 && (
                <p className="text-sm text-slate-400">No products found.</p>
              )}
              {results.map((p) => (
                <div key={p.id} className="rounded-md border border-slate-200 p-3">
                  <div className="mb-2 font-medium text-slate-800">{p.title}</div>
                  <div className="flex flex-wrap gap-2">
                    {p.product_variants.map((v) => {
                      const stock = v.inventory_quantity ?? 0;
                      const out = stock <= 0;
                      return (
                        <button
                          key={v.id}
                          onClick={() => addVariant(p, v)}
                          disabled={out && !isPreorderMode}
                          className={`rounded-md border px-2.5 py-1.5 text-left text-xs ${
                            out && !isPreorderMode
                              ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                              : "border-slate-300 hover:border-slate-900 hover:bg-slate-50"
                          }`}
                        >
                          <div className="font-medium">{variantLabel(v)}</div>
                          <div className="text-slate-500">{GHS(v.price)}</div>
                          <div className={out ? "text-red-500" : "text-slate-400"}>
                            {out ? "Out of stock" : `${stock} in stock`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: cart + customer + payment */}
          <div className="col-span-2 flex flex-col overflow-y-auto p-5">
            {/* Customer capture */}
            <section className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Customer</h3>
              {customer ? (
                <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-sm">
                    <div className="font-medium">{[customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer"}</div>
                    <div className="text-xs text-slate-500">{customer.phone_number || customer.email || "—"}</div>
                  </div>
                  <button onClick={() => setCustomer(null)} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
                </div>
              ) : showNewCustomer ? (
                <div className="space-y-2 rounded-md border border-slate-200 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input value={newCustomer.first_name} onChange={(e) => setNewCustomer((n) => ({ ...n, first_name: e.target.value }))} placeholder="First name" className="rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900" />
                    <input value={newCustomer.last_name} onChange={(e) => setNewCustomer((n) => ({ ...n, last_name: e.target.value }))} placeholder="Last name" className="rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900" />
                  </div>
                  <PhoneInput value={newCustomer.phone_number} onChange={(v) => setNewCustomer((n) => ({ ...n, phone_number: v }))} />
                  <input value={newCustomer.email} onChange={(e) => setNewCustomer((n) => ({ ...n, email: e.target.value }))} type="email" placeholder="Email (sends storefront invite)" className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900" />
                  <div className="flex gap-2">
                    <button onClick={saveNewCustomer} disabled={savingCustomer} className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                      {savingCustomer ? "Saving..." : "Save customer"}
                    </button>
                    <button onClick={() => setShowNewCustomer(false)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input value={custSearch} onChange={(e) => setCustSearch(e.target.value)} placeholder="Search customers..." className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-900" />
                  </div>
                  {custResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                      {custResults.map((c) => (
                        <button key={c.id} onClick={() => pickCustomer(c)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                          <div className="font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "Customer"}</div>
                          <div className="text-xs text-slate-500">{c.phone_number || c.email || "—"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setShowNewCustomer(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
                    <UserPlus className="h-4 w-4" /> Add new customer
                  </button>
                </div>
              )}
            </section>

            {/* Cart */}
            <section className="mb-4 flex-1">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Items</h3>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                  <ShoppingBag className="mb-2 h-6 w-6" />
                  No items yet
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((i) => (
                    <div key={i._localId} className="flex items-center gap-2 rounded-md border border-slate-200 p-2">
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{i.product_name}</div>
                        <div className="text-xs text-slate-500">{i.variant_title} · {GHS(i.unit_price)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(i._localId, -1)} className="rounded border border-slate-300 p-1 hover:bg-slate-50"><Minus className="h-3 w-3" /></button>
                        <span className="w-6 text-center text-sm">{i.quantity}</span>
                        <button onClick={() => updateQty(i._localId, 1)} className="rounded border border-slate-300 p-1 hover:bg-slate-50"><Plus className="h-3 w-3" /></button>
                      </div>
                      <button onClick={() => removeItem(i._localId)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {!isPreorderMode && (
              <section className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Discount</h3>
                <div className="flex gap-2">
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900">
                    <option value="none">None</option>
                    <option value="percentage">%</option>
                    <option value="fixed">GH₵</option>
                  </select>
                  {discountType !== "none" && (
                    <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} type="number" placeholder="0" className="w-24 rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900" />
                  )}
                  {discountType !== "none" && (
                    <input value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Reason" className="flex-1 rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900" />
                  )}
                </div>
              </section>
            )}

            {/* Payment */}
            <section className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Payment</h3>
              <div className="mb-2 flex gap-1">
                {(["cash", "momo", "bank_transfer"] as WalkinPaymentMethod[]).map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`flex-1 rounded-md px-2 py-1.5 text-sm capitalize ${paymentMethod === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {m === "bank_transfer" ? "Bank" : m}
                  </button>
                ))}
              </div>
              {paymentMethod === "bank_transfer" && (
                <input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Reference (optional)" className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-900" />
              )}
              {paymentMethod === "momo" && !isPreorderMode && (
                <p className="text-xs text-slate-500">You&apos;ll send a USSD prompt to the customer&apos;s phone in the next step.</p>
              )}
            </section>

            {/* Totals + submit */}
            <div className="mt-auto border-t border-slate-200 pt-3">
              <div className="mb-1 flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{GHS(subtotal)}</span></div>
              {discountAmount > 0 && (
                <div className="mb-1 flex justify-between text-sm text-green-600"><span>Discount</span><span>-{GHS(discountAmount)}</span></div>
              )}
              <div className="mb-3 flex justify-between text-base font-semibold text-slate-900"><span>Total</span><span>{GHS(total)}</span></div>
              {isPreorderMode && (
                <p className="mb-2 flex items-center gap-1.5 text-xs text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> Pre-order: item held, customer notified by email &amp; SMS.</p>
              )}
              <button onClick={handleSubmit} disabled={submitting || items.length === 0} className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                {submitting
                  ? "Recording..."
                  : isPreorderMode
                    ? "Record Pre-order"
                    : paymentMethod === "momo"
                      ? `Charge MoMo · ${GHS(total)}`
                      : `Complete Sale · ${GHS(total)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Walk-in MoMo Charge Modal (Paystack) ──────────────────────────────────────

function WalkinMoMoChargeModal({
  order,
  onDone,
  onCancel,
}: {
  order: WalkinOrder;
  onDone: () => void;
  onCancel: () => void;
}) {
  const charge = useChargeWalkinOrder();
  const submitOtp = useSubmitWalkinOtp();
  const verify = useVerifyWalkinPayment();
  const [phone, setPhone] = useState(order.customer_phone ? toLocalPhone(order.customer_phone) : "");
  const [provider, setProvider] = useState<"mtn" | "vod" | "tgo">(
    order.customer_phone ? detectProvider(order.customer_phone) : "mtn"
  );
  const [step, setStep] = useState<"charge" | "otp" | "waiting" | "confirmed">("charge");
  const [otp, setOtp] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      } catch { /* keep polling */ }
    }, 5000);
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function handleCharge(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await charge.mutateAsync({ id: order.id, dto: { phone, provider } });
      if (result.paystack_status === "send_otp") setStep("otp");
      else { setStep("waiting"); startPolling(order.id); }
    } catch (err: any) {
      toast.error(err.message || "Charge failed.");
    }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    try {
      await submitOtp.mutateAsync({ id: order.id, otp });
      setStep("waiting");
      startPolling(order.id);
    } catch (err: any) {
      toast.error(err.message || "OTP submission failed.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Charge via MoMo</h2>
          {step !== "waiting" && (
            <button onClick={step === "confirmed" ? onDone : onCancel} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          )}
        </div>
        <div className="p-6">
          {step === "confirmed" ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
                <p className="text-base font-medium">✅ Payment confirmed!</p>
                <p className="mt-1">Order {order.order_number} is paid. Stock updated and the customer notified.</p>
              </div>
              <button onClick={onDone} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800">Done</button>
            </div>
          ) : step === "waiting" ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-lg bg-amber-50 p-6 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-300 border-t-amber-600" />
                <p className="text-sm font-medium text-amber-800">Waiting for customer to confirm...</p>
                <p className="text-xs text-amber-700">The customer should approve the USSD prompt or enter their PIN.</p>
                <p className="text-xs text-amber-600">{order.order_number} · {GHS(Number(order.total))}</p>
              </div>
              <button onClick={onCancel} className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Close (confirm later)</button>
            </div>
          ) : step === "otp" ? (
            <form onSubmit={handleOtp} className="space-y-4">
              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
                <p className="font-medium">OTP sent to customer</p>
                <p className="mt-1">Ask the customer for the OTP they received and enter it below.</p>
              </div>
              <input type="text" required autoFocus value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="e.g. 123456" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
              <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={!otp.trim() || submitOtp.isPending} className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                  {submitOtp.isPending ? "Submitting…" : "Submit OTP"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCharge} className="space-y-4">
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-medium">Order:</span> {order.order_number} · <span className="font-medium">Total:</span> {GHS(Number(order.total))}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">MoMo Phone Number *</label>
                <input type="tel" required value={phone} onChange={(e) => { setPhone(e.target.value); if (e.target.value.length >= 3) setProvider(detectProvider(e.target.value)); }} placeholder="e.g. 0244000000" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Network Provider *</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value as "mtn" | "vod" | "tgo")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none">
                  <option value="mtn">MTN MoMo</option>
                  <option value="vod">Telecel Cash</option>
                  <option value="tgo">AirtelTigo Money</option>
                </select>
              </div>
              <button type="submit" disabled={!phone.trim() || charge.isPending} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
                {charge.isPending ? "Sending…" : "Send USSD Prompt"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Modal ────────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose }: { order: WalkinOrder; onClose: () => void }) {
  const refund = useRefundWalkinOrder();

  async function handleRefund() {
    if (!confirm(`Refund ${order.order_number} in full and restore stock?`)) return;
    try {
      await refund.mutateAsync({ id: order.id, dto: {} });
      toast.success("Order refunded and stock restored.");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to refund.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{order.order_number}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Customer</span><span>{order.customer_name || "Walk-in"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Contact</span><span>{order.customer_phone || order.customer_email || "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Payment</span><span className="capitalize">{order.payment_method || "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={order.status} /></div>
        </div>
        <div className="mb-3 rounded-md border border-slate-200">
          {(order.walkin_order_items || []).map((i) => (
            <div key={i.id} className="flex justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-0">
              <span>{i.product_name} <span className="text-slate-400">×{i.quantity}</span></span>
              <span>{GHS(i.total_price)}</span>
            </div>
          ))}
        </div>
        <div className="mb-4 flex justify-between text-base font-semibold"><span>Total</span><span>{GHS(order.total)}</span></div>
        {order.status === "completed" && (
          <button onClick={handleRefund} disabled={refund.isPending} className="w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            {refund.isPending ? "Processing..." : "Refund & Restore Stock"}
          </button>
        )}
      </div>
    </div>
  );
}
