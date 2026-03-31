'use client'

import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { updateAlly } from '../actions'

type Ally = {
  id: string
  full_name: string
  email: string
  phone: string | null
  location: string
  location_type: 'campus' | 'city'
  commission_rate: number
  is_active: boolean
  joined_at: string
  totalSales?: number
  totalOrders?: number
  totalEarnings?: number
}

type Props = { ally: Ally; onClose: () => void; onSuccess: () => void }

export function EditAllyDrawer({ ally, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    location: ally.location,
    location_type: ally.location_type,
    commission_rate: Math.round(ally.commission_rate * 100),
    is_active: ally.is_active,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    const result = await updateAlly({
      id: ally.id,
      location: form.location,
      location_type: form.location_type,
      commission_rate: form.commission_rate,
      is_active: form.is_active,
    })
    if (result.error) { setError(result.error); setLoading(false); return }
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{ally.full_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{ally.email}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats */}
          {(ally.totalSales !== undefined) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Sales', value: `GH₵ ${(ally.totalSales ?? 0).toLocaleString()}` },
                { label: 'Orders', value: String(ally.totalOrders ?? 0) },
                { label: 'Earnings', value: `GH₵ ${(ally.totalEarnings ?? 0).toFixed(0)}` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
                  <p className="text-sm font-semibold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Edit fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
              <input value={form.location} onChange={(e) => update('location', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Location Type</label>
              <select value={form.location_type} onChange={(e) => update('location_type', e.target.value as 'campus' | 'city')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none">
                <option value="campus">Campus</option>
                <option value="city">City</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Commission Rate (%)</label>
              <div className="flex items-center gap-3">
                <input type="number" min="0" max="100" step="0.5"
                  value={form.commission_rate}
                  onChange={(e) => update('commission_rate', Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
                <span className="text-sm text-slate-500">{form.commission_rate}% per sale</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Active</p>
                <p className="text-xs text-slate-500">Inactive allies cannot log in</p>
              </div>
              <button
                type="button"
                onClick={() => update('is_active', !form.is_active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-slate-900' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400">Phone: {ally.phone ?? '—'}</p>
              <p className="text-xs text-slate-400 mt-0.5">Joined: {new Date(ally.joined_at).toLocaleDateString()}</p>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-6">
          <button onClick={handleSave} disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}
