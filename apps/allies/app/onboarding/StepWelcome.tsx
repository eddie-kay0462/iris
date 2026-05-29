'use client'

import { motion } from 'framer-motion'
import { TopBar, Eyebrow, InkCTA, HW, A, useIsDesktop } from './atoms'

type Ally = {
  id: string
  full_name: string
  location: string
  location_type: 'campus' | 'city'
  commission_rate: number
}

function firstName(name: string) {
  return name.split(' ')[0]
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
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.14 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
}

export function StepWelcome({ ally, onNext, onBack, step }: Props) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        {/* Left: Ken Burns hero */}
        <div style={{ width: '50%', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          <motion.div
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.8, ease: EASE }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(/onboarding/lookbook-1.jpeg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center 18%',
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.9 }}
            style={{
              position: 'absolute',
              left: 32,
              bottom: 40,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <Eyebrow dark style={{ color: 'rgba(255,255,255,0.85)' }}>FW&apos;26 · CLASS 04</Eyebrow>
            <div style={{ fontFamily: HW, fontWeight: 700, color: '#fff', fontSize: 11, letterSpacing: '0.06em' }}>
              TWO HOUSES · 24 ALLiES · 12 LOCATIONS
            </div>
          </motion.div>
        </div>

        {/* Right: staggered content */}
        <div style={{
          width: '50%',
          background: A.bg,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          minHeight: '100vh',
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
            <div style={{ paddingTop: 56, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }} />
              <motion.div
                initial="hidden"
                animate="show"
                variants={stagger}
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
                  <Eyebrow>Chapter 01 · Welcome</Eyebrow>
                </motion.div>
                <motion.h1 variants={fadeUp} style={{
                  fontFamily: HW, fontWeight: 300, fontSize: 48,
                  lineHeight: 1, color: A.ink, margin: 0, letterSpacing: '-0.01em',
                }}>
                  Welcome,<br />{firstName(ally.full_name)}.
                </motion.h1>
                <motion.p variants={fadeUp} style={{
                  fontFamily: HW, fontWeight: 300, fontSize: 15,
                  lineHeight: 1.55, color: A.body, margin: '22px 0 0', maxWidth: 340,
                }}>
                  You&apos;ve joined a small network of allies carrying both 1NRi and
                  Unlikely Alliances forward in your city. Three minutes to set up.
                  Then the work begins.
                </motion.p>
              </motion.div>
              <div style={{ flex: 1 }} />
              <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="show"
                style={{ paddingBottom: 48 }}
              >
                <InkCTA onClick={onNext}>Begin</InkCTA>
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
        margin: '30px 0 0', height: 420, width: '100%',
        position: 'relative', flexShrink: 0, overflow: 'hidden',
      }}>
        <motion.div
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/onboarding/lookbook-1.jpeg)',
            backgroundSize: 'cover', backgroundPosition: 'center 18%',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.85 }}
          style={{
            position: 'absolute', left: 22, bottom: 22,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <Eyebrow dark style={{ color: 'rgba(255,255,255,0.85)' }}>FW&apos;26 · CLASS 04</Eyebrow>
          <div style={{ fontFamily: HW, fontWeight: 700, color: '#fff', fontSize: 11, letterSpacing: '0.06em' }}>
            TWO HOUSES · 24 ALLiES · 12 LOCATIONS
          </div>
        </motion.div>
      </div>

      <div style={{ padding: '32px 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }} />
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <Eyebrow>Chapter 01 · Welcome</Eyebrow>
          </motion.div>
          <motion.h1 variants={fadeUp} style={{
            fontFamily: HW, fontWeight: 300, fontSize: 38,
            lineHeight: 1, color: A.ink, margin: 0, letterSpacing: '-0.01em',
          }}>
            Welcome,<br />{firstName(ally.full_name)}.
          </motion.h1>
          <motion.p variants={fadeUp} style={{
            fontFamily: HW, fontWeight: 300, fontSize: 14,
            lineHeight: 1.5, color: A.body, margin: '18px 0 0', maxWidth: 320,
          }}>
            You&apos;ve joined a small network of allies carrying both 1NRi and
            Unlikely Alliances forward in your city. Three minutes to set up.
            Then the work begins.
          </motion.p>
        </motion.div>
        <div style={{ flex: 1 }} />
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="show"
          style={{ padding: '0 0 28px' }}
        >
          <InkCTA onClick={onNext}>Begin</InkCTA>
        </motion.div>
      </div>
    </div>
  )
}
