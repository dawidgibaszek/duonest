import { computed } from 'vue'
import { useDuoGrammar } from './duo/useGrammar'

// Eksport narzędzi gramatycznych
export {
  useDuoGrammar,
  resolveGrammaticalGender,
  getPartnerNoun,
  getPartnerPossessive,
  getPartnerPronoun,
  conjugateVerbPast3rd,
  conjugateVerbPast2nd,
  inflectAdj,
  GENDER_OPTIONS,
  GRAMMAR_OPTIONS
} from './duo/useGrammar'
export type { GenderIdentity, GrammaticalGender } from './duo/useGrammar'

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
  isAuthLoading,
  authRestoreFailed,
  isLoggingOut,
  isOnlineWithSupabase,
  dbSchemaStatus,
  realtimeStatus,
  isPartnerOnline,
  partnerLastSeenAt,
  activeToastMessage,
  activeToastItem,
  activeGestureAnimations,
  activeGestureAnimation,
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
  isAuthLoading,
  authRestoreFailed,
  isLoggingOut,
  isOnlineWithSupabase,
  dbSchemaStatus,
  realtimeStatus,
  isPartnerOnline,
  partnerLastSeenAt,
  activeToastMessage,
  activeToastItem,
  activeGestureAnimations,
  activeGestureAnimation,
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
import { requiresVerifiedEmail, useAuthSession } from './duo/useAuthSession'
import { usePairingSecurity } from './duo/usePairingSecurity'
import { useShopping } from './duo/useShopping'
import { useTasks } from './duo/useTasks'
import { useEvents } from './duo/useEvents'
import {
  useNudges,
  playGestureAnimation,
  dismissGestureAnimation,
  consumePendingPartnerGesture
} from './duo/useNudges'
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
    restoreAccount: () => {
      if (!authUser.value) return
      if (window.location.pathname !== '/') window.location.replace('/')
      else void auth.syncUserProfileWithAuth(authUser.value)
    }
  })

  // 2. Podsystem sesji i autoryzacji
  const auth = useAuthSession({
    triggerToast: realtime.triggerToast,
    loadPartnership: (pid, profileId, serverOnly) => pairingSecurity.loadPartnershipAndPartner(pid, profileId, serverOnly),
    loadDashboard: realtime.loadSupabaseData
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

  const grammar = useDuoGrammar()

  const isAuthenticated = computed(() => {
    return Boolean(authUser.value || authSession.value)
  })

  // Password accounts stay blocked on /verify-email until the address is confirmed.
  // Google / Apple accounts are verified by the provider (Apple may even hide the e-mail).
  const needsEmailVerification = computed(() => requiresVerifiedEmail(authUser.value))

  return {
    // Stan autoryzacji
    authUser,
    authSession,
    isAuthenticated,
    needsEmailVerification,
    isAuthLoading,
    authRestoreFailed,
    isLoggingOut,
    retrySessionRestore: auth.retrySessionRestore,
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
    uploadMyAvatar: pairingSecurity.uploadMyAvatar,
    removeMyAvatar: pairingSecurity.removeMyAvatar,
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

    // Kalendarz
    eventsList,
    addEvent: events.addEvent,
    updateEvent: events.updateEvent,
    toggleEventCompleted: events.toggleEventCompleted,
    deleteEvent: events.deleteEvent,

    // Gesty i nastrój
    nudgesList,
    activeGestureAnimations,
    activeGestureAnimation,
    playGestureAnimation,
    dismissGestureAnimation,
    consumePendingPartnerGesture,
    updateMood: nudges.updateMood,
    sendNudge: nudges.sendNudge,
    isNudgeRateLimited: nudges.isNudgeRateLimited,
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
    broadcastToPartner: realtime.broadcastToPartner,

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

    // Gramatyka i formy językowe
    userGrammar: grammar.userGrammar,
    partnerGrammar: grammar.partnerGrammar,
    partnerTitle: grammar.partnerTitle,
    partnerDopelniacz: grammar.partnerDopelniacz,
    partnerCelownik: grammar.partnerCelownik,
    partnerBiernik: grammar.partnerBiernik,
    partnerNarzednik: grammar.partnerNarzednik,
    partnerMiejscownik: grammar.partnerMiejscownik,
    partnerPossessive: grammar.partnerPossessive,
    partnerPronoun: grammar.partnerPronoun,
    partnerDisplayName: grammar.partnerDisplayName,
    partnerDopelniaczName: grammar.partnerDopelniaczName,
    partnerNarzednikName: grammar.partnerNarzednikName,
    formatPartnerVerb: grammar.formatPartnerVerb,
    formatUserVerb: grammar.formatUserVerb,
    formatPartnerAdj: grammar.formatPartnerAdj,
    formatUserAdj: grammar.formatUserAdj,
    getPartnerNoun: grammar.getPartnerNoun,
    GENDER_OPTIONS: grammar.GENDER_OPTIONS,
    GRAMMAR_OPTIONS: grammar.GRAMMAR_OPTIONS
  }
}
