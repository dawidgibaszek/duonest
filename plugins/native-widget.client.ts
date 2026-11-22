import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { watch } from 'vue'
import { authSession, currentDoodle, currentUser, isAuthLoading, isLoggingOut, isPartnerDrawing, partnerLiveStroke, partnerUser, partnership } from '~/composables/duo/state'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'
import { DuoWidget, getWidgetCredential, UPLOADED_WIDGET_PUSH_KEY, type DuoWidgetSession } from '~/utils/iosWidgetAccess'

const ignore = () => {}

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  const isIos = Capacitor.getPlatform() === 'ios'
  const bridge = getFirebaseBridge()
  let active = true
  let installedSession: string | null = null
  let confirmedAccess: { key: string; credential: string; renewedAt: number } | null = null
  let accessInFlight = false
  let sessionQueue: Promise<void> = Promise.resolve()

  function androidSessionMatches(key: string | null) {
    if (isAuthLoading.value || isLoggingOut.value) return false
    const user = bridge.auth.currentUser
    const pid = partnership.value?.id
    if (!user) return key === null && !authSession.value
    if (!authSession.value?.access_token || currentUser.value.auth_user_id !== user.uid) return false
    if (key === null) return !pid && !currentUser.value.partnership_id
    return pid === currentUser.value.partnership_id && key === `${user.uid}:${pid}`
  }

  function queueSession(session: DuoWidgetSession, key: string | null) {
    sessionQueue = sessionQueue.catch(ignore).then(async () => {
      if (!isIos && !androidSessionMatches(key)) return
      if (key && (isLoggingOut.value || key !== `${bridge.auth.currentUser?.uid}:${partnership.value?.id}`)) return
      await DuoWidget.setSession(session)
      installedSession = key
      if (key) await pushDoodle()
    })
    void sessionQueue.catch(ignore)
  }

  function pushDoodle() {
    if (!installedSession || isAuthLoading.value || isLoggingOut.value ||
        installedSession !== `${bridge.auth.currentUser?.uid}:${partnership.value?.id}`) return
    const doodle = currentDoodle.value
    if (!isIos && (!androidSessionMatches(installedSession) ||
        (doodle && doodle.partnership_id !== partnership.value?.id))) return
    return DuoWidget.setDoodle({
      doodle: doodle
        ? { id: doodle.id, updated_at: doodle.updated_at, author_name: doodle.author_name, strokes: doodle.strokes }
        : null
    }).catch(ignore)
  }

  async function syncIosAccess() {
    if (!active || isAuthLoading.value || isLoggingOut.value || accessInFlight) return
    const user = bridge.auth.currentUser
    const pid = partnership.value?.id
    if (!user || currentUser.value.auth_user_id !== user.uid || !pid) return
    const key = `${user.uid}:${pid}`
    accessInFlight = true
    try {
      const credential = getWidgetCredential(user.uid)
      const { valid } = await DuoWidget.hasReadAccess({ uid: user.uid, partnershipId: pid })
      if (!valid || confirmedAccess?.key !== key || confirmedAccess.credential !== credential ||
          Date.now() - confirmedAccess.renewedAt > 12 * 60 * 60_000) {
        const result = await bridge.callApi<{ success: boolean }>('/api/widget/session', { token: credential })
        if (!result?.success || !isCurrent()) return
        confirmedAccess = { key, credential, renewedAt: Date.now() }
        queueSession({
          uid: user.uid, profileId: currentUser.value.id, partnershipId: pid,
          partnerName: partnerUser.value?.name || '', credential
        }, key)
      }
      const { token, environment } = await DuoWidget.getPushToken()
      if (!token || !isCurrent()) return
      const marker = `${key}:${environment}:${token}`
      if (localStorage.getItem(UPLOADED_WIDGET_PUSH_KEY) === marker) return
      const response = await bridge.callApi<{ success: boolean }>('/api/push/subscribe', { widgetPushToken: token, environment })
      if (response?.success && isCurrent()) localStorage.setItem(UPLOADED_WIDGET_PUSH_KEY, marker)
    } catch (error) {
      if (import.meta.dev) console.warn('[Widget] Could not register the widget', (error as { status?: number })?.status)
    } finally {
      accessInFlight = false
    }

    function isCurrent() {
      return bridge.auth.currentUser === user && partnership.value?.id === pid && !isLoggingOut.value
    }
  }

  watch(
    () => [isAuthLoading.value, isLoggingOut.value, authSession.value?.access_token, partnership.value?.id, partnerUser.value?.name, currentUser.value.auth_user_id, currentUser.value.id, isIos ? undefined : currentUser.value.partnership_id] as const,
    ([loading, loggingOut, accessToken, pid, partnerName]) => {
      if (loading || loggingOut) return
      const user = bridge.auth.currentUser
      if (!accessToken || !user || !pid || currentUser.value.auth_user_id !== user.uid) {
        confirmedAccess = null
        queueSession({}, null)
        return
      }
      const key = `${user.uid}:${pid}`
      const identity = { uid: user.uid, profileId: currentUser.value.id, partnershipId: pid, partnerName: partnerName || '' }
      if (isIos) {
        // Local drawing still works if registration is temporarily offline.
        queueSession(identity, key)
        void syncIosAccess()
      } else {
        const { apiKey, projectId } = bridge.auth.app.options
        queueSession({ ...identity, refreshToken: user.refreshToken, apiKey, projectId }, key)
      }
    },
    { immediate: true }
  )

  if (isIos) {
    // WidgetKit can deliver its token after the Home Screen widget is added.
    let polling: ReturnType<typeof setInterval> | undefined
    const monitor = (isActive: boolean) => {
      active = isActive
      clearInterval(polling)
      if (!active) return
      void syncIosAccess()
      polling = setInterval(() => { void syncIosAccess() }, 15_000)
    }
    monitor(true)
    void App.addListener('appStateChange', ({ isActive }) => monitor(isActive)).catch(ignore)
  }

  watch(currentDoodle, () => { void pushDoodle() })
  watch(partnerLiveStroke, (live) => {
    if (isIos || !activeWidgetSession()) return
    void (live ? DuoWidget.addLiveStroke({ stroke: live.stroke }) : DuoWidget.clearLiveStrokes()).catch(ignore)
  })
  watch(isPartnerDrawing, (isDrawing) => {
    if (isIos || !activeWidgetSession()) return
    void DuoWidget.setPartnerDrawing({ isDrawing }).catch(ignore)
  })

  function activeWidgetSession() {
    return installedSession && androidSessionMatches(installedSession)
  }
})
