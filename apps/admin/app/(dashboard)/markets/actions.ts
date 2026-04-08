'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Admin client using service role key (needed to invite users)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type InviteAllyInput = {
  full_name: string
  email: string
  phone: string
  location: string
  location_type: 'campus' | 'city'
  commission_rate: number
}

export type UpdateAllyInput = {
  id: string
  location?: string
  location_type?: 'campus' | 'city'
  commission_rate?: number
  commission_quota?: number | null  // null = use global default, 0 = no quota
  is_active?: boolean
}

export type CommissionSettings = {
  default_quota: number
  default_rate: number
  period: 'monthly' | 'all_time'
}

export async function getCommissionSettings(): Promise<CommissionSettings> {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('commission_settings')
    .select('default_quota, default_rate, period')
    .single()
  return data ?? { default_quota: 0, default_rate: 0.15, period: 'monthly' }
}

export async function updateCommissionSettings(input: Partial<CommissionSettings>) {
  const supabase = getAdminClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.default_quota !== undefined) updates.default_quota = input.default_quota
  if (input.default_rate !== undefined) updates.default_rate = input.default_rate / 100
  if (input.period !== undefined) updates.period = input.period
  const { error } = await supabase.from('commission_settings').update(updates).neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) return { error: error.message }
  revalidatePath('/markets')
  return { success: true }
}

export async function inviteAlly(input: InviteAllyInput) {
  const supabase = getAdminClient()

  // 1. Send Supabase invite email — user will set password via the link
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
    input.email,
    {
      data: { full_name: input.full_name },
      redirectTo: `${process.env.NEXT_PUBLIC_ALLIES_URL ?? 'https://allies.1nri.store'}/login`,
    }
  )

  if (authError || !authData?.user) {
    return { error: authError?.message ?? 'Failed to invite user' }
  }

  // 2. Insert ally row
  const { error: insertError } = await supabase.from('allies').insert({
    user_id: authData.user.id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone || null,
    location: input.location,
    location_type: input.location_type,
    commission_rate: input.commission_rate / 100, // store as decimal
  })

  if (insertError) {
    // Roll back auth user if ally insert fails
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { error: insertError.message }
  }

  revalidatePath('/markets')
  return { success: true }
}

export async function fetchAllies() {
  const supabase = getAdminClient()
  const { data: allyRows, error } = await supabase
    .from('allies')
    .select('*')
    .order('joined_at', { ascending: false })
  if (error) return { error: error.message, allies: [], sales: [] }

  const { data: sales } = await supabase
    .from('ally_sales')
    .select('ally_id, total, commission_amount')

  return { allies: allyRows ?? [], sales: sales ?? [], error: null }
}

export async function updateAlly(input: UpdateAllyInput) {
  const supabase = getAdminClient()
  const { id, commission_rate, commission_quota, ...rest } = input

  const updates: Record<string, unknown> = { ...rest }
  if (commission_rate !== undefined) {
    updates.commission_rate = commission_rate / 100
  }
  if (commission_quota !== undefined) {
    // null means "use global default", 0+ means explicit override
    updates.commission_quota = commission_quota
  }

  const { error } = await supabase.from('allies').update(updates).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/markets')
  return { success: true }
}
