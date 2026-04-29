'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Ally = {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  location: string
  location_type: 'campus' | 'city'
  commission_rate: number
  commission_quota: number | null  // null = use global default from commission_settings
  is_active: boolean
  joined_at: string
  created_at: string
  onboarded_at: string | null
  avatar_url?: string | null
}

type AllyContextValue = {
  ally: Ally | null
  loading: boolean
  refetch: () => void
}

const AllyContext = createContext<AllyContextValue>({
  ally: null,
  loading: true,
  refetch: () => {},
})

export function AllyProvider({
  children,
  initialAlly,
}: {
  children: React.ReactNode
  initialAlly: Ally | null
}) {
  const [ally, setAlly] = useState<Ally | null>(initialAlly)
  const [loading, setLoading] = useState(false)

  const refetch = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('allies')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setAlly(data)
    }
    setLoading(false)
  }

  return (
    <AllyContext.Provider value={{ ally, loading, refetch }}>
      {children}
    </AllyContext.Provider>
  )
}

export function useAlly() {
  return useContext(AllyContext)
}
