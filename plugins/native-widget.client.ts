/**
 * Home-screen widget "Wspólny rysunek" on Android (android/.../widget) and iOS
 * (ios/App/DuoNestWidget). No-op on the web.
 *
 * While the app runs, the saved doodle, the partner's live strokes and the drawing
 * status are streamed to the widget. The session lets the native side reload the
 * doodle from Firestore on its own when a silent push reports a save while the app
 * is closed, regardless of which platform the partner drew on.
 */
import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { watch } from 'vue'
import { authSession, currentDoodle, currentUser, isAuthLoading, isPartnerDrawing, partnerLiveStroke, partnerUser } from '~/composables/duo/state'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'
import type { DuoDoodle, DuoDoodleStroke } from '~/types/duo'

interface DuoWidgetSession {
  uid?: string
  profileId?: string
  partnershipId?: string
  refreshToken?: string
  apiKey?: string
  projectId?: string
  partnerName?: string
}

interface DuoWidgetPlugin {
  setSession(session: DuoWidgetSession): Promise<void>
  setDoodle(options: { doodle: Pick<DuoDoodle, 'id' | 'updated_at' | 'author_name' | 'strokes'> | null }): Promise<void>
  addLiveStroke(options: { stroke: DuoDoodleStroke }): Promise<void>
  clearLiveStrokes(): Promise<void>
  setPartnerDrawing(options: { isDrawing: boolean }): Promise<void>
  /** iOS 26+ only: the WidgetKit APNs token the widget extension received. */
  getPushToken(): Promise<{ token?: string; environment?: 'production' | 'development' }>
}

const DuoWidget = registerPlugin<DuoWidgetPlugin>('DuoWidget')
const ignore = () => {}
const UPLOADED_PUSH_TOKEN_KEY = 'duonest_widget_push_token'

/** The widget extension cannot pass App Check, so the app registers its push token. */
async function uploadWidgetPushToken() {
  const account = getFirebaseBridge().auth.currentUser
  if (isAuthLoading.value || !account || !currentUser.value.id) return
  const { token, environment } = await DuoWidget.getPushToken().catch(() => ({ token: undefined, environment: undefined }))
  if (!token) return
  const marker = `${account.uid}:${token}`
  if (localStorage.getItem(UPLOADED_PUSH_TOKEN_KEY) === marker) return
  const response = await $fetch<{ success: boolean }>('/api/push/subscribe', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await account.getIdToken()}` },
    body: { widgetPushToken: token, environment },
    timeout: 8000
  }).catch(() => null)
  if (response?.success) localStorage.setItem(UPLOADED_PUSH_TOKEN_KEY, marker)
}

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  const isIos = Capacitor.getPlatform() === 'ios'

  const pushDoodle = () => {
    const doodle = currentDoodle.value
    void DuoWidget.setDoodle({
      doodle: doodle
        ? { id: doodle.id, updated_at: doodle.updated_at, author_name: doodle.author_name, strokes: doodle.strokes }
        : null
    }).catch(ignore)
  }

  watch(
    () => [isAuthLoading.value, authSession.value?.access_token, currentUser.value.id, currentUser.value.partnership_id, partnerUser.value?.name] as const,
    ([loading, accessToken, profileId, partnershipId, partnerName]) => {
      // The widget keeps its cached doodle while the app is still restoring the session.
      if (loading) return
      const auth = getFirebaseBridge().auth
      const user = auth.currentUser
      if (!accessToken || !user || !partnershipId) {
        void DuoWidget.setSession({}).catch(ignore)
        return
      }
      const { apiKey, projectId } = auth.app.options
      void DuoWidget.setSession({
        uid: user.uid,
        profileId,
        partnershipId,
        refreshToken: user.refreshToken,
        apiKey,
        projectId,
        partnerName: partnerName || ''
      }).catch(ignore)
      pushDoodle()
      if (isIos) void uploadWidgetPushToken()
    },
    { immediate: true }
  )

  // The extension receives its token whenever the widget is added, often while the app is in the background.
  if (isIos) {
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && currentUser.value.partnership_id) void uploadWidgetPushToken()
    })
  }

  watch(currentDoodle, () => {
    if (!isAuthLoading.value && currentUser.value.partnership_id) pushDoodle()
  })

  watch(partnerLiveStroke, (live) => {
    void (live ? DuoWidget.addLiveStroke({ stroke: live.stroke }) : DuoWidget.clearLiveStrokes()).catch(ignore)
  })

  watch(isPartnerDrawing, (isDrawing) => {
    void DuoWidget.setPartnerDrawing({ isDrawing }).catch(ignore)
  })
})
