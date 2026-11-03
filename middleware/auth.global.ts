export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, isPaired, initializeClientState } = useDuoState()
  initializeClientState()

  // 1. Unauthenticated users -> must go to /login
  if (!isAuthenticated.value) {
    if (to.path !== '/login') {
      return navigateTo('/login', { replace: true })
    }
    return
  }

  // 2. Authenticated users without a partner -> must go to /pairing
  if (!isPaired.value) {
    if (to.path !== '/pairing') {
      return navigateTo('/pairing', { replace: true })
    }
    return
  }

  // 3. Authenticated and paired users -> if visiting entry or auth routes, redirect to /tabs/nest
  if (to.path === '/' || to.path === '/login' || to.path === '/pairing') {
    return navigateTo('/tabs/nest', { replace: true })
  }
})
