import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingFlow } from './OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: ally } = await supabase
    .from('allies')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!ally) redirect('/login')

  // Already onboarded — send to dashboard
  if (ally.onboarded_at) redirect('/')

  return <OnboardingFlow ally={ally} />
}
