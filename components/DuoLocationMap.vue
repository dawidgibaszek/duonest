<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import type { Marker, Map as LeafletMap } from 'leaflet'
import type { DuoMapPin } from '~/utils/duoMapPin'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{ mine: DuoMapPin | null; partner: DuoMapPin | null; preview?: boolean; detailsTop?: number; controls?: HTMLElement }>()
const emit = defineEmits<{ open: [] }>()
const apple = Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform()
const surface = ref<HTMLElement>()
const failed = ref(false)
const bottomInset = computed(() => props.detailsTop === undefined ? 0 : Math.max(0, (surface.value?.getBoundingClientRect().bottom ?? 0) - props.detailsTop))
let leaflet: typeof import('leaflet') | undefined
let map: LeafletMap | undefined
let observer: ResizeObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let markers: Array<Marker | undefined> = []
const markerIdentities: string[] = []
let visiblePoints = 0
let needsFit = true

function fit() {
  if (!map || !leaflet || !surface.value?.clientWidth || !surface.value.clientHeight) return
  const points = markers.flatMap(marker => marker ? [marker.getLatLng()] : [])
  if (points.length) {
    if (props.preview && points[0]) map.setView(points[0], 16, { animate: false })
    else {
      const padding = Math.min(bottomInset.value, map.getSize().y * 0.53)
      map.fitBounds(leaflet.latLngBounds(points), {
        paddingTopLeft: [52, 78], paddingBottomRight: [52, 32 + padding], maxZoom: 16, animate: false
      })
    }
    needsFit = false
  }
}

function separatePins() {
  const [mine, partner] = markers
  if (!map || !mine || !partner) {
    for (const marker of markers) marker?.getElement()?.style.removeProperty('--duo-pin-offset')
    return
  }
  const first = map.latLngToContainerPoint(mine.getLatLng())
  const second = map.latLngToContainerPoint(partner.getLatLng())
  const overlap = Math.abs(first.x - second.x) < 112 && Math.abs(first.y - second.y) < 48
  const order = first.x <= second.x ? 1 : -1
  mine.getElement()?.style.setProperty('--duo-pin-offset', overlap ? `${-56 * order}px` : '0px')
  partner.getElement()?.style.setProperty('--duo-pin-offset', overlap ? `${56 * order}px` : '0px')
}

function draw() {
  const instance = map
  const library = leaflet
  if (!instance || !library) return
  const points = [props.mine, props.partner]
  points.forEach((point, index) => {
    const marker = markers[index]
    if (!point) {
      marker?.remove()
      markers[index] = undefined
      return
    }
    const coords: [number, number] = [point.latitude, point.longitude]
    const identity = JSON.stringify([point.name, point.avatar, point.color])
    if (marker) marker.setLatLng(coords)
    if (marker && markerIdentities[index] === identity) return

    const pin = document.createElement('span')
    pin.className = 'duo-map-pin'
    const avatar = document.createElement('span')
    avatar.className = 'duo-map-pin-avatar'
    avatar.style.setProperty('--duo-pin-color', point.color)
    avatar.append(Array.from(point.name)[0]?.toLocaleUpperCase('pl-PL') || '?')
    if (point.avatar) {
      const photo = document.createElement('img')
      photo.alt = ''
      photo.addEventListener('error', () => photo.remove(), { once: true })
      photo.src = point.avatar
      avatar.append(photo)
    }
    const label = document.createElement('span')
    label.className = 'duo-map-pin-name'
    label.textContent = point.name
    pin.append(avatar, label)

    const icon = library.divIcon({ html: pin, className: 'duo-map-marker', iconSize: [0, 0] })
    if (marker) marker.setIcon(icon)
    else markers[index] = library.marker(coords, { icon, interactive: false, keyboard: false }).addTo(instance)
    markerIdentities[index] = identity
  })
  const count = points.filter(Boolean).length
  if (props.preview || count !== visiblePoints) {
    needsFit = true
    fit()
  }
  visiblePoints = count
  separatePins()
}

async function mountLeaflet() {
  try {
    leaflet = await import('leaflet')
    if (!surface.value) return
    map = leaflet.map(surface.value, {
      zoomControl: false,
      attributionControl: !props.preview,
      dragging: !props.preview,
      touchZoom: !props.preview,
      doubleClickZoom: !props.preview,
      scrollWheelZoom: !props.preview,
      boxZoom: !props.preview,
      keyboard: !props.preview
    })
    if (!props.preview) {
      map.attributionControl?.setPrefix(false)
      leaflet.control.zoom({ position: 'topright' }).addTo(map)
      map.on('zoomend', separatePins)
    }
    const initial = props.partner ?? props.mine
    map.setView(initial ? [initial.latitude, initial.longitude] : [52, 19], initial ? 16 : 5)
    const tiles = leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(map)
    tiles.on('tileerror', () => { failed.value = true })
    tiles.on('tileload', () => { failed.value = false })
    observer = new ResizeObserver(() => {
      map?.invalidateSize({ pan: false })
      if (needsFit) fit()
    })
    observer.observe(surface.value)
    draw()
  } catch {
    failed.value = true
  }
}

onMounted(() => {
  if (apple || !surface.value) return
  if (!props.preview) {
    void mountLeaflet()
    return
  }
  visibilityObserver = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    visibilityObserver?.disconnect()
    void mountLeaflet()
  })
  visibilityObserver.observe(surface.value)
})

watch(() => [props.mine, props.partner], draw)
onBeforeUnmount(() => {
  observer?.disconnect()
  visibilityObserver?.disconnect()
  map?.remove()
})
</script>

<template>
  <div class="duo-map" :class="{ 'duo-map--preview': preview }"
    :style="{ '--duo-map-bottom-inset': `${bottomInset}px` }">
    <DuoAppleLocationMap v-if="apple" :mine="mine" :partner="partner" :preview="Boolean(preview)" :details-top="detailsTop" :controls="controls" />
    <div v-else ref="surface" class="duo-map-surface" :role="preview ? undefined : 'region'"
      :aria-label="preview ? undefined : 'Mapa Waszych pozycji'" :aria-hidden="preview || undefined" />
    <button v-if="!apple && !preview" type="button" class="duo-map-center" aria-label="Dopasuj mapę do pozycji" @click="fit">
      <ion-icon :icon="ioniconsLocateOutline" aria-hidden="true" />
    </button>
    <button v-if="preview" type="button" class="duo-map-preview-link" aria-label="Otwórz mapę lokalizacji" @click="emit('open')" />
    <a v-if="preview && !apple" class="duo-map-credit" href="https://www.openstreetmap.org/copyright"
      target="_blank" rel="noopener">© OpenStreetMap</a>
    <span v-if="failed" class="duo-map-unavailable" role="status">Mapa jest chwilowo niedostępna</span>
  </div>
</template>

<style scoped>
.duo-map { height: clamp(260px, 43dvh, 520px); position: relative; isolation: isolate; overflow: hidden; background: var(--dn-cream); }
.duo-map--preview { height: clamp(112px, 18vw, 148px); border-radius: 12px; }
.duo-map-preview-link { position: absolute; inset: 0; z-index: 490; width: 100%; background: transparent; }
.duo-map-preview-link:focus-visible { outline-offset: -3px; }
.duo-map-credit { position: absolute; z-index: 500; right: 0; bottom: 0; padding: 2px 6px; border-radius: 5px 0 0; background: rgba(255, 255, 255, .9); color: #444; font-size: 10px; }
.duo-map :deep(.duo-map-pin) { position: absolute; display: grid; justify-items: center; gap: 3px; width: max-content; transform: translate(calc(-50% + var(--duo-pin-offset, 0px)), -15px); }
.duo-map :deep(.duo-map-pin-avatar) { position: relative; display: grid; place-items: center; width: 30px; height: 30px; overflow: hidden; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 1px 5px #0003; background: color-mix(in srgb, var(--duo-pin-color, #625642) 47%, black); color: #fff; font: 700 13px/1 system-ui, sans-serif; }
.duo-map :deep(.duo-map-pin-avatar img) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.duo-map :deep(.duo-map-pin-name) { max-width: 112px; padding: 2px 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-radius: 999px; background: #fff; color: #222; box-shadow: 0 1px 4px #0002; font: 600 11px/1.25 system-ui, sans-serif; }
.duo-map-surface { width: 100%; height: 100%; background: var(--dn-cream); }
.duo-map:not(.duo-map--preview) :deep(.leaflet-top.leaflet-right) { top: calc(var(--location-controls-safe-top, env(safe-area-inset-top)) + 55px); }
.duo-map:not(.duo-map--preview) :deep(.leaflet-bottom) { bottom: var(--duo-map-bottom-inset, 0px); }
.duo-map-center { position: absolute; z-index: 500; top: calc(var(--location-controls-safe-top, env(safe-area-inset-top)) + 12px); right: 12px; display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid var(--dn-line); border-radius: 14px; background: white; font-size: 23px; }
.duo-map-unavailable { position: absolute; z-index: 500; left: 12px; top: 12px; padding: 8px 10px; border-radius: 10px; background: white; color: var(--dn-muted); font-size: .75rem; }
</style>
