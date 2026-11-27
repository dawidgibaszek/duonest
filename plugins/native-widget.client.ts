import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { watch } from 'vue'
import { authSession, currentDoodle, currentUser, isAuthLoading, isLoggingOut, isPartnerDrawing, partnerLiveStroke, partnerUser, partnership } from '~/composables/duo/state'
import { isPartnershipRealtimeSuspended } from '~/composables/duo/useRealtimeSync'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'
import { useDuoLocation } from '~/composables/useDuoLocation'
import { DuoWidget, getWidgetCredential, UPLOADED_WIDGET_PUSH_KEY, type DuoWidgetSession } from '~/utils/iosWidgetAccess'

const ignore = () => {}

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  const isIos = Capacitor.getPlatform() === 'ios'
  const { theirPosition } = useDuoLocation()
  const bridge = getFirebaseBridge()
  let active = true
  let installedSession: string | null = null
  let confirmedAccess: { key: string; credential: string; renewedAt: number } | null = null
  let accessInFlight = false
  let sessionQueue: Promise<void> = Promise.resolve()

  function sessionMatches(key: string | null) {
    if (isAuthLoading.value || isLoggingOut.value) return false
    const user = bridge.auth.currentUser
    const pid = partnership.value?.id
    if (!user) return key === null && !authSession.value
    if (!authSession.value?.access_token || currentUser.value.auth_user_id !== user.uid) return false
    if (key === null) return !pid && !currentUser.value.partnership_id
    return !!currentUser.value.id && pid === currentUser.value.partnership_id && key === `${user.uid}:${pid}`
  }

  function queueSession(session: DuoWidgetSession, key: string | null) {
    sessionQueue = sessionQueue.catch(ignore).then(async () => {
      if (!sessionMatches(key)) return
      const newSession = installedSession !== key
      await DuoWidget.setSession(session)
      installedSession = key
      if (key) {
        await pushDoodle(true)
        if (!isIos && newSession) void DuoWidget.refresh?.().catch(ignore)
      }
    })
    void sessionQueue.catch(ignore)
  }

  function pushDoodle(verifyEmpty = false) {
    if (!activeWidgetSession()) return
    const doodle = currentDoodle.value
    if (doodle && doodle.partnership_id !== partnership.value?.id) return
    return DuoWidget.setDoodle({
      doodle: doodle
        ? { id: doodle.id, updated_at: doodle.updated_at, author_name: doodle.author_name, strokes: doodle.strokes }
        : null,
      ...(!doodle && verifyEmpty ? { verifyEmpty: true } : {}),
      ...(doodle && !verifyEmpty ? { finishDrawing: true } : {})
    }).catch(ignore)
  }

  function sessionIdentity(user: NonNullable<typeof bridge.auth.currentUser>, pid: string) {
    const identity = {
      uid: user.uid, profileId: currentUser.value.id, partnershipId: pid, partnerName: partnerUser.value?.name || ''
    }
    if (isIos) return identity
    const { apiKey, projectId } = bridge.auth.app.options
    return { ...identity, refreshToken: user.refreshToken, apiKey, projectId }
  }

  async function syncWidgetAccess() {
    if (!active || isAuthLoading.value || isLoggingOut.value || accessInFlight) return
    const user = bridge.auth.currentUser
    const pid = partnership.value?.id
    if (!user || currentUser.value.auth_user_id !== user.uid || !pid) return
    const key = `${user.uid}:${pid}`
    if (!sessionMatches(key)) return
    accessInFlight = true
    try {
      const credential = getWidgetCredential(user.uid)
      const { valid } = await DuoWidget.hasReadAccess({ uid: user.uid, partnershipId: pid })
      if (!valid || confirmedAccess?.key !== key || confirmedAccess.credential !== credential ||
          Date.now() - confirmedAccess.renewedAt > 12 * 60 * 60_000) {
        const result = await bridge.callApi<{ success: boolean }>('/api/widget/session', { token: credential })
        if (!result?.success || !isCurrent()) return
        confirmedAccess = { key, credential, renewedAt: Date.now() }
        queueSession({ ...sessionIdentity(user, pid), credential }, key)
      }
      if (!isIos) return
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
      return bridge.auth.currentUser === user && sessionMatches(key)
    }
  }

  watch(
    () => [isAuthLoading.value, isLoggingOut.value, authSession.value?.access_token, partnership.value?.id, partnerUser.value?.name, currentUser.value.auth_user_id, currentUser.value.id, currentUser.value.partnership_id] as const,
    ([loading, loggingOut, accessToken, pid]) => {
      if (loading || loggingOut) return
      const user = bridge.auth.currentUser
      if (!accessToken || !user || !pid || currentUser.value.auth_user_id !== user.uid) {
        confirmedAccess = null
        queueSession({}, null)
        return
      }
      const key = `${user.uid}:${pid}`
      queueSession(sessionIdentity(user, pid), key)
      void syncWidgetAccess()
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
      void syncWidgetAccess()
      polling = setInterval(() => { void syncWidgetAccess() }, 15_000)
    }
    monitor(true)
    void App.addListener('appStateChange', ({ isActive }) => monitor(isActive)).catch(ignore)
  } else {
    void App.addListener('appStateChange', ({ isActive }) => {
      active = isActive
      if (isActive) void syncWidgetAccess()
      if (isActive && activeWidgetSession()) void DuoWidget.refresh?.().catch(ignore)
    }).catch(ignore)
  }

  watch(() => theirPosition.value?.captured_at, () => {
    if (active && activeWidgetSession()) void DuoWidget.refreshLocation().catch(ignore)
  })

  watch(currentDoodle, () => { void pushDoodle(false) })
  watch(partnerLiveStroke, (live) => {
    if (!activeWidgetSession()) return
    if (!live && isPartnershipRealtimeSuspended()) return
    void (live ? DuoWidget.addLiveStroke({ stroke: live.stroke }) : DuoWidget.clearLiveStrokes()).catch(ignore)
  })
  watch(isPartnerDrawing, (isDrawing) => {
    if (!activeWidgetSession()) return
    if (!isDrawing && isPartnershipRealtimeSuspended()) return
    void DuoWidget.setPartnerDrawing({ isDrawing }).catch(ignore)
  })

  function activeWidgetSession() {
    return installedSession && sessionMatches(installedSession)
  }
})
