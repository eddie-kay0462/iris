'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAlly } from '@/lib/ally-context'
import { toast } from 'sonner'
import { refundAllySale, markCashReceived } from '../actions'

type SaleItem = {
  id: string
  product_name: string
  variant_title: string | null
  quantity: number
  unit_price: number
  total_price: number
}

type Sale = {
  id: string
  order_number: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  payment_method: 'cash' | 'momo' | 'bank_transfer'
  payment_reference: string | null
  subtotal: number
  total: number
  commission_amount: number
  status: 'completed' | 'pending' | 'refunded' | 'awaiting_payment'
  sale_date: string
  ally_sale_items: SaleItem[]
}

const STATUS_LABELS: Record<Sale['status'], string> = {
  completed: 'Completed',
  pending: 'Pending',
  refunded: 'Refunded',
  awaiting_payment: 'Awaiting Payment',
}

const STATUS_CLASSES: Record<Sale['status'], string> = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  refunded: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  awaiting_payment: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

function formatCurrency(n: number) {
  return `GH₵ ${Number(n).toFixed(2)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function canRefund(sale: Sale) {
  return sale.status === 'completed' &&
    (sale.payment_method === 'momo' || sale.payment_method === 'bank_transfer') &&
    !!sale.payment_reference
}

function canMarkCashReceived(sale: Sale) {
  return sale.status === 'pending' && sale.payment_method === 'cash'
}

export default function SalesHistoryPage() {
  const { ally } = useAlly()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [markingReceivedId, setMarkingReceivedId] = useState<string | null>(null)

  // Refund modal state
  const [refundSale, setRefundSale] = useState<Sale | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refunding, setRefunding] = useState(false)

  const PAGE_SIZE = 20

  async function loadSales(pageNum: number, append = false) {
    if (!ally) return
    const supabase = createClient()
    const from = (pageNum - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('ally_sales')
      .select(`
        id, order_number, customer_name, customer_phone, customer_email,
        payment_method, payment_reference, subtotal, total, commission_amount,
        status, sale_date,
        ally_sale_items(id, product_name, variant_title, quantity, unit_price, total_price)
      `)
      .eq('ally_id', ally.id)
      .order('sale_date', { ascending: false })
      .range(from, to)

    if (error) {
      toast.error('Failed to load sales history')
      return
    }

    const rows = (data ?? []) as Sale[]
    setHasMore(rows.length === PAGE_SIZE)
    setSales((prev) => append ? [...prev, ...rows] : rows)
  }

  useEffect(() => {
    if (!ally) return
    setLoading(true)
    loadSales(1).finally(() => setLoading(false))
  }, [ally])

  async function loadMore() {
    const next = page + 1
    setLoadingMore(true)
    await loadSales(next, true)
    setPage(next)
    setLoadingMore(false)
  }

  async function handleMarkCashReceived(saleId: string) {
    setMarkingReceivedId(saleId)
    const result = await markCashReceived(saleId)
    setMarkingReceivedId(null)
    if (!result.success) {
      toast.error('Failed to update sale', { description: result.error })
      return
    }
    toast.success('Cash payment marked as received')
    setSales((prev) => prev.map((s) => s.id === saleId ? { ...s, status: 'completed' } : s))
  }

  function openRefundModal(sale: Sale) {
    setRefundSale(sale)
    setRefundAmount(sale.total.toString())
    setRefundReason('')
  }

  function closeRefundModal() {
    setRefundSale(null)
    setRefundAmount('')
    setRefundReason('')
  }

  async function handleRefund() {
    if (!refundSale) return
    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0 || amount > Number(refundSale.total)) {
      toast.error('Enter a valid refund amount')
      return
    }
    setRefunding(true)
    const result = await refundAllySale(refundSale.id, amount, refundReason || undefined)
    setRefunding(false)
    if (!result.success) {
      toast.error('Refund failed', { description: result.error })
      return
    }
    toast.success('Refund processed successfully')
    setSales((prev) => prev.map((s) => s.id === refundSale.id ? { ...s, status: 'refunded' } : s))
    closeRefundModal()
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Link href="/sales" className="w-9 h-9 rounded-md border border-slate-200 dark:border-neutral-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="text-sm tracking-[0.15em] uppercase">Sales History</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      ) : sales.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-neutral-400">No sales recorded yet.</p>
          <Link href="/sales" className="mt-4 inline-block text-xs tracking-[0.15em] uppercase underline text-neutral-500 hover:text-neutral-700">
            Record your first sale
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                  className="w-full px-4 py-4 text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-mono text-neutral-500">{sale.order_number}</p>
                      <p className="text-sm font-medium mt-0.5">{sale.customer_name ?? 'Guest'}</p>
                    </div>
                    <span className={`text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[sale.status]}`}>
                      {STATUS_LABELS[sale.status]}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-400">{formatDate(sale.sale_date)} · {sale.payment_method === 'bank_transfer' ? 'Bank' : sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}</span>
                    <span className="text-sm font-semibold">{formatCurrency(sale.total)}</span>
                  </div>
                </button>
                {expandedId === sale.id && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-neutral-800 pt-3">
                    <div className="space-y-1.5 mb-3">
                      {sale.ally_sale_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                          <span>{item.product_name}{item.variant_title ? ` (${item.variant_title})` : ''} × {item.quantity}</span>
                          <span>{formatCurrency(item.total_price)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-neutral-400 border-t border-slate-100 dark:border-neutral-800 pt-2">
                      <span>Commission</span>
                      <span>{formatCurrency(sale.commission_amount)}</span>
                    </div>
                    {canMarkCashReceived(sale) && (
                      <button
                        onClick={() => handleMarkCashReceived(sale.id)}
                        disabled={markingReceivedId === sale.id}
                        className="mt-3 w-full py-2 rounded-md border border-green-200 dark:border-green-900/50 text-xs text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors tracking-[0.1em] uppercase disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {markingReceivedId === sale.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        Mark Cash Received
                      </button>
                    )}
                    {canRefund(sale) && (
                      <button onClick={() => openRefundModal(sale)}
                        className="mt-3 w-full py-2 rounded-md border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors tracking-[0.1em] uppercase">
                        Refund
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-neutral-800">
                  {['Order #', 'Date', 'Customer', 'Items', 'Total', 'Method', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-[10px] tracking-[0.2em] uppercase text-neutral-400 px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-neutral-800">
                {sales.flatMap((sale) => {
                  const rows = [
                    <tr
                      key={sale.id}
                      onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                      className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-neutral-500">{sale.order_number}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500 whitespace-nowrap">{formatDate(sale.sale_date)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[120px] md:max-w-[160px] lg:max-w-[200px]">{sale.customer_name ?? 'Guest'}</p>
                        {sale.customer_phone && <p className="text-xs text-neutral-400 truncate">{sale.customer_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{sale.ally_sale_items.length}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{formatCurrency(sale.total)}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500 capitalize">
                        {sale.payment_method === 'bank_transfer' ? 'Bank' : sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[sale.status]}`}>
                          {STATUS_LABELS[sale.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canMarkCashReceived(sale) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkCashReceived(sale.id) }}
                            disabled={markingReceivedId === sale.id}
                            className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 underline disabled:opacity-50 flex items-center gap-1"
                          >
                            {markingReceivedId === sale.id && <Loader2 className="w-3 h-3 animate-spin" />}
                            Received
                          </button>
                        ) : canRefund(sale) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); openRefundModal(sale) }}
                            className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline"
                          >
                            Refund
                          </button>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-700">—</span>
                        )}
                      </td>
                    </tr>,
                  ]
                  if (expandedId === sale.id) {
                    rows.push(
                      <tr key={`${sale.id}-items`}>
                        <td colSpan={8} className="px-4 pb-4 pt-0 bg-slate-50 dark:bg-neutral-800/50">
                          <div className="space-y-1.5 mt-2">
                            {sale.ally_sale_items.map((item) => (
                              <div key={item.id} className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                                <span>{item.product_name}{item.variant_title ? ` (${item.variant_title})` : ''} × {item.quantity}</span>
                                <span>{formatCurrency(item.total_price)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-xs text-neutral-400 border-t border-slate-200 dark:border-neutral-700 pt-2 mt-2">
                              <span>Commission earned</span>
                              <span>{formatCurrency(sale.commission_amount)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  }
                  return rows
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button onClick={loadMore} disabled={loadingMore}
                className="px-6 py-2.5 rounded-md border border-slate-200 dark:border-neutral-800 text-xs tracking-[0.15em] uppercase hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto">
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Load More
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Refund modal ──────────────────────────────────────────────────── */}
      {refundSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold tracking-[0.1em] uppercase">Refund {refundSale.order_number}</h3>
              <button onClick={closeRefundModal} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Refund Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">GH₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundSale.total}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Maximum: {formatCurrency(refundSale.total)}</p>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Reason <span className="normal-case tracking-normal">(optional)</span></label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for refund"
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
                />
              </div>

              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 px-3 py-2.5 flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">This will initiate a Paystack refund. The customer will receive the money back to their original payment method.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeRefundModal}
                className="flex-1 py-2.5 rounded-md border border-slate-200 dark:border-neutral-800 text-xs tracking-[0.1em] uppercase hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleRefund} disabled={refunding}
                className="flex-1 py-2.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs tracking-[0.1em] uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {refunding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {refunding ? 'Processing…' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
