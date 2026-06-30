'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, LogOut, Pencil, Plus, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/app/components/Avatar'
import { fetchAlly, forceLogoutAlly } from '../actions'
import { EditAllyDrawer } from '../components/EditAllyDrawer'
import { AllyActivityPanel } from '../components/AllyActivityPanel'
import { AllocateStockModal } from '../components/AllocateStockModal'
import {
  useAllyAllocations,
  useAllySales,
  useReturnStock,
  type AllyAllocation,
} from '@/lib/api/allies'

type AllyDetail = {
  id: string
  full_name: string
  email: string
  phone: string | null
  location: string
  location_type: 'campus' | 'city'
  commission_rate: number
  commission_quota: number | null
  is_active: boolean
  joined_at: string
  brand: string
  avatar_url?: string | null
  totalSales: number
  totalOrders: number
  totalEarnings: number
  lastLogin: string | null
}

function money(n: number) {
  return `GH₵ ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default function AllyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [ally, setAlly] = useState<AllyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [allocating, setAllocating] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [salesPage, setSalesPage] = useState(1)

  const allocationsQuery = useAllyAllocations(id)
  const salesQuery = useAllySales(id, salesPage, 7)
  const returnStock = useReturnStock(id)

  async function loadAlly() {
    const { ally: row } = await fetchAlly(id)
    setAlly(row as AllyDetail | null)
    setLoading(false)
  }

  useEffect(() => {
    loadAlly()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleForceLogout() {
    if (!ally) return
    setLoggingOut(true)
    const result = await forceLogoutAlly(id)
    setLoggingOut(false)
    setConfirmLogout(false)
    if (result.success) toast.success(`${ally.full_name} has been logged out`)
    else toast.error(result.error ?? 'Failed to log out ally')
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </section>
    )
  }

  if (!ally) {
    return (
      <section className="space-y-4">
        <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Markets
        </Link>
        <p className="text-sm text-slate-500">Ally not found.</p>
      </section>
    )
  }

  const allocations = allocationsQuery.data ?? []
  const unitsOnHand = allocations.reduce((s, a) => s + a.onHand, 0)

  const stats = [
    { label: 'Total Sales', value: money(ally.totalSales) },
    { label: 'Orders', value: ally.totalOrders.toLocaleString() },
    { label: 'Earnings', value: money(ally.totalEarnings) },
    { label: 'Units on hand', value: unitsOnHand.toLocaleString() },
    { label: 'Last login', value: ally.lastLogin ? new Date(ally.lastLogin).toLocaleDateString() : 'Never' },
  ]

  return (
    <section className="space-y-6">
      <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to Markets
      </Link>

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar url={ally.avatar_url} name={ally.full_name} size={48} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">{ally.full_name}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ally.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                {ally.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{ally.brand}</span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {ally.email} · Joined {new Date(ally.joined_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!confirmLogout ? (
            <button
              onClick={() => setConfirmLogout(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Force logout
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">End their session?</span>
              <button onClick={handleForceLogout} disabled={loggingOut} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
                {loggingOut ? 'Logging out…' : 'Yes, logout'}
              </button>
              <button onClick={() => setConfirmLogout(false)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Cancel</button>
            </div>
          )}
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: allocations + sales */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stock allocations */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Stock Allocations</h2>
              <button onClick={() => setAllocating(true)} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800">
                <Plus className="h-3.5 w-3.5" /> Allocate stock
              </button>
            </div>
            <AllocationsTable
              allocations={allocations}
              loading={allocationsQuery.isLoading}
              onReturn={(variantId, quantity) =>
                returnStock.mutate(
                  { variantId, quantity },
                  {
                    onSuccess: () => toast.success('Stock returned to central inventory'),
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to return stock'),
                  },
                )
              }
              returning={returnStock.isPending}
            />
          </div>

          {/* Sales history */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Sales History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-right">Commission</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {salesQuery.isLoading ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">Loading…</td></tr>
                  ) : (salesQuery.data?.sales.length ?? 0) === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">No sales yet</td></tr>
                  ) : (
                    salesQuery.data!.sales.map((s) => (
                      <tr key={s.id} className="border-b border-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">{s.order_number}</td>
                        <td className="px-5 py-3 text-slate-500">{new Date(s.sale_date).toLocaleDateString()}</td>
                        <td className="px-5 py-3 capitalize text-slate-600">{s.payment_method.replace('_', ' ')}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-900">{money(Number(s.total))}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{money(Number(s.commission_amount))}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">{s.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {salesQuery.data && salesQuery.data.total > salesQuery.data.limit && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                <span>
                  Page {salesQuery.data.page} of {Math.ceil(salesQuery.data.total / salesQuery.data.limit)} ·{' '}
                  {salesQuery.data.total} sales
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={salesPage <= 1}
                    onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium transition hover:border-slate-300 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={salesPage >= Math.ceil(salesQuery.data.total / salesQuery.data.limit)}
                    onClick={() => setSalesPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium transition hover:border-slate-300 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: metadata + commission */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Email" value={ally.email} />
              <Row label="Phone" value={ally.phone ?? '—'} />
              <Row label="Location" value={`${ally.location} (${ally.location_type})`} />
              <Row label="Brand" value={ally.brand} />
              <Row label="Commission rate" value={`${(ally.commission_rate * 100).toFixed(1)}%`} />
              <Row label="Commission quota" value={ally.commission_quota === null ? 'Global default' : money(ally.commission_quota)} />
            </dl>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-600">Activity</h2>
        <AllyActivityPanel allyId={id} />
      </div>

      {editing && <EditAllyDrawer ally={ally} onClose={() => setEditing(false)} onSuccess={loadAlly} />}
      {allocating && <AllocateStockModal allyId={id} allyName={ally.full_name} onClose={() => setAllocating(false)} />}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-700">{value}</dd>
    </div>
  )
}

function AllocationsTable({
  allocations,
  loading,
  onReturn,
  returning,
}: {
  allocations: AllyAllocation[]
  loading: boolean
  onReturn: (variantId: string, quantity: number) => void
  returning: boolean
}) {
  const [returningId, setReturningId] = useState<string | null>(null)
  const [qty, setQty] = useState(1)

  if (loading) {
    return <p className="px-5 py-8 text-center text-sm text-slate-400">Loading allocations…</p>
  }
  if (allocations.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-slate-400">No stock allocated yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="px-5 py-3">Product</th>
            <th className="px-5 py-3">SKU</th>
            <th className="px-5 py-3 text-right">Allocated</th>
            <th className="px-5 py-3 text-right">Sold</th>
            <th className="px-5 py-3 text-right">Returned</th>
            <th className="px-5 py-3 text-right">On hand</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {allocations.map((a) => (
            <tr key={a.id} className="border-b border-slate-50">
              <td className="px-5 py-3">
                <p className="font-medium text-slate-900">{a.productTitle ?? '—'}</p>
                {a.variantTitle && <p className="text-xs text-slate-400">{a.variantTitle}</p>}
              </td>
              <td className="px-5 py-3 text-slate-500">{a.sku ?? '—'}</td>
              <td className="px-5 py-3 text-right tabular-nums text-slate-600">{a.quantityAllocated}</td>
              <td className="px-5 py-3 text-right tabular-nums text-slate-600">{a.quantitySold}</td>
              <td className="px-5 py-3 text-right tabular-nums text-slate-600">{a.quantityReturned}</td>
              <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-900">{a.onHand}</td>
              <td className="px-5 py-3 text-right">
                {returningId === a.id ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={a.onHand}
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, Math.min(a.onHand, Number(e.target.value) || 1)))}
                      className="w-16 rounded border border-slate-200 px-2 py-1 text-xs"
                    />
                    <button
                      disabled={returning || a.onHand <= 0}
                      onClick={() => {
                        onReturn(a.variantId, qty)
                        setReturningId(null)
                      }}
                      className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-40"
                    >
                      Confirm
                    </button>
                    <button onClick={() => setReturningId(null)} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">Cancel</button>
                  </div>
                ) : (
                  <button
                    disabled={a.onHand <= 0}
                    onClick={() => {
                      setReturningId(a.id)
                      setQty(1)
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Undo2 className="h-3 w-3" /> Return
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
