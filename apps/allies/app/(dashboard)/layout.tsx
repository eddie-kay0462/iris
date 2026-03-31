import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AllyProvider, type Ally } from '@/lib/ally-context'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: ally } = await supabase
    .from('allies')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <AllyProvider initialAlly={ally as Ally | null}>
      <DashboardShell>{children}</DashboardShell>
    </AllyProvider>
  )
}
