export default defineNuxtRouteMiddleware((to) => {
  // 1. Whitelist public standalone landing pages (verified and reset-password)
  // These pages handle their own auth state and MUST NEVER be automatically redirected to /tabs/nest
  if (to.path === '/verified' || to.path === '/reset-password') {
    return
  }

  // 2. If user lands on /login with recovery / reset tokens or errors from Supabase email,
  // forward immediately to the dedicated /reset-password page preserving search and hash
  if (to.path === '/login') {
    const isRecoveryQuery = to.query.type === 'recovery' || Boolean(to.query.code) || Boolean(to.query.error)
    const isRecoveryPath = to.fullPath.includes('recovery') || to.fullPath.includes('access_token') || to.fullPath.includes('error=')
    let isRecoveryHash = false
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || ''
      const search = window.location.search || ''
      isRecoveryHash = hash.includes('type=recovery') || hash.includes('access_token') || hash.includes('error=') || search.includes('type=recovery') || search.includes('code=') || search.includes('error=')
    }

    if (isRecoveryQuery || isRecoveryPath || isRecoveryHash) {
      const searchAndHash = typeof window !== 'undefined'
        ? (window.location.search || '') + (window.location.hash || '')
        : (to.fullPath.includes('?') ? to.fullPath.substring(to.fullPath.indexOf('?')) : '')
      return navigateTo('/reset-password' + searchAndHash, { replace: true })
    }
  }

  const { isAuthenticated, isPaired, currentUser, partnership, initializeClientState } = useDuoState()
  initializeClientState()

  // 3. Unauthenticated users -> must go to /login
  if (!isAuthenticated.value) {
    if (to.path !== '/login') {
      return navigateTo('/login', { replace: true })
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
  if (to.path === '/' || to.path === '/login' || to.path === '/pairing') {
    return navigateTo('/tabs/nest', { replace: true })
  }
})
