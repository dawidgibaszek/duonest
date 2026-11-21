<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dn-auth-content">
      <div class="dn-auth-page">

        <div class="dn-auth-body">
          <!-- HEADING -->
          <header class="dn-auth-heading">
            <h1 class="dn-auth-title">Połączcie się w parę</h1>
            <DuoAuthHero :tiles="heroTiles" bare />
            <p class="dn-auth-subtitle">Połączcie swoje konta, by wspólnie budować Wasze domowe gniazdko.</p>
          </header>

          <div v-if="!pairingProfileReady" class="dn-auth-status" role="status">
            <ion-spinner v-if="isSyncingProfile" name="crescent" aria-hidden="true" />
            <p>{{ isSyncingProfile ? 'Przygotowujemy Twój profil…' : 'Twój profil nie jest jeszcze gotowy.' }}</p>
            <button v-if="!isSyncingProfile" type="button" class="dn-auth-btn dn-auth-btn--outline" @click="preparePairingProfile">
              Spróbuj ponownie
            </button>
          </div>
          <template v-else>
          <!-- USER NAME -->
          <div class="name-field">
            <DuoAuthField
              v-model="myNameInput"
              label="Twoje imię w aplikacji"
              placeholder="np. Jan"
              autocomplete="given-name"
              maxlength="40"
              :clearable="false"
              @keyup.enter="saveMyName"
            >
              <template #trailing>
                <button type="button" class="dn-auth-inline-btn" @click="saveMyName" :disabled="isSavingName || !myNameInput.trim()">
                  Zapisz
                </button>
              </template>
            </DuoAuthField>
          </div>

          <!-- SEGMENT SWITCHER: MÓJ KOD / DOŁĄCZ -->
          <div class="dn-auth-segment" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="activeMode === 'share'"
              :class="{ active: activeMode === 'share' }"
              @click="activeMode = 'share'"
            >
              <ion-icon :icon="ioniconsQrCodeOutline" />
              <span>Mój kod</span>
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeMode === 'join'"
              :class="{ active: activeMode === 'join' }"
              @click="activeMode = 'join'"
            >
              <ion-icon :icon="ioniconsScanOutline" />
              <span>Dołącz</span>
            </button>
          </div>

          <!-- MODE 1: MÓJ KOD & QR -->
          <section v-if="activeMode === 'share'" class="pair-panel">
            <div class="pair-qr">
              <div class="pair-qr-frame">
                <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="Kod QR parowania" class="pair-qr-image" />
                <div v-else class="pair-qr-loading">
                  <ion-spinner name="crescent"></ion-spinner>
                </div>
              </div>
            </div>

            <div class="pair-code">
              <div class="pair-code-texts">
                <span class="pair-code-label">Twój kod</span>
                <span class="pair-code-value">{{ currentUser.pairing_code }}</span>
              </div>
              <button type="button" class="pair-copy-btn" @click="copyCode">
                <ion-icon :icon="copied ? ioniconsCheckmarkOutline : ioniconsCopyOutline" />
                <span>{{ copied ? 'Skopiowano' : 'Kopiuj' }}</span>
              </button>
            </div>
          </section>

          <!-- MODE 2: DOŁĄCZ DO PARTNERA -->
          <section v-else class="pair-panel">
            <p class="pair-panel-desc">Zeskanuj kod QR z telefonu partnera albo wpisz jego kod ręcznie.</p>

            <div class="dn-auth-stack">
              <button type="button" class="dn-auth-btn" @click="startScanner">
                <ion-icon :icon="ioniconsCameraOutline" />
                <span>Skanuj kod QR</span>
              </button>

              <label for="direct-gallery-input" class="dn-auth-btn dn-auth-btn--outline">
                <ion-icon :icon="ioniconsImageOutline" />
                <span>Wczytaj kod ze zdjęcia</span>
              </label>
              <input
                id="direct-gallery-input"
                type="file"
                accept="image/*"
                class="hidden-file-input"
                @change="handleFileUpload"
              />
            </div>

            <div class="dn-auth-divider">lub wpisz kod ręcznie</div>

            <form class="dn-auth-form" @submit.prevent="submitPairing(partnerCodeInput)">
              <DuoAuthField
                v-model="partnerCodeInput"
                label="Kod parowania partnera"
                placeholder="np. DN-8K4P2Q"
                maxlength="20"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
              />
              <p class="dn-auth-help">Partner znajdzie swój kod na tym samym ekranie w swojej aplikacji.</p>

              <div class="dn-auth-alert dn-auth-alert--error" v-if="pairingError" role="alert">
                <ion-icon :icon="ioniconsAlertCircleOutline" />
                <span>{{ pairingError }}</span>
              </div>

              <button
                type="submit"
                class="dn-auth-btn"
                :disabled="!partnerCodeInput.trim() || isPairingLoading"
              >
                <ion-spinner v-if="isPairingLoading" name="crescent"></ion-spinner>
                <span v-else>Połącz</span>
              </button>
            </form>
          </section>
          </template>

          <!-- FOOTER: SESSION -->
          <footer class="dn-auth-footer">
            <span class="session-line" v-if="currentUser.email || authUser?.email">
              Zalogowano jako <strong>{{ currentUser.email || authUser?.email }}</strong>
            </span>
            <button type="button" class="dn-auth-link dn-auth-link--muted" @click="handleSignOut">
              Wyloguj się
            </button>
          </footer>
        </div>

        <!-- QR SCANNER (full-screen camera, Telegram / WhatsApp style) -->
        <ion-modal :is-open="isScannerOpen" @didDismiss="stopScanner" class="qrs-modal">
          <ion-content :scroll-y="false" class="qrs-content">
            <div class="qrs" :class="`qrs--${scanState}`">
              <!-- CAMERA -->
              <video
                ref="videoEl"
                class="qrs-video"
                :class="{ 'qrs-video--mirror': isFrontCamera }"
                playsinline
                muted
                autoplay
                disablepictureinpicture
              ></video>

              <!-- VIEWFINDER: dimmed scrim with a rounded cut-out -->
              <div v-if="scanState !== 'blocked'" class="qrs-finder" aria-hidden="true">
                <div class="qrs-frame" :class="{ 'qrs-frame--hit': scanState === 'detected' || scanState === 'pairing' || scanState === 'success' }">
                  <span class="qrs-corner tl"></span>
                  <span class="qrs-corner tr"></span>
                  <span class="qrs-corner bl"></span>
                  <span class="qrs-corner br"></span>
                  <span v-if="scanState === 'scanning'" class="qrs-sweep"></span>
                  <div v-if="scanState === 'success'" class="qrs-hit-badge">
                    <ion-icon :icon="ioniconsCheckmark" />
                  </div>
                  <ion-spinner v-else-if="scanState === 'starting' || scanState === 'pairing'" name="crescent" class="qrs-frame-spinner" />
                </div>
              </div>

              <!-- TOP BAR -->
              <div class="qrs-top">
                <button type="button" class="qrs-round" aria-label="Zamknij skaner" @click="stopScanner">
                  <ion-icon :icon="ioniconsClose" />
                </button>
                <span class="qrs-title">Zeskanuj kod partnera</span>
                <button
                  v-if="isTorchSupported && scanState !== 'blocked'"
                  type="button"
                  class="qrs-round"
                  :class="{ 'qrs-round--on': isTorchOn }"
                  :aria-label="isTorchOn ? 'Wyłącz latarkę' : 'Włącz latarkę'"
                  @click="toggleTorch"
                >
                  <ion-icon :icon="isTorchOn ? ioniconsFlash : ioniconsFlashOutline" />
                </button>
                <span v-else class="qrs-round-spacer"></span>
              </div>

              <!-- BOTTOM: status + actions -->
              <div v-if="scanState !== 'blocked'" class="qrs-bottom">
                <transition name="qrs-fade" mode="out-in">
                  <div v-if="scanState === 'detected' || scanState === 'pairing'" key="pairing" class="qrs-card">
                    <span class="qrs-card-label">Znaleziono kod</span>
                    <span class="qrs-card-code">{{ scannedCode }}</span>
                    <span class="qrs-card-hint">Łączenie z partnerem…</span>
                  </div>
                  <div v-else-if="scanState === 'success'" key="success" class="qrs-card">
                    <span class="qrs-card-label">Gotowe</span>
                    <span class="qrs-card-code">Połączono w parę</span>
                  </div>
                  <div v-else-if="scanState === 'error'" key="error" class="qrs-card qrs-card--error">
                    <span class="qrs-card-label">Nie udało się połączyć</span>
                    <span class="qrs-card-hint">{{ scanError }}</span>
                    <button type="button" class="qrs-card-btn" @click="resumeScanning">Skanuj ponownie</button>
                  </div>
                  <p v-else key="hint" class="qrs-hint" :class="{ 'qrs-hint--warn': hintIsWarning }">
                    {{ scanHint }}
                  </p>
                </transition>

                <div class="qrs-actions">
                  <label for="scanner-modal-gallery-input" class="qrs-action">
                    <span class="qrs-round qrs-round--lg"><ion-icon :icon="ioniconsImagesOutline" /></span>
                    <span>Galeria</span>
                  </label>
                  <button type="button" class="qrs-action" @click="enterCodeManually">
                    <span class="qrs-round qrs-round--lg"><ion-icon :icon="ioniconsKeypadOutline" /></span>
                    <span>Wpisz kod</span>
                  </button>
                  <button v-if="hasMultipleCameras" type="button" class="qrs-action" @click="switchCamera">
                    <span class="qrs-round qrs-round--lg"><ion-icon :icon="ioniconsCameraReverseOutline" /></span>
                    <span>Obróć</span>
                  </button>
                </div>
              </div>

              <!-- CAMERA BLOCKED: app-styled explanation -->
              <div v-else class="qrs-blocked">
                <div class="qrs-blocked-icon"><ion-icon :icon="ioniconsCameraOutline" /></div>
                <h2 class="qrs-blocked-title">{{ blockedTitle }}</h2>
                <p class="qrs-blocked-text">{{ cameraBlockedMessage }}</p>
                <ol v-if="blockedSteps.length" class="qrs-blocked-steps">
                  <li v-for="step in blockedSteps" :key="step">{{ step }}</li>
                </ol>
                <div class="dn-auth-stack qrs-blocked-actions">
                  <label for="scanner-modal-gallery-input" class="dn-auth-btn">
                    <ion-icon :icon="ioniconsImagesOutline" />
                    <span>Wybierz zdjęcie kodu</span>
                  </label>
                  <button type="button" class="dn-auth-btn dn-auth-btn--outline" @click="startScanner">
                    <ion-icon :icon="ioniconsRefreshOutline" />
                    <span>Spróbuj ponownie</span>
                  </button>
                  <button type="button" class="dn-auth-link dn-auth-link--muted" @click="enterCodeManually">
                    Wpisz kod ręcznie
                  </button>
                </div>
              </div>

              <input
                id="scanner-modal-gallery-input"
                type="file"
                accept="image/*"
                class="hidden-file-input"
                @change="handleScannerFileUpload"
              />
              <!-- Sandbox for decoding photos without touching the live camera -->
              <div id="hidden-qr-reader" class="qrs-sandbox"></div>
            </div>
          </ion-content>
        </ion-modal>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import confetti from 'canvas-confetti'
import { useDuoState } from '~/composables/useDuoState'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { translateAppError } from '~/utils/errorTranslator'
import {
  heart as ioniconsHeart,
  qrCode as ioniconsQrCode,
  people as ioniconsPeople
} from 'ionicons/icons'
import type { DuoAuthHeroTile } from '~/components/DuoAuthHero.vue'

const heroTiles: DuoAuthHeroTile[] = [
  { icon: ioniconsHeart, color: '#e5484d' },
  { icon: ioniconsQrCode, color: '#1c1b19' },
  { icon: ioniconsPeople, color: '#7c5cff' }
]

const confettiColors = ['#1c1b19', '#e5484d', '#e8a33d', '#ece5d3', '#7c5cff']

const {
  authUser,
  currentUser,
  partnerUser,
  isPaired,
  updateMyName,
  pairWithCode,
  syncUserProfileWithAuth,
  subscribeToPairingChannel,
  checkDbPairingStatus,
  signOutUser,
  triggerToast
} = useDuoState()

const { askPermissionAfterPairing } = usePushNotifications()

let pairingPollInterval: any = null

const handleSignOut = async () => {
  if (pairingPollInterval) {
    clearInterval(pairingPollInterval)
    pairingPollInterval = null
  }
  try {
    await signOutUser()
  } catch (err) {
    console.error('Sign out error:', err)
  }
  if (typeof window !== 'undefined') {
    window.location.href = '/welcome'
  }
}

watch(isPaired, (paired) => {
  if (paired) {
    if (pairingPollInterval) {
      clearInterval(pairingPollInterval)
      pairingPollInterval = null
    }
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: confettiColors
    })
    askPermissionAfterPairing(partnerUser.value?.name || 'Partner')
    setTimeout(() => {
      navigateTo('/tabs/nest', { replace: true })
    }, 600)
  }
}, { immediate: true })

const activeMode = ref<'share' | 'join'>('share')
const myNameInput = ref(currentUser.value?.name || '')
const partnerCodeInput = ref('')
const partnerNameInput = ref('')
const qrCodeDataUrl = ref('')
const copied = ref(false)
const pairingError = ref('')
const isPairingLoading = ref(false)
const isSavingName = ref(false)
const isSyncingProfile = ref(false)
const pairingProfileReady = computed(() => Boolean(authUser.value?.id &&
  currentUser.value.auth_user_id === authUser.value.id && currentUser.value.pairing_code))

async function preparePairingProfile() {
  if (!authUser.value || isSyncingProfile.value || pairingProfileReady.value) return
  isSyncingProfile.value = true
  try {
    await syncUserProfileWithAuth(authUser.value)
  } finally {
    isSyncingProfile.value = false
  }
}

watch(() => currentUser.value.name, (name, previous) => {
  if (!myNameInput.value || myNameInput.value === previous) myNameInput.value = name
})

// Generate QR Code with Sea Blue styling
const generateMyQrCode = async () => {
  try {
    if (!pairingProfileReady.value) return
    const code = currentUser.value?.pairing_code
    if (!code) return
    const url = await QRCode.toDataURL(code, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1c1b19', // Warm ink dots (matches auth cream theme)
        light: '#ffffff'
      }
    })
    qrCodeDataUrl.value = url
  } catch (err) {
    console.error('QR generation error:', err)
  }
}

const saveMyName = async () => {
  if (isSavingName.value || !myNameInput.value.trim()) return
  isSavingName.value = true
  try {
    if (await updateMyName(myNameInput.value)) triggerToast('Zapisano imię')
  } catch {
    triggerToast('Nie udało się zapisać imienia.', { type: 'warning' })
  } finally {
    isSavingName.value = false
  }
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(currentUser.value?.pairing_code || '')
    copied.value = true
    triggerToast('Skopiowano kod')
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {
    triggerToast(currentUser.value?.pairing_code || '')
  }
}

// Pairing execution – returns true on success (the scanner shows its own result)
const submitPairing = async (code: string, opts: { fromScanner?: boolean } = {}): Promise<{ ok: boolean, error?: string }> => {
  pairingError.value = ''
  if (!pairingProfileReady.value || isPairingLoading.value || !code.trim()) return { ok: false }

  isPairingLoading.value = true
  try {
    if (myNameInput.value.trim()) await updateMyName(myNameInput.value)
    const partnerName = partnerNameInput.value.trim() || undefined
    const res = await pairWithCode(code.trim(), partnerName)
    if (res.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: confettiColors,
        zIndex: 30000
      })
      setTimeout(() => {
        if (isScannerOpen.value) stopScanner()
        navigateTo('/tabs/nest', { replace: true })
      }, opts.fromScanner ? 1100 : 800)
      return { ok: true }
    }
    const message = translateAppError(res.error) || 'Nie udało się połączyć kont.'
    if (!opts.fromScanner) pairingError.value = message
    return { ok: false, error: message }
  } catch (err: any) {
    const message = translateAppError(err) || 'Błąd połączenia.'
    if (!opts.fromScanner) pairingError.value = message
    return { ok: false, error: message }
  } finally {
    isPairingLoading.value = false
  }
}

// Scanner & Camera state
type ScanState = 'starting' | 'scanning' | 'detected' | 'pairing' | 'success' | 'error' | 'blocked'
const DEFAULT_HINT = 'Skieruj aparat na kod QR w aplikacji partnera'
const PAIRING_CODE_RE = /^DN-[A-Z0-9]{4,12}$/

const isScannerOpen = ref(false)
const scanState = ref<ScanState>('starting')
const scanHint = ref(DEFAULT_HINT)
const hintIsWarning = ref(false)
const scannedCode = ref('')
const scanError = ref('')
const cameraBlockedMessage = ref('')
const blockedTitle = ref('Brak dostępu do aparatu')
const blockedSteps = ref<string[]>([])
const isTorchSupported = ref(false)
const isTorchOn = ref(false)
const hasMultipleCameras = ref(false)
let currentCameraIndex = 0
let availableCameras: Array<{ id: string, label: string }> = []
let hintTimer: ReturnType<typeof setTimeout> | null = null
let lastRejected = { text: '', at: 0 }
let scannerRun = 0
let lastCameraCode = ''
let lastCameraCodeSeenAt = 0

// Extract pairing code from raw decoded text or URLs
const extractPairingCode = (rawText: string): string => {
  if (!rawText) return ''
  const match = rawText.trim().match(/\bDN-[A-Z0-9]{4,12}(?![A-Z0-9])/i)
  return match ? match[0].toUpperCase() : rawText.trim().toUpperCase()
}

const haptic = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern) } catch (_) {}
}

const flashHint = (text: string) => {
  scanHint.value = text
  hintIsWarning.value = true
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    scanHint.value = DEFAULT_HINT
    hintIsWarning.value = false
  }, 2600)
}

// Downscale large camera photos to optimal QR resolution (prevents ZXing memory crash)
const resizeImageToBlob = (file: File, maxDim = 1000): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          resolve(blob || file)
        }, 'image/jpeg', 0.92)
      } else {
        resolve(file)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
    img.src = url
  })
}

// Multi-engine WhatsApp-grade QR decoder from photo / screenshot
const decodeQrFromImage = async (file: File): Promise<string | null> => {
  // Pass 1: Native BarcodeDetector (instant, handles rotation & 48MP photos natively on iOS/Android/Chrome)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      const bitmap = await createImageBitmap(file)
      const results = await detector.detect(bitmap)
      if (results && results.length > 0 && results[0].rawValue) {
        return results[0].rawValue
      }
    } catch (e) {
      console.warn('Native BarcodeDetector pass 1 failed, trying downscaled pass...', e)
    }
  }

  // Pass 2: Downscaled image (optimal for ZXing / Html5Qrcode binarizer)
  try {
    const resizedBlob = await resizeImageToBlob(file, 1000)

    // Test downscaled with BarcodeDetector
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
        const bitmap = await createImageBitmap(resizedBlob)
        const results = await detector.detect(bitmap)
        if (results && results.length > 0 && results[0].rawValue) {
          return results[0].rawValue
        }
      } catch (_) {}
    }

    // Pass 3: Html5Qrcode on downscaled image via dedicated sandbox
    const hiddenEl = document.getElementById('hidden-qr-reader')
    if (hiddenEl) hiddenEl.replaceChildren()
    const hiddenScanner = new Html5Qrcode('hidden-qr-reader')
    const resizedFile = new File([resizedBlob], 'qr_resized.jpg', { type: 'image/jpeg' })
    try {
      const res = await hiddenScanner.scanFile(resizedFile, false)
      try { await hiddenScanner.clear() } catch (_) {}
      if (res) return res
    } catch (_) {
      try { await hiddenScanner.clear() } catch (_) {}
    }

    // Pass 4: Html5Qrcode on original file
    const rawScanner = new Html5Qrcode('hidden-qr-reader')
    try {
      const res = await rawScanner.scanFile(file, false)
      try { await rawScanner.clear() } catch (_) {}
      if (res) return res
    } catch (_) {
      try { await rawScanner.clear() } catch (_) {}
    }
  } catch (err) {
    console.warn('Image decode error:', err)
  }

  return null
}

/** Single entry point for every decoded QR (camera or gallery photo). */
const handleDecoded = async (decodedText: string) => {
  if (!isScannerOpen.value || isPairingLoading.value ||
    (scanState.value !== 'scanning' && scanState.value !== 'blocked')) return
  const run = scannerRun
  const code = extractPairingCode(decodedText)

  if (!PAIRING_CODE_RE.test(code)) {
    // Throttle so a foreign QR in view doesn't spam the hint / vibration
    if (lastRejected.text === decodedText && Date.now() - lastRejected.at < 2500) return
    lastRejected = { text: decodedText, at: Date.now() }
    haptic([20, 60, 20])
    flashHint('To nie jest kod DuoNest. Zeskanuj kod z ekranu parowania partnera.')
    return
  }
  if (code === currentUser.value?.pairing_code) {
    if (lastRejected.text === code && Date.now() - lastRejected.at < 2500) return
    lastRejected = { text: code, at: Date.now() }
    haptic([20, 60, 20])
    flashHint('To Twój własny kod – zeskanuj kod z telefonu partnera.')
    return
  }

  // Lock onto the code: freeze the frame, haptic tick, then pair
  scannedCode.value = code
  scanState.value = 'detected'
  haptic(35)
  pauseScanning()

  await new Promise(r => setTimeout(r, 380))
  if (!isScannerOpen.value || run !== scannerRun) return
  scanState.value = 'pairing'
  const result = await submitPairing(code, { fromScanner: true })
  if (!isScannerOpen.value || run !== scannerRun) return
  if (result.ok) {
    scanState.value = 'success'
    haptic([30, 50, 30])
  } else {
    scanError.value = result.error || 'Spróbuj ponownie.'
    scanState.value = 'error'
    haptic([40, 80, 40])
  }
}

const resumeScanning = () => {
  scanError.value = ''
  scannedCode.value = ''
  lastRejected = { text: '', at: 0 }
  scanHint.value = lastCameraCode ? 'Odsuń kod z kadru i zeskanuj ponownie.' : DEFAULT_HINT
  hintIsWarning.value = false
  if (!mediaStream) {
    startScanner()
    return
  }
  scanState.value = 'scanning'
  lastCameraCodeSeenAt = Date.now()
  resumeCamera()
}

/** Gallery photo picked on the main page (outside the scanner). */
const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  const decoded = await decodeQrFromImage(file)
  const code = decoded ? extractPairingCode(decoded) : ''
  if (!PAIRING_CODE_RE.test(code)) {
    triggerToast('Nie znaleziono kodu DuoNest na zdjęciu', { type: 'warning' })
    return
  }
  partnerCodeInput.value = code
  submitPairing(code)
}

/** Gallery photo picked inside the scanner – same flow as a live scan. */
const handleScannerFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  const previous = scanState.value
  if (previous !== 'blocked' && previous !== 'scanning') return
  const run = scannerRun
  if (previous === 'blocked') scanState.value = 'scanning'
  pauseScanning()
  const decoded = await decodeQrFromImage(file)
  if (!isScannerOpen.value || run !== scannerRun) return
  if (decoded) {
    await handleDecoded(decoded)
    if (scanState.value === 'scanning') {
      // Foreign / own code – keep scanning
      if (previous === 'blocked') scanState.value = 'blocked'
      else resumeCamera()
    }
    return
  }
  haptic([20, 60, 20])
  if (previous === 'blocked') {
    scanState.value = 'blocked'
    triggerToast('Nie znaleziono kodu QR na zdjęciu', { type: 'warning' })
  } else {
    flashHint('Nie znaleziono kodu QR na tym zdjęciu. Spróbuj wyraźniejszego.')
    resumeCamera()
  }
}

const enterCodeManually = async () => {
  await stopScanner()
  activeMode.value = 'join'
  await nextTick()
  const input = document.querySelector<HTMLInputElement>('.dn-auth-form input')
  input?.focus()
}

const describeCameraError = (err: any) => {
  const name = String(err?.name || err || '')
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
  blockedSteps.value = []
  if (!window.isSecureContext) {
    blockedTitle.value = 'Aparat wymaga bezpiecznego połączenia'
    cameraBlockedMessage.value = 'Otwórz DuoNest przez https://, aby skanować kody. Możesz też wybrać zdjęcie kodu albo wpisać go ręcznie.'
  } else if (/NotFound|Overconstrained|DevicesNotFound/i.test(name)) {
    blockedTitle.value = 'Nie znaleziono aparatu'
    cameraBlockedMessage.value = 'To urządzenie nie udostępnia aparatu. Wybierz zdjęcie kodu z galerii albo wpisz kod ręcznie.'
  } else if (/NotReadable|TrackStart|AbortError/i.test(name)) {
    blockedTitle.value = 'Aparat jest zajęty'
    cameraBlockedMessage.value = 'Inna aplikacja używa teraz aparatu. Zamknij ją i spróbuj ponownie.'
  } else {
    blockedTitle.value = 'Brak dostępu do aparatu'
    cameraBlockedMessage.value = 'DuoNest potrzebuje aparatu tylko do zeskanowania kodu partnera.'
    blockedSteps.value = isIos
      ? ['Otwórz Ustawienia → Aplikacje → Safari → Aparat', 'Wybierz „Pytaj” lub „Zezwalaj”', 'Wróć tutaj i stuknij „Spróbuj ponownie”']
      : ['Stuknij ikonę kłódki obok adresu strony', 'Wejdź w Uprawnienia → Aparat → Zezwalaj', 'Wróć tutaj i stuknij „Spróbuj ponownie”']
  }
  scanState.value = 'blocked'
}

// ---- Camera engine: own <video> + scan loop (full-screen, Telegram/WhatsApp style) ----
// Native BarcodeDetector where available (Android / Chrome), jsQR elsewhere (iOS).
const videoEl = ref<HTMLVideoElement | null>(null)
const isFrontCamera = ref(false)
let mediaStream: MediaStream | null = null
let scanTimer: ReturnType<typeof setTimeout> | null = null
let scanPaused = false
let detector: any = null
let jsQR: ((data: Uint8ClampedArray, w: number, h: number, opts?: any) => { data: string } | null) | null = null
const scanCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const SCAN_INTERVAL_MS = 110
const SCAN_MAX_EDGE = 640

const ensureDecoder = async () => {
  if (detector || jsQR) return
  try {
    const BD = (window as any).BarcodeDetector
    if (BD && (await BD.getSupportedFormats?.())?.includes('qr_code')) {
      detector = new BD({ formats: ['qr_code'] })
      return
    }
  } catch (_) {}
  jsQR = (await import('jsqr')).default as any
}

const decodeFrame = async (video: HTMLVideoElement): Promise<string | null> => {
  if (detector) {
    const found = await detector.detect(video)
    return found?.[0]?.rawValue || null
  }
  if (!jsQR || !scanCanvas) return null
  // Centre square of the frame (what the user aims at), downscaled for speed
  const vw = video.videoWidth, vh = video.videoHeight
  const side = Math.min(vw, vh)
  const sx = (vw - side) / 2, sy = (vh - side) / 2
  const out = Math.min(side, SCAN_MAX_EDGE)
  scanCanvas.width = out
  scanCanvas.height = out
  const ctx = scanCanvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, sx, sy, side, side, 0, 0, out, out)
  const img = ctx.getImageData(0, 0, out, out)
  return jsQR(img.data, out, out, { inversionAttempts: 'attemptBoth' })?.data || null
}

const scanLoop = async (run = scannerRun) => {
  if (run !== scannerRun) return
  scanTimer = null
  const video = videoEl.value
  if (!isScannerOpen.value || !mediaStream || !video) return
  if (!scanPaused && scanState.value === 'scanning' && video.readyState >= 2 && video.videoWidth) {
    try {
      const text = await decodeFrame(video)
      if (run !== scannerRun || !isScannerOpen.value) return
      if (!scanPaused && scanState.value === 'scanning' && text) {
        const code = extractPairingCode(text)
        lastCameraCodeSeenAt = Date.now()
        if (code !== lastCameraCode) {
          if (PAIRING_CODE_RE.test(code) && code !== currentUser.value?.pairing_code) lastCameraCode = code
          await handleDecoded(text)
        }
      } else if (!text && Date.now() - lastCameraCodeSeenAt >= 450) {
        lastCameraCode = ''
      }
    } catch (_) {}
  }
  if (run === scannerRun && isScannerOpen.value && mediaStream) {
    scanTimer = setTimeout(() => { void scanLoop(run) }, SCAN_INTERVAL_MS)
  }
}

const pauseScanning = () => {
  scanPaused = true
  videoEl.value?.pause()
}

const resumeCamera = () => {
  scanPaused = false
  videoEl.value?.play().catch(() => {})
}

const currentTrack = () => mediaStream?.getVideoTracks()[0] || null

const detectTorch = () => {
  try {
    isTorchSupported.value = Boolean((currentTrack()?.getCapabilities?.() as any)?.torch)
  } catch (_) {
    isTorchSupported.value = false
  }
}

const teardownCamera = async () => {
  if (scanTimer) clearTimeout(scanTimer)
  scanTimer = null
  mediaStream?.getTracks().forEach(t => t.stop())
  mediaStream = null
  if (videoEl.value) videoEl.value.srcObject = null
}

const openStream = async (deviceId?: string) => {
  const video: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: { ideal: 'environment' } }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { ...video, width: { ideal: 1280 }, height: { ideal: 720 } }
  })
}

const attachStream = async (stream: MediaStream) => {
  mediaStream = stream
  const settings = stream.getVideoTracks()[0]?.getSettings?.() || {}
  isFrontCamera.value = settings.facingMode === 'user'
  const video = videoEl.value
  if (!video) throw new Error('no video element')
  video.srcObject = stream
  await video.play().catch(() => {})
  detectTorch()
}

// Camera Scanner logic with robust iOS/Android compatibility
const startScanner = async () => {
  const run = ++scannerRun
  lastCameraCode = ''
  isScannerOpen.value = true
  scanState.value = 'starting'
  scanHint.value = DEFAULT_HINT
  hintIsWarning.value = false
  scannedCode.value = ''
  scanError.value = ''
  isTorchOn.value = false
  scanPaused = false
  await nextTick()
  // Let the modal mount its DOM before the camera attaches
  await new Promise(r => setTimeout(r, 160))
  if (!isScannerOpen.value || run !== scannerRun) return

  await teardownCamera()
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('unsupported'), { name: 'NotFoundError' })
    const [stream] = await Promise.all([openStream(), ensureDecoder()])
    if (!isScannerOpen.value || run !== scannerRun) {
      stream.getTracks().forEach(t => t.stop())
      return
    }
    await attachStream(stream)
    if (run !== scannerRun) return
    scanState.value = 'scanning'
    void scanLoop(run)

    // Permission is granted now, so device labels are available for "Obróć"
    try {
      availableCameras = (await navigator.mediaDevices.enumerateDevices())
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ id: d.deviceId, label: d.label }))
      hasMultipleCameras.value = availableCameras.length > 1
      const activeId = currentTrack()?.getSettings?.().deviceId
      const idx = availableCameras.findIndex(c => c.id === activeId)
      currentCameraIndex = idx >= 0 ? idx : 0
    } catch (_) {
      hasMultipleCameras.value = false
    }
  } catch (err: any) {
    console.warn('Camera start error:', err)
    if (run === scannerRun) {
      await teardownCamera()
      if (isScannerOpen.value) describeCameraError(err)
    }
  }
}

const switchCamera = async () => {
  if (availableCameras.length < 2 || scanState.value !== 'scanning') return
  const run = ++scannerRun
  currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length
  const nextCam = availableCameras[currentCameraIndex]
  scanState.value = 'starting'
  isTorchOn.value = false
  try {
    await teardownCamera()
    const stream = await openStream(nextCam.id)
    if (run !== scannerRun) {
      stream.getTracks().forEach(track => track.stop())
      return
    }
    await attachStream(stream)
    if (run !== scannerRun) return
    scanState.value = 'scanning'
    void scanLoop(run)
  } catch (e) {
    console.warn('Switch camera error:', e)
    if (run === scannerRun) void startScanner()
  }
}

const toggleTorch = async () => {
  const track = currentTrack()
  if (!track || !isTorchSupported.value) return
  try {
    const next = !isTorchOn.value
    await track.applyConstraints({ advanced: [{ torch: next } as any] })
    isTorchOn.value = next
    haptic(10)
  } catch (err) {
    console.warn('Torch toggle error:', err)
  }
}

const stopScanner = async () => {
  scannerRun++
  isScannerOpen.value = false
  if (hintTimer) clearTimeout(hintTimer)
  await teardownCamera()
  cameraBlockedMessage.value = ''
  isTorchOn.value = false
  isTorchSupported.value = false
  hasMultipleCameras.value = false
}

onMounted(async () => {
  await preparePairingProfile()
  generateMyQrCode()
  if (currentUser.value?.pairing_code) {
    subscribeToPairingChannel(currentUser.value.pairing_code)
  }

  // Check immediately with Supabase DB if already paired or if local state was stale
  const currentlyPaired = await checkDbPairingStatus()
  if (currentlyPaired && isPaired.value) {
    navigateTo('/tabs/nest', { replace: true })
    return
  }

  // Periodic poll to detect if partner accepted / paired while on this screen
  if (!pairingPollInterval) {
    pairingPollInterval = setInterval(async () => {
      if (isPaired.value) {
        if (pairingPollInterval) {
          clearInterval(pairingPollInterval)
          pairingPollInterval = null
        }
        return
      }
      const paired = await checkDbPairingStatus()
      if (paired) {
        if (pairingPollInterval) {
          clearInterval(pairingPollInterval)
          pairingPollInterval = null
        }
        triggerToast('Połączono z partnerem')
        confetti({
          particleCount: 120,
          spread: 75,
          origin: { y: 0.6 },
          colors: confettiColors
        })
        askPermissionAfterPairing(partnerUser.value?.name || 'Partner')
        navigateTo('/tabs/nest', { replace: true })
      }
    }, 2500)
  }
})

watch(() => pairingProfileReady.value ? currentUser.value.pairing_code : '', (newCode) => {
  if (newCode) {
    generateMyQrCode()
    subscribeToPairingChannel(newCode)
  }
})

onUnmounted(() => {
  stopScanner()
  if (pairingPollInterval) {
    clearInterval(pairingPollInterval)
    pairingPollInterval = null
  }
})
</script>

<style scoped>
.name-field {
  margin-bottom: 22px;
}

/* PANELS */
.pair-panel {
  margin-top: 20px;
  animation: pairPanelIn 0.25s ease;
}

@keyframes pairPanelIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.pair-panel-desc {
  margin: 0 0 18px;
  text-align: center;
  font-size: 14px;
  line-height: 1.5;
  color: var(--dn-auth-muted);
}

/* QR */
.pair-qr {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.pair-qr-frame {
  padding: 14px;
  background: #ffffff;
  border: 1.5px solid var(--dn-auth-line);
  border-radius: 28px;
  box-shadow: 0 16px 32px -20px rgba(28, 27, 25, 0.25);
}

.pair-qr-image,
.pair-qr-loading {
  width: 200px;
  height: 200px;
  display: block;
}

.pair-qr-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.pair-qr-loading ion-spinner {
  color: var(--dn-auth-ink);
}

/* CODE */
.pair-code {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 14px 18px;
  background: var(--dn-auth-field);
  border: 1px solid var(--dn-auth-field-line);
  border-radius: 20px;
}

.pair-code-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pair-code-label {
  font-size: 12px;
  color: var(--dn-auth-muted);
}

.pair-code-value {
  font-family: var(--dn-auth-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--dn-auth-ink);
  font-variant-numeric: lining-nums;
  user-select: text;
  -webkit-user-select: text;
}

.pair-copy-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: var(--dn-auth-ink);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.pair-copy-btn:active {
  transform: scale(0.96);
}

.pair-copy-btn ion-icon {
  font-size: 16px;
}

/* LIVE LISTENER */
.pair-live {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 0 4px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--dn-auth-muted);
}

.pair-live-dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
  border-radius: 50%;
  background: #2f9e44;
  animation: pulseGreenDot 1.8s infinite ease-in-out;
}

@keyframes pulseGreenDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.4; }
}

.session-line {
  font-size: 13px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hidden-file-input {
  display: none;
}

/* ============ QR SCANNER ============ */
.qrs-modal {
  --background: #000;
  --width: 100%;
  --height: 100%;
}

.qrs-content {
  --background: #000;
}

.qrs {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  color: #fff;
  --qrs-size: min(68vw, 290px);
}

/* Camera fills the whole screen */
.qrs-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #000;
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.qrs-video--mirror {
  transform: scaleX(-1);
}

.qrs--starting .qrs-video,
.qrs--blocked .qrs-video {
  opacity: 0;
}

.qrs--detected .qrs-video,
.qrs--pairing .qrs-video,
.qrs--success .qrs-video,
.qrs--error .qrs-video {
  filter: brightness(0.75);
}

/* Viewfinder */
.qrs-finder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding-bottom: 8vh;
}

.qrs-frame {
  position: relative;
  width: var(--qrs-size);
  height: var(--qrs-size);
  border-radius: 30px;
  box-shadow: 0 0 0 200vmax rgba(0, 0, 0, 0.55);
  transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.25), box-shadow 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrs--scanning .qrs-frame {
  animation: qrsBreathe 2.6s ease-in-out infinite;
}

.qrs-frame--hit {
  transform: scale(0.9);
  box-shadow: 0 0 0 200vmax rgba(0, 0, 0, 0.66);
}

@keyframes qrsBreathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.025); }
}

.qrs-corner {
  position: absolute;
  width: 46px;
  height: 46px;
  border: 0 solid #fff;
  transition: border-color 0.25s ease, width 0.35s ease, height 0.35s ease;
}

.qrs-corner.tl { top: 0; left: 0; border-top-width: 5px; border-left-width: 5px; border-top-left-radius: 30px; }
.qrs-corner.tr { top: 0; right: 0; border-top-width: 5px; border-right-width: 5px; border-top-right-radius: 30px; }
.qrs-corner.bl { bottom: 0; left: 0; border-bottom-width: 5px; border-left-width: 5px; border-bottom-left-radius: 30px; }
.qrs-corner.br { bottom: 0; right: 0; border-bottom-width: 5px; border-right-width: 5px; border-bottom-right-radius: 30px; }

.qrs-frame--hit .qrs-corner {
  width: 50%;
  height: 50%;
}

.qrs-sweep {
  position: absolute;
  left: 10%;
  right: 10%;
  top: 10%;
  height: 34%;
  border-radius: 18px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.16));
  border-bottom: 2px solid rgba(255, 255, 255, 0.75);
  animation: qrsSweep 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@keyframes qrsSweep {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateY(160%); opacity: 0; }
}

.qrs-frame-spinner {
  width: 34px;
  height: 34px;
  color: #fff;
}

.qrs-hit-badge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #fff;
  color: #1c1b19;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  animation: qrsPop 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.35);
}

@keyframes qrsPop {
  from { transform: scale(0.3); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Top bar */
.qrs-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: calc(env(safe-area-inset-top) + 12px) 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 2;
}

.qrs-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
}

.qrs-round,
.qrs-round-spacer {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.qrs-round {
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.16);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.2s ease, color 0.2s ease;
}

.qrs-round:active {
  transform: scale(0.92);
}

.qrs-round--on {
  background: #fff;
  color: #1c1b19;
}

.qrs-round--lg {
  width: 56px;
  height: 56px;
  font-size: 24px;
}

/* Bottom */
.qrs-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 20px calc(env(safe-area-inset-bottom) + 24px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  z-index: 2;
}

.qrs-hint {
  margin: 0;
  max-width: 300px;
  padding: 10px 16px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.35);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  transition: background 0.2s ease, color 0.2s ease;
}

.qrs-hint--warn {
  background: #fff;
  color: #1c1b19;
  animation: qrsShake 0.35s ease;
}

@keyframes qrsShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.qrs-card {
  width: 100%;
  max-width: 340px;
  padding: 18px 20px;
  border-radius: 24px;
  background: #fff;
  color: #1c1b19;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  box-shadow: 0 20px 40px -18px rgba(0, 0, 0, 0.6);
}

.qrs-card-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7a6a48;
}

.qrs-card-code {
  font-family: var(--dn-auth-serif);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.3;
}

.qrs-card-hint {
  font-size: 13.5px;
  line-height: 1.45;
  color: #6f6a60;
}

.qrs-card-btn {
  margin-top: 10px;
  padding: 12px 22px;
  border: none;
  border-radius: 14px;
  background: #1c1b19;
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.qrs-actions {
  display: flex;
  justify-content: center;
  gap: 28px;
}

.qrs-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  padding: 0;
  color: #fff;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.qrs-action:active .qrs-round {
  transform: scale(0.92);
}

.qrs-fade-enter-active,
.qrs-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}

.qrs-fade-enter-from,
.qrs-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Camera blocked – app look (cream, ink, serif) */
.qrs--blocked {
  background: var(--dn-auth-cream);
  color: var(--dn-auth-ink);
}

.qrs--blocked .qrs-round {
  background: rgba(28, 27, 25, 0.07);
  color: var(--dn-auth-ink);
}

.qrs--blocked .qrs-title {
  text-shadow: none;
}

.qrs-blocked {
  position: absolute;
  inset: 0;
  padding: calc(env(safe-area-inset-top) + 92px) 28px calc(env(safe-area-inset-bottom) + 28px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  overflow-y: auto;
}

.qrs-blocked-icon {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 14px 30px -18px rgba(28, 27, 25, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin-bottom: 22px;
}

.qrs-blocked-title {
  margin: 0 0 10px;
  font-family: var(--dn-auth-serif);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.qrs-blocked-text {
  margin: 0 0 18px;
  max-width: 320px;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--dn-auth-muted);
}

.qrs-blocked-steps {
  margin: 0 0 24px;
  padding: 16px 18px 16px 38px;
  width: 100%;
  max-width: 340px;
  border-radius: 18px;
  background: #fff;
  text-align: left;
  font-size: 14px;
  line-height: 1.5;
  color: var(--dn-auth-ink-soft);
}

.qrs-blocked-steps li + li {
  margin-top: 6px;
}

.qrs-blocked-actions {
  width: 100%;
  max-width: 340px;
  margin-top: auto;
}

.qrs-sandbox {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

</style>
