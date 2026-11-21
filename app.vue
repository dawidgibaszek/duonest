<template>
  <ion-app>
    <ion-router-outlet />
    <!-- Global DuoNest Enhanced Toast with Mobile Swipe Gesture Dismissal -->
    <DuoToast />
    <!-- Post-Pairing One-Time Push Permission Prompt -->
    <DuoPushPromptModal />
    <!-- Global DuoNest Confirm Dialog Modal -->
    <DuoConfirmModal />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { useDuoState } from '~/composables/useDuoState'
import { usePushNotifications } from '~/composables/usePushNotifications'
import DuoToast from '~/components/DuoToast.vue'
import DuoPushPromptModal from '~/components/DuoPushPromptModal.vue'
import DuoConfirmModal from '~/components/DuoConfirmModal.vue'

const { authUser, currentUser, isAuthLoading, initSupabaseSync, subscribeToPartnershipRealtime, setNativeRealtimeActive } = useDuoState()
const { initPushNotifications, clearAppBadge } = usePushNotifications()
let appStateListener: PluginListenerHandle | undefined
let disposed = false

watch(
  [isAuthLoading, () => authUser.value?.id, () => currentUser.value.id, () => currentUser.value.partnership_id],
  ([loading, uid, profileId, partnershipId]) => {
    if (!loading && uid && profileId && partnershipId) subscribeToPartnershipRealtime(partnershipId)
  },
  { immediate: true }
)

onMounted(() => {
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => setNativeRealtimeActive(isActive)).then(listener => {
      if (disposed) void listener.remove()
      else appStateListener = listener
    }).catch(error => { if (import.meta.dev) console.warn('Nie udało się obserwować stanu aplikacji', error) })
  }
  initPushNotifications()
  initSupabaseSync()
  clearAppBadge()
})

onBeforeUnmount(() => {
  disposed = true
  void appStateListener?.remove()
})
</script>

<style>
/* Safe area padding for notch and modern phones */
ion-header ion-toolbar:first-child {
  padding-top: max(env(safe-area-inset-top), 4px);
}
</style>
