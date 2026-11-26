import { CapacitorHttp, registerPlugin } from '@capacitor/core'
import type { DuoMapPin } from './duoMapPin'

export const androidMapAvatars = registerPlugin<{
  setMarkers(options: { id: string; points: Array<{ latitude: number; longitude: number; name: string; icon: string }> }): Promise<void>
}>('DuoGoogleMapPreview')

export async function androidMapAvatar(point: DuoMapPin) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(48, 48, 48, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(48, 48, 43, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = point.color || '#1c1b19'
  ctx.fillRect(0, 0, 96, 96)
  ctx.fillStyle = 'white'
  ctx.font = 'bold 44px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(Array.from(point.name.trim())[0]?.toLocaleUpperCase('pl-PL') || '?', 48, 49)
  if (point.avatar) {
    try {
      const photo = new Image()
      if (point.avatar.startsWith('https://')) {
        const response = await CapacitorHttp.get({ url: point.avatar, responseType: 'arraybuffer', connectTimeout: 4000, readTimeout: 5000 })
        if (response.status !== 200) throw new Error('Avatar unavailable')
        photo.src = 'data:image/*;base64,' + response.data
      } else if (point.avatar.startsWith('data:image/')) {
        photo.src = point.avatar
      } else {
        photo.crossOrigin = 'anonymous'
        photo.src = point.avatar
      }
      await photo.decode()
      const side = Math.min(photo.naturalWidth, photo.naturalHeight)
      ctx.drawImage(photo, (photo.naturalWidth - side) / 2, (photo.naturalHeight - side) / 2, side, side, 5, 5, 86, 86)
    } catch { /* Keep the profile initial if the photo cannot be loaded. */ }
  }
  return canvas.toDataURL('image/png')
}
