<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dn-auth-content">
      <div class="dn-auth-page">
        <div class="dn-auth-body">
          <span class="dn-auth-eyebrow">Ostatni krok</span>

          <header class="dn-auth-heading">
            <h1 class="dn-auth-title">Potwierdź swój e-mail</h1>
            <DuoAuthHero :tiles="heroTiles" bare />
            <p class="dn-auth-subtitle">
              Wysłaliśmy link aktywacyjny na Twój adres. Kliknij go w wiadomości, a potem wróć tutaj — konto odblokuje się automatycznie.
            </p>
          </header>

          <div class="dn-auth-account" v-if="email">
            <ion-icon :icon="ioniconsMailOutline" />
            <div class="dn-auth-account-texts">
              <span class="dn-auth-account-label">Link wysłany na</span>
              <span class="dn-auth-account-value">{{ email }}</span>
            </div>
          </div>

          <div class="dn-auth-alert dn-auth-alert--error" v-if="errorMessage" role="alert">
            <ion-icon :icon="ioniconsAlertCircleOutline" />
            <span>{{ errorMessage }}</span>
          </div>

          <div class="dn-auth-alert dn-auth-alert--success" v-if="successMessage" role="status">
            <ion-icon :icon="ioniconsCheckmarkCircle" />
            <span>{{ successMessage }}</span>
          </div>

          <div class="dn-auth-stack">
            <button type="button" class="dn-auth-btn" :disabled="isChecking" @click="handleCheck">
              <ion-spinner v-if="isChecking" name="crescent" />
              <template v-else>
                <span>Sprawdź i kontynuuj</span>
                <ion-icon :icon="ioniconsArrowForwardOutline" />
              </template>
            </button>

            <button
              type="button"
              class="dn-auth-btn dn-auth-btn--outline"
              :disabled="isResending || resendCooldown > 0"
              @click="handleResend"
            >
              <ion-spinner v-if="isResending" name="crescent" />
              <template v-else>
                <ion-icon :icon="ioniconsSendOutline" />
                <span>{{ resendCooldown > 0 ? `Wyślij ponownie (${resendCooldown} s)` : 'Wyślij link ponownie' }}</span>
              </template>
            </button>
          </div>

          <footer class="dn-auth-footer">
            <p class="dn-auth-fineprint">
              Nie widzisz wiadomości? Sprawdź folder SPAM i Oferty.
              <br>
              <button type="button" class="dn-auth-link dn-auth-link--muted" @click="signOutUser">
                Wyloguj się i użyj innego konta
              </button>
            </p>
          </footer>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue'
import {
  mailOutline as ioniconsMailOutline,
  alertCircleOutline as ioniconsAlertCircleOutline,
  checkmarkCircle as ioniconsCheckmarkCircle,
  arrowForwardOutline as ioniconsArrowForwardOutline,
  sendOutline as ioniconsSendOutline,
  mail as ioniconsMail,
  shieldCheckmark as ioniconsShieldCheckmark,
  heart as ioniconsHeart
} from 'ionicons/icons'
import type { DuoAuthHeroTile } from '~/components/DuoAuthHero.vue'
import { useDuoState } from '~/composables/useDuoState'

const {
  authUser,
  refreshEmailVerification,
  resendVerificationEmail,
  signOutUser,
  isPaired,
  currentUser,
  partnership
} = useDuoState()

const RESEND_COOLDOWN_S = 60
const POLL_INTERVAL_MS = 5000

const heroTiles: DuoAuthHeroTile[] = [
  { icon: ioniconsMail, color: '#3b82f6' },
  { icon: ioniconsShieldCheckmark, color: '#2f9e44' },
  { icon: ioniconsHeart, color: '#e5484d' }
]

const email = computed(() => String(authUser.value?.email || ''))
const isChecking = ref(false)
const isResending = ref(false)
const resendCooldown = ref(0)
const errorMessage = ref('')
const successMessage = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null
let cooldownTimer: ReturnType<typeof setInterval> | null = null
let leaving = false

const continueIntoApp = () => {
  if (leaving) return
  leaving = true
  const destination = (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id)
    ? '/tabs/nest'
    : '/pairing'
  navigateTo(destination, { replace: true })
}

const checkSilently = async () => {
  if (leaving || document.visibilityState !== 'visible') return
  if (await refreshEmailVerification().catch(() => false)) continueIntoApp()
}

const handleCheck = async () => {
  if (isChecking.value) return
  isChecking.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    if (await refreshEmailVerification()) {
      continueIntoApp()
    } else {
      errorMessage.value = 'Adres nie jest jeszcze potwierdzony. Kliknij link w wiadomości i spróbuj ponownie.'
    }
  } catch (_) {
    errorMessage.value = 'Nie udało się sprawdzić statusu konta. Spróbuj ponownie.'
  } finally {
    isChecking.value = false
  }
}

const startCooldown = () => {
  resendCooldown.value = RESEND_COOLDOWN_S
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

const handleResend = async () => {
  if (isResending.value || resendCooldown.value > 0) return
  isResending.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const { error } = await resendVerificationEmail()
    if (error) {
      errorMessage.value = error.message
    } else {
      successMessage.value = `Wysłaliśmy nowy link na ${email.value}. Sprawdź skrzynkę (i folder SPAM).`
      startCooldown()
    }
  } finally {
    isResending.value = false
  }
}

const onVisibilityChange = () => { checkSilently() }

onMounted(() => {
  checkSilently()
  pollTimer = setInterval(checkSilently, POLL_INTERVAL_MS)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (cooldownTimer) clearInterval(cooldownTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.dn-auth-alert {
  margin-bottom: 14px;
}

.dn-auth-fineprint {
  margin: 0;
}
</style>
