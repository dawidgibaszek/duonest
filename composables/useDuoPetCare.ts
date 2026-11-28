import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { authUser, partnership } from '~/composables/duo/state'
import { newDocumentId } from '~/composables/duo/utils'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'
import { calculatePetCare, PET_ACTIONS, PET_LIMITS, type PetActionType, type PetCareResult, type PetCareState, type PetCareView } from '~/functions/src/petCare'

export function useDuoPetCare(active: Ref<boolean>) {
  const snapshot = shallowRef<PetCareState>()
  const now = ref(0)
  const loading = ref(false)
  const syncError = ref(false)
  const actionError = ref('')
  const busyAction = ref<PetActionType>()
  const retryRequest = shallowRef<{ kind: PetActionType; requestId: string }>()
  const stats = computed(() => snapshot.value && calculatePetCare(snapshot.value, now.value).stats)
  const scope = computed(() => authUser.value?.id && partnership.value?.id && `${authUser.value.id}/${partnership.value.id}`)
  let generation = 0
  let clock: { serverNow: number; at: number } | undefined
  let nativeListener: PluginListenerHandle | undefined
  let disposed = false

  function serverTime(at = performance.now()) {
    return clock ? clock.serverNow + at - clock.at : 0
  }

  function useSnapshot(next?: PetCareState) {
    const current = snapshot.value
    if (next && (!current || (next.revision ?? 0) > (current.revision ?? 0) ||
        ((next.revision ?? 0) === (current.revision ?? 0) && next.lastCalculatedAt > current.lastCalculatedAt))) {
      snapshot.value = next
    }
  }

  function accept(view: PetCareView) {
    const at = performance.now()
    now.value = Math.max(view.serverNow, serverTime(at))
    clock = { serverNow: now.value, at }
    useSnapshot(view.state)
    useSnapshot(partnership.value?.pet_care)
  }

  async function refresh() {
    const id = partnership.value?.id
    if (!id || !scope.value || !active.value || loading.value) return
    const session = generation
    loading.value = true
    syncError.value = false
    try {
      const view = await getFirebaseBridge().callApi<PetCareView>('/api/duo/mutate', { action: 'pet/read', id })
      if (session === generation) accept(view)
    } catch {
      if (session === generation) syncError.value = true
    } finally {
      if (session === generation) loading.value = false
    }
  }

  async function performCare(kind: PetActionType) {
    const id = partnership.value?.id
    if (!id || !scope.value || !active.value || busyAction.value) return
    const retry = retryRequest.value
    if (retry ? retry.kind !== kind : !stats.value || stats.value[PET_ACTIONS[kind].need] >= PET_LIMITS.full) return

    const session = generation
    const request = retry ?? { kind, requestId: newDocumentId('pet_') }
    busyAction.value = kind
    actionError.value = ''
    try {
      const result = await getFirebaseBridge().callApi<PetCareResult>('/api/duo/mutate', { action: 'pet/care', id, ...request })
      if (session !== generation) return
      accept(result)
      syncError.value = false
      retryRequest.value = undefined
      return result
    } catch (error) {
      if (session !== generation) return
      const status = (error as { status?: number })?.status
      retryRequest.value = !status || status >= 500 || status === 429 ? request : undefined
      actionError.value = 'Nie udało się potwierdzić opieki. Spróbuj ponownie.'
    } finally {
      if (session === generation) busyAction.value = undefined
    }
  }

  watch(scope, () => {
    generation++
    snapshot.value = undefined
    clock = undefined
    loading.value = false
    syncError.value = false
    busyAction.value = undefined
    actionError.value = ''
    retryRequest.value = undefined
  }, { flush: 'sync' })

  watch(() => partnership.value?.pet_care, next => {
    if (clock) useSnapshot(next)
  })

  function onVisible() {
    if (!document.hidden) void refresh()
  }

  onMounted(() => {
    watch([active, scope], ([shown, account], _, onCleanup) => {
      if (!shown || !account) return
      now.value = serverTime()
      void refresh()
      const timer = window.setInterval(() => { if (!document.hidden) now.value = serverTime() }, 1000)
      onCleanup(() => window.clearInterval(timer))
    }, { immediate: true })
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => { if (isActive) void refresh() }).then(handle => {
        if (disposed) void handle.remove()
        else nativeListener = handle
      }).catch(() => {})
    }
  })

  onBeforeUnmount(() => {
    generation++
    disposed = true
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onVisible)
    void nativeListener?.remove()
  })

  return { stats, loading, syncError, actionError, busyAction, retryRequest, refresh, performCare }
}
