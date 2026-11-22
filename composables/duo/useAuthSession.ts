import { getFirebaseBridge } from '../useFirebaseBridge'
import { stopPartnershipRealtime } from './useRealtimeSync'
import { detachNativePushOnLogout, isNativeApp } from '../usePushNotifications'
import {
  currentUser,
  partnerUser,
  partnership,
  authUser,
  authSession,
  isAuthLoading,
  authRestoreFailed,
  isStateInitialized,
  isLoggingOut,
  shoppingItems,
  tasksList,
  eventsList,
  nudgesList,
  milestonesList,
  wishlistItems,
  moviesList,
  mealsList,
  savingsGoals,
  savingsContributions,
  currentDoodle,
  lastNudgeSentAt,
  partnerLastSeenAt,
  loginFailures,
  loginLockoutUntil
} from './state'
import {
  saveToStorage,
  clearSupabaseSessionStorage,
  sanitizeEmail,
  getCleanAccentColor,
  createInitialProfile
} from './utils'
import { revokeIosWidgetAccess } from '~/utils/iosWidgetAccess'
import { translateAppError } from '~/utils/errorTranslator'

let hasAttachedAuthListener = false
// One profile sync per user at a time (getSession + onAuthStateChange both fire on start)
let profileSyncInFlight: { uid: string; promise: Promise<boolean> } | null = null
let retryDelay = 1500
let restoreTimer: ReturnType<typeof setTimeout> | undefined
let restorableSessionConfirmed = false

export const requiresVerifiedEmail = (user: any) => Boolean(user && !user.email_confirmed_at &&
  (!user.providers || user.providers.includes('password')))


const PUBLIC_ROUTES = ['/welcome', '/login', '/register', '/verified', '/reset-password', '/auth/action', '/admin', '/']

/** Firebase has no session, but the UI still shows a cached one → send the user to /welcome. */
const leaveProtectedRoute = () => {
  if (typeof window === 'undefined') return
  if (!PUBLIC_ROUTES.includes(window.location.pathname)) {
    window.location.replace('/welcome')
  }
}

export function useAuthSession(options: {
  loadPartnership: (pid: string, profileId: string, serverOnly: boolean) => Promise<boolean>
  loadDashboard: (pid: string, serverOnly: boolean) => Promise<boolean>
  triggerToast: (message: string, opts?: { type: 'warning' }) => void
}) {
  const getDb = () => getFirebaseBridge()

  const clearAllDuoState = () => {
    stopPartnershipRealtime()
    currentUser.value = createInitialProfile()
    partnerUser.value = null
    partnership.value = null
    shoppingItems.value = []
    tasksList.value = []
    eventsList.value = []
    nudgesList.value = []
    milestonesList.value = []
    wishlistItems.value = []
    moviesList.value = []
    mealsList.value = []
    savingsGoals.value = []
    savingsContributions.value = []
    currentDoodle.value = null
    lastNudgeSentAt.value = null
    partnerLastSeenAt.value = null

    if (typeof window !== 'undefined') {
      const keys = [
        'duonest_auth_user',
        'duonest_auth_session',
        'duonest_user_pwd_hash',
        'duonest_current_user',
        'duonest_partner_user',
        'duonest_partnership',
        'duonest_shopping',
        'duonest_tasks',
        'duonest_events',
        'duonest_nudges',
        'duonest_milestones',
        'duonest_wishlist',
        'duonest_movies',
        'duonest_meals',
        'duonest_savings_goals',
        'duonest_savings_contributions',
        'duonest_active_doodle',
        'duonest_partner_last_seen'
      ]
      keys.forEach(k => {
        try { localStorage.removeItem(k) } catch (_) {}
      })
    }
  }

  const initializeClientState = () => {
    if (typeof window === 'undefined' || isStateInitialized.value) return
    isStateInitialized.value = true
    const bridge = getDb()
    if (!hasAttachedAuthListener) {
      hasAttachedAuthListener = true
      bridge.auth.onAuthStateChange((event: string, session: any) => {
        if (isLoggingOut.value) return
        if (event === 'SESSION_ERROR') {
          if (isAuthLoading.value) scheduleRestoreRetry(retrySessionRestore)
          return
        }
        acceptSession(session, event === 'SIGNED_IN')
      })
    }
  }

  const acceptSession = (session: any, syncProfile: boolean) => {
    const user = session?.user
    if (user && getDb().auth.currentUser?.uid !== user.id) return
    const oldUid = authUser.value?.id
    if (!user) {
      clearTimeout(restoreTimer)
      authUser.value = null
      authSession.value = null
      clearAllDuoState()
      clearSupabaseSessionStorage()
      restorableSessionConfirmed = true
      authRestoreFailed.value = false
      isAuthLoading.value = false
      if (oldUid && !isLoggingOut.value) leaveProtectedRoute()
      return
    }
    if (oldUid && oldUid !== user.id) clearAllDuoState()
    restorableSessionConfirmed = true
    authRestoreFailed.value = false
    authUser.value = user
    authSession.value = session
    saveToStorage('duonest_auth_user', user)
    saveToStorage('duonest_auth_session', session)

    if (requiresVerifiedEmail(user)) {
      clearTimeout(restoreTimer)
      authRestoreFailed.value = false
      isAuthLoading.value = false
      return
    }
    if (syncProfile || isAuthLoading.value || currentUser.value.auth_user_id !== user.id) {
      void syncUserProfileWithAuth(user)
    }
  }

  const scheduleRestoreRetry = (retry: () => void | Promise<void>) => {
    if (typeof window === 'undefined' || isLoggingOut.value) return
    authRestoreFailed.value = true
    clearTimeout(restoreTimer)
    restoreTimer = setTimeout(() => { void retry() }, retryDelay)
    retryDelay = Math.min(retryDelay * 2, 30000)
  }

  const retrySessionRestore = async () => {
    if (isLoggingOut.value) return
    clearTimeout(restoreTimer)
    authRestoreFailed.value = false
    if (restorableSessionConfirmed && authUser.value) {
      await syncUserProfileWithAuth(authUser.value)
      return
    }
    try {
      const { data } = await getDb().auth.getSession()
      if (!isLoggingOut.value) acceptSession(data?.session, true)
    } catch {
      if (isAuthLoading.value) scheduleRestoreRetry(retrySessionRestore)
    }
  }

  const hydrateCurrentUserFromProfile = (profile: any, user: any) => {
    if (!profile) return
    currentUser.value = {
      ...createInitialProfile(),
      ...profile,
      email: user?.email || profile.email || null,
      pairing_code: profile.pairing_code || '',
      avatar_color: getCleanAccentColor(profile.avatar_color, '#0284c7'),
      points: Number(profile.points) || 0
    }
    saveToStorage('duonest_current_user', currentUser.value)
  }

  const syncUserProfileWithAuth = (user: any): Promise<boolean> => {
    if (!user?.id || requiresVerifiedEmail(user) || isLoggingOut.value) return Promise.resolve(false)
    if (profileSyncInFlight?.uid === user.id) return profileSyncInFlight.promise
    clearTimeout(restoreTimer)
    isAuthLoading.value = true
    const promise = runProfileSync(user).finally(() => {
      if (profileSyncInFlight?.promise === promise) profileSyncInFlight = null
    })
    profileSyncInFlight = { uid: user.id, promise }
    return promise
  }

  const runProfileSync = async (user: any): Promise<boolean> => {
    const bridge = getDb()
    const firebaseUser = bridge.auth.currentUser
    const stillSignedIn = () => !isLoggingOut.value && authUser.value?.id === user.id &&
      firebaseUser?.uid === user.id && bridge.auth.currentUser === firebaseUser
    try {
      const member = await bridge.syncAccount(true)
      if (!stillSignedIn()) return false
      if (!member?.profile_id) throw new Error('Missing account profile')
      const { data: profile, error } = await bridge.from('profiles', true).select('*').eq('id', member.profile_id).maybeSingle()
      if (!stillSignedIn()) return false
      if (error || profile?.auth_user_id !== user.id || !profile.pairing_code ||
          (profile.partnership_id || null) !== member.partnership_id) throw new Error('Profile membership is not ready')

      if (partnership.value && partnership.value.id !== member.partnership_id) clearAllDuoState()
      hydrateCurrentUserFromProfile(profile, user)
      if (member.partnership_id) {
        if (!await options.loadPartnership(member.partnership_id, profile.id, true) ||
            !await options.loadDashboard(member.partnership_id, true)) throw new Error('Partnership data is not ready')
      }
      if (!stillSignedIn()) return false
      if (currentUser.value.partnership_id !== member.partnership_id) throw new Error('Membership changed during loading')
      retryDelay = 1500
      authRestoreFailed.value = false
      isAuthLoading.value = false
      return true
    } catch {
      if (stillSignedIn()) scheduleRestoreRetry(async () => { await syncUserProfileWithAuth(user) })
      return false
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const bridge = getDb()
    const cleanEmail = sanitizeEmail(email)

    if (!bridge) return { data: null, error: new Error('Brak połączenia z systemem') }
    if (!cleanEmail) return { data: null, error: new Error('Wprowadź adres e-mail') }

    if (loginLockoutUntil.value > Date.now()) {
      const waitSec = Math.ceil((loginLockoutUntil.value - Date.now()) / 1000)
      return { data: null, error: new Error(`Zbyt wiele nieudanych prób logowania. Odczekaj ${waitSec} s przed kolejną próbą.`) }
    }

    try {
      const result = await bridge.auth.signInWithPassword({ email: cleanEmail, password })

      const { data, error } = result
      if (error || !data?.session || !data?.user) {
        loginFailures.value++
        if (loginFailures.value >= 5) loginLockoutUntil.value = Date.now() + 30000
        const friendlyMessage = translateAppError(error || 'Nieprawidłowy login lub hasło')
        return { data: null, error: new Error(friendlyMessage) }
      }

      loginFailures.value = 0
      loginLockoutUntil.value = 0
      acceptSession(data.session, true)
      return { data: { user: data.user, session: data.session }, error: null }
    } catch (err: any) {
      const friendlyMessage = translateAppError(err)
      return { data: null, error: new Error(friendlyMessage) }
    }
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const bridge = getDb()
    if (!bridge) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = sanitizeEmail(email)
    const cleanName = (name || '').trim() || 'Użytkownik'

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Wprowadź prawidłowy adres e-mail.') }
    }
    if (password.length < 6) {
      return { data: null, error: new Error('Hasło musi mieć co najmniej 6 znaków.') }
    }

    try {
      const { data, error } = await bridge.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: cleanName }
        }
      })

      if (error) {
        return { data: null, error: new Error(translateAppError(error)) }
      }

      if (data?.session && data?.user) {
        acceptSession(data.session, true)
      }

      return {
        data: {
          needsEmailVerification: !data?.user?.email_confirmed_at,
          email: cleanEmail,
          session: data?.session,
          user: data?.user
        },
        error: null
      }
    } catch (err: any) {
      return { data: null, error: new Error(translateAppError(err)) }
    }
  }

  const unsubscribeDevicePush = async () => {
    if (typeof window === 'undefined') return
    if (isNativeApp()) {
      await detachNativePushOnLogout()
      return
    }
    if (!('serviceWorker' in navigator)) return
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.getRegistration(),
        new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 2000))
      ])
      const sub = await reg?.pushManager?.getSubscription()
      if (!sub) return
      const token = await getDb()?.auth?.currentUser?.getIdToken?.().catch(() => null)
      if (token) {
        await $fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: { endpoint: sub.endpoint },
          timeout: 4000
        }).catch(() => {})
      }
      await sub.unsubscribe().catch(() => {})
    } catch (_) {}
  }

  const signOutUser = async () => {
    if (isLoggingOut.value) return
    isLoggingOut.value = true
    clearTimeout(restoreTimer)
    let pushTimeout: ReturnType<typeof setTimeout> | undefined
    try {
      // Network cleanup must not prevent the local Firebase session from signing out.
      await Promise.race([
        Promise.allSettled([unsubscribeDevicePush(), revokeIosWidgetAccess()]),
        new Promise<void>(resolve => { pushTimeout = setTimeout(resolve, 2500) })
      ])
      const bridge = getDb()
      const result = await bridge.auth.signOut()
      if (result?.error && bridge.auth.currentUser) throw result.error

      profileSyncInFlight = null
      acceptSession(null, false)
      if (typeof window !== 'undefined' && window.location.pathname !== '/welcome') {
        window.location.replace('/welcome')
      }
    } catch {
      options.triggerToast('Nie udało się wylogować. Spróbuj ponownie.', { type: 'warning' })
    } finally {
      clearTimeout(pushTimeout)
      isLoggingOut.value = false
      if (isAuthLoading.value) scheduleRestoreRetry(retrySessionRestore)
    }
  }

  const requestPasswordReset = async (email: string) => {
    const bridge = getDb()
    if (!bridge) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) return { data: null, error: new Error('Wprowadź adres e-mail.') }

    try {
      const { error } = await bridge.auth.resetPasswordForEmail(cleanEmail)
      if (error) {
        return { data: null, error: new Error(translateAppError(error)) }
      }
      return { data: { success: true }, error: null }
    } catch (err) {
      return { data: null, error: new Error(translateAppError(err)) }
    }
  }

  /**
   * Sets a new password.
   * - With `oobCode` (Firebase reset link): confirms the reset, then signs in.
   * - Without it: changes the password of the signed-in user.
   */
  const completePasswordReset = async (password: string, email?: string, _accessToken?: string, oobCode?: string) => {
    const bridge = getDb()
    if (!bridge) return { data: null, error: new Error('Brak połączenia z systemem') }
    try {
      if (oobCode) {
        const { error: resetError } = await bridge.auth.confirmPasswordReset(oobCode, password)
        if (resetError) {
          return { data: null, error: new Error(translateAppError(resetError)) }
        }
        const cleanEmail = sanitizeEmail(email || '')
        if (cleanEmail) {
          try {
            await bridge.auth.signInWithPassword({ email: cleanEmail, password })
          } catch (_) {}
        }
        return { data: { success: true }, error: null }
      }

      const { error } = await bridge.auth.updateUser({ password })
      if (error) {
        return { data: null, error: new Error(translateAppError(error)) }
      }
      return { data: { success: true }, error: null }
    } catch (err) {
      return { data: null, error: new Error(translateAppError(err)) }
    }
  }

  const changeUserPassword = async (newPassword: string) => {
    return completePasswordReset(newPassword)
  }

  const applyAuthUser = (user: any) => {
    if (!user) return
    authUser.value = user
    saveToStorage('duonest_auth_user', user)
    if (authSession.value) {
      authSession.value = { ...authSession.value, user }
      saveToStorage('duonest_auth_session', authSession.value)
    }
  }

  /** Re-reads the Firebase user; returns true once the e-mail address is verified. */
  const refreshEmailVerification = async (): Promise<boolean> => {
    const bridge = getDb()
    if (!bridge?.auth?.reloadUser) return false
    const { data, error } = await bridge.auth.reloadUser()
    if (error || !data?.user) return false
    applyAuthUser(data.user)
    if (data.user.email_confirmed_at && currentUser.value.auth_user_id !== data.user.id) {
      void syncUserProfileWithAuth(data.user)
    }
    return Boolean(data.user.email_confirmed_at)
  }

  /** Applies the oobCode from a verification e-mail (mode=verifyEmail). */
  const confirmEmailVerification = async (oobCode: string) => {
    const bridge = getDb()
    if (!bridge) return { data: null, error: new Error('Brak połączenia z systemem') }
    const { data, error } = await bridge.auth.applyEmailVerificationCode(oobCode)
    if (error) return { data: null, error: new Error(translateAppError(error)) }
    // Same browser as the session → refresh it so the gate opens immediately
    try { await bridge.auth.authStateReady?.() } catch (_) {}
    if (bridge.auth.currentUser) await refreshEmailVerification().catch(() => false)
    return { data: { email: sanitizeEmail(data?.email || '') }, error: null }
  }

  const resendVerificationEmail = async () => {
    const bridge = getDb()
    if (!bridge) return { data: null, error: new Error('Brak połączenia z systemem') }
    try {
      const { error } = await bridge.auth.sendEmailVerification()
      if (error) return { data: null, error: new Error(translateAppError(error)) }
      return { data: { success: true }, error: null }
    } catch (err) {
      return { data: null, error: new Error(translateAppError(err)) }
    }
  }

  return {
    initializeClientState,
    retrySessionRestore,
    syncUserProfileWithAuth,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    requestPasswordReset,
    completePasswordReset,
    changeUserPassword,
    refreshEmailVerification,
    confirmEmailVerification,
    resendVerificationEmail,
    clearAllDuoState
  }
}
