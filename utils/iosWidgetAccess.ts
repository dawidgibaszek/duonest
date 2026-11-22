import { Capacitor, registerPlugin } from '@capacitor/core'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'
import type { DuoDoodle, DuoDoodleStroke } from '~/types/duo'

export interface DuoWidgetSession {
  uid?: string
  profileId?: string
  partnershipId?: string
  refreshToken?: string
  apiKey?: string
  projectId?: string
  partnerName?: string
  credential?: string
}

interface DuoWidgetPlugin {
  setSession(session: DuoWidgetSession): Promise<void>
  setDoodle(options: { doodle: Pick<DuoDoodle, 'id' | 'updated_at' | 'author_name' | 'strokes'> | null }): Promise<void>
  addLiveStroke(options: { stroke: DuoDoodleStroke }): Promise<void>
  clearLiveStrokes(): Promise<void>
  setPartnerDrawing(options: { isDrawing: boolean }): Promise<void>
  hasReadAccess(options: { uid: string; partnershipId: string }): Promise<{ valid: boolean }>
  getPushToken(): Promise<{ token?: string; environment?: 'production' | 'development' }>
}

export const DuoWidget = registerPlugin<DuoWidgetPlugin>('DuoWidget')
export const IOS_WIDGET_CREDENTIAL_KEY = 'duonest_widget_read_credential'
export const UPLOADED_WIDGET_PUSH_KEY = 'duonest_widget_push_token'

export function getWidgetCredential(uid: string): string {
  const stored = localStorage.getItem(IOS_WIDGET_CREDENTIAL_KEY)?.split(':')
  if (stored?.[0] === uid && stored[1]) return stored[1]
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte =>
    byte.toString(16).padStart(2, '0')).join('')
  localStorage.setItem(IOS_WIDGET_CREDENTIAL_KEY, `${uid}:${token}`)
  return token
}

export async function revokeIosWidgetAccess() {
  if (Capacitor.getPlatform() !== 'ios') return
  const bridge = getFirebaseBridge()
  const token = localStorage.getItem(IOS_WIDGET_CREDENTIAL_KEY)?.split(':')[1]
  localStorage.removeItem(IOS_WIDGET_CREDENTIAL_KEY)
  localStorage.removeItem(UPLOADED_WIDGET_PUSH_KEY)
  const clear = DuoWidget.setSession({})
  const remote = async () => {
    const { token: widgetPushToken } = await DuoWidget.getPushToken()
    await Promise.allSettled([
      token ? bridge.callApi('/api/widget/session', { token, revoke: true }) : null,
      widgetPushToken ? bridge.callApi('/api/push/unsubscribe', { widgetPushToken }) : null
    ])
  }
  await Promise.allSettled([clear, remote()])
}
