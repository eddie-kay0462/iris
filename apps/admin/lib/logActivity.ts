import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function logActivity({
  action,
  entity_type,
  entity_id,
  changes,
  admin_id,
}: {
  action: string
  entity_type: string
  entity_id?: string | null
  changes?: Record<string, unknown> | null
  admin_id?: string | null
}) {
  const supabase = getAdminClient()
  await supabase.from('admin_activity_logs').insert({
    action,
    entity_type,
    entity_id: entity_id ?? null,
    changes: changes ?? null,
    admin_id: admin_id ?? null,
  })
}
