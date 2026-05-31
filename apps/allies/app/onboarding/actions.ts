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

export async function uploadAllyAvatar(
  allyId: string,
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided' }

  const buffer = await file.arrayBuffer()
  const supabase = getServiceClient()
  const storagePath = `allies/${allyId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, new Uint8Array(buffer), { contentType: 'image/jpeg', upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(storagePath)

  await supabase.from('allies').update({ avatar_url: publicUrl }).eq('id', allyId)

  return { url: publicUrl }
}
