'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Plus, Minus, ArrowLeft, X, UserPlus, AlertCircle, RotateCw, Loader2, Copy, CheckCheck } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import PhoneInput from '@/components/PhoneInput'
import { toast } from 'sonner'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAlly } from '@/lib/ally-context'
import {
  searchCustomers,
  createCustomer,
  chargeAllyMomo,
  submitAllyOtp,
  verifyAllyPayment,
  createAllyVirtualAccount,
  notifyAllySaleConfirmed,
} from './actions'

type Customer = { id: string; first_name: string | null; last_name: string | null; email: string | null; phone_number: string | null; is_activated: boolean; invited_at: string | null }
type Variant = { id: string; option1_value: string | null; option2_value: string | null; option3_value: string | null; price: number | null; sku: string | null; inventory_quantity: number }
type Product = { id: string; title: string; base_price: number | null; variants: Variant[] }
type LineItem = { variantId: string; productId: string; productName: string; variantTitle: string; unitPrice: number; quantity: number }

type PaymentMethod = 'cash' | 'momo' | 'bank_transfer'
type MomoProvider = 'mtn' | 'vod' | 'tgo'

function detectGhanaNetwork(e164: string): MomoProvider | null {
  // Strip +233 or leading 0, then read the 2-digit prefix
  let local = e164
  if (local.startsWith('+233')) local = local.slice(4)
  else if (local.startsWith('0')) local = local.slice(1)
  if (local.length < 2) return null
  const prefix = local.slice(0, 2)
  if (['24', '54', '55', '59', '25'].includes(prefix)) return 'mtn'
  if (['20', '50'].includes(prefix)) return 'vod'
  if (['26', '56', '27', '57'].includes(prefix)) return 'tgo'
  return null
}
type PaymentFlowState = 'idle' | 'submitting' | 'charging' | 'awaiting_pin' | 'awaiting_otp' | 'submitting_otp' | 'creating_va' | 'awaiting_transfer' | 'confirmed' | 'failed'

function formatCurrency(n: number) {
  return `GH₵ ${n.toFixed(2)}`
}

function resolvePrice(variantPrice: number | null, basePrice: number | null): number {
  return variantPrice ?? basePrice ?? 0
}

function customerDisplayName(c: Customer) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.phone_number || 'Customer'
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="ml-2 text-neutral-400 hover:text-white transition-colors">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export default function SalesPage() {
  const { ally } = useAlly()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ first_name: '', last_name: '', email: '', phone_number: '' })
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [customerError, setCustomerError] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [momoPhone, setMomoPhone] = useState('')
  const [momoProvider, setMomoProvider] = useState<MomoProvider>('mtn')
  const [notes, setNotes] = useState('')
  const [showCustomerRequired, setShowCustomerRequired] = useState(false)
  const [periodTotal, setPeriodTotal] = useState(0)
  const [globalQuota, setGlobalQuota] = useState(0)
  const [globalRate, setGlobalRate] = useState(0.15)
  const [quotaPeriod, setQuotaPeriod] = useState<'monthly' | 'all_time'>('monthly')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [paymentFlowState, setPaymentFlowState] = useState<PaymentFlowState>('idle')
  const [paymentError, setPaymentError] = useState('')
  const [activeSaleId, setActiveSaleId] = useState<string | null>(null)
  const [virtualAccount, setVirtualAccount] = useState<{ accountNumber: string; bankName: string; accountName: string } | null>(null)
  const [finalCommissionForModal, setFinalCommissionForModal] = useState(0)
  const [cashReceived, setCashReceived] = useState(true)
  const [otpValue, setOtpValue] = useState('')
  const [submittingOtp, setSubmittingOtp] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load quota progress and global commission settings
  useEffect(() => {
    if (!ally) return
    async function loadQuotaData() {
      const supabase = createClient()
      const { data: settings } = await supabase
        .from('commission_settings')
        .select('default_quota, default_rate, period')
        .single()
      const period: 'monthly' | 'all_time' = settings?.period ?? 'monthly'
      const now = new Date()
      const periodStart = period === 'all_time'
        ? new Date(0).toISOString()
        : new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: sales } = await supabase
        .from('ally_sales')
        .select('total')
        .eq('ally_id', ally!.id)
        .gte('sale_date', periodStart)
      setPeriodTotal((sales ?? []).reduce((s, r) => s + Number(r.total), 0))
      setGlobalQuota(Number(settings?.default_quota ?? 0))
      setGlobalRate(Number(settings?.default_rate ?? 0.15))
      setQuotaPeriod(period)
    }
    loadQuotaData()
  }, [ally])

  function handleMomoPhoneChange(e164: string) {
    setMomoPhone(e164)
    const detected = detectGhanaNetwork(e164)
    if (detected) setMomoProvider(detected)
  }

  // Pre-fill MoMo phone when customer or payment method changes
  useEffect(() => {
    if (paymentMethod === 'momo' && selectedCustomer?.phone_number) {
      const phone = selectedCustomer.phone_number
      setMomoPhone(phone)
      const detected = detectGhanaNetwork(phone)
      if (detected) setMomoProvider(detected)
    }
  }, [selectedCustomer, paymentMethod])

  // Fetch products
  const refreshProducts = useCallback(async () => {
    setIsRefreshing(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select(`id, title, base_price, product_variants(id, option1_value, option2_value, option3_value, price, sku, inventory_quantity)`)
      .eq('published', true)
      .is('deleted_at', null)
      .order('title')
    const freshProducts = (data ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      base_price: p.base_price,
      variants: p.product_variants ?? [],
    }))
    setProducts(freshProducts)
    setLineItems((prev) =>
      prev.map((item) => {
        const product = freshProducts.find((p) => p.id === item.productId)
        if (!product) return item
        const variant = product.variants.find((v: Variant) => v.id === item.variantId)
        if (!variant) return item
        return { ...item, unitPrice: resolvePrice(variant.price, product.base_price) }
      })
    )
    setLastRefreshedAt(new Date())
    setIsRefreshing(false)
  }, [])

  useEffect(() => { refreshProducts() }, [refreshProducts])
  useEffect(() => {
    const interval = setInterval(refreshProducts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refreshProducts])

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomers([]); return }
    const results = await searchCustomers(q)
    setCustomers(results)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => runSearch(customerSearch), 300)
    return () => clearTimeout(t)
  }, [customerSearch, runSearch])

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(productSearch.toLowerCase())
  )

  function getVariantLabel(v: Variant) {
    return [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / ') || 'Default'
  }

  function addProduct(product: Product) {
    const variant = product.variants[0]
    if (!variant) return
    setLineItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.variantId === variant.id)
      if (existingIndex !== -1) {
        return prev.map((item, i) => i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, {
        variantId: variant.id,
        productId: product.id,
        productName: product.title,
        variantTitle: getVariantLabel(variant),
        unitPrice: resolvePrice(variant.price, product.base_price),
        quantity: 1,
      }]
    })
  }

  function changeVariant(index: number, variantId: string, product: Product) {
    const variant = product.variants.find((v) => v.id === variantId)
    if (!variant) return
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, variantId: variant.id, variantTitle: getVariantLabel(variant), unitPrice: resolvePrice(variant.price, product.base_price) }
          : item
      )
    )
  }

  function updateQty(index: number, delta: number) {
    setLineItems((prev) =>
      prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item)
    )
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function confirmNewCustomer() {
    const hasName = newCustomer.first_name.trim() || newCustomer.last_name.trim()
    const hasContact = newCustomer.phone_number.trim() || newCustomer.email.trim()
    if (!hasName && !hasContact) { setCustomerError('Enter at least a name or contact detail.'); return }
    setCustomerError('')
    setSavingCustomer(true)
    const result = await createCustomer(newCustomer)
    setSavingCustomer(false)
    if (!result) { setCustomerError('Could not save customer. Please try again.'); return }
    setSelectedCustomer(result)
    setInviteSent(!!result.email && !!result.invited_at)
    setShowNewCustomerForm(false)
    setShowCustomerDropdown(false)
    setShowCustomerRequired(false)
  }

  function clearCustomer() {
    setSelectedCustomer(null)
    setCustomerSearch('')
    setShowNewCustomerForm(false)
    setCustomerError('')
    setInviteSent(false)
    setNewCustomer({ first_name: '', last_name: '', email: '', phone_number: '' })
  }

  function handlePaymentMethodChange(m: PaymentMethod) {
    setPaymentMethod(m)
    if (m === 'momo' && selectedCustomer?.phone_number) {
      const phone = selectedCustomer.phone_number
      setMomoPhone(phone)
      const detected = detectGhanaNetwork(phone)
      if (detected) setMomoProvider(detected)
    }
  }

  const subtotal = lineItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const commissionRate = ally?.commission_rate ?? globalRate
  const commissionQuota = ally?.commission_quota ?? globalQuota

  function calcCommission(saleAmount: number, cumulativeBefore: number, quota: number, rate: number) {
    if (quota === 0) return saleAmount * rate
    if (cumulativeBefore >= quota) return saleAmount * rate
    const portionAbove = (cumulativeBefore + saleAmount) - quota
    if (portionAbove <= 0) return 0
    return portionAbove * rate
  }

  const commission = calcCommission(subtotal, periodTotal, commissionQuota, commissionRate)
  const quotaProgress = commissionQuota > 0 ? Math.min(periodTotal / commissionQuota, 1) : 1
  const quotaUnlocked = commissionQuota === 0 || periodTotal >= commissionQuota

  function startPoll(saleId: string, intervalMs: number, maxAttempts: number) {
    if (pollRef.current) clearInterval(pollRef.current)
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      const result = await verifyAllyPayment(saleId)
      if (result.confirmed) {
        clearInterval(pollRef.current!)
        pollRef.current = null
        setPaymentFlowState('confirmed')
      } else if (attempts >= maxAttempts) {
        clearInterval(pollRef.current!)
        pollRef.current = null
        setPaymentFlowState('failed')
        setPaymentError('Payment timed out. Please check with the customer and try again.')
      }
    }, intervalMs)
  }

  async function handleOtpSubmit() {
    if (!activeSaleId || !otpValue.trim()) return
    setSubmittingOtp(true)
    setPaymentFlowState('submitting_otp')
    const result = await submitAllyOtp(activeSaleId, otpValue.trim())
    setSubmittingOtp(false)
    if (!result.success) {
      setPaymentFlowState('awaiting_otp')
      toast.error('OTP failed', { description: result.error })
      return
    }
    if (result.paystackStatus === 'success') {
      setPaymentFlowState('confirmed')
      return
    }
    // OTP accepted but payment still processing — switch to polling
    setPaymentFlowState('awaiting_pin')
    startPoll(activeSaleId, 3000, 40)
  }

  async function cancelPayment() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (activeSaleId) {
      const supabase = createClient()
      await supabase.from('ally_sales').update({ status: 'pending' }).eq('id', activeSaleId)
    }
    setPaymentFlowState('idle')
    setActiveSaleId(null)
    setVirtualAccount(null)
    setPaymentError('')
  }

  async function handleSubmit() {
    if (!ally || lineItems.length === 0) return
    if (!selectedCustomer) {
      setShowCustomerRequired(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (paymentMethod === 'momo' && !momoPhone) {
      toast.error('Enter the customer\'s MoMo number')
      return
    }

    setPaymentFlowState('submitting')
    const supabase = createClient()

    const now = new Date()
    const submitPeriodStart = quotaPeriod === 'all_time'
      ? new Date(0).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { data: currentSales } = await supabase
      .from('ally_sales')
      .select('total')
      .eq('ally_id', ally.id)
      .gte('sale_date', submitPeriodStart)
    const latestCumulative = (currentSales ?? []).reduce((s, r) => s + Number(r.total), 0)
    const finalCommission = calcCommission(subtotal, latestCumulative, commissionQuota, commissionRate)
    setFinalCommissionForModal(finalCommission)

    const status = paymentMethod === 'cash' ? (cashReceived ? 'completed' : 'pending') : 'awaiting_payment'

    const { data: sale, error } = await supabase
      .from('ally_sales')
      .insert({
        ally_id: ally.id,
        customer_name: customerDisplayName(selectedCustomer),
        customer_phone: selectedCustomer.phone_number ?? null,
        customer_email: selectedCustomer.email ?? null,
        payment_method: paymentMethod,
        subtotal,
        total: subtotal,
        commission_amount: finalCommission,
        notes: notes.trim() || null,
        status,
        brand: ally.brand ?? '1NRI',
      })
      .select('id')
      .single()

    if (error || !sale) {
      setPaymentFlowState('idle')
      toast.error('Error recording sale', { description: error?.message, duration: 6000 })
      return
    }

    setActiveSaleId(sale.id)

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

    if (paymentMethod === 'cash') {
      if (cashReceived && selectedCustomer?.email) {
        void notifyAllySaleConfirmed(sale.id)
      }
      setPaymentFlowState('confirmed')
      return
    }

    if (paymentMethod === 'momo') {
      setPaymentFlowState('charging')
      const result = await chargeAllyMomo(sale.id, momoPhone, momoProvider)
      if (!result.success) {
        setPaymentFlowState('failed')
        setPaymentError(result.error ?? 'Charge failed. Please try again.')
        return
      }
      if (result.paystackStatus === 'send_otp') {
        // Paystack sent an OTP to the customer's phone — collect it and submit
        setOtpValue('')
        setPaymentFlowState('awaiting_otp')
      } else {
        // USSD prompt sent (pay_offline) — customer approves on their phone
        setPaymentFlowState('awaiting_pin')
        // Poll every 3s, max 2 minutes (40 attempts)
        startPoll(sale.id, 3000, 40)
      }
      return
    }

    if (paymentMethod === 'bank_transfer') {
      setPaymentFlowState('creating_va')
      const result = await createAllyVirtualAccount(
        sale.id,
        selectedCustomer.first_name ?? customerDisplayName(selectedCustomer).split(' ')[0],
        (selectedCustomer.last_name ?? customerDisplayName(selectedCustomer).split(' ').slice(1).join(' ')) || (selectedCustomer.first_name ?? ''),
        selectedCustomer.email ?? undefined,
      )
      if (!result.success) {
        setPaymentFlowState('failed')
        setPaymentError(result.error ?? 'Could not create virtual account.')
        return
      }
      setVirtualAccount(result.account!)
      setPaymentFlowState('awaiting_transfer')
      // Poll every 5s, max 10 minutes (120 attempts)
      startPoll(sale.id, 5000, 120)
    }
  }

  function resetForm() {
    setPaymentFlowState('idle')
    setLineItems([])
    setSelectedCustomer(null)
    setCustomerSearch('')
    setNotes('')
    setInviteSent(false)
    setNewCustomer({ first_name: '', last_name: '', email: '', phone_number: '' })
    setShowCustomerRequired(false)
    setActiveSaleId(null)
    setVirtualAccount(null)
    setMomoPhone('')
    setOtpValue('')
    setPaymentError('')
    setCashReceived(true)
  }

  const selectedCustomerLabel = selectedCustomer ? customerDisplayName(selectedCustomer) : ''
  const isSubmitting = paymentFlowState !== 'idle'

  // ── Success view ───────────────────────────────────────────────────────────
  if (paymentFlowState === 'confirmed') {
    const cashPending = paymentMethod === 'cash' && !cashReceived
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 text-center">
        <div className="text-4xl mb-4">{cashPending ? '○' : '✓'}</div>
        <h2 className="text-lg font-semibold uppercase tracking-wide mb-2">
          {cashPending ? 'Sale Recorded — Cash Pending' : 'Sale Recorded'}
        </h2>
        {cashPending && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">Mark as received in Sales History once you collect payment.</p>
        )}
        {selectedCustomer && (
          <p className="text-xs text-neutral-400 mb-3">Customer: <span className="text-neutral-700 dark:text-neutral-300 font-medium">{selectedCustomerLabel}</span></p>
        )}
        <p className="text-sm text-neutral-500 mb-2">Commission: <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatCurrency(finalCommissionForModal)}</span></p>
        <p className="text-xs text-neutral-400 mb-8">
          {finalCommissionForModal > 0
            ? `${(commissionRate * 100).toFixed(0)}% on qualifying amount`
            : commissionQuota > 0
              ? `Quota not yet reached — ${formatCurrency(Math.max(commissionQuota - periodTotal - subtotal, 0))} remaining`
              : `${(commissionRate * 100).toFixed(0)}% of ${formatCurrency(subtotal)}`}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={resetForm}
            className="px-8 py-3 rounded-md bg-black dark:bg-white text-white dark:text-black text-xs tracking-[0.2em] uppercase hover:bg-neutral-800 transition-colors">
            Record Another
          </button>
          <Link href="/" className="px-8 py-3 rounded-md border border-slate-200 dark:border-neutral-700 text-xs tracking-[0.2em] uppercase hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors text-center">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Link href="/" className="w-9 h-9 rounded-md border border-slate-200 dark:border-neutral-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h2 className="text-sm tracking-[0.15em] uppercase">Record a Sale</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Left — Customer + Products */}
        <div className="space-y-4 md:space-y-6">
          {/* Customer */}
          <div className={`rounded-lg bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-6 border ${showCustomerRequired && !selectedCustomer ? 'border-red-400' : 'border-slate-200 dark:border-neutral-800'}`}>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400">Customer <span className="text-red-500">*</span></label>
              {showCustomerRequired && !selectedCustomer && (
                <span className="flex items-center gap-1 text-[10px] text-red-500">
                  <AlertCircle className="w-3 h-3" /> Required
                </span>
              )}
            </div>

            {showNewCustomerForm ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">First Name</label>
                    <input type="text" value={newCustomer.first_name} onChange={(e) => setNewCustomer((p) => ({ ...p, first_name: e.target.value }))} placeholder="First name"
                      className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Last Name</label>
                    <input type="text" value={newCustomer.last_name} onChange={(e) => setNewCustomer((p) => ({ ...p, last_name: e.target.value }))} placeholder="Last name"
                      className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Phone <span className="text-neutral-300">(recommended)</span></label>
                  <PhoneInput value={newCustomer.phone_number} onChange={(e164) => setNewCustomer((p) => ({ ...p, phone_number: e164 }))} />
                </div>
                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">Email <span className="text-neutral-300">(optional)</span></label>
                  <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))} placeholder="customer@example.com"
                    className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
                </div>
                {customerError && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{customerError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={confirmNewCustomer} disabled={savingCustomer}
                    className="flex-1 py-2 rounded-md bg-black dark:bg-white text-white dark:text-black text-xs tracking-[0.15em] uppercase hover:bg-neutral-800 transition-colors disabled:opacity-50">
                    {savingCustomer ? 'Saving...' : 'Save & use customer'}
                  </button>
                  <button onClick={() => { setShowNewCustomerForm(false); setCustomerError(''); setNewCustomer({ first_name: '', last_name: '', email: '', phone_number: '' }) }}
                    className="px-4 py-2 rounded-md border border-slate-200 dark:border-neutral-800 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input type="text" placeholder="Search by name, email or phone"
                  value={selectedCustomer ? selectedCustomerLabel : customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerDropdown(true); setShowCustomerRequired(false) }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
                {selectedCustomer && (
                  <button onClick={clearCustomer} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-neutral-400" />
                  </button>
                )}
                {showCustomerDropdown && !selectedCustomer && (
                  <div className="absolute z-10 w-full mt-1 rounded-md border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md">
                    {customers.length > 0 ? (
                      <>
                        {customers.map((c) => (
                          <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); setShowCustomerRequired(false) }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-neutral-800 border-b border-slate-100 dark:border-neutral-800 last:border-b-0">
                            <p className="text-sm font-medium">{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}</p>
                            <p className="text-xs text-neutral-500">{c.phone_number ?? c.email}</p>
                          </button>
                        ))}
                        <button onClick={() => { setShowNewCustomerForm(true); setShowCustomerDropdown(false) }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-500 border-t border-slate-100 dark:border-neutral-800">
                          <UserPlus className="w-3.5 h-3.5" />
                          <span className="text-xs">Add new customer</span>
                        </button>
                      </>
                    ) : customerSearch.trim() ? (
                      <button onClick={() => { setShowNewCustomerForm(true); setShowCustomerDropdown(false) }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center gap-2">
                        <UserPlus className="w-3.5 h-3.5 text-neutral-400" />
                        <div>
                          <p className="text-sm font-medium">No results — add new customer</p>
                          <p className="text-xs text-neutral-400">Enter their details to save to the system</p>
                        </div>
                      </button>
                    ) : (
                      <button onClick={() => { setShowNewCustomerForm(true); setShowCustomerDropdown(false) }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center gap-2 text-neutral-500">
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="text-xs">Add new customer</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {selectedCustomer && !showNewCustomerForm && (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700">
                  <Avatar name={selectedCustomerLabel} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedCustomerLabel}</p>
                    <p className="text-xs text-neutral-500">{selectedCustomer.phone_number ?? selectedCustomer.email ?? 'No contact info'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {selectedCustomer.is_activated ? (
                      <span className="text-[10px] tracking-[0.1em] uppercase text-green-600 dark:text-green-400 font-medium">Activated</span>
                    ) : selectedCustomer.invited_at ? (
                      <span className="text-[10px] tracking-[0.1em] uppercase text-amber-600 dark:text-amber-400">Invite sent</span>
                    ) : selectedCustomer.email ? (
                      <span className="text-[10px] tracking-[0.1em] uppercase text-neutral-400">Not invited</span>
                    ) : null}
                    <button onClick={clearCustomer} className="text-neutral-400 hover:text-neutral-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {inviteSent && (
                  <p className="text-[10px] text-green-600 dark:text-green-400 px-1">
                    Invite email sent to {selectedCustomer.email}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Product Search & Add */}
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400">Add Items</label>
              <div className="flex items-center gap-2">
                {lastRefreshedAt && (
                  <span className="text-[10px] text-neutral-400">
                    {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <button onClick={refreshProducts} disabled={isRefreshing}
                  className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-50 transition-colors">
                  <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing' : 'Refresh'}
                </button>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input type="text" placeholder="Search products" value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white" />
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {filteredProducts.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)}
                  className="w-full px-4 py-3 rounded-md border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-left transition-colors flex justify-between items-center">
                  <span className="text-sm font-medium">{p.title}</span>
                  <span className="text-sm text-neutral-500 ml-2 shrink-0">{formatCurrency(p.base_price ?? 0)}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">No products found</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-4 md:p-6">
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
                              className="px-2 py-1 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white">
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
          <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm p-4 sm:p-5 md:p-6 md:sticky md:top-6">
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

            {/* Quota progress bar */}
            {commissionQuota > 0 && (
              <div className="mb-4 rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 p-3">
                <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-2">
                  <span>{quotaPeriod === 'all_time' ? 'All-time Sales Quota' : 'Monthly Sales Quota'}</span>
                  <span>{quotaUnlocked ? 'Unlocked' : `${formatCurrency(periodTotal)} / ${formatCurrency(commissionQuota)}`}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-neutral-700 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${quotaUnlocked ? 'bg-green-500' : 'bg-black dark:bg-white'}`}
                    style={{ width: `${quotaProgress * 100}%` }} />
                </div>
                {!quotaUnlocked && (
                  <p className="text-[10px] text-neutral-400 mt-1.5">
                    {formatCurrency(commissionQuota - periodTotal)} more to unlock {(commissionRate * 100).toFixed(0)}% commission
                  </p>
                )}
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-neutral-800 pt-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-100 dark:border-neutral-800 pt-2">
                <span className="text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  Your Commission ({(commissionRate * 100).toFixed(0)}%{commissionQuota > 0 && !quotaUnlocked && subtotal > 0 ? ' — partial' : ''})
                </span>
                <span className="font-bold text-base text-neutral-900 dark:text-neutral-100">{formatCurrency(commission)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-3">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'momo', 'bank_transfer'] as PaymentMethod[]).map((m) => (
                  <button key={m} onClick={() => handlePaymentMethodChange(m)}
                    className={`py-2.5 rounded-md text-[10px] tracking-[0.1em] uppercase border transition-colors ${
                      paymentMethod === m
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                        : 'border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'
                    }`}>
                    {m === 'bank_transfer' ? 'Bank' : m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash received checkbox */}
            {paymentMethod === 'cash' && (
              <div className="mb-4 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="cash-received"
                  checked={cashReceived}
                  onChange={(e) => setCashReceived(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-neutral-600 accent-black dark:accent-white cursor-pointer"
                />
                <label htmlFor="cash-received" className="text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                  Cash already received
                </label>
              </div>
            )}

            {/* MoMo details */}
            {paymentMethod === 'momo' && (
              <div className="mb-4 rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 p-3 space-y-3">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-2">Customer MoMo Number</label>
                  <PhoneInput value={momoPhone} onChange={handleMomoPhoneChange} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400">Network</label>
                    {momoPhone && detectGhanaNetwork(momoPhone) && (
                      <span className="text-[10px] text-neutral-400">Auto-detected</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([['mtn', 'MTN'], ['vod', 'Telecel'], ['tgo', 'AirtelTigo']] as [MomoProvider, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => setMomoProvider(val)}
                        className={`py-2 rounded-md text-[10px] tracking-[0.05em] uppercase border transition-colors ${
                          momoProvider === val
                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                            : 'border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bank transfer info */}
            {paymentMethod === 'bank_transfer' && (
              <div className="mb-4 rounded-md border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 p-3">
                <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-400 mb-1">Bank Transfer via Paystack</p>
                <p className="text-xs text-neutral-500">A virtual account will be generated. Share the account details with the customer to complete payment.</p>
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-[10px] tracking-[0.3em] uppercase text-neutral-400 mb-2">Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any additional notes"
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none" />
            </div>

            {showCustomerRequired && !selectedCustomer && (
              <p className="mb-3 text-xs text-red-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Please select or add a customer before confirming the sale.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={lineItems.length === 0 || isSubmitting}
              className="w-full rounded-md bg-black dark:bg-white text-white dark:text-black py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {paymentFlowState === 'submitting' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {paymentFlowState === 'submitting' ? 'Recording...' : 'Confirm Sale'}
            </button>
          </div>
        </div>
      </div>

      {/* ── MoMo modal (charging / awaiting OTP / awaiting PIN) ────────────── */}
      {(paymentFlowState === 'charging' || paymentFlowState === 'awaiting_pin' || paymentFlowState === 'awaiting_otp' || paymentFlowState === 'submitting_otp') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-neutral-900 p-8 shadow-2xl">
            {paymentFlowState === 'charging' && (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-neutral-400" />
                <p className="text-sm font-medium mb-1">Sending payment request…</p>
                <p className="text-xs text-neutral-500">Contacting Paystack</p>
              </div>
            )}

            {paymentFlowState === 'awaiting_pin' && (
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-600 dark:text-neutral-300" />
                </div>
                <h3 className="text-base font-semibold mb-2">Waiting for approval</h3>
                <p className="text-sm text-neutral-500 mb-1">The customer will receive a prompt on their phone.</p>
                <p className="text-xs text-neutral-400 mb-4">Ask them to enter their MoMo PIN to complete payment.</p>
                <p className="text-[10px] text-neutral-400 mb-6">Prompt not appearing? <button onClick={() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } setPaymentFlowState('awaiting_otp'); setOtpValue('') }} className="underline hover:text-neutral-600">Use OTP instead</button></p>
                <button onClick={cancelPayment} className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline">
                  Cancel Payment
                </button>
              </div>
            )}

            {(paymentFlowState === 'awaiting_otp' || paymentFlowState === 'submitting_otp') && (
              <div>
                <h3 className="text-base font-semibold mb-1">Enter OTP</h3>
                <p className="text-sm text-neutral-500 mb-5">The customer received a one-time code on their phone. Ask them for it.</p>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="OTP code"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  disabled={paymentFlowState === 'submitting_otp'}
                  className="w-full px-4 py-3 rounded-md border border-slate-200 dark:border-neutral-800 bg-transparent text-lg text-center tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white mb-4 disabled:opacity-50"
                />
                <button
                  onClick={handleOtpSubmit}
                  disabled={!otpValue.trim() || paymentFlowState === 'submitting_otp'}
                  className="w-full py-3 rounded-md bg-black dark:bg-white text-white dark:text-black text-xs tracking-[0.15em] uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
                >
                  {paymentFlowState === 'submitting_otp' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {paymentFlowState === 'submitting_otp' ? 'Verifying…' : 'Submit OTP'}
                </button>
                <button onClick={cancelPayment} className="w-full text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline">
                  Cancel Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Virtual account modal ──────────────────────────────────────────── */}
      {(paymentFlowState === 'creating_va' || paymentFlowState === 'awaiting_transfer') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-neutral-900 p-8 shadow-2xl">
            {paymentFlowState === 'creating_va' || !virtualAccount ? (
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-neutral-400" />
                <p className="text-sm font-medium">Generating virtual account…</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-semibold tracking-[0.1em] uppercase mb-1">Transfer {formatCurrency(subtotal)} to:</h3>
                <p className="text-xs text-neutral-500 mb-5">Share these details with the customer</p>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-neutral-800">
                    <span className="text-xs text-neutral-400">Bank</span>
                    <span className="text-sm font-medium">{virtualAccount.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-neutral-800">
                    <span className="text-xs text-neutral-400">Account No.</span>
                    <span className="text-sm font-medium flex items-center">
                      {virtualAccount.accountNumber}
                      <CopyButton text={virtualAccount.accountNumber} />
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-neutral-800">
                    <span className="text-xs text-neutral-400">Account Name</span>
                    <span className="text-sm font-medium">{virtualAccount.accountName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-center mb-6 text-xs text-neutral-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Waiting for transfer confirmation…
                </div>
                <button onClick={cancelPayment} className="w-full text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline">
                  Cancel Payment
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Payment failed modal ───────────────────────────────────────────── */}
      {paymentFlowState === 'failed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-neutral-900 p-8 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-semibold mb-2">Payment Failed</h3>
            <p className="text-sm text-neutral-500 mb-6">{paymentError || 'Something went wrong. The sale has been saved as pending.'}</p>
            <button onClick={cancelPayment}
              className="w-full py-3 rounded-md bg-black dark:bg-white text-white dark:text-black text-xs tracking-[0.15em] uppercase hover:bg-neutral-800 transition-colors">
              Back to Sale
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
