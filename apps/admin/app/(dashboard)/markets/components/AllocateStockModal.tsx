'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Search, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory, type InventoryItem } from '@/lib/api/inventory'
import { useAllocateStock } from '@/lib/api/allies'

function variantLabel(item: InventoryItem): string {
  const opts = [item.option1_value, item.option2_value].filter(Boolean).join(' / ')
  return opts || 'Default'
}

export function AllocateStockModal({
  allyId,
  allyName,
  onClose,
}: {
  allyId: string
  allyName: string
  onClose: () => void
}) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Debounce the search so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading } = useInventory({ search: search || undefined, limit: 8 })
  const allocate = useAllocateStock(allyId)

  const available = selected?.inventory_quantity ?? 0
  const canSubmit = useMemo(
    () => !!selected && quantity >= 1 && quantity <= available && !allocate.isPending,
    [selected, quantity, available, allocate.isPending],
  )

  async function handleAllocate() {
    if (!selected) return
    try {
      await allocate.mutateAsync({ variantId: selected.id, quantity })
      toast.success(`Allocated ${quantity} × ${selected.product.title} to ${allyName}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to allocate stock')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Allocate stock</h2>
            <p className="text-xs text-slate-500 mt-0.5">to {allyName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products or SKU…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
            />
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-slate-400">Searching…</p>
            ) : !data || data.data.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">No variants found</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {data.data.map((item) => {
                  const isSelected = selected?.id === item.id
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setSelected(item)
                          setQuantity(1)
                        }}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                          isSelected ? 'bg-slate-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Package className="h-4 w-4 shrink-0 text-slate-300" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{item.product.title}</p>
                            <p className="truncate text-xs text-slate-400">
                              {variantLabel(item)}
                              {item.sku ? ` · ${item.sku}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          {item.inventory_quantity} avail.
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Quantity + submit */}
          {selected && (
            <div className="flex items-end gap-3 border-t border-slate-100 pt-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-500">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={available}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(available, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <p className="mt-1 text-[11px] text-slate-400">{available} available in central stock</p>
              </div>
              <button
                onClick={handleAllocate}
                disabled={!canSubmit}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
              >
                {allocate.isPending ? 'Allocating…' : 'Allocate'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
