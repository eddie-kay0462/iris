'use client'

import { useState } from 'react'

interface AvatarProps {
  url?: string | null
  name: string
  size?: number
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ url, name, size = 32 }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImage = !!url && !imgError
  const fontSize = Math.floor(size / 3)

  return (
    <div
      style={{ width: size, height: size, fontSize }}
      className="rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-slate-200 text-slate-700 font-semibold select-none"
    >
      {showImage ? (
        <img
          src={url}
          alt={name}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
