<script setup lang="ts">
import { Capacitor, registerPlugin } from '@capacitor/core'
import { useDuoLocation, type DuoPosition } from '~/composables/useDuoLocation'
import type { DuoMapPin } from '~/utils/duoMapPin'

const { currentUser, partnerUser, currentUserAccentColor, partnerUserAccentColor } = useDuoState()
const props = defineProps<{ partnerName: string }>()
const { ownShared, myPosition, theirPosition, distance, sharing, sharingError, updatingSharing, clock, startSharing, stopSharing } = useDuoLocation()
const isOpen = ref(false)
const closing = ref(false)
const mapReady = ref(false)
const detailsOpen = ref(false)
const detailsTop = ref<number>()
const mapControls = ref<HTMLElement>()
let trackFrame = 0
const titleId = useId()
const detailsId = useId()
const detailsTitleId = useId()
const detailBreakpoints = [0.22, 0.46, 1]

function trackDetails() {
  cancelAnimationFrame(trackFrame)
  const sheet = document.getElementById(detailsId)
  const content = sheet?.shadowRoot?.querySelector<HTMLElement>('[part="content"]')
  if (!content || !mapReady.value) return
  const deadline = performance.now() + 520
  const measure = () => {
    detailsTop.value = Math.round(content.getBoundingClientRect().top)
    if (mapReady.value && performance.now() < deadline) trackFrame = requestAnimationFrame(measure)
  }
  measure()
}

function watchDetails() {
  document.getElementById(detailsId)?.addEventListener('ionBreakpointDidChange', trackDetails)
  trackDetails()
}

function unwatchDetails() {
  document.getElementById(detailsId)?.removeEventListener('ionBreakpointDidChange', trackDetails)
  cancelAnimationFrame(trackFrame)
}

function showDetails() {
  routeError.value = ''
  detailsOpen.value = true
  detailsTop.value = Math.round(window.innerHeight - Math.min(560, window.innerHeight * 0.74) * detailBreakpoints[1]!)
}

function showMap() {
  mapReady.value = true
  showDetails()
}

function closeMap() {
  if (closing.value) return
  beginMapDismiss()
  isOpen.value = false
}

function beginMapDismiss() {
  closing.value = true
  detailsOpen.value = false
}

function finishMapDismiss() {
  mapReady.value = false
  isOpen.value = false
  closing.value = false
  closeDetails()
}

function closeDetails() {
  detailsOpen.value = false
  if (!closing.value) detailsTop.value = undefined
  unwatchDetails()
}

onMounted(() => window.addEventListener('resize', trackDetails))
onBeforeUnmount(() => {
  unwatchDetails()
  window.removeEventListener('resize', trackDetails)
})
const stopping = ref(false)
const native = Capacitor.isNativePlatform()
const platform = Capacitor.getPlatform()
const routeError = ref('')
const appleMaps = registerPlugin<{
  navigate(destination: { latitude: number; longitude: number; name: string }): Promise<void>
}>('DuoAppleMaps')
const androidLocation = registerPlugin<{
  navigate(destination: { latitude: number; longitude: number }): Promise<void>
}>('DuoLocation')

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
      await androidLocation.navigate({ latitude, longitude })
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
    :aria-labelledby="titleId" data-no-swipe
    @didPresent="showMap" @willDismiss="beginMapDismiss" @didDismiss="finishMapDismiss">
    <div class="location-map-screen">
      <DuoLocationMap v-if="mapReady" class="location-map-full" :mine="ownMarker" :partner="partnerMarker"
        :details-top="detailsTop" :controls="mapControls" />
      <header ref="mapControls" class="location-header">
        <h2 :id="titleId">Lokalizacja</h2>
        <button v-if="mapReady && !detailsOpen && !closing" type="button" class="location-close" aria-label="Pokaż szczegóły" @click="showDetails">
          <ion-icon :icon="ioniconsListOutline" aria-hidden="true" />
        </button>
        <button type="button" class="location-close" aria-label="Zamknij mapę" @click="closeMap">
          <ion-icon :icon="ioniconsCloseOutline" aria-hidden="true" />
        </button>
      </header>
    </div>
  </ion-modal>

  <ion-modal :id="detailsId" :is-open="detailsOpen" mode="ios" class="location-details-modal"
    :aria-labelledby="detailsTitleId" :breakpoints="detailBreakpoints" :initial-breakpoint="0.46"
    :backdrop-breakpoint="1" :backdrop-dismiss="false" :focus-trap="false" :expand-to-scroll="false"
    :handle="true" handle-behavior="cycle" data-no-swipe
    @willPresent="watchDetails" @didPresent="trackDetails" @ionDragMove="trackDetails"
    @ionDragEnd="trackDetails"
    @willDismiss="trackDetails" @didDismiss="closeDetails">
    <ion-content :scroll-y="false" :force-overscroll="false">
      <div class="location-details">
        <div class="location-details-heading">
          <h3 :id="detailsTitleId">Wasze pozycje</h3>
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
        <p v-if="sharingError" class="location-error" role="status">{{ sharingError }}</p>
        <button v-if="sharing || ownShared || sharingError.startsWith('Telefon przestał')" type="button" class="dn-button-primary location-action"
          :disabled="stopping || updatingSharing" @click="stop">
          {{ stopping ? 'Zatrzymuję…' : (sharing || ownShared) ? 'Zatrzymaj udostępnianie' : 'Usuń ostatni odczyt' }}
        </button>
        <button v-else type="button" class="dn-button-primary location-action" :disabled="updatingSharing" @click="startSharing">
          {{ updatingSharing ? 'Włączam…' : 'Udostępnij moją pozycję' }}
        </button>
        <p class="location-note">
          {{ native
            ? 'Po włączeniu udostępniania druga osoba z pary widzi Twoją pozycję również wtedy, gdy aplikacja działa w tle.'
            : 'W przeglądarce udostępnianie działa podczas korzystania z aplikacji.' }}
        </p>
      </div>
    </ion-content>
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
.location-map-modal--android { --location-native-top: 26px; }
.location-map-screen { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--dn-cream); }
.location-map-full { position: absolute; inset: 0; height: 100%; }
.location-header { position: absolute; top: calc(var(--location-controls-safe-top) + 10px); left: 14px; z-index: 600; display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 13px; background: white; border-radius: 24px; }
.location-header h2 { font: 600 20px/1.1 var(--dn-serif); margin: 0; }
.location-close { display: grid; place-items: center; width: 40px; height: 40px; font-size: 22px; border-radius: 50%; background: var(--dn-soft); }
.location-details-modal { --height: min(560px, 74dvh); --width: min(600px, 100%); --border-radius: 25px 25px 0 0; --background: white; --backdrop-opacity: 0; }
.location-details-modal::part(handle) { width: 54px; height: 24px; margin-top: 0; background: linear-gradient(#d4d6db, #d4d6db) center / 36px 4px no-repeat; }
.location-details-modal ion-content { --background: white; }
.location-details { display: grid; gap: 12px; padding: 27px 18px max(24px, env(safe-area-inset-bottom)); }
.location-details-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; }
.location-details h3 { font: 600 23px/1.1 var(--dn-serif); margin: 0; }
.location-route { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 13px; border-radius: 999px; background: var(--dn-cream); color: var(--dn-ink); font-size: .82rem; font-weight: 700; }
.location-route ion-icon { font-size: 16px; }
.location-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--dn-cream); border-radius: 16px; padding: 12px 14px; font-size: .84rem; }
.location-summary strong { font: 600 23px/1.2 var(--dn-serif); white-space: nowrap; }
.location-person { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid var(--dn-line); padding: 4px 2px 12px; }
.location-person p { margin: 4px 0; font-size: .88rem; }
.location-dot { width: 10px; height: 10px; border-radius: 50%; background: #51432c; flex: none; }
.location-person + .location-person .location-dot { background: #23272e; }
.location-action { width: 100%; }
.location-error { color: var(--dn-danger); font-size: .83rem; margin: 0; }
.location-note { margin: 0; }
</style>
