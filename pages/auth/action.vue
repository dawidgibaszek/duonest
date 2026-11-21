<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dn-auth-content">
      <div class="dn-auth-page">
        <div class="dn-auth-body">
          <div class="dn-auth-status">
            <ion-spinner name="crescent" />
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
/**
 * Firebase Auth action handler (callbackUri set by email-templates/push-templates.mjs).
 * Links from e-mails look like /auth/action?mode=<mode>&oobCode=<code>&apiKey=…
 */
import { onMounted } from 'vue'
import { IonPage, IonContent, IonSpinner } from '@ionic/vue'

const ROUTES: Record<string, string> = {
  resetPassword: '/reset-password',
  verifyEmail: '/verified'
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search || '')
  const mode = params.get('mode') || ''
  const oobCode = params.get('oobCode') || ''
  const target = ROUTES[mode]
  // Full replace: an Ionic router transition started during the initial
  // navigation is silently dropped.
  if (!target || !oobCode) {
    window.location.replace('/')
    return
  }
  window.location.replace(`${target}?${new URLSearchParams({ mode, oobCode })}`)
})
</script>
