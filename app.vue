<template>
  <ion-app>
    <ion-router-outlet />
    <!-- Global DuoNest Toast Notification -->
    <ion-toast
      :is-open="!!activeToastMessage"
      :message="activeToastMessage || ''"
      :duration="3000"
      position="top"
      color="primary"
      @did-dismiss="activeToastMessage = null"
    />
  </ion-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useDuoState } from '~/composables/useDuoState'

const { activeToastMessage, initSupabaseSync } = useDuoState()

onMounted(() => {
  initSupabaseSync()
})
</script>

<style>
/* Safe area padding for notch and modern phones */
ion-header ion-toolbar:first-child {
  padding-top: max(env(safe-area-inset-top), 4px);
}
</style>
