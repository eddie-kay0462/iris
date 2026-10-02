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

const ADMIN_LOG_COLUMNS = 'id, action, entity_type, entity_id, changes, created_at'
const SALE_COLUMNS = `id, order_number, customer_name, total, commission_amount, payment_method, status, sale_date, allies(full_name)`
const COMM_COLUMNS = 'id, type, recipient_phone, status, message, created_at'

function mapSale(s: any): SaleEntry {
  return {
    id: s.id,
    order_number: s.order_number,
    ally_name: s.allies?.full_name ?? null,
    customer_name: s.customer_name,
    total: Number(s.total),
    commission_amount: Number(s.commission_amount),
    payment_method: s.payment_method,
    status: s.status,
    sale_date: s.sale_date,
  }
}

export type ActivityTab = 'all' | 'admin' | 'sales' | 'comms'

export type ActivityEntry =
  | { kind: 'admin'; time: string; data: AdminLogEntry }
  | { kind: 'sale'; time: string; data: SaleEntry }
  | { kind: 'comm'; time: string; data: CommEntry }

export type ActivityPage = {
  entries: ActivityEntry[]
  /** Rows in the selected tab, across every page. */
  total: number
  counts: { admin: number; sales: number; comms: number }
}

/** Supabase (PostgREST) returns at most this many rows per request. */
const MAX_ROWS = 1000

/**
 * Rows [from, to] of a table, newest first, read in chunks under the per-request
 * cap. `id` breaks ties on the timestamp so chunk boundaries never shift.
 */
async function readRange(
  supabase: ReturnType<typeof getAdminClient>,
  table: string,
  columns: string,
  orderBy: string,
  from: number,
  to: number,
): Promise<any[]> {
  const out: any[] = []
  for (let start = from; start <= to; start += MAX_ROWS) {
    const end = Math.min(start + MAX_ROWS - 1, to)
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderBy, { ascending: false })
      .order('id', { ascending: false })
      .range(start, end)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < end - start + 1) break // ran out of rows
  }
  return out
}

/**
 * One page of the activity monitor. A single source pages directly. "All"
 * merges three tables by time, so it reads the newest `offset + pageSize`
 * rows of each (in chunks, past the 1,000-row cap), merges them and slices
 * out the page. Exact at any depth; deep pages just read more.
 */
export async function fetchActivityPage({
  tab,
  page,
  pageSize,
}: {
  tab: ActivityTab
  page: number
  pageSize: number
}): Promise<ActivityPage> {
  const supabase = getAdminClient()
  const size = Math.min(Math.max(pageSize, 1), 100)
  const offset = Math.max(page - 1, 0) * size
  // One source: just this page. All: everything up to the end of this page.
  const [from, to] = tab === 'all' ? [0, offset + size - 1] : [offset, offset + size - 1]
  const want = (t: ActivityTab) => tab === 'all' || tab === t
  const count = (table: string) => supabase.from(table).select('id', { count: 'exact', head: true })

  const [adminCount, salesCount, commsCount, adminRows, salesRows, commsRows] = await Promise.all([
    count('admin_activity_logs'),
    count('ally_sales'),
    count('communication_logs'),
    want('admin') ? readRange(supabase, 'admin_activity_logs', ADMIN_LOG_COLUMNS, 'created_at', from, to) : [],
    want('sales') ? readRange(supabase, 'ally_sales', SALE_COLUMNS, 'sale_date', from, to) : [],
    want('comms') ? readRange(supabase, 'communication_logs', COMM_COLUMNS, 'created_at', from, to) : [],
  ])

  const counts = { admin: adminCount.count ?? 0, sales: salesCount.count ?? 0, comms: commsCount.count ?? 0 }

  const rows: ActivityEntry[] = [
    ...(adminRows as AdminLogEntry[]).map((d): ActivityEntry => ({ kind: 'admin', time: d.created_at, data: d })),
    ...salesRows.map((d: any): ActivityEntry => ({ kind: 'sale', time: d.sale_date, data: mapSale(d) })),
    ...(commsRows as CommEntry[]).map((d): ActivityEntry => ({ kind: 'comm', time: d.created_at, data: d })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  const total =
    tab === 'all' ? counts.admin + counts.sales + counts.comms
    : tab === 'admin' ? counts.admin
    : tab === 'sales' ? counts.sales
    : counts.comms

  return {
    entries: tab === 'all' ? rows.slice(offset, offset + size) : rows,
    total,
    counts,
  }
}

export async function fetchActivityFeed(): Promise<FeedResult> {
  const supabase = getAdminClient()

  const [{ data: adminLogs }, { data: sales }, { data: comms }] = await Promise.all([
    supabase
      .from('admin_activity_logs')
      .select(ADMIN_LOG_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(100),

    supabase
      .from('ally_sales')
      .select(SALE_COLUMNS)
      .order('sale_date', { ascending: false })
      .limit(100),

    supabase
      .from('communication_logs')
      .select(COMM_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return {
    adminLogs: (adminLogs ?? []) as AdminLogEntry[],
    sales: (sales ?? []).map(mapSale),
    comms: (comms ?? []) as CommEntry[],
  }
}
