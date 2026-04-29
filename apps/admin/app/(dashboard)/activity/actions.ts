'use server'

import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type AdminLogEntry = {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  changes: Record<string, unknown> | null
  created_at: string
}

export type SaleEntry = {
  id: string
  order_number: string
  ally_name: string | null
  customer_name: string | null
  total: number
  commission_amount: number
  payment_method: string
  status: string
  sale_date: string
}

export type CommEntry = {
  id: string
  type: string
  recipient_phone: string
  status: string
  message: string | null
  created_at: string
}

export type FeedResult = {
  adminLogs: AdminLogEntry[]
  sales: SaleEntry[]
  comms: CommEntry[]
}

export async function fetchActivityFeed(): Promise<FeedResult> {
  const supabase = getAdminClient()

  const [{ data: adminLogs }, { data: sales }, { data: comms }] = await Promise.all([
    supabase
      .from('admin_activity_logs')
      .select('id, action, entity_type, entity_id, changes, created_at')
      .order('created_at', { ascending: false })
      .limit(100),

    supabase
      .from('ally_sales')
      .select(`id, order_number, customer_name, total, commission_amount, payment_method, status, sale_date, allies(full_name)`)
      .order('sale_date', { ascending: false })
      .limit(100),

    supabase
      .from('communication_logs')
      .select('id, type, recipient_phone, status, message, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return {
    adminLogs: (adminLogs ?? []) as AdminLogEntry[],
    sales: (sales ?? []).map((s: any) => ({
      id: s.id,
      order_number: s.order_number,
      ally_name: s.allies?.full_name ?? null,
      customer_name: s.customer_name,
      total: Number(s.total),
      commission_amount: Number(s.commission_amount),
      payment_method: s.payment_method,
      status: s.status,
      sale_date: s.sale_date,
    })),
    comms: (comms ?? []) as CommEntry[],
  }
}
