'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Wallet, ShoppingBag, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAlly } from '@/lib/ally-context'

type Sale = {
  id: string
  order_number: string
  customer_name: string | null
  total: number
  commission_amount: number
  payment_method: string
  status: string
  sale_date: string
}

type Stats = {
  todaySales: number
  monthEarnings: number
  ordersCount: number
  rank: number | null
}

function formatCurrency(n: number) {
  return `GH₵ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DashboardPage() {
  const { ally } = useAlly()
  const [stats, setStats] = useState<Stats>({ todaySales: 0, monthEarnings: 0, ordersCount: 0, rank: null })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ally) return

    async function load() {
      const supabase = createClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

      // Today's sales total
      const { data: todayData } = await supabase
        .from('ally_sales')
        .select('total')
        .eq('ally_id', ally!.id)
        .gte('sale_date', today.toISOString())

      const todaySales = (todayData ?? []).reduce((s, r) => s + Number(r.total), 0)

      // This month's earnings
      const { data: monthData } = await supabase
        .from('ally_sales')
        .select('commission_amount')
        .eq('ally_id', ally!.id)
        .gte('sale_date', monthStart.toISOString())

      const monthEarnings = (monthData ?? []).reduce((s, r) => s + Number(r.commission_amount), 0)

      // All-time order count
      const { count: ordersCount } = await supabase
        .from('ally_sales')
        .select('*', { count: 'exact', head: true })
        .eq('ally_id', ally!.id)

      // Rank — sum totals for all allies this month, sort descending
      const { data: leaderData } = await supabase
        .from('ally_sales')
        .select('ally_id, total')
        .gte('sale_date', monthStart.toISOString())

      const totalsMap: Record<string, number> = {}
      for (const row of leaderData ?? []) {
        totalsMap[row.ally_id] = (totalsMap[row.ally_id] ?? 0) + Number(row.total)
      }
      const sorted = Object.entries(totalsMap).sort((a, b) => b[1] - a[1])
      const rank = sorted.findIndex(([id]) => id === ally!.id) + 1

      // Recent 5 sales
      const { data: recent } = await supabase
        .from('ally_sales')
        .select('id, order_number, customer_name, total, commission_amount, payment_method, status, sale_date')
        .eq('ally_id', ally!.id)
        .order('sale_date', { ascending: false })
        .limit(5)

      setStats({ todaySales, monthEarnings, ordersCount: ordersCount ?? 0, rank: rank || null })
      setRecentSales(recent ?? [])
      setLoading(false)
    }

    load()
  }, [ally])

  const statCards = [
    { label: "Today's Sales", value: formatCurrency(stats.todaySales), icon: <ShoppingBag className="w-4 h-4" /> },
    { label: "Month's Earnings", value: formatCurrency(stats.monthEarnings), icon: <Wallet className="w-4 h-4" /> },
    { label: 'Orders Recorded', value: stats.ordersCount.toString(), icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'Leaderboard Rank', value: stats.rank ? `#${stats.rank}` : '—', icon: <Trophy className="w-4 h-4" /> },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Stats Grid — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 md:p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] md:text-[10px] tracking-[0.25em] uppercase text-neutral-400">
                {stat.label}
              </p>
              <span className="text-neutral-400">{stat.icon}</span>
            </div>
            <p className="text-lg md:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {loading ? <span className="opacity-30">—</span> : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Sales */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="px-4 md:px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xs tracking-[0.15em] uppercase">Recent Sales</h3>
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden">
          {loading ? (
            <div className="px-4 py-6 text-sm text-neutral-400 text-center">Loading...</div>
          ) : recentSales.length === 0 ? (
            <div className="px-4 py-6 text-sm text-neutral-400 text-center">No sales yet</div>
          ) : (
            recentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {sale.customer_name || 'Walk-in'}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{sale.order_number} · {sale.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(Number(sale.total))}</p>
                  <span className={`inline-block mt-0.5 text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 ${
                    sale.status === 'completed'
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                      : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}>
                    {sale.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                {['Order Ref', 'Customer', 'Total', 'Commission', 'Payment', 'Status'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-6 text-sm text-neutral-400 text-center">Loading...</td></tr>
              ) : recentSales.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-6 text-sm text-neutral-400 text-center">No sales yet — record your first sale!</td></tr>
              ) : (
                recentSales.map((sale, i) => (
                  <tr
                    key={sale.id}
                    className={`border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
                      i === recentSales.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-medium">{sale.order_number}</td>
                    <td className="px-6 py-4 text-sm">{sale.customer_name || 'Walk-in'}</td>
                    <td className="px-6 py-4 text-sm font-medium">{formatCurrency(Number(sale.total))}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">{formatCurrency(Number(sale.commission_amount))}</td>
                    <td className="px-6 py-4 text-sm capitalize">{sale.payment_method.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 text-[10px] tracking-[0.15em] uppercase ${
                        sale.status === 'completed'
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Record CTA */}
      <Link
        href="/sales"
        className="w-full bg-black dark:bg-white text-white dark:text-black px-6 py-4 text-xs tracking-[0.2em] uppercase font-medium flex items-center justify-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
      >
        Record a Sale
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
