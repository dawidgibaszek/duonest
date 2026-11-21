import { getFirebaseBridge } from '../useFirebaseBridge'
import {
  currentUser,
  partnerUser,
  partnership,
  authUser,
  authSession,
  realtimeStatus,
  isPartnerOnline,
  partnerLastSeenAt,
  isOnlineWithSupabase,
  dbSchemaStatus,
  shoppingItems,
  tasksList,
  eventsList,
  nudgesList,
  wishlistItems,
  moviesList,
  milestonesList,
  mealsList,
  savingsGoals,
  savingsContributions,
  currentDoodle,
  partnerLiveStroke,
  isPartnerDrawing,
  activeToastItem,
  activeToastMessage
} from './state'
import {
  saveToStorage,
  toRealtimeProfileSnapshot,
  normalizeMovieTitle,
  deduplicateMoviesList,
  PROFILE_SELECT_FIELDS,
  getCleanAccentColor,
  inferToastMetadata
} from './utils'
import type { DuoDoodle, DuoDoodleStroke, WishlistItem, ToastType } from '~/types/duo'

let activePartnershipChannel: any = null
let activePartnershipId: string | null = null
let activeSecurityChannel: any = null
let activeSecurityUserId: string | null = null
let activeSecurityPartnershipId: string | null = null
let activeInitSyncPromise: Promise<void> | null = null
let heartbeatTimer: any = null
let lastHeartbeatSentAt = 0
let partnerDrawingTimeout: any = null

export function useRealtimeSync(options?: {
  loadPartnershipAndPartner?: (partnershipId: string, currentUserId: string) => Promise<void>
  clearPartnershipData?: () => void
  signOutUser?: () => Promise<void>
}) {
  const getDb = () => getFirebaseBridge()

  const dismissToast = () => {
    activeToastItem.value = null
    activeToastMessage.value = null
  }

  const triggerToast = (
    msgOrPayload: string | { message: string; title?: string; type?: ToastType; duration?: number },
    toastOptions?: { title?: string; type?: ToastType; duration?: number }
  ) => {
    const rawMsg = typeof msgOrPayload === 'string' ? msgOrPayload : msgOrPayload.message
    if (!rawMsg) {
      dismissToast()
      return
    }

    const inferred = inferToastMetadata(rawMsg)
    const title = (typeof msgOrPayload === 'object' && msgOrPayload.title) || toastOptions?.title || inferred.title
    const type = (typeof msgOrPayload === 'object' && msgOrPayload.type) || toastOptions?.type || inferred.type
    const duration = (typeof msgOrPayload === 'object' && msgOrPayload.duration) || toastOptions?.duration || 4200

    activeToastMessage.value = rawMsg
    activeToastItem.value = {
      id: 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      message: rawMsg,
      title,
      type,
      duration
    }
  }

  const syncAllToStorage = () => {
    saveToStorage('duonest_shopping', shoppingItems.value)
    saveToStorage('duonest_tasks', tasksList.value)
    saveToStorage('duonest_events', eventsList.value)
    saveToStorage('duonest_nudges', nudgesList.value)
    saveToStorage('duonest_wishlist', wishlistItems.value)
    saveToStorage('duonest_movies', moviesList.value)
    saveToStorage('duonest_meals', mealsList.value)
    saveToStorage('duonest_milestones', milestonesList.value)
    saveToStorage('duonest_savings_goals', savingsGoals.value)
    saveToStorage('duonest_savings_contributions', savingsContributions.value)
    if (partnership.value) saveToStorage('duonest_partnership', partnership.value)
    if (partnerUser.value) saveToStorage('duonest_partner_user', partnerUser.value)
  }

  const broadcastToPartner = (action: string, payload: any): Promise<void> => {
    let deliveryPromise: Promise<any> = Promise.resolve()
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
          deliveryPromise = Promise.resolve(channel.send({
            type: 'broadcast',
            event: 'duo_sync',
            payload: envelope
          })).catch(() => {})
        } else if (typeof channel?.httpSend === 'function') {
          deliveryPromise = channel.httpSend('duo_sync', envelope).catch(() => {})
        }
      } catch (err) {
        console.warn('Błąd wysyłania Realtime broadcast:', err)
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
        'WISHLIST_TOGGLE',
        'MOVIE_ADD',
        'MOVIE_UPDATE',
        'MOVIE_TOGGLE_WATCHED',
        'MILESTONE_CLAIM',
        'MEAL_ADD',
        'MEAL_UPDATE',
        'MEAL_TOGGLE',
        'SAVINGS_GOAL_ADD',
        'SAVINGS_CONTRIBUTION_ADD',
        'SAVINGS_GOAL_UPDATE',
        'DOODLE_SAVE'
      ]

      if (actionsForPush.includes(action)) {
        $fetch('/api/push/send', {
          method: 'POST',
          headers: authSession.value?.access_token
            ? { Authorization: `Bearer ${authSession.value.access_token}` }
            : undefined,
          body: {
            action,
            payload
          }
        }).catch((err) => {
          console.warn('[Push] Nie udało się wysłać powiadomienia:', err?.statusCode)
        })
      }
    }
    return deliveryPromise.then(() => undefined)
  }

  const broadcastLiveStroke = (stroke: DuoDoodleStroke) => {
    broadcastToPartner('DOODLE_LIVE_STROKE', { stroke })
  }

  const broadcastDrawingStatus = (isDrawing: boolean) => {
    broadcastToPartner('DOODLE_DRAWING_STATUS', { isDrawing })
  }

  const saveDoodle = (strokes: DuoDoodleStroke[], previewSvg?: string): DuoDoodle | null => {
    if (!partnership.value?.id) return null
    const newDoodle: DuoDoodle = {
      id: 'doodle_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      partnership_id: partnership.value.id,
      strokes,
      preview_svg: previewSvg,
      author_id: currentUser.value.id,
      author_name: currentUser.value.name || 'Ty',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    currentDoodle.value = newDoodle
    saveToStorage('duonest_active_doodle', newDoodle)
    broadcastToPartner('DOODLE_SAVE', { doodle: newDoodle })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value && partnership.value?.id) {
      try {
        bridge.from('partnership_doodles').upsert({
          id: newDoodle.id,
          partnership_id: newDoodle.partnership_id,
          strokes: newDoodle.strokes as any,
          preview_svg: newDoodle.preview_svg,
          author_id: newDoodle.author_id,
          author_name: newDoodle.author_name,
          updated_at: newDoodle.updated_at
        })
      } catch (err) {
        console.warn('Błąd podczas zapisywania rysunku:', err)
      }
    }

    triggerToast('Zapisano rysunek na tablicy! 🎨', { type: 'love' })
    return newDoodle
  }

  const clearDoodle = () => {
    currentDoodle.value = null
    saveToStorage('duonest_active_doodle', null)
    broadcastToPartner('DOODLE_CLEAR', {})

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value && partnership.value?.id) {
      try {
        bridge.from('partnership_doodles').delete().eq('partnership_id', partnership.value.id)
      } catch (err) {
        console.warn('Błąd podczas czyszczenia rysunku:', err)
      }
    }

    triggerToast('Wyczyszczono tablicę')
  }

  const subscribeToPartnershipRealtime = (partnershipId: string) => {
    const bridge = getDb()
    if (!bridge || typeof window === 'undefined' || !partnershipId) return

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
        bridge.removeChannel(activePartnershipChannel)
      } catch (_) {}
      activePartnershipChannel = null
    }

    realtimeStatus.value = 'connecting'
    activePartnershipId = partnershipId

    const channel = bridge.channel(channelName, {
      config: {
        private: true,
        broadcast: { ack: false, self: false },
        presence: { key: currentUser.value.id }
      }
    })
    activePartnershipChannel = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState ? channel.presenceState() : {}
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
          if (activePartnershipChannel && bridge) {
            try { bridge.removeChannel(activePartnershipChannel) } catch (_) {}
            activePartnershipChannel = null
          }
          if (options?.clearPartnershipData) {
            options.clearPartnershipData()
          }
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
            syncAllToStorage()
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
              syncAllToStorage()
              triggerToast(`${senderName} zmienił(a) plan`)
            }
          }
          break
        }
        case 'EVENT_DELETE': {
          if (data?.id) {
            const deleted = eventsList.value.find(e => e.id === data.id)
            eventsList.value = eventsList.value.filter(e => e.id !== data.id)
            syncAllToStorage()
            if (deleted) triggerToast(`${senderName} usunął(a) plan`)
          }
          break
        }
        case 'EVENT_TOGGLE_COMPLETED': {
          if (data?.id) {
            const ev = eventsList.value.find(e => e.id === data.id)
            if (ev) {
              ev.is_completed = data.is_completed
              syncAllToStorage()
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
            syncAllToStorage()
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
            syncAllToStorage()
          }
          break
        }
        case 'SHOPPING_TOGGLE': {
          if (data?.id) {
            const item = shoppingItems.value.find(i => i.id === data.id)
            if (item) {
              item.is_completed = data.is_completed
              syncAllToStorage()
            }
          }
          break
        }
        case 'SHOPPING_DELETE': {
          if (data?.id) {
            shoppingItems.value = shoppingItems.value.filter(i => i.id !== data.id)
            syncAllToStorage()
          }
          break
        }
        case 'SHOPPING_CLEAR': {
          const ids = Array.isArray(data?.ids) ? new Set(data.ids) : null
          shoppingItems.value = shoppingItems.value.filter(i => ids ? !ids.has(i.id) : !i.is_completed)
          syncAllToStorage()
          break
        }
        case 'TASK_ADD': {
          if (data && !tasksList.value.some(t => t.id === data.id)) {
            tasksList.value.unshift(data)
            syncAllToStorage()
            triggerToast(`${senderName} dodał(a) zadanie`)
          }
          break
        }
        case 'TASK_TOGGLE': {
          if (data?.id) {
            const task = tasksList.value.find(t => t.id === data.id)
            if (task) {
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
              syncAllToStorage()
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
            syncAllToStorage()
          }
          break
        }
        case 'PET_UPDATE': {
          if (data && partnership.value) {
            if (data.pet_id) partnership.value.pet_id = data.pet_id
            if (data.pet_name) partnership.value.pet_name = data.pet_name
            if (data.pet_xp !== undefined) partnership.value.pet_xp = data.pet_xp
            syncAllToStorage()
            triggerToast('Zwierzak zaktualizowany', { type: 'love' })
          }
          break
        }
        case 'MOOD_UPDATE': {
          if (data?.mood && partnerUser.value) {
            partnerUser.value.current_mood = data.mood
            partnerUser.value.mood_note = data.note || ''
            partnerUser.value.mood_updated_at = new Date().toISOString()
            syncAllToStorage()
            triggerToast(`${senderName} zmienił(a) nastrój`)
          }
          break
        }
        case 'NUDGE_SEND': {
          if (data) {
            nudgesList.value.unshift(data)
            syncAllToStorage()
            triggerToast(`${senderName} przesłał(a) gest`)
          }
          break
        }
        case 'MILESTONE_ADD': {
          if (data && !milestonesList.value.some(m => m.id === data.id)) {
            milestonesList.value.push(data)
            syncAllToStorage()
            triggerToast('Partner dodał cel')
          }
          break
        }
        case 'MILESTONE_UPDATE': {
          if (data?.id) {
            const m = milestonesList.value.find(i => i.id === data.id)
            if (m) {
              Object.assign(m, data.updates)
              syncAllToStorage()
            }
          }
          break
        }
        case 'MILESTONE_DELETE': {
          if (data?.id) {
            milestonesList.value = milestonesList.value.filter(i => i.id !== data.id)
            syncAllToStorage()
          }
          break
        }
        case 'MILESTONE_CLAIM': {
          if (data?.id) {
            const m = milestonesList.value.find(i => i.id === data.id)
            if (m) {
              m.is_completed = true
              m.completed_at = data.completed_at || new Date().toISOString()
              syncAllToStorage()
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
              syncAllToStorage()
            }
          }
          break
        }
        case 'WISHLIST_ADD': {
          if (data && data.id) {
            wishlistItems.value = [data, ...wishlistItems.value.filter(w => w.id !== data.id)]
            syncAllToStorage()
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
              syncAllToStorage()
              triggerToast(`${senderName} zmienił(a) marzenie`, { type: 'wishlist' })
            } else if (data.item) {
              wishlistItems.value = [data.item, ...wishlistItems.value.filter(w => w.id !== data.item.id)]
              syncAllToStorage()
            }
          }
          break
        }
        case 'WISHLIST_DELETE': {
          if (data?.id) {
            const deleted = wishlistItems.value.find(w => w.id === data.id)
            wishlistItems.value = wishlistItems.value.filter(w => w.id !== data.id)
            syncAllToStorage()
            if (deleted) triggerToast(`${senderName} usunął(a) marzenie`, { type: 'wishlist' })
          }
          break
        }
        case 'WISHLIST_TOGGLE':
        case 'WISHLIST_TOGGLE_COMPLETED': {
          if (data?.id) {
            const completedAt = data.completed_at || (data.is_completed ? new Date().toISOString() : null)
            wishlistItems.value = wishlistItems.value.map(w => w.id === data.id ? { ...w, is_completed: data.is_completed, completed_at: completedAt } : w)
            syncAllToStorage()
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
              syncAllToStorage()
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
              syncAllToStorage()
              if (data.last_reviewer_id && data.last_reviewer_id !== currentUser.value?.id) {
                triggerToast(`${senderName} ocenił(a) film`, { type: 'movies' })
              }
            } else {
              moviesList.value = [data, ...moviesList.value]
              syncAllToStorage()
            }
          }
          break
        }
        case 'MOVIE_DELETE': {
          if (data?.id) {
            const deleted = moviesList.value.find(m => m.id === data.id)
            moviesList.value = moviesList.value.filter(m => m.id !== data.id)
            syncAllToStorage()
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
              syncAllToStorage()
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
              syncAllToStorage()
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
              syncAllToStorage()
            }
          }
          break
        }
        case 'MEAL_DELETE': {
          if (data?.id) {
            mealsList.value = mealsList.value.filter(m => m.id !== data.id)
            syncAllToStorage()
          }
          break
        }
        case 'MEAL_TOGGLE':
        case 'MEAL_TOGGLE_COMPLETED': {
          if (data?.id) {
            const item = mealsList.value.find(m => m.id === data.id)
            if (item) {
              item.is_completed = data.is_completed
              item.completed_at = data.completed_at
              mealsList.value = [...mealsList.value]
              syncAllToStorage()
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
            syncAllToStorage()
            triggerToast(`${senderName} dodał(a) nową skarbonkę: ${data.title}`, { type: 'savings' })
          }
          break
        }
        case 'SAVINGS_GOAL_UPDATE': {
          if (data?.id) {
            const idx = savingsGoals.value.findIndex(g => g.id === data.id)
            if (idx !== -1) {
              savingsGoals.value[idx] = { ...savingsGoals.value[idx], ...data.updates }
              syncAllToStorage()
            }
          }
          break
        }
        case 'SAVINGS_GOAL_DELETE': {
          if (data?.id) {
            savingsGoals.value = savingsGoals.value.filter(g => g.id !== data.id)
            savingsContributions.value = savingsContributions.value.filter(c => c.goal_id !== data.id)
            syncAllToStorage()
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
            syncAllToStorage()
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
            syncAllToStorage()
          }
          break
        }
        case 'PARTNERSHIP_UPDATE': {
          if (data && partnership.value) {
            partnership.value = { ...partnership.value, ...data }
            syncAllToStorage()
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
            syncAllToStorage()
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
            syncAllToStorage()
            if (data.is_manual_edit) {
              triggerToast('Partner zaktualizował profil')
            }
          }
          break
        }
        case 'DOODLE_LIVE_STROKE': {
          if (data?.stroke) {
            isPartnerDrawing.value = true
            partnerLiveStroke.value = {
              stroke: data.stroke,
              timestamp: Date.now()
            }
            if (partnerDrawingTimeout) clearTimeout(partnerDrawingTimeout)
            partnerDrawingTimeout = setTimeout(() => {
              isPartnerDrawing.value = false
            }, 3500)
          }
          break
        }
        case 'DOODLE_DRAWING_STATUS': {
          isPartnerDrawing.value = Boolean(data?.isDrawing)
          if (!data?.isDrawing && partnerDrawingTimeout) {
            clearTimeout(partnerDrawingTimeout)
            partnerDrawingTimeout = null
          }
          break
        }
        case 'DOODLE_SAVE': {
          if (data?.doodle) {
            currentDoodle.value = data.doodle
            isPartnerDrawing.value = false
            saveToStorage('duonest_active_doodle', currentDoodle.value)
            triggerToast(`${senderName} narysował(a) coś dla Ciebie! 🎨`, { type: 'love' })
          }
          break
        }
        case 'DOODLE_CLEAR': {
          currentDoodle.value = null
          isPartnerDrawing.value = false
          saveToStorage('duonest_active_doodle', null)
          triggerToast(`${senderName} wyczyścił(a) tablicę`)
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
            doodle: currentDoodle.value,
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
            if (data.doodle) {
              if (!currentDoodle.value || new Date(data.doodle.updated_at) >= new Date(currentDoodle.value.updated_at)) {
                currentDoodle.value = data.doodle
                saveToStorage('duonest_active_doodle', currentDoodle.value)
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
            syncAllToStorage()
          }
          break
        }
      }
    })

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        realtimeStatus.value = 'connected'
        activePartnershipChannel = channel
        isOnlineWithSupabase.value = true

        if (channel.track) {
          channel.track({
            user_id: currentUser.value.id,
            name: currentUser.value.name,
            online_at: new Date().toISOString()
          })
        }

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

  const subscribeToSecurityChannel = (userId: string, partnershipId?: string | null) => {
    const bridge = getDb()
    if (!bridge || typeof window === 'undefined' || !userId) return

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
        bridge.removeChannel(activeSecurityChannel)
      } catch (_) {}
      activeSecurityChannel = null
    }

    activeSecurityUserId = userId
    activeSecurityPartnershipId = targetPartnershipId

    const channel = bridge.channel(channelName, { config: { private: true } })
    activeSecurityChannel = channel

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

  const loadSupabaseData = async (partnershipId: string) => {
    const bridge = getDb()
    if (!bridge || !partnershipId) return
    try {
      const [shops, tasks, evts, ndgs, wshs, movs, mls, mlsList, svgGoals, svgContribs, doodles] = await Promise.all([
        bridge.from('shopping_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('tasks').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('events').select('*').eq('partnership_id', partnershipId).order('start_time', { ascending: true }),
        bridge.from('nudges').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }).limit(20),
        bridge.from('wishlist_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('movies').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('milestones').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('meals').select('*').eq('partnership_id', partnershipId).order('date', { ascending: true }),
        bridge.from('savings_goals').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('savings_contributions').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('partnership_doodles').select('*').eq('partnership_id', partnershipId).order('updated_at', { ascending: false }).limit(1)
      ])

      if (shops.data) shoppingItems.value = shops.data
      if (tasks.data) tasksList.value = tasks.data
      if (evts.data) eventsList.value = evts.data
      if (ndgs.data) nudgesList.value = ndgs.data
      if (wshs.data) {
        const myIds = new Set([currentUser.value?.id, authUser.value?.id].filter(Boolean))
        wishlistItems.value = wshs.data.filter((item: WishlistItem) => item.is_visible_to_partner || myIds.has(item.created_by))
      }
      if (movs?.data) moviesList.value = deduplicateMoviesList(movs.data)
      if (mls?.data) milestonesList.value = mls.data
      if (mlsList?.data) mealsList.value = mlsList.data
      if (svgGoals?.data) savingsGoals.value = svgGoals.data
      if (svgContribs?.data) savingsContributions.value = svgContribs.data
      if (doodles?.data && doodles.data.length > 0) {
        const d = doodles.data[0]
        const author = d.author_id === currentUser.value.id
          ? (currentUser.value.name || 'Ty')
          : (partnerUser.value?.name || d.author_name || 'Partner')
        const incomingDoodle: DuoDoodle = {
          id: d.id,
          partnership_id: d.partnership_id,
          strokes: Array.isArray(d.strokes) ? d.strokes : [],
          preview_svg: d.preview_svg,
          author_id: d.author_id,
          author_name: author,
          created_at: d.created_at,
          updated_at: d.updated_at
        }
        if (!currentDoodle.value || new Date(incomingDoodle.updated_at) >= new Date(currentDoodle.value.updated_at)) {
          currentDoodle.value = incomingDoodle
          saveToStorage('duonest_active_doodle', currentDoodle.value)
        }
      }

      syncAllToStorage()
    } catch (e) {
      console.warn('Błąd ładowania danych partnerstwa:', e)
    }
  }

  const sendHeartbeat = async (force: boolean = false) => {
    if (typeof window === 'undefined') return
    if (!currentUser.value?.id || !authUser.value?.id) return
    const now = Date.now()
    if (!force && now - lastHeartbeatSentAt < 30000) return
    lastHeartbeatSentAt = now

    const nowIso = new Date(now).toISOString()
    currentUser.value.last_seen_at = nowIso

    if (activePartnershipChannel) {
      try {
        broadcastToPartner('HEARTBEAT', { user_id: currentUser.value.id, at: nowIso })
      } catch (_) {}
    }

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value && currentUser.value.id) {
      try {
        await bridge
          .from('profiles')
          .update({ last_seen_at: nowIso, updated_at: nowIso })
          .eq('id', currentUser.value.id)
      } catch (_) {}
    }
  }

  const setupHeartbeat = () => {
    if (typeof window === 'undefined' || heartbeatTimer) return
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
      const bridge = getDb()
      if (!bridge || !authUser.value?.id) return

      isOnlineWithSupabase.value = true
      dbSchemaStatus.value = 'connected'

      try {
        if (currentUser.value?.id && authUser.value?.id) {
          const { data: dbProfile } = await bridge
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
            saveToStorage('duonest_current_user', currentUser.value)
          }

          const effectivePartnershipId = dbProfile?.partnership_id || partnership.value?.id
          if (effectivePartnershipId) {
            if (options?.loadPartnershipAndPartner) {
              await options.loadPartnershipAndPartner(effectivePartnershipId, currentUser.value.id)
            }
            await loadSupabaseData(effectivePartnershipId)
            subscribeToPartnershipRealtime(effectivePartnershipId)
          }

          if (currentUser.value?.id) {
            subscribeToSecurityChannel(currentUser.value.id, effectivePartnershipId)
          }
        } else if (partnership.value?.id && authUser.value?.id) {
          if (options?.loadPartnershipAndPartner) {
            await options.loadPartnershipAndPartner(partnership.value.id, currentUser.value?.id || '')
          }
          await loadSupabaseData(partnership.value.id)
          subscribeToPartnershipRealtime(partnership.value.id)
        }

        setupHeartbeat()
        sendHeartbeat(false)
      } catch (err) {
        console.warn('Błąd podczas synchronizacji inicjalnej:', err)
      }
    })().finally(() => {
      setTimeout(() => {
        activeInitSyncPromise = null
      }, 500)
    })

    return activeInitSyncPromise
  }

  return {
    triggerToast,
    dismissToast,
    broadcastToPartner,
    broadcastLiveStroke,
    broadcastDrawingStatus,
    saveDoodle,
    clearDoodle,
    subscribeToPartnershipRealtime,
    subscribeToSecurityChannel,
    loadSupabaseData,
    sendHeartbeat,
    setupHeartbeat,
    initSupabaseSync
  }
}
