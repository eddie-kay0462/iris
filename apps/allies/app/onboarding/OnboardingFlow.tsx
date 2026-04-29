'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { markOnboarded } from './actions'
import { StepPhoto } from './StepPhoto'

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

function firstName(fullName: string) {
  return fullName.split(' ')[0]
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

  async function finish() {
    setLoading(true)
    await markOnboarded(ally.id)
    router.push('/')
  }

  const steps = [
    <StepWelcome key="welcome" ally={ally} onNext={next} />,
    <StepLocation key="location" ally={ally} onNext={next} />,
    <StepPhoto key="photo" ally={ally} onNext={(url) => { setAvatarUrl(url); next() }} />,
    <StepReady key="ready" ally={ally} onFinish={finish} loading={loading} />,
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/allies_logo.png" alt="Allies" className="h-8 invert opacity-80" />
      </div>

      {/* Step card */}
      <div className="w-full max-w-md relative overflow-hidden">
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

      {/* Step dots */}
      <div className="flex gap-2 mt-10">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function StepWelcome({ ally, onNext }: { ally: Ally; onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
        🎉
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">
          Welcome, {firstName(ally.full_name)}!
        </h1>
        <p className="text-slate-400 leading-relaxed">
          Congratulations on joining the 1NRI Allies network. You&apos;ve taken
          the first step toward building something meaningful in your community.
        </p>
      </div>
      <p className="text-slate-400 text-sm">
        This short walkthrough will get you familiar with your role before
        you head to your dashboard.
      </p>
      <button
        onClick={onNext}
        className="w-full rounded-xl bg-white text-slate-900 py-3 text-sm font-semibold hover:bg-slate-100 transition-colors"
      >
        Let&apos;s go
      </button>
    </div>
  )
}

function StepLocation({ ally, onNext }: { ally: Ally; onNext: () => void }) {
  const commissionPct = (ally.commission_rate * 100).toFixed(1)

  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
        {ally.location_type === 'campus' ? '🎓' : '🏙️'}
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">
          Your Territory
        </h1>
        <p className="text-slate-400 leading-relaxed">
          You&apos;ve been assigned to represent 1NRI at{' '}
          <span className="text-white font-medium">{ally.location}</span>.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 text-left">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-slate-400">Location</span>
          <span className="text-sm font-medium text-white">{ally.location}</span>
        </div>
        <div className="border-t border-white/10" />
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-slate-400">Type</span>
          <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${
            ally.location_type === 'campus'
              ? 'bg-blue-500/20 text-blue-300'
              : 'bg-amber-500/20 text-amber-300'
          }`}>
            {ally.location_type === 'campus' ? 'Campus' : 'City'}
          </span>
        </div>
        <div className="border-t border-white/10" />
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-slate-400">Your Commission</span>
          <span className="text-sm font-semibold text-emerald-400">{commissionPct}%</span>
        </div>
      </div>

      <p className="text-slate-400 text-sm">
        Every sale you make earns you {commissionPct}% commission. The more you
        sell, the more you earn.
      </p>

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-white text-slate-900 py-3 text-sm font-semibold hover:bg-slate-100 transition-colors"
      >
        Continue
      </button>
    </div>
  )
}

function StepReady({
  ally,
  onFinish,
  loading,
}: {
  ally: Ally
  onFinish: () => void
  loading: boolean
}) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
        🚀
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">
          You&apos;re all set, {firstName(ally.full_name)}!
        </h1>
        <p className="text-slate-400 leading-relaxed">
          Your dashboard is ready. Track your sales, manage your customers, and
          watch your earnings grow — right from here.
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <p className="text-emerald-300 text-sm leading-relaxed">
          We&apos;re rooting for you. Go make an impact at{' '}
          <span className="font-semibold">{ally.location}</span> and let the
          numbers speak for themselves.
        </p>
      </div>

      <button
        onClick={onFinish}
        disabled={loading}
        className="w-full rounded-xl bg-white text-slate-900 py-3 text-sm font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading dashboard…' : 'Go to my Dashboard →'}
      </button>
    </div>
  )
}
