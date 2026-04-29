'use client'

import { useEffect, useState } from 'react'
import { Search, X, ChevronRight, ChevronDown, Package } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type ProductImage = {
  id: string
  src: string
  alt_text: string | null
  position: number
  variant_id: string | null
  image_type: string
}

type SizeStock = { id: string; size: string; stock: number; sku: string | null }
type Product = {
  id: string
  title: string
  product_type: string | null
  base_price: number
  description: string | null
  sizes: SizeStock[]
  images: ProductImage[]
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

function resolveImageUrl(src: string): string {
  if (!src) return src
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${src}`
}

function coverImage(product: Product): ProductImage | null {
  return (
    product.images.find((i) => i.image_type === 'product' && !i.variant_id) ??
    product.images[0] ??
    null
  )
}

function variantImage(product: Product, variantId: string): ProductImage | null {
  return product.images.find((i) => i.variant_id === variantId) ?? coverImage(product)
}

function Thumbnail({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`object-cover ${className}`} />
  )
}

function PlaceholderBox({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 ${className}`}>
      <Package className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
    </div>
  )
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedMobile, setSelectedMobile] = useState<Product | null>(null)
  const [activeImageIdx, setActiveImageIdx] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select(`id, title, status, vendor, tags, base_price, description, product_type,
          product_variants(id, option1_value, option2_value, option3_value, price, inventory_quantity, sku),
          product_images(id, src, alt_text, position, variant_id, image_type)`)
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
          images: [...(p.product_images ?? [])]
            .sort((a: any, b: any) => a.position - b.position)
            .map((img: any) => ({ ...img, src: resolveImageUrl(img.src) })),
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

  function openModal(p: Product) {
    setSelectedMobile(p)
    setActiveImageIdx(0)
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
              className="pl-9 pr-4 py-2 rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white w-44" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-md text-xs tracking-[0.1em] uppercase border transition-colors ${category === cat ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        {/* Mobile: tap to open detail modal */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-6 text-sm text-neutral-400 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-neutral-400 text-center">No products found</div>
          ) : filtered.map((p) => {
            const minStock = p.sizes.length ? Math.min(...p.sizes.map((s) => s.stock)) : 0
            const cover = coverImage(p)
            return (
              <button key={p.id} onClick={() => openModal(p)}
                className="w-full flex items-center gap-4 px-4 py-4 border-b border-slate-100 dark:border-neutral-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-neutral-800 text-left">
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-md overflow-hidden shrink-0">
                  {cover
                    ? <Thumbnail src={cover.src} alt={cover.alt_text || p.title} className="w-full h-full" />
                    : <PlaceholderBox className="w-full h-full rounded-md" />}
                </div>
                <div className="flex-1 min-w-0">
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
              <tr className="bg-slate-100 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-700">
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
                const cover = coverImage(p)

                return (
                  <>
                    {/* Product row */}
                    <tr key={p.id}
                      className={`${!isLast || isExpanded ? 'border-b' : ''} border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors`}
                      onClick={() => toggleExpanded(p.id)}
                    >
                      <td className="px-3 py-4 text-neutral-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md overflow-hidden shrink-0">
                            {cover
                              ? <Thumbnail src={cover.src} alt={cover.alt_text || p.title} className="w-full h-full" />
                              : <PlaceholderBox className="w-full h-full rounded-md" />}
                          </div>
                          <span className="text-sm font-medium">{p.title}</span>
                        </div>
                      </td>
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
                      const vImg = variantImage(p, s.id)
                      return (
                        <tr key={s.id}
                          className={`${!isLastVariant || !isLast ? 'border-b' : ''} border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50`}
                        >
                          <td className="px-3 py-2" />
                          <td className="px-6 py-2 pl-12">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded overflow-hidden shrink-0">
                                {vImg
                                  ? <Thumbnail src={vImg.src} alt={s.size} className="w-full h-full" />
                                  : <PlaceholderBox className="w-full h-full rounded" />}
                              </div>
                              <span className="text-sm text-neutral-600 dark:text-neutral-400">{s.size}</span>
                            </div>
                          </td>
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
      <AnimatePresence>
      {selectedMobile && (
        <motion.div
          key="inventory-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMobile(null)}
        >
          <motion.div
            key="inventory-panel"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white dark:bg-neutral-900 rounded-lg border border-slate-200 dark:border-neutral-800 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-[0.1em]">{selectedMobile.title}</h3>
                {selectedMobile.product_type && <p className="text-xs text-neutral-400 mt-0.5">{selectedMobile.product_type}</p>}
              </div>
              <button onClick={() => setSelectedMobile(null)} className="w-9 h-9 rounded-md border border-slate-200 dark:border-neutral-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-neutral-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Image gallery */}
              {selectedMobile.images.length > 0 && (
                <div className="p-5 pb-0">
                  {/* Main image */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 mb-3">
                    <Thumbnail
                      src={selectedMobile.images[activeImageIdx]?.src ?? selectedMobile.images[0].src}
                      alt={selectedMobile.images[activeImageIdx]?.alt_text || selectedMobile.title}
                      className="w-full h-full"
                    />
                  </div>
                  {/* Thumbnail strip */}
                  {selectedMobile.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedMobile.images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setActiveImageIdx(idx)}
                          className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                            idx === activeImageIdx
                              ? 'border-black dark:border-white'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <Thumbnail src={img.src} alt={img.alt_text || ''} className="w-full h-full" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="p-5">
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
                  {selectedMobile.sizes.map((s) => {
                    const vImg = variantImage(selectedMobile, s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (vImg) {
                            const idx = selectedMobile.images.findIndex(i => i.id === vImg.id)
                            if (idx !== -1) setActiveImageIdx(idx)
                          }
                        }}
                        className="rounded-md border border-slate-200 dark:border-neutral-800 overflow-hidden text-center hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
                      >
                        {/* Variant image */}
                        <div className="w-full aspect-square bg-neutral-100 dark:bg-neutral-800">
                          {vImg
                            ? <Thumbnail src={vImg.src} alt={s.size} className="w-full h-full" />
                            : <PlaceholderBox className="w-full h-full" />}
                        </div>
                        <div className="p-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 mb-1 truncate">{s.size}</p>
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${stockColor(s.stock)}`} />
                            <p className="text-base font-semibold">{s.stock}</p>
                          </div>
                          <p className="text-[10px] text-neutral-400">{stockLabel(s.stock)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
