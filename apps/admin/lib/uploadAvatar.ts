import { getToken } from './api/client'
import { resizeAvatarToJpeg } from './resizeAvatar'

export async function uploadAvatar(
  file: File,
  storagePath: string,
  table: 'allies' | 'profiles',
  recordId: string,
): Promise<string> {
  const blob = await resizeAvatarToJpeg(file)
  const fd = new FormData()
  fd.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
  fd.append('storagePath', `${storagePath}.jpg`)
  fd.append('table', table)
  fd.append('recordId', recordId)

  const token = getToken()
  const res = await fetch('/api/avatars/upload', {
    method: 'POST',
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Upload failed')
  }

  const { url } = await res.json()
  return url as string
}
