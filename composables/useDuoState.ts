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
}

export interface Partnership {
  id: string
  partner1_id: string
  partner2_id: string
  nest_name: string
  nest_level: number
  nest_points: number
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
  favorite_treat: ''
})

// Color & styling helper utilities
export const getCleanAccentColor = (rawColor?: string | null, fallback = '#0284c7'): string => {
  if (!rawColor) return fallback
  const first = rawColor.split('|')[0].trim()
  return first.startsWith('#') ? first : (first ? `#${first}` : fallback)
}

export const hexToRgba = (hex: string, alpha = 0.15): string => {
  if (!hex) return `rgba(2, 132, 199, ${alpha})`
  let c = hex.replace('#', '').trim()
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('')
  }
  const num = parseInt(c, 16)
  if (isNaN(num)) return `rgba(2, 132, 199, ${alpha})`
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

const isOnlineWithSupabase = ref(true)
const realtimeStatus = ref<'connected' | 'connecting' | 'disconnected'>('disconnected')
const dbSchemaStatus = ref<'checking' | 'connected' | 'missing_tables'>('checking')
const isPartnerOnline = ref(false)
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
export type ToastType = 'success' | 'love' | 'points' | 'calendar' | 'shopping' | 'tasks' | 'mood' | 'wishlist' | 'info' | 'warning'

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
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) - hash) + password.charCodeAt(i)
    hash |= 0
  }
  return 'h_' + Math.abs(hash).toString(16)
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
let activePairingChannel: any = null
let activeSecurityChannel: any = null
let globalSupabaseClient: any = null
let securityLifecycleBound = false
let securityCheckInterval: any = null
let lastSecurityVerifiedAt = 0
let isSecurityVerifying = false
let isLoggingOut = false

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
  } catch (err) {
    console.warn('Fallback Supabase client init:', err)
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
        avatar_color: getCleanAccentColor(savedUser.avatar_color, '#0284c7'),
        love_note: cleanLoveNote,
        favorite_drink: cleanDrink,
        favorite_treat: cleanTreat
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
        avatar_color: getCleanAccentColor(savedPartner.avatar_color, '#0d9488'),
        love_note: cleanPartnerLoveNote,
        favorite_drink: cleanPartnerDrink,
        favorite_treat: cleanPartnerTreat
      }
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
      // Clear legacy initial 20 points if no tasks or nudges exist yet
      const hasEarnedPoints = (savedTasks && savedTasks.some(t => t.is_completed)) || (savedNudges && savedNudges.length > 0)
      if (savedPartnership.nest_points === 20 && !hasEarnedPoints) {
        savedPartnership.nest_points = 0
        savedPartnership.nest_level = 1
        saveToStorage('duonest_partnership', savedPartnership)
      }
      partnership.value = savedPartnership
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
            authUser.value = null
            authSession.value = null
            clearAllDuoState()
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
    if (!user || !user.id || !supabase) return

    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

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
          id: user.id,
          avatar_color: cleanColor,
          email: user.email || dbProfile.email
        }
        syncToStorage()

        if (dbProfile.partnership_id) {
          await loadPartnershipAndPartner(dbProfile.partnership_id, user.id)
        }
      } else {
        const initialName = user.user_metadata?.name || user.email?.split('@')[0] || 'Użytkownik'
        const newProfile: Profile = {
          ...createInitialProfile(),
          id: user.id,
          email: user.email || null,
          name: initialName,
          pairing_code: generateUniqueCode(),
          partnership_id: null
        }
        currentUser.value = newProfile
        syncToStorage()
        safeDb(supabase.from('profiles').upsert(newProfile))
      }

      if (partnership.value?.id) {
        subscribeToPartnershipRealtime(partnership.value.id)
      } else if (currentUser.value?.pairing_code) {
        subscribeToPairingChannel(currentUser.value.pairing_code)
      }
      subscribeToSecurityChannel(user.id, partnership.value?.id)
    } catch (err) {
      if (process.dev) {
        console.warn('syncUserProfileWithAuth error:', err)
      }
    }
  }

  const loadPartnershipAndPartner = async (partnershipId: string, currentUserId: string) => {
    if (!supabase) return
    try {
      const { data: pData } = await supabase
        .from('partnerships')
        .select('*')
        .eq('id', partnershipId)
        .maybeSingle()

      if (pData) {
        const hasEarnedPoints = tasksList.value.some(t => t.is_completed) || nudgesList.value.length > 0
        if (pData.nest_points === 20 && !hasEarnedPoints) {
          pData.nest_points = 0
          pData.nest_level = 1
          safeDb(supabase.from('partnerships').update({ nest_points: 0, nest_level: 1 }).eq('id', partnershipId))
        }
        partnership.value = pData
        saveToStorage('duonest_partnership', pData)

        const myId = currentUserId || currentUser.value?.id || authUser.value?.id
        const partnerId = (myId && pData.partner1_id === myId)
          ? pData.partner2_id
          : ((myId && pData.partner2_id === myId) ? pData.partner1_id : (pData.partner1_id || pData.partner2_id))
        if (partnerId) {
          const { data: pUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', partnerId)
            .maybeSingle()

          if (pUser) {
            const rawPartnerColor = pUser.avatar_color || '#0d9488'
            const cleanPartnerColor = rawPartnerColor.includes('|') ? rawPartnerColor.split('|')[0] : rawPartnerColor
            partnerUser.value = {
              ...createInitialProfile(),
              ...pUser,
              name: pUser.name || (pUser.email ? pUser.email.split('@')[0] : 'Partner'),
              love_note: (pUser.love_note === 'Budujemy nasze wspólne gniazdko!' || pUser.love_note === 'Cieszę się, że jesteśmy razem!') ? '' : (pUser.love_note || ''),
              favorite_drink: pUser.favorite_drink === 'Kawa z mlekiem' ? '' : (pUser.favorite_drink || ''),
              favorite_treat: pUser.favorite_treat === 'Czekolada' ? '' : (pUser.favorite_treat || ''),
              avatar_color: cleanPartnerColor
            }
            saveToStorage('duonest_partner_user', partnerUser.value)
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

  const clearAllDuoState = () => {
    currentUser.value = createInitialProfile()
    partnerUser.value = null
    partnership.value = null
    shoppingItems.value = []
    tasksList.value = []
    eventsList.value = []
    nudgesList.value = []
    wishlistItems.value = []
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
      localStorage.removeItem('duonest_wishlist')
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return { data: null, error: new Error('Wprowadź adres e-mail') }

    try {
      // Direct query to Supabase profiles by email
      const { data: dbProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (fetchErr) {
        console.warn('Profile fetch warning:', fetchErr)
      }

      if (!dbProfile) {
        return {
          data: null,
          error: new Error('Nie znaleziono konta z tym adresem e-mail. Sprawdź e-mail lub zarejestruj się.')
        }
      }

      // Validate password
      const rawColor = dbProfile.avatar_color || '#0284c7'
      let storedHash = ''
      let displayColor = '#0284c7'
      if (rawColor.includes('|')) {
        const parts = rawColor.split('|')
        displayColor = parts[0] || '#0284c7'
        storedHash = parts[1] || ''
      } else {
        displayColor = rawColor
      }

      const enteredHash = await hashPassword(password)
      if (storedHash && storedHash !== enteredHash) {
        return {
          data: null,
          error: new Error('Nieprawidłowe hasło. Sprawdź hasło i spróbuj ponownie.')
        }
      }

      // If user profile did not have a hash stored yet, associate it now
      if (!storedHash) {
        storedHash = enteredHash
        safeDb(supabase.from('profiles').update({ avatar_color: `${displayColor}|${enteredHash}` }).eq('id', dbProfile.id))
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

      currentUser.value = {
        ...createInitialProfile(),
        ...dbProfile,
        name: dbProfile.name || '',
        love_note: (dbProfile.love_note === 'Budujemy nasze wspólne gniazdko!' || dbProfile.love_note === 'Cieszę się, że jesteśmy razem!') ? '' : (dbProfile.love_note || ''),
        favorite_drink: dbProfile.favorite_drink === 'Kawa z mlekiem' ? '' : (dbProfile.favorite_drink || ''),
        favorite_treat: dbProfile.favorite_treat === 'Czekolada' ? '' : (dbProfile.favorite_treat || ''),
        avatar_color: displayColor
      }
      syncToStorage()

      if (dbProfile.partnership_id) {
        await loadPartnershipAndPartner(dbProfile.partnership_id, dbProfile.id)
        subscribeToPartnershipRealtime(dbProfile.partnership_id)
      } else if (currentUser.value?.pairing_code) {
        subscribeToPairingChannel(currentUser.value.pairing_code)
      }
      subscribeToSecurityChannel(dbProfile.id, dbProfile.partnership_id)

      return { data: { user: authUserObj, session: authSessionObj }, error: null }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    if (!supabase) return { data: null, error: new Error('Brak połączenia z systemem') }
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = (name || '').trim() || 'Użytkownik'

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Wprowadź prawidłowy adres e-mail.') }
    }
    if (password.length < 6) {
      return { data: null, error: new Error('Hasło musi mieć co najmniej 6 znaków.') }
    }

    try {
      // 1. Check if email already registered in Supabase profiles
      const { data: existingProfiles } = await supabase
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

      // 2. Hash password & prepare unique profile
      const passHash = await hashPassword(password)
      const newUserId = 'usr_' + Math.random().toString(36).substring(2, 11)
      const newPairingCode = generateUniqueCode()

      const newProfile: Profile = {
        ...createInitialProfile(),
        id: newUserId,
        email: cleanEmail,
        name: cleanName,
        avatar_url: null,
        avatar_color: `#0284c7|${passHash}`,
        pairing_code: newPairingCode,
        partnership_id: null,
        current_mood: 'happy',
        mood_note: '',
        love_note: '',
        favorite_drink: '',
        favorite_treat: ''
      }

      // 3. Insert into Supabase profiles
      const { error: insertErr } = await supabase
        .from('profiles')
        .insert(newProfile)

      if (insertErr) {
        console.error('Supabase profile creation error:', insertErr)
        throw new Error('Nie udało się utworzyć profilu: ' + (insertErr.message || insertErr))
      }

      currentUserPasswordHash.value = passHash
      if (typeof window !== 'undefined') {
        localStorage.setItem('duonest_user_pwd_hash', passHash)
      }

      // 4. Authenticate user immediately with no email verification needed
      const authUserObj = {
        id: newUserId,
        email: cleanEmail,
        user_metadata: { name: cleanName }
      }
      const authSessionObj = {
        user: authUserObj,
        access_token: 'duonest_direct_' + newUserId
      }

      authUser.value = authUserObj
      authSession.value = authSessionObj
      saveToStorage('duonest_auth_user', authUserObj)
      saveToStorage('duonest_auth_session', authSessionObj)

      currentUser.value = {
        ...newProfile,
        avatar_color: '#0284c7'
      }
      syncToStorage()

      subscribeToPairingChannel(newPairingCode)
      subscribeToSecurityChannel(newProfile.id, null)

      return { data: { user: authUserObj, session: authSessionObj }, error: null }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const bypassLoginWithEmail = async (email: string, name: string) => {
    return signUpWithEmail(email, 'duonest_pass', name)
  }

  const signOutUser = async () => {
    if (isLoggingOut) return
    isLoggingOut = true

    if (securityCheckInterval) {
      clearInterval(securityCheckInterval)
      securityCheckInterval = null
    }
    if (activeSecurityChannel && supabase) {
      try { supabase.removeChannel(activeSecurityChannel) } catch (_) {}
      activeSecurityChannel = null
    }
    if (activePartnershipChannel && supabase) {
      try { supabase.removeChannel(activePartnershipChannel) } catch (_) {}
      activePartnershipChannel = null
    }
    if (activePairingChannel && supabase) {
      try { supabase.removeChannel(activePairingChannel) } catch (_) {}
      activePairingChannel = null
    }
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (_) {}
    }
    authUser.value = null
    authSession.value = null
    clearAllDuoState()
    if (typeof window !== 'undefined') {
      await navigateTo('/login', { replace: true })
    }
    isLoggingOut = false
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
  }

  // Broadcast an action to the partner via Supabase Realtime WebSocket
  const broadcastToPartner = (action: string, payload: any) => {
    if (activePartnershipChannel && realtimeStatus.value === 'connected') {
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
    if (!supabase || typeof window === 'undefined' || !userId) return

    if (activeSecurityChannel) {
      try {
        supabase.removeChannel(activeSecurityChannel)
      } catch (_) {}
      activeSecurityChannel = null
    }

    const channelName = `duonest_sec_${userId}`
    const channel = supabase.channel(channelName)

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
            triggerToast('Twoje parowanie zostało zakończone w bazie danych. Zostałeś wylogowany.', {
              type: 'warning',
              title: 'Utrata parowania'
            })
            await signOutUser()
          }
        }
      }
    )

    // 2. If paired, listen for partnership deletion or removal in Supabase
    if (partnershipId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partnerships',
          filter: `id=eq.${partnershipId}`
        },
        async (payload: any) => {
          if (payload.eventType === 'DELETE') {
            triggerToast('Wasze Gniazdko zostało usunięte w bazie danych. Zostałeś wylogowany.', {
              type: 'warning',
              title: 'Gniazdko usunięte'
            })
            await signOutUser()
            return
          }

          if (payload.eventType === 'UPDATE') {
            const { partner1_id, partner2_id } = payload.new || {}
            if (partner1_id !== userId && partner2_id !== userId) {
              triggerToast('Nie należysz już do tego Gniazdka. Zostałeś wylogowany.', {
                type: 'warning',
                title: 'Brak uprawnień'
              })
              await signOutUser()
            }
          }
        }
      )
    }

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        activeSecurityChannel = channel
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

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (currentUser.value?.id && authUser.value) {
          verifyUserAndPartnershipAccess(true)
        }
        if (partnership.value?.id || currentUser.value?.partnership_id) {
          refreshWishlist()
        }
      }
    })

    window.addEventListener('focus', () => {
      if (currentUser.value?.id && authUser.value) {
        verifyUserAndPartnershipAccess(true)
      }
      if (partnership.value?.id || currentUser.value?.partnership_id) {
        refreshWishlist()
      }
    })
  }

  const verifyUserAndPartnershipAccess = async (force: boolean = false): Promise<boolean> => {
    if (typeof window === 'undefined' || isLoggingOut) return true

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return true
    }

    const now = Date.now()
    if (!force && now - lastSecurityVerifiedAt < 2500) {
      return true
    }

    const client = getSupabaseClient()
    if (!client) return true

    const userId = currentUser.value?.id
    const pId = partnership.value?.id

    if (!userId) {
      await signOutUser()
      return false
    }

    if (isSecurityVerifying) return true
    isSecurityVerifying = true

    try {
      // 1. Verify user profile exists in database
      const { data: dbProfile, error: profileErr } = await client
        .from('profiles')
        .select('id, partnership_id')
        .eq('id', userId)
        .maybeSingle()

      if (profileErr) {
        if (profileErr.code === '42P01' || profileErr.message?.includes('fetch') || profileErr.message?.includes('network')) {
          return true
        }
      }

      if (!dbProfile && !profileErr) {
        triggerToast('Twoje konto nie istnieje w bazie danych. Zostałeś wylogowany.', {
          type: 'warning',
          title: 'Konto nie istnieje'
        })
        await signOutUser()
        return false
      }

      // 2. If user is in an active Gniazdko, verify partnership linkage
      if (pId) {
        if (dbProfile && (!dbProfile.partnership_id || dbProfile.partnership_id !== pId)) {
          triggerToast('Utracono połączenie z Gniazdkiem (brak parowania w bazie). Zostałeś wylogowany.', {
            type: 'warning',
            title: 'Utrata parowania'
          })
          await signOutUser()
          return false
        }

        const { data: dbPartnership, error: partErr } = await client
          .from('partnerships')
          .select('id, partner1_id, partner2_id')
          .eq('id', pId)
          .maybeSingle()

        if (partErr) {
          if (partErr.code === '42P01' || partErr.message?.includes('fetch') || partErr.message?.includes('network')) {
            return true
          }
        }

        if (!dbPartnership && !partErr) {
          triggerToast('Wasze Gniazdko zostało usunięte w bazie danych. Zostałeś wylogowany.', {
            type: 'warning',
            title: 'Gniazdko usunięte'
          })
          await signOutUser()
          return false
        }

        if (dbPartnership && dbPartnership.partner1_id !== userId && dbPartnership.partner2_id !== userId) {
          triggerToast('Nie masz uprawnień do tego Gniazdka w bazie danych. Zostałeś wylogowany.', {
            type: 'warning',
            title: 'Brak uprawnień'
          })
          await signOutUser()
          return false
        }

        // Auto-heal partner name if missing or placeholder 'Partner'
        if (dbPartnership && (!partnerUser.value || !partnerUser.value.name || partnerUser.value.name === 'Partner')) {
          const myId = userId
          const partnerId = (myId && dbPartnership.partner1_id === myId)
            ? dbPartnership.partner2_id
            : ((myId && dbPartnership.partner2_id === myId) ? dbPartnership.partner1_id : (dbPartnership.partner1_id || dbPartnership.partner2_id))
          if (partnerId) {
            const { data: pUser } = await client
              .from('profiles')
              .select('*')
              .eq('id', partnerId)
              .maybeSingle()
            if (pUser && pUser.name) {
              const rawPColor = pUser.avatar_color || '#0d9488'
              const cleanPColor = rawPColor.includes('|') ? rawPColor.split('|')[0] : rawPColor
              partnerUser.value = {
                ...createInitialProfile(),
                ...pUser,
                name: pUser.name,
                avatar_color: cleanPColor
              }
              saveToStorage('duonest_partner_user', partnerUser.value)
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
    if (!supabase || typeof window === 'undefined') return

    // If already subscribed to this partnership channel, do not duplicate
    if (activePartnershipChannel) {
      try {
        supabase.removeChannel(activePartnershipChannel)
      } catch (_) {}
    }

    realtimeStatus.value = 'connecting'
    const channelName = `duonest_channel_${partnershipId}`
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: currentUser.value.id }
      }
    })

    // 1. Presence: See when partner is actively inside the app
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const users = Object.keys(presenceState)
        const partnerIsHere = users.some(uid => uid !== currentUser.value.id)
        isPartnerOnline.value = partnerIsHere
      })
      .on('presence', { event: 'join' }, ({ key }: any) => {
        if (key !== currentUser.value.id) {
          isPartnerOnline.value = true
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
        }
      })

    // 2. Realtime Broadcast Actions: Instant sync across devices (<50ms)
    channel.on('broadcast', { event: 'duo_sync' }, async (envelope: any) => {
      const { action, senderId, senderName, data } = envelope.payload || {}
      if (senderId === currentUser.value.id) return // ignore own echoes

      switch (action) {
        case 'PARTNERSHIP_DISCONNECT': {
          triggerToast('Wasze Gniazdko zostało rozłączone. Zostałeś wylogowany.', {
            type: 'warning',
            title: 'Gniazdko rozłączone'
          })
          await signOutUser()
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
              task.is_completed = data.is_completed
              if (partnership.value) {
                const delta = data.is_completed ? task.points : -task.points
                partnership.value.nest_points = Math.max(0, partnership.value.nest_points + delta)
                partnership.value.nest_level = 1 + Math.floor(partnership.value.nest_points / 50)
                if (data.pet_xp !== undefined) {
                  partnership.value.pet_xp = Math.max(0, data.pet_xp)
                } else {
                  partnership.value.pet_xp = Math.max(0, (partnership.value.pet_xp || 0) + delta)
                }
                if (data.nest_points !== undefined) {
                  partnership.value.nest_points = Math.max(0, data.nest_points)
                  partnership.value.nest_level = 1 + Math.floor(partnership.value.nest_points / 50)
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
            if (partnership.value) {
              partnership.value.nest_points += 5
              partnership.value.nest_level = 1 + Math.floor(partnership.value.nest_points / 50)
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
          refreshWishlist()
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
          refreshWishlist()
          break
        }
        case 'WISHLIST_DELETE': {
          if (data?.id) {
            const deleted = wishlistItems.value.find(w => w.id === data.id)
            wishlistItems.value = wishlistItems.value.filter(w => w.id !== data.id)
            syncToStorage()
            if (deleted) triggerToast(`${senderName} usunął(a) marzenie: "${deleted.title}"`, { type: 'wishlist', title: 'Wishlista & Prezenty' })
          }
          refreshWishlist()
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
          refreshWishlist()
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
              name: data.profile.name || partnerUser.value?.name || 'Partner'
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
              name: data.profile.name || partnerUser.value?.name || 'Partner'
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
                name: data.profile.name || partnerUser.value?.name || 'Partner'
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
              partnership.value.nest_points = Math.max(partnership.value.nest_points, data.partnership.nest_points || 0)
              partnership.value.nest_level = Math.max(partnership.value.nest_level, data.partnership.nest_level || 1)
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
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        realtimeStatus.value = 'disconnected'
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
    if (!supabase || typeof window === 'undefined') return
    const code = normalizePairingCode(myPairingCode)
    if (!code) return

    if (activePairingChannel) {
      try { supabase.removeChannel(activePairingChannel) } catch (_) {}
      activePairingChannel = null
    }

    const pairChannelName = `duonest_pair_${code}`
    const pairChan = supabase.channel(pairChannelName, {
      config: { broadcast: { ack: true } }
    })

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
        try { supabase.removeChannel(pairChan) } catch (_) {}
        activePairingChannel = null
        subscribeToPartnershipRealtime(newPartnership.id)
        subscribeToSecurityChannel(currentUser.value.id, newPartnership.id)
      }, 500)
    })

    pairChan.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        activePairingChannel = pairChan
      }
    })
  }

  // Check and sync with Supabase tables if active session/tables exist
  const initSupabaseSync = async () => {
    initializeClientState()
    const client = getSupabaseClient()
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
            currentUser.value = {
              ...currentUser.value,
              ...dbProfile,
              name: dbProfile.name || currentUser.value.name || '',
              avatar_color: getCleanAccentColor(dbProfile.avatar_color, currentUser.value.avatar_color || '#0284c7'),
              partnership_id: dbProfile.partnership_id || null
            }
            syncToStorage()
          }

          const effectivePartnershipId = dbProfile?.partnership_id || partnership.value?.id
          if (effectivePartnershipId) {
            await loadPartnershipAndPartner(effectivePartnershipId, currentUser.value.id)
          }

          // Sync our profile to Supabase profiles table
          try {
            await client.from('profiles').upsert({
              id: currentUser.value.id,
              name: currentUser.value.name,
              avatar_color: currentUser.value.avatar_color,
              pairing_code: currentUser.value.pairing_code,
              partnership_id: partnership.value?.id || currentUser.value.partnership_id || null,
              current_mood: currentUser.value.current_mood,
              mood_note: currentUser.value.mood_note,
              love_note: currentUser.value.love_note,
              favorite_drink: currentUser.value.favorite_drink,
              favorite_treat: currentUser.value.favorite_treat
            })
          } catch (_) {}
        } else if (partnership.value?.id) {
          await loadPartnershipAndPartner(partnership.value.id, currentUser.value?.id || '')
        }

        // Sync partnership to Supabase partnerships table if available
        if (partnership.value?.id) {
          try {
            await client.from('partnerships').upsert({
              id: partnership.value.id,
              partner1_id: partnership.value.partner1_id,
              partner2_id: partnership.value.partner2_id,
              nest_name: partnership.value.nest_name,
              nest_level: partnership.value.nest_level,
              nest_points: partnership.value.nest_points,
              anniversary_date: partnership.value.anniversary_date
            })
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('initSupabaseSync attempt:', err)
    }
  }

  const loadSupabaseData = async (partnershipId: string) => {
    const client = getSupabaseClient()
    if (!client) return
    try {
      const [shops, tasks, evts, ndgs, wshs] = await Promise.all([
        client.from('shopping_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('tasks').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        client.from('events').select('*').eq('partnership_id', partnershipId).order('start_time', { ascending: true }),
        client.from('nudges').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }).limit(20),
        client.from('wishlist_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false })
      ])

      if (shops.data && shops.data.length > 0) {
        shoppingItems.value = shops.data
      } else if (shoppingItems.value.length > 0) {
        try { await client.from('shopping_items').upsert(shoppingItems.value) } catch (_) {}
      }

      if (tasks.data && tasks.data.length > 0) {
        tasksList.value = tasks.data
      } else if (tasksList.value.length > 0) {
        try { await client.from('tasks').upsert(tasksList.value) } catch (_) {}
      }

      if (evts.data && evts.data.length > 0) {
        eventsList.value = evts.data
      } else if (eventsList.value.length > 0) {
        try { await client.from('events').upsert(eventsList.value) } catch (_) {}
      }

      if (ndgs.data && ndgs.data.length > 0) {
        nudgesList.value = ndgs.data
      }

      if (wshs.data && wshs.data.length > 0) {
        const currentUserId = currentUser.value?.id
        const filtered = wshs.data.filter((item: WishlistItem) => item.is_visible_to_partner || (currentUserId && item.created_by === currentUserId))
        wishlistItems.value = filtered
      } else if (wishlistItems.value.length > 0) {
        try { await client.from('wishlist_items').upsert(wishlistItems.value) } catch (_) {}
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
    return !!(currentUser.value?.partnership_id && partnership.value)
  })

  const updateMyName = async (newName: string) => {
    if (!newName.trim()) return
    if (!await verifyUserAndPartnershipAccess()) return
    currentUser.value.name = newName.trim()
    syncToStorage()
    if (supabase && isOnlineWithSupabase.value) {
      safeDb(supabase.from('profiles').update({ name: currentUser.value.name }).eq('id', currentUser.value.id))
    }
  }

  const pairWithCode = async (rawCode: string, partnerDisplayName: string = 'Partner'): Promise<{ success: boolean; error?: string }> => {
    const code = normalizePairingCode(rawCode)
    if (!code) return { success: false, error: 'Wprowadź kod parowania.' }

    if (code === normalizePairingCode(currentUser.value.pairing_code)) {
      return { success: false, error: 'Nie możesz sparować konta ze swoim własnym kodem.' }
    }

    let foundPartnerProfile: Profile | null = null
    if (supabase) {
      try {
        const { data: dbTarget } = await supabase
          .from('profiles')
          .select('*')
          .eq('pairing_code', code)
          .maybeSingle()
        if (dbTarget) {
          foundPartnerProfile = dbTarget
        }
      } catch (_) {}
    }

    const newPartnershipId = foundPartnerProfile?.partnership_id || ('part_' + Math.random().toString(36).substring(2, 10))
    const newPartnerId = foundPartnerProfile?.id || ('usr_partner_' + Math.random().toString(36).substring(2, 8))
    const partnerName = foundPartnerProfile?.name || (partnerDisplayName && partnerDisplayName !== 'Partner' ? partnerDisplayName : (foundPartnerProfile?.email ? foundPartnerProfile.email.split('@')[0] : 'Partner'))

    const createdPartnership: Partnership = {
      id: newPartnershipId,
      partner1_id: currentUser.value.id,
      partner2_id: newPartnerId,
      nest_name: 'Nasze Ciepłe Gniazdko',
      nest_level: 1,
      nest_points: 0,
      anniversary_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }

    const createdPartner: Profile = {
      ...createInitialProfile(),
      ...(foundPartnerProfile || {}),
      id: newPartnerId,
      name: partnerName,
      pairing_code: code,
      partnership_id: newPartnershipId,
      current_mood: foundPartnerProfile?.current_mood || 'loved',
      avatar_color: getCleanAccentColor(foundPartnerProfile?.avatar_color, '#0d9488')
    }

    // Set local state immediately so partnerUser exists before receiving handshake
    currentUser.value.partnership_id = newPartnershipId
    partnerUser.value = createdPartner
    partnership.value = createdPartnership
    syncToStorage()

    // Connect to partner's pairing channel and send PAIR_REQUEST
    if (supabase) {
      try {
        const targetPairChannel = supabase.channel(`duonest_pair_${code}`, {
          config: { broadcast: { ack: true } }
        })

        targetPairChannel.on('broadcast', { event: 'PAIR_ACCEPTED' }, (envelope: any) => {
          const { targetProfile, newPartnership: returnedPartnership } = envelope.payload || {}
          if (targetProfile) {
            partnerUser.value = {
              ...(partnerUser.value || createdPartner),
              ...targetProfile,
              name: targetProfile.name || partnerUser.value?.name || 'Partner'
            }
            if (returnedPartnership && partnership.value) {
              partnership.value = returnedPartnership
            }
            syncToStorage()
            triggerToast(`Połączono z: ${partnerUser.value.name}!`)
          }
        })

        await new Promise<void>((resolve) => {
          targetPairChannel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              const broadcastPayload = {
                initiatorProfile: currentUser.value,
                newPartnership: createdPartnership
              }
              // Send immediate + backup repeats to guarantee reception
              try {
                await targetPairChannel.send({
                  type: 'broadcast',
                  event: 'PAIR_REQUEST',
                  payload: broadcastPayload
                })
              } catch (_) {}

              setTimeout(() => {
                try {
                  targetPairChannel.send({
                    type: 'broadcast',
                    event: 'PAIR_REQUEST',
                    payload: broadcastPayload
                  })
                } catch (_) {}
              }, 200)

              setTimeout(() => {
                try {
                  targetPairChannel.send({
                    type: 'broadcast',
                    event: 'PAIR_REQUEST',
                    payload: broadcastPayload
                  })
                } catch (_) {}
                resolve()
              }, 450)
            }
          })
          setTimeout(resolve, 1800)
        })
      } catch (e) {
        console.warn('Realtime pairing broadcast attempt:', e)
      }
    }

    syncToStorage()

    // Try storing in Supabase DB if tables exist
    if (supabase) {
      safeDb(supabase.from('profiles').update({ partnership_id: newPartnershipId }).eq('id', currentUser.value.id))
      if (foundPartnerProfile) {
        safeDb(supabase.from('profiles').update({ partnership_id: newPartnershipId }).eq('id', foundPartnerProfile.id))
      }
      safeDb(supabase.from('partnerships').upsert(createdPartnership))
    }

    // Subscribe to shared realtime channel
    subscribeToPartnershipRealtime(newPartnershipId)
    subscribeToSecurityChannel(currentUser.value.id, newPartnershipId)

    triggerToast('Konta zostały pomyślnie sparowane! Witajcie w Waszym Gniazdku!')
    return { success: true }
  }

  const disconnectPartnership = async () => {
    const pId = partnership.value?.id
    const myId = currentUser.value?.id
    const partnerId = partnerUser.value?.id

    // Broadcast disconnection notice so partner reacts instantly
    broadcastToPartner('PARTNERSHIP_DISCONNECT', {})

    if (supabase) {
      if (myId) {
        safeDb(supabase.from('profiles').update({ partnership_id: null }).eq('id', myId))
      }
      if (partnerId) {
        safeDb(supabase.from('profiles').update({ partnership_id: null }).eq('id', partnerId))
      }
      if (pId) {
        safeDb(supabase.from('partnerships').delete().eq('id', pId))
      }
    }

    if (activePartnershipChannel && supabase) {
      try { supabase.removeChannel(activePartnershipChannel) } catch (_) {}
      activePartnershipChannel = null
    }

    currentUser.value.partnership_id = null
    partnerUser.value = null
    partnership.value = null
    syncToStorage()
    triggerToast('Rozłączono partnerstwo. Zostałeś wylogowany.', { type: 'warning', title: 'Rozłączono' })
    await signOutUser()
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

    if (supabase) {
      safeDb(supabase.from('shopping_items').insert(newItem))
    }
  }

  const toggleShoppingItem = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = shoppingItems.value.find(i => i.id === id)
    if (!item) return
    item.is_completed = !item.is_completed
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('SHOPPING_TOGGLE', { id, is_completed: item.is_completed })

    if (supabase) {
      safeDb(supabase.from('shopping_items').update({
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

    if (supabase) {
      safeDb(supabase.from('shopping_items').delete().eq('id', id))
    }
  }

  const clearCompletedShopping = async () => {
    if (!await verifyUserAndPartnershipAccess()) return
    const toDelete = shoppingItems.value.filter(i => i.is_completed).map(i => i.id)
    shoppingItems.value = shoppingItems.value.filter(i => !i.is_completed)
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('SHOPPING_CLEAR', {})

    if (supabase && toDelete.length > 0) {
      safeDb(supabase.from('shopping_items').delete().in('id', toDelete))
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

    if (supabase) {
      safeDb(supabase.from('tasks').insert(newTask))
    }
  }

  const toggleTask = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const task = tasksList.value.find(t => t.id === id)
    if (!task) return
    task.is_completed = !task.is_completed
    const nowCompleted = task.is_completed

    // Award / deduct points in local partnership state
    if (partnership.value) {
      const delta = nowCompleted ? task.points : -task.points
      partnership.value.nest_points = Math.max(0, partnership.value.nest_points + delta)
      partnership.value.nest_level = 1 + Math.floor(partnership.value.nest_points / 50)
      partnership.value.pet_xp = Math.max(0, (partnership.value.pet_xp || 0) + delta)
    }
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('TASK_TOGGLE', {
      id,
      is_completed: nowCompleted,
      pet_xp: partnership.value?.pet_xp,
      nest_points: partnership.value?.nest_points
    })

    if (supabase) {
      safeDb(supabase.from('tasks').update({
        is_completed: nowCompleted,
        completed_at: nowCompleted ? new Date().toISOString() : null,
        completed_by: nowCompleted ? currentUser.value.id : null
      }).eq('id', id))

      if (partnership.value?.id) {
        safeDb(supabase.from('partnerships').update({
          nest_points: partnership.value.nest_points,
          nest_level: partnership.value.nest_level,
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

    if (supabase && partnership.value.id) {
      safeDb(supabase.from('partnerships').update({
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

    // Broadcast live to partner
    broadcastToPartner('TASK_DELETE', { id })

    if (supabase) {
      safeDb(supabase.from('tasks').delete().eq('id', id))
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
    const newEvent: EventItem = {
      id: 'ev_' + Math.random().toString(36).substring(2, 9),
      partnership_id: partnership.value.id,
      title: title.trim(),
      category,
      start_time: startTime || new Date().toISOString(),
      end_time: endTime || undefined,
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

    if (supabase) {
      safeDb(supabase.from('events').insert(newEvent))
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

    eventsList.value[idx] = { ...eventsList.value[idx], ...updates }
    eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('EVENT_UPDATE', { id, updates })

    if (supabase) {
      safeDb(supabase.from('events').update(updates).eq('id', id))
    }
    triggerToast('Zaktualizowano plan w terminarzu.')
  }

  const toggleEventCompleted = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const ev = eventsList.value.find(e => e.id === id)
    if (!ev) return
    ev.is_completed = !ev.is_completed
    syncToStorage()

    // Award 10 points to partnership for fulfilling a plan!
    if (ev.is_completed && partnership.value) {
      partnership.value.nest_points += 10
      partnership.value.nest_level = 1 + Math.floor(partnership.value.nest_points / 50)
      saveToStorage('duonest_partnership', partnership.value)
    }

    // Broadcast live to partner
    broadcastToPartner('EVENT_TOGGLE_COMPLETED', { id, is_completed: ev.is_completed })

    if (supabase) {
      safeDb(supabase.from('events').update({ is_completed: ev.is_completed }).eq('id', id))
    }
    triggerToast(ev.is_completed ? 'Wydarzenie zrealizowane! +10 pkt do Gniazdka' : 'Oznaczono jako nadchodzące.')
  }

  const deleteEvent = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    eventsList.value = eventsList.value.filter(e => e.id !== id)
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('EVENT_DELETE', { id })

    if (supabase) {
      safeDb(supabase.from('events').delete().eq('id', id))
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

    if (supabase) {
      safeDb(supabase.from('profiles').update({
        current_mood: mood,
        mood_note: note.trim(),
        mood_updated_at: new Date().toISOString()
      }).eq('id', currentUser.value.id))

      if (partnership.value) {
        safeDb(supabase.from('mood_logs').insert({
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

    // Reward 5 nest points for gesture
    if (partnership.value) {
      partnership.value.nest_points += 5
      partnership.value.nest_level = 1 + Math.floor(partnership.value.nest_points / 50)
    }
    syncToStorage()

    // Broadcast live to partner
    broadcastToPartner('NUDGE_SEND', newNudge)

    if (supabase) {
      safeDb(supabase.from('nudges').insert(newNudge))
    }

    triggerToast(`Wysłano dzisiejsze puknięcie do ${partnerUser.value.name}! (+5 pkt do Gniazdka)`)
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

    if (supabase) {
      safeDb(supabase.from('partnerships').update({
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

    const currentHash = currentUserPasswordHash.value || ''
    const cleanCurrentColor = getCleanAccentColor(currentUser.value.avatar_color)
    const colorToSave = currentHash ? `${cleanCurrentColor}|${currentHash}` : cleanCurrentColor

    if (supabase && isOnlineWithSupabase.value) {
      safeDb(supabase.from('profiles').update({
        name: currentUser.value.name,
        avatar_color: colorToSave,
        love_note: currentUser.value.love_note,
        favorite_drink: currentUser.value.favorite_drink,
        favorite_treat: currentUser.value.favorite_treat
      }).eq('id', currentUser.value.id))

      if (partnership.value) {
        safeDb(supabase.from('partnerships').update({
          nest_name: partnership.value.nest_name,
          anniversary_date: partnership.value.anniversary_date
        }).eq('id', partnership.value.id))
      }
    }

    triggerToast('Zaktualizowano Twój profil!')
  }

  // Nest calculations
  const nestLevel = computed(() => partnership.value?.nest_level || 1)
  const nestPoints = computed(() => partnership.value?.nest_points || 0)
  const pointsToNextLevel = computed(() => {
    const currentLvl = nestLevel.value
    const targetPoints = currentLvl * 50
    return Math.max(0, targetPoints - nestPoints.value)
  })
  const levelProgress = computed(() => {
    const currentPointsInTier = nestPoints.value % 50
    return Math.min(100, Math.round((currentPointsInTier / 50) * 100))
  })

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
    return getCleanAccentColor(currentUser.value?.avatar_color, '#0284c7')
  })

  const partnerUserAccentColor = computed(() => {
    return getCleanAccentColor(partnerUser.value?.avatar_color, '#0d9488')
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

  // --- DUO POINTS BREAKDOWN PER PERSON ---
  const userCompletedTasksCount = computed(() => {
    const myId = currentUser.value?.id
    if (!myId) return 0
    return tasksList.value.filter(t => t.is_completed && t.completed_by === myId).length
  })

  const partnerCompletedTasksCount = computed(() => {
    const pId = partnerUser.value?.id
    if (!pId) return 0
    return tasksList.value.filter(t => t.is_completed && t.completed_by === pId).length
  })

  const userRawTaskPoints = computed(() => {
    const myId = currentUser.value?.id
    if (!myId) return 0
    return tasksList.value
      .filter(t => t.is_completed && t.completed_by === myId)
      .reduce((sum, t) => sum + (t.points || 15), 0)
  })

  const partnerRawTaskPoints = computed(() => {
    const pId = partnerUser.value?.id
    if (!pId) return 0
    return tasksList.value
      .filter(t => t.is_completed && t.completed_by === pId)
      .reduce((sum, t) => sum + (t.points || 15), 0)
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

  const userEarnedPoints = computed(() => userRawTaskPoints.value + userNudgePoints.value)
  const partnerEarnedPoints = computed(() => partnerRawTaskPoints.value + partnerNudgePoints.value)

  // Clean balanced calculation ensuring userPoints + partnerPoints === nestPoints
  const userPoints = computed(() => {
    const total = nestPoints.value
    if (total <= 0) return 0
    const myEarned = userEarnedPoints.value
    const theirEarned = partnerEarnedPoints.value
    const sumEarned = myEarned + theirEarned

    if (sumEarned === 0) {
      return Math.round(total / 2)
    }
    if (sumEarned === total) {
      return myEarned
    }
    const extra = total - sumEarned
    if (extra > 0) {
      const halfExtra = Math.floor(extra / 2)
      return Math.min(total, myEarned + halfExtra)
    }
    return Math.min(total, Math.max(0, Math.round((myEarned / sumEarned) * total)))
  })

  const partnerPoints = computed(() => {
    const total = nestPoints.value
    return Math.max(0, total - userPoints.value)
  })

  const userPointsPct = computed(() => {
    if (nestPoints.value <= 0) return 0
    return Math.min(100, Math.max(0, Math.round((userPoints.value / nestPoints.value) * 100)))
  })

  const partnerPointsPct = computed(() => {
    if (nestPoints.value <= 0) return 0
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
    triggerToast('Zaktualizowano cel nagrody.')
  }

  const deleteMilestone = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const item = milestonesList.value.find(m => m.id === id)
    milestonesList.value = milestonesList.value.filter(m => m.id !== id)
    syncToStorage()
    broadcastToPartner('MILESTONE_DELETE', { id })
    triggerToast(`Usunięto cel: ${item?.title || ''}.`)
  }

  const claimMilestone = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const m = milestonesList.value.find(i => i.id === id)
    if (!m) return
    const now = new Date().toISOString()
    m.is_completed = true
    m.completed_at = now
    syncToStorage()
    broadcastToPartner('MILESTONE_CLAIM', { id, completed_at: now })
    triggerToast(`Gratulacje! Nagroda "${m.title}" została odebrana! 🎉`)
  }

  const reactivateMilestone = async (id: string) => {
    if (!await verifyUserAndPartnershipAccess()) return
    const m = milestonesList.value.find(i => i.id === id)
    if (!m) return
    m.is_completed = false
    m.completed_at = null
    syncToStorage()
    broadcastToPartner('MILESTONE_REACTIVATE', { id })
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

    if (supabase && isOnlineWithSupabase.value && partnership.value?.id) {
      try {
        await supabase.from('wishlist_items').insert(newItem)
      } catch (_) {
        safeDb(supabase.from('wishlist_items').insert(newItem))
      }
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

    if (supabase && isOnlineWithSupabase.value && partnership.value?.id) {
      safeDb(supabase.from('wishlist_items').update(updates).eq('id', id))
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

    if (supabase && isOnlineWithSupabase.value && partnership.value?.id) {
      safeDb(supabase.from('wishlist_items').delete().eq('id', id))
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

    if (supabase && isOnlineWithSupabase.value && partnership.value?.id) {
      safeDb(supabase.from('wishlist_items').update({
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

  const refreshWishlist = async () => {
    const client = getSupabaseClient()
    const pId = partnership.value?.id || currentUser.value?.partnership_id
    if (!client || !pId) return

    try {
      const { data, error } = await client
        .from('wishlist_items')
        .select('*')
        .eq('partnership_id', pId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const currentUserId = currentUser.value?.id || authUser.value?.id
        const filtered = data.filter((item: WishlistItem) => item.is_visible_to_partner || (currentUserId && item.created_by === currentUserId))
        wishlistItems.value = filtered
        syncToStorage()
      }
    } catch (e) {
      console.warn('refreshWishlist error:', e)
    }
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
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    toggleWishlistCompleted,
    refreshWishlist,
    updatePet,
    isPaired,
    isOnlineWithSupabase,
    dbSchemaStatus,
    realtimeStatus,
    isPartnerOnline,
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
    updatePartnershipSettings,
    subscribeToPairingChannel,
    normalizePairingCode,
    verifyUserAndPartnershipAccess
  }
}
