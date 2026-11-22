<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import type { CircleMarker, Map as LeafletMap } from 'leaflet'
import type { DuoPosition } from '~/composables/useDuoLocation'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{ mine: DuoPosition | null; partner: DuoPosition | null; preview?: boolean }>()
const emit = defineEmits<{ open: [] }>()
const apple = Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform()
const surface = ref<HTMLElement>()
const failed = ref(false)
let leaflet: typeof import('leaflet') | undefined
let map: LeafletMap | undefined
let observer: ResizeObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let markers: Array<CircleMarker | undefined> = []
let visiblePoints = 0
let needsFit = true

function fit() {
  if (!map || !leaflet || !surface.value?.clientWidth || !surface.value.clientHeight) return
  const points = markers.flatMap(marker => marker ? [marker.getLatLng()] : [])
  if (points.length) {
    if (props.preview && points[0]) map.setView(points[0], 16, { animate: false })
    else map.fitBounds(leaflet.latLngBounds(points), { padding: [28, 28], maxZoom: 16, animate: false })
    needsFit = false
  }
}

function draw() {
  const instance = map
  const library = leaflet
  if (!instance || !library) return
  const colors = ['#51432c', '#23272e']
  const points = [props.mine, props.partner]
  points.forEach((point, index) => {
    if (!point) {
      markers[index]?.remove()
      markers[index] = undefined
      return
    }
    const coords: [number, number] = [point.latitude, point.longitude]
    if (markers[index]) markers[index].setLatLng(coords)
    else markers[index] = library.circleMarker(coords, {
      radius: props.preview ? 7 : 10, weight: 3, color: '#fff', fillColor: colors[index], fillOpacity: 1
    }).addTo(instance)
  })
  const count = points.filter(Boolean).length
  if (props.preview || count !== visiblePoints) {
    needsFit = true
    fit()
  }
  visiblePoints = count
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
    if (!props.preview) leaflet.control.zoom({ position: 'bottomright' }).addTo(map)
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
  <div class="duo-map" :class="{ 'duo-map--preview': preview }">
    <DuoAppleLocationMap v-if="apple" :mine="mine" :partner="partner" :preview="Boolean(preview)" />
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
.duo-map-surface { width: 100%; height: 100%; background: var(--dn-cream); }
.duo-map-center { position: absolute; z-index: 500; top: 12px; right: 12px; display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid var(--dn-line); border-radius: 14px; background: white; font-size: 23px; }
.duo-map-unavailable { position: absolute; z-index: 500; left: 12px; top: 12px; padding: 8px 10px; border-radius: 10px; background: white; color: var(--dn-muted); font-size: .75rem; }
</style>
