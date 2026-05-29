'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { markOnboarded } from './actions'
import { StepWelcome } from './StepWelcome'
import { StepTerritory } from './StepTerritory'
import { StepPhoto } from './StepPhoto'
import { StepReady } from './StepReady'

type Ally = {
  id: string
  full_name: string
  location: string
  location_type: 'campus' | 'city'
  commission_rate: number
}

const variants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 48 : -48,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -48 : 48,
  }),
}

export function OnboardingFlow({ ally }: { ally: Ally }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const router = useRouter()

  function next() {
    setDirection(1)
    setStep((s) => s + 1)
  }

  function back() {
    setDirection(-1)
    setStep((s) => Math.max(0, s - 1))
  }

  async function finish() {
    setLoading(true)
    await markOnboarded(ally.id)
    router.push('/')
  }

  const commonProps = { onBack: back, step }

  const steps = [
    <StepWelcome key="welcome" ally={ally} onNext={next} {...commonProps} />,
    <StepTerritory key="territory" ally={ally} onNext={next} {...commonProps} />,
    <StepPhoto key="photo" ally={ally} onNext={(url) => { setAvatarUrl(url); next() }} {...commonProps} />,
    <StepReady key="ready" ally={ally} avatarUrl={avatarUrl} onFinish={finish} loading={loading} {...commonProps} />,
  ]

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
