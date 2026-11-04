export default defineNuxtRouteMiddleware((to) => {
  // 1. Whitelist public verified landing page
  if (to.path === '/verified') {
    return
  }

  // 2. Whitelist password recovery flow on /login so user is NEVER redirected to /tabs/nest
  // even if an existing session or token exists in localStorage / Supabase
  const isRecoveryQuery = to.query.type === 'recovery' || Boolean(to.query.code)
  const isRecoveryPath = to.fullPath.includes('recovery') || to.fullPath.includes('access_token')
  let isRecoveryHash = false
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || ''
    const search = window.location.search || ''
    isRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token') || search.includes('type=recovery') || search.includes('code=')
  }

  if (to.path === '/login' && (isRecoveryQuery || isRecoveryPath || isRecoveryHash)) {
    return
  }

  const { isAuthenticated, isPaired, initializeClientState } = useDuoState()
  initializeClientState()

  // 3. Unauthenticated users -> must go to /login
  if (!isAuthenticated.value) {
    if (to.path !== '/login') {
      return navigateTo('/login', { replace: true })
    }
    return
  }

  // 4. Authenticated users without a partner -> must go to /pairing
  if (!isPaired.value) {
    if (to.path !== '/pairing') {
      return navigateTo('/pairing', { replace: true })
    }
    return
  }

  // 5. Authenticated and paired users -> if visiting entry or auth routes, redirect to /tabs/nest
  if (to.path === '/' || to.path === '/login' || to.path === '/pairing') {
    return navigateTo('/tabs/nest', { replace: true })
  }
})
