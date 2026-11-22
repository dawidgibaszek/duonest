<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dn-auth-content">
      <div class="dn-auth-page">
        <div class="dn-auth-body">
          <!-- BACK: login/register -> welcome, forgot -> login -->
          <div class="dn-auth-topbar">
            <button
              type="button"
              class="dn-auth-back"
              :aria-label="mode === 'login' || mode === 'register' ? 'Wróć do ekranu powitalnego' : 'Wróć do logowania'"
              @click="handleBack"
            >
              <ion-icon :icon="ioniconsArrowBackOutline" />
            </button>
          </div>

          <!-- HEADING + ILLUSTRATION -->
          <header class="dn-auth-heading">
            <h1 class="dn-auth-title">{{ heading.title }}</h1>
            <DuoAuthHero :tiles="heroTiles" bare />
            <p class="dn-auth-subtitle">{{ heading.subtitle }}</p>
          </header>

          <!-- FORM -->
          <form @submit.prevent="handleSubmit" class="dn-auth-form">
            <!-- NAME FIELD (ONLY REGISTER) -->
            <DuoAuthField
              v-if="mode === 'register'"
              v-model="nameInput"
              label="Twoje imię"
              placeholder="np. Jan"
              autocomplete="name"
              maxlength="40"
            />

            <!-- EMAIL FIELD -->
            <DuoAuthField
              v-model.trim="emailInput"
              label="Adres e-mail"
              type="email"
              placeholder="twoj@email.pl"
              autocomplete="email"
              inputmode="email"
              autocapitalize="off"
              spellcheck="false"
              required
            />

            <!-- PASSWORD FIELD (LOGIN & REGISTER) -->
            <DuoAuthField
              v-if="mode === 'login' || mode === 'register'"
              v-model="passwordInput"
              label="Hasło"
              :hint="mode !== 'login' ? 'min. 6 znaków' : undefined"
              type="password"
              placeholder="••••••••"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              minlength="6"
              required
            />

            <!-- FORGOT PASSWORD LINK (ONLY LOGIN) -->
            <div class="dn-auth-field-aux" v-if="mode === 'login'">
              <button
                type="button"
                class="dn-auth-link dn-auth-link--muted forgot-link"
                @click="switchMode('forgot')"
              >
                Nie pamiętasz hasła?
              </button>
            </div>

            <!-- FRIENDLY ERROR BANNER -->
            <div class="dn-auth-alert dn-auth-alert--error" v-if="errorMessage" role="alert">
              <ion-icon :icon="ioniconsAlertCircleOutline" />
              <span>{{ errorMessage }}</span>
            </div>

            <!-- SUCCESS BANNER -->
            <div class="dn-auth-alert dn-auth-alert--success" v-if="successMessage" role="status">
              <ion-icon :icon="ioniconsCheckmarkCircleOutline" />
              <span>{{ successMessage }}</span>
            </div>

            <!-- SUBMIT BUTTON -->
            <button
              type="submit"
              class="dn-auth-btn submit-btn"
              :disabled="isLoading || !isFormValid"
            >
              <ion-spinner v-if="isLoading" name="crescent"></ion-spinner>
              <span v-else>
                {{
                  mode === 'login' ? 'Zaloguj się' :
                  mode === 'register' ? 'Utwórz konto' :
                  'Wyślij link resetujący'
                }}
              </span>
            </button>
          </form>

          <!-- SOCIAL LOGIN (ONLY LOGIN / REGISTER) -->
          <template v-if="mode === 'login' || mode === 'register'">
            <div class="dn-auth-divider">lub</div>

            <div class="dn-auth-stack">
              <button
                type="button"
                class="dn-auth-btn dn-auth-btn--outline social-btn"
                :disabled="Boolean(socialLoading)"
                @click="handleSocialSignIn('google')"
              >
                <ion-spinner v-if="socialLoading === 'google'" name="crescent"></ion-spinner>
                <svg v-else class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{{ socialLoading === 'google' ? 'Łączenie z Google…' : 'Kontynuuj z Google' }}</span>
              </button>

              <button
                type="button"
                class="dn-auth-btn dn-auth-btn--outline social-btn"
                :disabled="Boolean(socialLoading)"
                @click="handleSocialSignIn('apple')"
              >
                <ion-spinner v-if="socialLoading === 'apple'" name="crescent"></ion-spinner>
                <svg v-else class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.77 1.04-1.85.93-2.92-.9.04-1.99.6-2.63 1.36-.57.65-1.07 1.74-.93 2.8.99.08 2.02-.48 2.63-1.24z"/>
                </svg>
                <span>{{ socialLoading === 'apple' ? 'Łączenie z Apple…' : 'Kontynuuj z Apple' }}</span>
              </button>
            </div>
          </template>

          <!-- FOOTER -->
          <footer class="dn-auth-footer">
            <p class="footer-line" v-if="mode === 'login'">
              Nie masz konta?
              <button type="button" class="dn-auth-link" @click="switchMode('register')">Zarejestruj się</button>
            </p>
            <p class="footer-line" v-else-if="mode === 'register'">
              Masz już konto?
              <button type="button" class="dn-auth-link" @click="switchMode('login')">Zaloguj się</button>
            </p>
          </footer>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useIonRouter } from '@ionic/vue'
import {
  heart as ioniconsHeart,
  cart as ioniconsCart,
  calendar as ioniconsCalendar,
  home as ioniconsHome,
  people as ioniconsPeople,
  key as ioniconsKey,
  mail as ioniconsMail,
  lockClosed as ioniconsLockClosed,
  film as ioniconsFilm,
  restaurant as ioniconsRestaurant,
  gift as ioniconsGift,
  wallet as ioniconsWallet
} from 'ionicons/icons'
import { useDuoState, getSupabaseClient, sanitizeEmail } from '~/composables/useDuoState'
import type { DuoAuthHeroTile } from '~/components/DuoAuthHero.vue'

import { translateAppError } from '~/utils/errorTranslator'
import { useRoute, useRouter } from 'vue-router'

definePageMeta({ alias: ['/register'] })

const route = useRoute()
const router = useRouter()
const {
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
  completePasswordReset,
  initializeClientState
} = useDuoState()

initializeClientState()

const mode = computed<'login' | 'register' | 'forgot'>(() => {
  if (route.query.forgot === '1') return 'forgot'
  return route.path === '/register' || route.query.mode === 'register' ? 'register' : 'login'
})

const ionRouter = useIonRouter()

const handleBack = () => {
  if (mode.value === 'forgot') {
    switchMode('login')
    return
  }
  // Ionic needs an explicit 'back' direction, otherwise it plays the forward (right-to-left) transition
  if (ionRouter.canGoBack()) {
    ionRouter.back()
  } else {
    ionRouter.navigate('/welcome', 'back', 'replace')
  }
}
const emailInput = ref('')
const passwordInput = ref('')
const nameInput = ref('')
const isLoading = ref(false)
const socialLoading = ref<'google' | 'apple' | null>(null)
const errorMessage = ref('')
const successMessage = ref('')

const heroTiles = computed<DuoAuthHeroTile[]>(() => {
  switch (mode.value) {
    case 'register':
      return [
        { icon: ioniconsHome, color: '#e8a33d' },
        { icon: ioniconsHeart, color: '#e5484d' },
        { icon: ioniconsPeople, color: '#7c5cff' },
        { icon: ioniconsGift, color: '#ec6aa0' },
        { icon: ioniconsWallet, color: '#2f9e44' }
      ]
    case 'forgot':
      return [
        { icon: ioniconsKey, color: '#e8a33d' },
        { icon: ioniconsMail, color: '#3b82f6' },
        { icon: ioniconsLockClosed, color: '#1c1b19' }
      ]
    default:
      return [
        { icon: ioniconsHeart, color: '#e5484d' },
        { icon: ioniconsCart, color: '#2f9e44' },
        { icon: ioniconsCalendar, color: '#3b82f6' },
        { icon: ioniconsFilm, color: '#7c5cff' },
        { icon: ioniconsRestaurant, color: '#e8a33d' }
      ]
  }
})

const heading = computed(() => {
  switch (mode.value) {
    case 'register':
      return {
        title: 'Załóż konto',
        subtitle: 'Zakupy, obowiązki i wspólne plany – w jednym miejscu dla Was dwojga.'
      }
    case 'forgot':
      return {
        title: 'Reset hasła',
        subtitle: 'Podaj e-mail przypisany do konta. Wyślemy Ci bezpieczny link do ustawienia nowego hasła.'
      }
    default:
      return {
        title: 'Witaj ponownie',
        subtitle: 'Zaloguj się, aby wrócić do Waszego wspólnego gniazdka.'
      }
  }
})

const isFormValid = computed(() => {
  const hasEmail = emailInput.value.includes('@') && emailInput.value.length > 4
  if (mode.value === 'forgot') {
    return hasEmail
  }
  const hasPass = passwordInput.value.length >= 6
  if (mode.value === 'register') {
    return hasEmail && hasPass && nameInput.value.trim().length > 0
  }
  return hasEmail && hasPass
})

const switchMode = (newMode: 'login' | 'register' | 'forgot') => {
  errorMessage.value = ''
  successMessage.value = ''
  const { recovery, mode: previousMode, forgot, ...query } = route.query
  if (newMode === 'forgot') query.forgot = '1'
  return router.replace({ path: newMode === 'register' ? '/register' : '/login', query })
}

const handleSocialSignIn = async (provider: 'google' | 'apple') => {
  if (socialLoading.value) return

  const bridge = getSupabaseClient()
  if (!bridge) {
    errorMessage.value = 'Brak połączenia z systemem logowania. Spróbuj ponownie.'
    return
  }

  socialLoading.value = provider
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { data, error } = await bridge.auth.signInWithOAuth({ provider })
    if (error) {
      errorMessage.value = translateAuthError(error)
      return
    }
    if (data?.user) await navigateTo('/', { replace: true })
  } catch (error: any) {
    errorMessage.value = translateAuthError(error)
  } finally {
    socialLoading.value = null
  }
}

const translateAuthError = (err: any): string => {
  const msg = err?.message || err?.error_description || String(err)
  if (msg.includes('Invalid login credentials') || msg.includes('Nieprawidłowe hasło')) {
    return 'Nieprawidłowy adres e-mail lub hasło. Upewnij się, że wpisujesz poprawne hasło lub wybierz „Nie pamiętasz hasła?”, aby ustawić nowe.'
  }
  if (msg.includes('User already registered') || msg.includes('już istnieje')) {
    return 'Konto z tym adresem e-mail już istnieje. Zaloguj się powyżej lub skorzystaj z „Nie pamiętasz hasła?”.'
  }
  if (msg.includes('Password should be at least 6 characters') || msg.includes('co najmniej 6')) {
    return 'Hasło musi mieć co najmniej 6 znaków.'
  }
  if (msg.includes('Nie znaleziono konta') || msg.includes('Nie znaleziono profilu')) {
    return 'Nie znaleziono konta z tym adresem e-mail. Sprawdź e-mail lub przełącz na rejestrację.'
  }
  if (msg.includes('For security purposes') || msg.includes('over_email_send_rate_limit')) {
    const secondsMatch = msg.match(/after (\d+) seconds/i)
    if (secondsMatch && secondsMatch[1]) {
      return `Zbyt częste próby. Ze względów bezpieczeństwa odczekaj jeszcze ${secondsMatch[1]} sekund przed ponownym wysłaniem.`
    }
    return 'Zbyt wiele prób w krótkim czasie. Odczekaj około minuty przed kolejną prośbą o reset hasła.'
  }
  if (msg.includes('Error sending') || msg.includes('email provider')) {
    return 'Problem z wysyłką wiadomości e-mail. Sprawdź konfigurację SMTP w Supabase lub spróbuj ponownie za chwilę.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Brak połączenia z siecią. Sprawdź swoje połączenie internetowe.'
  }
  return translateAppError(err)
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  const search = window.location.search || ''
  const urlParams = new URLSearchParams(search)

  if (urlParams.get('email')) {
    emailInput.value = sanitizeEmail(urlParams.get('email'))
  }


})

const handleSubmit = async () => {
  if (!isFormValid.value || isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (mode.value === 'login') {
      const { error } = await signInWithEmail(emailInput.value, passwordInput.value)
      if (error) {
        errorMessage.value = translateAuthError(error)
        isLoading.value = false
        return
      }

      await navigateTo('/', { replace: true })
    } else if (mode.value === 'register') {
      const { data, error } = await signUpWithEmail(
        emailInput.value,
        passwordInput.value,
        nameInput.value
      )
      if (error) {
        errorMessage.value = translateAuthError(error)
        isLoading.value = false
        return
      }

      if (data?.needsEmailVerification) {
        await navigateTo('/verify-email', { replace: true })
        return
      }

      await navigateTo('/', { replace: true })
    } else if (mode.value === 'forgot') {
      const { error } = await requestPasswordReset(emailInput.value)
      if (error) {
        errorMessage.value = translateAuthError(error)
        isLoading.value = false
        return
      }

      successMessage.value = 'Jeśli podany adres e-mail istnieje w bazie, wysłaliśmy na niego link do ustawienia nowego hasła. Sprawdź swoją skrzynkę (w tym folder SPAM).'
    }
  } catch (err: any) {
    errorMessage.value = translateAuthError(err)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.forgot-link {
  font-size: 13px;
  padding: 0;
}

.submit-btn {
  margin-top: 8px;
}

.social-btn {
  position: relative;
}

.social-icon {
  flex-shrink: 0;
}

.footer-line {
  margin: 0;
}


</style>
