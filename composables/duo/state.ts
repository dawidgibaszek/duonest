import { ref, computed } from 'vue'
import type {
  Profile,
  Partnership,
  ShoppingItem,
  TaskItem,
  EventItem,
  NudgeItem,
  NestMilestone,
  WishlistItem,
  MovieItem,
  MealItem,
  SavingsGoal,
  SavingsContribution,
  DuoDoodle,
  DuoDoodleStroke,
  DuoToastItem
} from '~/types/duo'
import { createInitialProfile, getCleanAccentColor } from './utils'

// Podstawowe profile i stan związku
export const currentUser = ref<Profile>(createInitialProfile())
export const partnerUser = ref<Profile | null>(null)
export const partnership = ref<Partnership | null>(null)

// Sesja i autentykacja
export const authUser = ref<any>(null)
export const authSession = ref<any>(null)
export const isAuthLoading = ref(true)
export const authRestoreFailed = ref(false)
export const isStateInitialized = ref(false)
export const isLoggingOut = ref(false)

export const isAuthenticated = computed(() => {
  return Boolean(authUser.value || authSession.value)
})

export const isPaired = computed(() => {
  return Boolean(partnership.value?.id && currentUser.value.partnership_id === partnership.value.id && partnerUser.value?.id)
})

// Listy domenowe
export const shoppingItems = ref<ShoppingItem[]>([])
export const tasksList = ref<TaskItem[]>([])
export const eventsList = ref<EventItem[]>([])
export const nudgesList = ref<NudgeItem[]>([])
export const milestonesList = ref<NestMilestone[]>([])
export const wishlistItems = ref<WishlistItem[]>([])
export const moviesList = ref<MovieItem[]>([])
export const mealsList = ref<MealItem[]>([])
export const savingsGoals = ref<SavingsGoal[]>([])
export const savingsContributions = ref<SavingsContribution[]>([])

// Stan tablicy rysowania (Doodle)
export const currentDoodle = ref<DuoDoodle | null>(null)
export const isPartnerDrawing = ref(false)
export const partnerLiveStroke = ref<{ stroke: DuoDoodleStroke; timestamp: number } | null>(null)

// Stan gestów (Nudge)
export interface ActiveGestureAnimation {
  instanceId: string
  id: string
  nudge_type: string
  message?: string | null
  created_at?: string | null
  isOwn: boolean
  senderName: string
  senderAvatarUrl?: string | null
  accentColor: string
}

export const lastNudgeSentAt = ref<number | null>(null)
export const recentNudgeTimestamps = ref<number[]>([])
export const activeGestureAnimations = ref<ActiveGestureAnimation[]>([])
export const activeGestureAnimation = computed(() => {
  const list = activeGestureAnimations.value
  return list[list.length - 1] ?? null
})

// Status połączenia i obecności
export const isOnlineWithSupabase = ref(true)
export const dbSchemaStatus = ref<'checking' | 'ready' | 'missing_tables'>('ready')
export const realtimeStatus = ref<'disconnected' | 'connecting' | 'connected'>('connected')
export const isPartnerOnline = ref(false)
export const partnerLastSeenAt = ref<string | null>(null)

// Toast
export const activeToastMessage = ref<string | null>(null)
export const activeToastItem = ref<DuoToastItem | null>(null)

// Zabezpieczenia brute-force i recovery
export const loginFailures = ref(0)
export const loginLockoutUntil = ref(0)
// Wyliczenia poziomu i punktów
export const userPoints = computed(() => Number(currentUser.value?.points) || 0)
export const partnerPoints = computed(() => Number(partnerUser.value?.points) || 0)
export const nestPoints = computed(() => userPoints.value + partnerPoints.value)
export const nestLevel = computed(() => Math.floor(nestPoints.value / 100) + 1)
export const pointsToNextLevel = computed(() => 100 - (nestPoints.value % 100))
export const levelProgress = computed(() => (nestPoints.value % 100) / 100)

export const daysTogether = computed(() => {
  if (!partnership.value?.anniversary_date) return 0
  const start = new Date(partnership.value.anniversary_date).getTime()
  const now = Date.now()
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
})

export const userPointsPct = computed(() => {
  const total = nestPoints.value
  if (total === 0) return 50
  return Math.round((userPoints.value / total) * 100)
})

export const partnerPointsPct = computed(() => 100 - userPointsPct.value)

export const userCompletedTasksCount = computed(() => {
  const myId = currentUser.value?.id
  if (!myId) return 0
  return tasksList.value.filter(t => t.is_completed && t.completed_by === myId).length
})

export const partnerCompletedTasksCount = computed(() => {
  const pId = partnerUser.value?.id
  if (!pId) return 0
  return tasksList.value.filter(t => t.is_completed && t.completed_by === pId).length
})

export const currentUserAccentColor = computed(() => {
  return getCleanAccentColor(currentUser.value?.avatar_color, '#0284c7')
})

export const partnerUserAccentColor = computed(() => {
  return getCleanAccentColor(partnerUser.value?.avatar_color, '#0d9488')
})

export const getUserAccentColor = (userId?: string | null): string => {
  if (!userId) return '#0284c7'
  if (userId === currentUser.value?.id) return currentUserAccentColor.value
  if (userId === partnerUser.value?.id) return partnerUserAccentColor.value
  return '#0284c7'
}
