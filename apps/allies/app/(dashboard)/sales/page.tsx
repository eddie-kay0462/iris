'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, Minus, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAlly } from '@/lib/ally-context'

type Customer = { id: string; first_name: string | null; last_name: string | null; email: string; phone_number: string | null }
type Variant = { id: string; option1_value: string | null; option2_value: string | null; option3_value: string | null; price: number; sku: string | null; inventory_quantity: number }
type Product = { id: string; title: string; base_price: number; variants: Variant[] }
type LineItem = { variantId: string; productId: string; productName: string; variantTitle: string; unitPrice: number; quantity: number }

type PaymentMethod = 'cash' | 'momo' | 'bank_transfer'

function formatCurrency(n: number) {
  return `GH₵ ${n.toFixed(2)}`
}

export default function SalesPage() {
  const { ally } = useAlly()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Load products on mount
  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select(`id, title, base_price, product_variants(id, option1_value, option2_value, option3_value, price, sku, inventory_quantity)`)
        .eq('published', true)
        .is('deleted_at', null)
        .order('title')
      setProducts(
        (data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          base_price: p.base_price,
          variants: p.product_variants ?? [],
        }))
      )
    }
    loadProducts()
  }, [])

  // Search customers with debounce
  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomers([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`)
      .limit(8)
    setCustomers(data ?? [])
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerSearch), 300)
    return () => clearTimeout(t)
  }, [customerSearch, searchCustomers])

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(productSearch.toLowerCase())
  )

  function getVariantLabel(v: Variant) {
    return [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / ') || 'Default'
  }

  function addProduct(product: Product) {
    const variant = product.variants[0]
    if (!variant) return
    setLineItems((prev) => [
      ...prev,
      {
        variantId: variant.id,
        productId: product.id,
        productName: product.title,
        variantTitle: getVariantLabel(variant),
        unitPrice: variant.price ?? product.base_price,
        quantity: 1,
      },
    ])
  }

  function changeVariant(index: number, variantId: string, product: Product) {
    const variant = product.variants.find((v) => v.id === variantId)
    if (!variant) return
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, variantId: variant.id, variantTitle: getVariantLabel(variant), unitPrice: variant.price ?? product.base_price }
          : item
      )
    )
  }

  function updateQty(index: number, delta: number) {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    )
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const commissionRate = ally?.commission_rate ?? 0.15
  const commission = subtotal * commissionRate

  async function handleSubmit() {
    if (!ally || lineItems.length === 0) return
    setSubmitting(true)

    const supabase = createClient()
    const customerName = selectedCustomer
      ? [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ')
      : null

    const { data: sale, error } = await supabase
      .from('ally_sales')
      .insert({
        ally_id: ally.id,
        customer_name: customerName,
        customer_phone: selectedCustomer?.phone_number ?? null,
        customer_email: selectedCustomer?.email ?? null,
        payment_method: paymentMethod,
        subtotal,
        total: subtotal,
        commission_amount: commission,
        notes: notes.trim() || null,
        status: 'completed',
      })
      .select('id')
      .single()

    if (error || !sale) { setSubmitting(false); alert('Error recording sale: ' + error?.message); return }

    await supabase.from('ally_sale_items').insert(
      lineItems.map((item) => ({
        sale_id: sale.id,
        product_id: item.productId,
        product_name: item.productName,
        variant_title: item.variantTitle,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        total_price: item.unitPrice * item.quantity,
      }))
    )

    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-lg font-semibold uppercase tracking-wide mb-2">Sale Recorded</h2>
        <p className="text-sm text-neutral-500 mb-2">Commission: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(commission)}</span></p>
        <p className="text-xs text-neutral-400 mb-8">({(commissionRate * 100).toFixed(0)}% of {formatCurrency(subtotal)})</p>
        <div className="flex flex-col md:flex-row gap-3">
          <button onClick={() => { setSubmitted(false); setLineItems([]); setSelectedCustomer(null); setCustomerSearch(''); setNotes('') }}
            className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black text-xs tracking-[0.2em] uppercase hover:bg-neutral-800 transition-colors">
            Record Another
          </button>
          <Link href="/" className="px-8 py-3 border border-neutral-300 dark:border-neutral-700 text-xs tracking-[0.2em] uppercase hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-center">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Link href="/" className="w-9 h-9 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="text-sm tracking-[0.15em] uppercase">Record a Sale</h2>
      </div>

      {/* Layout: single col on mobile, 2-col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Left — Customer + Products */}
        <div className="space-y-4 md:space-y-6">
          {/* Customer Search */}
          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 md:p-6">
            <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-3">Customer (Optional)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name, email or phone"
                value={selectedCustomer ? [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ') : customerSearch}
                onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerDropdown(true) }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full pl-10 pr-8 py-2.5 border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              {selectedCustomer && (
                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-neutral-400" />
                </button>
              )}
              {showCustomerDropdown && !selectedCustomer && customers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 max-h-48 overflow-y-auto shadow-sm">
                  {customers.map((c) => (
                    <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false) }}
                      className="w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
                      <p className="text-sm font-medium">{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}</p>
                      <p className="text-xs text-neutral-500">{c.phone_number ?? c.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product Search & Add */}
          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 md:p-6">
            <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-3">Add Items</label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="text" placeholder="Search products" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white" />
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {filteredProducts.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors flex justify-between items-center">
                  <span className="text-sm font-medium">{p.title}</span>
                  <span className="text-sm text-neutral-500 ml-2 shrink-0">GH₵ {p.base_price}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">No products found</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 md:p-6">
              <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-3">Items in Order</label>
              <div className="space-y-4">
                {lineItems.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId)
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-2 truncate">{item.productName}</p>
                        <div className="flex flex-wrap gap-2">
                          {product && product.variants.length > 1 && (
                            <select value={item.variantId} onChange={(e) => changeVariant(index, e.target.value, product)}
                              className="px-2 py-1 border border-neutral-200 dark:border-neutral-800 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white">
                              {product.variants.map((v) => (
                                <option key={v.id} value={v.id}>{getVariantLabel(v)}</option>
                              ))}
                            </select>
                          )}
                          <div className="flex items-center border border-neutral-200 dark:border-neutral-800">
                            <button onClick={() => updateQty(index, -1)} className="px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800"><Minus className="w-3 h-3" /></button>
                            <span className="px-3 text-sm">{item.quantity}</span>
                            <button onClick={() => updateQty(index, 1)} className="px-2 py-1 hover:bg-neutral-50 dark:hover:bg-neutral-800"><Plus className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">{formatCurrency(item.unitPrice * item.quantity)}</p>
                        <button onClick={() => removeItem(index)} className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1">Remove</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right — Order Summary */}
        <div>
          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 md:p-6 md:sticky md:top-6">
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-4">Order Summary</h3>

            {lineItems.length === 0 ? (
              <p className="text-sm text-neutral-400 py-4 text-center">No items added yet</p>
            ) : (
              <div className="mb-5 space-y-2">
                {lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400 truncate mr-2">{item.productName} ({item.variantTitle}) × {item.quantity}</span>
                    <span className="shrink-0">{formatCurrency(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-neutral-100 dark:border-neutral-800 pt-2">
                <span className="text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  Your Commission ({(commissionRate * 100).toFixed(0)}%)
                </span>
                <span className="font-bold text-base text-neutral-900 dark:text-neutral-100">{formatCurrency(commission)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-5">
              <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-3">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'momo', 'bank_transfer'] as PaymentMethod[]).map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`py-2.5 text-[10px] tracking-[0.1em] uppercase border transition-colors ${
                      paymentMethod === m
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}>
                    {m === 'bank_transfer' ? 'Bank' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-2">Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any additional notes"
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white resize-none" />
            </div>

            <button
              onClick={handleSubmit}
              disabled={lineItems.length === 0 || submitting}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? 'Recording...' : 'Confirm Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
