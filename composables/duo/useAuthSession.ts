import { getFirebaseBridge } from '../useFirebaseBridge'
import { detachNativePushOnLogout, isNativeApp } from '../usePushNotifications'
import {
  currentUser,
  partnerUser,
  partnership,
  authUser,
  authSession,
  isAuthLoading,
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
  loginLockoutUntil,
  isPaired
} from './state'
import {
  loadFromStorage,
  saveToStorage,
  clearSupabaseSessionStorage,
  sanitizeEmail,
  generateUniqueCode,
  getCleanAccentColor,
  createInitialProfile,
  deduplicateMoviesList,
  PROFILE_SELECT_FIELDS
} from './utils'
import { translateAppError } from '~/utils/errorTranslator'
import type { Profile, ShoppingItem, TaskItem, EventItem, NudgeItem, WishlistItem, MovieItem, MealItem, SavingsGoal, SavingsContribution, DuoDoodle } from '~/types/duo'

let hasAttachedAuthListener = false
// One profile sync per user at a time (getSession + onAuthStateChange both fire on start)
let profileSyncInFlight: { uid: string; promise: Promise<boolean> } | null = null
let profileSyncRetries = 0

const PUBLIC_ROUTES = ['/welcome', '/login', '/verified', '/reset-password', '/auth/action', '/']

/** Firebase has no session, but the UI still shows a cached one → send the user to /welcome. */
const leaveProtectedRoute = () => {
  if (typeof window === 'undefined') return
  if (!PUBLIC_ROUTES.includes(window.location.pathname)) {
    navigateTo('/welcome', { replace: true })
  }
}

export function useAuthSession() {
  const getDb = () => getFirebaseBridge()

  const clearAllDuoState = () => {
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

    // 1. Sesja autentykacji
    const savedAuthSession = loadFromStorage<any>('duonest_auth_session', null)
    const savedAuthUser = loadFromStorage<any>('duonest_auth_user', null)

    if (savedAuthSession && savedAuthUser) {
      authUser.value = savedAuthUser
      authSession.value = savedAuthSession
    } else {
      authUser.value = null
      authSession.value = null
    }

    // 2. Profil aktualnego użytkownika
    const savedUser = loadFromStorage<Profile | null>('duonest_current_user', null)
    if (savedUser) {
      currentUser.value = {
        ...createInitialProfile(),
        ...savedUser,
        avatar_color: getCleanAccentColor(savedUser.avatar_color, '#0284c7'),
        points: Number(savedUser.points) || 0
      }
    }

    // 3. Profil partnera i związek
    const savedPartner = loadFromStorage<Profile | null>('duonest_partner_user', null)
    if (savedPartner) {
      partnerUser.value = {
        ...createInitialProfile(),
        ...savedPartner,
        avatar_color: getCleanAccentColor(savedPartner.avatar_color, '#0d9488'),
        points: Number(savedPartner.points) || 0
      }
    }

    const savedPartnership = loadFromStorage<any>('duonest_partnership', null)
    if (savedPartnership) {
      partnership.value = savedPartnership
    }

    // 4. Listy domenowe
    shoppingItems.value = loadFromStorage<ShoppingItem[]>('duonest_shopping', [])
    tasksList.value = loadFromStorage<TaskItem[]>('duonest_tasks', [])
    eventsList.value = loadFromStorage<EventItem[]>('duonest_events', [])
    nudgesList.value = loadFromStorage<NudgeItem[]>('duonest_nudges', [])
    wishlistItems.value = loadFromStorage<WishlistItem[]>('duonest_wishlist', [])
    moviesList.value = deduplicateMoviesList(loadFromStorage<MovieItem[]>('duonest_movies', []))
    mealsList.value = loadFromStorage<MealItem[]>('duonest_meals', [])
    savingsGoals.value = loadFromStorage<SavingsGoal[]>('duonest_savings_goals', [])
    savingsContributions.value = loadFromStorage<SavingsContribution[]>('duonest_savings_contributions', [])
    currentDoodle.value = loadFromStorage<DuoDoodle | null>('duonest_active_doodle', null)
    partnerLastSeenAt.value = loadFromStorage<string | null>('duonest_partner_last_seen', null)

    // 5. Jednokrotne podpięcie listenera auth w tle
    setupAuthObserver()
  }

  const setupAuthObserver = () => {
    if (hasAttachedAuthListener) return
    hasAttachedAuthListener = true

    const bridge = getDb()
    if (!bridge) {
      isAuthLoading.value = false
      return
    }

    bridge.auth.getSession().then(({ data }: any) => {
      if (data?.session?.user) {
        authUser.value = data.session.user
        authSession.value = data.session
        saveToStorage('duonest_auth_user', data.session.user)
        saveToStorage('duonest_auth_session', data.session)
        syncUserProfileWithAuth(data.session.user)
      } else {
        // No Firebase session (signed out elsewhere, expired, cleared storage):
        // drop the cached session/profile restored from localStorage.
        const hadCachedSession = Boolean(authUser.value || authSession.value)
        authUser.value = null
        authSession.value = null
        clearSupabaseSessionStorage()
        if (hadCachedSession) {
          clearAllDuoState()
          leaveProtectedRoute()
        }
      }
      isAuthLoading.value = false
    }).catch(() => {
      isAuthLoading.value = false
    })

    bridge.auth.onAuthStateChange((event: string, session: any) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          authUser.value = session.user
          authSession.value = session
          saveToStorage('duonest_auth_user', session.user)
          saveToStorage('duonest_auth_session', session)
          // A token refresh only renews access_token – no need to re-sync the profile
          if (event === 'SIGNED_IN') syncUserProfileWithAuth(session.user)
        }
      } else if (event === 'SIGNED_OUT') {
        if (!isLoggingOut.value) {
          const hadSession = Boolean(authUser.value || authSession.value)
          authUser.value = null
          authSession.value = null
          clearAllDuoState()
          if (hadSession) leaveProtectedRoute()
        }
      }
    })
  }

  const hydrateCurrentUserFromProfile = async (profile: any, user: any) => {
    if (!profile) return
    let pairingCode = profile.pairing_code
    if (!pairingCode) {
      // Persist a code for profiles without one – otherwise the code shown
      // in the app would not exist in the database and pairing would fail.
      pairingCode = generateUniqueCode()
      const bridge = getDb()
      if (bridge && profile.id) {
        try {
          await bridge.from('profiles').update({ pairing_code: pairingCode, updated_at: new Date().toISOString() }).eq('id', profile.id)
        } catch (_) {}
      }
    }

    currentUser.value = {
      ...createInitialProfile(),
      ...profile,
      email: user?.email || profile.email || null,
      pairing_code: pairingCode,
      avatar_color: getCleanAccentColor(profile.avatar_color, '#0284c7'),
      points: Number(profile.points) || 0
    }
    saveToStorage('duonest_current_user', currentUser.value)
  }

  const syncUserProfileWithAuth = (user: any): Promise<boolean> => {
    if (!user?.id) return Promise.resolve(false)
    if (profileSyncInFlight && profileSyncInFlight.uid === user.id) return profileSyncInFlight.promise
    const promise = runProfileSync(user).finally(() => {
      if (profileSyncInFlight?.promise === promise) profileSyncInFlight = null
    })
    profileSyncInFlight = { uid: user.id, promise }
    return promise
  }

  const scheduleProfileSyncRetry = (user: any) => {
    if (typeof window === 'undefined') return
    if (profileSyncRetries >= 6) return
    profileSyncRetries++
    setTimeout(() => {
      if (authUser.value?.id === user.id) syncUserProfileWithAuth(user)
    }, Math.min(30000, 2000 * 2 ** profileSyncRetries))
  }

  const runProfileSync = async (user: any): Promise<boolean> => {
    const bridge = getDb()
    if (!user || !bridge) return false

    try {
      const userEmail = sanitizeEmail(user.email || '')

      // 1. Pobranie przez RPC get_my_profile
      try {
        const { data: rpcProfile } = await bridge.rpc('get_my_profile')
        if (rpcProfile && rpcProfile.id) {
          profileSyncRetries = 0
          await hydrateCurrentUserFromProfile(rpcProfile, user)
          return true
        }
      } catch (_) {}

      // 2. Nie zgadujemy po stronie klienta (stare kopie profili mogłyby wygrać z prawdziwym).
      //    Nowy profil powstaje TYLKO gdy serwer potwierdzi, że to konto nie ma żadnego profilu –
      //    inaczej chwilowa awaria serwera odcięłaby użytkownika od jego starych danych.
      if (typeof bridge.syncAccount === 'function') {
        const confirmed = await bridge.syncAccount(true)
        if (!confirmed) {
          scheduleProfileSyncRetry(user)
          return false
        }
        if (confirmed.profile_id) {
          const { data: again } = await bridge.rpc('get_my_profile')
          if (again?.id) {
            await hydrateCurrentUserFromProfile(again, user)
            return true
          }
          scheduleProfileSyncRetry(user)
          return false
        }
      }

      // 4. Nowy użytkownik - natychmiastowe utworzenie profilu z kodem parowania.
      //    Profil żyje pod profiles/{uid} (wymagane przez reguły bezpieczeństwa).
      const newProfileId = user.id
      const newPairingCode = generateUniqueCode()
      const newProfileData = {
        id: newProfileId,
        auth_user_id: user.id,
        email: userEmail,
        name: user.user_metadata?.name || user.displayName || (userEmail ? userEmail.split('@')[0] : 'Użytkownik'),
        avatar_color: '#0284c7',
        pairing_code: newPairingCode,
        partnership_id: null,
        current_mood: 'happy',
        mood_note: '',
        mood_updated_at: new Date().toISOString(),
        love_note: '',
        favorite_drink: '',
        favorite_treat: '',
        points: 0,
        is_email_verified: Boolean(user.email_confirmed_at || user.emailVerified),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error: insertError } = await bridge.from('profiles').insert(newProfileData)
      if (insertError) throw insertError
      // Membership record (profile id) used by the security rules
      if (typeof bridge.syncAccount === 'function') {
        await bridge.syncAccount(true)
      }
      await hydrateCurrentUserFromProfile(newProfileData, user)
      return true
    } catch (err) {
      console.warn('syncUserProfileWithAuth error:', err)
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
      authUser.value = data.user
      authSession.value = data.session
      saveToStorage('duonest_auth_user', data.user)
      saveToStorage('duonest_auth_session', data.session)

      await syncUserProfileWithAuth(data.user)
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
        authUser.value = data.user
        authSession.value = data.session
        saveToStorage('duonest_auth_user', data.user)
        saveToStorage('duonest_auth_session', data.session)
        await syncUserProfileWithAuth(data.user)
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

    try {
      // 1. Detach this device from push notifications of the account that is
      //    signing out (otherwise it keeps receiving the partner's notifications).
      await unsubscribeDevicePush()

      const bridge = getDb()
      if (bridge?.auth) {
        try {
          await bridge.auth.signOut()
        } catch (_) {}
      }

      clearSupabaseSessionStorage()
      authUser.value = null
      authSession.value = null
      clearAllDuoState()
      isStateInitialized.value = false

      if (typeof window !== 'undefined') {
        window.location.href = '/welcome'
      }
    } catch (err) {
      console.warn('Błąd podczas wylogowywania:', err)
      if (typeof window !== 'undefined') {
        window.location.href = '/welcome'
      }
    } finally {
      setTimeout(() => {
        isLoggingOut.value = false
      }, 500)
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
