import { initializeDuoAnalytics, trackDuoScreen } from '~/composables/useDuoAnalytics'

const screens: Record<string, string> = {
  '/welcome': 'welcome', '/login': 'login', '/register': 'register', '/verify-email': 'verify_email',
  '/pairing': 'pairing', '/tabs/nest': 'nest', '/tabs/shopping': 'shopping', '/tabs/tasks': 'tasks',
  '/tabs/meals': 'meals', '/tabs/savings': 'savings', '/tabs/calendar': 'calendar',
  '/tabs/movies': 'movies', '/tabs/wishlist': 'wishlist', '/tabs/relationship': 'relationship'
}

export default defineNuxtPlugin(() => {
  void initializeDuoAnalytics()
  const router = useRouter()
  const report = (path: string) => {
    if (screens[path]) trackDuoScreen(screens[path])
  }
  router.afterEach((to, _from, failure) => { if (!failure) report(to.path) })
  report(router.currentRoute.value.path)
})
