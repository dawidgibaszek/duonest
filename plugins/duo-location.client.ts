import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { watch } from 'vue'
import { observeDuoLocation, stopDuoLocation, useDuoLocation } from '~/composables/useDuoLocation'

export default defineNuxtPlugin(() => {
  const { activePair, deviceKey, clock, resumeSharing } = useDuoLocation()
  watch(() => activePair.value?.pid && activePair.value.partner
    ? `${activePair.value.uid}:${activePair.value.pid}:${activePair.value.own}:${activePair.value.partner}` : '',
  (_, __, onCleanup) => {
    const stop = observeDuoLocation(activePair.value)
    if (stop) onCleanup(stop)
  }, { immediate: true })
  let previousDevice = ''
  watch(deviceKey, key => {
    if (key === undefined) return
    if (previousDevice && key !== previousDevice) void stopDuoLocation(false)
    previousDevice = key
    if (key) void resumeSharing()
  }, { immediate: true })

  const refresh = () => {
    clock.value = Date.now()
    void resumeSharing()
  }
  const tick = setInterval(() => { clock.value = Date.now() }, 20_000)
  const visibility = () => { if (!document.hidden) refresh() }
  document.addEventListener('visibilitychange', visibility)
  if (Capacitor.isNativePlatform()) void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) refresh()
  }).catch(() => {})
  if (import.meta.hot) import.meta.hot.dispose(() => {
    clearInterval(tick)
    document.removeEventListener('visibilitychange', visibility)
  })
})
