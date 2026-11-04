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

          <!-- SCAN QR BUTTONS (CAMERA OR GALLERY) -->
          <div class="scan-buttons-group">
            <button class="scan-camera-btn" @click="startScanner">
              <ion-icon :icon="ioniconsCameraOutline" class="cam-icon" />
              <div class="cam-btn-text">
                <span class="cam-title">Zeskanuj Kod QR Aparatem</span>
                <span class="cam-sub">Skieruj aparat na telefon partnera</span>
              </div>
            </button>

            <label for="direct-gallery-input" class="scan-gallery-btn">
              <ion-icon :icon="ioniconsImageOutline" class="gallery-icon" />
              <div class="cam-btn-text">
                <span class="cam-title">Wczytaj Kod ze Zdjęcia</span>
                <span class="cam-sub">Wybierz zdjęcie lub zrzut ekranu z galerii</span>
              </div>
            </label>
            <input
              id="direct-gallery-input"
              type="file"
              accept="image/*"
              class="hidden-file-input"
              @change="handleFileUpload"
            />
          </div>

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

        <!-- WHATSAPP-STYLE QR SCANNER MODAL -->
        <ion-modal :is-open="isScannerOpen" @didDismiss="stopScanner" class="whatsapp-scanner-modal">
          <ion-header class="ion-no-border">
            <ion-toolbar class="scanner-modal-toolbar">
              <ion-buttons slot="start">
                <ion-button @click="stopScanner" class="scanner-header-btn">
                  <ion-icon :icon="ioniconsCloseOutline" slot="icon-only" />
                </ion-button>
              </ion-buttons>
              <ion-title class="scanner-header-title">Skanuj kod QR</ion-title>
              <ion-buttons slot="end">
                <ion-button v-if="hasMultipleCameras" @click="switchCamera" class="scanner-header-btn" title="Obróć aparat">
                  <ion-icon :icon="ioniconsCameraReverseOutline" slot="icon-only" />
                </ion-button>
                <ion-button v-if="isTorchSupported" @click="toggleTorch" class="scanner-header-btn" :class="{ 'torch-on': isTorchOn }">
                  <ion-icon :icon="isTorchOn ? ioniconsFlashOutline : ioniconsFlashOffOutline" slot="icon-only" />
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content class="scanner-modal-content" :scroll-y="false">
            <div class="whatsapp-scanner-wrapper">
              <!-- Live Video Viewport -->
              <div class="camera-viewport">
                <div id="qr-reader" class="scanner-video-box"></div>

                <!-- Laser scanning viewfinder overlay -->
                <div class="viewfinder-overlay" v-if="!cameraBlockedMessage">
                  <div class="viewfinder-box">
                    <span class="corner tl"></span>
                    <span class="corner tr"></span>
                    <span class="corner bl"></span>
                    <span class="corner br"></span>
                    <div class="laser-scanner-line"></div>
                  </div>
                </div>

                <!-- Camera Error / Blocked Overlay -->
                <div class="camera-error-backdrop" v-if="cameraBlockedMessage">
                  <div class="camera-error-card">
                    <ion-icon :icon="ioniconsAlertCircleOutline" class="error-badge-icon" />
                    <h4>Aparat niedostępny</h4>
                    <p>{{ cameraBlockedMessage }}</p>
                    <label for="scanner-modal-gallery-input" class="action-gallery-btn">
                      <ion-icon :icon="ioniconsImageOutline" />
                      <span>Wczytaj zdjęcie z kodem z galerii</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Bottom instructions and Gallery Button (WhatsApp style) -->
              <div class="scanner-bottom-sheet">
                <p class="scanner-status-text">
                  {{ scannerStatusText || 'Skieruj aparat na kod QR wyświetlony u partnera' }}
                </p>

                <div class="scanner-quick-tools">
                  <label for="scanner-modal-gallery-input" class="gallery-pill-btn">
                    <ion-icon :icon="ioniconsImageOutline" class="pill-icon" />
                    <span>Zdjęcie z galerii</span>
                  </label>
                  <input
                    id="scanner-modal-gallery-input"
                    type="file"
                    accept="image/*"
                    class="hidden-file-input"
                    @change="handleFileUpload"
                  />

                  <button v-if="hasMultipleCameras" type="button" class="gallery-pill-btn" @click="switchCamera">
                    <ion-icon :icon="ioniconsCameraReverseOutline" class="pill-icon" />
                    <span>Obróć aparat</span>
                  </button>
                </div>
              </div>

              <!-- Dedicated sandbox for photo decoding to prevent camera collisions -->
              <div id="hidden-qr-reader" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;"></div>
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
import { usePushNotifications } from '~/composables/usePushNotifications'

const {
  currentUser,
  partnerUser,
  isPaired,
  updateMyName,
  pairWithCode,
  subscribeToPairingChannel,
  signOutUser,
  triggerToast
} = useDuoState()

const { askPermissionAfterPairing } = usePushNotifications()

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
    askPermissionAfterPairing(partnerUser.value?.name || 'Partner')
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

// Generate QR Code with Sea Blue styling
const generateMyQrCode = async () => {
  try {
    const code = currentUser.value.pairing_code
    if (!code) return
    const url = await QRCode.toDataURL(code, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a', // Dark Slate dots
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

// Scanner & Camera state
const isScannerOpen = ref(false)
const scannerStatusText = ref('')
const cameraBlockedMessage = ref('')
const isTorchSupported = ref(false)
const isTorchOn = ref(false)
const hasMultipleCameras = ref(false)
let currentCameraIndex = 0
let availableCameras: any[] = []
let html5QrCode: Html5Qrcode | null = null

// Extract pairing code from raw decoded text or URLs
const extractPairingCode = (rawText: string): string => {
  if (!rawText) return ''
  const trimmed = rawText.trim()
  const match = trimmed.match(/DN-[A-Z0-9]{4,10}/i)
  if (match) {
    return match[0].toUpperCase()
  }
  return trimmed
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

const handleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]

  try {
    scannerStatusText.value = 'Analizowanie zdjęcia...'
    const decoded = await decodeQrFromImage(file)
    if (decoded) {
      const code = extractPairingCode(decoded)
      scannerStatusText.value = `Zeskanowano kod: ${code}`
      await stopScanner()
      submitPairing(code)
    } else {
      scannerStatusText.value = 'Nie rozpoznano kodu QR na tym zdjęciu. Upewnij się, że kod jest wyraźny lub wpisz kod ręcznie.'
      triggerToast('Nie rozpoznano kodu QR na wybranym zdjęciu.')
    }
  } catch (err) {
    scannerStatusText.value = 'Błąd odczytu zdjęcia. Spróbuj innego pliku lub wpisz kod ręcznie.'
  } finally {
    target.value = ''
  }
}

// Camera Scanner logic with robust iOS/Android compatibility
const startScanner = async () => {
  isScannerOpen.value = true
  cameraBlockedMessage.value = ''
  scannerStatusText.value = 'Uruchamianie aparatu...'
  await nextTick()

  // Small delay for Ionic modal DOM rendering
  await new Promise(r => setTimeout(r, 120))

  const readerEl = document.getElementById('qr-reader')
  if (readerEl) readerEl.replaceChildren()

  try {
    try {
      availableCameras = await Html5Qrcode.getCameras()
      hasMultipleCameras.value = availableCameras.length > 1
    } catch (_) {
      availableCameras = []
      hasMultipleCameras.value = false
    }

    if (html5QrCode) {
      try { await html5QrCode.stop() } catch (_) {}
      try { await html5QrCode.clear() } catch (_) {}
      html5QrCode = null
    }

    html5QrCode = new Html5Qrcode('qr-reader')

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const edge = Math.min(viewfinderWidth, viewfinderHeight)
        const size = Math.floor(edge * 0.72)
        return { width: Math.max(size, 180), height: Math.max(size, 180) }
      },
      aspectRatio: 1.0
    }

    const onScanSuccess = (decodedText: string) => {
      const code = extractPairingCode(decodedText)
      scannerStatusText.value = `Zeskanowano: ${code}`
      stopScanner()
      submitPairing(code)
    }

    let started = false

    // 1. Try back camera by deviceId
    if (availableCameras.length > 0) {
      const backCam = availableCameras.find(c => /back|rear|environment|tył|główny/i.test(c.label)) || availableCameras[availableCameras.length - 1]
      try {
        await html5QrCode.start(backCam.id, config, onScanSuccess, () => {})
        started = true
      } catch (e) {
        console.warn('Failed with camera ID, trying facingMode ideal...', e)
      }
    }

    // 2. Try facingMode ideal: environment
    if (!started) {
      try {
        await html5QrCode.start({ facingMode: { ideal: 'environment' } }, config, onScanSuccess, () => {})
        started = true
      } catch (e) {
        console.warn('Failed with facingMode ideal, trying generic video...', e)
      }
    }

    // 3. Fallback to user camera or basic video
    if (!started) {
      await html5QrCode.start({ facingMode: 'user' }, config, onScanSuccess, () => {})
      started = true
    }

    scannerStatusText.value = 'Skieruj aparat na kod QR partnera'

    // Check torch support
    try {
      const track = (html5QrCode as any).getRunningTrack?.()
      const caps = track?.getCapabilities?.()
      isTorchSupported.value = !!caps?.torch
    } catch (_) {
      isTorchSupported.value = false
    }
  } catch (err: any) {
    console.warn('Camera start error:', err)
    cameraBlockedMessage.value = 'Przeglądarka zablokowała dostęp do kamery lub na urządzeniu brak aktywnego aparatu. Kliknij poniżej, aby wybrać zdjęcie z galerii.'
    scannerStatusText.value = 'Aparat zablokowany. Wybierz zdjęcie z kodem z galerii.'
  }
}

const switchCamera = async () => {
  if (availableCameras.length < 2 || !html5QrCode) return
  currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length
  const nextCam = availableCameras[currentCameraIndex]
  try {
    await html5QrCode.stop()
    await html5QrCode.clear()
    const readerEl = document.getElementById('qr-reader')
    if (readerEl) readerEl.replaceChildren()
    html5QrCode = new Html5Qrcode('qr-reader')

    const config = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const edge = Math.min(viewfinderWidth, viewfinderHeight)
        const size = Math.floor(edge * 0.72)
        return { width: Math.max(size, 180), height: Math.max(size, 180) }
      }
    }

    await html5QrCode.start(nextCam.id, config, (decodedText) => {
      const code = extractPairingCode(decodedText)
      stopScanner()
      submitPairing(code)
    }, () => {})
  } catch (e) {
    console.warn('Switch camera error:', e)
  }
}

const toggleTorch = async () => {
  if (!html5QrCode || !isTorchSupported.value) return
  try {
    isTorchOn.value = !isTorchOn.value
    await (html5QrCode as any).applyVideoConstraints({
      advanced: [{ torch: isTorchOn.value }]
    })
  } catch (err) {
    console.warn('Torch toggle error:', err)
  }
}

const stopScanner = async () => {
  if (html5QrCode) {
    try {
      await html5QrCode.stop()
      await html5QrCode.clear()
    } catch (_) {}
    html5QrCode = null
  }
  isScannerOpen.value = false
  scannerStatusText.value = ''
  cameraBlockedMessage.value = ''
  isTorchOn.value = false
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
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.15);
  margin-bottom: 12px;
}

.pairing-title {
  font-size: 28px;
  font-weight: 900;
  color: #0f172a;
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
  color: #0f172a;
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
  --border-radius: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.name-input:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.save-name-btn {
  background: #0f172a;
  border: 1px solid #0f172a;
  color: #ffffff;
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
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
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
  color: #0f172a;
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
  background: #f8fafc;
  border: 2px dashed #0f172a;
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
  color: #0f172a;
  font-family: monospace;
}

.copy-action-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
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
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
  text-align: left;
  transition: all 0.2s ease;
}

.scan-camera-btn:active {
  background: #1e293b;
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
  --border-radius: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.partner-code-input:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.pair-action-btn {
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
  transition: background 0.15s ease, transform 0.15s ease;
}

.pair-action-btn:active {
  background: #1e293b;
  transform: scale(0.97);
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
  --border-radius: 10px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.partner-name-input-styled:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.error-msg {
  display: block;
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  font-weight: 600;
}

/* SCANNER BUTTONS & MODAL */
.scan-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.scan-camera-btn,
.scan-gallery-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 14px 16px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.scan-camera-btn {
  background: #0f172a;
  border: none;
  color: #ffffff;
}

.scan-gallery-btn {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #0f172a;
}

.scan-camera-btn:active,
.scan-gallery-btn:active {
  transform: scale(0.98);
}

.cam-icon,
.gallery-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.cam-btn-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.cam-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
}

.cam-sub {
  font-size: 11.5px;
  opacity: 0.85;
  margin-top: 2px;
}

.hidden-file-input {
  display: none;
}

/* WHATSAPP-STYLE MODAL STYLING */
.whatsapp-scanner-modal {
  --background: #090d16;
}

.scanner-modal-toolbar {
  --background: #090d16;
  --color: #ffffff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.scanner-header-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.scanner-header-btn {
  --color: #ffffff;
  font-size: 20px;
}

.scanner-header-btn.torch-on {
  --color: #fbbf24;
}

.scanner-modal-content {
  --background: #090d16;
}

.whatsapp-scanner-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
  padding: 12px 16px 24px;
  box-sizing: border-box;
}

.camera-viewport {
  position: relative;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  aspect-ratio: 1;
  border-radius: 24px;
  overflow: hidden;
  background: #000000;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-video-box {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
}

.scanner-video-box video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: 24px;
}

/* Viewfinder laser animation */
.viewfinder-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.viewfinder-box {
  position: relative;
  width: 220px;
  height: 220px;
}

.corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: #ffffff;
  border-style: solid;
}

.corner.tl { top: 0; left: 0; border-width: 4px 0 0 4px; border-top-left-radius: 12px; }
.corner.tr { top: 0; right: 0; border-width: 4px 4px 0 0; border-top-right-radius: 12px; }
.corner.bl { bottom: 0; left: 0; border-width: 0 0 4px 4px; border-bottom-left-radius: 12px; }
.corner.br { bottom: 0; right: 0; border-width: 0 4px 4px 0; border-bottom-right-radius: 12px; }

.laser-scanner-line {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #ffffff, #cbd5e1, #ffffff, transparent);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
  animation: laserSweep 2.2s infinite ease-in-out;
}

@keyframes laserSweep {
  0% { top: 8%; opacity: 0.8; }
  50% { top: 88%; opacity: 1; }
  100% { top: 8%; opacity: 0.8; }
}

/* Camera blocked fallback */
.camera-error-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
}

.camera-error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #ffffff;
}

.error-badge-icon {
  font-size: 38px;
  color: #f59e0b;
}

.camera-error-card h4 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
}

.camera-error-card p {
  font-size: 12px;
  color: #cbd5e1;
  margin: 0;
  line-height: 1.45;
}

.action-gallery-btn {
  margin-top: 10px;
  background: #0f172a;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 12.5px;
  font-weight: 700;
  border: none;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

/* Bottom Sheet */
.scanner-bottom-sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 14px;
}

.scanner-status-text {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  margin: 0;
  font-weight: 500;
  line-height: 1.4;
  max-width: 320px;
}

.scanner-quick-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gallery-pill-btn {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.gallery-pill-btn:active {
  background: rgba(255, 255, 255, 0.22);
  transform: scale(0.96);
}

.pill-icon {
  font-size: 18px;
  color: #ffffff;
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
  color: #0f172a;
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
