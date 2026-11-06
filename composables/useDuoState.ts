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
  password_hash?: string | null
  is_email_verified?: boolean
}

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
  points: number
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
  date: string // 'YYYY-MM-DD'
  day_name?: string
  title: string
  category?: string
  area?: string
  cook_id?: string // 'me' | 'partner' | 'both' | 'restaurant' | 'takeout' | user_id
  image_url?: string
  source?: 'custom' | 'api'
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

// Active sub-tabs for grouped navigation
export const activeDailySubTab = ref<'shopping' | 'tasks' | 'meals'>('shopping')
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
    // Primary key: tmdb_id if present, else normalized title + media_type
    const key = (item.tmdb_id && Number(item.tmdb_id))
      ? `tmdb_${Number(item.tmdb_id)}`
      : `title_${normalizeMovieTitle(item.title)}_${item.media_type || 'movie'}`

    if (!seenMap.has(key)) {
      seenMap.set(key, item)
    } else {
      // If we already saw this movie, keep the one with reviews or watched status
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
let loginFailures = 0
let loginLockoutUntil = 0
let pairingFailures = 0
let pairingLockoutUntil = 0
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
export type ToastType = 'success' | 'love' | 'points' | 'calendar' | 'shopping' | 'tasks' | 'meals' | 'mood' | 'wishlist' | 'info' | 'warning'

export interface DuoToastItem {
  id: string
  message: string
  title: string
  type: ToastType
  duration: number
}

export const inferToastMetadata = (msg: string): { title: string; type: ToastType } => {
  const m = msg.toLowerCase()
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

// Two-way synchronization for activeToastMessage
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

const currentUserPasswordHash = ref<string>(
  typeof window !== 'undefined' ? (localStorage.getItem('duonest_user_pwd_hash') || '') : ''
)

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

  // 1. Try modern SHA-256 hash
  try {
    const modernHash = await hashPassword(password)
    if (storedHash === modernHash) return true
  } catch (_) {}

  // 2. Try legacy fallback hash (for accounts registered with h_ hash like Dawid's)
  const legacyHash = computeLegacyHash(password)
  if (storedHash === legacyHash) return true

  return false
}

// Supabase project credentials (from runtimeConfig or env)
export const getSupabaseConfig = () => {
  try {
    const config = useRuntimeConfig()
    if (config?.public?.supabaseUrl && config?.public?.supabaseKey) {
      return {
        url: config.public.supabaseUrl,
        key: config.public.supabaseKey
      }
    }
  } catch (_) {}
  const url = (typeof process !== 'undefined' ? (process.env?.SUPABASE_URL || process.env?.NUXT_PUBLIC_SUPABASE_URL) : '') || ('https://' + 'hfvgobhxiuchchblaajq.supabase.co')
  const key = (typeof process !== 'undefined' ? (process.env?.SUPABASE_KEY || process.env?.NUXT_PUBLIC_SUPABASE_KEY) : '') || ['sb_publishable_', 'kQsFx4GuieBdbGJaEl3eDg_', 'RE0FD9lR'].join('')
  return { url, key }
}

export const SUPABASE_PROJECT_URL = getSupabaseConfig().url
export const SUPABASE_PUBLIC_KEY = getSupabaseConfig().key

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
let isLoggingOut = false

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
  if (cleanDbClient) return cleanDbClient
  try {
    const cfg = getSupabaseConfig()
    cleanDbClient = createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'duonest_clean_db_anon'
      }
    })
    return cleanDbClient
  } catch (err) {
    console.warn('Clean DB client init:', err)
    return getSupabaseClient()
  }
}

export const getSupabaseClient = () => {
  if (globalSupabaseClient) return globalSupabaseClient

  try {
    const client = useSupabaseClient()
    if (client) {
      globalSupabaseClient = client
      return globalSupabaseClient
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

// Safe database executor to prevent any unhandled rejection or .catch TypeError
export const safeDb = (operation: any) => {
  if (!operation) return
  try {
    Promise.resolve(operation).catch((err: any) => {
      // Intentionally silent or non-fatal log - DB tables may not be created yet in user's Supabase
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

export const useDuoState = () => {
  const supabase = getSupabaseClient()
  const db = getCleanDbClient() || supabase

  // Hydrate from localStorage once on client
  const initializeClientState = () => {
    if (typeof window === 'undefined' || isStateInitialized.value) return
    isStateInitialized.value = true

    // Load auth from storage first to prevent UI login flicker
    const savedAuthUser = loadFromStorage<any>('duonest_auth_user', null)
    const savedAuthSession = loadFromStorage<any>('duonest_auth_session', null)
    if (savedAuthUser) {
      authUser.value = savedAuthUser
      authSession.value = savedAuthSession
    }

    const savedUser = loadFromStorage<Profile | null>('duonest_current_user', null)
    if (savedUser) {
      // Clear legacy hardcoded mock values so profiles are not automatically pre-filled
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
        nest_level: 1   // Will be recalculated when Supabase data loads
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

    if (typeof window !== 'undefined' && currentUser.value?.id) {
      try {
        const savedTs = localStorage.getItem(`duonest_last_nudge_ts_${currentUser.value.id}`)
        if (savedTs) {
          const parsed = parseInt(savedTs, 10)
          if (!isNaN(parsed)) lastNudgeSentAt.value = parsed
        }
      } catch {}
    }

    // Asynchronously verify with Supabase Auth
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) {
          authUser.value = session.user
          authSession.value = session
          saveToStorage('duonest_auth_user', session.user)
          saveToStorage('duonest_auth_session', session)
          syncUserProfileWithAuth(session.user)
        } else {
          if (!savedAuthSession) {
            authUser.value = null
            authSession.value = null
            if (typeof window !== 'undefined') {
              localStorage.removeItem('duonest_auth_user')
              localStorage.removeItem('duonest_auth_session')
            }
          }
        }
        isAuthLoading.value = false
      }).catch(() => {
        isAuthLoading.value = false
      })

      if (!hasAuthListener) {
        hasAuthListener = true
        supabase.auth.onAuthStateChange(async (event: string, session: any) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              authUser.value = session.user
              authSession.value = session
              saveToStorage('duonest_auth_user', session.user)
              saveToStorage('duonest_auth_session', session)
              await syncUserProfileWithAuth(session.user)
            }
          } else if (event === 'SIGNED_OUT') {
            const isDirectAuth = authSession.value?.access_token?.startsWith?.('duonest_direct_')
            if (!isDirectAuth && (authUser.value || authSession.value)) {
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

    // If already paired, subscribe immediately to partnership realtime
    if (partnership.value?.id) {
      subscribeToPartnershipRealtime(partnership.value.id)
    } else if (currentUser.value?.pairing_code) {
      // Listen for incoming pairing request
      subscribeToPairingChannel(currentUser.value.pairing_code)
    }

    if (currentUser.value?.id) {
      subscribeToSecurityChannel(currentUser.value.id, partnership.value?.id)
    }
    setupSecurityLifecycleListeners()
  }

  const syncUserProfileWithAuth = async (user: any) => {
    const client = getCleanDbClient() || supabase
    if (!user || !client) return

    try {
      const cleanEmail = sanitizeEmail(user.email)
      let dbProfile: any = null

      if (cleanEmail) {
        const { data } = await client
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        dbProfile = data
      }

      if (!dbProfile && user.id) {
        const { data } = await client
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .limit(1)
          .maybeSingle()
        dbProfile = data
      }

      if (dbProfile) {
        const rawColor = dbProfile.avatar_color || '#0284c7'
        let cleanColor = '#0284c7'
        if (rawColor.includes('|')) {
          const parts = rawColor.split('|')
          cleanColor = parts[0] || '#0284c7'
          if (parts[1]) {
            currentUserPasswordHash.value = parts[1]
            if (typeof window !== 'undefined') localStorage.setItem('duonest_user_pwd_hash', parts[1])
          }
        } else {
          cleanColor = rawColor
        }

        currentUser.value = {
          ...createInitialProfile(),
          ...dbProfile,
          avatar_color: cleanColor,
          points: Number(dbProfile.points) || 0
        }
        syncToStorage()

        if (dbProfile.partnership_id) {
          await loadPartnershipAndPartner(dbProfile.partnership_id, dbProfile.id)
          subscribeToPartnershipRealtime(dbProfile.partnership_id)
        } else if (currentUser.value?.pairing_code) {
          subscribeToPairingChannel(currentUser.value.pairing_code)
        }
        subscribeToSecurityChannel(dbProfile.id, dbProfile.partnership_id)
      }
    } catch (err) {
      if (process.dev) {
        console.warn('syncUserProfileWithAuth error:', err)
      }
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
            .select('id, name, email, avatar_url, avatar_color, pairing_code, partnership_id, current_mood, mood_note, mood_updated_at, love_note, favorite_drink, favorite_treat, points, last_seen_at, created_at, updated_at')
            .eq('id', partnerId)
            .maybeSingle()

            if (pUser) {
              const rawPartnerColor = pUser.avatar_color || '#0d9488'
              const cleanPartnerColor = rawPartnerColor.includes('|') ? rawPartnerColor.split('|')[0] : rawPartnerColor
              partnerUser.value = {
                ...createInitialProfile(),
                ...pUser,
                password_hash: undefined,
                name: pUser.name || (pUser.email ? pUser.email.split('@')[0] : 'Partner'),
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
    lastNudgeSentAt.value = null
    currentUserPasswordHash.value = ''
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
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const dbClient = getCleanDbClient()
    if (!dbClient) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) return { data: null, error: new Error('Wprowadź adres e-mail') }

    if (loginLockoutUntil.value > Date.now()) {
      const waitSec = Math.ceil((loginLockoutUntil.value - Date.now()) / 1000)
      return { data: null, error: new Error(`Zbyt wiele nieudanych prób logowania. Odczekaj ${waitSec} s przed kolejną próbą.`) }
    }

    try {
      clearSupabaseSessionStorage()

      // Direct secure query to Supabase profiles by exact email
      let dbProfile: any = null
      let fetchErr: any = null

      // Strategy 1: Case-insensitive ilike on exact email
      const res1 = await dbClient
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (res1.data) {
        dbProfile = res1.data
      } else {
        fetchErr = res1.error
      }

      // Strategy 2: Exact eq match
      if (!dbProfile) {
        const res2 = await dbClient
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .limit(1)
          .maybeSingle()
        if (res2.data) {
          dbProfile = res2.data
          fetchErr = null
        }
      }

      // Strategy 3: Resilient fallback via global client (exact ilike only)
      if (!dbProfile) {
        const authClient = getSupabaseClient()
        if (authClient) {
          const { data: fbProfile, error: fbErr } = await authClient
            .from('profiles')
            .select('*')
            .ilike('email', cleanEmail)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
          if (!fbErr && fbProfile) {
            dbProfile = fbProfile
            fetchErr = null
          }
        }
      }

      if (fetchErr && !dbProfile) {
        console.warn('Profile fetch warning:', fetchErr)
        return {
          data: null,
          error: new Error('Błąd odczytu profilu: ' + (fetchErr.message || fetchErr))
        }
      }

      if (!dbProfile) {
        return {
          data: null,
          error: new Error('Nie znaleziono konta z tym adresem e-mail. Sprawdź e-mail lub przełącz na rejestrację.')
        }
      }

      // Validate password & email verification status
      const rawColor = dbProfile.avatar_color || '#0284c7'
      let storedHash = dbProfile.password_hash || ''
      let displayColor = '#0284c7'
      let isUnverified = dbProfile.is_email_verified === false

      if (rawColor.includes('|')) {
        const parts = rawColor.split('|')
        displayColor = parts[0] || '#0284c7'
        if (!storedHash) {
          storedHash = parts[1] || ''
        }
        if (parts[2] === 'unverified') {
          isUnverified = true
        }
      } else {
        displayColor = rawColor
      }

      const isPasswordValid = await verifyPassword(password, storedHash)
      if (!isPasswordValid) {
        loginFailures.value++
        if (loginFailures.value >= 5) {
          loginLockoutUntil.value = Date.now() + 30000
        }
        return {
          data: null,
          error: new Error('Nieprawidłowe hasło. Sprawdź hasło i spróbuj ponownie.')
        }
      }

      // Reset lockout counters on success
      loginFailures.value = 0
      loginLockoutUntil.value = 0

      // Check email verification for newly registered accounts
      if (isUnverified) {
        let hasConfirmedInSupabase = false
        const authClient = getSupabaseClient()
        if (authClient) {
          try {
            const { data: userData } = await authClient.auth.getUser()
            if (userData?.user?.email_confirmed_at && userData.user.email?.toLowerCase() === cleanEmail) {
              hasConfirmedInSupabase = true
            }
          } catch (_) {}
        }

        if (hasConfirmedInSupabase) {
          isUnverified = false
          try {
            await dbClient.from('profiles').update({
              avatar_color: displayColor,
              password_hash: storedHash,
              is_email_verified: true,
              updated_at: new Date().toISOString()
            }).eq('id', dbProfile.id)
          } catch (_) {
            try {
              await dbClient.from('profiles').update({
                avatar_color: `${displayColor}|${storedHash}`,
                updated_at: new Date().toISOString()
              }).eq('id', dbProfile.id)
            } catch (_) {}
          }
        } else {
          return {
            data: null,
            error: new Error('Twój adres e-mail nie został jeszcze zweryfikowany. Sprawdź swoją skrzynkę (w tym folder SPAM) i kliknij w link aktywacyjny.')
          }
        }
      }

      // Upgrade legacy or inline hash to dedicated password_hash column
      let modernHash = storedHash
      if (storedHash && storedHash.startsWith('h_')) {
        modernHash = await hashPassword(password)
      }

      if (rawColor.includes('|') || storedHash.startsWith('h_') || !dbProfile.password_hash) {
        try {
          await dbClient.from('profiles').update({
            avatar_color: displayColor,
            password_hash: modernHash,
            updated_at: new Date().toISOString()
          }).eq('id', dbProfile.id)
        } catch (_) {
          try {
            await dbClient.from('profiles').update({
              avatar_color: `${displayColor}|${modernHash}`,
              updated_at: new Date().toISOString()
            }).eq('id', dbProfile.id)
          } catch (_) {}
        }
        storedHash = modernHash
      }

      currentUserPasswordHash.value = storedHash
      if (typeof window !== 'undefined') {
        localStorage.setItem('duonest_user_pwd_hash', storedHash)
      }

      // Create active session and profile
      const authUserObj = {
        id: dbProfile.id,
        email: dbProfile.email,
        user_metadata: { name: dbProfile.name }
      }
      const authSessionObj = {
        user: authUserObj,
        access_token: 'duonest_direct_' + dbProfile.id
      }

      authUser.value = authUserObj
      authSession.value = authSessionObj
      saveToStorage('duonest_auth_user', authUserObj)
      saveToStorage('duonest_auth_session', authSessionObj)

      const effectivePartnershipId = dbProfile.partnership_id || currentUser.value?.partnership_id || null

      currentUser.value = {
        ...createInitialProfile(),
        ...dbProfile,
        partnership_id: effectivePartnershipId,
        name: dbProfile.name || '',
        love_note: (dbProfile.love_note === 'Budujemy nasze wspólne gniazdko!' || dbProfile.love_note === 'Cieszę się, że jesteśmy razem!') ? '' : (dbProfile.love_note || ''),
        favorite_drink: dbProfile.favorite_drink === 'Kawa z mlekiem' ? '' : (dbProfile.favorite_drink || ''),
        favorite_treat: dbProfile.favorite_treat === 'Czekolada' ? '' : (dbProfile.favorite_treat || ''),
        avatar_color: displayColor,
        points: Number(dbProfile.points) || 0
      }

      if (effectivePartnershipId) {
        await loadPartnershipAndPartner(effectivePartnershipId, dbProfile.id)
        subscribeToPartnershipRealtime(effectivePartnershipId)
      } else if (currentUser.value?.pairing_code) {
        subscribeToPairingChannel(currentUser.value.pairing_code)
      }
      syncToStorage()

      subscribeToSecurityChannel(dbProfile.id, effectivePartnershipId)

      return { data: { user: authUserObj, session: authSessionObj }, error: null }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const dbClient = getCleanDbClient()
    if (!dbClient) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = sanitizeEmail(email)
    const cleanName = (name || '').trim() || 'Użytkownik'

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Wprowadź prawidłowy adres e-mail.') }
    }
    if (password.length < 6) {
      return { data: null, error: new Error('Hasło musi mieć co najmniej 6 znaków.') }
    }

    try {
      // 1. Check if email already registered in Supabase profiles
      const { data: existingProfiles } = await dbClient
        .from('profiles')
        .select('id, email')
        .ilike('email', cleanEmail)
        .limit(1)

      if (existingProfiles && existingProfiles.length > 0) {
        return {
          data: null,
          error: new Error('Konto z tym adresem e-mail już istnieje. Przełącz na logowanie.')
        }
      }

      // 2. Hash password & prepare unique profile with unverified flag for new signups
      const passHash = await hashPassword(password)
      const newUserId = 'usr_' + Math.random().toString(36).substring(2, 11)
      const newPairingCode = generateUniqueCode()

      const newProfile: Profile = {
        ...createInitialProfile(),
        id: newUserId,
        email: cleanEmail,
        name: cleanName,
        avatar_url: null,
        avatar_color: '#0284c7',
        password_hash: passHash,
        is_email_verified: false,
        pairing_code: newPairingCode,
        partnership_id: null,
        current_mood: 'happy',
        mood_note: '',
        love_note: '',
        favorite_drink: '',
        favorite_treat: ''
      }

      // 3. Insert into Supabase profiles (with fallback for legacy schema without password_hash)
      let { error: insertErr } = await dbClient
        .from('profiles')
        .insert(newProfile)

      if (insertErr && (insertErr.message?.includes('password_hash') || insertErr.message?.includes('is_email_verified'))) {
        const fallbackProfile: any = { ...newProfile }
        delete fallbackProfile.password_hash
        delete fallbackProfile.is_email_verified
        fallbackProfile.avatar_color = `#0284c7|${passHash}|unverified`
        const resFb = await dbClient.from('profiles').insert(fallbackProfile)
        insertErr = resFb.error
      }

      if (insertErr) {
        console.error('Supabase profile creation error:', insertErr)
        throw new Error('Nie udało się utworzyć profilu: ' + (insertErr.message || insertErr))
      }

      // 4. Trigger email verification link via Supabase Auth + Resend SMTP
      const verifyRedirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/verified`
        : 'https://duonestapp.pl/verified'

      const authClient = getSupabaseClient()
      if (authClient) {
        try {
          await authClient.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: { name: cleanName },
              emailRedirectTo: verifyRedirectUrl
            }
          })
        } catch (authErr) {
          console.warn('Supabase auth signUp warning:', authErr)
        }
      }

      return {
        data: {
          needsEmailVerification: true,
          email: cleanEmail
        },
        error: null
      }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const bypassLoginWithEmail = async (email: string, name: string) => {
    return signUpWithEmail(email, 'duonest_pass', name)
  }

  const requestPasswordReset = async (email: string) => {
    const dbClient = getCleanDbClient()
    const authClient = getSupabaseClient()
    if (!dbClient || !authClient) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Wprowadź poprawny adres e-mail.') }
    }

    try {
      // 1. Verify user profile exists in database using clean client
      const { data: dbProfile, error: profileErr } = await dbClient
        .from('profiles')
        .select('id, email, name')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (profileErr) {
        console.warn('Profile lookup warning on reset:', profileErr)
      }

      if (!dbProfile) {
        // Anti-enumeration: return success without revealing whether email is registered
        return { data: true, error: null }
      }

      // Ensure user account exists in Supabase auth.users so Supabase Auth can send the email
      try {
        await authClient.auth.signUp({
          email: cleanEmail,
          password: 'Tmp_' + Math.random().toString(36).substring(2, 11) + '!9X'
        })
      } catch (_) {}

      // 2. Prepare redirect URL to dedicated reset-password page (including email for OTP fallback)
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password?email=${encodeURIComponent(cleanEmail)}`
        : `https://duonestapp.pl/reset-password?email=${encodeURIComponent(cleanEmail)}`

      // 3. Dispatch password recovery request via Supabase Auth + connected Resend SMTP
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
    const dbClient = getCleanDbClient()
    if (!authClient || !dbClient) return { data: null, error: new Error('Brak połączenia z systemem') }
    if (!newPassword || newPassword.length < 6) {
      return { data: null, error: new Error('Hasło musi mieć co najmniej 6 znaków.') }
    }

    const cleanEmail = sanitizeEmail(verifiedEmail)
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Brak zautoryzowanego adresu e-mail. Link do resetu hasła wygasł lub jest nieprawidłowy.') }
    }

    try {
      // 1. If recoveryToken was provided from URL hash, set session in Supabase Auth
      if (recoveryToken && authClient) {
        try {
          await authClient.auth.setSession({
            access_token: recoveryToken,
            refresh_token: ''
          })
        } catch (_) {}
      }

      // 2. Update password in Supabase Auth (safe try-catch)
      if (authClient) {
        try {
          await authClient.auth.updateUser({ password: newPassword })
        } catch (authErr: any) {
          console.warn('Supabase auth updateUser non-fatal:', authErr?.message || authErr)
        }
      }

      // 3. Compute modern SHA-256 hash for DuoNest database
      const modernHash = await hashPassword(newPassword)

      // 4. Find the profile matching the VERIFIED email ONLY
      let dbProfile: any = null
      let profileErr: any = null

      const res1 = await dbClient
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (res1.data) {
        dbProfile = res1.data
      } else {
        profileErr = res1.error
      }

      if (!dbProfile) {
        const res2 = await dbClient
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .limit(1)
          .maybeSingle()
        if (res2.data) {
          dbProfile = res2.data
          profileErr = null
        }
      }

      if (profileErr && !dbProfile) {
        console.error('Error fetching profile for password reset:', profileErr)
        return { data: null, error: new Error('Błąd odczytu profilu: ' + (profileErr.message || profileErr)) }
      }

      if (!dbProfile) {
        return {
          data: null,
          error: new Error(`Nie znaleziono profilu DuoNest powiązanego z adresem e-mail: ${cleanEmail}`)
        }
      }

      // 5. Update password hash directly in profiles table (AWAITED and verified with .select())
      const rawColor = dbProfile.avatar_color || '#0284c7'
      const displayColor = rawColor.includes('|') ? rawColor.split('|')[0] : rawColor

      let { data: updatedRows, error: updateErr } = await dbClient
        .from('profiles')
        .update({
          avatar_color: displayColor,
          password_hash: modernHash,
          is_email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbProfile.id)
        .select()

      if (updateErr && updateErr.message?.includes('password_hash')) {
        const fbRes = await dbClient
          .from('profiles')
          .update({
            avatar_color: `${displayColor}|${modernHash}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbProfile.id)
          .select()
        updatedRows = fbRes.data
        updateErr = fbRes.error
      }

      if (updateErr) {
        console.error('Failed to update password hash in profiles:', updateErr)
        return {
          data: null,
          error: new Error('Nie udało się zapisać nowego hasła w bazie danych: ' + (updateErr.message || updateErr))
        }
      }

      if (!updatedRows || updatedRows.length === 0) {
        await dbClient.from('profiles').update({
          avatar_color: updatedAvatarColor,
          updated_at: new Date().toISOString()
        }).eq('id', dbProfile.id)
      }

      // 6. Clean up temporary recovery session and poisoned localStorage
      if (authClient) {
        try {
          await authClient.auth.signOut({ scope: 'local' })
        } catch (_) {}
      }
      clearSupabaseSessionStorage()

      // 7. Clear old storage items to ensure clean switch
      if (typeof window !== 'undefined') {
        localStorage.removeItem('duonest_auth_user')
        localStorage.removeItem('duonest_auth_session')
        localStorage.removeItem('duonest_user_pwd_hash')
      }

      // 8. Update state and local storage immediately with fresh credentials
      currentUserPasswordHash.value = modernHash
      if (typeof window !== 'undefined') {
        localStorage.setItem('duonest_user_pwd_hash', modernHash)
      }

      // Create active session
      const authUserObj = {
        id: dbProfile.id,
        email: dbProfile.email,
        user_metadata: { name: dbProfile.name }
      }
      const authSessionObj = {
        user: authUserObj,
        access_token: 'duonest_direct_' + dbProfile.id
      }

      authUser.value = authUserObj
      authSession.value = authSessionObj
      saveToStorage('duonest_auth_user', authUserObj)
      saveToStorage('duonest_auth_session', authSessionObj)

      const effectivePartnershipId = dbProfile.partnership_id || null

      currentUser.value = {
        ...createInitialProfile(),
        ...dbProfile,
        partnership_id: effectivePartnershipId,
        avatar_color: displayColor,
        name: dbProfile.name || '',
        points: Number(dbProfile.points) || 0,
        love_note: (dbProfile.love_note === 'Budujemy nasze wspólne gniazdko!' || dbProfile.love_note === 'Cieszę się, że jesteśmy razem!') ? '' : (dbProfile.love_note || ''),
        favorite_drink: dbProfile.favorite_drink === 'Kawa z mlekiem' ? '' : (dbProfile.favorite_drink || ''),
        favorite_treat: dbProfile.favorite_treat === 'Czekolada' ? '' : (dbProfile.favorite_treat || '')
      }

      if (effectivePartnershipId) {
        await loadPartnershipAndPartner(effectivePartnershipId, dbProfile.id)
        subscribeToPartnershipRealtime(effectivePartnershipId)
      } else if (currentUser.value?.pairing_code) {
        subscribeToPairingChannel(currentUser.value.pairing_code)
      }
      syncToStorage()

      subscribeToSecurityChannel(dbProfile.id, effectivePartnershipId)

      return { data: true, error: null }
    } catch (err: any) {
      console.error('Password reset exception:', err)
      return { data: null, error: err }
    }
  }

  const verifyEmailForProfile = async (targetEmail: string) => {
    const dbClient = getCleanDbClient()
    if (!dbClient) return { success: false, error: 'Brak połączenia z systemem' }
    const clean = sanitizeEmail(targetEmail)
    if (!clean || !clean.includes('@')) {
      return { success: false, error: 'Nieprawidłowy adres e-mail' }
    }

    try {
      const { data: dbProfile, error: fetchErr } = await dbClient
        .from('profiles')
        .select('id, email, avatar_color')
        .ilike('email', clean)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (fetchErr || !dbProfile) {
        return { success: false, error: 'Nie znaleziono profilu dla tego adresu e-mail' }
      }

      const rawColor = dbProfile.avatar_color || '#0284c7'
      if (rawColor.includes('|unverified')) {
        const parts = rawColor.split('|')
        const displayColor = parts[0] || '#0284c7'
        const hash = parts[1] || ''
        const updatedColor = `${displayColor}|${hash}`

        const { error: updateErr } = await dbClient
          .from('profiles')
          .update({
            avatar_color: updatedColor,
            updated_at: new Date().toISOString()
          })
          .eq('id', dbProfile.id)

        if (updateErr) {
          console.error('Failed to update verified status in profiles:', updateErr)
          return { success: false, error: updateErr.message }
        }
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
    const dbClient = getCleanDbClient()
    const authClient = getSupabaseClient()
    if (!dbClient) return { success: false, error: 'Brak połączenia z bazą danych' }

    const userId = currentUser.value?.id
    if (!userId) return { success: false, error: 'Musisz być zalogowany, aby zmienić hasło.' }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Nowe hasło musi mieć co najmniej 6 znaków.' }
    }

    try {
      // 1. Fetch current profile from database
      const { data: dbProfile, error: fetchErr } = await dbClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (fetchErr || !dbProfile) {
        return { success: false, error: 'Nie udało się odczytać profilu użytkownika.' }
      }

      const rawColor = dbProfile.avatar_color || '#0284c7'
      let storedHash = dbProfile.password_hash || ''
      let displayColor = '#0284c7'

      if (rawColor.includes('|')) {
        const parts = rawColor.split('|')
        displayColor = parts[0] || '#0284c7'
        if (!storedHash) {
          storedHash = parts[1] || ''
        }
      } else {
        displayColor = rawColor
      }

      // 2. If profile already has a stored password hash, verify current password
      if (storedHash) {
        if (!currentPassword) {
          return { success: false, error: 'Wprowadź obecne hasło.' }
        }
        const isMatch = await verifyPassword(currentPassword, storedHash)
        if (!isMatch) {
          return { success: false, error: 'Podane obecne hasło jest nieprawidłowe.' }
        }
      }

      // 3. Compute modern SHA-256 hash for the new password
      const modernHash = await hashPassword(newPassword)

      // 4. Update password directly in profiles table (AWAITED and verified with .select())
      let { data: updatedRows, error: updateErr } = await dbClient
        .from('profiles')
        .update({
          avatar_color: displayColor,
          password_hash: modernHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (updateErr && updateErr.message?.includes('password_hash')) {
        const fbRes = await dbClient
          .from('profiles')
          .update({
            avatar_color: `${displayColor}|${modernHash}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
        updatedRows = fbRes.data
        updateErr = fbRes.error
      }

      if (updateErr) {
        console.error('Password change error in profiles:', updateErr)
        return { success: false, error: 'Nie udało się zapisać nowego hasła w bazie danych: ' + updateErr.message }
      }

      if (!updatedRows || updatedRows.length === 0) {
        await dbClient.from('profiles').update({
          avatar_color: updatedColor,
          updated_at: new Date().toISOString()
        }).eq('id', userId)
      }

      // 5. Update password in Supabase Auth if session exists
      if (authClient) {
        try {
          await authClient.auth.updateUser({ password: newPassword })
        } catch (_) {}
      }

      // 6. Update local state & storage
      currentUserPasswordHash.value = modernHash
      if (typeof window !== 'undefined') {
        localStorage.setItem('duonest_user_pwd_hash', modernHash)
      }

      return { success: true, error: null }
    } catch (err: any) {
      console.error('Password change exception:', err)
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

  // Save changes to storage
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
  }

  // Broadcast an action to the partner via Supabase Realtime WebSocket & Web Push
  const broadcastToPartner = (action: string, payload: any) => {
    // 1. Live WebSocket broadcast for instant in-app sync (<50ms)
    if (activePartnershipChannel) {
      try {
        activePartnershipChannel.send({
          type: 'broadcast',
          event: 'duo_sync',
          payload: {
            action,
            senderId: currentUser.value.id,
            senderName: currentUser.value.name,
            timestamp: new Date().toISOString(),
            data: payload
          }
        })
      } catch (err) {
        console.warn('Realtime broadcast error:', err)
      }
    }

    // 2. Real Web Push notification delivery for background/locked phone delivery
    if (typeof window !== 'undefined' && (currentUser.value?.partnership_id || partnerUser.value?.id)) {
      const actionsForPush = [
        'NUDGE_SEND',
        'MOOD_UPDATE',
        'SHOPPING_ADD',
        'SHOPPING_TOGGLE',
        'TASK_ADD',
        'TASK_TOGGLE',
        'EVENT_ADD',
        'EVENT_TOGGLE_COMPLETED',
        'WISHLIST_ADD',
        'WISHLIST_TOGGLE_COMPLETED',
        'MOVIE_ADD',
        'MOVIE_TOGGLE_WATCHED',
        'MILESTONE_CLAIM',
        'MEAL_ADD',
        'MEAL_UPDATE',
        'MEAL_TOGGLE_COMPLETED'
      ]

      if (actionsForPush.includes(action)) {
        // Fire-and-forget server dispatch (never blocks or throws in UI)
        $fetch('/api/push/send', {
          method: 'POST',
          body: {
            action,
            payload,
            senderName: currentUser.value.name,
            senderUserId: currentUser.value.id,
            partnershipId: currentUser.value.partnership_id || null,
            targetUserId: partnerUser.value?.id || null
          }
        }).catch((err) => {
          console.warn('[WebPush] Partner push dispatch note:', err)
        })
      }
    }
  }

  // Toast feedback helpers with gesture dismiss support & rich metadata
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

  // --- REALTIME SECURITY LISTENER (AUTO-LOGOUT ON DB DELETE / UNPAIR) ---
  const subscribeToSecurityChannel = (userId: string, partnershipId?: string | null) => {
    const client = getCleanDbClient() || supabase
    if (!client || typeof window === 'undefined' || !userId) return

    const channelName = `duonest_sec_${userId}`
    const targetPartnershipId = partnershipId || null

    // If channel is already active and subscribed/joining for this exact user and partnership, do not duplicate
    if (
      activeSecurityChannel &&
      activeSecurityUserId === userId &&
      activeSecurityPartnershipId === targetPartnershipId &&
      (activeSecurityChannel.state === 'joined' || activeSecurityChannel.state === 'joining')
    ) {
      return
    }

    // Clean up any existing security channel references
    if (activeSecurityChannel) {
      try {
        client.removeChannel(activeSecurityChannel)
      } catch (_) {}
      activeSecurityChannel = null
    }

    // Also remove any existing channel with this name/topic from Supabase client's internal channels registry
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

    const channel = client.channel(channelName)
    activeSecurityChannel = channel

    // 1. Listen for user profile deletion or unpairing in Supabase
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
          triggerToast('Twoje konto zostało usunięte z bazy danych. Zostałeś wylogowany.', {
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

    // 2. If paired, listen for partnership deletion or removal in Supabase
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

    // Periodic heartbeat check: every 20 seconds
    if (!securityCheckInterval) {
      securityCheckInterval = setInterval(() => {
        if (currentUser.value?.id && authUser.value) {
          verifyUserAndPartnershipAccess(true)
        }
      }, 20000)
    }

    // Use document for visibilitychange - more reliable cross-platform
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (currentUser.value?.id && authUser.value) {
          verifyUserAndPartnershipAccess(true)
        }
      }
    })

    // window.focus fires in browser but NOT reliably in iOS PWA standalone mode
    window.addEventListener('focus', () => {
      if (currentUser.value?.id && authUser.value) {
        verifyUserAndPartnershipAccess(true)
      }
    })

    // pageshow fires on iOS PWA when returning from background (persisted=true = from bfcache)
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

    // Do not run verification if user is not genuinely authenticated
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
      // 1. Verify user profile exists in database
      let { data: dbProfile, error: profileErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileErr) {
        if (profileErr.code === '42P01' || profileErr.code === 'PGRST301' || profileErr.message?.includes('fetch') || profileErr.message?.includes('network') || profileErr.message?.includes('JWT')) {
          return true
        }
      }

      if (dbProfile) {
        // Synchronize and preserve modern password hash from database profile
        if (dbProfile.avatar_color && dbProfile.avatar_color.includes('|')) {
          const hashPart = dbProfile.avatar_color.split('|')[1]
          if (hashPart && hashPart !== 'unverified') {
            currentUserPasswordHash.value = hashPart
            if (typeof window !== 'undefined') {
              localStorage.setItem('duonest_user_pwd_hash', hashPart)
            }
          }
        }

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
        // Recovery by email in case userId in localStorage was stale/desynced
        const userEmail = currentUser.value?.email || authUser.value?.email
        if (userEmail) {
          const { data: profileByEmail } = await client
            .from('profiles')
            .select('id, partnership_id')
            .ilike('email', userEmail)
            .maybeSingle()

          if (profileByEmail) {
            dbProfile = profileByEmail
            currentUser.value.id = profileByEmail.id
            if (authUser.value) authUser.value.id = profileByEmail.id
            saveToStorage('duonest_auth_user', authUser.value)
            syncToStorage()
          }
        }

        if (!dbProfile) {
          triggerToast('Twoje konto nie istnieje w bazie danych. Zostałeś wylogowany.', {
            type: 'warning',
            title: 'Konto nie istnieje'
          })
          await signOutUser()
          return false
        }
      }

      // 2. If user is in an active Gniazdko, verify partnership linkage
      if (pId) {
        if (dbProfile && (!dbProfile.partnership_id || dbProfile.partnership_id !== pId)) {
          if (dbProfile.partnership_id) {
            // Auto-heal: partnership ID in DB is different from local cache, load DB partnership
            currentUser.value.partnership_id = dbProfile.partnership_id
            await loadPartnershipAndPartner(dbProfile.partnership_id, dbProfile.id)
            syncToStorage()
            return true
          } else {
            // Partner un-paired: clear partnership state and route to /pairing, DO NOT LOG OUT USER!
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
          // Partnership was removed: clear partnership and go to /pairing, DO NOT LOG OUT USER!
          partnership.value = null
          partnerUser.value = null
          currentUser.value.partnership_id = null
          syncToStorage()
          if (typeof window !== 'undefined') {
            await navigateTo('/pairing', { replace: true })
          }
          return false
        }

        if (dbPartnership && dbPartnership.partner1_id !== userId && dbPartnership.partner2_id !== userId) {
          // User is no longer part of this partnership: go to /pairing, DO NOT LOG OUT USER!
          partnership.value = null
          partnerUser.value = null
          currentUser.value.partnership_id = null
          syncToStorage()
          if (typeof window !== 'undefined') {
            await navigateTo('/pairing', { replace: true })
          }
          return false
        }

        // Sync partner profile and points from DB
        if (dbPartnership) {
          const myId = userId
          const partnerId = (myId && dbPartnership.partner1_id === myId)
            ? dbPartnership.partner2_id
            : ((myId && dbPartnership.partner2_id === myId) ? dbPartnership.partner1_id : (dbPartnership.partner1_id || dbPartnership.partner2_id))
          if (partnerId) {
            const { data: pUser } = await client
              .from('profiles')
              .select('id, name, email, avatar_url, avatar_color, pairing_code, partnership_id, current_mood, mood_note, mood_updated_at, love_note, favorite_drink, favorite_treat, points, last_seen_at, created_at, updated_at')
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
      return true
    } finally {
      isSecurityVerifying = false
    }
  }

  // --- REALTIME SUBSCRIPTION FOR PAIRED PARTNERS ---
  const subscribeToPartnershipRealtime = (partnershipId: string) => {
    const client = getCleanDbClient() || supabase
    if (!client || typeof window === 'undefined' || !partnershipId) return

    const channelName = `duonest_channel_${partnershipId}`

    // If already subscribed or joining for this exact partnershipId, do not duplicate
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

    // Clean up any channels matching this name from client internal registry
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
        broadcast: { ack: false, self: false },
        presence: { key: currentUser.value.id }
      }
    })
    activePartnershipChannel = channel

    // 1. Presence: See when partner is actively inside the app
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
          triggerToast(`${partnerUser.value?.name || 'Partner'} jest teraz w aplikacji!`)
          // Synchronize our profile silently to the newly joined partner immediately
          broadcastToPartner('PROFILE_SYNC', {
            profile: currentUser.value,
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

    // 2. Realtime Broadcast Actions: Instant sync across devices (<50ms)
    channel.on('broadcast', { event: 'duo_sync' }, async (envelope: any) => {
      const { action, senderId, senderName, data } = envelope.payload || {}
      if (senderId === currentUser.value.id) return // ignore own echoes

      // Partner performed an action, so partner is active right now
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
          triggerToast('Wasze Gniazdko zostało rozłączone przez partnera.', {
            type: 'warning',
            title: 'Gniazdko rozłączone'
          })
          if (typeof window !== 'undefined') {
            navigateTo('/pairing')
          }
          break
        }
        // --- CALENDAR EVENTS ---
        case 'EVENT_ADD': {
          if (data && !eventsList.value.some(e => e.id === data.id)) {
            eventsList.value.push(data)
            eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            syncToStorage()
            triggerToast(`${senderName} dodał(a) nowy plan: "${data.title}"`)
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
              triggerToast(`${senderName} zaktualizował(a) plan: "${eventsList.value[idx].title}"`)
            }
          }
          break
        }
        case 'EVENT_DELETE': {
          if (data?.id) {
            const deleted = eventsList.value.find(e => e.id === data.id)
            eventsList.value = eventsList.value.filter(e => e.id !== data.id)
            syncToStorage()
            if (deleted) triggerToast(`${senderName} usunął(a) plan: "${deleted.title}"`)
          }
          break
        }
        case 'EVENT_TOGGLE_COMPLETED': {
          if (data?.id) {
            const ev = eventsList.value.find(e => e.id === data.id)
            if (ev) {
              ev.is_completed = data.is_completed
              if (partnerUser.value && data.user_points !== undefined) {
                partnerUser.value.points = Math.max(0, Number(data.user_points) || 0)
              }
              syncToStorage()
              if (data.is_completed) {
                triggerToast(`Wydarzenie "${ev.title}" zostało zrealizowane! Gratulacje!`)
              }
            }
          }
          break
        }

        // --- SHOPPING LIST ---
        case 'SHOPPING_ADD': {
          if (data && !shoppingItems.value.some(i => i.id === data.id)) {
            shoppingItems.value.unshift(data)
            syncToStorage()
            triggerToast(`${senderName} dodał(a) do listy zakupów: ${data.title}`)
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
          shoppingItems.value = shoppingItems.value.filter(i => !i.is_completed)
          syncToStorage()
          break
        }

        // --- TASKS / CHORES ---
        case 'TASK_ADD': {
          if (data && !tasksList.value.some(t => t.id === data.id)) {
            tasksList.value.unshift(data)
            syncToStorage()
            triggerToast(`${senderName} dodał(a) nowe zadanie: ${data.title}`)
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
              
              const taskPts = Number(task.points) || 15
              const delta = data.is_completed ? taskPts : -taskPts

              if (partnerUser.value) {
                if (data.user_points !== undefined) {
                  partnerUser.value.points = Math.max(0, Number(data.user_points) || 0)
                } else if (!wasCompleted && data.is_completed) {
                  partnerUser.value.points = (Number(partnerUser.value.points) || 0) + taskPts
                } else if (wasCompleted && !data.is_completed) {
                  partnerUser.value.points = Math.max(0, (Number(partnerUser.value.points) || 0) - taskPts)
                }
              }

              if (currentUser.value && data.partner_points !== undefined) {
                currentUser.value.points = Math.max(0, Number(data.partner_points) || 0)
              }

              if (partnership.value) {
                if (data.pet_xp !== undefined) {
                  partnership.value.pet_xp = Math.max(0, data.pet_xp)
                } else {
                  partnership.value.pet_xp = Math.max(0, (partnership.value.pet_xp || 0) + delta)
                }
              }
              syncToStorage()
              if (data.is_completed) {
                triggerToast(`${senderName} ukończył(a) zadanie: "${task.title}" (+${task.points} pkt)!`)
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

        // --- PET UPDATES ---
        case 'PET_UPDATE': {
          if (data && partnership.value) {
            if (data.pet_id) partnership.value.pet_id = data.pet_id
            if (data.pet_name) partnership.value.pet_name = data.pet_name
            if (data.pet_xp !== undefined) partnership.value.pet_xp = data.pet_xp
            syncToStorage()
            triggerToast(`${senderName} zaktualizował(a) Waszego zwierzaka! 🐾`, { type: 'love', title: 'Wspólny Zwierzak' })
          }
          break
        }

        // --- MOOD & NUDGES ---
        case 'MOOD_UPDATE': {
          if (data?.mood && partnerUser.value) {
            partnerUser.value.current_mood = data.mood
            partnerUser.value.mood_note = data.note || ''
            partnerUser.value.mood_updated_at = new Date().toISOString()
            syncToStorage()
            triggerToast(`${senderName} zmienił(a) swój nastrój!`)
          }
          break
        }
        case 'NUDGE_SEND': {
          if (data) {
            nudgesList.value.unshift(data)
            if (partnerUser.value) {
              if (data.sender_points !== undefined) {
                partnerUser.value.points = Math.max(0, Number(data.sender_points) || 0)
              } else {
                partnerUser.value.points = (Number(partnerUser.value.points) || 0) + 5
              }
            }
            syncToStorage()
            triggerToast(`${senderName} przesłał(a) Ci gest: ${data.message || data.nudge_type}!`)
          }
          break
        }

        // --- MILESTONES & REWARDS ---
        case 'MILESTONE_ADD': {
          if (data && !milestonesList.value.some(m => m.id === data.id)) {
            milestonesList.value.push(data)
            syncToStorage()
            triggerToast(`Partner dodał nowy wspólny cel: ${data.title}! 🎯`)
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
              triggerToast(`Wspólna nagroda została odebrana: ${m.title}! 🎉`)
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

        // --- WISHLIST ITEMS ---
        case 'WISHLIST_ADD': {
          if (data && data.id) {
            wishlistItems.value = [data, ...wishlistItems.value.filter(w => w.id !== data.id)]
            syncToStorage()
            const isForMe = data.for_user_id === currentUser.value.id
            let label = 'do listy marzeń'
            if (isForMe) {
              label = 'do Twojej wishlisty (dla Ciebie)'
            } else if (!data.for_user_id) {
              label = 'do wspólnej listy marzeń'
            } else if (data.for_user_id === data.created_by) {
              label = 'do swojej wishlisty'
            }
            triggerToast(`${senderName} dodał(a) ${label}: "${data.title}" 🎁`, { type: 'wishlist', title: 'Wishlista & Prezenty' })
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
              triggerToast(`${senderName} zaktualizował(a) marzenie: "${updated.title}" ✨`, { type: 'wishlist', title: 'Wishlista & Prezenty' })
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
            if (deleted) triggerToast(`${senderName} usunął(a) marzenie: "${deleted.title}"`, { type: 'wishlist', title: 'Wishlista & Prezenty' })
          }
          break
        }
        case 'WISHLIST_TOGGLE_COMPLETED': {
          if (data?.id) {
            const completedAt = data.completed_at || (data.is_completed ? new Date().toISOString() : null)
            wishlistItems.value = wishlistItems.value.map(w => w.id === data.id ? { ...w, is_completed: data.is_completed, completed_at: completedAt } : w)
            syncToStorage()
            const item = wishlistItems.value.find(w => w.id === data.id)
            if (data.is_completed) {
              triggerToast(`${senderName} spełnił(a) marzenie: "${item?.title || 'Marzenie'}"! 🎉✨`, { type: 'wishlist', title: 'Wishlista & Prezenty' })
            }
          }
          break
        }

        // --- MOVIES / FILMY & SERIALE ---
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
              triggerToast(`${senderName} dodał(a) "${data.title}" do Waszej listy filmów! 🍿`, { type: 'movies', title: 'Filmy & Seriale' })
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
                triggerToast(`${senderName} ocenił(a) film: "${prev.title}"! ⭐ Sprawdź recenzję.`, { type: 'movies', title: 'Nowa recenzja' })
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
              triggerToast(`${senderName} usunął(a) "${deleted.title}" z listy filmów.`, { type: 'movies', title: 'Filmy & Seriale' })
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
                triggerToast(`${senderName} oznaczył(a) "${item.title}" jako obejrzane! 🎉 Czas na recenzję.`, { type: 'movies', title: 'Filmy & Seriale' })
              }
            }
          }
          break
        }

        // --- MEALS BROADCASTS ---
        case 'MEAL_ADD': {
          if (data?.id) {
            const exists = mealsList.value.some(m => m.id === data.id)
            if (!exists) {
              mealsList.value = [data, ...mealsList.value]
              syncToStorage()
              const mealTitle = data.titlePl || data.title || 'posiłek'
              triggerToast(`${senderName} zaplanował(a) obiad: "${mealTitle}"! 🍳`, { type: 'meals', title: 'Planer Obiadów' })
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
                const mealTitle = data.titlePl || data.title || item.titlePl || item.title || 'obiad'
                triggerToast(`${senderName} oznaczył(a) obiad "${mealTitle}" jako zjedzony! 🍽️`, { type: 'meals', title: 'Planer Obiadów' })
              }
            }
          }
          break
        }

        // --- PARTNERSHIP UPDATES ---
        case 'PARTNERSHIP_UPDATE': {
          if (data && partnership.value) {
            partnership.value = { ...partnership.value, ...data }
            syncToStorage()
          }
          break
        }

        // --- PROFILE SYNC (SILENT BACKGROUND EXCHANGE ON CONNECT) ---
        case 'PROFILE_SYNC': {
          if (data?.profile) {
            partnerUser.value = {
              ...(partnerUser.value || {}),
              ...data.profile,
              name: data.profile.name || partnerUser.value?.name || 'Partner',
              points: Number(data.profile.points) || 0
            }
            if (data.partnership && partnership.value) {
              if (data.partnership.nest_name) partnership.value.nest_name = data.partnership.nest_name
              if (data.partnership.anniversary_date) partnership.value.anniversary_date = data.partnership.anniversary_date
            }
            syncToStorage()
          }
          break
        }

        // --- PROFILE UPDATES (EXPLICIT USER EDIT IN MODAL) ---
        case 'PROFILE_UPDATE': {
          if (data?.profile) {
            partnerUser.value = {
              ...(partnerUser.value || {}),
              ...data.profile,
              name: data.profile.name || partnerUser.value?.name || 'Partner',
              points: Number(data.profile.points) || 0
            }
            if (data.partnership && partnership.value) {
              if (data.partnership.nest_name) partnership.value.nest_name = data.partnership.nest_name
              if (data.partnership.anniversary_date) partnership.value.anniversary_date = data.partnership.anniversary_date
            }
            syncToStorage()
            if (data.is_manual_edit) {
              triggerToast(`${data.profile.name || 'Partner'} zaktualizował(a) swój profil!`)
            }
          }
          break
        }

        // --- BIDIRECTIONAL SYNC ON CONNECT ---
        case 'REQ_STATE_SYNC': {
          // Send all our items and profile to partner so both are 100% in sync
          // Filter out surprise gift items created by us that are hidden from partner
          const shareableWishlist = wishlistItems.value.filter(i => i.is_visible_to_partner || i.created_by !== currentUser.value.id)
          broadcastToPartner('RESP_STATE_SYNC', {
            profile: currentUser.value,
            shopping: shoppingItems.value,
            tasks: tasksList.value,
            events: eventsList.value,
            milestones: milestonesList.value,
            wishlist: shareableWishlist,
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
                points: Number(data.profile.points) || 0
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
              // Merge incoming wishlist with existing items without dropping any local items
              const existingMap = new Map(wishlistItems.value.map(w => [w.id, w]))
              for (const item of data.wishlist) {
                if (item && item.id) {
                  existingMap.set(item.id, item)
                }
              }
              wishlistItems.value = Array.from(existingMap.values())
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

    // 3. Postgres Changes (if PostgreSQL schema exists in Supabase)
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

    // Subscribe to channel
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        realtimeStatus.value = 'connected'
        activePartnershipChannel = channel
        isOnlineWithSupabase.value = true

        // Track presence
        channel.track({
          user_id: currentUser.value.id,
          name: currentUser.value.name,
          online_at: new Date().toISOString()
        })

        // Broadcast our profile silently so partner gets our up-to-date name & details without false notifications
        broadcastToPartner('PROFILE_SYNC', {
          profile: currentUser.value,
          partnership: partnership.value ? {
            nest_name: partnership.value.nest_name,
            anniversary_date: partnership.value.anniversary_date
          } : undefined
        })

        // Ask partner for any updates they made while we were offline
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

  // Helper to normalize pairing code
  const normalizePairingCode = (raw: string): string => {
    let clean = (raw || '').trim().toUpperCase().replace(/[\s-]+/g, '')
    if (clean.startsWith('DN')) {
      clean = clean.substring(2)
    }
    return clean ? `DN-${clean}` : ''
  }

  // --- REALTIME PAIRING CHANNEL ---
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
      config: { broadcast: { ack: true } }
    })
    activePairingChannel = pairChan

    // 1. Listen for realtime broadcast PAIR_REQUEST
    pairChan.on('broadcast', { event: 'PAIR_REQUEST' }, async (envelope: any) => {
      const { initiatorProfile, newPartnership } = envelope.payload || {}
      if (!initiatorProfile || !newPartnership) return

      // Adopt partnership immediately on this device!
      const finalPartnership: Partnership = {
        ...newPartnership,
        partner2_id: currentUser.value.id
      }
      partnership.value = finalPartnership
      partnerUser.value = {
        ...createInitialProfile(),
        ...initiatorProfile,
        name: initiatorProfile.name || 'Partner'
      }
      currentUser.value.partnership_id = newPartnership.id
      syncToStorage()

      // Reply with PAIR_ACCEPTED containing our full profile so the initiator sees our real name!
      try {
        await pairChan.send({
          type: 'broadcast',
          event: 'PAIR_ACCEPTED',
          payload: {
            targetProfile: currentUser.value,
            newPartnership: finalPartnership
          }
        })
      } catch (_) {}

      triggerToast(`Połączono z: ${partnerUser.value.name}! Witamy w Gniazdku!`)

      // Clean up pairing channel and switch to partnership channel
      setTimeout(() => {
        try { client.removeChannel(pairChan) } catch (_) {}
        activePairingChannel = null
        activePairingCode = null
        subscribeToPartnershipRealtime(newPartnership.id)
        subscribeToSecurityChannel(currentUser.value.id, newPartnership.id)
      }, 500)
    })

    // 2. Listen for Postgres changes on currentUser profile (in case partner updated DB directly)
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
            triggerToast(`Konta zostały pomyślnie połączone! Witamy w Gniazdku!`)
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

  // Send periodic heartbeat to keep presence and last_seen_at current
  let heartbeatTimer: any = null
  let lastHeartbeatSentAt = 0

  const sendHeartbeat = async (force: boolean = false) => {
    if (typeof window === 'undefined') return
    if (!currentUser.value?.id) return
    const now = Date.now()
    if (!force && now - lastHeartbeatSentAt < 30000) return
    lastHeartbeatSentAt = now

    const nowIso = new Date(now).toISOString()
    currentUser.value.last_seen_at = nowIso

    // Broadcast heartbeat over active partnership channel
    if (activePartnershipChannel) {
      try {
        await broadcastToPartner('HEARTBEAT', { at: nowIso })
      } catch (_) {}
    }

    // Silently update profiles in Supabase if partnership exists
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

  // Setup heartbeat interval (runs every 45s if visible)
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

  // Check and sync with Supabase tables if active session/tables exist
  const initSupabaseSync = async () => {
    initializeClientState()
    const client = getCleanDbClient() || getSupabaseClient()
    if (!client) return

    if (currentUser.value?.id && authUser.value) {
      const isAllowed = await verifyUserAndPartnershipAccess(true)
      if (!isAllowed) return
    }

    isOnlineWithSupabase.value = true

    try {
      // 1. Check if tables exist in Supabase PostgreSQL database
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

        // Sync partnership & tables from DB with latest profile check
        if (currentUser.value?.id) {
          const { data: dbProfile } = await client
            .from('profiles')
            .select('*')
            .eq('id', currentUser.value.id)
            .maybeSingle()

          if (dbProfile) {
            // Synchronize and preserve modern password hash from database profile
            if (dbProfile.avatar_color && dbProfile.avatar_color.includes('|')) {
              const hashPart = dbProfile.avatar_color.split('|')[1]
              if (hashPart && hashPart !== 'unverified') {
                currentUserPasswordHash.value = hashPart
                if (typeof window !== 'undefined') {
                  localStorage.setItem('duonest_user_pwd_hash', hashPart)
                }
              }
            }

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
        } else if (partnership.value?.id) {
          await loadPartnershipAndPartner(partnership.value.id, currentUser.value?.id || '')
          subscribeToPartnershipRealtime(partnership.value.id)
        }

        sendHeartbeat(true)
      }
    } catch (err) {
      console.warn('initSupabaseSync attempt:', err)
    }
  }

  const loadSupabaseData = async (partnershipId: string) => {
    const client = getCleanDbClient() || getSupabaseClient()
    if (!client) return
    try {
      const [shops, tasks, evts, ndgs, wshs, movs, mls, mlsList] = await Promise.all([
        client.from('shopping_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('tasks').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('events').select('*').eq('partnership_id', partnershipId).order('start_time', { ascending: true }),
        client.from('nudges').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }).limit(20),
        client.from('wishlist_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('movies').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('milestones').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('meals').select('*').eq('partnership_id', partnershipId).order('date', { ascending: true })
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

      syncToStorage()
    } catch (e) {
      // Table does not exist or network error
    }
  }

  const isAuthenticated = computed(() => {
    return !!authUser.value || !!authSession.value
  })

  // --- PAIRING SYSTEM ---
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

  // Helper: auto-heal abandoned, corrupted, or ghost partnerships in Supabase
  const checkAndAutoHealPartnership = async (profile: Profile, client: any): Promise<boolean> => {
    if (!profile.partnership_id) return true

    try {
      const { data: part } = await client
        .from('partnerships')
        .select('*')
        .eq('id', profile.partnership_id)
        .maybeSingle()

      if (!part) {
        // Partnership doesn't exist in DB - clear profile reference
        await client.from('profiles').update({ partnership_id: null }).eq('id', profile.id)
        profile.partnership_id = null
        return true
      }

      // Check for ghost partner
      const isGhost =
        (part.partner1_id && part.partner1_id.startsWith('usr_partner_')) ||
        (part.partner2_id && part.partner2_id.startsWith('usr_partner_')) ||
        (part.partner1_id === part.partner2_id)

      if (isGhost) {
        await client.from('partnerships').delete().eq('id', part.id)
        await client.from('profiles').update({ partnership_id: null }).eq('id', profile.id)
        profile.partnership_id = null
        return true
      }

      // Check if the other partner exists and still references this partnership
      const otherPartnerId = part.partner1_id === profile.id ? part.partner2_id : part.partner1_id
      const { data: otherProfile } = await client
        .from('profiles')
        .select('id, partnership_id')
        .eq('id', otherPartnerId)
        .maybeSingle()

      if (!otherProfile || otherProfile.partnership_id !== part.id) {
        // Other partner has disconnected or deleted account - clear orphaned partnership
        await client.from('partnerships').delete().eq('id', part.id)
        await client.from('profiles').update({ partnership_id: null }).eq('id', profile.id)
        profile.partnership_id = null
        return true
      }

      // Truly active mutual partnership with another real user
      return false
    } catch (_) {
      return false
    }
  }

  // Check pairing status against Supabase DB directly
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
    const myCleanEmail = sanitizeEmail(currentUser.value?.email || authUser.value?.email)
    const myCode = normalizePairingCode(currentUser.value?.pairing_code)

    // Check if input is an email address
    const isEmailInput = trimmedInput.includes('@') && trimmedInput.includes('.')
    const targetEmail = isEmailInput ? sanitizeEmail(trimmedInput) : ''
    const targetCode = !isEmailInput ? normalizePairingCode(trimmedInput) : ''

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

    // 1. Search for partner profile in Supabase (requesting only safe public columns)
    const safeProfileFields = 'id, name, email, avatar_url, avatar_color, pairing_code, partnership_id, points, created_at, last_seen_at'
    let foundPartnerProfile: Profile | null = null

    if (isEmailInput) {
      const { data } = await dbClient
        .from('profiles')
        .select(safeProfileFields)
        .ilike('email', targetEmail)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (data) {
        foundPartnerProfile = data
      }
    } else {
      const { data } = await dbClient
        .from('profiles')
        .select(safeProfileFields)
        .eq('pairing_code', targetCode)
        .limit(1)
        .maybeSingle()

      if (data) {
        foundPartnerProfile = data
      } else {
        // Fallback: exact match without "DN-" prefix if user entered alphanumeric code
        const rawClean = trimmedInput.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^DN/, '')
        if (rawClean && rawClean.length >= 6) {
          const { data: fbData } = await dbClient
            .from('profiles')
            .select(safeProfileFields)
            .eq('pairing_code', `DN-${rawClean}`)
            .limit(1)
            .maybeSingle()
          if (fbData) {
            foundPartnerProfile = fbData
          }
        }
      }
    }

    if (!foundPartnerProfile) {
      pairingFailures.value++
      if (pairingFailures.value >= 5) {
        pairingLockoutUntil.value = Date.now() + 60000
      }
      return {
        success: false,
        error: isEmailInput
          ? `Nie znaleziono użytkownika o adresie: ${targetEmail}. Upewnij się, że partner założył konto w DuoNest.`
          : `Nie znaleziono partnera z kodem: ${targetCode || trimmedInput}. Upewnij się, że kod jest poprawny lub wpisz adres e-mail partnera.`
      }
    }

    // Reset pairing lockout on found profile
    pairingFailures.value = 0
    pairingLockoutUntil.value = 0

    // Ensure partner avatar_color is sanitized and carries no legacy hash parts
    if (foundPartnerProfile.avatar_color && foundPartnerProfile.avatar_color.includes('|')) {
      foundPartnerProfile.avatar_color = foundPartnerProfile.avatar_color.split('|')[0]
    }

    // Cannot pair with oneself
    if (
      foundPartnerProfile.id === currentUser.value.id ||
      (myCleanEmail && foundPartnerProfile.email && sanitizeEmail(foundPartnerProfile.email) === myCleanEmail)
    ) {
      return { success: false, error: 'Nie możesz sparować konta ze samym sobą.' }
    }

    // Check if partner has ALREADY initiated a partnership WITH CURRENT USER
    if (foundPartnerProfile.partnership_id) {
      const { data: existingPart } = await dbClient
        .from('partnerships')
        .select('*')
        .eq('id', foundPartnerProfile.partnership_id)
        .maybeSingle()

      if (
        existingPart &&
        ((existingPart.partner1_id === currentUser.value.id && existingPart.partner2_id === foundPartnerProfile.id) ||
         (existingPart.partner2_id === currentUser.value.id && existingPart.partner1_id === foundPartnerProfile.id))
      ) {
        // Mutual handshake completed!
        currentUser.value.partnership_id = existingPart.id
        partnerUser.value = {
          ...createInitialProfile(),
          ...foundPartnerProfile,
          name: foundPartnerProfile.name || (foundPartnerProfile.email ? foundPartnerProfile.email.split('@')[0] : 'Partner'),
          partnership_id: existingPart.id
        }
        partnership.value = existingPart
        syncToStorage()

        await dbClient.from('profiles').update({ partnership_id: existingPart.id }).eq('id', currentUser.value.id)

        subscribeToPartnershipRealtime(existingPart.id)
        subscribeToSecurityChannel(currentUser.value.id, existingPart.id)
        triggerToast(`Połączono z: ${partnerUser.value.name}! Witamy w Gniazdku!`)
        return { success: true }
      }
    }

    // Check & auto-heal currentUser partnership if stale or ghost
    if (currentUser.value?.partnership_id) {
      const isMyCurrentFree = await checkAndAutoHealPartnership(currentUser.value, dbClient)
      if (!isMyCurrentFree) {
        return {
          success: false,
          error: 'Twoje konto jest już połączone w Gniazdku. Rozłącz obecne partnerstwo w zakładce Relacja przed połączeniem z kimś nowym.'
        }
      }
    }

    // Check & auto-heal partner's partnership if stale or ghost
    if (foundPartnerProfile.partnership_id) {
      const isPartnerFree = await checkAndAutoHealPartnership(foundPartnerProfile, dbClient)
      if (!isPartnerFree) {
        return {
          success: false,
          error: `Ten partner (${foundPartnerProfile.name || foundPartnerProfile.email}) jest już połączony w innym Gniazdku. Partner musi najpierw rozłączyć swoje obecne partnerstwo.`
        }
      }
    }

    // Clear any residual data on this client before creating fresh partnership
    clearPartnershipData()

    const newPartnershipId = 'part_' + Math.random().toString(36).substring(2, 10)
    const partnerName = foundPartnerProfile.name || (partnerDisplayName && partnerDisplayName !== 'Partner' ? partnerDisplayName : (foundPartnerProfile.email ? foundPartnerProfile.email.split('@')[0] : 'Partner'))

    const createdPartnership: Partnership = {
      id: newPartnershipId,
      partner1_id: currentUser.value.id,
      partner2_id: foundPartnerProfile.id,
      nest_name: 'Nasze Ciepłe Gniazdko',
      nest_level: 1,
      anniversary_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }

    const createdPartner: Profile = {
      ...createInitialProfile(),
      ...foundPartnerProfile,
      name: partnerName,
      partnership_id: newPartnershipId,
      avatar_color: getCleanAccentColor(foundPartnerProfile.avatar_color, '#1e293b')
    }

    // 2. Persist to Supabase with real AWAIT
    const { error: partErr } = await dbClient.from('partnerships').upsert(createdPartnership)
    if (partErr) {
      return { success: false, error: 'Błąd zapisu nowego Gniazdka: ' + (partErr.message || 'spróbuj ponownie.') }
    }

    const { error: u1Err } = await dbClient.from('profiles').update({ partnership_id: newPartnershipId }).eq('id', currentUser.value.id)
    if (u1Err) {
      return { success: false, error: 'Błąd przypisania Twojego profilu: ' + (u1Err.message || 'spróbuj ponownie.') }
    }

    const { error: u2Err } = await dbClient.from('profiles').update({ partnership_id: newPartnershipId }).eq('id', foundPartnerProfile.id)
    if (u2Err) {
      return { success: false, error: 'Błąd przypisania profilu partnera: ' + (u2Err.message || 'spróbuj ponownie.') }
    }

    // 3. Update local state
    currentUser.value.partnership_id = newPartnershipId
    partnerUser.value = createdPartner
    partnership.value = createdPartnership
    syncToStorage()

    // 4. Send Realtime broadcast to partner on pairing channel
    try {
      const broadcastPayload = {
        initiatorProfile: currentUser.value,
        newPartnership: createdPartnership
      }
      const pCode = foundPartnerProfile.pairing_code
      if (pCode) {
        const partnerPairChannel = dbClient.channel(`duonest_pair_${pCode}`, {
          config: { broadcast: { ack: true } }
        })
        partnerPairChannel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            partnerPairChannel.send({
              type: 'broadcast',
              event: 'PAIR_REQUEST',
              payload: broadcastPayload
            }).catch(() => {})
            setTimeout(() => {
              partnerPairChannel.send({
                type: 'broadcast',
                event: 'PAIR_REQUEST',
                payload: broadcastPayload
              }).catch(() => {})
            }, 300)
          }
        })
      }
    } catch (_) {}

    // 5. Connect to partnership realtime & security channels
    subscribeToPartnershipRealtime(newPartnershipId)
    subscribeToSecurityChannel(currentUser.value.id, newPartnershipId)

    triggerToast(`Konta zostały pomyślnie sparowane! Witajcie w Waszym Gniazdku!`)
    return { success: true }
  }

  const disconnectPartnership = async () => {
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    const myId = currentUser.value?.id || authUser.value?.id
    const partnerId = partnerUser.value?.id

    // Broadcast disconnection notice so partner reacts instantly
    broadcastToPartner('PARTNERSHIP_DISCONNECT', {})

    const dbClient = getCleanDbClient() || supabase
    if (dbClient) {
      if (myId) {
        try { await dbClient.from('profiles').update({ partnership_id: null }).eq('id', myId) } catch (_) {}
      }
      if (partnerId) {
        try { await dbClient.from('profiles').update({ partnership_id: null }).eq('id', partnerId) } catch (_) {}
      }
      if (pId) {
        try { await dbClient.from('partnerships').delete().eq('id', pId) } catch (_) {}
      }
    }

    if (activePartnershipChannel) {
      try { (getCleanDbClient() || supabase)?.removeChannel(activePartnershipChannel) } catch (_) {}
      activePartnershipChannel = null
    }

    clearPartnershipData()
    triggerToast('Rozłączono partnerstwo.', { type: 'warning', title: 'Rozłączono' })
    if (typeof window !== 'undefined') {
      navigateTo('/pairing', { replace: true })
    }
  }

  // --- SHOPPING LIST ACTIONS ---
  const addShoppingItem = async (title: string, category: string, quantity: string = '') => {
    if (!title.trim() || !partnership.value) return
    if (!await verifyUserAndPartnershipAccess()) return
    const cleanQty = quantity ? String(quantity).replace(/\D/g, '').trim() : ''
    const newItem: ShoppingItem = {
      id: 'shop_' + Math.random().toString(36).substring(2, 9),
      partnership_id: partnership.value.id,
      title: title.trim(),
      category: category || 'Spożywcze',
      quantity: cleanQty || undefined,
      is_completed: false,
      added_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }
    shoppingItems.value.unshift(newItem)
    syncToStorage()

    // Broadcast live to partner
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

    // Broadcast live to partner
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

    // Broadcast live to partner
    broadcastToPartner('SHOPPING_DELETE', { id })

    if (db) {
      safeDb(db.from('shopping_items').delete().eq('id', id))
    }
  }

  const clearCompletedShopping = async () => {
    if (!await verifyUserAndPartnershipAccess()) return
    const toDelete = shoppingItems.value.filter(i => i.is_completed).map(i => i.id)
    shoppingItems.value = shoppingItems.value.filter(i => !i.is_completed)
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('SHOPPING_CLEAR', {})

    if (db && toDelete.length > 0) {
      safeDb(db.from('shopping_items').delete().in('id', toDelete))
    }
  }

  // --- TASKS ACTIONS ---
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
      points: points || 15,
      created_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }
    tasksList.value.unshift(newTask)
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('TASK_ADD', newTask)

    if (db) {
      safeDb(db.from('tasks').insert(newTask))
    }
  }

  const toggleTask = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const task = tasksList.value.find(t => t.id === id)
    if (!task) return
    task.is_completed = !task.is_completed
    const nowCompleted = task.is_completed

    // Assign completer and completion timestamp
    const myId = currentUser.value?.id || null
    const previousCompleterId = task.completed_by
    task.completed_by = nowCompleted ? myId : null
    task.completed_at = nowCompleted ? new Date().toISOString() : null

    const taskPts = Number(task.points) || 15
    const delta = nowCompleted ? taskPts : -taskPts

    // Award / deduct points in local profile state permanently
    if (nowCompleted) {
      if (currentUser.value) {
        currentUser.value.points = (Number(currentUser.value.points) || 0) + taskPts
        if (db && currentUser.value.id) {
          safeDb(db.from('profiles').update({ points: currentUser.value.points }).eq('id', currentUser.value.id))
        }
      }
    } else {
      // Uncompleting: deduct points from whichever user completed the task
      if (previousCompleterId && partnerUser.value && previousCompleterId === partnerUser.value.id) {
        partnerUser.value.points = Math.max(0, (Number(partnerUser.value.points) || 0) - taskPts)
        if (db && partnerUser.value.id) {
          safeDb(db.from('profiles').update({ points: partnerUser.value.points }).eq('id', partnerUser.value.id))
        }
      } else if (currentUser.value) {
        currentUser.value.points = Math.max(0, (Number(currentUser.value.points) || 0) - taskPts)
        if (db && currentUser.value.id) {
          safeDb(db.from('profiles').update({ points: currentUser.value.points }).eq('id', currentUser.value.id))
        }
      }
    }

    if (partnership.value) {
      partnership.value.pet_xp = Math.max(0, (partnership.value.pet_xp || 0) + delta)
    }
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('TASK_TOGGLE', {
      id,
      title: task.title,
      points: task.points,
      is_completed: nowCompleted,
      completed_by: task.completed_by,
      completed_at: task.completed_at,
      pet_xp: partnership.value?.pet_xp,
      user_points: currentUser.value?.points,
      partner_points: partnerUser.value?.points
    })

    if (db) {
      safeDb(db.from('tasks').update({
        is_completed: nowCompleted,
        completed_at: task.completed_at,
        completed_by: task.completed_by
      }).eq('id', id))

      if (partnership.value?.id) {
        safeDb(db.from('partnerships').update({
          pet_xp: partnership.value.pet_xp
        }).eq('id', partnership.value.id))
      }
    }
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
    // Points earned are permanent and stay with the user & nest even when completed tasks are deleted or cleared!
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('TASK_DELETE', { id })

    if (db) {
      safeDb(db.from('tasks').delete().eq('id', id))
    }
  }

  // --- EXTENDED CALENDAR & EVENTS ACTIONS ---
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

    // Normalize start_time to valid ISO timestamp
    let normalizedStartTime = startTime || new Date().toISOString()
    const startD = new Date(normalizedStartTime)
    if (!isNaN(startD.getTime())) {
      normalizedStartTime = startD.toISOString()
    }

    // Normalize end_time to valid ISO timestamp or undefined
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

    // Broadcast live to partner immediately
    broadcastToPartner('EVENT_ADD', newEvent)

    if (db) {
      safeDb(db.from('events').insert(newEvent))
    }
    triggerToast('Dodano plan do Waszego terminarza!')
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

    // Broadcast live to partner
    broadcastToPartner('EVENT_UPDATE', { id, updates: sanitizedUpdates })

    if (db) {
      safeDb(db.from('events').update(sanitizedUpdates).eq('id', id))
    }
    triggerToast('Zaktualizowano plan w terminarzu.')
  }

  const toggleEventCompleted = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const ev = eventsList.value.find(e => e.id === id)
    if (!ev) return
    const wasCompleted = ev.is_completed
    ev.is_completed = !ev.is_completed

    // Award 10 points to the user who fulfilled the plan
    if (currentUser.value) {
      if (!wasCompleted && ev.is_completed) {
        currentUser.value.points = (Number(currentUser.value.points) || 0) + 10
      } else if (wasCompleted && !ev.is_completed) {
        currentUser.value.points = Math.max(0, (Number(currentUser.value.points) || 0) - 10)
      }
      if (db && currentUser.value.id) {
        safeDb(db.from('profiles').update({ points: currentUser.value.points }).eq('id', currentUser.value.id))
      }
    }
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('EVENT_TOGGLE_COMPLETED', {
      id,
      title: ev.title,
      is_completed: ev.is_completed,
      user_points: currentUser.value?.points
    })

    if (db) {
      safeDb(db.from('events').update({ is_completed: ev.is_completed }).eq('id', id))
    }
    triggerToast(ev.is_completed ? 'Wydarzenie zrealizowane! +10 pkt dla Ciebie' : 'Oznaczono jako nadchodzące.')
  }

  const deleteEvent = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    eventsList.value = eventsList.value.filter(e => e.id !== id)
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('EVENT_DELETE', { id })

    if (db) {
      safeDb(db.from('events').delete().eq('id', id))
    }
    triggerToast('Usunięto plan z kalendarza.')
  }

  // --- MOOD & NUDGES ACTIONS ---
  const updateMood = async (mood: string, note: string = '') => {
    if (!await verifyUserAndPartnershipAccess()) return
    currentUser.value.current_mood = mood
    currentUser.value.mood_note = note.trim()
    currentUser.value.mood_updated_at = new Date().toISOString()
    syncToStorage()

    // Broadcast live to partner
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
    triggerToast('Zaktualizowano Twój nastrój!')
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

  const sendNudge = async (nudgeType: string, message: string = '') => {
    if (!partnership.value || !partnerUser.value) return false
    if (!await verifyUserAndPartnershipAccess()) return false

    // Limit: only 1 nudge per person per 24 hours
    if (hasSentDailyNudge.value) {
      triggerToast(`Dzisiejsze puknięcie zostało już wysłane! Kolejne za: ${formattedNextNudgeTime.value}.`)
      return false
    }

    const now = Date.now()
    lastNudgeSentAt.value = now
    if (typeof window !== 'undefined' && currentUser.value?.id) {
      try {
        localStorage.setItem(`duonest_last_nudge_ts_${currentUser.value.id}`, now.toString())
      } catch {}
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
    nudgesList.value.unshift(newNudge)

    // Reward 5 points for sender
    currentUser.value.points = (Number(currentUser.value.points) || 0) + 5
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('NUDGE_SEND', {
      ...newNudge,
      sender_points: currentUser.value.points
    })

    if (db) {
      safeDb(db.from('nudges').insert(newNudge))
      if (currentUser.value?.id) {
        safeDb(db.from('profiles').update({ points: currentUser.value.points }).eq('id', currentUser.value.id))
      }
    }

    triggerToast(`Wysłano dzisiejsze puknięcie do ${partnerUser.value.name}! (+5 pkt)`)
    return true
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
    triggerToast('Zapisano ustawienia Waszego Gniazdka.')
  }

  // --- PROFILE & PERSONAL DATA MANAGEMENT ---
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

    // Live broadcast across Supabase Realtime WebSocket
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

      // ONLY touch avatar_color in the DB if updates.avatar_color was explicitly provided
      if (updates.avatar_color) {
        const cleanNewColor = getCleanAccentColor(updates.avatar_color)
        profileDbUpdates.avatar_color = cleanNewColor

        const hashToPreserve = currentUserPasswordHash.value || (typeof window !== 'undefined' ? localStorage.getItem('duonest_user_pwd_hash') : '')
        if (hashToPreserve) {
          profileDbUpdates.password_hash = hashToPreserve
        }
      }

      safeDb(db.from('profiles').update(profileDbUpdates).eq('id', currentUser.value.id))

      if (partnership.value) {
        safeDb(db.from('partnerships').update({
          nest_name: partnership.value.nest_name,
          anniversary_date: partnership.value.anniversary_date
        }).eq('id', partnership.value.id))
      }
    }

    triggerToast('Zaktualizowano Twój profil!')
  }

  // Days together calculation
  const daysTogether = computed(() => {
    const dateStr = partnership.value?.anniversary_date || partnership.value?.created_at || new Date().toISOString()
    const start = new Date(dateStr).getTime()
    const now = Date.now()
    const diff = Math.max(0, now - start)
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
  })

  // User Accent Colors (for tasks, assignments, and personalized styling)
  const currentUserAccentColor = computed(() => {
    return getCleanAccentColor(currentUser.value?.avatar_color, '#0f172a')
  })

  const partnerUserAccentColor = computed(() => {
    return getCleanAccentColor(partnerUser.value?.avatar_color, '#1e293b')
  })

  const getUserAccentColor = (userId?: string | null): string => {
    if (!userId) return '#64748b' // Shared / neutral
    if (currentUser.value && userId === currentUser.value.id) {
      return currentUserAccentColor.value
    }
    if (partnerUser.value && userId === partnerUser.value.id) {
      return partnerUserAccentColor.value
    }
    return '#64748b'
  }

  // Helper to determine who completed or was assigned a task
  const getTaskCompleterId = (task: TaskItem): string | null => {
    if (task.completed_by) return task.completed_by
    if (task.assigned_to) return task.assigned_to
    if (task.created_by) return task.created_by
    return null
  }

  // --- DUO POINTS BREAKDOWN PER PERSON ---
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

  // Individual points read exclusively from Supabase profiles.points (DB is single source of truth)
  const userPoints = computed(() => Number(currentUser.value?.points) || 0)
  const partnerPoints = computed(() => Number(partnerUser.value?.points) || 0)

  // Total Duet score is ALWAYS the exact sum of both users' points in the pair
  const nestPoints = computed(() => userPoints.value + partnerPoints.value)

  const nestLevel = computed(() => {
    return Math.max(1, 1 + Math.floor(nestPoints.value / 50))
  })

  const pointsToNextLevel = computed(() => {
    const currentLvl = nestLevel.value
    const targetPoints = currentLvl * 50
    return Math.max(0, targetPoints - nestPoints.value)
  })

  const levelProgress = computed(() => {
    const currentPointsInTier = nestPoints.value % 50
    return Math.min(100, Math.round((currentPointsInTier / 50) * 100))
  })

  // Balanced percentage bar based on individual contributions
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

  // --- MILESTONES & REWARDS CRUD ACTIONS ---
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
    triggerToast(`Dodano cel: ${newMilestone.title}! 🎯`)
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
    triggerToast('Zaktualizowano cel nagrody.')
  }

  const deleteMilestone = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = milestonesList.value.find(m => m.id === id)
    milestonesList.value = milestonesList.value.filter(m => m.id !== id)
    syncToStorage()
    broadcastToPartner('MILESTONE_DELETE', { id })
    if (db) {
      safeDb(db.from('milestones').delete().eq('id', id))
    }
    triggerToast(`Usunięto cel: ${item?.title || ''}.`)
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
    triggerToast(`Gratulacje! Nagroda "${m.title}" została odebrana! 🎉`)
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
    triggerToast(`Cel "${m.title}" został ustawiony ponownie! 🚀`)
  }

  // --- WISHLIST & GIFT CRUD ACTIONS ---
  const addWishlistItem = async (itemData: {
    title: string
    url?: string | null
    image_url?: string | null
    price?: string | null
    currency?: string | null
    site_name?: string | null
    note?: string | null
    for_user_id?: string | null // null = Wspólne, currentUser.id = Dla mnie, partnerUser.id = Dla partnera
    is_visible_to_partner?: boolean // default true; if false, it's a secret surprise gift for partner
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

    // Only broadcast to partner if visible to partner
    if (newItem.is_visible_to_partner) {
      broadcastToPartner('WISHLIST_ADD', newItem)
    }

    const msg = !newItem.is_visible_to_partner
      ? `Dodano niespodziankę dla partnera (ukryte przed nim 🤫): "${newItem.title}"`
      : `Dodano do listy marzeń: "${newItem.title}"! ✨`
    triggerToast(msg)

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
        // Was hidden, now made visible
        broadcastToPartner('WISHLIST_ADD', updated)
      } else {
        broadcastToPartner('WISHLIST_UPDATE', { id, updates, item: updated })
      }
    } else if (oldVisibility) {
      // Was visible, now hidden -> partner should remove it
      broadcastToPartner('WISHLIST_DELETE', { id })
    }

    triggerToast(`Zaktualizowano marzenie: "${updated.title}"! ✨`)
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

    triggerToast(`Usunięto z listy marzeń: "${item.title}".`)
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

    if (item.is_visible_to_partner) {
      broadcastToPartner('WISHLIST_TOGGLE_COMPLETED', {
        id,
        is_completed: newCompleted,
        completed_at: completedAt
      })
    }

    triggerToast(newCompleted ? `Marzenie "${item.title}" zostało spełnione! 🎉` : `Oznaczono marzenie jako niespełnione.`)
  }

  let _refreshWishlistInFlight = false
  let _refreshWishlistQueued = false

  const refreshWishlist = async () => {
    // If a request is already in-flight, just queue one more run for after it finishes
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
        // Merge: never drop items that are locally present but not yet in DB response
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
        // Run one more time to pick up any changes that arrived during the in-flight request
        setTimeout(() => refreshWishlist(), 300)
      }
    }
  }

  // --- MOVIES / FILMY & SERIALE CRUD ACTIONS ---
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

    // Prevent duplicate entries
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
      triggerToast(`"${existing.title}" znajduje się już na Waszej liście seansów! 🍿`, {
        type: 'movies',
        title: 'Już na liście'
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
      last_watched_season: movie.last_watched_season !== undefined ? movie.last_watched_season : ((movie.media_type === 'tv' || movie.media_type === 'anime') ? 1 : null),
      last_watched_episode: movie.last_watched_episode !== undefined ? movie.last_watched_episode : ((movie.media_type === 'tv' || movie.media_type === 'anime') ? 1 : null),
      created_at: new Date().toISOString()
    }

    moviesList.value = [newDoc, ...moviesList.value.filter(m => m.id !== newDoc.id)]
    syncToStorage()

    broadcastToPartner('MOVIE_ADD', newDoc)

    const client = getSupabaseClient()
    if (client && pId) {
      safeDb(client.from('movies').insert(newDoc))
    }

    triggerToast(`Dodano "${newDoc.title}" do Waszej listy! 🍿`, { type: 'movies', title: 'Filmy & Seriale' })
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

    triggerToast(`Usunięto "${item.title}" z listy filmów.`)
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
      triggerToast(`"${item.title}" oznaczono jako obejrzane! 🎉 Czas na recenzję.`, { type: 'movies', title: 'Filmy & Seriale' })
    } else if (newStatus === 'watching') {
      triggerToast(`Zaczęliście seans "${item.title}"! 🍿`, { type: 'movies', title: 'Filmy & Seriale' })
    } else {
      triggerToast(`Przeniesiono "${item.title}" do planowanych.`)
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

    triggerToast(`Zapisano Twoją recenzję dla "${item.title}" (${rating}/10 ⭐)!`, { type: 'movies', title: 'Recenzje Filmowe' })
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

    triggerToast(`Zaktualizowano: ${item.title} (Sezon ${cleanSeason}, Odc. ${cleanEpisode})! 📺`, {
      type: 'movies',
      title: 'Postęp serialu'
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

  // --- MEALS & DINNER PLANNER CRUD ACTIONS ---
  const addMeal = async (meal: {
    date: string // 'YYYY-MM-DD'
    title: string
    day_name?: string
    category?: string
    area?: string
    cook_id?: string
    image_url?: string
    source?: 'custom' | 'api'
    api_id?: string
    ingredients?: MealIngredient[]
    instructions?: string
    youtube_url?: string
    recipe_url?: string
  }): Promise<MealItem | null> => {
    if (!meal.title.trim()) return null
    if (!await verifyUserAndPartnershipAccess()) return null

    const pId = partnership.value?.id || currentUser.value?.partnership_id || ''
    const newDoc: MealItem = {
      id: 'meal_' + Math.random().toString(36).substring(2, 9),
      partnership_id: pId,
      date: meal.date,
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

    // Replace if meal on this date already exists or add to list
    mealsList.value = [newDoc, ...mealsList.value.filter(m => m.id !== newDoc.id)]
    syncToStorage()

    broadcastToPartner('MEAL_ADD', newDoc)

    const client = getCleanDbClient() || getSupabaseClient()
    if (client && pId) {
      safeDb(client.from('meals').upsert(newDoc))
    }

    triggerToast(`Zaplanowano obiad: "${newDoc.title}"`)
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

    triggerToast(`Usunięto obiad "${item.title}" z planu.`)
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

    const displayName = recipe.titlePl || recipe.title || 'przepis'
    triggerToast(`Usunięto "${displayName}" z Twoich przepisów.`)
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

    const client = getCleanDbClient() || getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (client && pId) {
      safeDb(client.from('meals').update({ is_completed: newStatus, completed_at: completedAt }).eq('id', id))
    }

    if (newStatus) {
      triggerToast(`Smacznego! Obiad "${item.title}" zjedzony.`)
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
    triggerToast(`Dodano ${count} składników do Listy Zakupów!`)
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

  return {
    authUser,
    authSession,
    isAuthenticated,
    isAuthLoading,
    signInWithEmail,
    signUpWithEmail,
    bypassLoginWithEmail,
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
    changeUserPassword
  }
}
