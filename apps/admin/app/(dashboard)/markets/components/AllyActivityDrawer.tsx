'use client'

import { useEffect, useState } from 'react'
import { X, LogIn, ShoppingBag, TrendingUp, Clock } from 'lucide-react'
import { fetchAllyActivity, type AllyActivityData } from '../actions'

type Props = {
  allyId: string
  allyName: string
  onClose: () => void
}

function startOfWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // Sunday
  return d.toISOString()
}

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

function buildWeeks(dates: string[], numWeeks = 8): { label: string; count: number }[] {
  // Build the last `numWeeks` Sunday-start weeks
  const now = new Date()
  const weeks: { start: Date; label: string; count: number }[] = []
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
    weeks.push({ start: weekStart, label: weekLabel(weekStart.toISOString()), count })
  }
  return weeks.map(({ label, count }) => ({ label, count }))
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
              <div
                className="w-full rounded-t-sm bg-slate-900 transition-all"
                style={{ height: '100%' }}
              />
            )}
          </div>
          <span className="text-[9px] text-slate-400 whitespace-nowrap">{w.label}</span>
        </div>
      ))}
    </div>
  )
}

export function AllyActivityDrawer({ allyId, allyName, onClose }: Props) {
  const [data, setData] = useState<AllyActivityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllyActivity(allyId).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [allyId])

  const lastLogin = data?.logins[0]?.logged_in_at ?? null
  const totalLogins = data?.logins.length ?? 0

  const loginWeeks = data ? buildWeeks(data.logins.map((l) => l.logged_in_at)) : []
  const salesWeeks = data ? buildWeeks(data.sales.map((s) => s.sale_date)) : []

  const totalSales = data?.sales.reduce((s, r) => s + r.total, 0) ?? 0
  const totalEarnings = data?.sales.reduce((s, r) => s + r.commission_amount, 0) ?? 0

  // Logins in last 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const loginsThisWeek = data?.logins.filter((l) => new Date(l.logged_in_at).getTime() > sevenDaysAgo).length ?? 0

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{allyName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Activity Monitor</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-sm text-slate-400">
              Loading activity…
            </div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Last Login</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {lastLogin ? timeAgo(lastLogin) : 'Never'}
                  </p>
                  {lastLogin && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {fmtDate(lastLogin)}
                    </p>
                  )}
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

              {/* Login frequency chart */}
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-4">
                  Login Frequency — Last 8 Weeks
                </p>
                {totalLogins === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No logins recorded yet</p>
                ) : (
                  <WeeklyBars weeks={loginWeeks} />
                )}
              </div>

              {/* Sales frequency chart */}
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-4">
                  Sales Activity — Last 8 Weeks
                </p>
                {(data?.sales.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No sales recorded yet</p>
                ) : (
                  <WeeklyBars weeks={salesWeeks} />
                )}
              </div>

              {/* Login history */}
              <div className="rounded-lg border border-slate-200">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Login History
                  </p>
                </div>
                {totalLogins === 0 ? (
                  <p className="text-sm text-slate-400 p-4 text-center">No logins recorded yet</p>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {data!.logins.map((login, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          <span className="text-sm text-slate-700">{fmtDate(login.logged_in_at)}</span>
                        </div>
                        <span className="text-xs text-slate-400">{timeAgo(login.logged_in_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}
