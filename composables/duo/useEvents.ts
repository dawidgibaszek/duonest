import { trackDuoEvent } from '~/composables/useDuoAnalytics'
import { getFirebaseBridge } from '../useFirebaseBridge'
import { eventsList, currentUser, partnership } from './state'
import { newDocumentId, saveToStorage } from './utils'
import type { EventItem } from '~/types/duo'

export function useEvents(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncEventsToStorage = () => {
    saveToStorage('duonest_events', eventsList.value)
  }

  const fail = () => options.triggerToast('Nie udało się zapisać zmian w terminarzu.', { type: 'warning' })
  const toIso = (value: string) => {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date.toISOString() : null
  }

  const addEvent = async (
    title: string, category: EventItem['category'], startTime: string,
    description = '', location = '', endTime = '', isSurprise = false, plannerName = ''
  ) => {
    const pid = partnership.value?.id
    const start = toIso(startTime)
    if (!title.trim() || !pid || !start) return null
    const end = endTime && /^\d{2}:\d{2}$/.test(endTime) ? `${startTime.split('T')[0]}T${endTime}:00` : endTime
    const event: EventItem = {
      id: newDocumentId('event_'),
      partnership_id: pid,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      start_time: start,
      end_time: end ? toIso(end) : null,
      category,
      is_completed: false,
      completed_at: null,
      completed_by: null,
      is_surprise: isSurprise,
      planner_name: plannerName || currentUser.value.name || '',
      created_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }

    const { error } = await getDb().from('events').insert(event)
    if (error) { fail(); return null }
    if (partnership.value?.id !== pid) return null
    eventsList.value = [event, ...eventsList.value.filter(item => item.id !== event.id)]
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
    syncEventsToStorage()
    options.broadcastToPartner('EVENT_ADD', event)
    trackDuoEvent('duo_calendar_added')
    options.triggerToast('Dodano plan')
    return event
  }

  const persistUpdate = async (event: EventItem, updates: Partial<EventItem>) => {
    const patch = { category: event.category, start_time: event.start_time, ...updates }
    try {
      const { error } = await getDb().from('events').update(patch).eq('id', event.id)
      if (error) throw error
      if (partnership.value?.id !== event.partnership_id) return false
      eventsList.value = eventsList.value.map(item => item.id === event.id ? { ...item, ...patch } : item)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
      syncEventsToStorage()
      return true
    } catch {
      fail()
      return false
    }
  }

  const updateEvent = async (id: string, updates: Partial<EventItem>) => {
    const event = eventsList.value.find(item => item.id === id)
    if (!event || !(await persistUpdate(event, updates))) return false
    options.broadcastToPartner('EVENT_UPDATE', { id, updates })
    options.triggerToast('Zaktualizowano wydarzenie')
    return true
  }

  const toggleEventCompleted = async (id: string) => {
    const event = eventsList.value.find(item => item.id === id)
    if (!event) return false
    const completed = !event.is_completed
    if (!(await persistUpdate(event, {
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? currentUser.value.id : null
    }))) return false
    options.broadcastToPartner('EVENT_TOGGLE_COMPLETED', { id, is_completed: completed, title: event.title })
    if (completed) options.triggerToast('Wydarzenie zrealizowane', { type: 'calendar' })
    return true
  }

  const deleteEvent = async (id: string) => {
    const pid = partnership.value?.id
    try {
      const { error } = await getDb().from('events').delete().eq('id', id)
      if (error) throw error
      if (partnership.value?.id !== pid) return false
      eventsList.value = eventsList.value.filter(event => event.id !== id)
      syncEventsToStorage()
      options.triggerToast('Usunięto wydarzenie')
      return true
    } catch {
      fail()
      return false
    }
  }

  return {
    addEvent,
    updateEvent,
    toggleEventCompleted,
    deleteEvent
  }
}
