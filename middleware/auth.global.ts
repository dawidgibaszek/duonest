import { Capacitor } from '@capacitor/core'
import { DUO_FEATURES, type DuoFeature } from '~/utils/duoPersonalization'

export default defineNuxtRouteMiddleware((to) => {
  // The web site hosts the download page, administration and Firebase e-mail actions.
  if (!import.meta.dev && !Capacitor.isNativePlatform()) {
    if (to.path === '/' || to.path === '/admin') return
    const emailAction = ['/verified', '/reset-password', '/auth/action'].includes(to.path)
    if (emailAction && typeof to.query.oobCode === 'string' && to.query.oobCode) return
    return navigateTo('/', { replace: true })
  }

  if (to.path === '/admin') return

  // 1. Whitelist public standalone landing pages (verified and reset-password)
  // These pages handle their own auth state and MUST NEVER be automatically redirected to /tabs/nest
  if (to.path === '/verified' || to.path === '/reset-password' || to.path === '/auth/action' || to.path === '/admin') {
    return
  }

  // 1b. Entry route renders the loading screen (pages/index.vue), which waits for the
  // session to restore and then routes to /login, /pairing or /tabs/nest itself
  if (to.path === '/') {
    return
  }

  const { isAuthenticated, needsEmailVerification, isPaired, isAuthLoading, initializeClientState } = useDuoState()
  initializeClientState()
  if (isAuthLoading.value) return navigateTo('/', { replace: true })

  // 2. Unauthenticated users -> welcome screen with separate sign-in and registration routes
  if (!isAuthenticated.value) {
    if (to.path !== '/login' && to.path !== '/register' && to.path !== '/welcome') {
      return navigateTo('/welcome', { replace: true })
    }
    return
  }

  // 3. Signed in with an unconfirmed e-mail -> blocked on /verify-email
  if (needsEmailVerification.value) {
    if (to.path !== '/verify-email') {
      return navigateTo('/verify-email', { replace: true })
    }
    return
  }

  // 4. Authenticated users without a partner -> must go to /pairing
  const hasPartner = isPaired.value
  const { onboardingStage, needsPairingOnboarding, isFeatureEnabled } = useDuoPersonalization()
  if (onboardingStage.value === 'profile' || needsPairingOnboarding.value) {
    if (to.path !== '/onboarding') return navigateTo('/onboarding', { replace: true })
    return
  }
  if (!hasPartner) {
    if (to.path !== '/pairing') {
      return navigateTo('/pairing', { replace: true })
    }
    return
  }

  // 5. Authenticated and paired users -> if visiting entry or auth routes, redirect to /tabs/nest
  if (['/welcome', '/login', '/register', '/pairing', '/verify-email', '/onboarding'].includes(to.path)) {
    return navigateTo('/tabs/nest', { replace: true })
  }
  const tab = (to.path === '/tabs/tasks' && to.query.view === 'pet' ? 'pet' : to.path.split('/')[2]) as DuoFeature
  if (DUO_FEATURES.includes(tab) && !isFeatureEnabled(tab)) {
    return navigateTo('/tabs/nest', { replace: true })
  }
})
