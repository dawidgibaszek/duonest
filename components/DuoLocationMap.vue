<script setup lang="ts">
import type { CircleMarker, Map as LeafletMap } from 'leaflet'
import type { DuoPosition } from '~/composables/useDuoLocation'
import 'leaflet/dist/leaflet.css'

const props = defineProps<{ mine: DuoPosition | null; partner: DuoPosition | null }>()
const surface = ref<HTMLElement>()
const failed = ref(false)
let leaflet: typeof import('leaflet') | undefined
let map: LeafletMap | undefined
let observer: ResizeObserver | undefined
let markers: Array<CircleMarker | undefined> = []
let visiblePoints = 0
let needsFit = true

function fit() {
  if (!map || !leaflet || !surface.value?.clientWidth || !surface.value.clientHeight) return
  const points = markers.flatMap(marker => marker ? [marker.getLatLng()] : [])
  if (points.length) {
    map.fitBounds(leaflet.latLngBounds(points), { padding: [28, 28], maxZoom: 16, animate: false })
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
      radius: 10, weight: 3, color: '#fff', fillColor: colors[index], fillOpacity: 1
    }).addTo(instance)
  })
  const count = points.filter(Boolean).length
  if (count !== visiblePoints) {
    needsFit = true
    fit()
  }
  visiblePoints = count
}

onMounted(async () => {
  try {
    leaflet = await import('leaflet')
    if (!surface.value) return
    map = leaflet.map(surface.value, { zoomControl: false }).setView([52, 19], 5)
    leaflet.control.zoom({ position: 'bottomright' }).addTo(map)
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
})

watch(() => [props.mine, props.partner], draw)
onBeforeUnmount(() => {
  observer?.disconnect()
  map?.remove()
})
</script>

<template>
  <div class="duo-map">
    <div ref="surface" class="duo-map-surface" role="region" aria-label="Mapa Waszych pozycji" />
    <button type="button" class="duo-map-center" aria-label="Dopasuj mapę do pozycji" @click="fit">
      <ion-icon :icon="ioniconsLocateOutline" aria-hidden="true" />
    </button>
    <span v-if="failed" class="duo-map-unavailable" role="status">Mapa jest chwilowo niedostępna</span>
  </div>
</template>

<style scoped>
.duo-map { height: clamp(260px, 43dvh, 520px); position: relative; isolation: isolate; overflow: hidden; background: var(--dn-cream); }
.duo-map-surface { width: 100%; height: 100%; background: var(--dn-cream); }
.duo-map-center { position: absolute; z-index: 500; top: 12px; right: 12px; display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid var(--dn-line); border-radius: 14px; background: white; font-size: 23px; }
.duo-map-unavailable { position: absolute; z-index: 500; left: 12px; top: 12px; padding: 8px 10px; border-radius: 10px; background: white; color: var(--dn-muted); font-size: .75rem; }
</style>
