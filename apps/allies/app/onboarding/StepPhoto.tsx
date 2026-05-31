'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { uploadAllyAvatar } from './actions'
import { toast } from 'sonner'
import { TopBar, Eyebrow, InkCTA, HW, A, useIsDesktop } from './atoms'

const CIRCLE_PX = 168
const OUTPUT_PX = 256

interface Props {
  ally: { id: string; full_name: string }
  onNext: (avatarUrl?: string) => void
  onBack: () => void
  step: number
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function cropToJpeg(
  img: HTMLImageElement,
  offsetX: number,
  offsetY: number,
): Promise<Blob> {
  const { naturalWidth: nw, naturalHeight: nh } = img
  const previewScale = Math.max(CIRCLE_PX / nw, CIRCLE_PX / nh)
  const srcSize = CIRCLE_PX / previewScale
  const srcCenterX = nw / 2 - offsetX / previewScale
  const srcCenterY = nh / 2 - offsetY / previewScale
  const srcX = Math.max(0, Math.min(nw - srcSize, srcCenterX - srcSize / 2))
  const srcY = Math.max(0, Math.min(nh - srcSize, srcCenterY - srcSize / 2))

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_PX
  canvas.height = OUTPUT_PX
  canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_PX, OUTPUT_PX)

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.88,
    ),
  )
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

export function StepPhoto({ ally, onNext, onBack, step }: Props) {
  const isDesktop = useIsDesktop()

  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [uploading, setUploading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageSrc) URL.revokeObjectURL(imageSrc)
    setImageSrc(URL.createObjectURL(file))
    setOffset({ x: 0, y: 0 })
    e.target.value = ''
  }

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { startX: clientX, startY: clientY, ox: offset.x, oy: offset.y }
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragRef.current) return
    const dx = clientX - dragRef.current.startX
    const dy = clientY - dragRef.current.startY
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy })
  }

  function endDrag() {
    dragRef.current = null
  }

  async function handleUpload() {
    if (!imageSrc || !imgRef.current) return
    setUploading(true)
    try {
      const blob = await cropToJpeg(imgRef.current, offset.x, offset.y)
      const fd = new FormData()
      fd.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      const result = await uploadAllyAvatar(ally.id, fd)
      if ('error' in result) { toast.error(result.error, { duration: 6000 }); return }
      onNext(result.url)
    } catch {
      toast.error('Upload failed. Please try again.', { duration: 6000 })
    } finally {
      setUploading(false)
    }
  }

  const initials = getInitials(ally.full_name)

  const photoFrame = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.3 }}
      style={{ display: 'flex', justifyContent: 'center' }}
    >
      <div style={{
        width: 220,
        height: 220,
        position: 'relative',
        border: '1px solid #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {/* Corner ticks */}
        {([
          { top: -1, left: -1, borderTop: '1px solid #000', borderLeft: '1px solid #000' } as React.CSSProperties,
          { top: -1, right: -1, borderTop: '1px solid #000', borderRight: '1px solid #000' } as React.CSSProperties,
          { bottom: -1, left: -1, borderBottom: '1px solid #000', borderLeft: '1px solid #000' } as React.CSSProperties,
          { bottom: -1, right: -1, borderBottom: '1px solid #000', borderRight: '1px solid #000' } as React.CSSProperties,
        ]).map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 12, height: 12, background: 'transparent', ...s }} />
        ))}

        {/* Inner circle — drag zone */}
        <div
          style={{
            width: CIRCLE_PX,
            height: CIRCLE_PX,
            borderRadius: '50%',
            background: '#E7E2D8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            cursor: imageSrc ? 'grab' : 'default',
            userSelect: 'none',
          }}
          onMouseDown={imageSrc ? (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY) } : undefined}
          onMouseMove={imageSrc ? (e) => moveDrag(e.clientX, e.clientY) : undefined}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={imageSrc ? (e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY) } : undefined}
          onTouchMove={imageSrc ? (e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY) } : undefined}
          onTouchEnd={endDrag}
        >
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Preview"
              draggable={false}
              style={{
                position: 'absolute',
                minWidth: '100%',
                minHeight: '100%',
                width: 'auto',
                height: 'auto',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                pointerEvents: 'none',
              }}
            />
          ) : (
            <span style={{ fontFamily: HW, fontWeight: 300, fontSize: 64, color: '#000', letterSpacing: '-0.02em' }}>
              {initials}
            </span>
          )}

          {/* Camera pip — spring pop */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.6 }}
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #E7E2D8',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4F3F1" strokeWidth="1.5">
              <path d="M3 8h3l2-3h8l2 3h3v11H3z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )

  const actions = (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
        style={{ marginTop: 14, textAlign: 'center' }}
      >
        <Eyebrow style={{ fontSize: 9, color: A.meta }}>JPG · PNG · UP TO 5MB</Eyebrow>
      </motion.div>

      <div style={{ flex: 1 }} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.55 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {/* Overlay the native file input on top of the button — avoids programmatic .click() which Safari blocks */}
        <div style={{ position: 'relative' }}>
          <InkCTA>
            {imageSrc ? 'Choose a different photo' : 'Choose Photo'}
          </InkCTA>
          <input
            type="file"
            accept="image/*"
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
              width: '100%',
              height: '100%',
              fontSize: 0,
            }}
            onChange={handleFileChange}
          />
        </div>
        {imageSrc && (
          <InkCTA onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload & Continue'}
          </InkCTA>
        )}
        <button
          onClick={() => onNext(undefined)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '10px 0',
            fontFamily: HW,
            fontWeight: 300,
            fontSize: 13,
            color: A.body,
            textDecoration: 'underline',
            textUnderlineOffset: 4,
          }}
        >
          Skip for now
        </button>
      </motion.div>
    </>
  )

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        {/* Left: dark editorial panel — initials fade up */}
        <div style={{
          width: '50%',
          flexShrink: 0,
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <motion.span
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
            style={{
              fontFamily: HW,
              fontWeight: 300,
              fontSize: 120,
              color: '#F4F3F1',
              letterSpacing: '-0.04em',
              userSelect: 'none',
            }}
          >
            {initials}
          </motion.span>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
            style={{ position: 'absolute', bottom: 40, left: 40 }}
          >
            <Eyebrow style={{ color: 'rgba(244,243,241,0.35)' }}>
              this is where your face goes
            </Eyebrow>
          </motion.div>
        </div>

        {/* Right: content */}
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

            <div style={{ paddingTop: 48, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <motion.div initial="hidden" animate="show" variants={stagger} style={{ display: 'flex', flexDirection: 'column' }}>
                <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
                  <Eyebrow>Chapter 03 · Your face</Eyebrow>
                </motion.div>
                <motion.h1 variants={fadeUp} style={{
                  fontFamily: HW, fontWeight: 300, fontSize: 44,
                  lineHeight: 1, color: A.ink, margin: 0, letterSpacing: '-0.01em',
                }}>
                  Show your<br />face.
                </motion.h1>
                <motion.p variants={fadeUp} style={{
                  fontFamily: HW, fontWeight: 300, fontSize: 14,
                  lineHeight: 1.5, color: A.body, margin: '16px 0 28px', maxWidth: 300,
                }}>
                  So customers know who they&apos;re buying from. The Allies team will see it too.
                </motion.p>
              </motion.div>

              {photoFrame}
              {actions}

              <div style={{ paddingBottom: 48 }} />
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
            <Eyebrow>Chapter 03 · Your face</Eyebrow>
          </motion.div>
          <motion.h1 variants={fadeUp} style={{
            fontFamily: HW, fontWeight: 300, fontSize: 38,
            lineHeight: 1, color: A.ink, margin: 0, letterSpacing: '-0.01em',
          }}>
            Show your<br />face.
          </motion.h1>
          <motion.p variants={fadeUp} style={{
            fontFamily: HW, fontWeight: 300, fontSize: 14,
            lineHeight: 1.5, color: A.body, margin: '16px 0 0', maxWidth: 300,
          }}>
            So customers know who they&apos;re buying from. The Allies team will see it too.
          </motion.p>
        </motion.div>

        <div style={{ marginTop: 36 }}>
          {photoFrame}
        </div>

        {actions}

        <div style={{ padding: '0 0 16px' }} />
      </div>
    </div>
  )
}
