<script setup lang="ts">
import { registerPlugin } from '@capacitor/core'
import type { DuoPosition } from '~/composables/useDuoLocation'

type Point = Pick<DuoPosition, 'latitude' | 'longitude'>
type MapFrame = { x: number; y: number; width: number; height: number }

const maps = registerPlugin<{
  snapshot(options: { partner: Point; width: number; height: number }): Promise<{ image: string }>
  render(options: { id: string; frame: MapFrame; clip: MapFrame; mine: Point | null; partner: Point | null; fit: boolean }): Promise<void>
  remove(options: { id: string }): Promise<void>
}>('DuoAppleMaps')

const props = defineProps<{ mine: DuoPosition | null; partner: DuoPosition | null; preview: boolean }>()
const host = ref<HTMLElement>()
const image = ref('')
const failed = ref(false)
const id = useId()
let resizeObserver: ResizeObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let scrollHost: HTMLElement | undefined
let overlay: HTMLElement | null = null
let animation = 0
let visible = false
let stopped = false
let requestVersion = 0
let lastInput = ''
let lastCount = -1

function frame(rect: DOMRect): MapFrame {
  return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
}

function coordinate(position: DuoPosition | null): Point | null {
  return position && { latitude: position.latitude, longitude: position.longitude }
}

function update() {
  cancelAnimationFrame(animation)
  animation = requestAnimationFrame(() => {
    if (!host.value || stopped) return
    const area = frame(host.value.getBoundingClientRect())
    const partner = coordinate(props.partner)

    if (props.preview) {
      if (!visible || !area.width || !area.height || !partner) return
      const input = JSON.stringify([area.width, area.height, partner])
      if (input === lastInput) return
      lastInput = input
      const version = ++requestVersion
      void maps.snapshot({ partner, width: area.width, height: area.height }).then(result => {
        if (version !== requestVersion) return
        image.value = result.image
        failed.value = false
      }).catch(() => {
        if (version === requestVersion) {
          image.value = ''
          failed.value = true
          lastInput = ''
        }
      })
      return
    }

    const mine = coordinate(props.mine)
    const count = Number(Boolean(mine)) + Number(Boolean(partner))
    const clip = visible && !document.hidden
      ? frame(scrollHost?.getBoundingClientRect() ?? new DOMRect(0, 0, innerWidth, innerHeight))
      : { x: 0, y: 0, width: 0, height: 0 }
    const input = JSON.stringify([area, clip, mine, partner])
    if (input === lastInput) return
    lastInput = input
    const fit = lastCount !== count
    if (clip.width && clip.height && area.width && area.height &&
      area.x < clip.x + clip.width && area.x + area.width > clip.x &&
      area.y < clip.y + clip.height && area.y + area.height > clip.y) lastCount = count
    void maps.render({ id, frame: area, clip, mine, partner, fit }).catch(() => {
      if (!stopped) {
        failed.value = true
        lastInput = ''
      }
    })
  })
}

onMounted(async () => {
  const surface = host.value
  if (!surface) return
  if (!props.preview) {
    overlay = surface.closest('ion-modal')
    scrollHost = await surface.closest('ion-content')?.getScrollElement().catch(() => undefined)
    if (stopped) return
    scrollHost?.addEventListener('scroll', update, { passive: true })
    overlay?.addEventListener('touchmove', update, { passive: true })
    window.addEventListener('resize', update)
    document.addEventListener('visibilitychange', update)
  }
  resizeObserver = new ResizeObserver(update)
  resizeObserver.observe(surface)
  visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting)
    update()
  })
  visibilityObserver.observe(surface)
})

watch(() => [props.mine, props.partner], update)
onBeforeUnmount(() => {
  stopped = true
  ++requestVersion
  cancelAnimationFrame(animation)
  resizeObserver?.disconnect()
  visibilityObserver?.disconnect()
  scrollHost?.removeEventListener('scroll', update)
  overlay?.removeEventListener('touchmove', update)
  window.removeEventListener('resize', update)
  document.removeEventListener('visibilitychange', update)
  if (!props.preview) void maps.remove({ id }).catch(() => {})
})
</script>

<template>
  <div ref="host" class="apple-location-map">
    <img v-if="preview && image" :src="image" alt="" draggable="false" />
    <span v-if="failed" class="apple-location-error" role="status">Mapa jest chwilowo niedostępna</span>
  </div>
</template>

<style scoped>
.apple-location-map { position: absolute; inset: 0; background: var(--dn-cream); }
.apple-location-map img { display: block; width: 100%; height: 100%; object-fit: fill; }
.apple-location-error { position: absolute; top: 12px; left: 12px; padding: 8px 10px; border-radius: 10px; background: white; color: var(--dn-muted); font-size: .75rem; }
</style>
