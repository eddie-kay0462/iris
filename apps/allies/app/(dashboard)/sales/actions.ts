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
