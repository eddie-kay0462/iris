'use client'

import { useEffect, useState } from 'react'
import { Search, X, ChevronRight, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type SizeStock = { id: string; size: string; stock: number; sku: string | null }
type Product = {
  id: string
  title: string
  product_type: string | null
  base_price: number
  description: string | null
  sizes: SizeStock[]
}

const CATEGORIES = ['All', 'T-Shirts', 'Hoodies', 'Sweatshirts', 'Bottoms', 'Accessories']

function stockColor(n: number) {
  if (n >= 10) return 'bg-green-500'
  if (n >= 3) return 'bg-amber-500'
  return 'bg-red-500'
}
function stockLabel(n: number) {
  if (n >= 10) return 'Good'
  if (n >= 3) return 'Low'
  return 'Critical'
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedMobile, setSelectedMobile] = useState<Product | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select(`id, title, status, vendor, tags, base_price, description, product_type, product_variants(id, option1_value, option2_value, option3_value, price, inventory_quantity, sku)`)
        .eq('published', true)
        .is('deleted_at', null)
        .order('title')

      setProducts(
        (data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          product_type: p.product_type ?? null,
          base_price: p.base_price,
          description: p.description ?? null,
          sizes: (p.product_variants ?? []).map((v: any) => ({
            id: v.id,
            size: [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / ') || 'One Size',
            stock: v.inventory_quantity ?? 0,
            sku: v.sku ?? null,
          })),
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  const filtered = products.filter((p) => {
    const allSkus = p.sizes.map(s => s.sku ?? '').join(' ')
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || allSkus.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || (p.product_type ?? '').toLowerCase().includes(category.toLowerCase())
    return matchSearch && matchCat
  })

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-sm tracking-[0.15em] uppercase">Inventory</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />≥10</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />3–9</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />0–2</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white w-44" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`shrink-0 px-4 py-2 text-xs tracking-[0.1em] uppercase border transition-colors ${category === cat ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {/* Mobile: tap to open detail modal */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-6 text-sm text-neutral-400 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-neutral-400 text-center">No products found</div>
          ) : filtered.map((p) => {
            const minStock = p.sizes.length ? Math.min(...p.sizes.map((s) => s.stock)) : 0
            return (
              <button key={p.id} onClick={() => setSelectedMobile(p)}
                className="w-full flex items-center justify-between px-4 py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.title}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{p.product_type ?? '—'} · {p.sizes.length} variant{p.sizes.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${stockColor(minStock)}`} />
                  <span className="text-xs text-neutral-500">{stockLabel(minStock)}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Desktop: accordion table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="w-8 px-3 py-3" />
                {['Product', 'Category', 'Price', 'Variants', 'Stock'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-6 text-sm text-neutral-400 text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-6 text-sm text-neutral-400 text-center">No products found</td></tr>
              ) : filtered.map((p, i) => {
                const isExpanded = expandedIds.has(p.id)
                const minStock = p.sizes.length ? Math.min(...p.sizes.map((s) => s.stock)) : 0
                const isLast = i === filtered.length - 1

                return (
                  <>
                    {/* Product row */}
                    <tr key={p.id}
                      className={`${!isLast || isExpanded ? 'border-b' : ''} border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors`}
                      onClick={() => toggleExpanded(p.id)}
                    >
                      <td className="px-3 py-4 text-neutral-400">
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{p.title}</td>
                      <td className="px-6 py-4 text-sm text-neutral-500">{p.product_type ?? '—'}</td>
                      <td className="px-6 py-4 text-sm">GH₵ {p.base_price}</td>
                      <td className="px-6 py-4 text-sm text-neutral-500">{p.sizes.length} variant{p.sizes.length !== 1 ? 's' : ''}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${stockColor(minStock)}`} />
                          <span className="text-sm">{stockLabel(minStock)}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Variant sub-rows */}
                    {isExpanded && p.sizes.map((s, vi) => {
                      const isLastVariant = vi === p.sizes.length - 1
                      return (
                        <tr key={s.id}
                          className={`${!isLastVariant || !isLast ? 'border-b' : ''} border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50`}
                        >
                          <td className="px-3 py-2" />
                          <td className="px-6 py-2 pl-12 text-sm text-neutral-600 dark:text-neutral-400">{s.size}</td>
                          <td className="px-6 py-2 text-xs text-neutral-400" />
                          <td className="px-6 py-2 text-xs text-neutral-400">{s.sku || '—'}</td>
                          <td className="px-6 py-2" />
                          <td className="px-6 py-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${stockColor(s.stock)}`} />
                              <span className="text-sm font-medium">{s.stock}</span>
                              <span className="text-xs text-neutral-400">{stockLabel(s.stock)}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile detail modal */}
      {selectedMobile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-[0.1em]">{selectedMobile.title}</h3>
                {selectedMobile.product_type && <p className="text-xs text-neutral-400 mt-0.5">{selectedMobile.product_type}</p>}
              </div>
              <button onClick={() => setSelectedMobile(null)} className="w-9 h-9 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div><p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Type</p><p className="text-sm">{selectedMobile.product_type ?? '—'}</p></div>
                <div><p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Price</p><p className="text-sm font-medium">GH₵ {selectedMobile.base_price}</p></div>
              </div>
              {selectedMobile.description && (
                <div className="mb-5">
                  <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Description</p>
                  <p className="text-sm text-neutral-500">{selectedMobile.description}</p>
                </div>
              )}
              <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-3">Stock by Variant</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {selectedMobile.sizes.map((s) => (
                  <div key={s.id} className="border border-neutral-200 dark:border-neutral-800 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-2">{s.size}</p>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className={`w-2 h-2 rounded-full ${stockColor(s.stock)}`} />
                      <p className="text-lg font-semibold">{s.stock}</p>
                    </div>
                    <p className="text-[10px] text-neutral-400">{stockLabel(s.stock)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
