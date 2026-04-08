'use server'

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function searchCustomers(q: string) {
  if (!q.trim()) return []
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone_number')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`)
    .limit(8)
  return data ?? []
}

export async function createCustomer(input: {
  first_name: string
  last_name: string
  email: string
  phone_number: string
}): Promise<{ id: string; first_name: string | null; last_name: string | null; email: string | null; phone_number: string | null } | null> {
  const supabase = getServiceClient()

  const email = input.email.trim() || null
  const phone = input.phone_number.trim() || null

  // Try to find an existing profile by email first, then phone
  if (email) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number')
      .eq('email', email)
      .maybeSingle()
    if (existing) return existing
  } else if (phone) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone_number')
      .eq('phone_number', phone)
      .maybeSingle()
    if (existing) return existing
  }

  // Create a new profile record (no auth account — offline customer)
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      first_name: input.first_name.trim() || null,
      last_name: input.last_name.trim() || null,
      email,
      phone_number: phone,
    })
    .select('id, first_name, last_name, email, phone_number')
    .single()

  if (error) {
    console.error('createCustomer error:', error)
    return null
  }
  return data
}
