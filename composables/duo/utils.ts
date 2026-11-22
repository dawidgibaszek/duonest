import type { DuoToastItem, ToastType, MovieItem, Profile, DuoDoodleStroke } from '~/types/duo'
import { getFirebaseBridge } from '../useFirebaseBridge'

export const DEFAULT_SUPABASE_URL = 'https://wixmftffidwzbbidjydr.supabase.co'
export const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy'

export const SUPABASE_PROJECT_URL = DEFAULT_SUPABASE_URL
export const SUPABASE_PUBLIC_KEY = DEFAULT_SUPABASE_KEY

export const getSupabaseConfig = () => ({
  url: DEFAULT_SUPABASE_URL,
  key: DEFAULT_SUPABASE_KEY
})

export const getSupabaseClient = () => {
  return getFirebaseBridge()
}

export const getCleanDbClient = () => {
  return getFirebaseBridge()
}

export const safeDb = (operation: any) => {
  return operation
}

export const getCleanAccentColor = (rawColor?: string | null, fallback = '#0f172a'): string => {
  if (!rawColor) return fallback
  const first = rawColor.includes('|') ? rawColor.split('|')[0] : rawColor
  if (first.startsWith('#') || first.startsWith('rgb')) return first
  return fallback
}

export const hexToRgba = (hex: string, alpha = 0.15): string => {
  if (!hex || !hex.startsWith('#')) return `rgba(2, 132, 199, ${alpha})`
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `rgba(2, 132, 199, ${alpha})`
}

export const sanitizeEmail = (email: string | null | undefined): string => {
  if (!email) return ''
  return email.trim().toLowerCase()
}

export function newDocumentId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return prefix + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export { normalizePairingCode } from '~/functions/src/pairingCode'

export const normalizeMovieTitle = (str?: string | null): string => {
  if (!str) return ''
  return str.toLowerCase().trim().replace(/[\s\-_.:,;!?()]+/g, '')
}

export const deduplicateMoviesList = (list: MovieItem[]): MovieItem[] => {
  const seenTitles = new Map<string, MovieItem>()
  for (const m of list) {
    const norm = normalizeMovieTitle(m.title)
    if (!norm) continue
    if (!seenTitles.has(norm)) {
      seenTitles.set(norm, m)
    } else {
      const existing = seenTitles.get(norm)!
      if (m.status === 'watched' && existing.status !== 'watched') {
        seenTitles.set(norm, m)
      } else if (new Date(m.created_at) > new Date(existing.created_at)) {
        seenTitles.set(norm, m)
      }
    }
  }
  return Array.from(seenTitles.values())
}

export const inferToastMetadata = (msg: string): { title: string; type: ToastType } => {
  const m = msg.toLowerCase()
  if (m.includes('zakup') || m.includes('produkt') || m.includes('koszyk')) {
    return { title: 'Lista zakupów', type: 'shopping' }
  }
  if (m.includes('zadanie') || m.includes('zadania') || m.includes('zrobione') || m.includes('wykonane') || m.includes('punkty')) {
    return { title: 'Zadania & Punkty', type: 'tasks' }
  }
  if (m.includes('plan') || m.includes('wydarzenie') || m.includes('kalendarz') || m.includes('data') || m.includes('spotkanie')) {
    return { title: 'Wspólny kalendarz', type: 'calendar' }
  }
  if (m.includes('marzenie') || m.includes('prezent') || m.includes('wishlist')) {
    return { title: 'Lista marzeń', type: 'wishlist' }
  }
  if (m.includes('obiad') || m.includes('posiłek') || m.includes('jedzenie') || m.includes('przepis')) {
    return { title: 'Planer posiłków', type: 'meals' }
  }
  if (m.includes('skarbonk') || m.includes('oszczędno') || m.includes('wpłac') || m.includes('wypłac') || m.includes('cel')) {
    return { title: 'Wspólne finanse', type: 'savings' }
  }
  if (m.includes('partner') || m.includes('gniazdko') || m.includes('para') || m.includes('gest') || m.includes('nastrój')) {
    return { title: 'Wasze Gniazdko', type: 'love' }
  }
  return { title: 'DuoNest', type: 'info' }
}

export const loadFromStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const saveToStorage = (key: string, data: any) => {
  if (typeof window === 'undefined') return
  try {
    if (data === null || data === undefined) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(data))
    }
  } catch {}
}

export const clearStaleSupabaseCookies = () => {
  if (typeof document === 'undefined') return
  try {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth-token')) {
        document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;`
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
}

export const PROFILE_SELECT_FIELDS = 'id, name, email, pairing_code, auth_user_id, avatar_url, avatar_color, partnership_id, current_mood, mood_note, mood_updated_at, love_note, favorite_drink, favorite_treat, gender, grammatical_gender, enabled_features, nest_cards, onboarding_stage, onboarding_partnership_id, show_location_widget, points, last_seen_at, created_at, updated_at'

export const createInitialProfile = (): Profile => ({
  id: 'usr_' + Math.random().toString(36).substring(2, 11),
  email: null,
  name: '',
  avatar_color: '#0284c7',
  pairing_code: '',
  partnership_id: null,
  current_mood: 'happy',
  mood_note: '',
  mood_updated_at: new Date().toISOString(),
  love_note: '',
  favorite_drink: '',
  favorite_treat: '',
  gender: null,
  grammatical_gender: null,
  points: 0
})

export const toRealtimeProfileSnapshot = (profile: Profile) => ({
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
  gender: profile.gender,
  grammatical_gender: profile.grammatical_gender,
  last_seen_at: profile.last_seen_at
})

export function isStrokeContinued(prev: DuoDoodleStroke | undefined, next: DuoDoodleStroke): boolean {
  if (!prev) return false
  if (prev.id && next.id) return prev.id === next.id && prev.points.length <= next.points.length
  if (
    (prev.isEraser === true) !== (next.isEraser === true) ||
    prev.width !== next.width ||
    prev.color.toLowerCase() !== next.color.toLowerCase() ||
    next.points.length < prev.points.length
  ) {
    return false
  }
  return prev.points.every((point, index) => {
    const other = next.points[index]
    return other !== undefined && Math.abs(point - other) <= 0.0001
  })
}
