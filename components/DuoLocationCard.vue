<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { useDuoLocation, type DuoPosition } from '~/composables/useDuoLocation'

const props = defineProps<{ partnerName: string }>()
const { ownShared, myPosition, theirPosition, distance, sharing, sharingError, updatingSharing, clock, locate, startSharing, stopSharing } = useDuoLocation()
const isOpen = ref(false)
const mapReady = ref(false)
const titleId = useId()
const locating = ref(false)
const stopping = ref(false)
const problem = ref('')
const native = Capacitor.isNativePlatform()
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

const people = computed(() => [
  { label: 'Twoja pozycja', point: myPosition.value },
  { label: props.partnerName, point: theirPosition.value }
])

async function locateMe() {
  locating.value = true
  problem.value = ''
  try {
    await locate()
  } catch (error) {
    problem.value = error instanceof Error ? error.message : 'Nie udało się ustalić pozycji.'
  } finally {
    locating.value = false
  }
}

async function stop() {
  stopping.value = true
  problem.value = ''
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
  <button type="button" class="location-card" @click="isOpen = true">
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

  <ion-modal :is-open="isOpen" :breakpoints="[0, 1]" :initial-breakpoint="1" :handle="true"
    class="dn-form-sheet-modal" :aria-labelledby="titleId" data-no-swipe @didPresent="mapReady = true" @didDismiss="mapReady = false; isOpen = false">
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div class="location-header">
          <h2 :id="titleId">Lokalizacja</h2>
          <button type="button" class="location-close" aria-label="Zamknij mapę" @click="isOpen = false">
            <ion-icon :icon="ioniconsCloseOutline" aria-hidden="true" />
          </button>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <DuoLocationMap v-if="mapReady && (myPosition || theirPosition)" :mine="myPosition" :partner="theirPosition" />
      <div v-else class="location-empty">
        <span class="location-glyph"><ion-icon :icon="ioniconsMapOutline" aria-hidden="true" /></span>
        <p>Pozycje pojawią się tutaj, gdy telefon je ustali.</p>
      </div>
      <div class="location-details">
        <div v-if="distanceLabel" class="location-summary">
          <span>Odległość w linii prostej</span><strong>{{ distanceLabel }}</strong>
        </div>
        <div v-for="person in people" :key="person.label" class="location-person">
          <span class="location-dot" aria-hidden="true" />
          <div>
            <strong>{{ person.label }}</strong>
            <p>{{ person.point ? address(person.point).join(', ') || 'Adres niedostępny' : 'Brak aktualnej pozycji' }}</p>
            <small v-if="person.point">{{ age(person.point) }} · Dokładność ok. {{ Math.ceil(person.point.accuracy) }} m</small>
          </div>
        </div>
        <p v-if="problem || sharingError" class="location-error" role="status">{{ problem || sharingError }}</p>
        <button type="button" class="dn-button-secondary location-action" :disabled="locating" @click="locateMe">
          {{ locating ? 'Ustalam pozycję…' : 'Pokaż moją pozycję' }}
        </button>
        <button v-if="sharing || ownShared || sharingError.startsWith('Telefon przestał')" type="button" class="dn-button-primary location-action"
          :disabled="stopping || updatingSharing" @click="stop">
          {{ stopping ? 'Zatrzymuję…' : (sharing || ownShared) ? 'Zatrzymaj udostępnianie' : 'Usuń ostatni odczyt' }}
        </button>
        <button v-else type="button" class="dn-button-primary location-action" :disabled="updatingSharing" @click="problem = ''; startSharing()">
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
.location-card { width: 100%; text-align: left; display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 20px; border: 1px solid var(--dn-line); background: white; color: var(--dn-ink); }
.location-glyph { width: 44px; height: 44px; flex: 0 0 44px; border-radius: 14px; display: grid; place-items: center; background: var(--dn-cream); color: var(--dn-ink); font-size: 22px; }
.location-card-copy { display: grid; gap: 3px; min-width: 0; flex: 1; }
.location-card-copy > span, .location-details small, .location-note { font-size: .81rem; color: var(--dn-muted); line-height: 1.45; }
.location-card-copy > small { font-size: .72rem; color: var(--dn-muted); }
.location-distance { flex: none; padding: 6px 9px; border-radius: 999px; background: var(--dn-cream); font-size: .78rem; font-weight: 700; }
.location-chevron { flex: none; color: var(--dn-muted); }
.location-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 20px 10px; }
.location-header h2 { font: 600 28px/1.1 var(--dn-serif); margin: 0; }
.location-close { display: grid; place-items: center; width: 44px; height: 44px; font-size: 25px; border-radius: 50%; background: var(--dn-soft); }
.location-empty { min-height: 195px; padding: 24px; display: grid; justify-items: center; align-content: center; background: var(--dn-soft); text-align: center; font-size: .9rem; color: var(--dn-muted); }
.location-details { display: grid; gap: 12px; max-width: 600px; margin-inline: auto; padding: 18px 20px max(24px, env(safe-area-inset-bottom)); }
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
