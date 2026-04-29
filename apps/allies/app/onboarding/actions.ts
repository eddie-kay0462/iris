'use server'

import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function markOnboarded(allyId: string) {
  const supabase = getServiceClient()
  await supabase
    .from('allies')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', allyId)
}
