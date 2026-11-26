<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { createAnimation } from '@ionic/vue'
import { nativeLocation, useDuoLocation, type DuoPosition } from '~/composables/useDuoLocation'
import { appleMaps } from '~/utils/duoAppleMaps'
import type { DuoMapPin } from '~/utils/duoMapPin'

const { currentUser, partnerUser, currentUserAccentColor, partnerUserAccentColor } = useDuoState()
const props = defineProps<{ partnerName: string }>()
const {
  ownShared, myPosition, theirPosition, distance, sharing, sharingError, updatingSharing, clock,
  isLocationStatusOn, isLocationAttentionNeeded, locationStatusLabel, locationModeInfo, locationSettingsButtonLabel,
  refreshLocationStatus, openLocationSettings, startSharing, stopSharing
} = useDuoLocation()
const isOpen = ref(false)
const closing = ref(false)
const mapReady = ref(false)
const sheet = ref<HTMLElement>()
const expanded = ref(true)
const dragOffset = ref<number>()
const detailsTop = ref<number>()
const coveringMap = ref(false)
const mapControls = ref<HTMLElement>()
let trackFrame = 0
let closeTimer: ReturnType<typeof setTimeout> | undefined
let coverFinished = false
let completingClose = false
const titleId = useId()
const detailsTitleId = useId()
let drag: { id: number; y: number; offset: number; limit: number; moved: boolean } | undefined
let suppressTap = false
let sheetObserver: ResizeObserver | undefined

function measureSheet() {
  detailsTop.value = sheet.value?.getBoundingClientRect().top
}

function trackSnap() {
  cancelAnimationFrame(trackFrame)
  const until = performance.now() + 300
  const frame = () => {
    measureSheet()
    if (sheet.value && performance.now() < until) trackFrame = requestAnimationFrame(frame)
  }
  trackFrame = requestAnimationFrame(frame)
}

function startDrag(event: PointerEvent) {
  const el = sheet.value
  if (!el || !event.isPrimary || event.button !== 0 || closing.value) return
  const heading = el.querySelector<HTMLElement>('.location-details-heading')!
  const floor = heading.offsetTop + heading.offsetHeight + parseFloat(getComputedStyle(el).paddingBottom) + 8
  const offset = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42
  suppressTap = false
  drag = { id: event.pointerId, y: event.clientY, offset, limit: Math.max(0, el.offsetHeight - floor), moved: false }
}

function moveDrag(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const dy = event.clientY - drag.y
  if (!drag.moved && Math.abs(dy) < 5) return
  drag.moved = true
  sheet.value!.setPointerCapture(event.pointerId)
  dragOffset.value = Math.max(0, Math.min(drag.limit, drag.offset + dy))
  void nextTick(measureSheet)
}

function endDrag(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  if (drag.moved) {
    suppressTap = true
    const dy = event.clientY - drag.y
    if (event.type === 'pointerup' && Math.abs(dy) >= 16) expanded.value = dy < 0
    dragOffset.value = undefined
    trackSnap()
  }
  drag = undefined
}

function guardClick(event: MouseEvent) {
  if (suppressTap && event.detail !== 0) {
    event.preventDefault()
    event.stopPropagation()
    suppressTap = false
  }
}

function toggleSheet() {
  expanded.value = !expanded.value
  trackSnap()
}

async function showMap() {
  expanded.value = true
  routeError.value = ''
  settingsError.value = ''
  void refreshLocationStatus()
  mapReady.value = true
  await nextTick()
  if (sheet.value) {
    sheetObserver = new ResizeObserver(measureSheet)
    sheetObserver.observe(sheet.value)
    sheetObserver.observe(sheet.value.parentElement!)
    measureSheet()
  }
}

const native = Capacitor.isNativePlatform()
const platform = Capacitor.getPlatform()
const smoothAndroidMap = native && platform === 'android'

const leaveMapAnimation = (element: HTMLElement) => createAnimation()
  .addElement(element)
  .duration(180)
  .easing('ease-out')
  .fromTo('opacity', 1, 0)
  .afterClearStyles(['opacity'])

async function finishCoveredClose() {
  if (!closing.value || !coverFinished || completingClose) return
  completingClose = true
  mapReady.value = false
  await nextTick()
  isOpen.value = false
}

function closeMap() {
  if (closing.value) return
  beginMapDismiss()
  if (!smoothAndroidMap) {
    isOpen.value = false
    return
  }
  coveringMap.value = true
  closeTimer = setTimeout(() => {
    coverFinished = true
    void finishCoveredClose()
  }, 320)
}

function beginMapDismiss() {
  closing.value = true
}

function canDismissMap() {
  if (coverFinished) return true
  closeMap()
  return false
}

function finishMapDismiss() {
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = undefined
  coverFinished = false
  completingClose = false
  coveringMap.value = false
  mapReady.value = false
  isOpen.value = false
  closing.value = false
  drag = undefined
  dragOffset.value = undefined
  detailsTop.value = undefined
  sheetObserver?.disconnect()
  cancelAnimationFrame(trackFrame)
}

onBeforeUnmount(() => {
  if (closeTimer) clearTimeout(closeTimer)
  sheetObserver?.disconnect()
  cancelAnimationFrame(trackFrame)
})
const stopping = ref(false)
const routeError = ref('')
const settingsError = ref('')

const formatter = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const distanceLabel = computed(() => {
  if (distance.value === null) return ''
  return distance.value < 1000 ? `${Math.round(distance.value)} m` : `${formatter.format(distance.value / 1000)} km`
})

function address(point: DuoPosition) {
  const a = point.address
  return [[a?.street, a?.number].filter(Boolean).join(' '), a?.city, a?.country].filter(Boolean)
}

function age(point: DuoPosition) {
  const minutes = Math.max(0, Math.floor((clock.value - point.captured_at) / 60_000))
  if (minutes === 0) return 'Przed chwilą'
  if (minutes < 60) return `${minutes} min temu`
  return `${Math.floor(minutes / 60)} godz. temu`
}

const ownIdentity = computed(() => ({
  name: currentUser.value.name?.trim() || 'Ty',
  avatar: currentUser.value.avatar_url,
  color: currentUserAccentColor.value
}))
const partnerIdentity = computed(() => ({
  name: partnerUser.value?.name?.trim() || props.partnerName,
  avatar: partnerUser.value?.avatar_url,
  color: partnerUserAccentColor.value
}))
const people = computed(() => [
  { role: 'mine', label: ownIdentity.value.name, point: myPosition.value },
  { role: 'partner', label: partnerIdentity.value.name, point: theirPosition.value }
])
function mapPin(position: DuoPosition | null, identity: Omit<DuoMapPin, 'latitude' | 'longitude'>): DuoMapPin | null {
  return position && { latitude: position.latitude, longitude: position.longitude, ...identity }
}

const ownMarker = computed(() => mapPin(myPosition.value, ownIdentity.value))
const partnerMarker = computed(() => mapPin(theirPosition.value, partnerIdentity.value))

async function navigateToPartner() {
  const destination = partnerMarker.value
  if (!destination) return
  const { latitude, longitude, name } = destination
  routeError.value = ''
  try {
    if (native && platform === 'ios') {
      await appleMaps.navigate({ latitude, longitude, name })
    } else if (native && platform === 'android') {
      await nativeLocation.navigate({ latitude, longitude })
    } else {
      const url = new URL('https://www.google.com/maps/dir/')
      url.searchParams.set('api', '1')
      url.searchParams.set('destination', `${latitude},${longitude}`)
      window.open(url.toString(), '_blank', 'noopener,noreferrer')
    }
  } catch {
    routeError.value = 'Nie udało się otworzyć aplikacji z mapami.'
  }
}

async function openSystemLocationSettings() {
  settingsError.value = ''
  try {
    await openLocationSettings()
  } catch {
    settingsError.value = 'Nie udało się otworzyć ustawień aplikacji.'
  }
}

async function stop() {
  stopping.value = true
  try {
    await stopSharing()
  } catch {
    // The composable provides the retry message.
  } finally {
    stopping.value = false
  }
}
</script>

<template>
  <div class="location-card">
    <button type="button" class="location-card-trigger" @click="isOpen = true">
      <span class="location-glyph"><ion-icon :icon="ioniconsLocationOutline" aria-hidden="true" /></span>
      <span class="location-card-copy">
        <strong>Lokalizacja</strong>
        <span v-if="theirPosition">{{ address(theirPosition).join(', ') || 'Adres niedostępny' }}</span>
        <span v-else>Brak udostępnionej pozycji</span>
        <small v-if="theirPosition">{{ age(theirPosition) }}</small>
      </span>
      <span v-if="distanceLabel" class="location-distance">{{ distanceLabel }}</span>
      <ion-icon class="location-chevron" :icon="ioniconsChevronForwardOutline" aria-hidden="true" />
    </button>
    <DuoLocationMap v-if="theirPosition" :mine="null" :partner="partnerMarker" preview @open="isOpen = true" />
  </div>

  <ion-modal :is-open="isOpen" mode="ios" class="location-map-modal"
    :class="{ 'location-map-modal--ios': native && platform === 'ios', 'location-map-modal--android': native && platform === 'android' }"
    :aria-labelledby="titleId" :can-dismiss="smoothAndroidMap ? canDismissMap : true"
    :leave-animation="smoothAndroidMap ? leaveMapAnimation : undefined" data-no-swipe
    @didPresent="showMap" @willDismiss="beginMapDismiss" @didDismiss="finishMapDismiss">
    <div class="location-map-screen" :class="{ 'is-covering': coveringMap }">
      <DuoLocationMap v-if="mapReady" class="location-map-full" :mine="ownMarker" :partner="partnerMarker"
        :details-top="detailsTop" :controls="mapControls" :interactive="!closing" />
      <header ref="mapControls" class="location-header">
        <h2 :id="titleId">Lokalizacja</h2>
        <button type="button" class="location-close" aria-label="Zamknij mapę" @click="closeMap">
          <ion-icon :icon="ioniconsCloseOutline" aria-hidden="true" />
        </button>
      </header>
      <section v-if="mapReady" ref="sheet" class="location-sheet" :class="{ collapsed: !expanded, dragging: dragOffset !== undefined }"
        :style="dragOffset === undefined ? undefined : { transform: 'translateY(' + dragOffset + 'px)' }"
        :aria-labelledby="detailsTitleId" @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="endDrag"
        @pointercancel="endDrag" @lostpointercapture.self="endDrag" @click.capture="guardClick">
        <button class="sheet-handle" type="button" :aria-expanded="expanded" :aria-labelledby="detailsTitleId" @click="toggleSheet" />
      <div class="location-details">
        <div class="location-details-heading">
          <div class="location-heading-title">
            <h3 :id="detailsTitleId">Wasze pozycje</h3>
            <span class="location-status-pill" :class="{ 'is-on': isLocationStatusOn }">{{ locationStatusLabel }}</span>
          </div>
          <button v-if="partnerMarker" type="button" class="location-route" @click="navigateToPartner">
            <ion-icon :icon="ioniconsNavigateOutline" aria-hidden="true" />
            Nawiguj
          </button>
        </div>
        <p v-if="routeError" class="location-error" role="status">{{ routeError }}</p>
        <div v-if="distanceLabel" class="location-summary">
          <span>Odległość w linii prostej</span><strong>{{ distanceLabel }}</strong>
        </div>
        <div v-for="person in people" :key="person.role" class="location-person">
          <span class="location-dot" aria-hidden="true" />
          <div>
            <strong>{{ person.label }}</strong>
            <p>{{ person.point ? address(person.point).join(', ') || 'Adres niedostępny' : 'Brak aktualnej pozycji' }}</p>
            <small v-if="person.point">{{ age(person.point) }} · Dokładność ok. {{ Math.ceil(person.point.accuracy) }} m</small>
          </div>
        </div>
        <div class="location-permission" :class="{ 'is-warn': isLocationAttentionNeeded }">
          <span class="location-permission-icon">
            <ion-icon :icon="isLocationAttentionNeeded ? ioniconsAlertCircleOutline : ioniconsCheckmarkCircleOutline" aria-hidden="true" />
          </span>
          <div class="location-permission-copy">
            <strong>{{ locationModeInfo.title }}</strong>
            <p>{{ locationModeInfo.sub }}</p>
          </div>
        </div>
        <p v-if="sharingError" class="location-error" role="status">{{ sharingError }}</p>
        <p v-if="settingsError" class="location-error" role="status">{{ settingsError }}</p>
        <button v-if="sharing || ownShared || sharingError.startsWith('Telefon przestał')" type="button" class="dn-button-primary location-action"
          :disabled="stopping || updatingSharing" @click="stop">
          {{ stopping ? 'Zatrzymuję…' : (sharing || ownShared) ? 'Zatrzymaj udostępnianie' : 'Usuń ostatni odczyt' }}
        </button>
        <button v-else type="button" class="dn-button-primary location-action" :disabled="updatingSharing" @click="startSharing">
          {{ updatingSharing ? 'Włączam…' : 'Udostępnij moją pozycję' }}
        </button>
        <button v-if="native" type="button" class="dn-button-secondary location-action" @click="openSystemLocationSettings">
          <ion-icon :icon="ioniconsSettingsOutline" aria-hidden="true" />
          {{ locationSettingsButtonLabel }}
        </button>
      </div>
      </section>
    </div>
  </ion-modal>
</template>

<style scoped>
.location-card { display: grid; gap: 12px; width: 100%; padding: 12px; border-radius: 20px; border: 1px solid var(--dn-line); background: white; }
.location-card-trigger { display: flex; align-items: center; gap: 12px; padding: 0; width: 100%; text-align: left; background: transparent; color: var(--dn-ink); }
.location-glyph { width: 44px; height: 44px; flex: 0 0 44px; border-radius: 14px; display: grid; place-items: center; background: var(--dn-cream); color: var(--dn-ink); font-size: 22px; }
.location-card-copy { display: grid; gap: 3px; min-width: 0; flex: 1; }
.location-card-copy > span, .location-details small, .location-note { font-size: .81rem; color: var(--dn-muted); line-height: 1.45; }
.location-card-copy > small { font-size: .72rem; color: var(--dn-muted); }
.location-distance { flex: none; padding: 6px 9px; border-radius: 999px; background: var(--dn-cream); font-size: .78rem; font-weight: 700; }
.location-chevron { flex: none; color: var(--dn-muted); }
.location-map-modal { --location-controls-safe-top: max(env(safe-area-inset-top), var(--ion-safe-area-top, 0px), var(--location-native-top, 0px)); --width: 100%; --height: 100%; --max-width: none; --max-height: none; --border-radius: 0; --background: var(--dn-cream); --box-shadow: none; }
.location-map-modal--ios { --location-native-top: 54px; }
.location-map-modal--android { --location-native-top: 26px; --backdrop-opacity: 0; }
.location-map-screen { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--dn-cream); }
.location-map-screen::after { content: ''; position: absolute; inset: 0; z-index: 700; background: var(--dn-bg); opacity: 0; pointer-events: none; transition: opacity 300ms ease-in-out; }
.location-map-screen.is-covering::after { opacity: 1; pointer-events: auto; }
.location-map-full { position: absolute; inset: 0; height: 100%; }
.location-header { position: absolute; top: calc(var(--location-controls-safe-top) + 10px); left: 14px; z-index: 600; display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 13px; background: white; border-radius: 24px; }
.location-header h2 { font: 600 20px/1.1 var(--dn-serif); margin: 0; }
.location-close { display: grid; place-items: center; width: 40px; height: 40px; font-size: 22px; border-radius: 50%; background: var(--dn-soft); }
.location-sheet { position: absolute; bottom: 0; inset-inline: 0; margin-inline: auto; width: min(600px, 100%); z-index: 610; border-radius: 25px 25px 0 0; background: white; padding-bottom: env(safe-area-inset-bottom, 0px); touch-action: none; user-select: none; overflow: clip; box-shadow: 0 -2px 12px #0002; transform: translateY(0); transition: transform 220ms ease-out; }
.location-sheet.collapsed { transform: translateY(max(0px, calc(100% - 72px - env(safe-area-inset-bottom, 0px)))); }
.location-sheet.dragging { transition: none; }
.sheet-handle { display: block; width: 100%; height: 24px; border: 0; background: linear-gradient(#d4d6db, #d4d6db) center / 36px 4px no-repeat; }
.location-details { display: grid; gap: 12px; padding: 0 18px 20px; }
.location-details-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; }
.location-heading-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.location-status-pill { padding: 4px 9px; border-radius: 999px; background: var(--dn-soft); color: var(--dn-muted); font-size: .74rem; font-weight: 600; white-space: nowrap; }
.location-status-pill.is-on { background: var(--dn-cream); color: var(--dn-cream-ink); }
.location-details h3 { font: 600 23px/1.1 var(--dn-serif); margin: 0; }
.location-route { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 13px; border-radius: 999px; background: var(--dn-cream); color: var(--dn-ink); font-size: .82rem; font-weight: 700; }
.location-route ion-icon { font-size: 16px; }
.location-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--dn-cream); border-radius: 16px; padding: 12px 14px; font-size: .84rem; }
.location-summary strong { font: 600 23px/1.2 var(--dn-serif); white-space: nowrap; }
.location-person { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid var(--dn-line); padding: 4px 2px 12px; }
.location-person p { margin: 4px 0; font-size: .88rem; }
.location-dot { width: 10px; height: 10px; border-radius: 50%; background: #51432c; flex: none; }
.location-person + .location-person .location-dot { background: #23272e; }
.location-permission { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: 16px; background: var(--dn-soft); }
.location-permission.is-warn { background: var(--dn-cream); }
.location-permission-icon { width: 34px; height: 34px; flex: 0 0 34px; border-radius: 10px; background: #ffffff; color: var(--dn-ink); display: grid; place-items: center; font-size: 17px; }
.location-permission-copy { min-width: 0; display: grid; gap: 2px; }
.location-permission-copy strong { font-size: .84rem; font-weight: 600; color: var(--dn-ink); line-height: 1.3; }
.location-permission-copy p { margin: 0; font-size: .78rem; line-height: 1.42; color: var(--dn-muted); }
.location-permission.is-warn .location-permission-copy p { color: var(--dn-cream-ink); }
.location-action { width: 100%; }
.location-error { color: var(--dn-danger); font-size: .83rem; margin: 0; }
.location-note { margin: 0; }
</style>
