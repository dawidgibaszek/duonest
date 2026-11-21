export default defineNuxtRouteMiddleware((to) => {
  // 1. Whitelist public standalone landing pages (verified and reset-password)
  // These pages handle their own auth state and MUST NEVER be automatically redirected to /tabs/nest
  if (to.path === '/verified' || to.path === '/reset-password' || to.path === '/auth/action') {
    return
  }

  // 1b. Entry route renders the loading screen (pages/index.vue), which waits for the
  // session to restore and then routes to /login, /pairing or /tabs/nest itself
  if (to.path === '/') {
    return
  }

  const { isAuthenticated, needsEmailVerification, isPaired, currentUser, partnership, initializeClientState } = useDuoState()
  initializeClientState()

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
  const hasPartner = Boolean(isPaired.value || currentUser.value?.partnership_id || partnership.value?.id)
  if (!hasPartner) {
    if (to.path !== '/pairing') {
      return navigateTo('/pairing', { replace: true })
    }
    return
  }

  // 5. Authenticated and paired users -> if visiting entry or auth routes, redirect to /tabs/nest
  if (to.path === '/' || to.path === '/welcome' || to.path === '/login' || to.path === '/register' || to.path === '/pairing' || to.path === '/verify-email') {
    return navigateTo('/tabs/nest', { replace: true })
  }
})
