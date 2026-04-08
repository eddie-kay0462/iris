'use client'

import { useEffect, useState } from 'react'
import { Settings2, Save } from 'lucide-react'
import { getCommissionSettings, updateCommissionSettings, type CommissionSettings } from '../actions'

export function CommissionSettingsCard() {
  const [settings, setSettings] = useState<CommissionSettings | null>(null)
  const [form, setForm] = useState({ default_quota: 0, default_rate: 15, period: 'monthly' as 'monthly' | 'all_time' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getCommissionSettings().then((s) => {
      setSettings(s)
      setForm({
        default_quota: s.default_quota,
        default_rate: Math.round(s.default_rate * 100),
        period: s.period,
      })
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await updateCommissionSettings({
      default_quota: form.default_quota,
      default_rate: form.default_rate,
      period: form.period,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
        <Settings2 className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">Commission Settings</h3>
        <span className="ml-auto text-xs text-slate-400">Global defaults — overrideable per ally</span>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Default Rate */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Default Rate (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="100" step="0.5"
              value={form.default_rate}
              onChange={(e) => setForm((f) => ({ ...f, default_rate: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
            <span className="text-sm text-slate-500">{form.default_rate}% per sale</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Applied to each qualifying sale</p>
        </div>

        {/* Default Quota */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sales Quota (GH₵)</label>
          <input
            type="number" min="0" step="100"
            value={form.default_quota}
            onChange={(e) => setForm((f) => ({ ...f, default_quota: Number(e.target.value) }))}
            className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <p className="text-xs text-slate-400 mt-1">
            {form.default_quota === 0
              ? 'No quota — commission from first sale'
              : `Commission unlocks after GH₵ ${Number(form.default_quota).toLocaleString()} in sales`}
          </p>
        </div>

        {/* Period */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
          <select
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as 'monthly' | 'all_time' }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="monthly">Monthly (resets each month)</option>
            <option value="all_time">All-time (never resets)</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">When quota tracking resets</p>
        </div>
      </div>

      <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between">
        {error && <p className="text-xs text-red-500">{error}</p>}
        {!error && <p className="text-xs text-slate-400">Changes apply to all allies without a custom quota override</p>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
