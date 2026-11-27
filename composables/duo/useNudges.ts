import { trackDuoEvent } from '~/composables/useDuoAnalytics'
import { computed, ref, watch } from 'vue'
import { getFirebaseBridge } from '../useFirebaseBridge'
import {
  nudgesList,
  currentUser,
  partnerUser,
  partnership,
  lastNudgeSentAt,
  recentNudgeTimestamps,
  activeGestureAnimations,
  currentUserAccentColor,
  partnerUserAccentColor
} from './state'
import { saveToStorage } from './utils'
import { getPartnerNoun, resolveGrammaticalGender } from './useGrammar'
import type { NudgeItem } from '~/types/duo'

const SEEN_NUDGES_KEY_PREFIX = 'duonest_seen_nudges_'
const RECENT_NUDGE_TS_KEY_PREFIX = 'duonest_nudge_recent_ts_'
const MAX_SEEN_NUDGE_IDS = 120
const INITIAL_FRESH_WINDOW_MS = 12 * 60 * 60 * 1000
export const GESTURE_EFFECT_DURATION_MS = 3000
export const MAX_PENDING_PARTNER_GESTURES = 3
export const NUDGE_RATE_LIMIT_MAX = 5
export const NUDGE_RATE_LIMIT_WINDOW_MS = 60 * 1000

const nudgeNowTick = ref(Date.now())
let nudgeTickTimer: ReturnType<typeof setInterval> | null = null
const unsavedSeenIds = new Map<string, string[]>()

function seenStorageKey(profileId: string): string {
  return `${SEEN_NUDGES_KEY_PREFIX}${profileId}`
}

function recentTsStorageKey(profileId: string): string {
  return `${RECENT_NUDGE_TS_KEY_PREFIX}${profileId}`
}

function readSeenNudgeIds(profileId: string): string[] | null {
  const unsaved = unsavedSeenIds.get(profileId)
  if (unsaved) return unsaved
  if (typeof window === 'undefined' || !profileId) return []
  try {
    const raw = localStorage.getItem(seenStorageKey(profileId))
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeSeenNudgeIds(profileId: string, ids: string[]) {
  if (typeof window === 'undefined' || !profileId) return
  const deduped = Array.from(new Set(ids)).slice(-MAX_SEEN_NUDGE_IDS)
  try {
    localStorage.setItem(seenStorageKey(profileId), JSON.stringify(deduped))
    unsavedSeenIds.delete(profileId)
  } catch {
    unsavedSeenIds.set(profileId, deduped)
  }
}

function pruneRecentTimestamps(timestamps: number[], now = Date.now()): number[] {
  const cutoff = now - NUDGE_RATE_LIMIT_WINDOW_MS
  return timestamps.filter(ts => typeof ts === 'number' && Number.isFinite(ts) && ts > cutoff).sort((a, b) => a - b)
}

function loadRecentNudgeTimestamps(profileId: string): number[] {
  if (typeof window === 'undefined' || !profileId) return []
  try {
    const raw = localStorage.getItem(recentTsStorageKey(profileId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? pruneRecentTimestamps(parsed) : []
  } catch {
    return []
  }
}

function saveRecentNudgeTimestamps(profileId: string, timestamps: number[]) {
  if (typeof window === 'undefined' || !profileId) return
  try {
    const pruned = pruneRecentTimestamps(timestamps)
    if (pruned.length === 0) localStorage.removeItem(recentTsStorageKey(profileId))
    else localStorage.setItem(recentTsStorageKey(profileId), JSON.stringify(pruned))
  } catch {}
}

export function playGestureAnimation(nudge: NudgeItem, isOwn: boolean) {
  const senderProfile = isOwn ? currentUser.value : partnerUser.value
  const senderGrammar = resolveGrammaticalGender(senderProfile)
  const fallbackName = isOwn ? 'Ty' : getPartnerNoun('mianownik', senderGrammar)
  const senderName = senderProfile?.name?.trim() || fallbackName
  const instanceId = `${nudge.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  activeGestureAnimations.value = [
    ...activeGestureAnimations.value,
    {
      instanceId,
      id: nudge.id,
      nudge_type: nudge.nudge_type || 'love',
      message: nudge.message || null,
      created_at: nudge.created_at || null,
      isOwn,
      senderName,
      senderAvatarUrl: senderProfile?.avatar_url || null,
      accentColor: isOwn ? currentUserAccentColor.value : partnerUserAccentColor.value
    }
  ]

  setTimeout(() => {
    dismissGestureAnimation(instanceId)
  }, GESTURE_EFFECT_DURATION_MS)
}

export function dismissGestureAnimation(instanceId?: string) {
  if (!instanceId) {
    activeGestureAnimations.value = []
    return
  }
  activeGestureAnimations.value = activeGestureAnimations.value.filter(item => item.instanceId !== instanceId)
}

// The overlay checks again when the current partner animation ends.
export function consumePendingPartnerGesture(
  rows: NudgeItem[],
  replay: { since: number; remaining: number }
) {
  const profileId = currentUser.value?.id
  const pid = partnership.value?.id
  if (!profileId || !pid || !rows.length) return
  if (activeGestureAnimations.value.some(gesture => !gesture.isOwn)) return

  const partnerRows = rows
    .filter(row => row && row.id && row.partnership_id === pid && row.sender_id && row.sender_id !== profileId)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || b.id.localeCompare(a.id))

  if (!partnerRows.length) return
  const storedSeen = readSeenNudgeIds(profileId)
  const seen = new Set(storedSeen)
  const freshSince = Date.now() - INITIAL_FRESH_WINDOW_MS
  let slots = replay.remaining
  let next: NudgeItem | undefined
  let nextIsLive = false
  for (const row of partnerRows) {
    if (seen.has(row.id)) continue
    const sentAt = Date.parse(row.created_at)
    if (storedSeen === null && (!Number.isFinite(sentAt) || sentAt < freshSince)) {
      seen.add(row.id)
      continue
    }
    const isLive = sentAt >= replay.since
    if (!isLive) {
      if (slots === 0) {
        seen.add(row.id)
        continue
      }
      slots--
    }
    // Scan newest first to keep the latest backlog, then play it oldest first.
    next = row
    nextIsLive = isLive
  }
  if (next) seen.add(next.id)
  if (seen.size !== (storedSeen?.length ?? 0)) writeSeenNudgeIds(profileId, [...seen])
  if (!next) return
  if (!nextIsLive) replay.remaining--
  playGestureAnimation(next, false)
}

let hasBoundRateLimitWatchers = false

function ensureRateLimitSync() {
  if (hasBoundRateLimitWatchers || typeof window === 'undefined') return
  hasBoundRateLimitWatchers = true

  watch(
    () => currentUser.value?.id,
    (profileId) => {
      recentNudgeTimestamps.value = profileId ? loadRecentNudgeTimestamps(profileId) : []
      nudgeNowTick.value = Date.now()
    },
    { immediate: true }
  )

  watch(
    () => recentNudgeTimestamps.value.length,
    (count) => {
      if (count >= NUDGE_RATE_LIMIT_MAX) {
        if (!nudgeTickTimer) {
          nudgeNowTick.value = Date.now()
          nudgeTickTimer = setInterval(() => {
            const now = Date.now()
            nudgeNowTick.value = now
            const pruned = pruneRecentTimestamps(recentNudgeTimestamps.value, now)
            if (pruned.length !== recentNudgeTimestamps.value.length) {
              recentNudgeTimestamps.value = pruned
              if (currentUser.value?.id) saveRecentNudgeTimestamps(currentUser.value.id, pruned)
            }
            if (pruned.length < NUDGE_RATE_LIMIT_MAX && nudgeTickTimer) {
              clearInterval(nudgeTickTimer)
              nudgeTickTimer = null
            }
          }, 500)
        }
      } else if (nudgeTickTimer) {
        clearInterval(nudgeTickTimer)
        nudgeTickTimer = null
      }
    },
    { immediate: true }
  )
}

export function useNudges(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()
  ensureRateLimitSync()

  const syncNudgesToStorage = () => {
    saveToStorage('duonest_nudges', nudgesList.value)
  }

  const activeWindowTimestamps = computed(() => {
    return pruneRecentTimestamps(recentNudgeTimestamps.value, nudgeNowTick.value)
  })

  const isNudgeRateLimited = computed(() => {
    return activeWindowTimestamps.value.length >= NUDGE_RATE_LIMIT_MAX
  })

  const nextNudgeRemainingMs = computed(() => {
    const active = activeWindowTimestamps.value
    if (active.length < NUDGE_RATE_LIMIT_MAX) return 0
    const oldest = active[0]
    if (!oldest) return 0
    return Math.max(0, oldest + NUDGE_RATE_LIMIT_WINDOW_MS - nudgeNowTick.value)
  })

  const formattedNextNudgeTime = computed(() => {
    const ms = nextNudgeRemainingMs.value
    if (ms <= 0) return ''
    const seconds = Math.max(1, Math.ceil(ms / 1000))
    return `${seconds} s`
  })

  const sendNudge = async (nudgeType: string, message: string = '') => {
    if (!partnership.value?.id) return false
    const partnerId = partnerUser.value?.id
    if (!partnerId) {
      options.triggerToast('Najpierw połącz konta.', { type: 'warning' })
      return false
    }

    const now = Date.now()
    nudgeNowTick.value = now
    const recent = pruneRecentTimestamps(
      recentNudgeTimestamps.value.length > 0
        ? recentNudgeTimestamps.value
        : loadRecentNudgeTimestamps(currentUser.value.id),
      now
    )
    recentNudgeTimestamps.value = recent

    if (recent.length >= NUDGE_RATE_LIMIT_MAX) {
      const oldest = recent[0] || now
      const waitSec = Math.max(1, Math.ceil((oldest + NUDGE_RATE_LIMIT_WINDOW_MS - now) / 1000))
      options.triggerToast(`Maksymalnie ${NUDGE_RATE_LIMIT_MAX} gestów na minutę. Odczekaj ${waitSec} s.`, { type: 'warning' })
      return false
    }

    const newNudge: NudgeItem = {
      id: `nudge_${now}_${Math.random().toString(36).substring(2, 7)}`,
      partnership_id: partnership.value.id,
      sender_id: currentUser.value.id,
      receiver_id: partnerId,
      nudge_type: nudgeType,
      message: message.trim() || null,
      created_at: new Date(now).toISOString()
    }

    const { error } = await getDb().from('nudges').insert(newNudge)
    if (error) {
      options.triggerToast('Nie udało się wysłać gestu. Spróbuj ponownie.', { type: 'warning' })
      return false
    }
    if (partnership.value?.id !== newNudge.partnership_id || currentUser.value.id !== newNudge.sender_id) return false

    nudgesList.value = [newNudge, ...nudgesList.value.filter(nudge => nudge.id !== newNudge.id)].slice(0, 40)
    syncNudgesToStorage()

    const sentAt = Date.now()
    lastNudgeSentAt.value = sentAt
    const nextRecent = pruneRecentTimestamps([...recent, sentAt], sentAt)
    recentNudgeTimestamps.value = nextRecent
    saveRecentNudgeTimestamps(currentUser.value.id, nextRecent)

    const seen = readSeenNudgeIds(currentUser.value.id) || []
    writeSeenNudgeIds(currentUser.value.id, [...seen, newNudge.id])
    playGestureAnimation(newNudge, true)
    options.broadcastToPartner('NUDGE_SEND', newNudge)
    trackDuoEvent('duo_gesture_sent')
    options.triggerToast('Gest został wysłany', { type: 'love' })
    return true
  }

  const updateMood = async (mood: string, note?: string) => {
    const profileId = currentUser.value.id
    if (!profileId) return false
    const updates = {
      current_mood: mood,
      mood_note: note === undefined ? currentUser.value.mood_note || '' : note.trim(),
      mood_updated_at: new Date().toISOString()
    }
    try {
      const { error } = await getDb().from('profiles').update(updates).eq('id', profileId)
      if (error) throw error
      if (currentUser.value.id !== profileId) return false
      Object.assign(currentUser.value, updates)
      saveToStorage('duonest_current_user', currentUser.value)
      options.broadcastToPartner('MOOD_UPDATE', { mood, note: updates.mood_note, updated_at: updates.mood_updated_at })
      trackDuoEvent('duo_mood_saved')
      options.triggerToast('Zaktualizowano nastrój')
      return true
    } catch {
      options.triggerToast('Nie udało się zapisać nastroju.', { type: 'warning' })
      return false
    }
  }

  return {
    sendNudge,
    updateMood,
    isNudgeRateLimited,
    hasSentDailyNudge: isNudgeRateLimited,
    nextNudgeRemainingMs,
    formattedNextNudgeTime
  }
}
