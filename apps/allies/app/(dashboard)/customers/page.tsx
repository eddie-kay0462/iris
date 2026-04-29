'use client'

import { useEffect, useState } from 'react'
import { Search, X, ShoppingBag, Phone, Mail } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { AnimatePresence, motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAlly } from '@/lib/ally-context'

type Customer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  totalOrders: number
  totalSpend: number
  lastPurchase: string | null
}

type SaleItem = {
  id: string
  order_number: string
  total: number
  payment_method: string
  sale_date: string
  items: Array<{ product_name: string; variant_title: string | null; quantity: number; unit_price: number }>
}

function initials(name: string) {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatCurrency(n: number) {
  return `GH₵ ${Number(n).toFixed(2)}`
}

export default function CustomersPage() {
  const { ally } = useAlly()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [selectedSales, setSelectedSales] = useState<SaleItem[]>([])
  const [loadingSales, setLoadingSales] = useState(false)

  useEffect(() => {
    if (!ally) return
    async function load() {
      const supabase = createClient()
      const { data: sales } = await supabase
        .from('ally_sales')
        .select('customer_name, customer_email, customer_phone, sale_date, total')
        .eq('ally_id', ally!.id)
        .or('customer_name.not.is.null,customer_email.not.is.null,customer_phone.not.is.null')
        .order('sale_date', { ascending: false })

      // Aggregate by email > phone > name
      const map = new Map<string, Customer>()
      for (const s of sales ?? []) {
        if (!s.customer_name && !s.customer_email && !s.customer_phone) continue
        const key = s.customer_email ?? s.customer_phone ?? s.customer_name!
        const existing = map.get(key)
        const saleTotal = Number(s.total) || 0
        if (existing) {
          existing.totalOrders++
          existing.totalSpend += saleTotal
        } else {
          map.set(key, {
            id: key,
            name: s.customer_name || s.customer_email || s.customer_phone || '',
            email: s.customer_email ?? null,
            phone: s.customer_phone ?? null,
            totalOrders: 1,
            totalSpend: saleTotal,
            lastPurchase: s.sale_date,
          })
        }
      }
      setCustomers(Array.from(map.values()))
      setLoading(false)
    }
    load()
  }, [ally])

  async function openCustomer(customer: Customer) {
    setSelected(customer)
    setLoadingSales(true)
    const supabase = createClient()
    let query = supabase
      .from('ally_sales')
      .select('id, order_number, total, payment_method, sale_date, ally_sale_items(product_name, variant_title, quantity, unit_price)')
      .eq('ally_id', ally!.id)
      .order('sale_date', { ascending: false })

    if (customer.email) {
      query = query.eq('customer_email', customer.email)
    } else if (customer.phone) {
      query = query.eq('customer_phone', customer.phone)
    } else {
      query = query.eq('customer_name', customer.name)
    }

    const { data: sales } = await query
    setSelectedSales(
      (sales ?? []).map((s: any) => ({
        id: s.id,
        order_number: s.order_number,
        total: s.total,
        payment_method: s.payment_method,
        sale_date: s.sale_date,
        items: s.ally_sale_items ?? [],
      }))
    )
    setLoadingSales(false)
  }

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
  )

  // Sort by total spend descending
  const sorted = [...filtered].sort((a, b) => b.totalSpend - a.totalSpend)

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-sm tracking-[0.15em] uppercase">Customers</h2>
          {!loading && (
            <p className="text-xs text-neutral-400 mt-0.5">{customers.length} customer{customers.length !== 1 ? 's' : ''} recorded</p>
          )}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input type="text" placeholder="Search by name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
        </div>
      </div>

      {/* Summary stat strip */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-5">
            <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-2">Customers</p>
            <p className="text-xl md:text-2xl font-semibold">{customers.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-5">
            <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-2">Total Orders</p>
            <p className="text-xl md:text-2xl font-semibold">{customers.reduce((s, c) => s + c.totalOrders, 0)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-5">
            <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-2">Revenue</p>
            <p className="text-base md:text-xl font-semibold truncate">{formatCurrency(customers.reduce((s, c) => s + c.totalSpend, 0))}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
        {/* Mobile card list */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-6 text-sm text-neutral-400 text-center">Loading...</div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
              <p className="text-sm text-neutral-400 dark:text-neutral-100">No customers yet</p>
              <p className="text-xs text-neutral-900 dark:text-neutral-100 mt-1">Customers appear here after you record a sale.</p>
            </div>
          ) : (
            sorted.map((c) => (
              <button key={c.id} onClick={() => openCustomer(c)}
                className="w-full flex items-center gap-4 px-4 py-5 border-b border-slate-100 dark:border-neutral-800 last:border-b-0 hover:bg-slate-50 dark:hover:bg-neutral-800 text-left transition-colors">
                <Avatar name={c.name} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{c.name}</p>
                  <p className="text-xs text-neutral-500 mt-1 truncate">{c.phone ?? c.email ?? '—'}</p>
                </div>
                <div className="text-right text-xs text-neutral-500 shrink-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(c.totalSpend)}</p>
                  <p className="mt-1">{c.totalOrders} order{c.totalOrders !== 1 ? 's' : ''}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100 dark:bg-neutral-800/60 border-b border-slate-200 dark:border-neutral-700">
                {['Customer', 'Contact', 'Orders', 'Total Spend', 'Last Purchase'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-6 text-sm text-neutral-400 text-center">Loading...</td></tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <ShoppingBag className="w-8 h-8 text-neutral-200 mx-auto mb-3" />
                    <p className="text-sm text-neutral-400">No customers yet</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Customers appear here after you record a sale.</p>
                  </td>
                </tr>
              ) : (
                sorted.map((c, i) => (
                  <tr key={c.id} onClick={() => openCustomer(c)}
                    className={`border-b border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors ${i === sorted.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} size={36} />
                        <span className="text-sm font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        {c.email && <p className="text-xs text-neutral-500 flex items-center gap-1.5"><Mail className="w-3 h-3 shrink-0" />{c.email}</p>}
                        {c.phone && <p className="text-xs text-neutral-500 flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{c.phone}</p>}
                        {!c.email && !c.phone && <p className="text-xs text-neutral-400">—</p>}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm">{c.totalOrders}</td>
                    <td className="px-6 py-5 text-sm font-semibold">{formatCurrency(c.totalSpend)}</td>
                    <td className="px-6 py-5 text-sm text-neutral-500">{c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Modal */}
      <AnimatePresence>
      {selected && (
        <motion.div
          key="customer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <motion.div
            key="customer-panel"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white dark:bg-neutral-900 rounded-lg border border-slate-200 dark:border-neutral-800 shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-neutral-800 flex items-center gap-3">
              <Avatar name={selected.name} size={40} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{selected.name}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{selected.email ?? selected.phone ?? 'No contact info'}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-md border border-slate-200 dark:border-neutral-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-neutral-800 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {/* Contact + stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {selected.phone && (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Phone</p>
                    <p className="text-sm">{selected.phone}</p>
                  </div>
                )}
                {selected.email && (
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Email</p>
                    <p className="text-sm truncate">{selected.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Orders</p>
                  <p className="text-sm font-semibold">{selected.totalOrders}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Total Spend</p>
                  <p className="text-sm font-semibold">{formatCurrency(selected.totalSpend)}</p>
                </div>
              </div>

              {/* Order history */}
              <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-3">Order History</p>
              {loadingSales ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 animate-pulse" />)}
                </div>
              ) : selectedSales.length === 0 ? (
                <p className="text-sm text-neutral-400">No order history</p>
              ) : (
                <div className="space-y-3">
                  {selectedSales.map((sale) => (
                    <div key={sale.id} className="rounded-md border border-slate-200 dark:border-neutral-800 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-semibold">{sale.order_number}</span>
                        <span className="text-sm font-semibold">{formatCurrency(Number(sale.total))}</span>
                      </div>
                      <div className="space-y-1 mb-2">
                        {sale.items.map((item, i) => (
                          <p key={i} className="text-xs text-neutral-500">
                            {item.product_name}{item.variant_title ? ` (${item.variant_title})` : ''} × {item.quantity}
                            <span className="ml-1 text-neutral-400">— {formatCurrency(item.unit_price * item.quantity)}</span>
                          </p>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-neutral-400 pt-2 border-t border-slate-100 dark:border-neutral-800">
                        <span>{new Date(sale.sale_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="capitalize">{sale.payment_method.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
