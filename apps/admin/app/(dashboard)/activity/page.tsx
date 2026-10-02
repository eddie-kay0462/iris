'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Activity, ShoppingBag, MessageSquare, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import {
  fetchActivityPage,
  type ActivityEntry,
  type ActivityTab,
  type AdminLogEntry,
  type SaleEntry,
  type CommEntry,
} from './actions'
import { Pagination } from '../../components/Pagination'

type Tab = ActivityTab
type Entry = ActivityEntry

const PAGE_SIZE = 25

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

/** Right-hand time column on wider screens; phones show the time inline instead. */
function Timestamp({ iso }: { iso: string }) {
  return (
    <div className="hidden shrink-0 text-right sm:block">
      <p className="text-xs text-slate-500">{timeAgo(iso)}</p>
      <p className="mt-0.5 whitespace-nowrap text-[10px] text-slate-400">{fmtDate(iso)}</p>
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
        <p className="text-[10px] text-slate-400 mt-1 sm:hidden">{fmtDate(entry.created_at)} · {timeAgo(entry.created_at)}</p>
      </div>
      <Timestamp iso={entry.created_at} />
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
        <p className="text-[10px] text-slate-400 mt-1 sm:hidden">{fmtDate(entry.sale_date)} · {timeAgo(entry.sale_date)}</p>
      </div>
      <Timestamp iso={entry.sale_date} />
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
        <p className="text-[10px] text-slate-400 mt-1 sm:hidden">{fmtDate(entry.created_at)} · {timeAgo(entry.created_at)}</p>
      </div>
      <Timestamp iso={entry.created_at} />
    </div>
  )
}

export default function ActivityPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ admin: 0, sales: 0, comms: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const result = await fetchActivityPage({ tab, page, pageSize: PAGE_SIZE })
      setEntries(result.entries)
      setTotal(result.total)
      setCounts(result.counts)
      setLastRefreshed(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tab, page])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => load(), 30_000)
    return () => clearInterval(id)
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // If the feed shrinks (or a tab has fewer pages), don't strand the view past the end.
  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages)
  }, [loading, page, totalPages])

  function changeTab(next: Tab) {
    if (next === tab) return
    setTab(next)
    setPage(1)
    setLoading(true)
  }

  function changePage(next: number) {
    setPage(next)
    setLoading(true)
  }

  const tabs: { id: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Activity', count: counts.admin + counts.sales + counts.comms, icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'admin', label: 'Admin Actions', count: counts.admin, icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'sales', label: 'Sales', count: counts.sales, icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: 'comms', label: 'Communications', count: counts.comms, icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <section className="space-y-6">
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
            onClick={() => changeTab(t.id)}
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
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No activity yet</div>
        ) : (
          entries.map((entry) => (
            <div key={`${entry.kind}-${entry.data.id}`} className="px-5 py-4">
              {entry.kind === 'admin' && <AdminLogRow entry={entry.data} />}
              {entry.kind === 'sale' && <SaleRow entry={entry.data} />}
              {entry.kind === 'comm' && <CommRow entry={entry.data} />}
            </div>
          ))
        )}
        {total > PAGE_SIZE && (
          <Pagination page={page} totalPages={totalPages} onPageChange={changePage} />
        )}
      </div>
    </section>
  )
}
