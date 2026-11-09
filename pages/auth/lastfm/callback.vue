<template>
  <div class="lastfm-callback-page">
    <div class="callback-card">
      <div class="logo-wrap">
        <DuoMusicLogo service="lastfm" size="large" />
      </div>

      <!-- State 1: Loading -->
      <template v-if="status === 'loading'">
        <ion-spinner name="crescent" class="status-spinner" />
        <h3 class="status-title">Łączenie z Last.fm...</h3>
        <p class="status-desc">Weryfikujemy Twoją sesję w Last.fm, za moment wrócisz do aplikacji.</p>
      </template>

      <!-- State 2: Success -->
      <template v-else-if="status === 'success'">
        <div class="icon-circle success">
          <ion-icon :icon="ioniconsCheckmark" />
        </div>
        <h3 class="status-title">Połączono pomyślnie!</h3>
        <p class="status-desc">
          Zalogowano jako <strong>{{ username }}</strong>. Wracamy do aplikacji...
        </p>

        <button type="button" class="primary-btn" @click="goToNestSettings">
          Przejdź do aplikacji
        </button>
      </template>

      <!-- State 3: Error -->
      <template v-else>
        <div class="icon-circle error">
          <ion-icon :icon="ioniconsAlertCircleOutline" />
        </div>
        <h3 class="status-title">Nie udało się połączyć</h3>
        <p class="status-desc error-text">{{ errorMessage }}</p>

        <div class="actions-row">
          <button type="button" class="retry-btn" @click="handleRetry">
            Ponów próbę
          </button>
          <button type="button" class="return-btn" @click="handleReturn">
            Wróć do ustawień
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DuoMusicLogo from '~/components/DuoMusicLogo.vue'
import { useSpotify } from '~/composables/useSpotify'

const route = useRoute()
const { refreshSpotifyStatus } = useSpotify()

const status = ref<'loading' | 'success' | 'error'>('loading')
const username = ref('')
const errorMessage = ref('')

const goToNestSettings = () => {
  if (typeof window !== 'undefined') {
    window.location.replace('/tabs/relationship?category=nest_settings&music=connected')
  } else {
    navigateTo('/tabs/relationship?category=nest_settings&music=connected')
  }
}

const handleReturn = () => {
  goToNestSettings()
}

const resolveToken = (): string => {
  if (typeof window !== 'undefined') {
    try {
      // 1. Direct from browser window.location.search (always available on URL landing)
      const searchParams = new URLSearchParams(window.location.search)
      const fromSearch = searchParams.get('token')
      if (fromSearch && fromSearch.trim()) {
        return fromSearch.trim()
      }

      // 2. Direct from full href
      const fullUrl = new URL(window.location.href)
      const fromHref = fullUrl.searchParams.get('token')
      if (fromHref && fromHref.trim()) {
        return fromHref.trim()
      }

      // 3. From hash in case of hash navigation
      if (window.location.hash.includes('token=')) {
        const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?'))
        const hashParams = new URLSearchParams(hashQuery)
        const fromHash = hashParams.get('token')
        if (fromHash && fromHash.trim()) {
          return fromHash.trim()
        }
      }
    } catch (e) {
      console.warn('[lastfm callback] Błąd odczytu window.location:', e)
    }
  }

  // 4. From Vue route query
  return String(route.query.token || '').trim()
}

const resolveAccessToken = async (): Promise<string> => {
  const client = useSupabaseClient()
  for (let i = 0; i < 6; i++) {
    const { data } = await client.auth.getSession()
    if (data?.session?.access_token) {
      return data.session.access_token
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  return ''
}

const executeExchange = async () => {
  status.value = 'loading'
  errorMessage.value = ''

  const token = resolveToken()

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Nie otrzymano tokenu autoryzacji z Last.fm. Spróbuj ponownie lub połącz wpisując swój login ręcznie.'
    return
  }

  try {
    const accessToken = await resolveAccessToken()
    if (!accessToken) {
      status.value = 'error'
      errorMessage.value = 'Brak aktywnej sesji użytkownika w aplikacji. Zaloguj się ponownie.'
      return
    }

    const res = await $fetch<any>('/api/lastfm/callback', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: { token }
    })

    if (!res?.success) {
      throw new Error(res?.error || 'Nie udało się zweryfikować konta Last.fm')
    }

    username.value = res.username || ''
    status.value = 'success'

    // Refresh music state in memory
    try {
      await refreshSpotifyStatus(true)
    } catch {}

    // Wait 1 second then redirect smoothly
    await new Promise((resolve) => setTimeout(resolve, 1000))
    goToNestSettings()
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err?.data?.error || err?.message || 'Wystąpił błąd podczas autoryzacji z Last.fm'
  }
}

const handleRetry = () => {
  executeExchange()
}

onMounted(() => {
  executeExchange()
})
</script>

<style scoped>
.lastfm-callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f8fafc;
}

.callback-card {
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 32px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

.logo-wrap {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.status-spinner {
  width: 36px;
  height: 36px;
  color: #0f172a;
  margin-bottom: 16px;
}

.icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 16px;
}

.icon-circle.success {
  background: #ecfdf5;
  color: #059669;
}

.icon-circle.error {
  background: #fef2f2;
  color: #dc2626;
}

.status-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.status-desc {
  margin: 0 0 16px 0;
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.5;
}

.error-text {
  color: #b91c1c;
}

.primary-btn {
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 10px 22px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 6px;
  transition: opacity 0.15s ease;
}

.primary-btn:active {
  opacity: 0.85;
}

.actions-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.retry-btn {
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.retry-btn:active {
  opacity: 0.85;
}

.return-btn {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.return-btn:active {
  background: #e2e8f0;
}
</style>
