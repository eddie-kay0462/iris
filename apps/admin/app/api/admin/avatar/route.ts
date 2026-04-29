import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ avatar_url: null })

  const supabase = getServiceClient()
  const { data } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('email', email)
    .single()

  return NextResponse.json({ avatar_url: data?.avatar_url ?? null })
}
