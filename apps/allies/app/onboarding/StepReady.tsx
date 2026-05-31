'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { TopBar, Eyebrow, InkCTA, HW, A, useIsDesktop } from './atoms'

type Ally = {
  id: string
  full_name: string
  location: string
  location_type: 'campus' | 'city'
  commission_rate: number
}

interface Props {
  ally: Ally
  avatarUrl?: string
  onFinish: () => void
  onBack: () => void
  loading: boolean
  step: number
}

function firstName(name: string) {
  return name.split(' ')[0]
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const EASE = [0.2, 0.7, 0.2, 1] as const

// Text stagger — delayed so avatar lands first
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.52 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export function StepReady({ ally, avatarUrl, onFinish, onBack, loading, step }: Props) {
  const isDesktop = useIsDesktop()

  const locationToken = ally.location.includes(',')
    ? ally.location.split(',')[0].trim()
    : ally.location

  const initials = getInitials(ally.full_name)

  // Avatar pip — shared between layouts, spring pop entrance
  const avatarPip = (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.35 }}
      style={{
        width: 76,
        height: 76,
        borderRadius: '50%',
        background: avatarUrl ? 'transparent' : '#000',
        backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '4px solid #F4F3F1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {!avatarUrl && (
        <span style={{ fontFamily: HW, fontWeight: 300, fontSize: 26, color: '#F4F3F1' }}>
          {initials}
        </span>
      )}
    </motion.div>
  )

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        {/* Left: Ken Burns hero + right-edge bone fade + avatar pip at boundary */}
        <div style={{ width: '50%', flexShrink: 0, position: 'relative', overflow: 'visible' }}>
          {/* Inner clip so the Ken Burns scale doesn't bleed over the avatar pip */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <motion.div
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.8, ease: EASE }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <Image
                src="/onboarding/lookbook-3.jpg"
                alt=""
                fill
                sizes="50vw"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </motion.div>
            {/* Right-edge fade into bone */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, transparent 55%, rgba(244,243,241,0.92) 100%)',
              pointerEvents: 'none',
            }} />
          </div>
          {/* Avatar straddling the boundary */}
          <div style={{ position: 'absolute', right: -38, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
            {avatarPip}
          </div>
        </div>

        {/* Right: content */}
        <div style={{
          width: '50%',
          background: A.bg,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          minHeight: '100vh',
          paddingLeft: 38,
          boxSizing: 'border-box',
        }}>
          <div style={{
            maxWidth: 420,
            width: '100%',
            margin: '0 auto',
            padding: '0 40px',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: '100vh',
            boxSizing: 'border-box',
          }}>
            <TopBar step={step} onBack={onBack} desktop />

            <div style={{ paddingTop: 56, flex: 1, display: 'flex', flexDirection: 'column', textAlign: 'center' }}>
              <div style={{ flex: 1 }} />
              <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
                  <Eyebrow>Chapter 04 · Ready</Eyebrow>
                </motion.div>
                <motion.h1 variants={fadeUp} style={{
                  fontFamily: HW, fontWeight: 300, fontSize: 44,
                  lineHeight: 1, color: A.ink, margin: 0, letterSpacing: '-0.01em',
                }}>
                  The post is<br />yours, {firstName(ally.full_name)}.
                </motion.h1>
                <motion.p variants={fadeUp} style={{
                  fontFamily: HW, fontWeight: 300, fontSize: 14,
                  lineHeight: 1.5, color: A.body, margin: '18px auto 0', maxWidth: 280,
                }}>
                  Go make it count at{' '}
                  <span style={{ color: '#000' }}>{locationToken}</span>.{' '}
                  The dashboard tracks every sale.
                </motion.p>
              </motion.div>
              <div style={{ flex: 1 }} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.9 }}
                style={{ paddingBottom: 48 }}
              >
                <InkCTA onClick={onFinish} disabled={loading}>
                  {loading ? 'Loading…' : 'Enter the dashboard'}
                </InkCTA>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mobile
  return (
    <div style={{ background: A.bg, minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <TopBar step={step} onBack={onBack} />

      {/* Ken Burns hero strip */}
      <div style={{
        margin: '30px 0 0',
        height: 360,
        width: '100%',
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <Image
            src="/onboarding/lookbook-3.jpg"
            alt=""
            fill
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </motion.div>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 50%, rgba(244,243,241,1) 100%)',
        }} />
      </div>

      {/* Avatar overlapping the hero — rendered outside the overflow:hidden strip */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -38, position: 'relative', zIndex: 10 }}>
        {avatarPip}
      </div>

      <div style={{ padding: '22px 24px 0', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }} />
        <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <Eyebrow>Chapter 04 · Ready</Eyebrow>
          </motion.div>
          <motion.h1 variants={fadeUp} style={{
            fontFamily: HW, fontWeight: 300, fontSize: 36,
            lineHeight: 1, color: A.ink, margin: 0, letterSpacing: '-0.01em',
          }}>
            The post is<br />yours, {firstName(ally.full_name)}.
          </motion.h1>
          <motion.p variants={fadeUp} style={{
            fontFamily: HW, fontWeight: 300, fontSize: 14,
            lineHeight: 1.5, color: A.body, margin: '16px auto 0', maxWidth: 280,
          }}>
            Go make it count at{' '}
            <span style={{ color: '#000' }}>{locationToken}</span>.{' '}
            The dashboard tracks every sale.
          </motion.p>
        </motion.div>
        <div style={{ flex: 1 }} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.9 }}
          style={{ padding: '20px 0 28px' }}
        >
          <InkCTA onClick={onFinish} disabled={loading}>
            {loading ? 'Loading…' : 'Enter the dashboard'}
          </InkCTA>
        </motion.div>
      </div>
    </div>
  )
}
