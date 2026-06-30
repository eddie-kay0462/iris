'use client'

import { useEffect, useState } from 'react'
import { LogIn, ShoppingBag, TrendingUp, Clock } from 'lucide-react'
import { fetchAllyActivity, type AllyActivityData } from '../actions'

function weekLabel(isoWeekStart: string): string {
  const d = new Date(isoWeekStart)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function sessionDuration(loginAt: string, logoutAt: string | null): string {
  if (!logoutAt) return ''
  const ms = new Date(logoutAt).getTime() - new Date(loginAt).getTime()
  if (ms < 0) return ''
  const totalMins = Math.floor(ms / 60000)
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

const reasonBadge: Record<string, { label: string; className: string }> = {
  manual:      { label: 'Signed out',   className: 'bg-slate-100 text-slate-500' },
  inactivity:  { label: 'Idle timeout', className: 'bg-amber-50 text-amber-600' },
  force_logout:{ label: 'Force logout', className: 'bg-red-50 text-red-500' },
  session_expired: { label: 'Expired',  className: 'bg-orange-50 text-orange-500' },
}

function buildWeeks(dates: string[], numWeeks = 8): { label: string; count: number }[] {
  const now = new Date()
  const weeks: { label: string; count: number }[] = []
  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const count = dates.filter((d) => {
      const t = new Date(d).getTime()
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    }).length
    weeks.push({ label: weekLabel(weekStart.toISOString()), count })
  }
  return weeks
}

function WeeklyBars({ weeks }: { weeks: { label: string; count: number }[] }) {
  const max = Math.max(...weeks.map((w) => w.count), 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {weeks.map((w, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm bg-slate-200 transition-all"
            style={{ height: `${Math.max((w.count / max) * 52, w.count > 0 ? 6 : 2)}px` }}
          >
            {w.count > 0 && (
              <div className="w-full rounded-t-sm bg-slate-900 transition-all" style={{ height: '100%' }} />
            )}
          </div>
          <span className="text-[9px] text-slate-400 whitespace-nowrap">{w.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Ally login + sales activity: summary cards, 8-week charts, login history.
 *  Extracted from the old AllyActivityDrawer so it can live inline on the page. */
export function AllyActivityPanel({ allyId }: { allyId: string }) {
  const [data, setData] = useState<AllyActivityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllyActivity(allyId).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [allyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        Loading activity…
      </div>
    )
  }

  const lastLogin = data?.logins[0]?.logged_in_at ?? null
  const totalLogins = data?.logins.length ?? 0
  const loginWeeks = data ? buildWeeks(data.logins.map((l) => l.logged_in_at)) : []
  const salesWeeks = data ? buildWeeks(data.sales.map((s) => s.sale_date)) : []
  const totalSales = data?.sales.reduce((s, r) => s + r.total, 0) ?? 0
  const totalEarnings = data?.sales.reduce((s, r) => s + r.commission_amount, 0) ?? 0
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const loginsThisWeek = data?.logins.filter((l) => new Date(l.logged_in_at).getTime() > sevenDaysAgo).length ?? 0

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Last Login</p>
          </div>
          <p className="text-sm font-semibold text-slate-900">{lastLogin ? timeAgo(lastLogin) : 'Never'}</p>
          {lastLogin && <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(lastLogin)}</p>}
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <LogIn className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Logins</p>
          </div>
          <p className="text-sm font-semibold text-slate-900">{totalLogins} total</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{loginsThisWeek} this week</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Sales</p>
          </div>
          <p className="text-sm font-semibold text-slate-900">{data?.sales.length ?? 0} orders</p>
          <p className="text-[10px] text-slate-400 mt-0.5">GH₵ {totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Commission</p>
          </div>
          <p className="text-sm font-semibold text-slate-900">
            GH₵ {totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">all time</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-4">Login Frequency — Last 8 Weeks</p>
          {totalLogins === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No logins recorded yet</p>
          ) : (
            <WeeklyBars weeks={loginWeeks} />
          )}
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-4">Sales Activity — Last 8 Weeks</p>
          {(data?.sales.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No sales recorded yet</p>
          ) : (
            <WeeklyBars weeks={salesWeeks} />
          )}
        </div>
      </div>

      {/* Login history */}
      <div className="rounded-lg border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Login History</p>
        </div>
        {totalLogins === 0 ? (
          <p className="text-sm text-slate-400 p-4 text-center">No logins recorded yet</p>
        ) : (
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {data!.logins.map((login, i) => {
              const duration = sessionDuration(login.logged_in_at, login.logged_out_at)
              const badge = login.logout_reason
                ? reasonBadge[login.logout_reason]
                : { label: 'Active', className: 'bg-green-50 text-green-600' }
              return (
                <div key={i} className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${login.logged_out_at ? 'bg-slate-300' : 'bg-green-500'}`} />
                      <span className="text-sm text-slate-700">{fmtDate(login.logged_in_at)}</span>
                    </div>
                    <span className="text-xs text-slate-400">{timeAgo(login.logged_in_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-4">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    {duration && <span className="text-[10px] text-slate-400">{duration} session</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
