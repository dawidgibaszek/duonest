<script setup lang="ts">
import { GoogleMap, LatLngBounds } from '@capacitor/google-maps'
import type { DuoMapPin } from '~/utils/duoMapPin'
import { androidMapAvatar, androidMapAvatars } from '~/utils/androidMapAvatar'
import { syncAndroidMapTouchExclusions } from '~/composables/useDuoLocation'

let activeMaps = 0

const props = defineProps<{ mine: DuoMapPin | null; partner: DuoMapPin | null; detailsTop?: number; controls?: HTMLElement | null; interactive?: boolean }>()

function syncOverlayExclusions() {
  const w = Math.max(1, innerWidth)
  const h = Math.max(1, innerHeight)
  const zones: Array<{ left: number; top: number; right: number; bottom: number }> = []
  const headerRect = props.controls?.getBoundingClientRect()
  if (headerRect && headerRect.width > 0 && headerRect.height > 0) {
    const pad = 6
    zones.push({
      left: Math.max(0, (headerRect.left - pad) / w),
      top: Math.max(0, (headerRect.top - pad) / h),
      right: Math.min(1, (headerRect.right + pad) / w),
      bottom: Math.min(1, (headerRect.bottom + pad) / h),
    })
  }
  if (typeof props.detailsTop === 'number' && Number.isFinite(props.detailsTop)) {
    const top = Math.max(0, Math.min(1, (props.detailsTop - 4) / h))
    if (top < 1) zones.push({ left: 0, top, right: 1, bottom: 1 })
  }
  syncAndroidMapTouchExclusions(zones)
}
const host = ref<HTMLElement>()
const failed = ref(false)
const id = useId()
let map: GoogleMap | undefined
const icons = new Map<string, Promise<string>>()
let stopped = false
let currentPoints = ''
let updateQueue = Promise.resolve()
let observer: ResizeObserver | undefined
let registered = false

function disableMapTouch() {
  if (map) void map.disableTouch().catch(() => {})
}

function releaseTransparency() {
  if (!registered) return
  registered = false
  activeMaps--
  if (!activeMaps) document.documentElement.classList.remove('dn-native-google-map-full')
}

function sync() {
  updateQueue = updateQueue.then(async () => {
    if (!map || stopped) return
    const points = [props.mine, props.partner].filter((point): point is DuoMapPin => Boolean(point))
    const state = JSON.stringify(points)
    if (state === currentPoints) return
    const markers = await Promise.all(points.map(async point => {
      const key = JSON.stringify([point.name, point.avatar, point.color])
      if (!icons.has(key)) icons.set(key, androidMapAvatar(point))
      return { latitude: point.latitude, longitude: point.longitude, name: point.name, icon: (await icons.get(key))! }
    }))
    if (stopped) return
    await androidMapAvatars.setMarkers({ id, points: markers })
    currentPoints = state
    failed.value = false
    if (points.length === 1) {
      await map.setCamera({ coordinate: { lat: points[0]!.latitude, lng: points[0]!.longitude }, zoom: 16 })
    } else if (points.length === 2) {
      const [first, second] = points
      const southwest = { lat: Math.min(first!.latitude, second!.latitude), lng: Math.min(first!.longitude, second!.longitude) }
      const northeast = { lat: Math.max(first!.latitude, second!.latitude), lng: Math.max(first!.longitude, second!.longitude) }
      await map.fitBounds(new LatLngBounds({ southwest, northeast, center: {
        lat: (southwest.lat + northeast.lat) / 2, lng: (southwest.lng + northeast.lng) / 2
      } }), 80)
    }
  }).catch(() => { failed.value = true })
}

async function mountMap() {
  if (!host.value) return
  registered = true
  activeMaps++
  document.documentElement.classList.add('dn-native-google-map-full')
  try {
    const first = props.partner ?? props.mine
    map = await GoogleMap.create({
      id,
      element: host.value,
      apiKey: '', // Android reads the restricted key from AndroidManifest.xml.
      config: { center: { lat: first?.latitude ?? 52, lng: first?.longitude ?? 19 }, zoom: first ? 16 : 5 }
    })
    if (stopped) { await map.destroy(); return }
    if (props.interactive === false) disableMapTouch()
    else void map.enableTouch().catch(() => {})
    observer = new ResizeObserver(() => {
      syncOverlayExclusions()
      map?.setPadding({ top: 0, left: 0, right: 0, bottom: Math.max(0, (host.value?.getBoundingClientRect().bottom ?? 0) - (props.detailsTop ?? innerHeight)) }).catch(() => {})
    })
    observer.observe(host.value)
    if (props.controls) observer.observe(props.controls)
    syncOverlayExclusions()
    sync()
  } catch {
    failed.value = true
    releaseTransparency()
  }
}

onMounted(() => { void mountMap() })

watch(() => [props.mine, props.partner], sync)
watch(() => props.interactive, interactive => {
  if (interactive === false) disableMapTouch()
  else if (map) void map.enableTouch().catch(() => {})
})
watch(() => props.controls, (next, prev) => {
  if (prev && observer) observer.unobserve(prev)
  if (next && observer) observer.observe(next)
  syncOverlayExclusions()
}, { immediate: true })
watch(() => props.detailsTop, () => {
  syncOverlayExclusions()
  if (!map || !host.value) return
  const bottom = Math.max(0, host.value.getBoundingClientRect().bottom - (props.detailsTop ?? innerHeight))
  void map.setPadding({ top: 0, left: 0, right: 0, bottom }).catch(() => {})
}, { immediate: true })
onBeforeUnmount(() => {
  stopped = true
  observer?.disconnect()
  syncAndroidMapTouchExclusions([])
  const instance = map
  map = undefined
  if (instance) {
    void instance.disableTouch().catch(() => {}).then(() => instance.destroy().catch(() => {}))
  }
  releaseTransparency()
})
</script>

<template>
  <div class="android-google-map">
    <capacitor-google-map ref="host" class="android-google-map-view" />
    <span v-if="failed" class="android-google-map-error" role="status">Mapa jest chwilowo niedostępna</span>
  </div>
</template>

<style scoped>
.android-google-map { position: absolute; inset: 0; }
.android-google-map-view { display: block; width: 100%; height: 100%; background: transparent; }
.android-google-map-error { position: absolute; top: 12px; left: 12px; padding: 8px 10px; border-radius: 10px; background: white; color: var(--dn-muted); font-size: .75rem; }
</style>
