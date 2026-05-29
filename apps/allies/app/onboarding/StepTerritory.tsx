'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
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
  onNext: () => void
  onBack: () => void
  step: number
}

const EASE = [0.2, 0.7, 0.2, 1] as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export function StepTerritory({ ally, onNext, onBack, step }: Props) {
  const isDesktop = useIsDesktop()
  const pctTarget = Math.round(ally.commission_rate * 100)
  const typeLabel = ally.location_type === 'campus' ? 'Campus chapter' : 'City chapter'

  // Commission count-up
  const count = useMotionValue(0)
  const displayCount = useTransform(count, (v) => Math.round(v).toString())

  useEffect(() => {
    const controls = animate(count, pctTarget, {
      duration: 0.9,
      ease: 'easeOut',
      delay: 0.5,
    })
    return controls.stop
  }, [count, pctTarget])

  const metaRows = (
    <div style={{ padding: '18px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Eyebrow style={{ fontSize: 9 }}>Location</Eyebrow>
        <div style={{ fontFamily: HW, fontWeight: 300, fontSize: 13, color: A.ink, textAlign: 'right', maxWidth: 200 }}>
          {ally.location}
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.12)', margin: '14px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Eyebrow style={{ fontSize: 9 }}>Type</Eyebrow>
        <div style={{ fontFamily: HW, fontWeight: 300, fontSize: 13, color: A.ink, textTransform: 'lowercase' }}>
          {typeLabel}
        </div>
      </div>
    </div>
  )

  const commissionInner = (
    <>
      <div>
        <Eyebrow style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Your commission</Eyebrow>
        <div style={{ fontFamily: HW, fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.02em' }}>
          on every 1NRi &amp; ua. sale, paid monthly
        </div>
      </div>
      <div style={{ fontFamily: HW, fontWeight: 300, fontSize: 56, lineHeight: 1, color: '#fff', letterSpacing: '-0.02em' }}>
        <motion.span>{displayCount}</motion.span>
        <span style={{ fontSize: 28, marginLeft: 2 }}>%</span>
      </div>
    </>
  )

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        {/* Left: full-height grayscale image */}
        <div style={{ width: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <motion.div
            initial={{ scale: 1.04 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.8, ease: EASE }}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(/onboarding/lookbook-2.jpeg)',
              backgroundSize: 'cover', backgroundPosition: 'center 30%',
              filter: 'grayscale(0.15) contrast(0.95)',
            }}
          />
        </div>

        {/* Right: content */}
        <div style={{ width: '50%', background: A.bg, display: 'flex', flexDirection: 'column', overflowY: 'auto', minHeight: '100vh' }}>
          <div style={{
            maxWidth: 420, width: '100%', margin: '0 auto', padding: '0 40px',
            display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', boxSizing: 'border-box',
          }}>
            <TopBar step={step} onBack={onBack} desktop />

            <div style={{ paddingTop: 48, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column' }}>
                <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
                  <Eyebrow>Chapter 02 · Your post</Eyebrow>
                </motion.div>
                <motion.h1 variants={fadeUp} style={{
                  fontFamily: HW, fontWeight: 300, fontSize: 44,
                  lineHeight: 1, color: A.ink, margin: 0, letterSpacing: '-0.01em',
                }}>
                  Where you&apos;ll<br />carry both<br />houses.
                </motion.h1>
              </motion.div>

              {/* Location card */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.28 }}
                style={{ marginTop: 32, border: '1px solid #000', background: '#fff' }}
              >
                <div style={{ height: 6, borderTop: '1px solid #000', borderBottom: '1px solid #000' }} />
                {metaRows}
              </motion.div>

              {/* Commission block */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.42 }}
                style={{
                  marginTop: 18, padding: '20px 18px', background: '#000', color: '#F4F3F1',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                {commissionInner}
              </motion.div>

              <div style={{ flex: 1 }} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
                style={{ paddingBottom: 48 }}
              >
                <InkCTA onClick={onNext}>Continue</InkCTA>
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

      <div style={{ padding: '44px 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column' }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <Eyebrow>Chapter 02 · Your post</Eyebrow>
          </motion.div>
          <motion.h1 variants={fadeUp} style={{
            fontFamily: HW, fontWeight: 300, fontSize: 38,
            lineHeight: 1, color: A.ink, margin: 0, letterSpacing: '-0.01em',
          }}>
            Where you&apos;ll<br />carry both<br />houses.
          </motion.h1>
        </motion.div>

        {/* Location card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.28 }}
          style={{ marginTop: 32, border: '1px solid #000', background: '#fff' }}
        >
          <div style={{
            height: 160, width: '100%',
            backgroundImage: 'url(/onboarding/lookbook-2.jpeg)',
            backgroundSize: 'cover', backgroundPosition: 'center 5%',
            filter: 'grayscale(0.15) contrast(0.95)',
          }} />
          <div style={{ height: 6, borderTop: '1px solid #000', borderBottom: '1px solid #000' }} />
          {metaRows}
        </motion.div>

        {/* Commission block */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.42 }}
          style={{
            marginTop: 18, padding: '20px 18px', background: '#000', color: '#F4F3F1',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          {commissionInner}
        </motion.div>

        <div style={{ flex: 1 }} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
          style={{ padding: '20px 0 28px' }}
        >
          <InkCTA onClick={onNext}>Continue</InkCTA>
        </motion.div>
      </div>
    </div>
  )
}
