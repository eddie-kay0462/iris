'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAlly } from '@/lib/ally-context'

type AllyRow = {
  id: string
  full_name: string
  location: string
  location_type: 'campus' | 'city'
  totalSales: number
  totalOrders: number
  earnings: number
  isMe: boolean
}

type Period = 'month' | 'week' | 'all'

function medal(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

export default function LeaderboardPage() {
  const { ally } = useAlly()
  const [rows, setRows] = useState<AllyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('ally_sales')
        .select('ally_id, total, commission_amount')

      const now = new Date()
      if (period === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        query = query.gte('sale_date', start.toISOString())
      } else if (period === 'week') {
        const start = new Date(now)
        start.setDate(now.getDate() - 7)
        query = query.gte('sale_date', start.toISOString())
      }

      const { data: sales } = await query
      const { data: allies } = await supabase.from('allies').select('id, full_name, location, location_type').eq('is_active', true)

      const map = new Map<string, { total: number; orders: number; earnings: number }>()
      for (const s of sales ?? []) {
        const existing = map.get(s.ally_id) ?? { total: 0, orders: 0, earnings: 0 }
        map.set(s.ally_id, {
          total: existing.total + Number(s.total),
          orders: existing.orders + 1,
          earnings: existing.earnings + Number(s.commission_amount),
        })
      }

      const list: AllyRow[] = (allies ?? [])
        .map((a: any) => {
          const stats = map.get(a.id) ?? { total: 0, orders: 0, earnings: 0 }
          return { id: a.id, full_name: a.full_name, location: a.location, location_type: a.location_type, totalSales: stats.total, totalOrders: stats.orders, earnings: stats.earnings, isMe: a.id === ally?.id }
        })
        .sort((a, b) => b.totalSales - a.totalSales)

      setRows(list)
      setLoading(false)
    }
    load()
  }, [period, ally])

  const myRow = rows.find((r) => r.isMe)
  const myRank = myRow ? rows.indexOf(myRow) + 1 : null

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-sm tracking-[0.15em] uppercase">Leaderboard</h2>
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          {(['month', 'week', 'all'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 md:px-6 py-2.5 text-xs tracking-[0.15em] uppercase transition-colors relative ${period === p ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'}`}>
              {p === 'month' ? 'This Month' : p === 'week' ? 'This Week' : 'All Time'}
              {period === p && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black dark:bg-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* My rank summary cards */}
      {myRow && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Your Rank', value: myRank ? `#${myRank}` : '—' },
            { label: 'Your Sales', value: `GH₵ ${myRow.totalSales.toLocaleString(undefined, { minimumFractionDigits: 0 })}` },
            { label: 'Your Earnings', value: `GH₵ ${myRow.earnings.toFixed(0)}` },
          ].map((s) => (
            <div key={s.label} className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 md:p-5">
              <p className="text-[9px] md:text-[10px] tracking-[0.25em] uppercase text-neutral-400 mb-2">{s.label}</p>
              <p className="text-base md:text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {/* Mobile cards */}
        <div className="md:hidden">
          {loading ? <div className="p-6 text-sm text-neutral-400 text-center">Loading...</div>
            : rows.map((row, i) => (
              <div key={row.id}
                className={`flex items-center gap-3 px-4 py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 ${row.isMe ? 'bg-neutral-100 dark:bg-neutral-800 border-l-2 border-l-black dark:border-l-white' : ''}`}>
                <div className="w-10 text-center">
                  {medal(i + 1) ? <span className="text-xl">{medal(i + 1)}</span> : <span className="text-xl font-semibold text-neutral-400">{String(i + 1).padStart(2, '0')}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${row.isMe ? 'font-semibold' : ''}`}>
                    {row.full_name}{row.isMe ? ' (You)' : ''}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">{row.location}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">GH₵ {row.earnings.toFixed(0)}</p>
                  <p className="text-xs text-neutral-400">{row.totalOrders} orders</p>
                </div>
              </div>
            ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                {['Rank', 'Ally', 'Location', 'Total Sales', 'Orders', 'Earnings'].map((h) => (
                  <th key={h} className={`px-6 py-3 text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-medium ${h === 'Total Sales' || h === 'Orders' || h === 'Earnings' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-6 py-6 text-sm text-neutral-400 text-center">Loading...</td></tr>
                : rows.map((row, i) => (
                  <tr key={row.id} className={`border-b border-neutral-200 dark:border-neutral-800 transition-colors last:border-b-0 ${row.isMe ? 'bg-neutral-100 dark:bg-neutral-800 border-l-2 border-l-black dark:border-l-white' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {medal(i + 1) && <span className="text-lg">{medal(i + 1)}</span>}
                        <span className="text-xl font-semibold tracking-tight">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{row.full_name}{row.isMe ? <span className="ml-2 text-xs text-neutral-400">(You)</span> : ''}</td>
                    <td className="px-6 py-4"><span className="text-[10px] tracking-[0.15em] uppercase px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">{row.location}</span></td>
                    <td className="px-6 py-4 text-right text-sm font-medium">GH₵ {row.totalSales.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-sm">{row.totalOrders}</td>
                    <td className="px-6 py-4 text-right text-base font-semibold">GH₵ {row.earnings.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
