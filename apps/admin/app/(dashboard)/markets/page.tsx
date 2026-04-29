'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Pencil, Activity } from 'lucide-react'
import { fetchAllies } from './actions'
import { InviteAllyModal } from './components/InviteAllyModal'
import { EditAllyDrawer } from './components/EditAllyDrawer'
import { AllyActivityDrawer } from './components/AllyActivityDrawer'
import { CommissionSettingsCard } from './components/CommissionSettingsCard'

type Ally = {
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
  totalSales: number
  totalOrders: number
  totalEarnings: number
}

export default function MarketsPage() {
  const [allies, setAllies] = useState<Ally[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editingAlly, setEditingAlly] = useState<Ally | null>(null)
  const [activityAlly, setActivityAlly] = useState<Ally | null>(null)

  async function loadAllies() {
    const { allies: allyRows, sales } = await fetchAllies()

    // Aggregate sales per ally
    const map = new Map<string, { total: number; orders: number; earnings: number }>()
    for (const s of sales) {
      const existing = map.get(s.ally_id) ?? { total: 0, orders: 0, earnings: 0 }
      map.set(s.ally_id, {
        total: existing.total + Number(s.total),
        orders: existing.orders + 1,
        earnings: existing.earnings + Number(s.commission_amount),
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setAllies(
      (allyRows as any[]).map((a) => {
        const stats = map.get(a.id) ?? { total: 0, orders: 0, earnings: 0 }
        return { ...a, totalSales: stats.total, totalOrders: stats.orders, totalEarnings: stats.earnings }
      })
    )
    setLoading(false)
  }

  useEffect(() => { loadAllies() }, [])

  const active = allies.filter((a) => a.is_active).length

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Markets</h1>
          <p className="text-sm text-slate-500">
            Manage 1NRI allies and track their sales performance.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite Ally
        </button>
      </header>

      <CommissionSettingsCard />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Allies', value: allies.length },
          { label: 'Active', value: active },
          { label: 'Total Sales', value: `GH₵ ${allies.reduce((s, a) => s + a.totalSales, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
          { label: 'Total Earnings Paid', value: `GH₵ ${allies.reduce((s, a) => s + a.totalEarnings, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Allies Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">All Allies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Ally', 'Location', 'Commission', 'Total Sales', 'Orders', 'Earnings', 'Status', '', ''].map((h) => (
                  <th key={h} className={`px-6 py-3 text-xs font-medium uppercase tracking-wide text-slate-400 ${h === 'Total Sales' || h === 'Orders' || h === 'Earnings' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-sm text-slate-400 text-center">Loading...</td></tr>
              ) : allies.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-sm text-slate-400 text-center">No allies yet — invite your first partner.</td></tr>
              ) : (
                allies.map((ally, i) => (
                  <tr key={ally.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i === allies.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{ally.full_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{ally.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700">{ally.location}</p>
                      <span className={`inline-block mt-0.5 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${ally.location_type === 'campus' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                        {ally.location_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{(ally.commission_rate * 100).toFixed(1)}%</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">GH₵ {ally.totalSales.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-600">{ally.totalOrders}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">GH₵ {ally.totalEarnings.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ally.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                        {ally.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setActivityAlly(ally)}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <Activity className="h-3 w-3" />
                        Activity
                      </button>
                    </td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => setEditingAlly(ally)}
                        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <InviteAllyModal onClose={() => setShowInvite(false)} onSuccess={loadAllies} />
      )}

      {editingAlly && (
        <EditAllyDrawer ally={editingAlly} onClose={() => setEditingAlly(null)} onSuccess={loadAllies} />
      )}

      {activityAlly && (
        <AllyActivityDrawer
          allyId={activityAlly.id}
          allyName={activityAlly.full_name}
          onClose={() => setActivityAlly(null)}
        />
      )}
    </section>
  )
}
