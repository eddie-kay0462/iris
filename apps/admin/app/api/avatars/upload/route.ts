import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function POST(req: NextRequest) {
  // Validate token by checking the Authorization header
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify token against backend profile endpoint
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
  const profileRes = await fetch(`${apiBase}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!profileRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const storagePath = formData.get('storagePath') as string | null
  const table = formData.get('table') as 'allies' | 'profiles' | null
  const recordId = formData.get('recordId') as string | null

  if (!file || !storagePath || !table || !recordId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (table !== 'allies' && table !== 'profiles') {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const supabase = getServiceClient()

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${storagePath}`

  await supabase.from(table).update({ avatar_url: url }).eq('id', recordId)

  return NextResponse.json({ url })
}
