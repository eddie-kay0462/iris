'use client'

import { useRef, useState } from 'react'
import { uploadAllyAvatar } from './actions'

const CIRCLE_PX = 120 // preview circle diameter in CSS pixels
const OUTPUT_PX = 256  // final JPEG size

interface Props {
  ally: { id: string; full_name: string }
  onNext: (avatarUrl?: string) => void
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
  // Scale so image covers the preview circle
  const previewScale = Math.max(CIRCLE_PX / nw, CIRCLE_PX / nh)
  // How many source pixels fit inside the circle
  const srcSize = CIRCLE_PX / previewScale
  // Center of crop in source coords, shifted by drag offset
  const srcCenterX = nw / 2 - offsetX / previewScale
  const srcCenterY = nh / 2 - offsetY / previewScale
  // Top-left of crop, clamped so we never read outside the image
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

export function StepPhoto({ ally, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (imageSrc) URL.revokeObjectURL(imageSrc)
    setImageSrc(URL.createObjectURL(file))
    setOffset({ x: 0, y: 0 })
    // reset input so re-picking same file still fires onChange
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
    setError(null)
    try {
      const blob = await cropToJpeg(imgRef.current, offset.x, offset.y)
      const fd = new FormData()
      fd.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      const result = await uploadAllyAvatar(ally.id, fd)
      if ('error' in result) { setError(result.error); return }
      onNext(result.url)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
        📸
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Add a profile photo</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Help your team recognise you. This is completely optional.
        </p>
      </div>

      {/* Preview + drag area */}
      <div className="flex flex-col items-center gap-2">
        <div
          className={`rounded-full overflow-hidden border-2 bg-white/10 flex items-center justify-center relative select-none ${imageSrc ? 'cursor-grab active:cursor-grabbing border-white/40' : 'border-white/20'}`}
          style={{ width: CIRCLE_PX, height: CIRCLE_PX }}
          onMouseDown={imageSrc ? (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY) } : undefined}
          onMouseMove={imageSrc ? (e) => moveDrag(e.clientX, e.clientY) : undefined}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={imageSrc ? (e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY) } : undefined}
          onTouchMove={imageSrc ? (e) => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY) } : undefined}
          onTouchEnd={endDrag}
        >
          {imageSrc ? (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Preview"
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                minWidth: '100%',
                minHeight: '100%',
                width: 'auto',
                height: 'auto',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : (
            <span className="text-white text-2xl font-semibold">
              {getInitials(ally.full_name)}
            </span>
          )}
        </div>

        {imageSrc && (
          <p className="text-slate-500 text-xs tracking-wide">Drag to reposition</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-white/20 bg-white/5 text-white py-3 text-sm font-medium hover:bg-white/10 transition-colors"
      >
        {imageSrc ? 'Choose a different photo' : 'Choose photo'}
      </button>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      {imageSrc && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full rounded-xl bg-white text-slate-900 py-3 text-sm font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : 'Upload & Continue'}
        </button>
      )}

      <button
        onClick={() => onNext(undefined)}
        className="text-slate-400 text-sm hover:text-white transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}
