'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Activity, ShoppingBag, MessageSquare, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchActivityFeed, type AdminLogEntry, type SaleEntry, type CommEntry } from './actions'

type Tab = 'all' | 'admin' | 'sales' | 'comms'

type Entry =
  | { kind: 'admin'; time: string; data: AdminLogEntry }
  | { kind: 'sale'; time: string; data: SaleEntry }
  | { kind: 'comm'; time: string; data: CommEntry }

function fmt(n: number) {
  return `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function actionColor(action: string) {
  switch (action) {
    case 'invited': return 'bg-blue-100 text-blue-700'
    case 'updated': return 'bg-amber-100 text-amber-700'
    case 'deleted': return 'bg-red-100 text-red-700'
    case 'created': return 'bg-green-100 text-green-700'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'completed': case 'sent': case 'delivered': return 'bg-green-100 text-green-700'
    case 'failed': return 'bg-red-100 text-red-700'
    case 'pending': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-slate-100 text-slate-600'
  }
}

function ChangesDetail({ changes }: { changes: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false)
  if (!changes || Object.keys(changes).length === 0) return null
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400 hover:text-slate-600"
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? 'Hide' : 'Show'} details
      </button>
      {open && (
        <pre className="mt-1.5 rounded bg-slate-50 border border-slate-100 p-2 text-[10px] text-slate-600 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(changes, null, 2)}
        </pre>
      )}
    </div>
  )
}

function AdminLogRow({ entry }: { entry: AdminLogEntry }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
        <Shield className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${actionColor(entry.action)}`}>
            {entry.action}
          </span>
          <span className="text-sm font-medium text-slate-800 capitalize">
            {entry.entity_type.replace(/_/g, ' ')}
          </span>
          {entry.entity_id && (
            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
              {entry.entity_id.slice(0, 8)}…
            </span>
          )}
        </div>
        <ChangesDetail changes={entry.changes} />
        <p className="text-[10px] text-slate-400 mt-1">{fmtDate(entry.created_at)} · {timeAgo(entry.created_at)}</p>
      </div>
    </div>
  )
}

function SaleRow({ entry }: { entry: SaleEntry }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
        <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${statusColor(entry.status)}`}>
            {entry.status}
          </span>
          <span className="text-sm font-medium text-slate-800">
            {entry.ally_name ?? 'Unknown Ally'}
          </span>
          <span className="text-xs text-slate-500">recorded a sale</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Order <span className="font-medium text-slate-700">{entry.order_number}</span></span>
          <span>Customer <span className="font-medium text-slate-700">{entry.customer_name || 'Walk-in'}</span></span>
          <span>Total <span className="font-semibold text-slate-800">{fmt(entry.total)}</span></span>
          <span>Commission <span className="font-semibold text-emerald-700">{fmt(entry.commission_amount)}</span></span>
          <span className="capitalize">{entry.payment_method.replace('_', ' ')}</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{fmtDate(entry.sale_date)} · {timeAgo(entry.sale_date)}</p>
      </div>
    </div>
  )
}

function CommRow({ entry }: { entry: CommEntry }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0">
        <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${statusColor(entry.status)}`}>
            {entry.status}
          </span>
          <span className="text-sm font-medium text-slate-800 uppercase tracking-wide text-xs">
            {entry.type === 'voice_otp' ? 'Voice OTP' : 'SMS'}
          </span>
          <span className="text-xs text-slate-500">→ {entry.recipient_phone}</span>
        </div>
        {entry.message && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-1">{entry.message}</p>
        )}
        <p className="text-[10px] text-slate-400 mt-1">{fmtDate(entry.created_at)} · {timeAgo(entry.created_at)}</p>
      </div>
    </div>
  )
}

export default function ActivityPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    const { adminLogs, sales, comms } = await fetchActivityFeed()

    const merged: Entry[] = [
      ...adminLogs.map((d): Entry => ({ kind: 'admin', time: d.created_at, data: d })),
      ...sales.map((d): Entry => ({ kind: 'sale', time: d.sale_date, data: d })),
      ...comms.map((d): Entry => ({ kind: 'comm', time: d.created_at, data: d })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    setEntries(merged)
    setLoading(false)
    setRefreshing(false)
    setLastRefreshed(new Date())
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => load(), 30_000)
    return () => clearInterval(id)
  }, [load])

  const filtered = entries.filter((e) => {
    if (tab === 'all') return true
    if (tab === 'admin') return e.kind === 'admin'
    if (tab === 'sales') return e.kind === 'sale'
    if (tab === 'comms') return e.kind === 'comm'
    return true
  })

  const counts = {
    admin: entries.filter(e => e.kind === 'admin').length,
    sales: entries.filter(e => e.kind === 'sale').length,
    comms: entries.filter(e => e.kind === 'comm').length,
  }

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Activity', count: entries.length, icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'admin', label: 'Admin Actions', count: counts.admin, icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'sales', label: 'Sales', count: counts.sales, icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: 'comms', label: 'Communications', count: counts.comms, icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <section className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Activity Monitor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Unified feed of admin actions, ally sales, and communications.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {lastRefreshed && (
            <span className="text-[10px] text-slate-400">
              Updated {timeAgo(lastRefreshed.toISOString())}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.icon}
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading activity…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No activity yet</div>
        ) : (
          filtered.map((entry) => (
            <div key={`${entry.kind}-${entry.data.id}`} className="px-5 py-4">
              {entry.kind === 'admin' && <AdminLogRow entry={entry.data} />}
              {entry.kind === 'sale' && <SaleRow entry={entry.data} />}
              {entry.kind === 'comm' && <CommRow entry={entry.data} />}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
