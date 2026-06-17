'use server'

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function recordAllyLogin(userId: string): Promise<{ allowed: boolean; loginId: string | null }> {
  const supabase = getServiceClient()

  const { data: ally } = await supabase
    .from('allies')
    .select('id, is_active')
    .eq('user_id', userId)
    .single()

  if (!ally) return { allowed: false, loginId: null }

  if (!ally.is_active) return { allowed: false, loginId: null }

  const { data: loginRow } = await supabase
    .from('ally_logins')
    .insert({ ally_id: ally.id })
    .select('id')
    .single()

  return { allowed: true, loginId: loginRow?.id ?? null }
}

export async function recordAllyLogout(loginId: string, reason: string): Promise<void> {
  const supabase = getServiceClient()
  await supabase
    .from('ally_logins')
    .update({ logged_out_at: new Date().toISOString(), logout_reason: reason })
    .eq('id', loginId)
    .is('logged_out_at', null)
}
