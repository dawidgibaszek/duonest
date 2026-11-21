<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dn-auth-content">
      <div class="dn-auth-page">

        <div class="dn-auth-body">
          <div v-if="status === 'checking'" class="dn-auth-status">
            <ion-spinner name="crescent" />
          </div>

          <template v-else>
            <span class="dn-auth-eyebrow">{{ status === 'success' ? 'Konto aktywne' : 'Weryfikacja nieudana' }}</span>

            <header class="dn-auth-heading">
              <h1 class="dn-auth-title">{{ status === 'success' ? 'Adres e-mail potwierdzony!' : 'Link wygasł' }}</h1>
              <DuoAuthHero :tiles="heroTiles" bare />
              <p class="dn-auth-subtitle">{{ description }}</p>
            </header>

            <div class="dn-auth-account" v-if="verifiedEmail">
              <ion-icon :icon="ioniconsMailOutline" />
              <div class="dn-auth-account-texts">
                <span class="dn-auth-account-label">Zweryfikowany adres</span>
                <span class="dn-auth-account-value">{{ verifiedEmail }}</span>
              </div>
            </div>

            <button type="button" class="dn-auth-btn" @click="continueNow">
              <span>{{ primaryActionLabel }}</span>
              <ion-icon :icon="ioniconsArrowForwardOutline" />
            </button>

            <p class="redirect-hint" v-if="status === 'success' && !browserOnly">
              Automatyczne przekierowanie za <strong>{{ countdown }}</strong> s…
            </p>
          </template>

          <footer class="dn-auth-footer">
            <p class="dn-auth-fineprint">DuoNest · Aplikacja dla par do wspólnego domu i budowania relacji</p>
          </footer>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Capacitor } from '@capacitor/core'
import { IonPage, IonContent, IonIcon, IonSpinner } from '@ionic/vue'
import {
  checkmarkCircle as ioniconsCheckmarkCircle,
  arrowForwardOutline as ioniconsArrowForwardOutline,
  mailOutline as ioniconsMailOutline,
  mail as ioniconsMail,
  heart as ioniconsHeart,
  alertCircle as ioniconsAlertCircle,
  refreshCircle as ioniconsRefreshCircle
} from 'ionicons/icons'
import type { DuoAuthHeroTile } from '~/components/DuoAuthHero.vue'
import { useDuoState } from '~/composables/useDuoState'

const {
  confirmEmailVerification,
  isAuthenticated,
  needsEmailVerification,
  isPaired,
  currentUser,
  partnership,
  initializeClientState
} = useDuoState()

const status = ref<'checking' | 'success' | 'error'>('checking')
const browserOnly = !import.meta.dev && !Capacitor.isNativePlatform()
const verifiedEmail = ref('')
const countdown = ref(4)
let timer: ReturnType<typeof setInterval> | null = null

const heroTiles = computed<DuoAuthHeroTile[]>(() => status.value === 'error'
  ? [
      { icon: ioniconsAlertCircle, color: '#e5484d' },
      { icon: ioniconsMail, color: '#3b82f6' },
      { icon: ioniconsRefreshCircle, color: '#1c1b19' }
    ]
  : [
      { icon: ioniconsCheckmarkCircle, color: '#2f9e44' },
      { icon: ioniconsMail, color: '#3b82f6' },
      { icon: ioniconsHeart, color: '#e5484d' }
    ])

const description = computed(() => {
  if (browserOnly) {
    return status.value === 'success'
      ? 'Otwórz aplikację DuoNest na telefonie, aby kontynuować.'
      : 'Otwórz aplikację DuoNest na telefonie, aby wysłać nowy link.'
  }
  if (status.value === 'error') {
    return isAuthenticated.value
      ? 'Ten link jest nieprawidłowy, został już użyty albo wygasł. Wyślij nowy z ekranu potwierdzenia.'
      : 'Ten link jest nieprawidłowy, został już użyty albo wygasł. Zaloguj się, aby wysłać nowy.'
  }
  return isAuthenticated.value
    ? 'Twoje konto w DuoNest jest aktywne. Za chwilę przejdziesz dalej.'
    : 'Twoje konto w DuoNest jest aktywne. Zaloguj się, aby zacząć budować wspólne gniazdko.'
})

const primaryActionLabel = computed(() => {
  if (browserOnly) return 'Wróć na stronę DuoNest'
  if (!isAuthenticated.value) return 'Przejdź do logowania'
  if (status.value === 'error' && needsEmailVerification.value) return 'Wyślij nowy link'
  return 'Przejdź do DuoNest'
})

const destination = () => {
  if (browserOnly) return '/'
  if (!isAuthenticated.value) return '/login'
  if (needsEmailVerification.value) return '/verify-email'
  return (isPaired.value || currentUser.value?.partnership_id || partnership.value?.id) ? '/tabs/nest' : '/pairing'
}

const continueNow = () => {
  if (timer) clearInterval(timer)
  navigateTo(destination(), { replace: true })
}

onMounted(async () => {
  initializeClientState()
  const params = new URLSearchParams(window.location.search || '')
  const oobCode = params.get('oobCode')
  const mode = params.get('mode')

  if (!oobCode || (mode && mode !== 'verifyEmail')) {
    status.value = 'error'
    return
  }

  const { data, error } = await confirmEmailVerification(oobCode)
  if (error) {
    status.value = 'error'
    return
  }

  verifiedEmail.value = data?.email || ''
  status.value = 'success'
  window.history.replaceState(null, '', window.location.pathname)
  if (browserOnly) return
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) continueNow()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.redirect-hint {
  margin: 14px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--dn-auth-muted);
}

.redirect-hint strong {
  color: var(--dn-auth-ink);
}

.dn-auth-fineprint {
  margin: 0;
}
</style>
