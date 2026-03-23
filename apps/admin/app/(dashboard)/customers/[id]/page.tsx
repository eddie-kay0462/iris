"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, MapPin, Tag, ShoppingBag, Store } from "lucide-react";
import { useAdminCustomer, type Order, type Address, type PopupOrderSummary } from "@/lib/api/orders";
import { StatusBadge } from "../../../components/StatusBadge";

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-600">
      {initials}
    </div>
  );
}

function MiniSparkline({ orders }: { orders: Order[] }) {
  const monthlySpend = useMemo(() => {
    const now = new Date();
    const months: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const total = orders
        .filter((o) => {
          if (["cancelled", "refunded"].includes(o.status)) return false;
          const d = new Date(o.created_at);
          return d >= start && d <= end;
        })
        .reduce((sum, o) => sum + Number(o.total), 0);
      months.push(total);
    }
    return months;
  }, [orders]);

  const maxVal = Math.max(...monthlySpend, 1);

  return (
    <div className="flex items-end gap-1 h-8">
      {monthlySpend.map((val, i) => (
        <div
          key={i}
          className="w-3 rounded-sm bg-blue-400 transition-all"
          style={{ height: `${Math.max((val / maxVal) * 100, val > 0 ? 8 : 2)}%` }}
          title={`GH₵${val.toLocaleString()}`}
        />
      ))}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value || "—"}</div>
    </div>
  );
}

function AddressBlock({ address, title }: { address: Address | null; title: string }) {
  if (!address) return null;

  const name = address.fullName || [address.first_name, address.last_name].filter(Boolean).join(" ");
  const line1 = address.address || address.address1;
  const city = address.city;
  const region = address.region || address.province;
  const postal = address.postalCode || address.zip;
  const country = address.country;
  const phone = address.phone;

  const parts = [line1, address.address2, city, region, postal, country].filter(Boolean);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {name && <p className="text-sm font-medium text-slate-900">{name}</p>}
      {parts.map((p, i) => (
        <p key={i} className="text-sm text-slate-600">{p}</p>
      ))}
      {phone && <p className="text-sm text-slate-500">{phone}</p>}
    </div>
  );
}

function OnlineOrderTimeline({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-slate-500">No online orders yet.</p>;
  }

  return (
    <div className="relative ml-4">
      <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-200" />
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="relative pl-6">
            <div className="absolute left-[-4px] top-3 h-2 w-2 rounded-full bg-slate-400" />
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/orders/${order.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {order.order_number}
                </Link>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                <span>GH₵{Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>{order.order_items?.length || 0} item{(order.order_items?.length || 0) !== 1 ? "s" : ""}</span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
              {order.shipping_address && (
                <p className="mt-1 text-xs text-slate-400">
                  Shipped to: {order.shipping_address.fullName}, {order.shipping_address.city}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PopupOrderList({ orders }: { orders: PopupOrderSummary[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-slate-500">No popup orders found.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">{order.order_number}</span>
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>GH₵{Number(order.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {order.payment_method && <span className="capitalize">{order.payment_method.replace("_", " ")}</span>}
            {order.popup_events?.name && (
              <span className="flex items-center gap-1">
                <Store className="h-3 w-3" /> {order.popup_events.name}
              </span>
            )}
            <span>{new Date(order.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: customer, isLoading, error } = useAdminCustomer(id);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (error || !customer) {
    return (
      <section className="space-y-4">
        <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Customers
        </Link>
        <p className="text-sm text-red-600">Customer not found.</p>
      </section>
    );
  }

  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "—";
  const roleBadgeColor: Record<string, string> = {
    inner_circle: "bg-amber-100 text-amber-800",
    waitlist: "bg-purple-100 text-purple-800",
    public: "bg-slate-100 text-slate-600",
  };

  return (
    <section className="space-y-6">
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Customers
      </Link>

      {/* Header */}
      <header className="flex items-center gap-4">
        <Avatar name={name} />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{name}</h1>
            {customer.role && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadgeColor[customer.role] ?? "bg-slate-100 text-slate-600"}`}>
                {customer.role.replace("_", " ")}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">{customer.email}</p>
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customer.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  <Tag className="h-2.5 w-2.5" /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Quick info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={Mail} label="Email" value={customer.email} />
        <InfoCard icon={Phone} label="Phone" value={customer.phone_number} />
        <InfoCard icon={Calendar} label="Joined" value={new Date(customer.created_at).toLocaleDateString()} />
        <InfoCard
          icon={Calendar}
          label="Last Seen"
          value={customer.last_login_at ? new Date(customer.last_login_at).toLocaleDateString() : null}
        />
      </div>

      {/* Spend summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-slate-500">Lifetime Value (All Channels)</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                GH₵{(customer.total_spent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{customer.order_count} total order{customer.order_count !== 1 ? "s" : ""}</p>
            </div>
            <MiniSparkline orders={customer.orders} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Iris Breakdown</p>
          <div className="flex items-center gap-2 text-sm">
            <ShoppingBag className="h-4 w-4 text-blue-500" />
            <span className="text-slate-600">Online</span>
            <span className="ml-auto font-medium">
              {(customer.iris_order_count ?? 0) - (customer.popup_orders?.length ?? 0)} orders
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Store className="h-4 w-4 text-emerald-500" />
            <span className="text-slate-600">Popup events</span>
            <span className="ml-auto font-medium">{customer.popup_orders?.length ?? 0} orders</span>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Iris spend: GH₵{(customer.iris_total_spent ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {customer.shopify_order_count > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shopify History</p>
            <p className="text-sm text-slate-700">
              {customer.shopify_order_count} order{customer.shopify_order_count !== 1 ? "s" : ""}
            </p>
            <p className="text-sm font-medium text-slate-900">
              GH₵{(customer.shopify_total_spent_amt ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {customer.shopify_customer_id && (
              <p className="text-xs text-slate-400">Shopify ID: {customer.shopify_customer_id}</p>
            )}
            {customer.migrated_from && (
              <p className="text-xs text-slate-400">Migrated from: {customer.migrated_from}</p>
            )}
          </div>
        )}
      </div>

      {/* Address */}
      {(customer.billing_address || customer.default_address) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <AddressBlock address={customer.billing_address} title="Billing / Shipping Address" />
          {customer.default_address && customer.default_address !== customer.billing_address && (
            <AddressBlock address={customer.default_address} title="Default Address" />
          )}
        </div>
      )}

      {/* Notification prefs */}
      <div className="flex gap-3 text-sm text-slate-500">
        <span className={`rounded-full px-2 py-0.5 text-xs ${customer.email_notifications ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
          Email notifications {customer.email_notifications ? "on" : "off"}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${customer.sms_notifications ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
          SMS notifications {customer.sms_notifications ? "on" : "off"}
        </span>
      </div>

      {/* Order history — Online */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4" /> Online Order History
        </h2>
        <OnlineOrderTimeline orders={customer.orders} />
      </div>

      {/* Order history — Popup */}
      {customer.popup_orders && customer.popup_orders.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-2">
            <Store className="h-4 w-4" /> Popup Event Orders
          </h2>
          <PopupOrderList orders={customer.popup_orders} />
        </div>
      )}
    </section>
  );
}
