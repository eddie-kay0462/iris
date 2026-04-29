'use server'

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function recordAllyLogin(userId: string) {
  const supabase = getServiceClient()

  const { data: ally } = await supabase
    .from('allies')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!ally) return

  await supabase.from('ally_logins').insert({ ally_id: ally.id })
}
