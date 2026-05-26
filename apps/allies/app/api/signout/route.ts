import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const reason = request.nextUrl.searchParams.get('reason')
  const loginUrl = new URL('/login', request.nextUrl.origin)
  if (reason) loginUrl.searchParams.set('reason', reason)

  return NextResponse.redirect(loginUrl)
}
