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
