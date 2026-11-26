import { registerPlugin } from '@capacitor/core'
import type { DuoMapPin } from './duoMapPin'

export type MapFrame = { x: number; y: number; width: number; height: number }

export const appleMaps = registerPlugin<{
  snapshot(options: { partner: DuoMapPin; width: number; height: number }): Promise<{ image: string }>
  render(options: {
    id: string
    frame: MapFrame
    clip: MapFrame
    cover?: MapFrame
    mine: DuoMapPin | null
    partner: DuoMapPin | null
    fit: boolean
  }): Promise<void>
  remove(options: { id: string }): Promise<void>
  navigate(destination: Pick<DuoMapPin, 'latitude' | 'longitude' | 'name'>): Promise<void>
}>('DuoAppleMaps')
