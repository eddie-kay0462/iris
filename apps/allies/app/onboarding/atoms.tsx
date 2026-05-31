'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft } from 'lucide-react'

export function useIsDesktop(breakpoint = 768): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isDesktop
}

// ── Type helpers ──────────────────────────────────────────────────────────────

export const HW = "'HelveticaWorld', 'Helvetica Neue', Helvetica, Arial, sans-serif"
export const INTER = "'Inter', 'HelveticaWorld', sans-serif"

export const A = {
  bg: '#F4F3F1',
  ink: '#000',
  body: '#3B414A',
  meta: '#59626E',
}

// ── Eyebrow ───────────────────────────────────────────────────────────────────

interface EyebrowProps {
  children: React.ReactNode
  dark?: boolean
  style?: React.CSSProperties
}

export function Eyebrow({ children, dark, style }: EyebrowProps) {
  return (
    <div style={{
      fontFamily: INTER,
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: dark ? 'rgba(255,255,255,0.6)' : '#000',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── StepTicks ─────────────────────────────────────────────────────────────────

interface StepTicksProps {
  step: number
  total?: number
  dark?: boolean
}

const ACTIVE_WIDTHS = [14, 32, 20, 40]

export function StepTicks({ step, total = 4, dark }: StepTicksProps) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 2,
          width: i === step ? (ACTIVE_WIDTHS[i] ?? 22) : 8,
          background: i <= step
            ? (dark ? '#fff' : '#000')
            : (dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'),
          transition: 'width 280ms cubic-bezier(0.2,0.7,0.2,1), background 200ms ease',
        }} />
      ))}
    </div>
  )
}

// ── InkCTA ────────────────────────────────────────────────────────────────────

interface InkCTAProps {
  children: React.ReactNode
  onClick?: () => void
  arrow?: boolean
  secondary?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}

export function InkCTA({ children, onClick, arrow = true, secondary = false, disabled, type = 'button' }: InkCTAProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: 56,
        background: secondary ? 'transparent' : '#000',
        color: secondary ? '#000' : '#F4F3F1',
        border: secondary ? '1px solid #000' : 'none',
        fontFamily: INTER,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 22px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span>{children}</span>
      {arrow && (
        <span style={{ fontFamily: HW, fontSize: 18, fontWeight: 300, letterSpacing: 0 }}>→</span>
      )}
    </button>
  )
}

// ── LogoMark ──────────────────────────────────────────────────────────────────

export function LogoMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/onboarding/1nri-logo-black.png"
        alt="1NRI"
        style={{ height: 14, width: 'auto', display: 'block' }}
      />
      <div style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.25)' }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/onboarding/ua-logo-black.png"
        alt="Unlikely Alliances"
        style={{ height: 13, width: 'auto', display: 'block' }}
      />
    </div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────

interface TopBarProps {
  step: number
  onBack?: () => void
  desktop?: boolean
}

export function TopBar({ step, onBack, desktop }: TopBarProps) {
  return (
    <div style={{
      padding: desktop ? '32px 0 0' : '70px 24px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 5,
    }}>
      {/* Back affordance — hidden on step 0 */}
      <div style={{ width: 28, display: 'flex', alignItems: 'center' }}>
        {step > 0 && onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      <LogoMark />

      <StepTicks step={step} />
    </div>
  )
}
