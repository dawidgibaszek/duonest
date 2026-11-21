import { computed } from 'vue'

// Eksport typów domenowych
export type {
  Profile,
  Partnership,
  ShoppingItem,
  TaskItem,
  EventItem,
  NudgeItem,
  NestMilestone,
  WishlistItem,
  MovieReview,
  MovieItem,
  MealIngredient,
  MealItem,
  SavingsGoal,
  SavingsContribution,
  DuoDoodleStroke,
  DuoDoodle,
  ToastType,
  DuoToastItem
} from '~/types/duo'

// Eksport narzędzi i funkcji pomocniczych
export {
  getCleanAccentColor,
  hexToRgba,
  normalizeMovieTitle,
  deduplicateMoviesList,
  inferToastMetadata,
  sanitizeEmail,
  getSupabaseConfig,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLIC_KEY,
  clearStaleSupabaseCookies,
  clearSupabaseSessionStorage,
  getCleanDbClient,
  getSupabaseClient,
  safeDb,
  normalizePairingCode,
  toRealtimeProfileSnapshot
} from './duo/utils'

// Eksport stanu reaktywnego
export {
  authUser,
  authSession,
  currentUser,
  partnerUser,
  partnership,
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
  partnerLiveStroke,
  isPartnerDrawing,
  activeDailySubTab,
  activeOrgSubTab,
  activeTasksMainTab,
  activeLeisureSubTab,
  orgTabsScrollLeft,
  isAuthLoading,
  isLoggingOut,
  isOnlineWithSupabase,
  dbSchemaStatus,
  realtimeStatus,
  isPartnerOnline,
  partnerLastSeenAt,
  activeToastMessage,
  activeToastItem,
  isPaired,
  userPoints,
  partnerPoints,
  nestPoints,
  nestLevel,
  pointsToNextLevel,
  levelProgress,
  daysTogether,
  userPointsPct,
  partnerPointsPct,
  userCompletedTasksCount,
  partnerCompletedTasksCount,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor
} from './duo/state'

// Importy podmodułów logiki biznesowej
import {
  authUser,
  authSession,
  currentUser,
  partnerUser,
  partnership,
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
  partnerLiveStroke,
  isPartnerDrawing,
  activeDailySubTab,
  activeOrgSubTab,
  activeTasksMainTab,
  activeLeisureSubTab,
  orgTabsScrollLeft,
  isAuthLoading,
  isOnlineWithSupabase,
  dbSchemaStatus,
  realtimeStatus,
  isPartnerOnline,
  partnerLastSeenAt,
  activeToastMessage,
  activeToastItem,
  isPaired,
  userPoints,
  partnerPoints,
  nestPoints,
  nestLevel,
  pointsToNextLevel,
  levelProgress,
  daysTogether,
  userPointsPct,
  partnerPointsPct,
  userCompletedTasksCount,
  partnerCompletedTasksCount,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor
} from './duo/state'

import {
  getCleanAccentColor,
  hexToRgba,
  normalizePairingCode
} from './duo/utils'

import { useRealtimeSync } from './duo/useRealtimeSync'
import { useAuthSession } from './duo/useAuthSession'
import { usePairingSecurity } from './duo/usePairingSecurity'
import { useShopping } from './duo/useShopping'
import { useTasks } from './duo/useTasks'
import { useEvents } from './duo/useEvents'
import { useNudges } from './duo/useNudges'
import { useWishlist } from './duo/useWishlist'
import { useMovies } from './duo/useMovies'
import { useMeals } from './duo/useMeals'
import { useMilestones } from './duo/useMilestones'
import { useSavings } from './duo/useSavings'

/**
 * Główny composable DuoNest agregujący wszystkie podmoduły stanu i logiki aplikacji.
 * Zachowuje 100% kompatybilności wstecznej ze wszystkimi komponentami i widokami.
 */
export const useDuoState = () => {
  // 1. Podsystem synchronizacji w czasie rzeczywistym i powiadomień
  const realtime = useRealtimeSync({
    loadPartnershipAndPartner: (pId, uId) => pairingSecurity.loadPartnershipAndPartner(pId, uId),
    clearPartnershipData: () => pairingSecurity.clearPartnershipData(),
    signOutUser: () => auth.signOutUser()
  })

  // 2. Podsystem sesji i autoryzacji
  const auth = useAuthSession({
    triggerToast: realtime.triggerToast
  })

  // 3. Podsystem parowania kont i bezpieczeństwa
  const pairingSecurity = usePairingSecurity({
    triggerToast: realtime.triggerToast,
    subscribeToPartnershipRealtime: realtime.subscribeToPartnershipRealtime,
    broadcastToPartner: realtime.broadcastToPartner,
    signOutUser: auth.signOutUser
  })

  // 4. Moduły domenowe
  const shopping = useShopping({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner
  })

  const tasks = useTasks({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner
  })

  const events = useEvents({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner
  })

  const nudges = useNudges({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner
  })

  const wishlist = useWishlist({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner
  })

  const movies = useMovies({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner
  })

  const meals = useMeals({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner
  })

  const milestones = useMilestones({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner,
    verifyAccess: pairingSecurity.verifyUserAndPartnershipAccess
  })

  const savings = useSavings({
    triggerToast: realtime.triggerToast,
    broadcastToPartner: realtime.broadcastToPartner,
    verifyAccess: pairingSecurity.verifyUserAndPartnershipAccess
  })

  const isAuthenticated = computed(() => {
    return Boolean(authUser.value || authSession.value)
  })

  // Password accounts stay blocked on /verify-email until the address is confirmed.
  // Google / Apple accounts are verified by the provider (Apple may even hide the e-mail).
  const needsEmailVerification = computed(() => {
    const user = authUser.value
    if (!user || user.email_confirmed_at) return false
    const providers: string[] | undefined = user.providers
    return !providers || providers.includes('password')
  })

  return {
    // Stan autoryzacji
    authUser,
    authSession,
    isAuthenticated,
    needsEmailVerification,
    isAuthLoading,
    signInWithEmail: auth.signInWithEmail,
    signUpWithEmail: auth.signUpWithEmail,
    signOutUser: auth.signOutUser,
    requestPasswordReset: auth.requestPasswordReset,
    completePasswordReset: auth.completePasswordReset,
    changeUserPassword: auth.changeUserPassword,
    refreshEmailVerification: auth.refreshEmailVerification,
    confirmEmailVerification: auth.confirmEmailVerification,
    resendVerificationEmail: auth.resendVerificationEmail,
    syncUserProfileWithAuth: auth.syncUserProfileWithAuth,

    // Profile i relacja
    currentUser,
    partnerUser,
    partnership,
    isPaired,
    updateMyName: pairingSecurity.updateMyName,
    updateMyProfile: pairingSecurity.updateMyProfile,
    updatePartnershipSettings: pairingSecurity.updatePartnershipSettings,
    pairWithCode: pairingSecurity.pairWithCode,
    disconnectPartnership: pairingSecurity.disconnectPartnership,
    clearPartnershipData: pairingSecurity.clearPartnershipData,
    subscribeToPairingChannel: pairingSecurity.subscribeToPairingChannel,
    checkDbPairingStatus: pairingSecurity.checkDbPairingStatus,
    verifyUserAndPartnershipAccess: pairingSecurity.verifyUserAndPartnershipAccess,
    normalizePairingCode,

    // Zakupy
    shoppingItems,
    addShoppingItem: shopping.addShoppingItem,
    toggleShoppingItem: shopping.toggleShoppingItem,
    deleteShoppingItem: shopping.deleteShoppingItem,
    clearCompletedShopping: shopping.clearCompletedShopping,
    updateShoppingItem: shopping.updateShoppingItem,

    // Zadania i Zwierzak
    tasksList,
    addTask: tasks.addTask,
    toggleTask: tasks.toggleTask,
    deleteTask: tasks.deleteTask,
    updatePet: tasks.updatePet,

    // Kalendarz
    eventsList,
    addEvent: events.addEvent,
    updateEvent: events.updateEvent,
    toggleEventCompleted: events.toggleEventCompleted,
    deleteEvent: events.deleteEvent,

    // Gesty i nastrój
    nudgesList,
    updateMood: nudges.updateMood,
    sendNudge: nudges.sendNudge,
    hasSentDailyNudge: nudges.hasSentDailyNudge,
    formattedNextNudgeTime: nudges.formattedNextNudgeTime,
    nextNudgeRemainingMs: nudges.nextNudgeRemainingMs,

    // Lista marzeń
    wishlistItems,
    addWishlistItem: wishlist.addWishlistItem,
    updateWishlistItem: wishlist.updateWishlistItem,
    deleteWishlistItem: wishlist.deleteWishlistItem,
    toggleWishlistCompleted: wishlist.toggleWishlistCompleted,
    refreshWishlist: wishlist.refreshWishlist,

    // Filmy
    moviesList,
    addMovie: movies.addMovie,
    updateMovie: movies.updateMovie,
    updateMovieProgress: movies.updateMovieProgress,
    deleteMovie: movies.deleteMovie,
    toggleMovieWatched: movies.toggleMovieWatched,
    saveMovieReview: movies.saveMovieReview,
    refreshMovies: movies.refreshMovies,

    // Posiłki
    mealsList,
    addMeal: meals.addMeal,
    updateMeal: meals.updateMeal,
    deleteMeal: meals.deleteMeal,
    deleteSavedRecipe: meals.deleteSavedRecipe,
    toggleMealCompleted: meals.toggleMealCompleted,
    addIngredientsToShopping: meals.addIngredientsToShopping,
    refreshMeals: meals.refreshMeals,

    // Kamienie milowe
    milestonesList,
    addMilestone: milestones.addMilestone,
    updateMilestone: milestones.updateMilestone,
    deleteMilestone: milestones.deleteMilestone,
    claimMilestone: milestones.claimMilestone,
    reactivateMilestone: milestones.reactivateMilestone,

    // Skarbonki
    savingsGoals,
    savingsContributions,
    addSavingsGoal: savings.addSavingsGoal,
    updateSavingsGoal: savings.updateSavingsGoal,
    deleteSavingsGoal: savings.deleteSavingsGoal,
    addSavingsContribution: savings.addSavingsContribution,
    deleteSavingsContribution: savings.deleteSavingsContribution,

    // Rysunki (Doodle)
    currentDoodle,
    isPartnerDrawing,
    partnerLiveStroke,
    saveDoodle: realtime.saveDoodle,
    clearDoodle: realtime.clearDoodle,
    broadcastLiveStroke: realtime.broadcastLiveStroke,
    broadcastDrawingStatus: realtime.broadcastDrawingStatus,

    // Synchronizacja, obecność i toast
    isOnlineWithSupabase,
    dbSchemaStatus,
    realtimeStatus,
    isPartnerOnline,
    partnerLastSeenAt,
    activeToastMessage,
    activeToastItem,
    triggerToast: realtime.triggerToast,
    dismissToast: realtime.dismissToast,
    initializeClientState: auth.initializeClientState,
    initSupabaseSync: realtime.initSupabaseSync,
    subscribeToPartnershipRealtime: realtime.subscribeToPartnershipRealtime,
    setNativeRealtimeActive: realtime.setNativeRealtimeActive,

    // Poziomy, punkty i statystyki
    nestLevel,
    nestPoints,
    pointsToNextLevel,
    levelProgress,
    daysTogether,
    currentUserAccentColor,
    partnerUserAccentColor,
    getUserAccentColor,
    getCleanAccentColor,
    hexToRgba,
    userPoints,
    partnerPoints,
    userPointsPct,
    partnerPointsPct,
    userCompletedTasksCount,
    partnerCompletedTasksCount,

    // Zakładki nawigacyjne
    activeDailySubTab,
    activeOrgSubTab,
    activeTasksMainTab,
    activeLeisureSubTab,
    orgTabsScrollLeft
  }
}
