import { trackDuoEvent } from '~/composables/useDuoAnalytics'
import { computed } from 'vue'
import { getFirebaseBridge } from '../useFirebaseBridge'
import { nudgesList, currentUser, partnerUser, partnership, lastNudgeSentAt } from './state'
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

    const { error } = await getDb().from('nudges').insert(newNudge)
    if (error) {
      options.triggerToast('Nie udało się wysłać gestu. Spróbuj ponownie.', { type: 'warning' })
      return false
    }
    if (partnership.value?.id !== newNudge.partnership_id || currentUser.value.id !== newNudge.sender_id) return false
    nudgesList.value = [newNudge, ...nudgesList.value.filter(nudge => nudge.id !== newNudge.id)].slice(0, 30)
    syncNudgesToStorage()
    lastNudgeSentAt.value = Date.now()
    saveToStorage(`duonest_last_nudge_ts_${currentUser.value.id}`, lastNudgeSentAt.value)
    options.broadcastToPartner('NUDGE_SEND', newNudge)
    trackDuoEvent('duo_gesture_sent')
    options.triggerToast('Przesłano gest partnerowi', { type: 'love' })
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
    hasSentDailyNudge,
    nextNudgeRemainingMs,
    formattedNextNudgeTime
  }
}
