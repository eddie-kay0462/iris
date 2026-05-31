import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingFlow } from './OnboardingFlow'

export default async function OnboardingPage() {
  // Preload subsequent step images so they're ready before the user reaches them
  const preloads = [
    { href: '/onboarding/lookbook-2.jpeg', as: 'image' as const },
    { href: '/onboarding/lookbook-3.jpg', as: 'image' as const },
  ]
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

  return (
    <>
      {preloads.map((p) => (
        <link key={p.href} rel="preload" href={p.href} as={p.as} />
      ))}
      <OnboardingFlow ally={ally} />
    </>
  )
}
