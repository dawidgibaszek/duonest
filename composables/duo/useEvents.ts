import { getFirebaseBridge } from '../useFirebaseBridge'
import { eventsList, currentUser, partnership, isOnlineWithSupabase } from './state'
import { saveToStorage } from './utils'
import type { EventItem } from '~/types/duo'

export function useEvents(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncEventsToStorage = () => {
    saveToStorage('duonest_events', eventsList.value)
  }

  const addEvent = async (
    title: string,
    startTime: string,
    category: EventItem['category'] = 'date',
    optionsData: {
      description?: string
      location?: string
      end_time?: string
      is_surprise?: boolean
      planner_name?: string
    } = {}
  ) => {
    if (!title.trim() || !partnership.value?.id) return null

    const newEvent: EventItem = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      partnership_id: partnership.value.id,
      title: title.trim(),
      description: optionsData.description?.trim() || null,
      location: optionsData.location?.trim() || null,
      start_time: startTime,
      end_time: optionsData.end_time || null,
      category,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      points_awarded: 15,
      is_surprise: Boolean(optionsData.is_surprise),
      planner_name: optionsData.planner_name || currentUser.value.name || 'Partner',
      created_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }

    eventsList.value.push(newEvent)
    eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    syncEventsToStorage()

    options.broadcastToPartner('EVENT_ADD', newEvent)

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('events').insert(newEvent)
      } catch (err) {
        console.warn('Błąd podczas zapisywania wydarzenia:', err)
      }
    }

    options.triggerToast('Dodano nowe wydarzenie do kalendarza')
    return newEvent
  }

  const updateEvent = async (id: string, updates: Partial<EventItem>) => {
    const idx = eventsList.value.findIndex(e => e.id === id)
    if (idx === -1) return false

    eventsList.value[idx] = { ...eventsList.value[idx], ...updates }
    eventsList.value.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    syncEventsToStorage()

    options.broadcastToPartner('EVENT_UPDATE', { id, updates })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('events').update(updates).eq('id', id)
      } catch (_) {}
    }

    options.triggerToast('Zaktualizowano wydarzenie')
    return true
  }

  const toggleEventCompleted = async (id: string) => {
    const ev = eventsList.value.find(e => e.id === id)
    if (!ev) return

    ev.is_completed = !ev.is_completed
    ev.completed_at = ev.is_completed ? new Date().toISOString() : null
    ev.completed_by = ev.is_completed ? currentUser.value.id : null
    syncEventsToStorage()

    options.broadcastToPartner('EVENT_TOGGLE_COMPLETED', { id, is_completed: ev.is_completed })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('events').update({
          is_completed: ev.is_completed,
          completed_at: ev.completed_at,
          completed_by: ev.completed_by
        }).eq('id', id)
      } catch (_) {}
    }

    if (ev.is_completed) {
      options.triggerToast('Wydarzenie zrealizowane! 💖', { type: 'calendar' })
    }
  }

  const deleteEvent = async (id: string) => {
    const idx = eventsList.value.findIndex(e => e.id === id)
    if (idx === -1) return

    eventsList.value.splice(idx, 1)
    syncEventsToStorage()

    options.broadcastToPartner('EVENT_DELETE', { id })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('events').delete().eq('id', id)
      } catch (err) {
        console.warn('Błąd usuwania wydarzenia:', err)
      }
    }

    options.triggerToast('Usunięto wydarzenie z kalendarza')
  }

  return {
    addEvent,
    updateEvent,
    toggleEventCompleted,
    deleteEvent
  }
}
