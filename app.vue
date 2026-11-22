<template>
  <ion-app :class="{ 'dn-app-offline': offline }" :inert="offline || undefined">
    <DuoRequiredUpdate
      v-if="checking || requiredUpdate"
      :checking="checking && !requiredUpdate"
      :url="requiredUpdate?.url"
    />
    <template v-else>
      <ion-router-outlet />
      <DuoToast />
      <DuoPushPromptModal />
      <DuoConfirmModal />
    </template>
  </ion-app>
  <DuoOfflineScreen v-if="offline" :checking="checkingConnection" @retry="checkConnection" />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useBackButton } from '@ionic/vue'
import { App } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { useAppUpdate } from '~/composables/useAppUpdate'
import { useAppConnection } from '~/composables/useAppConnection'
import { useDuoDiagnosticsUpload } from '~/composables/useDuoDiagnostics'
import { useConfirm } from '~/composables/useConfirm'
import { useDuoState } from '~/composables/useDuoState'
import { usePushNotifications } from '~/composables/usePushNotifications'
import DuoToast from '~/components/DuoToast.vue'
import DuoPushPromptModal from '~/components/DuoPushPromptModal.vue'
import DuoConfirmModal from '~/components/DuoConfirmModal.vue'
import DuoRequiredUpdate from '~/components/DuoRequiredUpdate.vue'
import DuoOfflineScreen from '~/components/DuoOfflineScreen.vue'

const {
  authUser, currentUser, isAuthLoading, initSupabaseSync, subscribeToPartnershipRealtime,
  setNativeRealtimeActive, syncUserProfileWithAuth
} = useDuoState()
const appRuntime = import.meta.dev || Capacitor.isNativePlatform()
const { confirmState, handleCancel } = useConfirm()
const { initPushNotifications, clearAppBadge, isPostPairingPromptOpen, declinePostPairingPrompt } = usePushNotifications()
const { checking, requiredUpdate, checkForUpdate } = useAppUpdate()
const { offline, checkingConnection, checkConnection, setConnectionForeground } = useAppConnection()
const router = useRouter()
const foreground = ref(true)
useDuoDiagnosticsUpload(() => foreground.value && !offline.value && !checking.value &&
  !requiredUpdate.value && Boolean(authUser.value?.id))
let appStateListener: PluginListenerHandle | undefined
let disposed = false

if (Capacitor.getPlatform() === 'android') {
  // Dismiss custom Teleported overlays before Ionic modals (100) and router (0)
  useBackButton(105, (processNextHandler) => {
    if (confirmState.value.isOpen) {
      handleCancel()
      return
    }
    if (isPostPairingPromptOpen.value) {
      declinePostPairingPrompt()
      return
    }
    if (typeof document !== 'undefined' && document.querySelector('.duo-sheet-overlay')) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      return
    }
    processNextHandler()
  })

  // Fallback after Ionic router history: go to main Nest tab or minimize app
  useBackButton(-1, () => {
    const path = router.currentRoute.value.path
    if (path.startsWith('/tabs/') && path !== '/tabs/nest') {
      void router.replace('/tabs/nest')
      return
    }
    void App.minimizeApp()
  })
}

watch(
  [isAuthLoading, () => authUser.value?.id, () => currentUser.value.id, () => currentUser.value.partnership_id],
  ([loading, uid, profileId, partnershipId]) => {
    if (!appRuntime || loading || !uid || !profileId) return
    if (partnershipId) subscribeToPartnershipRealtime(partnershipId)
  },
  { immediate: true }
)

watch([offline, foreground], ([disconnected, active], [wasDisconnected]) => {
  if (!appRuntime) return
  setNativeRealtimeActive(active && !disconnected)
  if (wasDisconnected && !disconnected) {
    checkForUpdate()
    if (authUser.value && isAuthLoading.value) {
      void syncUserProfileWithAuth(authUser.value)
    }
    void initSupabaseSync()
  }
})

onMounted(() => {
  if (!appRuntime) return
  checkForUpdate()
  if (offline.value) setNativeRealtimeActive(false)
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => {
      foreground.value = isActive
      setConnectionForeground(isActive)
      if (isActive && !offline.value) checkForUpdate()
    }).then(listener => {
      if (disposed) void listener.remove()
      else appStateListener = listener
    }).catch(error => { if (import.meta.dev) console.warn('Nie udało się obserwować stanu aplikacji', error) })
  }
  initPushNotifications()
  if (!offline.value) void initSupabaseSync()
  clearAppBadge()
})

onBeforeUnmount(() => {
  disposed = true
  void appStateListener?.remove()
})
</script>

<style>
.dn-app-offline {
  visibility: hidden;
}

/* Safe area padding for notch and modern phones */
ion-header ion-toolbar:first-child {
  padding-top: max(env(safe-area-inset-top), 4px);
}
</style>
