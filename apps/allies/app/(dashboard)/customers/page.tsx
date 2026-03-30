'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAlly } from '@/lib/ally-context'

type Customer = {
  id: string
  name: string
  email: string
  phone: string | null
  totalOrders: number
  lastPurchase: string | null
}

type SaleItem = {
  id: string
  order_number: string
  total: number
  payment_method: string
  sale_date: string
  items: Array<{ product_name: string; variant_title: string | null; quantity: number }>
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
      // Get all distinct customers from this ally's sales
      const { data: sales } = await supabase
        .from('ally_sales')
        .select('customer_name, customer_email, customer_phone, sale_date')
        .eq('ally_id', ally!.id)
        .not('customer_email', 'is', null)
        .order('sale_date', { ascending: false })

      // Aggregate by email
      const map = new Map<string, Customer>()
      for (const s of sales ?? []) {
        if (!s.customer_email) continue
        const existing = map.get(s.customer_email)
        if (existing) {
          existing.totalOrders++
        } else {
          map.set(s.customer_email, {
            id: s.customer_email,
            name: s.customer_name || s.customer_email,
            email: s.customer_email,
            phone: s.customer_phone,
            totalOrders: 1,
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
    const { data: sales } = await supabase
      .from('ally_sales')
      .select('id, order_number, total, payment_method, sale_date, ally_sale_items(product_name, variant_title, quantity)')
      .eq('ally_id', ally!.id)
      .eq('customer_email', customer.email)
      .order('sale_date', { ascending: false })

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
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? '').includes(search)
  )

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-sm tracking-[0.15em] uppercase">Customers</h2>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input type="text" placeholder="Search customers" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white" />
        </div>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {/* Mobile card list */}
        <div className="md:hidden">
          {loading ? (
            <div className="p-6 text-sm text-neutral-400 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-neutral-400 text-center">No customers yet</div>
          ) : (
            filtered.map((c) => (
              <button key={c.id} onClick={() => openCustomer(c)}
                className="w-full flex items-center justify-between px-4 py-4 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left">
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{c.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{c.phone ?? c.email}</p>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  <p>{c.totalOrders} order{c.totalOrders !== 1 ? 's' : ''}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                {['Name', 'Email', 'Phone', 'Total Orders', 'Last Purchase'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-6 text-sm text-neutral-400 text-center">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-6 text-sm text-neutral-400 text-center">No customers yet</td></tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.id} onClick={() => openCustomer(c)}
                    className={`border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors ${i === filtered.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium">{c.name}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">{c.email}</td>
                    <td className="px-6 py-4 text-sm">{c.phone ?? '—'}</td>
                    <td className="px-6 py-4 text-sm">{c.totalOrders}</td>
                    <td className="px-6 py-4 text-sm text-neutral-500">{c.lastPurchase ? new Date(c.lastPurchase).toLocaleDateString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">{selected.name}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-9 h-9 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Phone</p>
                  <p className="text-sm">{selected.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-1">Total Orders</p>
                  <p className="text-sm font-medium">{selected.totalOrders}</p>
                </div>
              </div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-3">Order History</p>
              {loadingSales ? (
                <p className="text-sm text-neutral-400">Loading...</p>
              ) : selectedSales.length === 0 ? (
                <p className="text-sm text-neutral-400">No order history</p>
              ) : (
                <div className="space-y-3">
                  {selectedSales.map((sale) => (
                    <div key={sale.id} className="border border-neutral-200 dark:border-neutral-800 p-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{sale.order_number}</span>
                        <span className="text-sm font-medium">GH₵ {Number(sale.total).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-neutral-500 mb-1">
                        {sale.items.map((i) => `${i.product_name}${i.variant_title ? ` (${i.variant_title})` : ''} × ${i.quantity}`).join(', ')}
                      </p>
                      <div className="flex justify-between text-xs text-neutral-400">
                        <span>{new Date(sale.sale_date).toLocaleDateString()}</span>
                        <span className="capitalize">{sale.payment_method.replace('_', ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
