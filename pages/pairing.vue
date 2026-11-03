<template>
  <ion-page>
    <ion-content :fullscreen="true" class="pairing-content">
      <div class="pairing-container">
        <!-- BRAND HEADER -->
        <div class="pairing-hero">
          <img src="/favicon.png" alt="DuoNest Logo" class="pairing-logo" />
          <h1 class="pairing-title">DuoNest</h1>
          <p class="pairing-subtitle">Połączcie swoje konta, by wspólnie budować Wasze domowe gniazdko.</p>
        </div>

        <!-- USER IDENTITY BAR -->
        <div class="dn-card identity-card">
          <div class="card-label">TWOJE IMIĘ W APLIKACJI</div>
          <div class="name-edit-row">
            <ion-input
              v-model="myNameInput"
              placeholder="np. Jan"
              class="name-input"
              @ionBlur="saveMyName"
            />
            <button class="save-name-btn" @click="saveMyName" :disabled="!myNameInput.trim()">
              Zapisz
            </button>
          </div>
          <div class="account-session-row" v-if="currentUser.email">
            <span class="account-email-label">Zalogowano: <strong>{{ currentUser.email }}</strong></span>
            <button type="button" class="logout-link-btn" @click="handleSignOut">
              Wyloguj się
            </button>
          </div>
        </div>

        <!-- SEGMENT SWITCHER: POKAŻ KOD / DOŁĄCZ -->
        <div class="mode-tabs">
          <button
            class="mode-tab-btn"
            :class="{ active: activeMode === 'share' }"
            @click="activeMode = 'share'"
          >
            <ion-icon :icon="ioniconsQrCodeOutline" />
            <span>Mój Kod & QR</span>
          </button>
          <button
            class="mode-tab-btn"
            :class="{ active: activeMode === 'join' }"
            @click="activeMode = 'join'"
          >
            <ion-icon :icon="ioniconsScanOutline" />
            <span>Dołącz do Partnera</span>
          </button>
        </div>

        <!-- MODE 1: WYŚWIETLENIE SWOJEGO KODU & KODU QR -->
        <div v-if="activeMode === 'share'" class="dn-card share-card">
          <h3>Pokaż kod swojemu partnerowi</h3>
          <p class="section-info">Partner może przepisać poniższy kod lub zeskanować kod QR swoim aparatem:</p>

          <!-- CODE TEXT -->
          <div class="code-box">
            <span class="code-value">{{ currentUser.pairing_code }}</span>
            <button class="copy-action-btn" @click="copyCode">
              <ion-icon :icon="copied ? ioniconsCheckmarkOutline : ioniconsCopyOutline" />
              <span>{{ copied ? 'Skopiowano!' : 'Kopiuj' }}</span>
            </button>
          </div>

          <!-- QR CODE DISPLAY -->
          <div class="qr-code-wrapper">
            <div class="qr-frame" v-if="qrCodeDataUrl">
              <img :src="qrCodeDataUrl" alt="Kod QR parowania" class="qr-image" />
            </div>
            <div class="qr-loading" v-else>
              <ion-spinner name="crescent" color="primary"></ion-spinner>
            </div>
            <span class="qr-caption">Nakieruj aparat drugiego telefonu na ten kod QR</span>
          </div>

          <div class="pairing-live-listener-banner">
            <span class="pulsing-green-dot"></span>
            <span>Gdy partner połączy się z Twoim kodem, aplikacja od razu Was połączy.</span>
          </div>
        </div>

        <div v-else class="dn-card join-card">
          <h3>Wpisz lub zeskanuj kod partnera</h3>
          <p class="section-info">Wprowadź kod lub włącz aparat, aby połączyć Wasze konta:</p>

          <!-- SCAN QR BUTTON -->
          <button class="scan-camera-btn" @click="startScanner">
            <ion-icon :icon="ioniconsCameraOutline" class="cam-icon" />
            <div class="cam-btn-text">
              <span class="cam-title">Zeskanuj Kod QR Partnera</span>
              <span class="cam-sub">Uruchom aparat do odczytania kodu</span>
            </div>
          </button>

          <div class="divider-or">
            <span>LUB WPISZ KOD RĘCZNIE</span>
          </div>

          <!-- MANUAL CODE INPUT -->
          <div class="manual-input-box">
            <label class="manual-label">Kod parowania partnera</label>
            <div class="manual-input-row">
              <ion-input
                v-model="partnerCodeInput"
                placeholder="np. DN-849201"
                class="partner-code-input"
                maxlength="12"
                :clear-input="true"
              />
              <button
                class="pair-action-btn"
                @click="submitPairing(partnerCodeInput)"
                :disabled="!partnerCodeInput.trim() || isPairingLoading"
              >
                <ion-spinner v-if="isPairingLoading" name="crescent"></ion-spinner>
                <span v-else>Połącz</span>
              </button>
            </div>

            <span class="error-msg" v-if="pairingError">{{ pairingError }}</span>
          </div>
        </div>

        <!-- CAMERA SCANNER MODAL -->
        <ion-modal :is-open="isScannerOpen" @didDismiss="stopScanner">
          <ion-header>
            <ion-toolbar>
              <ion-title>Skaner Kodu QR</ion-title>
              <ion-buttons slot="end">
                <ion-button @click="stopScanner">Zamknij</ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding scanner-modal-content">
            <div class="scanner-container">
              <p class="scanner-hint">Skieruj obiektyw na kod QR wyświetlony na telefonie partnera:</p>
              
              <!-- HTML5 QR Scanner Target Container -->
              <div id="qr-reader" class="qr-reader-box"></div>

              <!-- Fallback file upload -->
              <div class="file-upload-row">
                <label for="qr-file-input" class="file-upload-label">
                  <ion-icon :icon="ioniconsImageOutline" />
                  <span>Wczytaj zdjęcie z kodem QR</span>
                </label>
                <input
                  id="qr-file-input"
                  type="file"
                  accept="image/*"
                  class="hidden-file-input"
                  @change="handleFileUpload"
                />
              </div>

              <div class="scanner-status" v-if="scannerStatusText">
                {{ scannerStatusText }}
              </div>
            </div>
          </ion-content>
        </ion-modal>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'
import confetti from 'canvas-confetti'
import { useDuoState } from '~/composables/useDuoState'

const {
  currentUser,
  isPaired,
  updateMyName,
  pairWithCode,
  subscribeToPairingChannel,
  signOutUser,
  triggerToast
} = useDuoState()

const handleSignOut = async () => {
  await signOutUser()
}

watch(isPaired, (paired) => {
  if (paired) {
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#0284c7', '#0ea5e9', '#0d9488', '#38bdf8']
    })
    setTimeout(() => {
      navigateTo('/tabs/nest', { replace: true })
    }, 600)
  }
}, { immediate: true })

const activeMode = ref<'share' | 'join'>('share')
const myNameInput = ref(currentUser.value.name || '')
const partnerCodeInput = ref('')
const partnerNameInput = ref('')
const qrCodeDataUrl = ref('')
const copied = ref(false)
const pairingError = ref('')
const isPairingLoading = ref(false)

// Auto-save user's name when typing
watch(myNameInput, (val) => {
  if (val && val.trim()) {
    updateMyName(val.trim())
  }
})

// Scanner state
const isScannerOpen = ref(false)
const scannerStatusText = ref('')
let html5QrCode: Html5Qrcode | null = null

// Generate QR Code with Sea Blue styling
const generateMyQrCode = async () => {
  try {
    const code = currentUser.value.pairing_code
    const url = await QRCode.toDataURL(code, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0284c7', // Sea blue dots
        light: '#ffffff'
      }
    })
    qrCodeDataUrl.value = url
  } catch (err) {
    console.error('QR generation error:', err)
  }
}

const saveMyName = () => {
  if (myNameInput.value.trim()) {
    updateMyName(myNameInput.value.trim())
    triggerToast('Zaktualizowano Twoje imię!')
  }
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(currentUser.value.pairing_code)
    copied.value = true
    triggerToast('Kod skopiowany do schowka!')
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {
    triggerToast(`Twój kod: ${currentUser.value.pairing_code}`)
  }
}

// Pairing execution
const submitPairing = async (code: string) => {
  pairingError.value = ''
  if (!code.trim()) return

  if (myNameInput.value.trim()) {
    updateMyName(myNameInput.value.trim())
  }

  isPairingLoading.value = true
  try {
    const partnerName = partnerNameInput.value.trim() || undefined
    const res = await pairWithCode(code.trim(), partnerName)
    if (res.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0284c7', '#0ea5e9', '#0d9488', '#38bdf8']
      })
      if (isScannerOpen.value) {
        await stopScanner()
      }
      setTimeout(() => {
        navigateTo('/tabs/nest', { replace: true })
      }, 800)
    } else {
      pairingError.value = res.error || 'Nie udało się połączyć kont.'
    }
  } catch (err: any) {
    pairingError.value = err?.message || 'Błąd połączenia.'
  } finally {
    isPairingLoading.value = false
  }
}

// Camera Scanner logic
const startScanner = async () => {
  isScannerOpen.value = true
  scannerStatusText.value = 'Inicjalizacja aparatu...'
  await nextTick()

  try {
    html5QrCode = new Html5Qrcode('qr-reader')
    const config = { fps: 10, qrbox: { width: 250, height: 250 } }

    await html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        // Successfully scanned!
        scannerStatusText.value = `Zeskanowano: ${decodedText}`
        submitPairing(decodedText)
      },
      () => {
        // Scanning in progress...
      }
    )
    scannerStatusText.value = 'Skieruj aparat na kod QR'
  } catch (err: any) {
    console.warn('Camera start error:', err)
    scannerStatusText.value = 'Nie można uzyskać dostępu do kamery. Możesz wgrać plik ze zdjęciem kodu QR poniżej lub wpisać kod ręcznie.'
  }
}

const stopScanner = async () => {
  if (html5QrCode) {
    try {
      await html5QrCode.stop()
      await html5QrCode.clear()
    } catch {
      // already stopped
    }
    html5QrCode = null
  }
  isScannerOpen.value = false
  scannerStatusText.value = ''
}

const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]

  try {
    scannerStatusText.value = 'Analizowanie zdjęcia...'
    const qrScanner = new Html5Qrcode('qr-reader')
    const result = await qrScanner.scanFile(file, true)
    if (result) {
      scannerStatusText.value = `Zeskanowano z pliku: ${result}`
      submitPairing(result)
    }
  } catch (err) {
    scannerStatusText.value = 'Nie rozpoznano kodu QR na tym zdjęciu. Spróbuj innego pliku lub wpisz kod ręcznie.'
  }
}

onMounted(() => {
  generateMyQrCode()
  if (currentUser.value?.pairing_code) {
    subscribeToPairingChannel(currentUser.value.pairing_code)
  }
  if (isPaired.value) {
    navigateTo('/tabs/nest', { replace: true })
  }
})

watch(() => currentUser.value?.pairing_code, (newCode) => {
  if (newCode) {
    generateMyQrCode()
    subscribeToPairingChannel(newCode)
  }
})

onUnmounted(() => {
  stopScanner()
})
</script>

<style scoped>
.pairing-content {
  --background: #f8fafc;
}

.pairing-container {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px 40px 16px;
}

.pairing-hero {
  text-align: center;
  padding: 16px 0 12px 0;
}

.pairing-logo {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(2, 132, 199, 0.25);
  margin-bottom: 12px;
}

.pairing-title {
  font-size: 28px;
  font-weight: 900;
  color: #0284c7;
  letter-spacing: -0.03em;
  margin: 0;
}

.pairing-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 6px auto 0 auto;
  max-width: 320px;
  line-height: 1.4;
}

/* IDENTITY CARD */
.identity-card {
  margin: 16px 0 12px 0;
  padding: 14px 16px;
}

.card-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #0369a1;
  margin-bottom: 6px;
}

.name-edit-row {
  display: flex;
  gap: 8px;
}

.name-input {
  flex: 1;
  --background: #f8fafc;
  --padding-start: 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 600;
}

.save-name-btn {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #0284c7;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  padding: 0 16px;
  cursor: pointer;
}

/* MODE TABS */
.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 12px 0 16px 0;
}

.mode-tab-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 8px;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.mode-tab-btn.active {
  background: #0284c7;
  color: #ffffff;
  border-color: #0284c7;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.3);
}

.mode-tab-btn ion-icon {
  font-size: 18px;
}

/* CARDS */
.share-card, .join-card {
  margin: 0;
  padding: 20px;
  text-align: center;
}

.section-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #0284c7;
  margin-bottom: 4px;
}

.share-card h3, .join-card h3 {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.section-info {
  font-size: 13px;
  color: #64748b;
  margin: 6px 0 16px 0;
  line-height: 1.4;
}

/* CODE BOX */
.code-box {
  background: #f0f9ff;
  border: 2px dashed #0284c7;
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.code-value {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0.15em;
  color: #0284c7;
  font-family: monospace;
}

.copy-action-btn {
  background: #ffffff;
  border: 1px solid #bae6fd;
  color: #0284c7;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

/* QR WRAPPER */
.qr-code-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qr-frame {
  background: #ffffff;
  padding: 12px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  display: inline-block;
}

.qr-image {
  width: 200px;
  height: 200px;
  display: block;
}

.qr-loading {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-caption {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

/* SCAN CAMERA BUTTON */
.scan-camera-btn {
  width: 100%;
  background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
  color: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(2, 132, 199, 0.3);
  text-align: left;
  transition: all 0.2s ease;
}

.scan-camera-btn:active {
  transform: scale(0.98);
}

.cam-icon {
  font-size: 30px;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px;
  border-radius: 12px;
}

.cam-title {
  font-size: 15px;
  font-weight: 800;
  display: block;
}

.cam-sub {
  font-size: 12px;
  opacity: 0.9;
  display: block;
  margin-top: 2px;
}

/* DIVIDER */
.divider-or {
  position: relative;
  text-align: center;
  margin: 20px 0;
}

.divider-or::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
}

.divider-or span {
  position: relative;
  background: #ffffff;
  padding: 0 12px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

/* MANUAL INPUT */
.manual-input-box {
  text-align: left;
}

.manual-label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  display: block;
  margin-bottom: 6px;
}

.manual-input-row {
  display: flex;
  gap: 8px;
}

.partner-code-input {
  flex: 1;
  --background: #f8fafc;
  --padding-start: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pair-action-btn {
  background: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(2, 132, 199, 0.25);
}

.partner-name-field {
  margin-top: 12px;
}

.manual-sublabel {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  display: block;
  margin-bottom: 4px;
}

.partner-name-input-styled {
  --background: #f8fafc;
  --padding-start: 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 600;
}

.error-msg {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  font-weight: 600;
}

/* SCANNER MODAL */
.scanner-modal-content {
  --background: #0f172a;
  color: #ffffff;
}

.scanner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 10px;
}

.scanner-hint {
  font-size: 13px;
  color: #cbd5e1;
  text-align: center;
  margin: 0;
}

.qr-reader-box {
  width: 100% !important;
  max-width: 340px;
  border-radius: 18px;
  overflow: hidden;
  border: 2px solid #0284c7;
}

.file-upload-row {
  margin-top: 10px;
}

.file-upload-label {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.hidden-file-input {
  display: none;
}

.scanner-status {
  font-size: 12px;
  color: #38bdf8;
  text-align: center;
  font-weight: 600;
}

.pairing-live-listener-banner {
  margin-top: 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #16a34a;
  text-align: left;
  line-height: 1.35;
}

.pulsing-green-dot {
  width: 8px;
  height: 8px;
  min-width: 8px;
  border-radius: 50%;
  background: #16a34a;
  animation: pulseGreenDot 1.8s infinite ease-in-out;
}

@keyframes pulseGreenDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.4; }
}

.account-session-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
  color: #64748b;
}

.account-email-label strong {
  color: #0369a1;
}

.logout-link-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.logout-link-btn:hover {
  background: #fee2e2;
}
</style>
