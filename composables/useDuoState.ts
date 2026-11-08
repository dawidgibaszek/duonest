import { ref, computed, watch, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string | null
  name: string
  avatar_url?: string | null
  avatar_color?: string | null
  pairing_code: string
  partnership_id?: string | null
  current_mood?: string | null
  mood_note?: string | null
  mood_updated_at?: string | null
  love_note?: string | null
  favorite_drink?: string | null
  favorite_treat?: string | null
  points?: number
  last_seen_at?: string | null
  updated_at?: string | null
}

const PROFILE_SELECT_FIELDS = 'id, name, avatar_url, avatar_color, partnership_id, current_mood, mood_note, mood_updated_at, love_note, favorite_drink, favorite_treat, points, last_seen_at, created_at, updated_at'

export interface Partnership {
  id: string
  partner1_id: string
  partner2_id: string
  nest_name: string
  nest_level: number
  anniversary_date?: string | null
  pet_id?: string
  pet_name?: string
  pet_xp?: number
  created_at: string
}

export interface ShoppingItem {
  id: string
  partnership_id: string
  title: string
  category: string
  quantity?: string | null
  is_completed: boolean
  added_by?: string | null
  completed_by?: string | null
  created_at: string
}

export interface TaskItem {
  id: string
  partnership_id: string
  title: string
  description?: string | null
  assigned_to?: string | null // null = Wspólne, or user.id
  due_date?: string | null
  is_recurring: boolean
  recurrence_interval?: string | null // 'none' | 'daily' | 'weekly' | 'monthly'
  is_completed: boolean
  completed_at?: string | null
  points: number
  points_awarded?: number
  created_by?: string | null
  completed_by?: string | null
  created_at: string
}

export interface EventItem {
  id: string
  partnership_id: string
  title: string
  description?: string | null
  location?: string | null
  start_time: string
  end_time?: string | null
  category: 'date' | 'trip' | 'home' | 'anniversary' | 'work' | 'other'
  is_completed?: boolean
  completed_at?: string | null
  completed_by?: string | null
  points_awarded?: number
  is_surprise?: boolean
  planner_name?: string | null
  created_by?: string | null
  created_at: string
}

export interface NudgeItem {
  id: string
  partnership_id: string
  sender_id: string
  receiver_id: string
  nudge_type: string
  message?: string | null
  created_at: string
}

export interface NestMilestone {
  id: string
  partnership_id?: string
  title: string
  description?: string
  target_points: number
  assigned_to?: string | null
  is_completed: boolean
  completed_at?: string | null
  created_by?: string | null
  created_at: string
}

export interface WishlistItem {
  id: string
  partnership_id: string
  created_by: string
  for_user_id: string | null // null = Wspólne marzenie, lub user.id
  title: string
  url?: string | null
  image_url?: string | null
  price?: string | null
  currency?: string | null
  site_name?: string | null
  note?: string | null
  is_visible_to_partner: boolean // jeśli false, partner nie widzi (pomysł na prezent niespodziankę)
  is_completed: boolean
  completed_at?: string | null
  created_at: string
}

export interface MovieReview {
  user_id: string
  author_name: string
  rating: number // 1 - 10
  comment: string
  updated_at: string
}

export interface MovieItem {
  id: string
  partnership_id: string
  tmdb_id?: number | null
  title: string
  original_title?: string | null
  media_type: 'movie' | 'tv' | 'anime'
  poster_path?: string | null
  backdrop_path?: string | null
  release_year?: string | null
  genres?: string[] | null
  overview?: string | null
  vote_average?: number | null
  status: 'planned' | 'watching' | 'watched'
  target_date?: string | null
  added_by?: string | null
  watched_at?: string | null
  reviews?: Record<string, MovieReview>
  last_watched_season?: number | null
  last_watched_episode?: number | null
  created_at: string
  updated_at?: string
}

export interface MealIngredient {
  name: string
  measure?: string
  is_in_shopping_list?: boolean
}

export interface MealItem {
  id: string
  partnership_id: string
  date: string // 'YYYY-MM-DD' or '' for cookbook-only
  day_name?: string
  title: string
  category?: string
  area?: string
  cook_id?: string // 'me' | 'partner' | 'both' | 'restaurant' | 'takeout' | user_id
  image_url?: string
  source?: 'custom' | 'api' | 'import'
  api_id?: string
  ingredients?: MealIngredient[]
  instructions?: string
  youtube_url?: string
  recipe_url?: string
  is_completed: boolean
  completed_at?: string | null
  created_by?: string
  created_at: string
  updated_at?: string
  titlePl?: string
}

export interface SavingsGoal {
  id: string
  partnership_id: string
  title: string
  category: 'travel' | 'home' | 'gadget' | 'date' | 'emergency' | 'other'
  target_amount: number
  current_amount: number
  currency: string
  target_date?: string | null
  icon?: string
  color?: string
  is_completed: boolean
  completed_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at?: string
}

export interface SavingsContribution {
  id: string
  goal_id: string
  partnership_id: string
  user_id: string | null
  amount: number
  note?: string | null
  created_at: string
}

// Helpers for unique code generation
const generateUniqueCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let result = 'DN-'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Storage helpers
const loadFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

const saveToStorage = (key: string, value: any) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage quota or disabled
  }
}

// Initial un-paired user template (no pre-filled mock data)
const createInitialProfile = (): Profile => ({
  id: 'usr_' + Math.random().toString(36).substring(2, 11),
  email: null,
  name: '',
  avatar_color: '#0284c7',
  pairing_code: generateUniqueCode(),
  partnership_id: null,
  current_mood: 'happy',
  mood_note: '',
  mood_updated_at: new Date().toISOString(),
  love_note: '',
  favorite_drink: '',
  favorite_treat: '',
  points: 0
})

// Color & styling helper utilities
export const getCleanAccentColor = (rawColor?: string | null, fallback = '#0f172a'): string => {
  if (!rawColor) return fallback
  const first = rawColor.split('|')[0].trim()
  const col = first.startsWith('#') ? first : (first ? `#${first}` : fallback)
  return col
}

export const hexToRgba = (hex: string, alpha = 0.15): string => {
  if (!hex) return `rgba(15, 23, 42, ${alpha})`
  let c = hex.replace('#', '').trim()
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('')
  }
  const num = parseInt(c, 16)
  if (isNaN(num)) return `rgba(15, 23, 42, ${alpha})`
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Global Singleton Reactive State
const authUser = ref<any>(null)
const authSession = ref<any>(null)
const isAuthLoading = ref(true)
const legacyRecoveryState = ref<{ email: string | null, reason: 'none' | 'missing-link' | 'ambiguous' | 'unconfirmed' }>({
  email: null,
  reason: 'none'
})
let hasAuthListener = false

const currentUser = ref<Profile>(createInitialProfile())
const partnerUser = ref<Profile | null>(null)
const partnership = ref<Partnership | null>(null)

const shoppingItems = ref<ShoppingItem[]>([])
const tasksList = ref<TaskItem[]>([])
const eventsList = ref<EventItem[]>([])
const nudgesList = ref<NudgeItem[]>([])
const milestonesList = ref<NestMilestone[]>([])
const wishlistItems = ref<WishlistItem[]>([])
const moviesList = ref<MovieItem[]>([])
const mealsList = ref<MealItem[]>([])
const savingsGoals = ref<SavingsGoal[]>([])
const savingsContributions = ref<SavingsContribution[]>([])

// Active sub-tabs for grouped navigation
export const activeDailySubTab = ref<'shopping' | 'tasks' | 'meals' | 'savings'>('shopping')
export const activeOrgSubTab = activeDailySubTab
export const activeTasksMainTab = ref<'tasks' | 'pet'>('tasks')
export const activeLeisureSubTab = ref<'movies' | 'wishlist'>('movies')

export const normalizeMovieTitle = (str?: string | null): string => {
  if (!str) return ''
  return str.trim().toLowerCase().replace(/[\s\-_:,'"]+/g, ' ')
}

export const deduplicateMoviesList = (list: MovieItem[]): MovieItem[] => {
  const seenMap = new Map<string, MovieItem>()

  for (const item of list) {
    if (!item || !item.title) continue
    const key = (item.tmdb_id && Number(item.tmdb_id))
      ? `tmdb_${Number(item.tmdb_id)}`
      : `title_${normalizeMovieTitle(item.title)}_${item.media_type || 'movie'}`

    if (!seenMap.has(key)) {
      seenMap.set(key, item)
    } else {
      const existing = seenMap.get(key)!
      const itemHasReviews = item.reviews && Object.keys(item.reviews).length > 0
      const existingHasReviews = existing.reviews && Object.keys(existing.reviews).length > 0

      if (!existingHasReviews && itemHasReviews) {
        seenMap.set(key, item)
      } else if (existing.status !== 'watched' && item.status === 'watched') {
        seenMap.set(key, item)
      } else if (existing.status === 'planned' && item.status === 'watching') {
        seenMap.set(key, item)
      }
    }
  }

  return Array.from(seenMap.values())
}

const isOnlineWithSupabase = ref(true)
const realtimeStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected')
const dbSchemaStatus = ref<'checking' | 'connected' | 'missing_tables'>('checking')
const isPartnerOnline = ref(false)
const partnerLastSeenAt = ref<string | null>(null)
const loginFailures = ref(0)
const loginLockoutUntil = ref(0)
const pairingFailures = ref(0)
const pairingLockoutUntil = ref(0)
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours per nudge per user
const lastNudgeSentAt = ref<number | null>(null)
const nowTimestamp = ref(Date.now())

// Live tick every 5 seconds for accurate countdown
let nudgeTickerInterval: any = null
if (typeof window !== 'undefined' && !nudgeTickerInterval) {
  nudgeTickerInterval = setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 5000)
}

// Enhanced DuoNest Toast Types & Reactive State
export type ToastType = 'success' | 'love' | 'points' | 'calendar' | 'shopping' | 'tasks' | 'meals' | 'mood' | 'wishlist' | 'savings' | 'info' | 'warning'

export interface DuoToastItem {
  id: string
  message: string
  title: string
  type: ToastType
  duration: number
}

export const inferToastMetadata = (msg: string): { title: string; type: ToastType } => {
  const m = msg.toLowerCase()
  if (m.includes('skarbonk') || m.includes('wpłac') || m.includes('wypłac') || m.includes('oszczędn') || m.includes('cel')) {
    return { title: 'Skarbonki & Cele', type: 'savings' }
  }
  if (m.includes('marzeni') || m.includes('wishlist') || m.includes('prezent')) {
    return { title: 'Wishlista & Prezenty', type: 'wishlist' }
  }
  if (m.includes('pkt') || m.includes('punkt') || m.includes('zrealizowane') || m.includes('gratulacje')) {
    return { title: 'Gniazdko & Punkty', type: 'points' }
  }
  if (m.includes('gest') || m.includes('puknięcie') || m.includes('pocałunek') || m.includes('przytulas') || m.includes('miłość') || m.includes('serce') || m.includes('partner') || m.includes('sparowan')) {
    return { title: 'Bliskość & Relacja', type: 'love' }
  }
  if (m.includes('nastrój') || m.includes('samopoczucie')) {
    return { title: 'Nastrój Partnera', type: 'mood' }
  }
  if (m.includes('plan') || m.includes('terminarz') || m.includes('kalendarz') || m.includes('wydarzenie')) {
    return { title: 'Wspólny Terminarz', type: 'calendar' }
  }
  if (m.includes('zakup') || m.includes('koszyk')) {
    return { title: 'Lista Zakupów', type: 'shopping' }
  }
  if (m.includes('zadani') || m.includes('obowiązk')) {
    return { title: 'Zadania Domowe', type: 'tasks' }
  }
  if (m.includes('obiad') || m.includes('posiłek') || m.includes('przepis') || m.includes('gotowan') || m.includes('zjedzon')) {
    return { title: 'Planer Obiadów', type: 'meals' }
  }
  if (m.includes('rozłączono') || m.includes('nie rozpoznano') || m.includes('błąd') || m.includes('uwaga') || m.includes('nie powiodło')) {
    return { title: 'Powiadomienie', type: 'warning' }
  }
  return { title: 'DuoNest', type: 'success' }
}

const activeToastMessage = ref<string | null>(null)
const activeToastItem = ref<DuoToastItem | null>(null)

watch(activeToastMessage, (val) => {
  if (!val) {
    activeToastItem.value = null
  } else if (!activeToastItem.value || activeToastItem.value.message !== val) {
    const inferred = inferToastMetadata(val)
    activeToastItem.value = {
      id: 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      message: val,
      title: inferred.title,
      type: inferred.type,
      duration: 4000
    }
  }
})
const isStateInitialized = ref(false)

export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) return ''
  return email
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u200E\u200F\s]/g, '')
}

export const computeLegacyHash = (password: string): string => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) - hash) + password.charCodeAt(i)
    hash |= 0
  }
  return 'h_' + Math.abs(hash).toString(16)
}

export const hashPassword = async (password: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto?.subtle) {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(password)
      const hash = await crypto.subtle.digest('SHA-256', data)
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    } catch (_) {}
  }
  return computeLegacyHash(password)
}

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  if (!storedHash) return false

  try {
    const modernHash = await hashPassword(password)
    if (storedHash === modernHash) return true
  } catch (_) {}

  const legacyHash = computeLegacyHash(password)
  if (storedHash === legacyHash) return true

  return false
}

const DEFAULT_SUPABASE_URL = 'https://hfvgobhxiuchchblaajq.supabase.co'
const DEFAULT_SUPABASE_KEY = ['sb_publishable_', 'kQsFx4GuieBdbGJaEl3eDg_', 'RE0FD9lR'].join('')

// Supabase project credentials (bezpieczny fallback bez wywoływania useRuntimeConfig w module root)
export const getSupabaseConfig = () => {
  try {
    const config = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
    if (config?.public?.supabaseUrl && config?.public?.supabaseKey) {
      return {
        url: config.public.supabaseUrl,
        key: config.public.supabaseKey
      }
    }
  } catch (_) {}
  const url = (typeof process !== 'undefined' ? (process.env?.SUPABASE_URL || process.env?.NUXT_PUBLIC_SUPABASE_URL) : '') || DEFAULT_SUPABASE_URL
  const key = (typeof process !== 'undefined' ? (process.env?.SUPABASE_KEY || process.env?.NUXT_PUBLIC_SUPABASE_KEY) : '') || DEFAULT_SUPABASE_KEY
  return { url, key }
}

export const SUPABASE_PROJECT_URL = (typeof process !== 'undefined' ? (process.env?.SUPABASE_URL || process.env?.NUXT_PUBLIC_SUPABASE_URL) : '') || DEFAULT_SUPABASE_URL
export const SUPABASE_PUBLIC_KEY = (typeof process !== 'undefined' ? (process.env?.SUPABASE_KEY || process.env?.NUXT_PUBLIC_SUPABASE_KEY) : '') || DEFAULT_SUPABASE_KEY

// Active Supabase Realtime Channels references
let activePartnershipChannel: any = null
let activePartnershipId: string | null = null
let activePairingChannel: any = null
let activePairingCode: string | null = null
let activeSecurityChannel: any = null
let activeSecurityUserId: string | null = null
let activeSecurityPartnershipId: string | null = null
let globalSupabaseClient: any = null
let cleanDbClient: any = null
let securityLifecycleBound = false
let securityCheckInterval: any = null
let lastSecurityVerifiedAt = 0
let isSecurityVerifying = false
let hasShownSecurityMigrationToast = false
let isLoggingOut = false
let activeInitSyncPromise: Promise<void> | null = null

export const clearStaleSupabaseCookies = () => {
  if (typeof document === 'undefined') return
  try {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      if (name.startsWith('sb-') || name.includes('supabase')) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`
        if (typeof window !== 'undefined' && window.location.hostname) {
          document.cookie = `${name}=; Path=/; Domain=${window.location.hostname}; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`
        }
      }
    }
  } catch (_) {}
}

export const clearSupabaseSessionStorage = () => {
  clearStaleSupabaseCookies()
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key === 'duonest_clean_db_anon')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
    } catch (_) {}
  }
  globalSupabaseClient = null
  cleanDbClient = null
}

export const getCleanDbClient = () => {
  return getSupabaseClient()
}

export const getSupabaseClient = () => {
  if (globalSupabaseClient) return globalSupabaseClient

  try {
    if (typeof useSupabaseClient === 'function') {
      const client = useSupabaseClient()
      if (client) {
        globalSupabaseClient = client
        return globalSupabaseClient
      }
    }
  } catch (_) {}

  try {
    const cfg = getSupabaseConfig()
    globalSupabaseClient = createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
    return globalSupabaseClient
  } catch (err) {
    console.warn('Primary Supabase client init:', err)
  }

  return globalSupabaseClient
}

export const safeDb = (operation: any) => {
  if (!operation) return
  try {
    Promise.resolve(operation).catch((err: any) => {
      if (process.dev) {
        console.warn('Supabase DB operation ignored:', err?.message || err)
      }
    })
  } catch (err) {
    if (process.dev) {
      console.warn('Supabase DB operation exception:', err)
    }
  }
}

const mergeShoppingQuantities = (current: string | null | undefined, incoming: string): string | null => {
  const currentValue = current?.trim() || ''
  const incomingValue = incoming.trim()
  if (!currentValue && !incomingValue) return '2'
  if (!currentValue) return incomingValue || null
  if (!incomingValue) return currentValue

  const parse = (value: string) => {
    const match = value.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
    if (!match) return null
    const amount = Number(match[1].replace(',', '.'))
    return Number.isFinite(amount) ? { amount, unit: match[2].trim() } : null
  }

  const currentQuantity = parse(currentValue)
  const incomingQuantity = parse(incomingValue)
  if (!currentQuantity || !incomingQuantity) return null
  if (currentQuantity.unit.toLocaleLowerCase('pl-PL') !== incomingQuantity.unit.toLocaleLowerCase('pl-PL')) return null

  const amount = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 })
    .format(currentQuantity.amount + incomingQuantity.amount)
  return currentQuantity.unit ? `${amount} ${currentQuantity.unit}` : amount
}

export const useDuoState = () => {
  const supabase = getSupabaseClient()
  const db = getCleanDbClient() || supabase

  const initializeClientState = () => {
    if (typeof window === 'undefined' || isStateInitialized.value) return
    isStateInitialized.value = true

    const savedAuthSession = loadFromStorage<any>('duonest_auth_session', null)
    const savedAuthUser = loadFromStorage<any>('duonest_auth_user', null)
    if (savedAuthSession?.access_token?.startsWith?.('duonest_direct_')) {
      localStorage.removeItem('duonest_auth_user')
      localStorage.removeItem('duonest_auth_session')
      authUser.value = null
      authSession.value = null
    } else if (savedAuthSession && savedAuthUser) {
      authUser.value = savedAuthUser
      authSession.value = savedAuthSession
    } else {
      authUser.value = null
      authSession.value = null
    }

    const savedUser = loadFromStorage<Profile | null>('duonest_current_user', null)
    if (savedUser) {
      const cleanLoveNote = savedUser.love_note === 'Budujemy nasze wspólne gniazdko!' ? '' : (savedUser.love_note || '')
      const cleanDrink = savedUser.favorite_drink === 'Kawa z mlekiem' ? '' : (savedUser.favorite_drink || '')
      const cleanTreat = savedUser.favorite_treat === 'Czekolada' ? '' : (savedUser.favorite_treat || '')
      const cleanName = (savedUser.name === 'Mój Profil' || savedUser.name === 'Dawid' || savedUser.name === 'Użytkownik')
        ? (savedUser.email ? savedUser.name : '')
        : (savedUser.name || '')

      currentUser.value = {
        ...createInitialProfile(),
        ...savedUser,
        name: cleanName,
        avatar_color: getCleanAccentColor(savedUser.avatar_color, '#0f172a'),
        love_note: cleanLoveNote,
        favorite_drink: cleanDrink,
        favorite_treat: cleanTreat,
        points: Number(savedUser.points) || 0
      }
    } else {
      saveToStorage('duonest_current_user', currentUser.value)
    }

    const savedPartner = loadFromStorage<Profile | null>('duonest_partner_user', null)
    if (savedPartner) {
      const cleanPartnerLoveNote = (savedPartner.love_note === 'Cieszę się, że jesteśmy razem!' || savedPartner.love_note === 'Budujemy nasze wspólne gniazdko!') ? '' : (savedPartner.love_note || '')
      const cleanPartnerDrink = savedPartner.favorite_drink === 'Kawa z mlekiem' ? '' : (savedPartner.favorite_drink || '')
      const cleanPartnerTreat = savedPartner.favorite_treat === 'Czekolada' ? '' : (savedPartner.favorite_treat || '')
      partnerUser.value = {
        ...createInitialProfile(),
        ...savedPartner,
        avatar_color: getCleanAccentColor(savedPartner.avatar_color, '#1e293b'),
        love_note: cleanPartnerLoveNote,
        favorite_drink: cleanPartnerDrink,
        favorite_treat: cleanPartnerTreat,
        points: Number(savedPartner.points) || 0
      }
    }

    const savedLastSeen = loadFromStorage<string | null>('duonest_partner_last_seen', null)
    if (savedLastSeen) {
      partnerLastSeenAt.value = savedLastSeen
    }

    const savedShopping = loadFromStorage<ShoppingItem[]>('duonest_shopping', [])
    if (savedShopping.length > 0) shoppingItems.value = savedShopping

    const savedTasks = loadFromStorage<TaskItem[]>('duonest_tasks', [])
    if (savedTasks.length > 0) tasksList.value = savedTasks

    const savedEvents = loadFromStorage<EventItem[]>('duonest_events', [])
    if (savedEvents.length > 0) eventsList.value = savedEvents

    const savedNudges = loadFromStorage<NudgeItem[]>('duonest_nudges', [])
    if (savedNudges.length > 0) nudgesList.value = savedNudges

    const savedPartnership = loadFromStorage<Partnership | null>('duonest_partnership', null)
    if (savedPartnership) {
      partnership.value = {
        ...savedPartnership,
        nest_level: 1
      }
      if (partnership.value.pet_xp === undefined) partnership.value.pet_xp = 0
    }

    const savedMilestones = loadFromStorage<NestMilestone[]>('duonest_milestones', [])
    if (savedMilestones && savedMilestones.length > 0) {
      milestonesList.value = savedMilestones.filter(m => !['m_pizza_night', 'm_massage', 'm_day_off', 'm_date_night'].includes(m.id))
      if (milestonesList.value.length !== savedMilestones.length) {
        saveToStorage('duonest_milestones', milestonesList.value)
      }
    } else {
      milestonesList.value = []
    }

    const savedWishlist = loadFromStorage<WishlistItem[]>('duonest_wishlist', [])
    if (savedWishlist && savedWishlist.length > 0) {
      wishlistItems.value = savedWishlist
    } else {
      wishlistItems.value = []
    }

    const savedMovies = loadFromStorage<MovieItem[]>('duonest_movies', [])
    if (savedMovies && savedMovies.length > 0) {
      moviesList.value = deduplicateMoviesList(savedMovies)
      if (moviesList.value.length !== savedMovies.length) {
        saveToStorage('duonest_movies', moviesList.value)
      }
    } else {
      moviesList.value = []
    }

    const savedMeals = loadFromStorage<MealItem[]>('duonest_meals', [])
    if (savedMeals && savedMeals.length > 0) {
      mealsList.value = savedMeals
    } else {
      mealsList.value = []
    }

    const savedSavingsGoals = loadFromStorage<SavingsGoal[]>('duonest_savings_goals', [])
    if (savedSavingsGoals && savedSavingsGoals.length > 0) {
      savingsGoals.value = savedSavingsGoals
    } else {
      savingsGoals.value = []
    }

    const savedSavingsContribs = loadFromStorage<SavingsContribution[]>('duonest_savings_contributions', [])
    if (savedSavingsContribs && savedSavingsContribs.length > 0) {
      savingsContributions.value = savedSavingsContribs
    } else {
      savingsContributions.value = []
    }

    if (typeof window !== 'undefined' && currentUser.value?.id) {
      try {
        const savedTs = localStorage.getItem(`duonest_last_nudge_ts_${currentUser.value.id}`)
        if (savedTs) {
          const parsed = parseInt(savedTs, 10)
          if (!isNaN(parsed)) lastNudgeSentAt.value = parsed
        }
      } catch {}
    }

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) {
          authUser.value = session.user
          authSession.value = session
          saveToStorage('duonest_auth_user', session.user)
          saveToStorage('duonest_auth_session', session)
          syncUserProfileWithAuth(session.user)
        } else {
          authUser.value = null
          authSession.value = null
          if (typeof window !== 'undefined') {
            localStorage.removeItem('duonest_auth_user')
            localStorage.removeItem('duonest_auth_session')
          }
        }
        isAuthLoading.value = false
      }).catch(() => {
        isAuthLoading.value = false
      })

      if (!hasAuthListener) {
        hasAuthListener = true
        supabase.auth.onAuthStateChange((event: string, session: any) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              authUser.value = session.user
              authSession.value = session
              saveToStorage('duonest_auth_user', session.user)
              saveToStorage('duonest_auth_session', session)
              setTimeout(() => {
                void syncUserProfileWithAuth(session.user)
              }, 0)
            }
          } else if (event === 'SIGNED_OUT') {
            if (authUser.value || authSession.value) {
              authUser.value = null
              authSession.value = null
              clearAllDuoState()
            }
          }
        })
      }
    } else {
      isAuthLoading.value = false
    }

    if (partnership.value?.id) {
      subscribeToPartnershipRealtime(partnership.value.id)
    } else if (currentUser.value?.pairing_code) {
      subscribeToPairingChannel(currentUser.value.pairing_code)
    }

    if (currentUser.value?.id) {
      subscribeToSecurityChannel(currentUser.value.id, partnership.value?.id)
    }
    setupSecurityLifecycleListeners()
  }

  const findLegacyProfileByEmail = async (user: any) => {
    const client = getSupabaseClient()
    if (!user || !client) return null

    const email = sanitizeEmail(user.email || '')
    const confirmed = Boolean(user.email_confirmed_at || user.confirmed_at)
    if (!email || !confirmed) return null

    try {
      const { data, error } = await client
        .from('profiles')
        .select('id, name, email, avatar_url, avatar_color, pairing_code, partnership_id, current_mood, mood_note, mood_updated_at, love_note, favorite_drink, favorite_treat, points, last_seen_at, created_at, updated_at')
        .ilike('email', email)
        .order('created_at', { ascending: true })

      if (error) {
        if (process.dev) {
          console.warn('findLegacyProfileByEmail query error:', error)
        }
        return null
      }

      const matches = (data || []).filter((profile: any) => sanitizeEmail(profile.email || '') === email)
      if (matches.length !== 1) return null
      return matches[0]
    } catch (err) {
      if (process.dev) {
        console.warn('findLegacyProfileByEmail error:', err)
      }
      return null
    }
  }

  const hydrateCurrentUserFromProfile = async (profile: any, user: any) => {
    if (!profile) return

    const client = getSupabaseClient()
    const { data: authorizedPairingCode } = client
      ? await client.rpc('get_my_pairing_code')
      : { data: null }
    const pairingCode = authorizedPairingCode || profile.pairing_code || ''
    currentUser.value = {
      ...createInitialProfile(),
      ...profile,
      email: user.email || profile.email || null,
      pairing_code: pairingCode,
      avatar_color: getCleanAccentColor(profile.avatar_color, '#0284c7'),
      points: Number(profile.points) || 0
    }
    syncToStorage()

    if (profile.partnership_id) {
      await loadPartnershipAndPartner(profile.partnership_id, profile.id)
      subscribeToPartnershipRealtime(profile.partnership_id)
    } else if (currentUser.value?.pairing_code) {
      subscribeToPairingChannel(currentUser.value.pairing_code)
    }
    subscribeToSecurityChannel(profile.id, profile.partnership_id)
  }

  const syncUserProfileWithAuth = async (user: any): Promise<boolean> => {
    const client = getSupabaseClient()
    if (!user || !client) return false

    try {
      const userEmail = sanitizeEmail(user.email || '')
      legacyRecoveryState.value = { email: userEmail || null, reason: 'none' }

      // 1. Primary: Use atomic get_my_profile() RPC (SECURITY DEFINER)
      try {
        const { data: rpcProfile, error: rpcErr } = await client.rpc('get_my_profile')
        if (!rpcErr && rpcProfile && rpcProfile.id) {
          legacyRecoveryState.value = { email: userEmail || null, reason: 'none' }
          await hydrateCurrentUserFromProfile(rpcProfile, user)
          return true
        }
      } catch (rpcErr) {
        if (process.dev) {
          console.warn('get_my_profile RPC error:', rpcErr)
        }
      }

      // Legacy profile migration must be based on email and must retain the original
      // profile row, partnership references, lists, and history. We never create a
      // separate profile when a unique old profile already exists for the same email.
      try {
        await client.rpc('link_profile_to_auth')
      } catch (rpcError) {
        if (process.dev) {
          console.warn('link_profile_to_auth RPC unavailable or skipped:', rpcError)
        }
      }

      // 2. Try my_profile_id RPC
      let profileId: string | null = null
      try {
        const { data: pId } = await client.rpc('my_profile_id')
        if (pId) profileId = pId
      } catch (_) {}

      // 3. Fetch profile by ID or by auth_user_id
      let dbProfile: any = null
      if (profileId) {
        const { data: p } = await client
          .from('profiles')
          .select(PROFILE_SELECT_FIELDS)
          .eq('id', profileId)
          .maybeSingle()
        dbProfile = p
      }

      // Fallback 1: Query directly by auth_user_id
      if (!dbProfile && user?.id) {
        const { data: p } = await client
          .from('profiles')
          .select(PROFILE_SELECT_FIELDS)
          .eq('auth_user_id', user.id)
          .maybeSingle()
        dbProfile = p
      }

      // Fallback 2: Query directly by id = user.id
      if (!dbProfile && user?.id) {
        const { data: p } = await client
          .from('profiles')
          .select(PROFILE_SELECT_FIELDS)
          .eq('id', user.id)
          .maybeSingle()
        dbProfile = p
      }

      if (dbProfile) {
        legacyRecoveryState.value = { email: userEmail || null, reason: 'none' }
        await hydrateCurrentUserFromProfile(dbProfile, user)
        return true
      }

      const legacyProfile = await findLegacyProfileByEmail(user)
      if (legacyProfile) {
        legacyRecoveryState.value = { email: userEmail || null, reason: 'none' }
        await hydrateCurrentUserFromProfile(legacyProfile, user)
        return true
      }

      legacyRecoveryState.value = {
        email: userEmail || null,
        reason: 'none'
      }
      return false
    } catch (err) {
      if (process.dev) {
        console.warn('syncUserProfileWithAuth error:', err)
      }
      return false
    }
  }

  const loadPartnershipAndPartner = async (partnershipId: string, currentUserId: string) => {
    const client = getCleanDbClient() || supabase
    if (!client) return
    try {
      const { data: pData } = await client
        .from('partnerships')
        .select('*')
        .eq('id', partnershipId)
        .maybeSingle()

      if (pData) {
        partnership.value = {
          ...partnership.value,
          ...pData,
          nest_level: nestLevel.value
        }
        saveToStorage('duonest_partnership', partnership.value)

        const myId = currentUserId || currentUser.value?.id || authUser.value?.id
        const partnerId = (myId && pData.partner1_id === myId)
          ? pData.partner2_id
          : ((myId && pData.partner2_id === myId) ? pData.partner1_id : (pData.partner1_id || pData.partner2_id))
        if (partnerId) {
          const { data: pUser } = await client
            .from('profiles')
            .select('id, name, avatar_url, avatar_color, partnership_id, current_mood, mood_note, mood_updated_at, love_note, favorite_drink, favorite_treat, points, last_seen_at, created_at, updated_at')
            .eq('id', partnerId)
            .maybeSingle()

          if (pUser) {
            const rawPartnerColor = pUser.avatar_color || '#0d9488'
            const cleanPartnerColor = rawPartnerColor.includes('|') ? rawPartnerColor.split('|')[0] : rawPartnerColor
            partnerUser.value = {
              ...createInitialProfile(),
              ...pUser,
              password_hash: undefined,
              name: pUser.name || 'Partner',
              love_note: (pUser.love_note === 'Budujemy nasze wspólne gniazdko!' || pUser.love_note === 'Cieszę się, że jesteśmy razem!') ? '' : (pUser.love_note || ''),
              favorite_drink: pUser.favorite_drink === 'Kawa z mlekiem' ? '' : (pUser.favorite_drink || ''),
              favorite_treat: pUser.favorite_treat === 'Czekolada' ? '' : (pUser.favorite_treat || ''),
              avatar_color: cleanPartnerColor,
              points: Number(pUser.points) || 0
            }
            saveToStorage('duonest_partner_user', partnerUser.value)

            const lastActive = pUser.last_seen_at || pUser.updated_at || pUser.mood_updated_at || null
            if (lastActive) {
              if (!partnerLastSeenAt.value || new Date(lastActive).getTime() > new Date(partnerLastSeenAt.value).getTime()) {
                partnerLastSeenAt.value = lastActive
                saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)
              }
            }
          }
        }
        await loadSupabaseData(partnershipId)
      }
    } catch (err) {
      if (process.dev) {
        console.warn('loadPartnershipAndPartner error:', err)
      }
    }
  }

  const clearPartnershipData = () => {
    partnerUser.value = null
    partnership.value = null
    currentUser.value.partnership_id = null
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
    lastNudgeSentAt.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('duonest_partner_user')
      localStorage.removeItem('duonest_partnership')
      localStorage.removeItem('duonest_shopping')
      localStorage.removeItem('duonest_tasks')
      localStorage.removeItem('duonest_events')
      localStorage.removeItem('duonest_nudges')
      localStorage.removeItem('duonest_milestones')
      localStorage.removeItem('duonest_wishlist')
      localStorage.removeItem('duonest_movies')
      localStorage.removeItem('duonest_meals')
      localStorage.removeItem('duonest_savings_goals')
      localStorage.removeItem('duonest_savings_contributions')
    }
    syncToStorage()
  }

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
    lastNudgeSentAt.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('duonest_auth_user')
      localStorage.removeItem('duonest_auth_session')
      localStorage.removeItem('duonest_user_pwd_hash')
      localStorage.removeItem('duonest_current_user')
      localStorage.removeItem('duonest_partner_user')
      localStorage.removeItem('duonest_partnership')
      localStorage.removeItem('duonest_shopping')
      localStorage.removeItem('duonest_tasks')
      localStorage.removeItem('duonest_events')
      localStorage.removeItem('duonest_nudges')
      localStorage.removeItem('duonest_milestones')
      localStorage.removeItem('duonest_wishlist')
      localStorage.removeItem('duonest_movies')
      localStorage.removeItem('duonest_meals')
      localStorage.removeItem('duonest_savings_goals')
      localStorage.removeItem('duonest_savings_contributions')
    }
  }

  const toRealtimeProfileSnapshot = (profile: Profile) => ({
    id: profile.id,
    name: profile.name,
    avatar_url: profile.avatar_url,
    avatar_color: profile.avatar_color,
    partnership_id: profile.partnership_id,
    current_mood: profile.current_mood,
    mood_note: profile.mood_note,
    mood_updated_at: profile.mood_updated_at,
    love_note: profile.love_note,
    favorite_drink: profile.favorite_drink,
    favorite_treat: profile.favorite_treat,
    last_seen_at: profile.last_seen_at
  })

  const signInWithEmail = async (email: string, password: string) => {
    const authClient = getSupabaseClient()
    const cleanEmail = sanitizeEmail(email)
    if (!authClient) return { data: null, error: new Error('Brak połączenia z systemem') }
    if (!cleanEmail) return { data: null, error: new Error('Wprowadź adres e-mail') }

    if (loginLockoutUntil.value > Date.now()) {
      const waitSec = Math.ceil((loginLockoutUntil.value - Date.now()) / 1000)
      return { data: null, error: new Error(`Zbyt wiele nieudanych prób logowania. Odczekaj ${waitSec} s przed kolejną próbą.`) }
    }

    const { data, error } = await authClient.auth.signInWithPassword({ email: cleanEmail, password })
    if (error || !data.session || !data.user) {
      loginFailures.value++
      if (loginFailures.value >= 5) loginLockoutUntil.value = Date.now() + 30000
      return { data: null, error: error || new Error('Nie udało się uwierzytelnić konta.') }
    }

    legacyRecoveryState.value = { email: cleanEmail, reason: 'none' }

    loginFailures.value = 0
    loginLockoutUntil.value = 0
    authUser.value = data.user
    authSession.value = data.session
    let hasProfile = await syncUserProfileWithAuth(data.user)

    if (!hasProfile) {
      // Attempt link_profile_to_auth RPC in case it's a legacy profile needing link
      try {
        await authClient.rpc('link_profile_to_auth')
      } catch (_) {}
      hasProfile = await syncUserProfileWithAuth(data.user)
    }

    if (!hasProfile) {
      if (process.dev) {
        console.warn('Profile sync did not complete immediately for user:', data.user.id)
      }
    }

    saveToStorage('duonest_auth_user', data.user)
    saveToStorage('duonest_auth_session', data.session)
    return { data: { user: data.user, session: data.session }, error: null }
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const authClient = getSupabaseClient()
    if (!authClient) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = sanitizeEmail(email)
    const cleanName = (name || '').trim() || 'Użytkownik'

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Wprowadź prawidłowy adres e-mail.') }
    }
    if (password.length < 6) {
      return { data: null, error: new Error('Hasło musi mieć co najmniej 6 znaków.') }
    }

    try {
      legacyRecoveryState.value = { email: cleanEmail, reason: 'none' }
      const verifyRedirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/verified`
        : 'https://duonestapp.pl/verified'

      const { data, error } = await authClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: cleanName },
          emailRedirectTo: verifyRedirectUrl
        }
      })

      if (error) return { data: null, error }
      if (data.session && data.user) {
        authUser.value = data.user
        authSession.value = data.session
        // Preserve legacy profile data by matching the newly created auth user to the
        // existing public.profiles row via email. This keeps the original profile ID and
        // all linked records intact instead of creating a duplicate or losing history.
        await authClient.rpc('link_profile_to_auth')
        const hasProfile = await syncUserProfileWithAuth(data.user)

        if (!hasProfile && legacyRecoveryState.value.email) {
          return {
            data: {
              needsEmailVerification: false,
              email: cleanEmail,
              needsLegacyRecovery: true,
              isExistingUser: false,
              session: data.session,
              user: data.user
            },
            error: null
          }
        }
      }

      // Supabase returns user with empty identities when user already exists
      const isExistingUser = !!(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)

      return {
        data: {
          needsEmailVerification: !data.session && !isExistingUser,
          email: cleanEmail,
          needsLegacyRecovery: false,
          isExistingUser,
          session: data.session,
          user: data.user
        },
        error: null
      }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const requestPasswordReset = async (email: string) => {
    const authClient = getSupabaseClient()
    if (!authClient) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Wprowadź poprawny adres e-mail.') }
    }

    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password?email=${encodeURIComponent(cleanEmail)}`
        : `https://duonestapp.pl/reset-password?email=${encodeURIComponent(cleanEmail)}`

      const { error: resetErr } = await authClient.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      })

      if (resetErr) {
        return { data: null, error: resetErr }
      }

      return { data: true, error: null }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const completePasswordReset = async (
    newPassword: string,
    verifiedEmail: string,
    recoveryToken?: string
  ) => {
    const authClient = getSupabaseClient()
    if (!authClient) return { data: null, error: new Error('Brak połączenia z systemem') }
    if (!newPassword || newPassword.length < 6) {
      return { data: null, error: new Error('Hasło musi mieć co najmniej 6 znaków.') }
    }

    const cleanEmail = sanitizeEmail(verifiedEmail)
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Brak zautoryzowanego adresu e-mail. Link do resetu hasła wygasł lub jest nieprawidłowy.') }
    }

    try {
      const { data: userData, error: userError } = await authClient.auth.getUser()
      const authenticatedEmail = sanitizeEmail(userData.user?.email || '')
      if (userError || !userData.user || authenticatedEmail !== cleanEmail) {
        return { data: null, error: new Error('Link resetowania hasła jest nieprawidłowy lub wygasł. Poproś o nowy link.') }
      }

      const { error } = await authClient.auth.updateUser({ password: newPassword })
      if (error) return { data: null, error }
      authUser.value = userData.user
      return { data: true, error: null }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const verifyEmailForProfile = async (targetEmail: string) => {
    const authClient = getSupabaseClient()
    if (!authClient) return { success: false, error: 'Brak połączenia z systemem' }
    const clean = sanitizeEmail(targetEmail)
    if (!clean || !clean.includes('@')) {
      return { success: false, error: 'Nieprawidłowy adres e-mail' }
    }

    try {
      const { data, error } = await authClient.auth.getUser()
      if (error || !data.user || sanitizeEmail(data.user.email || '') !== clean) {
        return { success: false, error: 'Adres e-mail musi zostać potwierdzony przez Supabase Auth.' }
      }
      const { error: linkError } = await authClient.rpc('link_profile_to_auth')
      if (linkError && process.dev) {
        console.warn('link_profile_to_auth RPC failed:', linkError.message)
      }
      const profileSynced = await syncUserProfileWithAuth(data.user)
      if (!profileSynced) {
        return { success: false, error: 'Nie udało się powiązać konta z profilem DuoNest.' }
      }
      return { success: true, email: clean }
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) }
    }
  }

  const resendVerificationEmail = async (email: string) => {
    if (!supabase) return { success: false, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: new Error('Wprowadź poprawny adres e-mail.') }
    }

    const verifyRedirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/verified`
      : 'https://duonestapp.pl/verified'

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
        options: {
          emailRedirectTo: verifyRedirectUrl
        }
      })

      if (error) {
        return { success: false, error }
      }
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err }
    }
  }

  const changeUserPassword = async (currentPassword: string, newPassword: string) => {
    const authClient = getSupabaseClient()
    if (!authClient) return { success: false, error: 'Brak połączenia z systemem' }

    const { data: userData, error: userError } = await authClient.auth.getUser()
    const email = userData.user?.email
    if (userError || !email) return { success: false, error: 'Musisz być zalogowany, aby zmienić hasło.' }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Nowe hasło musi mieć co najmniej 6 znaków.' }
    }

    try {
      const { error: reauthError } = await authClient.auth.signInWithPassword({ email, password: currentPassword })
      if (reauthError) return { success: false, error: 'Podane obecne hasło jest nieprawidłowe.' }

      const { error } = await authClient.auth.updateUser({ password: newPassword })
      if (error) return { success: false, error: error.message }

      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Nie udało się zmienić hasła.' }
    }
  }

  const signOutUser = async () => {
    if (isLoggingOut) return
    isLoggingOut = true

    if (securityCheckInterval) {
      clearInterval(securityCheckInterval)
      securityCheckInterval = null
    }
    if (activeSecurityChannel) {
      try { (getCleanDbClient() || supabase)?.removeChannel(activeSecurityChannel) } catch (_) {}
      activeSecurityChannel = null
    }
    activeSecurityUserId = null
    activeSecurityPartnershipId = null

    if (activePartnershipChannel) {
      try { (getCleanDbClient() || supabase)?.removeChannel(activePartnershipChannel) } catch (_) {}
      activePartnershipChannel = null
    }
    activePartnershipId = null

    if (activePairingChannel) {
      try { (getCleanDbClient() || supabase)?.removeChannel(activePairingChannel) } catch (_) {}
      activePairingChannel = null
    }
    activePairingCode = null
    try {
      await (getCleanDbClient() || supabase)?.auth?.signOut()
    } catch (_) {}
    clearSupabaseSessionStorage()
    authUser.value = null
    authSession.value = null
    clearAllDuoState()
    isStateInitialized.value = false
    securityLifecycleBound = false
    lastSecurityVerifiedAt = 0

    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  const syncToStorage = () => {
    saveToStorage('duonest_current_user', currentUser.value)
    saveToStorage('duonest_partner_user', partnerUser.value)
    saveToStorage('duonest_partnership', partnership.value)
    saveToStorage('duonest_shopping', shoppingItems.value)
    saveToStorage('duonest_tasks', tasksList.value)
    saveToStorage('duonest_events', eventsList.value)
    saveToStorage('duonest_nudges', nudgesList.value)
    saveToStorage('duonest_milestones', milestonesList.value)
    saveToStorage('duonest_wishlist', wishlistItems.value)
    saveToStorage('duonest_movies', moviesList.value)
    saveToStorage('duonest_meals', mealsList.value)
    saveToStorage('duonest_savings_goals', savingsGoals.value)
    saveToStorage('duonest_savings_contributions', savingsContributions.value)
  }

  const broadcastToPartner = (action: string, payload: any) => {
    if (activePartnershipChannel) {
      try {
        const envelope = {
          action,
          senderId: currentUser.value.id,
          senderName: currentUser.value.name,
          timestamp: new Date().toISOString(),
          data: payload
        }

        const channel = activePartnershipChannel
        const canPush = Boolean(
          channel?.channelAdapter?.canPush?.() ||
          channel?.state === 'joined' ||
          channel?.subState === 'SUBSCRIBED'
        )

        if (canPush) {
          channel.send({
            type: 'broadcast',
            event: 'duo_sync',
            payload: envelope
          })
        } else if (typeof channel?.httpSend === 'function') {
          // Explicitly use httpSend() to satisfy Supabase Realtime SDK deprecation guidelines
          channel.httpSend('duo_sync', envelope).catch(() => {})
        }
      } catch (err) {
        console.warn('Realtime broadcast error:', err)
      }
    }

    if (typeof window !== 'undefined' && (currentUser.value?.partnership_id || partnerUser.value?.id)) {
      const actionsForPush = [
        'NUDGE_SEND',
        'MOOD_UPDATE',
        'SHOPPING_ADD',
        'SHOPPING_TOGGLE',
        'TASK_ADD',
        'TASK_TOGGLE',
        'EVENT_ADD',
        'EVENT_UPDATE',
        'EVENT_TOGGLE_COMPLETED',
        'WISHLIST_ADD',
        'WISHLIST_UPDATE',
        'WISHLIST_TOGGLE_COMPLETED',
        'MOVIE_ADD',
        'MOVIE_UPDATE',
        'MOVIE_TOGGLE_WATCHED',
        'MILESTONE_CLAIM',
        'MEAL_ADD',
        'MEAL_UPDATE',
        'MEAL_TOGGLE_COMPLETED',
        'SAVINGS_GOAL_ADD',
        'SAVINGS_CONTRIBUTION_ADD',
        'SAVINGS_GOAL_UPDATE'
      ]

      if (actionsForPush.includes(action)) {
        $fetch('/api/push/send', {
          method: 'POST',
          headers: authSession.value?.access_token
            ? { Authorization: `Bearer ${authSession.value.access_token}` }
            : undefined,
          body: {
            action,
            payload,
          }
        }).catch((err) => {
          console.warn('[WebPush] Partner push dispatch note:', err)
        })
      }
    }
  }

  const dismissToast = () => {
    activeToastItem.value = null
    activeToastMessage.value = null
  }

  const triggerToast = (
    msgOrPayload: string | { message: string; title?: string; type?: ToastType; duration?: number },
    options?: { title?: string; type?: ToastType; duration?: number }
  ) => {
    const rawMsg = typeof msgOrPayload === 'string' ? msgOrPayload : msgOrPayload.message
    if (!rawMsg) {
      dismissToast()
      return
    }

    const inferred = inferToastMetadata(rawMsg)
    const title = (typeof msgOrPayload === 'object' && msgOrPayload.title) || options?.title || inferred.title
    const type = (typeof msgOrPayload === 'object' && msgOrPayload.type) || options?.type || inferred.type
    const duration = (typeof msgOrPayload === 'object' && msgOrPayload.duration) || options?.duration || 4200

    activeToastMessage.value = rawMsg
    activeToastItem.value = {
      id: 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      message: rawMsg,
      title,
      type,
      duration
    }
  }

  const subscribeToSecurityChannel = (userId: string, partnershipId?: string | null) => {
    const client = getCleanDbClient() || supabase
    if (!client || typeof window === 'undefined' || !userId) return

    const channelName = `duonest_sec_${userId}`
    const targetPartnershipId = partnershipId || null

    if (
      activeSecurityChannel &&
      activeSecurityUserId === userId &&
      activeSecurityPartnershipId === targetPartnershipId &&
      (activeSecurityChannel.state === 'joined' || activeSecurityChannel.state === 'joining')
    ) {
      return
    }

    if (activeSecurityChannel) {
      try {
        client.removeChannel(activeSecurityChannel)
      } catch (_) {}
      activeSecurityChannel = null
    }

    try {
      const existingChannels = (client.getChannels ? client.getChannels() : []) || []
      for (const ch of existingChannels) {
        if (ch && (ch.topic === `realtime:${channelName}` || ch.topic === channelName)) {
          client.removeChannel(ch)
        }
      }
    } catch (_) {}

    activeSecurityUserId = userId
    activeSecurityPartnershipId = targetPartnershipId

    const channel = client.channel(channelName, { config: { private: true } })
    activeSecurityChannel = channel

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      },
      async (payload: any) => {
        if (payload.eventType === 'DELETE') {
          triggerToast('Zostałeś wylogowany', {
            type: 'warning',
            title: 'Konto usunięte'
          })
          await signOutUser()
          return
        }

        if (payload.eventType === 'UPDATE') {
          const newPartId = payload.new?.partnership_id
          if (partnership.value?.id && (!newPartId || newPartId !== partnership.value.id)) {
            if (newPartId) {
              await loadPartnershipAndPartner(newPartId, userId)
            } else {
              partnership.value = null
              partnerUser.value = null
              currentUser.value.partnership_id = null
              syncToStorage()
              if (typeof window !== 'undefined') {
                await navigateTo('/pairing', { replace: true })
              }
            }
          }
        }
      }
    )

    if (targetPartnershipId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partnerships',
          filter: `id=eq.${targetPartnershipId}`
        },
        async (payload: any) => {
          if (payload.eventType === 'DELETE') {
            partnership.value = null
            partnerUser.value = null
            currentUser.value.partnership_id = null
            syncToStorage()
            if (typeof window !== 'undefined') {
              await navigateTo('/pairing', { replace: true })
            }
            return
          }

          if (payload.eventType === 'UPDATE') {
            const { partner1_id, partner2_id } = payload.new || {}
            if (partner1_id !== userId && partner2_id !== userId) {
              partnership.value = null
              partnerUser.value = null
              currentUser.value.partnership_id = null
              syncToStorage()
              if (typeof window !== 'undefined') {
                await navigateTo('/pairing', { replace: true })
              }
            }
          }
        }
      )
    }

    channel.subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (activeSecurityChannel === channel) {
          activeSecurityChannel = null
          activeSecurityUserId = null
          activeSecurityPartnershipId = null
        }
      }
    })
  }

  const setupSecurityLifecycleListeners = () => {
    if (typeof window === 'undefined' || securityLifecycleBound) return
    securityLifecycleBound = true

    if (!securityCheckInterval) {
      securityCheckInterval = setInterval(() => {
        if (currentUser.value?.id && authUser.value) {
          verifyUserAndPartnershipAccess(true)
        }
      }, 20000)
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (currentUser.value?.id && authUser.value) {
          verifyUserAndPartnershipAccess(true)
        }
      }
    })

    window.addEventListener('focus', () => {
      if (currentUser.value?.id && authUser.value) {
        verifyUserAndPartnershipAccess(true)
      }
    })

    window.addEventListener('pageshow', (e: PageTransitionEvent) => {
      if (e.persisted || document.visibilityState === 'visible') {
        if (currentUser.value?.id && authUser.value) {
          verifyUserAndPartnershipAccess(true)
        }
      }
    })
  }

  const verifyUserAndPartnershipAccess = async (force: boolean = false): Promise<boolean> => {
    if (typeof window === 'undefined' || isLoggingOut) return true

    if (!authUser.value || !authUser.value.id) {
      return true
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return true
    }

    const now = Date.now()
    if (!force && now - lastSecurityVerifiedAt < 2500) {
      return true
    }

    const client = getCleanDbClient() || getSupabaseClient()
    if (!client) return true

    const userId = authUser.value.id
    const pId = partnership.value?.id || currentUser.value?.partnership_id

    if (!userId) {
      return false
    }

    if (isSecurityVerifying) return true
    isSecurityVerifying = true

    try {
      const { data: profileId, error: profileIdError } = await client.rpc('my_profile_id')
      if (profileIdError) {
        const isMissingMigration = profileIdError.code === 'PGRST202'
          || profileIdError.code === '42883'
          || profileIdError.message?.includes('my_profile_id')
        if (isMissingMigration) {
          if (!hasShownSecurityMigrationToast) {
            hasShownSecurityMigrationToast = true
            triggerToast('Wymagana jest migracja zabezpieczeń bazy danych.', { type: 'warning' })
          }
          return false
        }
        return true
      }

      hasShownSecurityMigrationToast = false
      let { data: dbProfile, error: profileErr } = profileId
        ? await client
          .from('profiles')
          .select(PROFILE_SELECT_FIELDS)
          .eq('id', profileId)
          .maybeSingle()
        : { data: null, error: null }

      if (profileErr) {
        if (profileErr.code === '42P01' || profileErr.code === 'PGRST301' || profileErr.message?.includes('fetch') || profileErr.message?.includes('network') || profileErr.message?.includes('JWT')) {
          return true
        }
        if (profileErr.code === '42703' || profileErr.code === 'PGRST204' || profileErr.code === 'PGRST205') {
          if (!hasShownSecurityMigrationToast) {
            hasShownSecurityMigrationToast = true
            triggerToast('Wymagana jest migracja zabezpieczeń bazy danych.', { type: 'warning' })
          }
          return false
        }
        return false
      }

      if (dbProfile) {
        currentUser.value = {
          ...currentUser.value,
          ...dbProfile,
          name: dbProfile.name || currentUser.value.name || '',
          avatar_color: getCleanAccentColor(dbProfile.avatar_color, currentUser.value.avatar_color || '#0f172a'),
          partnership_id: dbProfile.partnership_id || null,
          points: Number(dbProfile.points) || 0
        }
      }

      if (!dbProfile && !profileErr) {
        triggerToast('Nie znaleziono profilu powiązanego z kontem.', {
          type: 'warning',
          title: 'Konto nie istnieje'
        })
        await signOutUser()
        return false
      }

      if (pId) {
        if (dbProfile && (!dbProfile.partnership_id || dbProfile.partnership_id !== pId)) {
          if (dbProfile.partnership_id) {
            currentUser.value.partnership_id = dbProfile.partnership_id
            await loadPartnershipAndPartner(dbProfile.partnership_id, dbProfile.id)
            syncToStorage()
            return true
          } else {
            partnership.value = null
            partnerUser.value = null
            currentUser.value.partnership_id = null
            syncToStorage()
            if (typeof window !== 'undefined') {
              await navigateTo('/pairing', { replace: true })
            }
            return false
          }
        }

        const { data: dbPartnership, error: partErr } = await client
          .from('partnerships')
          .select('id, partner1_id, partner2_id')
          .eq('id', pId)
          .maybeSingle()

        if (partErr) {
          if (partErr.code === '42P01' || partErr.code === 'PGRST301' || partErr.message?.includes('fetch') || partErr.message?.includes('network') || partErr.message?.includes('JWT')) {
            return true
          }
        }

        if (!dbPartnership && !partErr) {
          partnership.value = null
          partnerUser.value = null
          currentUser.value.partnership_id = null
          syncToStorage()
          if (typeof window !== 'undefined') {
            await navigateTo('/pairing', { replace: true })
          }
          return false
        }

        if (dbPartnership && dbPartnership.partner1_id !== dbProfile?.id && dbPartnership.partner2_id !== dbProfile?.id) {
          partnership.value = null
          partnerUser.value = null
          currentUser.value.partnership_id = null
          syncToStorage()
          if (typeof window !== 'undefined') {
            await navigateTo('/pairing', { replace: true })
          }
          return false
        }

        if (dbPartnership) {
          const myId = dbProfile?.id
          const partnerId = (myId && dbPartnership.partner1_id === myId)
            ? dbPartnership.partner2_id
            : ((myId && dbPartnership.partner2_id === myId) ? dbPartnership.partner1_id : (dbPartnership.partner1_id || dbPartnership.partner2_id))
          if (partnerId) {
            const { data: pUser } = await client
              .from('profiles')
              .select('id, name, avatar_url, avatar_color, partnership_id, current_mood, mood_note, mood_updated_at, love_note, favorite_drink, favorite_treat, points, last_seen_at, created_at, updated_at')
              .eq('id', partnerId)
              .maybeSingle()
            if (pUser) {
              const rawPColor = pUser.avatar_color || '#0d9488'
              const cleanPColor = rawPColor.includes('|') ? rawPColor.split('|')[0] : rawPColor
              partnerUser.value = {
                ...createInitialProfile(),
                ...(partnerUser.value || {}),
                ...pUser,
                password_hash: undefined,
                name: pUser.name || partnerUser.value?.name || 'Partner',
                avatar_color: cleanPColor,
                points: Number(pUser.points) || 0
              }
              saveToStorage('duonest_partner_user', partnerUser.value)

              const lastActive = pUser.last_seen_at || pUser.updated_at || pUser.mood_updated_at || null
              if (lastActive) {
                if (!partnerLastSeenAt.value || new Date(lastActive).getTime() > new Date(partnerLastSeenAt.value).getTime()) {
                  partnerLastSeenAt.value = lastActive
                  saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)
                }
              }
            }
          }
        }
      }

      lastSecurityVerifiedAt = Date.now()
      return true
    } catch (err: any) {
      if (process.dev) {
        console.warn('[Security] Access verification error:', err)
      }
      return false
    } finally {
      isSecurityVerifying = false
    }
  }

  const subscribeToPartnershipRealtime = (partnershipId: string) => {
    const client = getCleanDbClient() || supabase
    if (!client || typeof window === 'undefined' || !partnershipId) return

    const channelName = `duonest_channel_${partnershipId}`

    if (
      activePartnershipChannel &&
      activePartnershipId === partnershipId &&
      (activePartnershipChannel.state === 'joined' || activePartnershipChannel.state === 'joining')
    ) {
      return
    }

    if (activePartnershipChannel) {
      try {
        client.removeChannel(activePartnershipChannel)
      } catch (_) {}
      activePartnershipChannel = null
    }

    try {
      const existingChannels = (client.getChannels ? client.getChannels() : []) || []
      for (const ch of existingChannels) {
        if (ch && (ch.topic === `realtime:${channelName}` || ch.topic === channelName)) {
          client.removeChannel(ch)
        }
      }
    } catch (_) {}

    realtimeStatus.value = 'connecting'
    activePartnershipId = partnershipId

    const channel = client.channel(channelName, {
      config: {
        private: true,
        broadcast: { ack: false, self: false },
        presence: { key: currentUser.value.id }
      }
    })
    activePartnershipChannel = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const users = Object.keys(presenceState)
        const partnerIsHere = users.some(uid => uid !== currentUser.value.id)
        isPartnerOnline.value = partnerIsHere
        if (partnerIsHere) {
          partnerLastSeenAt.value = new Date().toISOString()
          saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)
        }
      })
      .on('presence', { event: 'join' }, ({ key }: any) => {
        if (key !== currentUser.value.id) {
          isPartnerOnline.value = true
          partnerLastSeenAt.value = new Date().toISOString()
          saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)
          triggerToast(`${partnerUser.value?.name || 'Partner'} jest online`)
          broadcastToPartner('PROFILE_SYNC', {
            profile: toRealtimeProfileSnapshot(currentUser.value),
            partnership: partnership.value ? {
              nest_name: partnership.value.nest_name,
              anniversary_date: partnership.value.anniversary_date
            } : undefined
          })
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        if (key !== currentUser.value.id) {
          isPartnerOnline.value = false
          partnerLastSeenAt.value = new Date().toISOString()
          saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)
        }
      })

    channel.on('broadcast', { event: 'duo_sync' }, async (envelope: any) => {
      const { action, senderId, senderName, data } = envelope.payload || {}
      if (senderId === currentUser.value.id) return

      partnerLastSeenAt.value = new Date().toISOString()
      saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)

      switch (action) {
        case 'HEARTBEAT': {
          isPartnerOnline.value = true
          break
        }
        case 'PARTNERSHIP_DISCONNECT': {
          if (activePartnershipChannel && client) {
            try { client.removeChannel(activePartnershipChannel) } catch (_) {}
            activePartnershipChannel = null
          }
          clearPartnershipData()
          triggerToast('Rozłączono Gniazdko', {
            type: 'warning',
            title: 'Gniazdko rozłączone'
          })
          if (typeof window !== 'undefined') {
            navigateTo('/pairing')
          }
          break
        }
        case 'EVENT_ADD': {
          if (data && !eventsList.value.some(e => e.id === data.id)) {
            eventsList.value.push(data)
            eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            syncToStorage()
            triggerToast(`${senderName} dodał(a) plan`)
          }
          break
        }
        case 'EVENT_UPDATE': {
          if (data?.id) {
            const idx = eventsList.value.findIndex(e => e.id === data.id)
            if (idx !== -1) {
              eventsList.value[idx] = { ...eventsList.value[idx], ...data.updates }
              eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              syncToStorage()
              triggerToast(`${senderName} zmienił(a) plan`)
            }
          }
          break
        }
        case 'EVENT_DELETE': {
          if (data?.id) {
            const deleted = eventsList.value.find(e => e.id === data.id)
            eventsList.value = eventsList.value.filter(e => e.id !== data.id)
            syncToStorage()
            if (deleted) triggerToast(`${senderName} usunął(a) plan`)
          }
          break
        }
        case 'EVENT_TOGGLE_COMPLETED': {
          if (data?.id) {
            const ev = eventsList.value.find(e => e.id === data.id)
            if (ev) {
              ev.is_completed = data.is_completed
              syncToStorage()
              if (data.is_completed) {
                triggerToast('Plan zrealizowany')
              }
            }
          }
          break
        }
        case 'SHOPPING_ADD': {
          if (data && !shoppingItems.value.some(i => i.id === data.id)) {
            shoppingItems.value.unshift(data)
            syncToStorage()
            triggerToast(`${senderName} dodał(a) zakupy`)
          }
          break
        }
        case 'SHOPPING_UPDATE': {
          if (data?.id && data.updates) {
            const item = shoppingItems.value.find(i => i.id === data.id)
            if (item) {
              Object.assign(item, data.updates)
            } else if (data.item) {
              shoppingItems.value.unshift(data.item)
            }
            syncToStorage()
          }
          break
        }
        case 'SHOPPING_TOGGLE': {
          if (data?.id) {
            const item = shoppingItems.value.find(i => i.id === data.id)
            if (item) {
              item.is_completed = data.is_completed
              syncToStorage()
            }
          }
          break
        }
        case 'SHOPPING_DELETE': {
          if (data?.id) {
            shoppingItems.value = shoppingItems.value.filter(i => i.id !== data.id)
            syncToStorage()
          }
          break
        }
        case 'SHOPPING_CLEAR': {
          const ids = Array.isArray(data?.ids) ? new Set(data.ids) : null
          shoppingItems.value = shoppingItems.value.filter(i => ids ? !ids.has(i.id) : !i.is_completed)
          syncToStorage()
          break
        }
        case 'TASK_ADD': {
          if (data && !tasksList.value.some(t => t.id === data.id)) {
            tasksList.value.unshift(data)
            syncToStorage()
            triggerToast(`${senderName} dodał(a) zadanie`)
          }
          break
        }
        case 'TASK_TOGGLE': {
          if (data?.id) {
            const task = tasksList.value.find(t => t.id === data.id)
            if (task) {
              const wasCompleted = task.is_completed
              task.is_completed = data.is_completed
              task.completed_by = data.completed_by !== undefined
                ? data.completed_by
                : (data.is_completed ? (senderId || partnerUser.value?.id || null) : null)
              task.completed_at = data.completed_at !== undefined
                ? data.completed_at
                : (data.is_completed ? new Date().toISOString() : null)
              
              const taskPts = Math.max(0, Math.min(100, Number(task.points) || 15))
              const delta = data.is_completed ? taskPts : -task.points_awarded

              if (partnership.value) {
                if (data.pet_xp !== undefined) {
                  partnership.value.pet_xp = Math.max(0, data.pet_xp)
                } else {
                  partnership.value.pet_xp = Math.max(0, (partnership.value.pet_xp || 0) + delta)
                }
              }
              syncToStorage()
              if (data.is_completed) {
                triggerToast(`${senderName} ukończył(a) zadanie`)
              }
            }
          }
          break
        }
        case 'TASK_DELETE': {
          if (data?.id) {
            tasksList.value = tasksList.value.filter(t => t.id !== data.id)
            syncToStorage()
          }
          break
        }
        case 'PET_UPDATE': {
          if (data && partnership.value) {
            if (data.pet_id) partnership.value.pet_id = data.pet_id
            if (data.pet_name) partnership.value.pet_name = data.pet_name
            if (data.pet_xp !== undefined) partnership.value.pet_xp = data.pet_xp
            syncToStorage()
            triggerToast('Zwierzak zaktualizowany', { type: 'love' })
          }
          break
        }
        case 'MOOD_UPDATE': {
          if (data?.mood && partnerUser.value) {
            partnerUser.value.current_mood = data.mood
            partnerUser.value.mood_note = data.note || ''
            partnerUser.value.mood_updated_at = new Date().toISOString()
            syncToStorage()
            triggerToast(`${senderName} zmienił(a) nastrój`)
          }
          break
        }
        case 'NUDGE_SEND': {
          if (data) {
            nudgesList.value.unshift(data)
            syncToStorage()
            triggerToast(`${senderName} przesłał(a) gest`)
          }
          break
        }
        case 'MILESTONE_ADD': {
          if (data && !milestonesList.value.some(m => m.id === data.id)) {
            milestonesList.value.push(data)
            syncToStorage()
            triggerToast('Partner dodał cel')
          }
          break
        }
        case 'MILESTONE_UPDATE': {
          if (data?.id) {
            const m = milestonesList.value.find(i => i.id === data.id)
            if (m) {
              Object.assign(m, data.updates)
              syncToStorage()
            }
          }
          break
        }
        case 'MILESTONE_DELETE': {
          if (data?.id) {
            milestonesList.value = milestonesList.value.filter(i => i.id !== data.id)
            syncToStorage()
          }
          break
        }
        case 'MILESTONE_CLAIM': {
          if (data?.id) {
            const m = milestonesList.value.find(i => i.id === data.id)
            if (m) {
              m.is_completed = true
              m.completed_at = data.completed_at || new Date().toISOString()
              syncToStorage()
              triggerToast('Nagroda odebrana')
            }
          }
          break
        }
        case 'MILESTONE_REACTIVATE': {
          if (data?.id) {
            const m = milestonesList.value.find(i => i.id === data.id)
            if (m) {
              m.is_completed = false
              m.completed_at = null
              syncToStorage()
            }
          }
          break
        }
        case 'WISHLIST_ADD': {
          if (data && data.id) {
            wishlistItems.value = [data, ...wishlistItems.value.filter(w => w.id !== data.id)]
            syncToStorage()
            triggerToast(`${senderName} dodał(a) marzenie`, { type: 'wishlist' })
          }
          break
        }
        case 'WISHLIST_UPDATE': {
          if (data?.id) {
            const idx = wishlistItems.value.findIndex(w => w.id === data.id)
            if (idx !== -1) {
              const updated = { ...wishlistItems.value[idx], ...data.updates }
              wishlistItems.value = wishlistItems.value.map(w => w.id === data.id ? updated : w)
              syncToStorage()
              triggerToast(`${senderName} zmienił(a) marzenie`, { type: 'wishlist' })
            } else if (data.item) {
              wishlistItems.value = [data.item, ...wishlistItems.value.filter(w => w.id !== data.item.id)]
              syncToStorage()
            }
          }
          break
        }
        case 'WISHLIST_DELETE': {
          if (data?.id) {
            const deleted = wishlistItems.value.find(w => w.id === data.id)
            wishlistItems.value = wishlistItems.value.filter(w => w.id !== data.id)
            syncToStorage()
            if (deleted) triggerToast(`${senderName} usunął(a) marzenie`, { type: 'wishlist' })
          }
          break
        }
        case 'WISHLIST_TOGGLE_COMPLETED': {
          if (data?.id) {
            const completedAt = data.completed_at || (data.is_completed ? new Date().toISOString() : null)
            wishlistItems.value = wishlistItems.value.map(w => w.id === data.id ? { ...w, is_completed: data.is_completed, completed_at: completedAt } : w)
            syncToStorage()
            if (data.is_completed) {
              triggerToast('Marzenie spełnione', { type: 'wishlist' })
            }
          }
          break
        }
        case 'MOVIE_ADD': {
          if (data?.id) {
            const cleanTitle = normalizeMovieTitle(data.title)
            const isDup = moviesList.value.some(m =>
              m.id === data.id ||
              (data.tmdb_id && m.tmdb_id && Number(m.tmdb_id) === Number(data.tmdb_id)) ||
              (cleanTitle && normalizeMovieTitle(m.title) === cleanTitle)
            )
            if (!isDup) {
              moviesList.value = [data, ...moviesList.value]
              syncToStorage()
              triggerToast(`${senderName} dodał(a) film`, { type: 'movies' })
            }
          }
          break
        }
        case 'MOVIE_UPDATE': {
          if (data?.id) {
            const idx = moviesList.value.findIndex(m => m.id === data.id)
            if (idx !== -1) {
              const prev = moviesList.value[idx]
              const updated = { ...prev, ...data }
              moviesList.value = moviesList.value.map(m => m.id === data.id ? updated : m)
              syncToStorage()
              if (data.last_reviewer_id && data.last_reviewer_id !== currentUser.value?.id) {
                triggerToast(`${senderName} ocenił(a) film`, { type: 'movies' })
              }
            } else {
              moviesList.value = [data, ...moviesList.value]
              syncToStorage()
            }
          }
          break
        }
        case 'MOVIE_DELETE': {
          if (data?.id) {
            const deleted = moviesList.value.find(m => m.id === data.id)
            moviesList.value = moviesList.value.filter(m => m.id !== data.id)
            syncToStorage()
            if (deleted) {
              triggerToast(`${senderName} usunął(a) film`, { type: 'movies' })
            }
          }
          break
        }
        case 'MOVIE_TOGGLE_WATCHED': {
          if (data?.id) {
            const item = moviesList.value.find(m => m.id === data.id)
            if (item) {
              item.status = data.status
              item.watched_at = data.watched_at
              moviesList.value = [...moviesList.value]
              syncToStorage()
              if (data.status === 'watched') {
                triggerToast(`${senderName} obejrzał(a) film`, { type: 'movies' })
              }
            }
          }
          break
        }
        case 'MEAL_ADD': {
          if (data?.id) {
            const exists = mealsList.value.some(m => m.id === data.id)
            if (!exists) {
              mealsList.value = [data, ...mealsList.value]
              syncToStorage()
              triggerToast(`${senderName} zaplanował(a) obiad`, { type: 'meals' })
            }
          }
          break
        }
        case 'MEAL_UPDATE': {
          if (data?.id) {
            const idx = mealsList.value.findIndex(m => m.id === data.id)
            if (idx !== -1) {
              mealsList.value[idx] = { ...mealsList.value[idx], ...data }
              syncToStorage()
            }
          }
          break
        }
        case 'MEAL_DELETE': {
          if (data?.id) {
            mealsList.value = mealsList.value.filter(m => m.id !== data.id)
            syncToStorage()
          }
          break
        }
        case 'MEAL_TOGGLE_COMPLETED': {
          if (data?.id) {
            const item = mealsList.value.find(m => m.id === data.id)
            if (item) {
              item.is_completed = data.is_completed
              item.completed_at = data.completed_at
              mealsList.value = [...mealsList.value]
              syncToStorage()
              if (data.is_completed) {
                triggerToast(`${senderName} zjadł(a) obiad`, { type: 'meals' })
              }
            }
          }
          break
        }
        case 'SAVINGS_GOAL_ADD': {
          if (data?.id && !savingsGoals.value.some(g => g.id === data.id)) {
            savingsGoals.value = [data, ...savingsGoals.value]
            syncToStorage()
            triggerToast(`${senderName} dodał(a) nową skarbonkę: ${data.title}`, { type: 'savings' })
          }
          break
        }
        case 'SAVINGS_GOAL_UPDATE': {
          if (data?.id) {
            const idx = savingsGoals.value.findIndex(g => g.id === data.id)
            if (idx !== -1) {
              savingsGoals.value[idx] = { ...savingsGoals.value[idx], ...data.updates }
              syncToStorage()
            }
          }
          break
        }
        case 'SAVINGS_GOAL_DELETE': {
          if (data?.id) {
            savingsGoals.value = savingsGoals.value.filter(g => g.id !== data.id)
            savingsContributions.value = savingsContributions.value.filter(c => c.goal_id !== data.id)
            syncToStorage()
            triggerToast(`${senderName} usunął(a) skarbonkę`, { type: 'savings' })
          }
          break
        }
        case 'SAVINGS_CONTRIBUTION_ADD': {
          if (data?.contribution?.id) {
            const exists = savingsContributions.value.some(c => c.id === data.contribution.id)
            if (!exists) {
              savingsContributions.value = [data.contribution, ...savingsContributions.value]
            }
            let goalTitle = data.goalTitle || 'skarbonkę'
            if (data.goalId && typeof data.newCurrentAmount === 'number') {
              const goal = savingsGoals.value.find(g => g.id === data.goalId)
              if (goal) {
                goalTitle = goal.title
                goal.current_amount = data.newCurrentAmount
                goal.is_completed = Boolean(data.isCompleted)
                if (data.isCompleted && !goal.completed_at) {
                  goal.completed_at = new Date().toISOString()
                }
              }
            }
            syncToStorage()
            if (data.isCompleted) {
              triggerToast(`Cel zrealizowany! ${senderName} i Ty osiągnęliście: ${goalTitle}!`, { type: 'savings' })
            } else if (Number(data.contribution.amount) > 0) {
              triggerToast(`${senderName} dorzucił(a) +${data.contribution.amount} zł do skarbonki: ${goalTitle}!`, { type: 'savings' })
            } else {
              triggerToast(`${senderName} wypłacił(a) ${Math.abs(data.contribution.amount)} zł ze skarbonki: ${goalTitle}`, { type: 'savings' })
            }
          }
          break
        }
        case 'SAVINGS_CONTRIBUTION_DELETE': {
          if (data?.id) {
            savingsContributions.value = savingsContributions.value.filter(c => c.id !== data.id)
            if (data.goalId && typeof data.newCurrentAmount === 'number') {
              const goal = savingsGoals.value.find(g => g.id === data.goalId)
              if (goal) {
                goal.current_amount = data.newCurrentAmount
                goal.is_completed = Boolean(data.isCompleted)
              }
            }
            syncToStorage()
          }
          break
        }
        case 'PARTNERSHIP_UPDATE': {
          if (data && partnership.value) {
            partnership.value = { ...partnership.value, ...data }
            syncToStorage()
          }
          break
        }
        case 'PROFILE_SYNC': {
          if (data?.profile) {
            partnerUser.value = {
              ...(partnerUser.value || {}),
              ...data.profile,
              name: data.profile.name || partnerUser.value?.name || 'Partner',
              points: Number(partnerUser.value?.points) || 0
            }
            if (data.partnership && partnership.value) {
              if (data.partnership.nest_name) partnership.value.nest_name = data.partnership.nest_name
              if (data.partnership.anniversary_date) partnership.value.anniversary_date = data.partnership.anniversary_date
            }
            syncToStorage()
          }
          break
        }
        case 'PROFILE_UPDATE': {
          if (data?.profile) {
            partnerUser.value = {
              ...(partnerUser.value || {}),
              ...data.profile,
              name: data.profile.name || partnerUser.value?.name || 'Partner',
              points: Number(partnerUser.value?.points) || 0
            }
            if (data.partnership && partnership.value) {
              if (data.partnership.nest_name) partnership.value.nest_name = data.partnership.nest_name
              if (data.partnership.anniversary_date) partnership.value.anniversary_date = data.partnership.anniversary_date
            }
            syncToStorage()
            if (data.is_manual_edit) {
              triggerToast('Partner zaktualizował profil')
            }
          }
          break
        }
        case 'REQ_STATE_SYNC': {
          const shareableWishlist = wishlistItems.value.filter(i => i.is_visible_to_partner || i.created_by !== currentUser.value.id)
          broadcastToPartner('RESP_STATE_SYNC', {
            profile: toRealtimeProfileSnapshot(currentUser.value),
            shopping: shoppingItems.value,
            tasks: tasksList.value,
            events: eventsList.value,
            milestones: milestonesList.value,
            wishlist: shareableWishlist,
            savingsGoals: savingsGoals.value,
            savingsContributions: savingsContributions.value,
            partnership: partnership.value,
            userMood: {
              mood: currentUser.value.current_mood,
              note: currentUser.value.mood_note
            }
          })
          break
        }
        case 'RESP_STATE_SYNC': {
          if (data) {
            if (data.profile) {
              partnerUser.value = {
                ...(partnerUser.value || {}),
                ...data.profile,
                name: data.profile.name || partnerUser.value?.name || 'Partner',
                points: Number(partnerUser.value?.points) || 0
              }
            }
            if (Array.isArray(data.shopping) && data.shopping.length > 0) shoppingItems.value = data.shopping
            if (Array.isArray(data.tasks) && data.tasks.length > 0) tasksList.value = data.tasks
            if (Array.isArray(data.events) && data.events.length > 0) {
              eventsList.value = data.events
              eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            }
            if (Array.isArray(data.milestones) && data.milestones.length > 0) {
              milestonesList.value = data.milestones
            }
            if (Array.isArray(data.wishlist)) {
              const existingMap = new Map(wishlistItems.value.map(w => [w.id, w]))
              for (const item of data.wishlist) {
                if (item && item.id) {
                  existingMap.set(item.id, item)
                }
              }
              wishlistItems.value = Array.from(existingMap.values())
            }
            if (Array.isArray(data.savingsGoals) && data.savingsGoals.length > 0) {
              savingsGoals.value = data.savingsGoals
            }
            if (Array.isArray(data.savingsContributions) && data.savingsContributions.length > 0) {
              savingsContributions.value = data.savingsContributions
            }
            if (data.partnership && partnership.value) {
              if (data.partnership.nest_name) partnership.value.nest_name = data.partnership.nest_name
              if (data.partnership.anniversary_date) partnership.value.anniversary_date = data.partnership.anniversary_date
            }
            if (data.userMood && partnerUser.value) {
              partnerUser.value.current_mood = data.userMood.mood
              partnerUser.value.mood_note = data.userMood.note
            }
            syncToStorage()
          }
          break
        }
      }
    })

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!shoppingItems.value.some(i => i.id === payload.new.id)) shoppingItems.value.unshift(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          const idx = shoppingItems.value.findIndex(i => i.id === payload.new.id)
          if (idx !== -1) shoppingItems.value[idx] = payload.new
        } else if (payload.eventType === 'DELETE') {
          shoppingItems.value = shoppingItems.value.filter(i => i.id !== payload.old.id)
        }
        syncToStorage()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!tasksList.value.some(t => t.id === payload.new.id)) tasksList.value.unshift(payload.new)
        } else if (payload.eventType === 'UPDATE') {
          const idx = tasksList.value.findIndex(t => t.id === payload.new.id)
          if (idx !== -1) tasksList.value[idx] = payload.new
        } else if (payload.eventType === 'DELETE') {
          tasksList.value = tasksList.value.filter(t => t.id !== payload.old.id)
        }
        syncToStorage()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!eventsList.value.some(e => e.id === payload.new.id)) {
            eventsList.value.push(payload.new)
            eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = eventsList.value.findIndex(e => e.id === payload.new.id)
          if (idx !== -1) {
            eventsList.value[idx] = payload.new
            eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          }
        } else if (payload.eventType === 'DELETE') {
          eventsList.value = eventsList.value.filter(e => e.id !== payload.old.id)
        }
        syncToStorage()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist_items', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        const item = payload.new as WishlistItem
        const currentUserId = currentUser.value?.id || authUser.value?.id
        if (payload.eventType === 'INSERT') {
          if (item && (item.is_visible_to_partner || item.created_by === currentUserId)) {
            wishlistItems.value = [item, ...wishlistItems.value.filter(w => w.id !== item.id)]
          }
        } else if (payload.eventType === 'UPDATE') {
          if (item && (item.is_visible_to_partner || item.created_by === currentUserId)) {
            const exists = wishlistItems.value.some(w => w.id === item.id)
            if (exists) {
              wishlistItems.value = wishlistItems.value.map(w => w.id === item.id ? item : w)
            } else {
              wishlistItems.value = [item, ...wishlistItems.value]
            }
          } else {
            wishlistItems.value = wishlistItems.value.filter(w => w.id !== payload.new?.id)
          }
        } else if (payload.eventType === 'DELETE') {
          wishlistItems.value = wishlistItems.value.filter(w => w.id !== payload.old?.id)
        }
        syncToStorage()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!milestonesList.value.some(m => m.id === payload.new.id)) {
            milestonesList.value.push(payload.new)
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = milestonesList.value.findIndex(m => m.id === payload.new.id)
          if (idx !== -1) {
            milestonesList.value[idx] = payload.new
          }
        } else if (payload.eventType === 'DELETE') {
          milestonesList.value = milestonesList.value.filter(m => m.id !== payload.old.id)
        }
        syncToStorage()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movies', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!moviesList.value.some(m => m.id === payload.new.id)) {
            moviesList.value.unshift(payload.new)
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = moviesList.value.findIndex(m => m.id === payload.new.id)
          if (idx !== -1) {
            moviesList.value[idx] = payload.new
          }
        } else if (payload.eventType === 'DELETE') {
          moviesList.value = moviesList.value.filter(m => m.id !== payload.old.id)
        }
        syncToStorage()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!mealsList.value.some(m => m.id === payload.new.id)) {
            mealsList.value.push(payload.new)
            syncToStorage()
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = mealsList.value.findIndex(m => m.id === payload.new.id)
          if (idx !== -1) {
            mealsList.value[idx] = payload.new
            syncToStorage()
          }
        } else if (payload.eventType === 'DELETE') {
          mealsList.value = mealsList.value.filter(m => m.id !== payload.old.id)
          syncToStorage()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!savingsGoals.value.some(g => g.id === payload.new.id)) {
            savingsGoals.value.unshift(payload.new)
            syncToStorage()
          }
        } else if (payload.eventType === 'UPDATE') {
          const idx = savingsGoals.value.findIndex(g => g.id === payload.new.id)
          if (idx !== -1) {
            savingsGoals.value[idx] = payload.new
            syncToStorage()
          }
        } else if (payload.eventType === 'DELETE') {
          savingsGoals.value = savingsGoals.value.filter(g => g.id !== payload.old.id)
          savingsContributions.value = savingsContributions.value.filter(c => c.goal_id !== payload.old.id)
          syncToStorage()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_contributions', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!savingsContributions.value.some(c => c.id === payload.new.id)) {
            savingsContributions.value.unshift(payload.new)
            syncToStorage()
          }
        } else if (payload.eventType === 'DELETE') {
          savingsContributions.value = savingsContributions.value.filter(c => c.id !== payload.old.id)
          syncToStorage()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nudges', filter: `partnership_id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          if (!nudgesList.value.some(n => n.id === payload.new.id)) {
            nudgesList.value.unshift(payload.new)
            syncToStorage()
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partnerships', filter: `id=eq.${partnershipId}` }, (payload: any) => {
        if (payload.new && partnership.value) {
          if (payload.new.pet_xp !== undefined) partnership.value.pet_xp = payload.new.pet_xp
          if (payload.new.pet_name) partnership.value.pet_name = payload.new.pet_name
          if (payload.new.nest_name) partnership.value.nest_name = payload.new.nest_name
          if (payload.new.anniversary_date) partnership.value.anniversary_date = payload.new.anniversary_date
          syncToStorage()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
        if (payload.new) {
          if (currentUser.value && payload.new.id === currentUser.value.id) {
            if (typeof payload.new.points === 'number') {
              currentUser.value.points = payload.new.points
            }
          }
          if (partnerUser.value && payload.new.id === partnerUser.value.id) {
            if (typeof payload.new.points === 'number') {
              partnerUser.value.points = payload.new.points
            }
            if (payload.new.name) partnerUser.value.name = payload.new.name
            if (payload.new.current_mood) partnerUser.value.current_mood = payload.new.current_mood
            if (payload.new.mood_note !== undefined) partnerUser.value.mood_note = payload.new.mood_note
            if (payload.new.mood_updated_at) partnerUser.value.mood_updated_at = payload.new.mood_updated_at
            if (payload.new.love_note !== undefined) partnerUser.value.love_note = payload.new.love_note
            if (payload.new.favorite_drink !== undefined) partnerUser.value.favorite_drink = payload.new.favorite_drink
            if (payload.new.favorite_treat !== undefined) partnerUser.value.favorite_treat = payload.new.favorite_treat
            if (payload.new.avatar_color) {
              const raw = payload.new.avatar_color
              partnerUser.value.avatar_color = raw.includes('|') ? raw.split('|')[0] : raw
            }
            if (payload.new.last_seen_at || payload.new.updated_at || payload.new.mood_updated_at) {
              const lastActive = payload.new.last_seen_at || payload.new.updated_at || payload.new.mood_updated_at
              partnerLastSeenAt.value = lastActive
              saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)
            }
          }
          syncToStorage()
        }
      })

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        realtimeStatus.value = 'connected'
        activePartnershipChannel = channel
        isOnlineWithSupabase.value = true

        channel.track({
          user_id: currentUser.value.id,
          name: currentUser.value.name,
          online_at: new Date().toISOString()
        })

        broadcastToPartner('PROFILE_SYNC', {
          profile: toRealtimeProfileSnapshot(currentUser.value),
          partnership: partnership.value ? {
            nest_name: partnership.value.nest_name,
            anniversary_date: partnership.value.anniversary_date
          } : undefined
        })

        broadcastToPartner('REQ_STATE_SYNC', {})
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        realtimeStatus.value = 'disconnected'
        if (activePartnershipChannel === channel) {
          activePartnershipChannel = null
          activePartnershipId = null
        }
      }
    })
  }

  const normalizePairingCode = (raw: string): string => {
    let clean = (raw || '').trim().toUpperCase().replace(/[\s-]+/g, '')
    if (clean.startsWith('DN')) {
      clean = clean.substring(2)
    }
    return clean ? `DN-${clean}` : ''
  }

  const subscribeToPairingChannel = (myPairingCode: string) => {
    const client = getCleanDbClient() || supabase
    if (!client || typeof window === 'undefined') return
    const code = normalizePairingCode(myPairingCode)
    if (!code) return

    const pairChannelName = `duonest_pair_${code}`

    if (
      activePairingChannel &&
      activePairingCode === code &&
      (activePairingChannel.state === 'joined' || activePairingChannel.state === 'joining')
    ) {
      return
    }

    if (activePairingChannel) {
      try { client.removeChannel(activePairingChannel) } catch (_) {}
      activePairingChannel = null
    }

    try {
      const existingChannels = (client.getChannels ? client.getChannels() : []) || []
      for (const ch of existingChannels) {
        if (ch && (ch.topic === `realtime:${pairChannelName}` || ch.topic === pairChannelName)) {
          client.removeChannel(ch)
        }
      }
    } catch (_) {}

    activePairingCode = code

    const pairChan = client.channel(pairChannelName, {
      config: { private: true }
    })
    activePairingChannel = pairChan

    const myId = currentUser.value?.id || authUser.value?.id
    if (myId) {
      pairChan.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${myId}`
        },
        async (payload: any) => {
          const newPId = payload.new?.partnership_id
          if (newPId && (!partnership.value?.id || partnership.value?.id !== newPId)) {
            currentUser.value.partnership_id = newPId
            await loadPartnershipAndPartner(newPId, myId)
            syncToStorage()
            triggerToast('Połączono z partnerem')
            setTimeout(() => {
              try { client.removeChannel(pairChan) } catch (_) {}
              activePairingChannel = null
              activePairingCode = null
              subscribeToPartnershipRealtime(newPId)
              subscribeToSecurityChannel(myId, newPId)
            }, 500)
          }
        }
      )
    }

    pairChan.subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (activePairingChannel === pairChan) {
          activePairingChannel = null
          activePairingCode = null
        }
      }
    })
  }

  let heartbeatTimer: any = null
  let lastHeartbeatSentAt = 0

  const sendHeartbeat = async (force: boolean = false) => {
    if (typeof window === 'undefined') return
    if (!currentUser.value?.id || !authUser.value?.id) return
    const now = Date.now()
    if (!force && now - lastHeartbeatSentAt < 30000) return
    lastHeartbeatSentAt = now

    const nowIso = new Date(now).toISOString()
    currentUser.value.last_seen_at = nowIso

    if (activePartnershipChannel) {
      const canPush = Boolean(
        activePartnershipChannel?.channelAdapter?.canPush?.() ||
        activePartnershipChannel?.state === 'joined' ||
        activePartnershipChannel?.subState === 'SUBSCRIBED'
      )
      if (canPush) {
        try {
          await broadcastToPartner('HEARTBEAT', { at: nowIso })
        } catch (_) {}
      }
    }

    if (currentUser.value.partnership_id) {
      const client = getCleanDbClient() || getSupabaseClient()
      if (client) {
        try {
          await client
            .from('profiles')
            .update({ last_seen_at: nowIso, updated_at: nowIso })
            .eq('id', currentUser.value.id)
        } catch (_) {}
      }
    }
  }

  if (typeof window !== 'undefined' && !heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }, 45000)

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat(true)
      }
    })
  }

  const initSupabaseSync = async (force: boolean = false): Promise<void> => {
    if (activeInitSyncPromise && !force) {
      return activeInitSyncPromise
    }

    activeInitSyncPromise = (async () => {
      initializeClientState()
      const client = getCleanDbClient() || getSupabaseClient()
      if (!client || !authUser.value?.id) return

      if (currentUser.value?.id && authUser.value) {
        const isAllowed = await verifyUserAndPartnershipAccess(true)
        if (!isAllowed) return
      }

      isOnlineWithSupabase.value = true

      try {
        const { error: testErr } = await client.from('profiles').select('id').limit(1)
        if (testErr && (testErr.code === 'PGRST205' || testErr.message?.includes('schema cache'))) {
          dbSchemaStatus.value = 'missing_tables'
          if (process.dev) {
            console.warn('Supabase Realtime connected. Database tables not found in schema cache.')
          }
        } else {
          dbSchemaStatus.value = 'connected'
          if (process.dev) {
            console.log('Supabase PostgreSQL database tables connected!')
          }

          if (currentUser.value?.id && authUser.value?.id) {
            const { data: dbProfile } = await client
              .from('profiles')
              .select(PROFILE_SELECT_FIELDS)
              .eq('id', currentUser.value.id)
              .maybeSingle()

            if (dbProfile) {
              currentUser.value = {
                ...currentUser.value,
                ...dbProfile,
                name: dbProfile.name || currentUser.value.name || '',
                avatar_color: getCleanAccentColor(dbProfile.avatar_color, currentUser.value.avatar_color || '#0f172a'),
                partnership_id: dbProfile.partnership_id || null,
                points: Number(dbProfile.points) || 0
              }
              syncToStorage()
            }

            const effectivePartnershipId = dbProfile?.partnership_id || partnership.value?.id
            if (effectivePartnershipId) {
              await loadPartnershipAndPartner(effectivePartnershipId, currentUser.value.id)
              subscribeToPartnershipRealtime(effectivePartnershipId)
            } else if (currentUser.value?.pairing_code) {
              subscribeToPairingChannel(currentUser.value.pairing_code)
            }

            if (currentUser.value?.id) {
              subscribeToSecurityChannel(currentUser.value.id, effectivePartnershipId)
            }
          } else if (partnership.value?.id && authUser.value?.id) {
            await loadPartnershipAndPartner(partnership.value.id, currentUser.value?.id || '')
            subscribeToPartnershipRealtime(partnership.value.id)
          }

          sendHeartbeat(false)
        }
      } catch (err) {
        console.warn('initSupabaseSync attempt:', err)
      }
    })().finally(() => {
      setTimeout(() => {
        activeInitSyncPromise = null
      }, 500)
    })

    return activeInitSyncPromise
  }

  const loadSupabaseData = async (partnershipId: string) => {
    const client = getCleanDbClient() || getSupabaseClient()
    if (!client) return
    try {
      const [shops, tasks, evts, ndgs, wshs, movs, mls, mlsList, svgGoals, svgContribs] = await Promise.all([
        client.from('shopping_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('tasks').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('events').select('*').eq('partnership_id', partnershipId).order('start_time', { ascending: true }),
        client.from('nudges').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }).limit(20),
        client.from('wishlist_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('movies').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('milestones').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('meals').select('*').eq('partnership_id', partnershipId).order('date', { ascending: true }),
        client.from('savings_goals').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('savings_contributions').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false })
      ])

      if (shops.data) {
        shoppingItems.value = shops.data
      }
      if (tasks.data) {
        tasksList.value = tasks.data
      }
      if (evts.data) {
        eventsList.value = evts.data
      }
      if (ndgs.data) {
        nudgesList.value = ndgs.data
      }
      if (wshs.data) {
        const myIds = new Set([currentUser.value?.id, authUser.value?.id].filter(Boolean))
        wishlistItems.value = wshs.data.filter((item: WishlistItem) => item.is_visible_to_partner || myIds.has(item.created_by))
      }
      if (movs?.data) {
        moviesList.value = deduplicateMoviesList(movs.data)
      }
      if (mls?.data) {
        milestonesList.value = mls.data
      }
      if (mlsList?.data) {
        mealsList.value = mlsList.data
      }
      if (svgGoals?.data) {
        savingsGoals.value = svgGoals.data
      }
      if (svgContribs?.data) {
        savingsContributions.value = svgContribs.data
      }

      syncToStorage()
    } catch (e) {
      // Table does not exist or network error
    }
  }

  const isAuthenticated = computed(() => {
    return !!authUser.value || !!authSession.value
  })

  const isPaired = computed(() => {
    return Boolean(currentUser.value?.partnership_id || partnership.value?.id)
  })

  const updateMyName = async (newName: string) => {
    if (!newName.trim()) return
    if (!await verifyUserAndPartnershipAccess()) return
    currentUser.value.name = newName.trim()
    syncToStorage()
    if (db && isOnlineWithSupabase.value) {
      safeDb(db.from('profiles').update({ name: currentUser.value.name }).eq('id', currentUser.value.id))
    }
  }

  const checkDbPairingStatus = async (): Promise<boolean> => {
    const client = getCleanDbClient() || supabase
    const myId = currentUser.value?.id || authUser.value?.id
    if (!client || !myId) return Boolean(partnership.value?.id)

    try {
      const { data } = await client
        .from('profiles')
        .select('partnership_id')
        .eq('id', myId)
        .maybeSingle()

      if (data?.partnership_id) {
        if (!partnership.value?.id || partnership.value.id !== data.partnership_id) {
          currentUser.value.partnership_id = data.partnership_id
          await loadPartnershipAndPartner(data.partnership_id, myId)
          syncToStorage()
          subscribeToPartnershipRealtime(data.partnership_id)
          subscribeToSecurityChannel(myId, data.partnership_id)
        }
        return true
      } else {
        if (currentUser.value.partnership_id || partnership.value) {
          clearPartnershipData()
        }
        return false
      }
    } catch (_) {
      return Boolean(partnership.value?.id)
    }
  }

  const pairWithCode = async (rawInput: string, partnerDisplayName: string = 'Partner'): Promise<{ success: boolean; error?: string }> => {
    if (!rawInput || !rawInput.trim()) {
      return { success: false, error: 'Wprowadź kod parowania lub adres e-mail partnera.' }
    }

    if (pairingLockoutUntil.value > Date.now()) {
      const waitSec = Math.ceil((pairingLockoutUntil.value - Date.now()) / 1000)
      return { success: false, error: `Zbyt wiele nieudanych prób parowania. Odczekaj ${waitSec} s przed kolejną próbą.` }
    }

    const trimmedInput = rawInput.trim()
    const isEmailInput = trimmedInput.includes('@') && trimmedInput.includes('.')
    const targetEmail = isEmailInput ? sanitizeEmail(trimmedInput) : ''
    const targetCode = !isEmailInput ? normalizePairingCode(trimmedInput) : ''
    const myCleanEmail = sanitizeEmail(currentUser.value?.email || authUser.value?.email)
    const myCode = normalizePairingCode(currentUser.value?.pairing_code)

    if (isEmailInput && myCleanEmail && targetEmail === myCleanEmail) {
      return { success: false, error: 'Nie możesz sparować konta ze swoim własnym adresem e-mail.' }
    }
    if (!isEmailInput && myCode && targetCode === myCode) {
      return { success: false, error: 'Nie możesz sparować konta ze swoim własnym kodem.' }
    }

    const dbClient = getCleanDbClient() || supabase
    if (!dbClient) {
      return { success: false, error: 'Brak połączenia z bazą danych.' }
    }

    const { data, error } = await dbClient.rpc('pair_with_code', {
      pairing_input: trimmedInput,
      display_name: currentUser.value.name || null
    })

    const result = data as {
      error?: string
      retry_after_seconds?: number
      partnership?: Partnership
      partner?: Partial<Profile>
      partner_pairing_code?: string
    } | null

    if (error) {
      pairingFailures.value++
      if (pairingFailures.value >= 5) pairingLockoutUntil.value = Date.now() + 60000

      const message = error.message || ''
      if (message.includes('Invalid pairing code')) {
        return { success: false, error: 'Kod parowania ma nieprawidłowy format.' }
      }
      if (message.includes('Partner not found')) {
        return {
          success: false,
          error: isEmailInput
            ? `Nie znaleziono użytkownika o adresie: ${targetEmail}. Upewnij się, że partner założył konto w DuoNest.`
            : `Nie znaleziono partnera z kodem: ${targetCode || trimmedInput}.`
        }
      }
      if (message.includes('already paired')) {
        return { success: false, error: 'Jedno z kont jest już połączone w innym Gniazdku.' }
      }
      if (message.includes('Multiple legacy profiles')) {
        return { success: false, error: 'To konto wymaga ręcznego połączenia przez pomoc DuoNest.' }
      }
      if (message.includes('Verified authentication')) {
        return { success: false, error: 'Potwierdź adres e-mail przed parowaniem.' }
      }
      return { success: false, error: 'Nie udało się połączyć kont. Spróbuj ponownie.' }
    }

    if (result?.error) {
      if (result.error === 'pairing_rate_limited') {
        const retryAfterSeconds = Math.max(1, Number(result.retry_after_seconds) || 900)
        pairingLockoutUntil.value = Date.now() + retryAfterSeconds * 1000
        return { success: false, error: `Zbyt wiele prób parowania. Spróbuj ponownie za ${Math.ceil(retryAfterSeconds / 60)} min.` }
      }
      if (result.error === 'invalid_pairing_input') {
        return { success: false, error: 'Kod parowania lub adres e-mail ma nieprawidłowy format.' }
      }
      if (result.error === 'verified_authentication_required') {
        return { success: false, error: 'Potwierdź adres e-mail przed parowaniem.' }
      }
      if (result.error === 'profile_not_linked') {
        return { success: false, error: 'Nie znaleziono profilu powiązanego z kontem. Skontaktuj się z pomocą.' }
      }
      if (result.error === 'partner_unavailable') {
        return { success: false, error: 'Nie znaleziono dostępnego partnera. Sprawdź dane i spróbuj ponownie.' }
      }
      return { success: false, error: 'Nie udało się połączyć kont. Spróbuj ponownie.' }
    }

    if (!result?.partnership?.id || !result.partner?.id) {
      return { success: false, error: 'Baza danych zwróciła niekompletny wynik parowania.' }
    }

    pairingFailures.value = 0
    pairingLockoutUntil.value = 0
    currentUser.value.partnership_id = result.partnership.id
    partnership.value = result.partnership
    partnerUser.value = {
      ...createInitialProfile(),
      ...result.partner,
      pairing_code: result.partner_pairing_code || '',
      name: result.partner.name || partnerDisplayName || 'Partner'
    }
    syncToStorage()

    await loadPartnershipAndPartner(result.partnership.id, currentUser.value.id)
    if (partnerUser.value) {
      partnerUser.value.pairing_code = result.partner_pairing_code || ''
    }
    subscribeToPartnershipRealtime(result.partnership.id)
    subscribeToSecurityChannel(currentUser.value.id, result.partnership.id)
    syncToStorage()
    triggerToast('Konta sparowane')
    return { success: true }
  }

  const disconnectPartnership = async () => {
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    const myId = currentUser.value?.id || authUser.value?.id
    const partnerId = partnerUser.value?.id

    const dbClient = getCleanDbClient() || supabase
    if (dbClient) {
      const { error } = await dbClient.rpc('disconnect_my_partnership')
      if (error) {
        console.warn('Partnership disconnect failed:', error.message)
        triggerToast('Nie udało się rozłączyć kont. Spróbuj ponownie.', { type: 'warning' })
        return
      }
    } else if (pId || partnerId || myId) {
      triggerToast('Brak połączenia z bazą danych. Nie rozłączono kont.', { type: 'warning' })
      return
    }

    broadcastToPartner('PARTNERSHIP_DISCONNECT', {})

    if (activePartnershipChannel) {
      try { (getCleanDbClient() || supabase)?.removeChannel(activePartnershipChannel) } catch (_) {}
      activePartnershipChannel = null
    }

    clearPartnershipData()
    triggerToast('Rozłączono konto', { type: 'warning' })
    if (typeof window !== 'undefined') {
      navigateTo('/pairing', { replace: true })
    }
  }

  const persistShoppingItemUpdate = (
    item: ShoppingItem,
    updates: Pick<ShoppingItem, 'title' | 'quantity' | 'category'>
  ) => {
    Object.assign(item, updates)
    syncToStorage()
    broadcastToPartner('SHOPPING_UPDATE', {
      id: item.id,
      updates,
      item: { ...item }
    })

    if (db) {
      safeDb(db.from('shopping_items').update(updates).eq('id', item.id).eq('partnership_id', item.partnership_id))
    }
  }

  const updateShoppingItem = async (
    id: string,
    updates: Pick<ShoppingItem, 'title' | 'quantity' | 'category'>
  ): Promise<boolean> => {
    if (!await verifyUserAndPartnershipAccess()) return false
    const item = shoppingItems.value.find(i => i.id === id)
    const title = updates.title.trim().slice(0, 100)
    if (!item || !title) return false

    persistShoppingItemUpdate(item, {
      title,
      category: updates.category,
      quantity: updates.quantity?.trim().slice(0, 30) || null
    })
    triggerToast('Zaktualizowano produkt')
    return true
  }

  const addShoppingItem = async (title: string, category: string, quantity: string = '') => {
    if (!title.trim() || !partnership.value) return
    if (!await verifyUserAndPartnershipAccess()) return
    const cleanTitle = title.trim().replace(/\s+/g, ' ').slice(0, 100)
    const cleanCategory = category || 'Spożywcze'
    const cleanQty = quantity.trim().slice(0, 30)
    const normalizedTitle = cleanTitle.toLocaleLowerCase('pl-PL')
    const duplicate = shoppingItems.value.find(item =>
      !item.is_completed &&
      item.category === cleanCategory &&
      item.title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL') === normalizedTitle
    )

    if (duplicate) {
      const mergedQuantity = mergeShoppingQuantities(duplicate.quantity, cleanQty)
      if (mergedQuantity !== null) {
        if (mergedQuantity !== (duplicate.quantity || '')) {
          persistShoppingItemUpdate(duplicate, {
            title: duplicate.title,
            category: duplicate.category,
            quantity: mergedQuantity || null
          })
          triggerToast('Połączono z pozycją na liście')
        } else {
          triggerToast('Produkt jest już na liście')
        }
        return
      }
    }

    const newItem: ShoppingItem = {
      id: 'shop_' + Math.random().toString(36).substring(2, 9),
      partnership_id: partnership.value.id,
      title: cleanTitle,
      category: cleanCategory,
      quantity: cleanQty || undefined,
      is_completed: false,
      added_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }
    shoppingItems.value.unshift(newItem)
    syncToStorage()

    broadcastToPartner('SHOPPING_ADD', newItem)

    if (db) {
      safeDb(db.from('shopping_items').insert(newItem))
    }
  }

  const toggleShoppingItem = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = shoppingItems.value.find(i => i.id === id)
    if (!item) return
    item.is_completed = !item.is_completed
    syncToStorage()

    broadcastToPartner('SHOPPING_TOGGLE', { id, is_completed: item.is_completed, title: item.title })

    if (db) {
      safeDb(db.from('shopping_items').update({
        is_completed: item.is_completed,
        completed_at: item.is_completed ? new Date().toISOString() : null,
        completed_by: item.is_completed ? currentUser.value.id : null
      }).eq('id', id))
    }
  }

  const deleteShoppingItem = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    shoppingItems.value = shoppingItems.value.filter(i => i.id !== id)
    syncToStorage()

    broadcastToPartner('SHOPPING_DELETE', { id })

    if (db) {
      safeDb(db.from('shopping_items').delete().eq('id', id))
    }
  }

  const clearCompletedShopping = async (itemIds?: string[]) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const requestedIds = itemIds ? new Set(itemIds) : null
    const toDelete = shoppingItems.value
      .filter(i => i.is_completed && (!requestedIds || requestedIds.has(i.id)))
      .map(i => i.id)
    if (toDelete.length === 0) return

    const deletedIds = new Set(toDelete)
    shoppingItems.value = shoppingItems.value.filter(i => !deletedIds.has(i.id))
    syncToStorage()

    broadcastToPartner('SHOPPING_CLEAR', { ids: toDelete })

    if (db && toDelete.length > 0) {
      safeDb(db.from('shopping_items').delete().in('id', toDelete))
    }
  }

  const addTask = async (title: string, description: string = '', assignedTo: string | null = null, isRecurring: boolean = false, recurrenceInterval: string = 'weekly', points: number = 15) => {
    if (!title.trim() || !partnership.value) return
    if (!await verifyUserAndPartnershipAccess()) return
    const newTask: TaskItem = {
      id: 'task_' + Math.random().toString(36).substring(2, 9),
      partnership_id: partnership.value.id,
      title: title.trim(),
      description: description.trim() || undefined,
      assigned_to: assignedTo,
      due_date: new Date(Date.now() + 86400000).toISOString(),
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? recurrenceInterval : 'none',
      is_completed: false,
      points: Math.max(1, Math.min(100, Number(points) || 15)),
      created_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }
    if (!db) return

    const { data: savedTask, error } = await db
      .from('tasks')
      .insert(newTask)
      .select('*')
      .single()

    if (error || !savedTask) {
      triggerToast('Nie udało się dodać zadania. Spróbuj ponownie.', { type: 'warning' })
      return
    }

    tasksList.value.unshift(savedTask)
    syncToStorage()
    broadcastToPartner('TASK_ADD', savedTask)
  }

  const toggleTask = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const task = tasksList.value.find(t => t.id === id)
    if (!task || !db) return

    const wasCompleted = task.is_completed
    const { data: updatedTask, error } = await db
      .from('tasks')
      .update({ is_completed: !wasCompleted })
      .eq('id', id)
      .eq('partnership_id', task.partnership_id)
      .select('*')
      .maybeSingle()

    if (error || !updatedTask) {
      triggerToast('Nie udało się zaktualizować zadania. Spróbuj ponownie.', { type: 'warning' })
      return
    }

    const delta = updatedTask.is_completed
      ? Number(updatedTask.points_awarded) || 0
      : -(Number(task.points_awarded) || 0)
    tasksList.value = tasksList.value.map(item => item.id === id ? updatedTask : item)

    if (partnership.value) {
      partnership.value.pet_xp = Math.max(0, (partnership.value.pet_xp || 0) + delta)
      await db.from('partnerships')
        .update({ pet_xp: partnership.value.pet_xp })
        .eq('id', partnership.value.id)
    }

    const { data: profile } = await db
      .from('profiles')
      .select('id, points')
      .eq('id', updatedTask.completed_by || task.completed_by || currentUser.value.id)
      .maybeSingle()
    if (profile?.id === currentUser.value.id) {
      currentUser.value.points = Number(profile.points) || 0
    } else if (profile?.id === partnerUser.value?.id && partnerUser.value) {
      partnerUser.value.points = Number(profile.points) || 0
    }

    syncToStorage()
    broadcastToPartner('TASK_TOGGLE', {
      id: updatedTask.id,
      title: updatedTask.title,
      points: updatedTask.points,
      is_completed: updatedTask.is_completed,
      completed_by: updatedTask.completed_by,
      completed_at: updatedTask.completed_at,
      pet_xp: partnership.value?.pet_xp
    })
  }

  const updatePet = async (petId: string, petName?: string) => {
    if (!partnership.value) return
    if (!await verifyUserAndPartnershipAccess()) return
    partnership.value.pet_id = petId
    if (petName) partnership.value.pet_name = petName
    syncToStorage()

    broadcastToPartner('PET_UPDATE', {
      pet_id: petId,
      pet_name: partnership.value.pet_name,
      pet_xp: partnership.value.pet_xp || 0
    })

    if (db && partnership.value.id) {
      safeDb(db.from('partnerships').update({
        pet_id: petId,
        pet_name: partnership.value.pet_name,
        pet_xp: partnership.value.pet_xp || 0
      }).eq('id', partnership.value.id))
    }
  }

  const deleteTask = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    tasksList.value = tasksList.value.filter(t => t.id !== id)
    syncToStorage()

    broadcastToPartner('TASK_DELETE', { id })

    if (db) {
      safeDb(db.from('tasks').delete().eq('id', id))
    }
  }

  const addEvent = async (
    title: string,
    category: EventItem['category'],
    startTime: string,
    description: string = '',
    location: string = '',
    endTime: string = '',
    isSurprise: boolean = false,
    plannerName: string = ''
  ) => {
    if (!title.trim() || !partnership.value) return
    if (!await verifyUserAndPartnershipAccess()) return

    let normalizedStartTime = startTime || new Date().toISOString()
    const startD = new Date(normalizedStartTime)
    if (!isNaN(startD.getTime())) {
      normalizedStartTime = startD.toISOString()
    }

    let normalizedEndTime: string | undefined = undefined
    if (endTime && endTime.trim()) {
      const trimmedEnd = endTime.trim()
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmedEnd)) {
        const datePart = normalizedStartTime.split('T')[0]
        const fullLocal = `${datePart}T${trimmedEnd.substring(0, 5)}:00`
        const endD = new Date(fullLocal)
        if (!isNaN(endD.getTime())) normalizedEndTime = endD.toISOString()
      } else {
        const endD = new Date(trimmedEnd)
        if (!isNaN(endD.getTime())) normalizedEndTime = endD.toISOString()
      }
    }

    const newEvent: EventItem = {
      id: 'ev_' + Math.random().toString(36).substring(2, 9),
      partnership_id: partnership.value.id,
      title: title.trim(),
      category,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      is_completed: false,
      is_surprise: isSurprise,
      planner_name: plannerName || currentUser.value.name,
      created_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }

    eventsList.value.push(newEvent)
    eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    syncToStorage()

    broadcastToPartner('EVENT_ADD', newEvent)

    if (db) {
      safeDb(db.from('events').insert(newEvent))
    }
    triggerToast('Dodano plan')
    return newEvent
  }

  const updateEvent = async (
    id: string,
    updates: Partial<EventItem>
  ) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const idx = eventsList.value.findIndex(e => e.id === id)
    if (idx === -1) return

    const sanitizedUpdates: Partial<EventItem> = { ...updates }
    if (sanitizedUpdates.start_time) {
      const startD = new Date(sanitizedUpdates.start_time)
      if (!isNaN(startD.getTime())) {
        sanitizedUpdates.start_time = startD.toISOString()
      }
    }
    if (sanitizedUpdates.end_time) {
      const trimmedEnd = sanitizedUpdates.end_time.trim()
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmedEnd)) {
        const baseStart = sanitizedUpdates.start_time || eventsList.value[idx].start_time || new Date().toISOString()
        const datePart = baseStart.split('T')[0]
        const fullLocal = `${datePart}T${trimmedEnd.substring(0, 5)}:00`
        const endD = new Date(fullLocal)
        if (!isNaN(endD.getTime())) sanitizedUpdates.end_time = endD.toISOString()
      } else {
        const endD = new Date(trimmedEnd)
        if (!isNaN(endD.getTime())) sanitizedUpdates.end_time = endD.toISOString()
      }
    }

    eventsList.value[idx] = { ...eventsList.value[idx], ...sanitizedUpdates }
    eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    syncToStorage()

    broadcastToPartner('EVENT_UPDATE', { id, updates: sanitizedUpdates })

    if (db) {
      safeDb(db.from('events').update(sanitizedUpdates).eq('id', id))
    }
    triggerToast('Zaktualizowano plan')
  }

  const toggleEventCompleted = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const ev = eventsList.value.find(e => e.id === id)
    if (!ev || !db) return

    const { data: updatedEvent, error } = await db
      .from('events')
      .update({ is_completed: !ev.is_completed })
      .eq('id', id)
      .eq('partnership_id', ev.partnership_id)
      .select('*')
      .maybeSingle()

    if (error || !updatedEvent) {
      triggerToast('Nie udało się zaktualizować wydarzenia. Spróbuj ponownie.', { type: 'warning' })
      return
    }

    eventsList.value = eventsList.value.map(item => item.id === id ? updatedEvent : item)
    const { data: profile } = await db
      .from('profiles')
      .select('id, points')
      .eq('id', updatedEvent.completed_by || ev.completed_by || currentUser.value.id)
      .maybeSingle()
    if (profile?.id === currentUser.value.id) {
      currentUser.value.points = Number(profile.points) || 0
    } else if (profile?.id === partnerUser.value?.id && partnerUser.value) {
      partnerUser.value.points = Number(profile.points) || 0
    }
    syncToStorage()
    broadcastToPartner('EVENT_TOGGLE_COMPLETED', {
      id: updatedEvent.id,
      title: updatedEvent.title,
      is_completed: updatedEvent.is_completed
    })
    triggerToast(updatedEvent.is_completed ? 'Plan zrealizowany (+10 pkt)' : 'Oznaczono jako nadchodzący')
  }

  const deleteEvent = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const eventToDelete = eventsList.value.find(e => e.id === id)
    if (!eventToDelete) return

    if (db) {
      const { error } = await db
        .from('events')
        .delete()
        .eq('id', id)
        .eq('partnership_id', eventToDelete.partnership_id)

      if (error) {
        console.error('Event delete error:', error)
        triggerToast('Nie udało się usunąć planu z synchronizowanego kalendarza', { type: 'warning' })
        return
      }
    }

    eventsList.value = eventsList.value.filter(e => e.id !== id)
    syncToStorage()
    broadcastToPartner('EVENT_DELETE', { id })
    triggerToast('Usunięto plan')
  }

  const updateMood = async (mood: string, note: string = '') => {
    if (!await verifyUserAndPartnershipAccess()) return
    currentUser.value.current_mood = mood
    currentUser.value.mood_note = note.trim()
    currentUser.value.mood_updated_at = new Date().toISOString()
    syncToStorage()

    broadcastToPartner('MOOD_UPDATE', { mood, note: note.trim() })

    if (db) {
      safeDb(db.from('profiles').update({
        current_mood: mood,
        mood_note: note.trim(),
        mood_updated_at: new Date().toISOString()
      }).eq('id', currentUser.value.id))

      if (partnership.value) {
        safeDb(db.from('mood_logs').insert({
          partnership_id: partnership.value.id,
          user_id: currentUser.value.id,
          mood,
          note: note.trim()
        }))
      }
    }
    triggerToast('Zmieniono nastrój')
  }

  const lastNudgeSentTimestamp = computed(() => {
    let latest = lastNudgeSentAt.value || 0
    const myRecent = nudgesList.value.find(n => n.sender_id === currentUser.value?.id)
    if (myRecent?.created_at) {
      const t = new Date(myRecent.created_at).getTime()
      if (t > latest) latest = t
    }
    return latest > 0 ? latest : null
  })

  const hasSentDailyNudge = computed(() => {
    if (!lastNudgeSentTimestamp.value) return false
    const elapsed = nowTimestamp.value - lastNudgeSentTimestamp.value
    return elapsed < NUDGE_COOLDOWN_MS
  })

  const nextNudgeRemainingMs = computed(() => {
    if (!lastNudgeSentTimestamp.value) return 0
    const elapsed = nowTimestamp.value - lastNudgeSentTimestamp.value
    return Math.max(0, NUDGE_COOLDOWN_MS - elapsed)
  })

  const formattedNextNudgeTime = computed(() => {
    const ms = nextNudgeRemainingMs.value
    if (ms <= 0) return ''
    const totalMinutes = Math.floor(ms / (60 * 1000))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0) {
      return `${hours} godz. ${minutes} min`
    }
    if (minutes > 0) {
      return `${minutes} min`
    }
    return 'mniej niż minutę'
  })

  let isSendingNudgeInProgress = false
  const sendNudge = async (nudgeType: string, message: string = '') => {
    if (isSendingNudgeInProgress) return false
    if (!partnership.value || !partnerUser.value) return false

    if (hasSentDailyNudge.value) {
      triggerToast('Szturchnięcie już wysłane')
      return false
    }

    isSendingNudgeInProgress = true
    try {
      if (!await verifyUserAndPartnershipAccess()) {
        return false
      }

      if (hasSentDailyNudge.value) {
        triggerToast('Szturchnięcie już wysłane')
        return false
      }

      const newNudge: NudgeItem = {
        id: 'ndg_' + Math.random().toString(36).substring(2, 9),
        partnership_id: partnership.value.id,
        sender_id: currentUser.value.id,
        receiver_id: partnerUser.value.id,
        nudge_type: nudgeType,
        message: message || undefined,
        created_at: new Date().toISOString()
      }

      if (!db) return false
      const { error: nudgeError } = await db.from('nudges').insert(newNudge)
      if (nudgeError) {
        if (nudgeError.code === '23505' || nudgeError.message?.includes('cooldown')) {
          lastNudgeSentAt.value = Date.now()
          triggerToast('Szturchnięcie już wysłane')
        } else {
          triggerToast('Nie udało się wysłać szturchnięcia. Spróbuj ponownie.', { type: 'warning' })
        }
        return false
      }

      const now = Date.now()
      lastNudgeSentAt.value = now
      if (typeof window !== 'undefined' && currentUser.value?.id) {
        try {
          localStorage.setItem(`duonest_last_nudge_ts_${currentUser.value.id}`, now.toString())
        } catch {}
      }

      nudgesList.value.unshift(newNudge)
      const { data: updatedProfile } = await db
        .from('profiles')
        .select('points')
        .eq('id', currentUser.value.id)
        .maybeSingle()
      currentUser.value.points = updatedProfile
        ? Number(updatedProfile.points) || 0
        : (Number(currentUser.value.points) || 0) + 5
      syncToStorage()

      broadcastToPartner('NUDGE_SEND', newNudge)

      triggerToast('Wysłano szturchnięcie (+5 pkt)')
      return true
    } finally {
      isSendingNudgeInProgress = false
    }
  }

  const updatePartnershipSettings = async (nestName: string, anniversaryDate: string) => {
    if (!partnership.value) return
    if (!await verifyUserAndPartnershipAccess()) return
    partnership.value.nest_name = nestName || partnership.value.nest_name
    partnership.value.anniversary_date = anniversaryDate || partnership.value.anniversary_date
    syncToStorage()

    broadcastToPartner('PARTNERSHIP_UPDATE', {
      nest_name: partnership.value.nest_name,
      anniversary_date: partnership.value.anniversary_date
    })

    if (db) {
      safeDb(db.from('partnerships').update({
        nest_name: partnership.value.nest_name,
        anniversary_date: partnership.value.anniversary_date
      }).eq('id', partnership.value.id))
    }
    triggerToast('Zapisano ustawienia')
  }

  const updateMyProfile = async (updates: {
    name?: string
    avatar_color?: string
    love_note?: string
    favorite_drink?: string
    favorite_treat?: string
    nest_name?: string
    anniversary_date?: string
  }) => {
    if (!await verifyUserAndPartnershipAccess()) return
    if (updates.name && updates.name.trim()) {
      currentUser.value.name = updates.name.trim()
    }
    if (updates.avatar_color) {
      currentUser.value.avatar_color = getCleanAccentColor(updates.avatar_color)
    }
    if (updates.love_note !== undefined) {
      currentUser.value.love_note = updates.love_note.trim()
    }
    if (updates.favorite_drink !== undefined) {
      currentUser.value.favorite_drink = updates.favorite_drink.trim()
    }
    if (updates.favorite_treat !== undefined) {
      currentUser.value.favorite_treat = updates.favorite_treat.trim()
    }

    if (partnership.value) {
      if (updates.nest_name && updates.nest_name.trim()) {
        partnership.value.nest_name = updates.nest_name.trim()
      }
      if (updates.anniversary_date) {
        partnership.value.anniversary_date = updates.anniversary_date
      }
    }

    syncToStorage()

    broadcastToPartner('PROFILE_UPDATE', {
      is_manual_edit: true,
      profile: {
        id: currentUser.value.id,
        name: currentUser.value.name,
        avatar_color: getCleanAccentColor(currentUser.value.avatar_color),
        love_note: currentUser.value.love_note,
        favorite_drink: currentUser.value.favorite_drink,
        favorite_treat: currentUser.value.favorite_treat,
        current_mood: currentUser.value.current_mood,
        mood_note: currentUser.value.mood_note
      },
      partnership: partnership.value ? {
        nest_name: partnership.value.nest_name,
        anniversary_date: partnership.value.anniversary_date
      } : undefined
    })

    if (db && isOnlineWithSupabase.value && currentUser.value.id) {
      const profileDbUpdates: Record<string, any> = {
        name: currentUser.value.name,
        love_note: currentUser.value.love_note,
        favorite_drink: currentUser.value.favorite_drink,
        favorite_treat: currentUser.value.favorite_treat
      }

      if (updates.avatar_color) {
        const cleanNewColor = getCleanAccentColor(updates.avatar_color)
        profileDbUpdates.avatar_color = cleanNewColor
      }

      safeDb(db.from('profiles').update(profileDbUpdates).eq('id', currentUser.value.id))

      if (partnership.value) {
        safeDb(db.from('partnerships').update({
          nest_name: partnership.value.nest_name,
          anniversary_date: partnership.value.anniversary_date
        }).eq('id', partnership.value.id))
      }
    }

    triggerToast('Zapisano profil')
  }

  const daysTogether = computed(() => {
    const dateStr = partnership.value?.anniversary_date || partnership.value?.created_at || new Date().toISOString()
    const start = new Date(dateStr).getTime()
    const now = Date.now()
    const diff = Math.max(0, now - start)
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
  })

  const currentUserAccentColor = computed(() => {
    return getCleanAccentColor(currentUser.value?.avatar_color, '#0f172a')
  })

  const partnerUserAccentColor = computed(() => {
    return getCleanAccentColor(partnerUser.value?.avatar_color, '#1e293b')
  })

  const getUserAccentColor = (userId?: string | null): string => {
    if (!userId) return '#64748b'
    if (currentUser.value && userId === currentUser.value.id) {
      return currentUserAccentColor.value
    }
    if (partnerUser.value && userId === partnerUser.value.id) {
      return partnerUserAccentColor.value
    }
    return '#64748b'
  }

  const getTaskCompleterId = (task: TaskItem): string | null => {
    if (task.completed_by) return task.completed_by
    if (task.assigned_to) return task.assigned_to
    if (task.created_by) return task.created_by
    return null
  }

  const userCompletedTasksCount = computed(() => {
    const myId = currentUser.value?.id
    if (!myId) return 0
    return tasksList.value.filter(t => t.is_completed && getTaskCompleterId(t) === myId).length
  })

  const partnerCompletedTasksCount = computed(() => {
    const pId = partnerUser.value?.id
    if (!pId) return 0
    return tasksList.value.filter(t => t.is_completed && getTaskCompleterId(t) === pId).length
  })

  const userRawTaskPoints = computed(() => {
    const myId = currentUser.value?.id
    if (!myId) return 0
    return tasksList.value
      .filter(t => t.is_completed && getTaskCompleterId(t) === myId)
      .reduce((sum, t) => sum + (Number(t.points) || 15), 0)
  })

  const partnerRawTaskPoints = computed(() => {
    const pId = partnerUser.value?.id
    if (!pId) return 0
    return tasksList.value
      .filter(t => t.is_completed && getTaskCompleterId(t) === pId)
      .reduce((sum, t) => sum + (Number(t.points) || 15), 0)
  })

  const userNudgePoints = computed(() => {
    const myId = currentUser.value?.id
    if (!myId) return 0
    return nudgesList.value.filter(n => n.sender_id === myId).length * 5
  })

  const partnerNudgePoints = computed(() => {
    const pId = partnerUser.value?.id
    if (!pId) return 0
    return nudgesList.value.filter(n => n.sender_id === pId).length * 5
  })

  const eventsEarnedPoints = computed(() => {
    return eventsList.value.filter(e => e.is_completed).length * 10
  })

  const sharedCompletedTasksPoints = computed(() => {
    const myId = currentUser.value?.id
    const pId = partnerUser.value?.id
    return tasksList.value
      .filter(t => t.is_completed && (!getTaskCompleterId(t) || (getTaskCompleterId(t) !== myId && getTaskCompleterId(t) !== pId)))
      .reduce((sum, t) => sum + (Number(t.points) || 15), 0)
  })

  const userEarnedPoints = computed(() => userRawTaskPoints.value + userNudgePoints.value)
  const partnerEarnedPoints = computed(() => partnerRawTaskPoints.value + partnerNudgePoints.value)

  const userPoints = computed(() => Math.max(0, Number(currentUser.value?.points) || 0))
  const partnerPoints = computed(() => Math.max(0, Number(partnerUser.value?.points) || 0))

  const nestPoints = computed(() => Math.max(0, userPoints.value + partnerPoints.value))

  const nestLevel = computed(() => {
    return Math.max(1, 1 + Math.floor(nestPoints.value / 50))
  })

  const pointsToNextLevel = computed(() => {
    const currentLvl = nestLevel.value
    const targetPoints = currentLvl * 50
    return Math.max(0, targetPoints - nestPoints.value)
  })

  const levelProgress = computed(() => {
    const pts = Math.max(0, nestPoints.value)
    const currentPointsInTier = pts % 50
    return Math.max(0, Math.min(100, Math.round((currentPointsInTier / 50) * 100)))
  })

  const userPointsPct = computed(() => {
    const totalPersonal = nestPoints.value
    if (totalPersonal <= 0) return 0
    return Math.min(100, Math.max(0, Math.round((userPoints.value / totalPersonal) * 100)))
  })

  const partnerPointsPct = computed(() => {
    const totalPersonal = nestPoints.value
    if (totalPersonal <= 0) return 0
    return Math.max(0, 100 - userPointsPct.value)
  })

  const addMilestone = async (title: string, targetPoints: number, assignedTo: string | null = null, description: string = '') => {
    if (!title.trim()) return
    if (!await verifyUserAndPartnershipAccess()) return
    const newMilestone: NestMilestone = {
      id: 'm_' + Math.random().toString(36).substring(2, 9),
      partnership_id: partnership.value?.id,
      title: title.trim(),
      description: description.trim(),
      target_points: Math.max(10, Number(targetPoints) || 50),
      assigned_to: assignedTo || null,
      is_completed: false,
      created_by: currentUser.value?.id,
      created_at: new Date().toISOString()
    }
    milestonesList.value.push(newMilestone)
    syncToStorage()
    broadcastToPartner('MILESTONE_ADD', newMilestone)
    if (db && partnership.value?.id) {
      safeDb(db.from('milestones').insert(newMilestone))
    }
    triggerToast('Dodano cel')
    return newMilestone
  }

  const updateMilestone = async (id: string, updates: Partial<NestMilestone>) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const idx = milestonesList.value.findIndex(m => m.id === id)
    if (idx === -1) return
    milestonesList.value[idx] = {
      ...milestonesList.value[idx],
      ...updates
    }
    syncToStorage()
    broadcastToPartner('MILESTONE_UPDATE', { id, updates })
    if (db) {
      safeDb(db.from('milestones').update(updates).eq('id', id))
    }
    triggerToast('Zaktualizowano cel')
  }

  const deleteMilestone = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    milestonesList.value = milestonesList.value.filter(m => m.id !== id)
    syncToStorage()
    broadcastToPartner('MILESTONE_DELETE', { id })
    if (db) {
      safeDb(db.from('milestones').delete().eq('id', id))
    }
    triggerToast('Usunięto cel')
  }

  const claimMilestone = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const m = milestonesList.value.find(i => i.id === id)
    if (!m || m.is_completed) return
    const now = new Date().toISOString()
    m.is_completed = true
    m.completed_at = now
    syncToStorage()
    broadcastToPartner('MILESTONE_CLAIM', { id, title: m.title, completed_at: now })
    if (db) {
      safeDb(db.from('milestones').update({ is_completed: true, completed_at: now }).eq('id', id))
    }
    triggerToast('Odebrano nagrodę')
  }

  const reactivateMilestone = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const m = milestonesList.value.find(i => i.id === id)
    if (!m || !m.is_completed) return
    m.is_completed = false
    m.completed_at = null
    syncToStorage()
    broadcastToPartner('MILESTONE_REACTIVATE', { id, title: m.title })
    if (db) {
      safeDb(db.from('milestones').update({ is_completed: false, completed_at: null }).eq('id', id))
    }
    triggerToast('Wznowiono cel')
  }

  const addWishlistItem = async (itemData: {
    title: string
    url?: string | null
    image_url?: string | null
    price?: string | null
    currency?: string | null
    site_name?: string | null
    note?: string | null
    for_user_id?: string | null
    is_visible_to_partner?: boolean
  }) => {
    if (!itemData.title || !itemData.title.trim()) return null
    if (!await verifyUserAndPartnershipAccess()) return null
    const partnershipId = partnership.value?.id || 'local_partnership'
    const userId = currentUser.value?.id || 'local_user'

    const newItem: WishlistItem = {
      id: 'wish_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      partnership_id: partnershipId,
      created_by: userId,
      for_user_id: itemData.for_user_id !== undefined ? itemData.for_user_id : userId,
      title: itemData.title.trim(),
      url: itemData.url ? itemData.url.trim() : null,
      image_url: itemData.image_url ? itemData.image_url.trim() : null,
      price: itemData.price ? itemData.price.trim() : null,
      currency: itemData.currency || 'PLN',
      site_name: itemData.site_name ? itemData.site_name.trim() : null,
      note: itemData.note ? itemData.note.trim() : null,
      is_visible_to_partner: itemData.is_visible_to_partner !== false,
      is_completed: false,
      completed_at: null,
      created_at: new Date().toISOString()
    }

    wishlistItems.value = [newItem, ...wishlistItems.value.filter(w => w.id !== newItem.id)]
    syncToStorage()

    if (db && isOnlineWithSupabase.value && partnership.value?.id) {
      safeDb(db.from('wishlist_items').insert(newItem))
    }

    if (newItem.is_visible_to_partner) {
      broadcastToPartner('WISHLIST_ADD', newItem)
    }

    triggerToast(!newItem.is_visible_to_partner ? 'Dodano niespodziankę' : 'Dodano marzenie')

    return newItem
  }

  const updateWishlistItem = async (id: string, updates: Partial<Omit<WishlistItem, 'id' | 'created_at' | 'created_by' | 'partnership_id'>>) => {
    if (!await verifyUserAndPartnershipAccess()) return null
    const idx = wishlistItems.value.findIndex(w => w.id === id)
    if (idx === -1) return
    const current = wishlistItems.value[idx]
    const oldVisibility = current.is_visible_to_partner
    const updated = { ...current, ...updates }
    wishlistItems.value = wishlistItems.value.map(w => w.id === id ? updated : w)
    syncToStorage()

    if (db && isOnlineWithSupabase.value && partnership.value?.id) {
      safeDb(db.from('wishlist_items').update(updates).eq('id', id))
    }

    if (updated.is_visible_to_partner) {
      if (!oldVisibility) {
        broadcastToPartner('WISHLIST_ADD', updated)
      } else {
        broadcastToPartner('WISHLIST_UPDATE', { id, updates, item: updated })
      }
    } else if (oldVisibility) {
      broadcastToPartner('WISHLIST_DELETE', { id })
    }

    triggerToast('Zaktualizowano marzenie')
    return updated
  }

  const deleteWishlistItem = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = wishlistItems.value.find(w => w.id === id)
    if (!item) return
    wishlistItems.value = wishlistItems.value.filter(w => w.id !== id)
    syncToStorage()

    if (db && isOnlineWithSupabase.value && partnership.value?.id) {
      safeDb(db.from('wishlist_items').delete().eq('id', id))
    }

    if (item.is_visible_to_partner) {
      broadcastToPartner('WISHLIST_DELETE', { id })
    }

    triggerToast('Usunięto marzenie')
  }

  const toggleWishlistCompleted = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = wishlistItems.value.find(w => w.id === id)
    if (!item) return
    const newCompleted = !item.is_completed
    const completedAt = newCompleted ? new Date().toISOString() : null
    wishlistItems.value = wishlistItems.value.map(w => w.id === id ? { ...w, is_completed: newCompleted, completed_at: completedAt } : w)
    syncToStorage()

    if (db && isOnlineWithSupabase.value && partnership.value?.id) {
      safeDb(db.from('wishlist_items').update({
        is_completed: newCompleted,
        completed_at: completedAt
      }).eq('id', id))
    }

    if (newCompleted) {
      triggerToast('Spełniono marzenie', { type: 'wishlist' })
    }
  }

  let _refreshWishlistInFlight = false
  let _refreshWishlistQueued = false

  const refreshWishlist = async () => {
    if (_refreshWishlistInFlight) {
      _refreshWishlistQueued = true
      return
    }

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (!client || !pId) return

    _refreshWishlistInFlight = true
    try {
      const { data, error } = await client
        .from('wishlist_items')
        .select('*')
        .eq('partnership_id', pId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const myIds = new Set([currentUser.value?.id, authUser.value?.id].filter(Boolean))
        const filtered = data.filter((item: WishlistItem) => item.is_visible_to_partner || myIds.has(item.created_by))
        const remoteIds = new Set(filtered.map((i: WishlistItem) => i.id))
        const localOnly = wishlistItems.value.filter(w => !remoteIds.has(w.id))
        wishlistItems.value = [...filtered, ...localOnly]
        syncToStorage()
      }
    } catch (e) {
      console.warn('refreshWishlist error:', e)
    } finally {
      _refreshWishlistInFlight = false
      if (_refreshWishlistQueued) {
        _refreshWishlistQueued = false
        setTimeout(() => refreshWishlist(), 300)
      }
    }
  }

  const addMovie = async (movie: {
    title: string
    original_title?: string | null
    tmdb_id?: number | null
    media_type: 'movie' | 'tv' | 'anime'
    poster_path?: string | null
    backdrop_path?: string | null
    release_year?: string | null
    genres?: string[] | null
    overview?: string | null
    vote_average?: number | null
    status?: 'planned' | 'watching' | 'watched'
    target_date?: string | null
  }): Promise<MovieItem | null> => {
    if (!movie.title.trim()) return null
    if (!await verifyUserAndPartnershipAccess()) return null

    const cleanTitle = normalizeMovieTitle(movie.title)
    const cleanOrig = normalizeMovieTitle(movie.original_title)
    const existing = moviesList.value.find(m => {
      if (movie.tmdb_id && m.tmdb_id && Number(m.tmdb_id) === Number(movie.tmdb_id)) {
        return true
      }
      const mTitle = normalizeMovieTitle(m.title)
      const mOrig = normalizeMovieTitle(m.original_title)
      if (cleanTitle && mTitle && cleanTitle === mTitle) return true
      if (cleanTitle && mOrig && cleanTitle === mOrig) return true
      if (cleanOrig && mTitle && cleanOrig === mTitle) return true
      if (cleanOrig && mOrig && cleanOrig === mOrig) return true
      return false
    })

    if (existing) {
      triggerToast('Film jest już na liście', {
        type: 'movies'
      })
      return existing
    }

    const pId = partnership.value?.id || currentUser.value?.partnership_id || ''
    const newDoc: MovieItem = {
      id: 'mov_' + Math.random().toString(36).substring(2, 9),
      partnership_id: pId,
      tmdb_id: movie.tmdb_id || null,
      title: movie.title.trim(),
      original_title: movie.original_title || null,
      media_type: movie.media_type || 'movie',
      poster_path: movie.poster_path || null,
      backdrop_path: movie.backdrop_path || null,
      release_year: movie.release_year || null,
      genres: movie.genres || [],
      overview: movie.overview || null,
      vote_average: movie.vote_average || null,
      status: movie.status || 'planned',
      target_date: movie.target_date || null,
      added_by: currentUser.value?.id || null,
      watched_at: movie.status === 'watched' ? new Date().toISOString() : null,
      reviews: {},
      last_watched_season: (movie as any).last_watched_season !== undefined ? (movie as any).last_watched_season : ((movie.media_type === 'tv' || movie.media_type === 'anime') ? 1 : null),
      last_watched_episode: (movie as any).last_watched_episode !== undefined ? (movie as any).last_watched_episode : ((movie.media_type === 'tv' || movie.media_type === 'anime') ? 1 : null),
      created_at: new Date().toISOString()
    }

    moviesList.value = [newDoc, ...moviesList.value.filter(m => m.id !== newDoc.id)]
    syncToStorage()

    broadcastToPartner('MOVIE_ADD', newDoc)

    const client = getSupabaseClient()
    if (client && pId) {
      safeDb(client.from('movies').insert(newDoc))
    }

    triggerToast('Dodano film', { type: 'movies' })
    return newDoc
  }

  const updateMovie = async (id: string, updates: Partial<MovieItem>) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const idx = moviesList.value.findIndex(m => m.id === id)
    if (idx === -1) return
    const current = moviesList.value[idx]
    const updated: MovieItem = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    }
    moviesList.value = moviesList.value.map(m => m.id === id ? updated : m)
    syncToStorage()

    broadcastToPartner('MOVIE_UPDATE', updated)

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('movies').update(updates).eq('id', id))
    }
  }

  const deleteMovie = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = moviesList.value.find(m => m.id === id)
    if (!item) return
    moviesList.value = moviesList.value.filter(m => m.id !== id)
    syncToStorage()

    broadcastToPartner('MOVIE_DELETE', { id })

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('movies').delete().eq('id', id))
    }

    triggerToast('Usunięto film')
  }

  const toggleMovieWatched = async (id: string, targetStatus?: 'planned' | 'watching' | 'watched') => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = moviesList.value.find(m => m.id === id)
    if (!item) return

    const newStatus = targetStatus || (item.status === 'watched' ? 'planned' : 'watched')
    const watchedAt = newStatus === 'watched' ? new Date().toISOString() : null

    const updated: MovieItem = {
      ...item,
      status: newStatus,
      watched_at: watchedAt,
      updated_at: new Date().toISOString()
    }

    moviesList.value = moviesList.value.map(m => m.id === id ? updated : m)
    syncToStorage()

    broadcastToPartner('MOVIE_TOGGLE_WATCHED', { id, status: newStatus, watched_at: watchedAt })

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('movies').update({ status: newStatus, watched_at: watchedAt }).eq('id', id))
    }

    if (newStatus === 'watched') {
      triggerToast('Obejrzano film', { type: 'movies' })
    } else if (newStatus === 'watching') {
      triggerToast('Rozpoczęto seans', { type: 'movies' })
    } else {
      triggerToast('Przeniesiono do planowanych')
    }
  }

  const saveMovieReview = async (movieId: string, rating: number, comment: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = moviesList.value.find(m => m.id === movieId)
    if (!item) return
    const myId = currentUser.value?.id
    if (!myId) return

    const reviews = { ...(item.reviews || {}) }
    reviews[myId] = {
      user_id: myId,
      author_name: currentUser.value?.name || 'Ja',
      rating: Math.max(1, Math.min(10, Math.round(rating))),
      comment: comment.trim(),
      updated_at: new Date().toISOString()
    }

    const updated: MovieItem = {
      ...item,
      reviews,
      updated_at: new Date().toISOString()
    }

    moviesList.value = moviesList.value.map(m => m.id === movieId ? updated : m)
    syncToStorage()

    broadcastToPartner('MOVIE_UPDATE', { id: movieId, reviews, last_reviewer_id: myId })

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('movies').update({ reviews }).eq('id', movieId))
    }

    triggerToast('Zapisano recenzję', { type: 'movies' })
  }

  const updateMovieProgress = async (id: string, season: number, episode: number) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = moviesList.value.find(m => m.id === id)
    if (!item) return

    const cleanSeason = Math.max(1, Math.floor(season || 1))
    const cleanEpisode = Math.max(1, Math.floor(episode || 1))

    const updated: MovieItem = {
      ...item,
      last_watched_season: cleanSeason,
      last_watched_episode: cleanEpisode,
      updated_at: new Date().toISOString()
    }

    moviesList.value = moviesList.value.map(m => m.id === id ? updated : m)
    syncToStorage()

    broadcastToPartner('MOVIE_UPDATE', {
      id,
      last_watched_season: cleanSeason,
      last_watched_episode: cleanEpisode,
      updated_at: updated.updated_at
    })

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('movies').update({
        last_watched_season: cleanSeason,
        last_watched_episode: cleanEpisode,
        updated_at: updated.updated_at
      }).eq('id', id))
    }

    triggerToast('Zaktualizowano postęp', {
      type: 'movies'
    })
  }

  const refreshMovies = async () => {
    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (!client || !pId) return
    try {
      const { data, error } = await client
        .from('movies')
        .select('*')
        .eq('partnership_id', pId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const remoteIds = new Set(data.map((i: MovieItem) => i.id))
        const localOnly = moviesList.value.filter(m => !remoteIds.has(m.id))
        moviesList.value = deduplicateMoviesList([...data, ...localOnly])
        syncToStorage()
      }
    } catch (e) {
      console.warn('refreshMovies error:', e)
    }
  }

  const addMeal = async (meal: {
    date?: string
    title: string
    day_name?: string
    category?: string
    area?: string
    cook_id?: string
    image_url?: string
    source?: 'custom' | 'api' | 'import'
    api_id?: string
    ingredients?: MealIngredient[]
    instructions?: string
    youtube_url?: string
    recipe_url?: string
  }): Promise<MealItem | null> => {
    if (!meal.title.trim()) return null
    if (!await verifyUserAndPartnershipAccess()) return null

    const pId = partnership.value?.id || currentUser.value?.partnership_id || ''
    const cleanDate = meal.date ? String(meal.date).trim() : ''
    const newDoc: MealItem = {
      id: 'meal_' + Math.random().toString(36).substring(2, 9),
      partnership_id: pId,
      date: cleanDate,
      day_name: meal.day_name || '',
      title: meal.title.trim(),
      category: meal.category || '',
      area: meal.area || '',
      cook_id: meal.cook_id || 'me',
      image_url: meal.image_url || '',
      source: meal.source || 'custom',
      api_id: meal.api_id || '',
      ingredients: meal.ingredients || [],
      instructions: meal.instructions || '',
      youtube_url: meal.youtube_url || '',
      recipe_url: meal.recipe_url || '',
      is_completed: false,
      completed_at: null,
      created_by: currentUser.value?.id || null,
      created_at: new Date().toISOString()
    }

    if (cleanDate) {
      mealsList.value = [newDoc, ...mealsList.value.filter(m => !(m.date === cleanDate && m.partnership_id === pId))]
    } else {
      const existingIdx = mealsList.value.findIndex(m => {
        if (newDoc.api_id && m.api_id && String(m.api_id) === String(newDoc.api_id)) return true
        if (!newDoc.api_id && !m.api_id && m.title.trim().toLowerCase() === newDoc.title.trim().toLowerCase()) return true
        return false
      })

      if (existingIdx !== -1) {
        const existing = mealsList.value[existingIdx]
        const updated: MealItem = {
          ...existing,
          title: newDoc.title,
          category: newDoc.category || existing.category,
          area: newDoc.area || existing.area,
          image_url: newDoc.image_url || existing.image_url,
          ingredients: (newDoc.ingredients && newDoc.ingredients.length > 0) ? newDoc.ingredients : existing.ingredients,
          instructions: newDoc.instructions || existing.instructions,
          youtube_url: newDoc.youtube_url || existing.youtube_url,
          recipe_url: newDoc.recipe_url || existing.recipe_url,
          updated_at: new Date().toISOString()
        }
        mealsList.value = mealsList.value.map((m, idx) => idx === existingIdx ? updated : m)
        syncToStorage()
        broadcastToPartner('MEAL_UPDATE', updated)
        const client = getCleanDbClient() || getSupabaseClient()
        if (client && pId) {
          safeDb(client.from('meals').upsert(updated))
        }
        triggerToast('Zaktualizowano przepis')
        return updated
      }

      mealsList.value = [newDoc, ...mealsList.value]
    }

    syncToStorage()

    broadcastToPartner('MEAL_ADD', newDoc)

    const client = getCleanDbClient() || getSupabaseClient()
    if (client && pId) {
      safeDb(client.from('meals').upsert(newDoc))
    }

    if (cleanDate) {
      triggerToast('Zaplanowano obiad')
    } else {
      triggerToast('Dodano przepis')
    }
    return newDoc
  }

  const updateMeal = async (id: string, updates: Partial<MealItem>) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const idx = mealsList.value.findIndex(m => m.id === id)
    if (idx === -1) return
    const current = mealsList.value[idx]
    const updated: MealItem = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    }
    mealsList.value = mealsList.value.map(m => m.id === id ? updated : m)
    syncToStorage()

    broadcastToPartner('MEAL_UPDATE', updated)

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('meals').update(updates).eq('id', id))
    }
  }

  const deleteMeal = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = mealsList.value.find(m => m.id === id)
    if (!item) return
    mealsList.value = mealsList.value.filter(m => m.id !== id)
    syncToStorage()

    broadcastToPartner('MEAL_DELETE', { id })

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('meals').delete().eq('id', id))
    }

    triggerToast('Usunięto z planu')
  }

  const deleteSavedRecipe = async (recipe: { key?: string; api_id?: string; title?: string; rawTitle?: string; titlePl?: string }) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id

    const tL = (recipe.title || '').trim().toLowerCase()
    const rawTL = (recipe.rawTitle || '').trim().toLowerCase()
    const tPlL = (recipe.titlePl || '').trim().toLowerCase()
    const apiIdStr = recipe.api_id ? String(recipe.api_id) : ''

    const matching = mealsList.value.filter(m => {
      if (apiIdStr && m.api_id && String(m.api_id) === apiIdStr) {
        return true
      }
      const mTL = (m.title || '').trim().toLowerCase()
      const mPlL = (m.titlePl || '').trim().toLowerCase()
      if (tL && (mTL === tL || mPlL === tL)) return true
      if (rawTL && (mTL === rawTL || mPlL === rawTL)) return true
      if (tPlL && (mTL === tPlL || mPlL === tPlL)) return true
      return false
    })

    if (matching.length === 0) return

    const deletedIds = matching.map(m => m.id)
    mealsList.value = mealsList.value.filter(m => !deletedIds.includes(m.id))
    syncToStorage()

    for (const id of deletedIds) {
      broadcastToPartner('MEAL_DELETE', { id })
      if (client && pId) {
        safeDb(client.from('meals').delete().eq('id', id))
      }
    }

    triggerToast('Usunięto przepis')
  }

  const toggleMealCompleted = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = mealsList.value.find(m => m.id === id)
    if (!item) return
    const newStatus = !item.is_completed
    const completedAt = newStatus ? new Date().toISOString() : null

    item.is_completed = newStatus
    item.completed_at = completedAt
    mealsList.value = [...mealsList.value]
    syncToStorage()

    broadcastToPartner('MEAL_TOGGLE_COMPLETED', {
      id,
      title: item.title,
      titlePl: item.titlePl,
      is_completed: newStatus,
      completed_at: completedAt
    })

    const client = getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('meals').update({ is_completed: newStatus, completed_at: completedAt }).eq('id', id))
    }

    if (newStatus) {
      triggerToast('Obiad zjedzony')
    }
  }

  const addIngredientsToShopping = async (ingredients: { name: string; measure?: string }[]): Promise<number> => {
    if (!ingredients || ingredients.length === 0) return 0
    let count = 0
    for (const ing of ingredients) {
      if (!ing.name || !ing.name.trim()) continue
      const title = ing.measure && ing.measure.trim() ? `${ing.name.trim()} (${ing.measure.trim()})` : ing.name.trim()
      await addShoppingItem(title, 'Spożywcze', '1')
      count++
    }
    triggerToast('Dodano do zakupów')
    return count
  }

  const refreshMeals = async () => {
    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (!client || !pId) return
    try {
      const { data, error } = await client
        .from('meals')
        .select('*')
        .eq('partnership_id', pId)
        .order('date', { ascending: true })

      if (!error && data) {
        mealsList.value = data
        syncToStorage()
      }
    } catch (_) {}
  }

  const addSavingsGoal = async (payload: {
    title: string
    target_amount: number
    initial_deposit?: number
    category?: 'travel' | 'home' | 'gadget' | 'date' | 'emergency' | 'other'
    currency?: string
    target_date?: string | null
    icon?: string
    color?: string
  }): Promise<SavingsGoal | null> => {
    if (!partnership.value?.id) return null
    if (!await verifyUserAndPartnershipAccess()) return null

    const cleanTitle = (payload.title || '').trim().replace(/\s+/g, ' ').slice(0, 100)
    if (!cleanTitle) return null

    const targetAmount = Math.max(1, Math.min(999999999, Math.round((Number(payload.target_amount) || 0) * 100) / 100))
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null

    const initialDeposit = Math.max(0, Math.min(targetAmount, Math.round((Number(payload.initial_deposit) || 0) * 100) / 100))

    const cleanCategory = ['travel', 'home', 'gadget', 'date', 'emergency', 'other'].includes(payload.category || '')
      ? (payload.category as any)
      : 'travel'

    const cleanCurrency = ['PLN', 'EUR', 'USD', 'GBP'].includes(payload.currency || '')
      ? (payload.currency as string)
      : 'PLN'

    const cleanTargetDate = payload.target_date && /^\d{4}-\d{2}-\d{2}$/.test(payload.target_date)
      ? payload.target_date
      : null

    const cleanIcon = ['airplane', 'home', 'gadget', 'date', 'shield', 'sparkles', 'car', 'gift'].includes(payload.icon || '')
      ? (payload.icon as string)
      : 'airplane'

    const cleanColor = payload.color && /^#[0-9a-fA-F]{6}$/.test(payload.color)
      ? payload.color
      : '#0284c7'

    const goalId = 'svg_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
    const isCompleted = initialDeposit >= targetAmount && targetAmount > 0

    const newGoal: SavingsGoal = {
      id: goalId,
      partnership_id: partnership.value.id,
      title: cleanTitle,
      category: cleanCategory,
      target_amount: targetAmount,
      current_amount: initialDeposit,
      currency: cleanCurrency,
      target_date: cleanTargetDate,
      icon: cleanIcon,
      color: cleanColor,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      created_by: currentUser.value.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    savingsGoals.value = [newGoal, ...savingsGoals.value]

    let initialContrib: SavingsContribution | null = null
    if (initialDeposit > 0) {
      initialContrib = {
        id: 'sct_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        goal_id: goalId,
        partnership_id: partnership.value.id,
        user_id: currentUser.value.id,
        amount: initialDeposit,
        note: 'Wpłata początkowa',
        created_at: new Date().toISOString()
      }
      savingsContributions.value = [initialContrib, ...savingsContributions.value]
    }

    syncToStorage()
    broadcastToPartner('SAVINGS_GOAL_ADD', newGoal)
    if (initialContrib) {
      broadcastToPartner('SAVINGS_CONTRIBUTION_ADD', {
        goalId,
        goalTitle: cleanTitle,
        contribution: initialContrib,
        newCurrentAmount: initialDeposit,
        isCompleted
      })
    }

    const client = getCleanDbClient() || getSupabaseClient()
    if (client && isOnlineWithSupabase.value) {
      safeDb(client.from('savings_goals').insert(newGoal))
      if (initialContrib) {
        safeDb(client.from('savings_contributions').insert(initialContrib))
      }
    }

    triggerToast('Utworzono nową skarbonkę!')
    return newGoal
  }

  const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>): Promise<boolean> => {
    if (!await verifyUserAndPartnershipAccess()) return false
    const goal = savingsGoals.value.find(g => g.id === id)
    if (!goal) return false

    const safeUpdates: Partial<SavingsGoal> = {
      updated_at: new Date().toISOString()
    }

    if (typeof updates.title === 'string' && updates.title.trim()) {
      safeUpdates.title = updates.title.trim().replace(/\s+/g, ' ').slice(0, 100)
    }
    if (typeof updates.target_amount === 'number' && updates.target_amount > 0) {
      safeUpdates.target_amount = Math.round(updates.target_amount * 100) / 100
      safeUpdates.is_completed = goal.current_amount >= safeUpdates.target_amount
    }
    if (updates.category && ['travel', 'home', 'gadget', 'date', 'emergency', 'other'].includes(updates.category)) {
      safeUpdates.category = updates.category
    }
    if (updates.target_date !== undefined) {
      safeUpdates.target_date = updates.target_date && /^\d{4}-\d{2}-\d{2}$/.test(updates.target_date) ? updates.target_date : null
    }
    if (updates.icon && ['airplane', 'home', 'gadget', 'date', 'shield', 'sparkles', 'car', 'gift'].includes(updates.icon)) {
      safeUpdates.icon = updates.icon
    }
    if (updates.color && /^#[0-9a-fA-F]{6}$/.test(updates.color)) {
      safeUpdates.color = updates.color
    }

    Object.assign(goal, safeUpdates)
    syncToStorage()

    broadcastToPartner('SAVINGS_GOAL_UPDATE', { id, title: goal.title, updates: safeUpdates })

    const client = getCleanDbClient() || getSupabaseClient()
    if (client && isOnlineWithSupabase.value) {
      safeDb(client.from('savings_goals').update(safeUpdates).eq('id', id).eq('partnership_id', goal.partnership_id))
    }

    triggerToast('Zaktualizowano cel')
    return true
  }

  const deleteSavingsGoal = async (id: string): Promise<boolean> => {
    if (!await verifyUserAndPartnershipAccess()) return false
    const goal = savingsGoals.value.find(g => g.id === id)
    if (!goal) return false

    savingsGoals.value = savingsGoals.value.filter(g => g.id !== id)
    savingsContributions.value = savingsContributions.value.filter(c => c.goal_id !== id)
    syncToStorage()

    broadcastToPartner('SAVINGS_GOAL_DELETE', { id })

    const client = getCleanDbClient() || getSupabaseClient()
    if (client && isOnlineWithSupabase.value) {
      safeDb(client.from('savings_goals').delete().eq('id', id).eq('partnership_id', goal.partnership_id))
    }

    triggerToast('Usunięto skarbonkę')
    return true
  }

  const addSavingsContribution = async (goalId: string, amount: number, note?: string): Promise<boolean> => {
    if (!partnership.value?.id) return false
    if (!await verifyUserAndPartnershipAccess()) return false
    const goal = savingsGoals.value.find(g => g.id === goalId)
    if (!goal) return false

    const cleanAmount = Math.round((Number(amount) || 0) * 100) / 100
    if (!Number.isFinite(cleanAmount) || cleanAmount === 0) return false

    const cleanNote = (note || '').trim().slice(0, 150) || null

    const contributionId = 'sct_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
    const newContrib: SavingsContribution = {
      id: contributionId,
      goal_id: goalId,
      partnership_id: partnership.value.id,
      user_id: currentUser.value.id,
      amount: cleanAmount,
      note: cleanNote,
      created_at: new Date().toISOString()
    }

    savingsContributions.value = [newContrib, ...savingsContributions.value]

    const newCurrent = Math.max(0, Math.round((goal.current_amount + cleanAmount) * 100) / 100)
    const nowCompleted = newCurrent >= goal.target_amount && goal.target_amount > 0

    goal.current_amount = newCurrent
    goal.is_completed = nowCompleted
    if (nowCompleted && !goal.completed_at) {
      goal.completed_at = new Date().toISOString()
    }
    goal.updated_at = new Date().toISOString()

    syncToStorage()

    broadcastToPartner('SAVINGS_CONTRIBUTION_ADD', {
      goalId,
      goalTitle: goal.title,
      contribution: newContrib,
      newCurrentAmount: newCurrent,
      isCompleted: nowCompleted
    })

    const client = getCleanDbClient() || getSupabaseClient()
    if (client && isOnlineWithSupabase.value) {
      safeDb(client.from('savings_contributions').insert(newContrib))
    }

    triggerToast(cleanAmount > 0 ? `Wpłacono ${cleanAmount} zł do skarbonki!` : `Wypłacono ${Math.abs(cleanAmount)} zł`)
    return true
  }

  const deleteSavingsContribution = async (id: string): Promise<boolean> => {
    if (!await verifyUserAndPartnershipAccess()) return false
    const contrib = savingsContributions.value.find(c => c.id === id)
    if (!contrib) return false

    const goal = savingsGoals.value.find(g => g.id === contrib.goal_id)

    savingsContributions.value = savingsContributions.value.filter(c => c.id !== id)

    if (goal) {
      const remainingForGoal = savingsContributions.value.filter(c => c.goal_id === goal.id)
      const recalculated = remainingForGoal.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      goal.current_amount = Math.max(0, Math.round(recalculated * 100) / 100)
      goal.is_completed = goal.current_amount >= goal.target_amount && goal.target_amount > 0
    }

    syncToStorage()

    broadcastToPartner('SAVINGS_CONTRIBUTION_DELETE', {
      id,
      goalId: contrib.goal_id,
      newCurrentAmount: goal?.current_amount,
      isCompleted: goal?.is_completed
    })

    const client = getCleanDbClient() || getSupabaseClient()
    if (client && isOnlineWithSupabase.value) {
      safeDb(client.from('savings_contributions').delete().eq('id', id).eq('partnership_id', contrib.partnership_id))
    }

    triggerToast('Usunięto wpis z historii')
    return true
  }

  return {
    authUser,
    authSession,
    isAuthenticated,
    isAuthLoading,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
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
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addSavingsContribution,
    deleteSavingsContribution,
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    toggleWishlistCompleted,
    refreshWishlist,
    addMovie,
    updateMovie,
    updateMovieProgress,
    deleteMovie,
    toggleMovieWatched,
    saveMovieReview,
    refreshMovies,
    addMeal,
    updateMeal,
    deleteMeal,
    deleteSavedRecipe,
    toggleMealCompleted,
    addIngredientsToShopping,
    refreshMeals,
    updatePet,
    isPaired,
    isOnlineWithSupabase,
    dbSchemaStatus,
    realtimeStatus,
    isPartnerOnline,
    partnerLastSeenAt,
    activeToastMessage,
    activeToastItem,
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
    addMilestone,
    updateMilestone,
    deleteMilestone,
    claimMilestone,
    reactivateMilestone,
    initializeClientState,
    initSupabaseSync,
    triggerToast,
    dismissToast,
    updateMyName,
    updateMyProfile,
    pairWithCode,
    disconnectPartnership,
    clearPartnershipData,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCompletedShopping,
    updateShoppingItem,
    addTask,
    toggleTask,
    deleteTask,
    addEvent,
    updateEvent,
    toggleEventCompleted,
    deleteEvent,
    updateMood,
    sendNudge,
    hasSentDailyNudge,
    formattedNextNudgeTime,
    nextNudgeRemainingMs,
    activeDailySubTab,
    activeOrgSubTab,
    activeTasksMainTab,
    activeLeisureSubTab,
    updatePartnershipSettings,
    subscribeToPairingChannel,
    checkDbPairingStatus,
    normalizePairingCode,
    verifyUserAndPartnershipAccess,
    requestPasswordReset,
    completePasswordReset,
    verifyEmailForProfile,
    resendVerificationEmail,
    legacyRecoveryState,
    syncUserProfileWithAuth,
    changeUserPassword
  }
}