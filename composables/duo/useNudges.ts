import { computed } from 'vue'
import { getFirebaseBridge } from '../useFirebaseBridge'
import { nudgesList, currentUser, partnerUser, partnership, lastNudgeSentAt, isOnlineWithSupabase } from './state'
import { saveToStorage } from './utils'
import type { NudgeItem } from '~/types/duo'

export function useNudges(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncNudgesToStorage = () => {
    saveToStorage('duonest_nudges', nudgesList.value)
  }

  const hasSentDailyNudge = computed(() => {
    if (!lastNudgeSentAt.value) return false
    const now = Date.now()
    const diff = now - lastNudgeSentAt.value
    return diff < 60 * 60 * 1000
  })

  const nextNudgeRemainingMs = computed(() => {
    if (!lastNudgeSentAt.value) return 0
    const nextAllowed = lastNudgeSentAt.value + 60 * 60 * 1000
    return Math.max(0, nextAllowed - Date.now())
  })

  const formattedNextNudgeTime = computed(() => {
    const ms = nextNudgeRemainingMs.value
    if (ms <= 0) return ''
    const minutes = Math.ceil(ms / (60 * 1000))
    return `${minutes} min`
  })

  const sendNudge = async (nudgeType: string, message: string = '') => {
    if (!partnership.value?.id) return false
    const partnerId = partnerUser.value?.id
    if (!partnerId) {
      options.triggerToast('Partner nie jest jeszcze połączony.', { type: 'warning' })
      return false
    }

    const newNudge: NudgeItem = {
      id: `nudge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      partnership_id: partnership.value.id,
      sender_id: currentUser.value.id,
      receiver_id: partnerId,
      nudge_type: nudgeType,
      message: message.trim() || null,
      created_at: new Date().toISOString()
    }

    nudgesList.value.unshift(newNudge)
    if (nudgesList.value.length > 30) nudgesList.value = nudgesList.value.slice(0, 30)
    syncNudgesToStorage()

    lastNudgeSentAt.value = Date.now()
    if (typeof window !== 'undefined' && currentUser.value.id) {
      localStorage.setItem(`duonest_last_nudge_ts_${currentUser.value.id}`, String(lastNudgeSentAt.value))
    }

    options.broadcastToPartner('NUDGE_SEND', newNudge)

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('nudges').insert(newNudge)
      } catch (err) {
        console.warn('Błąd podczas zapisywania gestu:', err)
      }
    }

    options.triggerToast('Przesłano gest partnerowi! 💕', { type: 'love' })
    return true
  }

  const updateMood = async (mood: string, note?: string) => {
    currentUser.value.current_mood = mood
    if (note !== undefined) currentUser.value.mood_note = note.trim()
    currentUser.value.mood_updated_at = new Date().toISOString()
    saveToStorage('duonest_current_user', currentUser.value)

    options.broadcastToPartner('MOOD_UPDATE', {
      mood: currentUser.value.current_mood,
      note: currentUser.value.mood_note,
      updated_at: currentUser.value.mood_updated_at
    })

    const bridge = getDb()
    if (bridge && currentUser.value.id && isOnlineWithSupabase.value) {
      try {
        await bridge.from('profiles').update({
          current_mood: currentUser.value.current_mood,
          mood_note: currentUser.value.mood_note,
          mood_updated_at: currentUser.value.mood_updated_at
        }).eq('id', currentUser.value.id)
      } catch (_) {}
    }

    options.triggerToast('Zaktualizowano nastrój')
  }

  return {
    sendNudge,
    updateMood,
    hasSentDailyNudge,
    nextNudgeRemainingMs,
    formattedNextNudgeTime
  }
}
