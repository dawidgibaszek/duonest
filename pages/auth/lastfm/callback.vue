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
          Zalogowano jako <strong>{{ username }}</strong>. Wracamy do Gniazdka...
        </p>
      </template>

      <!-- State 3: Error -->
      <template v-else>
        <div class="icon-circle error">
          <ion-icon :icon="ioniconsAlertCircleOutline" />
        </div>
        <h3 class="status-title">Nie udało się połączyć</h3>
        <p class="status-desc error-text">{{ errorMessage }}</p>

        <button type="button" class="return-btn" @click="handleReturn">
          Wróć do ustawień
        </button>
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

const handleReturn = () => {
  navigateTo('/tabs/relationship?category=nest_settings')
}

onMounted(async () => {
  const token = route.query.token as string | undefined

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Nie otrzymano tokenu autoryzacji z Last.fm. Spróbuj ponownie lub połącz wpisując swój login ręcznie.'
    return
  }

  try {
    const client = useSupabaseClient()
    const { data: sessionData } = await client.auth.getSession()
    const accessToken = sessionData?.session?.access_token

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
      throw new Error(res?.error || 'Nie udało się połączyć konta')
    }

    username.value = res.username || ''
    status.value = 'success'

    // Refresh local music status
    await refreshSpotifyStatus(true)

    // Smooth redirect back to relationship settings
    setTimeout(() => {
      navigateTo('/tabs/relationship?category=nest_settings&music=connected')
    }, 1200)
  } catch (err: any) {
    status.value = 'error'
    errorMessage.value = err?.data?.error || err?.message || 'Wystąpił błąd podczas autoryzacji z Last.fm'
  }
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

.return-btn {
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: opacity 0.15s ease;
}

.return-btn:active {
  opacity: 0.85;
}
</style>
