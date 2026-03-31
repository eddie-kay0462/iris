'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { inviteAlly } from '../actions'

type Props = { onClose: () => void; onSuccess: () => void }

export function InviteAllyModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', location: '',
    location_type: 'campus' as 'campus' | 'city',
    commission_rate: 15,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(k: keyof typeof form, v: string | number) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await inviteAlly({ ...form, commission_rate: Number(form.commission_rate) })
    if (result.error) { setError(result.error); setLoading(false); return }
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Invite New Ally</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
              <input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
              <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Location *</label>
              <input required value={form.location} onChange={(e) => update('location', e.target.value)}
                placeholder="e.g. Ashesi University"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select value={form.location_type} onChange={(e) => update('location_type', e.target.value as 'campus' | 'city')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none">
                <option value="campus">Campus</option>
                <option value="city">City</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Commission Rate (%)</label>
              <div className="flex items-center gap-3">
                <input type="number" min="0" max="100" step="0.5" value={form.commission_rate} onChange={(e) => update('commission_rate', Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none" />
                <span className="text-sm text-slate-500">= {(Number(form.commission_rate)).toFixed(1)}% of each sale goes to this ally</span>
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
              {loading ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
