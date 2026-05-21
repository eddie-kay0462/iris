'use server'

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'https://1nri.store'

export type CustomerRecord = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_number: string | null
  is_activated: boolean
  invited_at: string | null
}

export async function searchCustomers(q: string): Promise<CustomerRecord[]> {
  if (!q.trim()) return []
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone_number, is_activated, invited_at')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`)
    .limit(8)
  return (data ?? []).map((r: any) => ({
    ...r,
    is_activated: r.is_activated ?? false,
    invited_at: r.invited_at ?? null,
  }))
}

export async function createCustomer(input: {
  first_name: string
  last_name: string
  email: string
  phone_number: string
}): Promise<CustomerRecord | null> {
  const supabase = getServiceClient()

  const email = input.email.trim() || null
  const phone = input.phone_number.trim() || null
  const firstName = input.first_name.trim() || null
  const lastName = input.last_name.trim() || null

  // Return existing profile rather than creating a duplicate
  if (email) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number, is_activated, invited_at')
      .eq('email', email)
      .maybeSingle()
    if (existing) return { ...existing, is_activated: existing.is_activated ?? false, invited_at: existing.invited_at ?? null }
  } else if (phone) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number, is_activated, invited_at')
      .eq('phone_number', phone)
      .maybeSingle()
    if (existing) return { ...existing, is_activated: existing.is_activated ?? false, invited_at: existing.invited_at ?? null }
  }

  // Email path: send Supabase invite so customer can create a storefront account
  if (email) {
    const { data: authData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { first_name: firstName, last_name: lastName },
      redirectTo: FRONTEND_URL,
    })

    let profileId: string

    if (!inviteError && authData?.user) {
      // Fresh invite sent — use the new auth user's UUID
      profileId = authData.user.id
    } else if (inviteError?.message?.toLowerCase().includes('already been registered') ||
               inviteError?.message?.toLowerCase().includes('user already registered')) {
      // User already has an auth account — find their UUID
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existingAuthUser = listData?.users?.find((u) => u.email === email)
      profileId = existingAuthUser?.id ?? crypto.randomUUID()
    } else {
      // Unexpected invite error — still capture customer without invite
      console.error('inviteUserByEmail error:', inviteError)
      profileId = crypto.randomUUID()
    }

    const invitedAt = (!inviteError && authData?.user) ? new Date().toISOString() : null

    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: profileId, first_name: firstName, last_name: lastName, email, phone_number: phone, invited_at: invitedAt })
      .select('id, first_name, last_name, email, phone_number, is_activated, invited_at')
      .single()

    if (error) {
      console.error('createCustomer insert error:', error)
      return null
    }
    return { ...data, is_activated: data.is_activated ?? false, invited_at: data.invited_at ?? null }
  }

  // Phone-only path: offline record, no invite possible
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: crypto.randomUUID(), first_name: firstName, last_name: lastName, email: null, phone_number: phone })
    .select('id, first_name, last_name, email, phone_number, is_activated, invited_at')
    .single()

  if (error) {
    console.error('createCustomer insert error:', error)
    return null
  }
  return { ...data, is_activated: data.is_activated ?? false, invited_at: data.invited_at ?? null }
}

// ── Email confirmation ────────────────────────────────────────────────────────

async function sendAllySaleConfirmation(saleId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Iris <orders@getiris.co>'
  if (!apiKey) return

  const supabase = getServiceClient()
  const { data: sale } = await supabase
    .from('ally_sales')
    .select('customer_email, customer_name, order_number, subtotal, total, brand')
    .eq('id', saleId)
    .single()

  if (!sale?.customer_email) return

  const { data: items } = await supabase
    .from('ally_sale_items')
    .select('product_name, variant_title, quantity, total_price')
    .eq('sale_id', saleId)

  const symbol = 'GH₵'
  const brandName = sale.brand || '1NRI'
  const greeting = sale.customer_name ? `Hi ${sale.customer_name.split(' ')[0]},` : 'Hi,'

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'https://1nri.store'
  const brandHeader =
    brandName === 'Unlikely Alliances'
      ? `<p style="margin:0;font-size:20px;font-weight:700;color:#fff;font-family:Helvetica,Arial,sans-serif;letter-spacing:0.5px;">Unlikely Alliances</p>`
      : `<img src="${frontendUrl}/homepage_img/no-bg-1NRI.png" alt="1NRI" height="36" style="display:block;border:0;height:36px;width:auto;">`

  const itemRows = (items ?? [])
    .map(
      (item: any) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;">
          ${item.product_name}${item.variant_title ? ` — ${item.variant_title}` : ''}${item.quantity > 1 ? ` × ${item.quantity}` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#333;text-align:right;white-space:nowrap;">
          ${symbol} ${Number(item.total_price).toLocaleString()}
        </td>
      </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Purchase Confirmed</title></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e8e8e8;max-width:560px;">
        <tr><td style="background:#000;padding:24px 32px;">${brandHeader}</td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 4px;font-size:14px;color:#666;">${greeting}</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Thank you for your purchase!</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#666;">Order <strong>${sale.order_number}</strong> — your payment has been received.</p>
          <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #111;padding-top:16px;">
            <tr>
              <td style="font-size:15px;font-weight:700;color:#111;padding-top:4px;">Total Paid</td>
              <td style="font-size:15px;font-weight:700;color:#111;text-align:right;padding-top:4px;">${symbol} ${Number(sale.total).toLocaleString()}</td>
            </tr>
          </table>
          <p style="margin:28px 0 0;font-size:13px;color:#999;">Thank you for shopping with ${brandName}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: sale.customer_email,
        subject: `Purchase Confirmed — ${sale.order_number}`,
        html,
      }),
      cache: 'no-store',
    })
  } catch (err) {
    console.error('Failed to send ally sale confirmation email:', err)
  }
}

// ── Paystack helpers ──────────────────────────────────────────────────────────

function getPaystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY not configured')
  return key
}

// "+233241234567" → "0241234567"
function toPaystackMomoFormat(e164: string): string {
  if (e164.startsWith('+233')) return '0' + e164.slice(4)
  return e164
}

async function getCurrentAllyId(): Promise<string | null> {
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = getServiceClient()
  const { data } = await admin.from('allies').select('id').eq('user_id', user.id).single()
  return data?.id ?? null
}

// ── MoMo charge ──────────────────────────────────────────────────────────────

export async function chargeAllyMomo(
  saleId: string,
  phone: string,
  provider: 'mtn' | 'vod' | 'tgo',
): Promise<{ success: boolean; reference?: string; paystackStatus?: string; error?: string }> {
  const supabase = getServiceClient()

  const { data: sale } = await supabase
    .from('ally_sales')
    .select('id, total, order_number, customer_email')
    .eq('id', saleId)
    .single()

  if (!sale) return { success: false, error: 'Sale not found' }

  const key = getPaystackKey()
  const email = sale.customer_email ?? `ally-${sale.order_number}@iris-store.com`
  const momoPhone = toPaystackMomoFormat(phone)
  const amount = Math.round(Number(sale.total) * 100)

  let resp: Response
  try {
    resp = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        email,
        currency: 'GHS',
        mobile_money: { phone: momoPhone, provider },
      }),
      cache: 'no-store',
    })
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' }
  }

  const json = await resp.json()
  if (!json.status) return { success: false, error: json.message ?? 'Charge failed' }

  const reference = json.data?.reference as string | undefined
  if (!reference) return { success: false, error: 'No reference returned' }

  await supabase
    .from('ally_sales')
    .update({ payment_reference: reference, status: 'awaiting_payment' })
    .eq('id', saleId)

  // paystackStatus values: 'send_otp' | 'pay_offline' | 'success'
  return { success: true, reference, paystackStatus: json.data?.status as string }
}

// ── OTP submission (fallback when USSD prompt doesn't appear) ─────────────────

export async function submitAllyOtp(
  saleId: string,
  otp: string,
): Promise<{ success: boolean; paystackStatus?: string; error?: string }> {
  const supabase = getServiceClient()

  const { data: sale } = await supabase
    .from('ally_sales')
    .select('id, payment_reference, status')
    .eq('id', saleId)
    .single()

  if (!sale) return { success: false, error: 'Sale not found' }
  if (!sale.payment_reference) return { success: false, error: 'No pending charge for this sale' }

  const key = getPaystackKey()
  let resp: Response
  try {
    resp = await fetch('https://api.paystack.co/charge/submit_otp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp, reference: sale.payment_reference }),
      cache: 'no-store',
    })
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' }
  }

  const json = await resp.json()
  if (!json.status) return { success: false, error: json.message ?? 'OTP submission failed' }

  const paystackStatus = json.data?.status as string
  if (paystackStatus === 'success') {
    await supabase.from('ally_sales').update({ status: 'completed' }).eq('id', saleId)
    void sendAllySaleConfirmation(saleId)
  }

  return { success: true, paystackStatus }
}

// ── Payment verification (polls until confirmed) ──────────────────────────────

export async function verifyAllyPayment(saleId: string): Promise<{ confirmed: boolean }> {
  const supabase = getServiceClient()

  const { data: sale } = await supabase
    .from('ally_sales')
    .select('status, payment_reference, payment_method')
    .eq('id', saleId)
    .single()

  if (!sale) return { confirmed: false }
  if (sale.status === 'completed') return { confirmed: true }

  // For MoMo: check charge status with the correct endpoint for mobile money
  if (sale.payment_method === 'momo' && sale.payment_reference) {
    const key = getPaystackKey()
    let resp: Response
    try {
      resp = await fetch(
        `https://api.paystack.co/charge/${sale.payment_reference}`,
        {
          headers: { Authorization: `Bearer ${key}` },
          cache: 'no-store',
        },
      )
    } catch {
      return { confirmed: false }
    }
    const json = await resp.json()
    if (json.data?.status === 'success') {
      await supabase.from('ally_sales').update({ status: 'completed' }).eq('id', saleId)
      void sendAllySaleConfirmation(saleId)
      return { confirmed: true }
    }
  }

  // For bank transfer: rely on webhook (just check DB status)
  return { confirmed: false }
}

// ── Dedicated virtual account (bank transfer) ─────────────────────────────────

export async function createAllyVirtualAccount(
  saleId: string,
  customerName: string,
  customerEmail?: string,
): Promise<{ success: boolean; account?: { accountNumber: string; bankName: string; accountName: string }; error?: string }> {
  const supabase = getServiceClient()

  const { data: sale } = await supabase
    .from('ally_sales')
    .select('id, order_number')
    .eq('id', saleId)
    .single()

  if (!sale) return { success: false, error: 'Sale not found' }

  const key = getPaystackKey()
  const email = customerEmail ?? `ally-${sale.order_number}@iris-store.com`

  // 1. Create Paystack customer
  let customerCode: string
  try {
    const custResp = await fetch('https://api.paystack.co/customer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, first_name: customerName }),
      cache: 'no-store',
    })
    const custJson = await custResp.json()
    if (!custJson.status || !custJson.data?.customer_code) {
      return { success: false, error: custJson.message ?? 'Could not create Paystack customer' }
    }
    customerCode = custJson.data.customer_code
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' }
  }

  // 2. Create dedicated virtual account
  try {
    const vaResp = await fetch('https://api.paystack.co/dedicated_account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: customerCode }),
      cache: 'no-store',
    })
    const vaJson = await vaResp.json()
    if (!vaJson.status || !vaJson.data?.account_number) {
      return { success: false, error: vaJson.message ?? 'Could not create virtual account' }
    }
    const account = {
      accountNumber: vaJson.data.account_number as string,
      bankName: vaJson.data.bank?.name ?? 'Paystack',
      accountName: vaJson.data.account_name ?? customerName,
    }

    await supabase.from('ally_sales').update({
      paystack_customer_code: customerCode,
      virtual_account_number: account.accountNumber,
      virtual_account_bank: account.bankName,
      status: 'awaiting_payment',
    }).eq('id', saleId)

    return { success: true, account }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Network error' }
  }
}

export async function notifyAllySaleConfirmed(saleId: string): Promise<void> {
  await sendAllySaleConfirmation(saleId)
}

// ── Mark cash received ────────────────────────────────────────────────────────

export async function markCashReceived(saleId: string): Promise<{ success: boolean; error?: string }> {
  const allyId = await getCurrentAllyId()
  if (!allyId) return { success: false, error: 'Not authenticated' }

  const supabase = getServiceClient()
  const { data: sale } = await supabase
    .from('ally_sales')
    .select('ally_id, status, payment_method')
    .eq('id', saleId)
    .single()

  if (!sale) return { success: false, error: 'Sale not found' }
  if (sale.ally_id !== allyId) return { success: false, error: 'Not authorized' }
  if (sale.payment_method !== 'cash') return { success: false, error: 'Not a cash sale' }
  if (sale.status !== 'pending') return { success: false, error: 'Sale is not pending' }

  const { error } = await supabase
    .from('ally_sales')
    .update({ status: 'completed' })
    .eq('id', saleId)

  if (error) return { success: false, error: error.message }
  void sendAllySaleConfirmation(saleId)
  return { success: true }
}

// ── Refund ────────────────────────────────────────────────────────────────────

export async function refundAllySale(
  saleId: string,
  amount?: number,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const allyId = await getCurrentAllyId()
  if (!allyId) return { success: false, error: 'Not authenticated' }

  const supabase = getServiceClient()

  const { data: sale } = await supabase
    .from('ally_sales')
    .select('id, total, status, payment_reference, payment_method, ally_id')
    .eq('id', saleId)
    .single()

  if (!sale) return { success: false, error: 'Sale not found' }
  if (sale.ally_id !== allyId) return { success: false, error: 'Not authorized' }
  if (sale.status !== 'completed') return { success: false, error: 'Only completed sales can be refunded' }
  if (!sale.payment_reference) return { success: false, error: 'No payment reference — cannot process Paystack refund' }

  const refundAmount = amount ?? Number(sale.total)
  const key = getPaystackKey()

  let paystackRefundId: string | null = null
  let paystackResponse: unknown = null

  try {
    const refResp = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction: sale.payment_reference,
        amount: Math.round(refundAmount * 100),
      }),
      cache: 'no-store',
    })
    const refJson = await refResp.json()
    paystackResponse = refJson
    paystackRefundId = refJson.data?.id ?? null
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Refund request failed' }
  }

  await supabase.from('ally_sale_refunds').insert({
    sale_id: saleId,
    amount: refundAmount,
    reason: reason ?? null,
    status: 'processed',
    paystack_refund_id: paystackRefundId,
    paystack_response: paystackResponse,
    initiated_by: allyId,
  })

  await supabase.from('ally_sales').update({ status: 'refunded' }).eq('id', saleId)

  return { success: true }
}
