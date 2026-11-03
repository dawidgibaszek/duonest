<template>
  <ion-app>
    <ion-router-outlet />
    <!-- Global DuoNest Enhanced Toast with Mobile Swipe Gesture Dismissal -->
    <DuoToast />
    <!-- Post-Pairing One-Time Push Permission Prompt -->
    <DuoPushPromptModal />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDuoState } from '~/composables/useDuoState'
import { usePushNotifications } from '~/composables/usePushNotifications'
import DuoToast from '~/components/DuoToast.vue'
import DuoPushPromptModal from '~/components/DuoPushPromptModal.vue'

const { initSupabaseSync } = useDuoState()
const { initPushNotifications } = usePushNotifications()

onMounted(() => {
  initSupabaseSync()
  initPushNotifications()
})
</script>

<style>
/* Safe area padding for notch and modern phones */
ion-header ion-toolbar:first-child {
  padding-top: max(env(safe-area-inset-top), 4px);
}
</style>
