<template>
  <ion-modal
    :is-open="isOpen"
    @didDismiss="handleClose"
    class="dn-calendar-sync-modal"
    :expand-to-scroll="false"
    :breakpoints="[0, 0.92, 1]"
    :initial-breakpoint="0.92"
    :handle="true"
  >
    <ion-header class="modal-custom-header ion-no-border">
      <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
      <div class="sync-modal-header">
        <div class="sync-title-box">
          <div class="sync-title-icon-badge">
            <ion-icon :icon="ioniconsSyncOutline" />
          </div>
          <div>
            <h3 class="sync-modal-title">Synchronizacja Terminarza</h3>
            <p class="sync-modal-subtitle">Połącz wspólne plany z kalendarzem w telefonie</p>
          </div>
        </div>
        <button type="button" class="sync-modal-close-btn" @click="handleClose" aria-label="Zamknij">
          <ion-icon :icon="ioniconsCloseOutline" />
        </button>
      </div>

      <!-- TABS BAR: Subskrypcja na zywo | Eksport | Import -->
      <div class="sync-tabs-row" data-no-swipe>
        <button
          type="button"
          class="sync-tab-btn"
          :class="{ active: activeTab === 'subscription' }"
          @click="activeTab = 'subscription'"
        >
          <ion-icon :icon="ioniconsRadioOutline" />
          <span>Subskrypcja na żywo</span>
        </button>
        <button
          type="button"
          class="sync-tab-btn"
          :class="{ active: activeTab === 'export' }"
          @click="activeTab = 'export'"
        >
          <ion-icon :icon="ioniconsDownloadOutline" />
          <span>Eksport (.ics)</span>
        </button>
        <button
          type="button"
          class="sync-tab-btn"
          :class="{ active: activeTab === 'import' }"
          @click="activeTab = 'import'"
        >
          <ion-icon :icon="ioniconsCloudUploadOutline" />
          <span>Importuj plik</span>
        </button>
      </div>
    </ion-header>

    <ion-content class="sync-modal-content">
      <!-- ============================================== -->
      <!-- TAB 1: SUBSKRYPCJA NA ZYWO                     -->
      <!-- ============================================== -->
      <div v-if="activeTab === 'subscription'" class="sync-tab-pane">
        <div class="sync-intro-card">
          <div class="intro-badge">
            <ion-icon :icon="ioniconsSparklesOutline" />
            <span>ZALECANE ROZWIĄZANIE</span>
          </div>
          <h4>Automatyczna synchronizacja</h4>
          <p>
            Zmiany i usunięcia wykonane w DuoNest pojawią się po odświeżeniu subskrypcji przez Twój kalendarz.
            Synchronizacja działa w jedną stronę; edycje w Google, Apple lub Outlooku nie zmieniają planów w DuoNest.
          </p>
        </div>

        <div v-if="isLoadingFeed && !feedToken" class="sync-intro-card" aria-live="polite">
          <p>Sprawdzam subskrypcję…</p>
        </div>
        <div v-else-if="!feedToken" class="sync-intro-card">
          <p v-if="feedError">{{ feedError }}</p>
          <button type="button" class="dn-button-primary" :disabled="!partnershipId" @click="changeSubscription('create')">
            Utwórz prywatny link
          </button>
        </div>
        <template v-else>
        <!-- POPULAR CALENDARS ONE-CLICK CONNECT -->
        <div class="sync-section-title">POŁĄCZ Z APLIKACJĄ KALENDARZA</div>
        <div class="quick-providers-grid">
          <!-- 1. APPLE CALENDAR (iOS / Mac) -->
          <a
            :href="webcalFeedUrl"
            class="provider-card apple-card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="provider-icon-box apple-icon">
              <ion-icon :icon="ioniconsLogoApple" />
            </div>
            <div class="provider-info">
              <span class="provider-name">Kalendarz Apple</span>
              <span class="provider-sub">iPhone, iPad, Mac (iCal)</span>
            </div>
            <div class="provider-action-pill">
              <span>Subskrybuj</span>
              <ion-icon :icon="ioniconsOpenOutline" />
            </div>
          </a>

          <!-- 2. GOOGLE CALENDAR -->
          <a
            :href="googleCalendarSubscribeUrl"
            class="provider-card google-card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="provider-icon-box google-icon">
              <ion-icon :icon="ioniconsLogoGoogle" />
            </div>
            <div class="provider-info">
              <span class="provider-name">Google Calendar</span>
              <span class="provider-sub">Android, Gmail, Przeglądarka</span>
            </div>
            <div class="provider-action-pill">
              <span>Dodaj feed</span>
              <ion-icon :icon="ioniconsOpenOutline" />
            </div>
          </a>

          <!-- 3. OUTLOOK -->
          <a
            :href="outlookCalendarSubscribeUrl"
            class="provider-card outlook-card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="provider-icon-box outlook-icon">
              <ion-icon :icon="ioniconsLogoWindows" />
            </div>
            <div class="provider-info">
              <span class="provider-name">Microsoft Outlook</span>
              <span class="provider-sub">Windows, Office 365, Web</span>
            </div>
            <div class="provider-action-pill">
              <span>Subskrybuj</span>
              <ion-icon :icon="ioniconsOpenOutline" />
            </div>
          </a>
        </div>

        <!-- WEBCAL URL COPY BOX -->
        <div class="sync-section-title">UNIWERSALNY LINK SUBSKRYPCJI (WEBCAL / ICAL)</div>
        <div class="feed-copy-box">
          <p class="feed-copy-help">
            Możesz też wkleić poniższy adres bezpośrednio do dowolnej aplikacji kalendarza:
          </p>
          <div class="feed-input-group">
            <input
              type="text"
              readonly
              :value="webcalFeedUrl"
              class="feed-url-input"
              @click="copyFeedUrl"
            />
            <button
              type="button"
              class="feed-copy-btn"
              :class="{ copied: isCopied }"
              @click="copyFeedUrl"
            >
              <ion-icon :icon="isCopied ? ioniconsCheckmarkOutline : ioniconsCopyOutline" />
              <span>{{ isCopied ? 'Skopiowano' : 'Kopiuj' }}</span>
            </button>
          </div>
        </div>

        <div class="feed-copy-box">
          <p class="feed-copy-help">Każdy, kto ma ten link, może czytać terminarz. Zmień link, aby unieważnić poprzedni.</p>
          <div class="feed-input-group">
            <button type="button" class="dn-button-secondary" :disabled="isLoadingFeed" @click="changeSubscription('rotate')">Zmień link</button>
            <button type="button" class="dn-button-secondary" :disabled="isLoadingFeed" @click="changeSubscription('revoke')">Wyłącz subskrypcję</button>
          </div>
          <p v-if="feedError" class="feed-copy-help" role="alert">{{ feedError }}</p>
        </div>
        <!-- INSTRUCTIONS ACCORDION -->
        <div class="sync-instructions-card">
          <div class="instruction-header" @click="showInstructions = !showInstructions">
            <div class="instruction-title-row">
              <ion-icon :icon="ioniconsInformationCircleOutline" />
              <span>Instrukcja krok po kroku</span>
            </div>
            <ion-icon :icon="showInstructions ? ioniconsChevronUpOutline : ioniconsChevronDownOutline" />
          </div>

          <div v-if="showInstructions" class="instruction-steps-list">
            <div class="step-item">
              <span class="step-num">1</span>
              <div>
                <strong>iPhone / iPad:</strong> Stuknij powyższy przycisk „Kalendarz Apple”. System wyświetli okno dialogowe z pytaniem o subskrypcję kalendarza Wspólny Terminarz DuoNest. Zatwierdź stukając „Subskrybuj”.
              </div>
            </div>
            <div class="step-item">
              <span class="step-num">2</span>
              <div>
                <strong>Google Calendar:</strong> Stuknij „Dodaj feed” lub otwórz Google Calendar na komputerze, po lewej kliknij plus obok „Inne kalendarze”, wybierz „Z adresu URL” i wklej skopiowany link.
              </div>
            </div>
            <div class="step-item">
              <span class="step-num">3</span>
              <div>
                <strong>Outlook:</strong> W Outlooku wybierz Kalendarz -> „Dodaj kalendarz” -> „Z Internetu” i wklej powyższy adres.
              </div>
            </div>
          </div>
        </div>
        </template>
      </div>

      <!-- ============================================== -->
      <!-- TAB 2: EKSPORT PLIKU .ICS                      -->
      <!-- ============================================== -->
      <div v-else-if="activeTab === 'export'" class="sync-tab-pane">
        <div class="sync-intro-card export-intro">
          <div class="intro-badge">
            <ion-icon :icon="ioniconsCalendarOutline" />
            <span>JEDNORAZOWY ZAPIS</span>
          </div>
          <h4>Pobierz plik kalendarza (.ics)</h4>
          <p>
            Możesz pobrać migawkę wszystkich zaplanowanych wspólnych wydarzeń ({{ eventsList.length }} planów)
            w uniwersalnym formacie iCalendar i otworzyć ją w telefonie lub na komputerze.
          </p>

          <button
            type="button"
            class="export-download-btn"
            @click="handleExportAllEvents"
          >
            <ion-icon :icon="ioniconsDownloadOutline" />
            <span>Pobierz wszystkie plany (.ics)</span>
          </button>
        </div>

        <!-- LIST OF UPCOMING EVENTS WITH INDIVIDUAL ADD -->
        <div class="sync-section-title">POJEDYNCZE PLANY DO SZYBKIEGO DODANIA</div>
        <div v-if="upcomingEvents.length > 0" class="events-export-list">
          <div
            v-for="evt in upcomingEvents.slice(0, 8)"
            :key="evt.id"
            class="single-export-item"
          >
            <div class="single-item-left">
              <span class="single-event-title">{{ evt.title }}</span>
              <span class="single-event-date">{{ formatReadableDate(evt.start_time) }}</span>
            </div>
            <div class="single-item-actions">
              <a
                :href="getGoogleUrl(evt)"
                target="_blank"
                rel="noopener noreferrer"
                class="quick-action-pill google-pill"
                title="Dodaj do Kalendarza Google"
              >
                <ion-icon :icon="ioniconsLogoGoogle" />
                <span>Google</span>
              </a>
              <button
                type="button"
                class="quick-action-pill ics-pill"
                @click="handleDownloadSingleEvent(evt)"
                title="Pobierz plik .ics dla tego planu"
              >
                <ion-icon :icon="ioniconsCalendarOutline" />
                <span>Apple / .ics</span>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-export-hint">
          Brak nadchodzących planów w terminarzu. Dodaj nowe plany, aby je wyeksportować!
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TAB 3: IMPORT Z PLIKU .ICS                     -->
      <!-- ============================================== -->
      <div v-else class="sync-tab-pane">
        <div class="sync-intro-card import-intro">
          <div class="intro-badge">
            <ion-icon :icon="ioniconsCloudUploadOutline" />
            <span>IMPORT DO DUONEST</span>
          </div>
          <h4>Przenieś plany ze swojego kalendarza</h4>
          <p>
            Masz plany zapisane w Google Calendar, Kalendarzu Apple lub Outlooku?
            Wyeksportuj plik .ics i wgraj go tutaj, aby automatycznie dodać wydarzenia do Waszego Wspólnego Terminarza.
          </p>
        </div>

        <!-- FILE DROP ZONE -->
        <div
          class="file-drop-zone"
          :class="{ 'is-dragging': isDraggingFile, 'has-file': !!uploadedFileName }"
          @dragover.prevent="isDraggingFile = true"
          @dragleave.prevent="isDraggingFile = false"
          @drop.prevent="handleFileDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".ics,text/calendar"
            class="hidden-file-input"
            @change="handleFileSelect"
          />
          <div class="drop-zone-icon">
            <ion-icon :icon="uploadedFileName ? ioniconsCheckmarkCircleOutline : ioniconsCloudUploadOutline" />
          </div>
          <div class="drop-zone-texts">
            <span class="drop-zone-title">
              {{ uploadedFileName || 'Wybierz lub przeciągnij plik .ics' }}
            </span>
            <span class="drop-zone-sub">
              {{ uploadedFileName ? `${parsedEvents.length} znalezionych wydarzeń` : 'Format iCalendar z Kalendarza Google, Apple lub Outlook' }}
            </span>
          </div>
        </div>

        <!-- PARSED EVENTS PREVIEW -->
        <div v-if="parsedEvents.length > 0" class="parsed-preview-box">
          <div class="parsed-header-row">
            <span class="parsed-heading">ZNALEZIONE WYDARZENIA ({{ parsedEvents.length }})</span>
            <button type="button" class="clear-file-btn" @click="clearParsedEvents">
              Wyczyść
            </button>
          </div>

          <div class="parsed-items-list">
            <div
              v-for="(pEvt, idx) in parsedEvents"
              :key="idx"
              class="parsed-event-card"
            >
              <div class="parsed-card-header">
                <span class="parsed-cat-pill">{{ getCategoryLabelPl(pEvt.category) }}</span>
                <span class="parsed-date-text">{{ formatReadableDate(pEvt.startTime) }}</span>
              </div>
              <h5 class="parsed-title">{{ pEvt.title }}</h5>
              <p class="parsed-loc" v-if="pEvt.location">
                <ion-icon :icon="ioniconsLocationOutline" />
                <span>{{ pEvt.location }}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            class="import-submit-btn"
            :disabled="isImporting"
            @click="handleImportParsedEvents"
          >
            <ion-icon :icon="ioniconsCheckmarkOutline" />
            <span>{{ isImporting ? 'Importowanie...' : `Zaimportuj ${parsedEvents.length} planów do Terminarza` }}</span>
          </button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'
import { useDuoState, type EventItem } from '~/composables/useDuoState'
import {
  generateIcsCalendar,
  generateSingleEventIcs,
  downloadIcsFile,
  generateGoogleCalendarUrl,
  generateGoogleCalendarSubscribeUrl,
  generateOutlookCalendarSubscribeUrl,
  getCalendarFeedUrls,
  parseIcsContent,
  getCategoryLabelPl,
  type ParsedIcsEvent
} from '~/utils/calendarSync'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const {
  partnership,
  authUser,
  eventsList,
  addEvent,
  triggerToast
} = useDuoState()

const activeTab = ref<'subscription' | 'export' | 'import'>('subscription')
const showInstructions = ref(false)
const isCopied = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDraggingFile = ref(false)
const uploadedFileName = ref('')
const parsedEvents = ref<ParsedIcsEvent[]>([])
const isImporting = ref(false)

const partnershipId = computed(() => partnership.value?.id || null)
const feedToken = ref<string | null>(null)
const feedError = ref('')
const isLoadingFeed = ref(false)
let feedRequest = 0

const changeSubscription = async (action: 'status' | 'create' | 'rotate' | 'revoke') => {
  if (!props.isOpen || !partnershipId.value) return
  const request = ++feedRequest
  isLoadingFeed.value = true
  feedError.value = ''
  try {
    const { token } = await getFirebaseBridge().callApi<{ token: string | null }>('/api/calendar/subscription', { action })
    if (request === feedRequest) feedToken.value = token
  } catch {
    if (request === feedRequest) feedError.value = 'Nie udało się zapisać lub odczytać subskrypcji. Spróbuj ponownie.'
  } finally {
    if (request === feedRequest) isLoadingFeed.value = false
  }
}

watch([() => props.isOpen, partnershipId, () => authUser.value?.id], ([open]) => {
  feedRequest++
  feedToken.value = null
  feedError.value = ''
  isLoadingFeed.value = false
  isCopied.value = false
  if (open) void changeSubscription('status')
}, { immediate: true })

const feedUrls = computed(() => feedToken.value ? getCalendarFeedUrls(feedToken.value) : null)
const webcalFeedUrl = computed(() => feedUrls.value?.webcalUrl)
const googleCalendarSubscribeUrl = computed(() => feedUrls.value ? generateGoogleCalendarSubscribeUrl(feedUrls.value.webcalUrl) : undefined)
const outlookCalendarSubscribeUrl = computed(() => feedUrls.value ? generateOutlookCalendarSubscribeUrl(feedUrls.value.httpsUrl) : undefined)

const upcomingEvents = computed(() => {
  return eventsList.value.filter(e => !e.is_completed)
})

const handleClose = () => {
  emit('close')
}

const copyFeedUrl = async () => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && webcalFeedUrl.value) {
      await navigator.clipboard.writeText(webcalFeedUrl.value)
      isCopied.value = true
      triggerToast('Skopiowano link subskrypcji')
      setTimeout(() => {
        isCopied.value = false
      }, 2500)
    }
  } catch (_) {
    triggerToast('Zaznacz i skopiuj link ręcznie')
  }
}

const handleExportAllEvents = () => {
  try {
    const calendarName = partnership.value?.nest_name
      ? `DuoNest - ${partnership.value.nest_name}`
      : 'DuoNest - Wspólny Terminarz'
    const icsContent = generateIcsCalendar(eventsList.value, calendarName)
    downloadIcsFile('duonest-terminarz.ics', icsContent)
    triggerToast('Pobrano plik terminarza')
  } catch (err) {
    triggerToast('Błąd pobierania pliku')
  }
}

const handleDownloadSingleEvent = (event: EventItem) => {
  try {
    const icsContent = generateSingleEventIcs(event)
    const filename = `${event.title.replace(/[^a-zA-Z0-9żźćńółęąśŻŹĆŃÓŁĘĄŚ_-]/g, '_')}.ics`
    downloadIcsFile(filename, icsContent)
    triggerToast('Pobrano plan (.ics)')
  } catch (err) {
    triggerToast('Błąd pobierania planu')
  }
}

const getGoogleUrl = (event: EventItem) => {
  return generateGoogleCalendarUrl(event)
}

const formatReadableDate = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('pl-PL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (_) {
    return dateStr
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) processIcsFile(file)
}

const handleFileDrop = (event: DragEvent) => {
  isDraggingFile.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) processIcsFile(file)
}

const processIcsFile = async (file: File) => {
  uploadedFileName.value = file.name
  try {
    const text = await file.text()
    const parsed = parseIcsContent(text)
    if (parsed.length === 0) {
      triggerToast('Nie znaleziono wydarzeń w pliku')
    } else {
      parsedEvents.value = parsed
      triggerToast(`Znaleziono ${parsed.length} planów`)
    }
  } catch (err) {
    triggerToast('Błąd odczytu pliku .ics')
  }
}

const clearParsedEvents = () => {
  parsedEvents.value = []
  uploadedFileName.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const handleImportParsedEvents = async () => {
  if (parsedEvents.value.length === 0 || isImporting.value) return
  isImporting.value = true
  let count = 0
  try {
    for (const evt of parsedEvents.value) {
      const saved = await addEvent(
        evt.title,
        evt.category,
        evt.startTime,
        evt.description || '',
        evt.location || '',
        evt.endTime || '',
        false,
        'Import z kalendarza'
      )
      if (saved) count++
    }
    triggerToast(`Zaimportowano ${count} planów`)
    clearParsedEvents()
    emit('close')
  } catch (err) {
    triggerToast('Błąd podczas importu planów')
  } finally {
    isImporting.value = false
  }
}
</script>

<style scoped>
.dn-calendar-sync-modal {
  --background: #f8f9fb;
  --border-radius: 28px 28px 0 0;
}

.modal-custom-header {
  background: #ffffff;
  border-bottom: 1px solid #e5e6e8;
  padding-top: 6px;
  padding-bottom: 12px;
}

.sync-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 12px 16px;
}

.sync-title-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-title-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #1c1b19;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.sync-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1c1b19;
  letter-spacing: -0.3px;
}

.sync-modal-subtitle {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #737373;
  font-weight: 500;
}

.sync-modal-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--dn-soft);
  border: none;
  color: #545454;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.sync-modal-close-btn:hover {
  background: #e5e6e8;
  color: #1c1b19;
}

/* Tabs switcher */
.sync-tabs-row {
  display: flex;
  background: #f2f3f5;
  padding: 4px;
  border-radius: 12px;
  margin: 0 16px;
  gap: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.sync-tabs-row::-webkit-scrollbar {
  display: none;
}

.sync-tab-btn {
  flex: 1 1 0;
  min-width: max-content;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #737373;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.sync-tab-btn.active {
  background: #ffffff;
  color: #1c1b19;
  box-shadow: none;
}

.sync-modal-content {
  --background: #f8f9fb;
}

.sync-tab-pane {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 40px;
}

/* Intro cards */
.sync-intro-card {
  background: #ffffff;
  border: 1px solid var(--dn-line);
  border-radius: 18px;
  padding: 16px;
  box-shadow: none;
}

.intro-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: #7d7d7d;
  background: #edeef0;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
}

.sync-intro-card h4 {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
}

.sync-intro-card p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: #545454;
}

.sync-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #a2a2a2;
  letter-spacing: 0.6px;
  margin-top: 4px;
}

/* Quick Providers List */
.quick-providers-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #ffffff;
  border: 1px solid var(--dn-line);
  border-radius: 16px;
  padding: 12px 14px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  box-shadow: none;
}

.provider-card:active {
  transform: scale(0.98);
}

.provider-icon-box {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.apple-icon {
  background: #1c1b19;
  color: #ffffff;
}

.google-icon {
  background: #f3f4f6;
  color: #6d6d6d;
}

.outlook-icon {
  background: #f8f9fb;
  color: #7d7d7d;
}

.provider-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.provider-name {
  font-size: 14px;
  font-weight: 700;
  color: #1c1b19;
}

.provider-sub {
  font-size: 11.5px;
  color: #737373;
  margin-top: 2px;
}

.provider-action-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: #1c1b19;
  background: var(--dn-soft);
  padding: 6px 12px;
  border-radius: 999px;
  flex-shrink: 0;
}

/* Feed Copy Box */
.feed-copy-box {
  background: #ffffff;
  border: 1px solid var(--dn-line);
  border-radius: 16px;
  padding: 14px;
}

.feed-copy-help {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #737373;
  line-height: 1.4;
}

.feed-input-group {
  display: flex;
  gap: 8px;
}

.feed-url-input {
  flex: 1;
  min-width: 0;
  border: 1px solid #d4d4d4;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 12px;
  color: #404040;
  background: #f8f9fb;
  font-family: monospace;
}

.feed-copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  border: none;
  background: #1c1b19;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.feed-copy-btn.copied {
  background: #a3a3a3;
}

/* Instructions card */
.sync-instructions-card {
  background: #ffffff;
  border: 1px solid #e5e6e8;
  border-radius: 16px;
  overflow: hidden;
}

.instruction-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  background: #f8f9fb;
  user-select: none;
}

.instruction-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #404040;
}

.instruction-steps-list {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid #e5e6e8;
}

.step-item {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #545454;
  line-height: 1.45;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e5e6e8;
  color: #1c1b19;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Export tab */
.export-download-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  border: none;
  background: #1c1b19;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-download-btn:active {
  transform: scale(0.98);
}

.events-export-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.single-export-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid var(--dn-line);
  border-radius: 12px;
  padding: 10px 14px;
}

.single-item-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-right: 10px;
}

.single-event-title {
  font-size: 13px;
  font-weight: 700;
  color: #1c1b19;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.single-event-date {
  font-size: 11px;
  color: #737373;
  margin-top: 2px;
}

.single-item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.quick-action-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid #e5e6e8;
  background: #f8f9fb;
  color: #404040;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.quick-action-pill:active {
  transform: scale(0.96);
}

.google-pill {
  background: #f3f4f6;
  border-color: #d8d8d8;
  color: #5c5c5c;
}

.empty-export-hint {
  text-align: center;
  padding: 24px 16px;
  color: #a2a2a2;
  font-size: 13px;
  background: #ffffff;
  border: 1px dashed #d4d4d4;
  border-radius: 14px;
}

/* Import tab */
.file-drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 28px 16px;
  background: #ffffff;
  border: 2px dashed #d4d4d4;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-drop-zone.is-dragging {
  border-color: #7d7d7d;
  background: #f6f7f9;
}

.file-drop-zone.has-file {
  border-color: #a3a3a3;
  background: #f8f9fb;
}

.hidden-file-input {
  display: none;
}

.drop-zone-icon {
  font-size: 38px;
  color: #737373;
  margin-bottom: 8px;
}

.file-drop-zone.has-file .drop-zone-icon {
  color: #a3a3a3;
}

.drop-zone-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #1c1b19;
  display: block;
}

.drop-zone-sub {
  font-size: 11.5px;
  color: #737373;
  margin-top: 3px;
  display: block;
}

.parsed-preview-box {
  background: #ffffff;
  border: 1px solid var(--dn-line);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parsed-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.parsed-heading {
  font-size: 11px;
  font-weight: 700;
  color: #737373;
  letter-spacing: 0.5px;
}

.clear-file-btn {
  background: transparent;
  border: none;
  color: #d96856;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.parsed-items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.parsed-event-card {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 12px;
  padding: 10px 12px;
}

.parsed-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.parsed-cat-pill {
  font-size: 10px;
  font-weight: 700;
  color: #1c1b19;
  background: #e5e6e8;
  padding: 2px 6px;
  border-radius: 4px;
}

.parsed-date-text {
  font-size: 11px;
  color: #737373;
}

.parsed-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1c1b19;
}

.parsed-loc {
  margin: 4px 0 0 0;
  font-size: 11px;
  color: #737373;
  display: flex;
  align-items: center;
  gap: 4px;
}

.import-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: none;
  background: #1c1b19;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.import-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>