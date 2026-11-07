<template>
  <ion-page>
    <ion-content :fullscreen="true" class="verified-content">
      <div class="verified-container">
        <!-- BRAND HERO -->
        <div class="verified-hero">
          <div class="logo-wrapper">
            <img src="/favicon.png" alt="DuoNest" class="verified-logo" />
          </div>
          <h1 class="brand-title">DuoNest</h1>
        </div>

        <!-- MAIN SUCCESS CARD -->
        <div class="dn-card verified-card">
          <!-- ICON BADGE -->
          <div class="celebrate-badge-wrapper">
            <div class="celebrate-circle" :class="{ 'error-state': googleAuthError }">
              <ion-icon
                :icon="googleAuthError ? ioniconsCloseCircle : ioniconsCheckmarkCircle"
                :class="googleAuthError ? 'error-icon' : 'check-icon'"
              />
            </div>
            <div v-if="!googleAuthError" class="sparkles-row">
              <span>✨</span>
              <span>🕊️</span>
              <span>✨</span>
            </div>
          </div>

          <!-- STATUS PILL -->
          <div class="status-pill-container">
            <span class="status-pill">{{ isGoogleOAuth ? (googleAuthError ? 'Logowanie nieudane' : 'Logowanie przez Google') : 'Konto Aktywne' }}</span>
          </div>

          <!-- HEADINGS -->
          <h2 class="verified-heading">{{ verifiedHeading }}</h2>
          <p class="verified-desc">{{ verifiedDescription }}</p>

          <!-- VERIFIED EMAIL BADGE -->
          <div class="email-badge" v-if="verifiedEmail">
            <ion-icon :icon="ioniconsMailOutline" class="email-badge-icon" />
            <span class="email-badge-text">{{ verifiedEmail }}</span>
          </div>

          <!-- ACTION BUTTON -->
          <div class="action-box">
            <button
              type="button"
              class="primary-btn"
              @click="handlePrimaryAction"
            >
              <span>{{ primaryActionLabel }}</span>
              <ion-icon :icon="ioniconsArrowForwardOutline" />
            </button>
          </div>

          <!-- COUNTDOWN HINT -->
          <p class="redirect-hint" v-if="!isGoogleOAuth || googleOAuthComplete">
            Automatyczne przekierowanie za <strong>{{ countdown }}</strong> s...
          </p>
        </div>

        <!-- FOOTER -->
        <div class="verified-footer">
          DuoNest - Aplikacja dla par do wspólnego domu i budowania relacji
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  IonPage,
  IonContent,
  IonIcon
} from '@ionic/vue'
import {
  checkmarkCircle as ioniconsCheckmarkCircle,
  closeCircle as ioniconsCloseCircle,
  arrowForwardOutline as ioniconsArrowForwardOutline,
  mailOutline as ioniconsMailOutline
} from 'ionicons/icons'
import { useDuoState, getSupabaseClient } from '~/composables/useDuoState'

const { verifyEmailForProfile, isPaired, currentUser, partnership, initializeClientState } = useDuoState()

const verifiedEmail = ref('')
const countdown = ref(6)
const isGoogleOAuth = ref(false)
const googleOAuthComplete = ref(false)
const googleAuthError = ref('')
let timer: any = null

const verifiedHeading = computed(() => {
  if (!isGoogleOAuth.value) return 'Adres e-mail zweryfikowany!'
  if (googleAuthError.value) return 'Nie udało się zalogować'
  return googleOAuthComplete.value ? 'Logowanie przez Google zakończone' : 'Trwa logowanie przez Google…'
})

const verifiedDescription = computed(() => {
  if (!isGoogleOAuth.value) {
    return 'Twoje konto w DuoNest zostało pomyślnie aktywowane. Możesz się już zalogować i zacząć budować wspólne gniazdko ze swoją drugą połówką.'
  }
  if (googleAuthError.value) return googleAuthError.value
  if (googleOAuthComplete.value) return 'Za chwilę przejdziesz do swojego Gniazdka lub konfiguracji parowania.'
  return 'Weryfikujemy konto Google i bezpiecznie łączymy je z profilem DuoNest.'
})

const primaryActionLabel = computed(() => {
  if (isGoogleOAuth.value && !googleAuthError.value) return 'Przejdź do DuoNest'
  return 'Przejdź do logowania'
})

const getPostAuthDestination = () => (
  isPaired.value || currentUser.value?.partnership_id || partnership.value?.id
    ? '/tabs/nest'
    : '/pairing'
)

const goToLogin = () => {
  if (timer) clearInterval(timer)
  window.location.href = '/login'
}

const handlePrimaryAction = () => {
  if (isGoogleOAuth.value && googleOAuthComplete.value) {
    window.location.replace(getPostAuthDestination())
    return
  }
  goToLogin()
}

onMounted(async () => {
  if (typeof window === 'undefined') return

  initializeClientState()
  const search = window.location.search || ''
  const hash = window.location.hash || ''
  const urlParams = new URLSearchParams(search)
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))

  const googleOAuthStartedAt = Number(sessionStorage.getItem('duonest_google_oauth_started_at'))
  sessionStorage.removeItem('duonest_google_oauth_started_at')
  isGoogleOAuth.value = urlParams.get('source') === 'google'
    || (Number.isFinite(googleOAuthStartedAt) && Date.now() - googleOAuthStartedAt < 10 * 60 * 1000)
  if (isGoogleOAuth.value) {
    const callbackError = urlParams.get('error_description')
      || urlParams.get('error')
      || hashParams.get('error_description')
      || hashParams.get('error')
    if (callbackError) {
      googleAuthError.value = 'Autoryzacja Google nie powiodła się. Wróć do logowania i spróbuj ponownie.'
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      googleAuthError.value = 'Nie udało się połączyć z systemem logowania. Spróbuj ponownie.'
      return
    }

    let authUser = null as any
    const code = urlParams.get('code')
    if (code) {
      const { data: authData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError || !authData.session?.user) {
        googleAuthError.value = 'Nie udało się potwierdzić logowania Google. Wróć do logowania i spróbuj ponownie.'
        return
      }
      authUser = authData.session.user
    } else {
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      if (!accessToken || !refreshToken) {
        googleAuthError.value = 'Link logowania Google jest nieprawidłowy lub wygasł. Wróć do logowania i spróbuj ponownie.'
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      if (sessionError) {
        googleAuthError.value = 'Nie udało się potwierdzić logowania Google. Wróć do logowania i spróbuj ponownie.'
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        googleAuthError.value = 'Sesja Google jest nieprawidłowa lub wygasła. Wróć do logowania i spróbuj ponownie.'
        return
      }
      authUser = userData.user
    }

    const providers = authUser.app_metadata?.providers || []
    if (authUser.app_metadata?.provider !== 'google' && !providers.includes('google')) {
      googleAuthError.value = 'Ta sesja nie została uwierzytelniona przez Google. Wróć do logowania i spróbuj ponownie.'
      return
    }

    const email = String(authUser.email || '').trim().toLowerCase()
    if (!email) {
      googleAuthError.value = 'Google nie zwróciło adresu e-mail. Sprawdź ustawienia dostawcy i spróbuj ponownie.'
      return
    }

    verifiedEmail.value = email
    const profileResult = await verifyEmailForProfile(email)
    if (!profileResult.success) {
      googleAuthError.value = 'Nie udało się bezpiecznie powiązać konta z profilem DuoNest. Skontaktuj się z pomocą.'
      return
    }

    googleOAuthComplete.value = true
    countdown.value = 2
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
        window.location.replace(getPostAuthDestination())
      }
    }, 1000)
    return
  }

  // 1. Check query parameter
  if (urlParams.get('email')) {
    verifiedEmail.value = urlParams.get('email')!.trim().toLowerCase()
  }

  // 2. Decode JWT from hash if present
  if (hash) {
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken) {
      try {
        const payloadBase64 = accessToken.split('.')[1]
        if (payloadBase64) {
          const decoded = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')))
          if (decoded?.email && !verifiedEmail.value) {
            verifiedEmail.value = String(decoded.email).trim().toLowerCase()
          }
        }
      } catch (_) {}
    }

    const supabase = getSupabaseClient()
    if (supabase && accessToken && refreshToken) {
      try {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      } catch (_) {}
    }
  }

  // 3. Handle PKCE code if present
  const code = urlParams.get('code')
  const supabase = getSupabaseClient()
  if (supabase && code) {
    try {
      const { data: codeData } = await supabase.auth.exchangeCodeForSession(code)
      if (codeData?.session?.user?.email && !verifiedEmail.value) {
        verifiedEmail.value = codeData.session.user.email.trim().toLowerCase()
      }
    } catch (_) {}
  }

  // 4. Check active Supabase session
  if (supabase && !verifiedEmail.value) {
    try {
      const { data: sData } = await supabase.auth.getSession()
      if (sData?.session?.user?.email) {
        verifiedEmail.value = sData.session.user.email.trim().toLowerCase()
      }
    } catch (_) {}
  }

  // 5. Update profiles table to clear unverified flag for this email
  if (verifiedEmail.value) {
    try {
      await verifyEmailForProfile(verifiedEmail.value)
    } catch (_) {}
  }

  // 6. Start countdown
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      window.location.href = '/login'
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.verified-content {
  --background: #f0f9ff;
}

.verified-container {
  max-width: 440px;
  margin: 0 auto;
  padding: 40px 20px 32px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
}

.verified-hero {
  text-align: center;
  margin-bottom: 24px;
}

.logo-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  margin-bottom: 12px;
}

.verified-logo {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  object-fit: cover;
}

.brand-title {
  font-family: 'Outfit', sans-serif;
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.5px;
}

.verified-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  padding: 32px 24px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  text-align: center;
}

.celebrate-badge-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.celebrate-circle {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: #dcfce7;
  border: 3px solid #bbf7d0;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulseSuccess 2s infinite ease-in-out;
}

.check-icon {
  font-size: 40px;
  color: #16a34a;
}

.celebrate-circle.error-state {
  background: #fef2f2;
  border-color: #fecaca;
  animation: none;
}

.error-icon {
  font-size: 40px;
  color: #dc2626;
}

.sparkles-row {
  margin-top: 8px;
  font-size: 15px;
  display: flex;
  gap: 8px;
}

@keyframes pulseSuccess {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.2);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
}

.status-pill-container {
  margin-bottom: 14px;
}

.status-pill {
  display: inline-block;
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.verified-heading {
  font-family: 'Outfit', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 10px 0;
  letter-spacing: -0.4px;
}

.verified-desc {
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
  margin: 0 0 20px 0;
}

.email-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 14px;
  margin-bottom: 24px;
  max-width: 100%;
}

.email-badge-icon {
  font-size: 16px;
  color: #0f172a;
  flex-shrink: 0;
}

.email-badge-text {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  word-break: break-all;
}

.action-box {
  margin-bottom: 16px;
}

.primary-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
  transition: all 0.2s ease;
}

.primary-btn:hover {
  background: #020617;
  transform: translateY(-1px);
}

.primary-btn:active {
  transform: translateY(0);
}

.redirect-hint {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.verified-footer {
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 24px;
  line-height: 1.5;
}
</style>

