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
  newDocumentId,
  deduplicateMoviesList,
  PROFILE_SELECT_FIELDS,
  getCleanAccentColor,
  inferToastMetadata
} from './utils'
import type { DuoDoodle, DuoDoodleStroke, SavingsContribution, SavingsGoal, WishlistItem, ToastType } from '~/types/duo'
import { normalizeEventRecord } from '~/functions/src/eventRecord'
import { combineWishlist, readWishlist, wishlistFilters } from './useWishlist'

let activePartnershipChannel: any = null
let activePartnershipId: string | null = null
let activePartnershipUid: string | null = null
let nativeRealtimeSuspended = false
let partnershipDisposers: Array<() => void> = []
let activeSecurityChannel: any = null
let activeSecurityUserId: string | null = null
let activeSecurityPartnershipId: string | null = null
let activeInitSyncPromise: Promise<void> | null = null
let heartbeatTimer: any = null
let lastHeartbeatSentAt = 0
let partnerDrawingTimeout: any = null
let lastDrawingPushAt = 0
const DRAWING_PUSH_INTERVAL_MS = 45_000

const transientActions = new Set(['DOODLE_LIVE_STROKE', 'DOODLE_DRAWING_STATUS'])

export function stopPartnershipRealtime() {
  const channel = activePartnershipChannel
  activePartnershipChannel = null
  activePartnershipId = null
  activePartnershipUid = null
  for (const stop of partnershipDisposers.splice(0)) stop()
  if (channel) getFirebaseBridge().removeChannel(channel)
  clearTimeout(partnerDrawingTimeout)
  realtimeStatus.value = 'disconnected'
  isPartnerOnline.value = false
  isPartnerDrawing.value = false
  partnerLiveStroke.value = null
}

function normalizeStroke(raw: any, maxPoints = 100_000): DuoDoodleStroke | null {
  const width = raw?.width ?? raw?.size
  if (!Array.isArray(raw?.points) || raw.points.length < 2 || raw.points.length > maxPoints || raw.points.length % 2 !== 0 ||
      !raw.points.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1) ||
      typeof raw.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw.color) ||
      typeof width !== 'number' || !Number.isFinite(width) || width <= 0 || width > 100) return null
  return { points: raw.points, color: raw.color, width, isEraser: raw.isEraser === true }
}

const byNewest = (a: { created_at?: string }, b: { created_at?: string }) =>
  String(b.created_at || '').localeCompare(String(a.created_at || ''))

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
    if (activePartnershipChannel && transientActions.has(action)) {
      deliveryPromise = activePartnershipChannel.send({
        type: 'broadcast',
        event: 'duo_sync',
        payload: { action, senderId: currentUser.value.id, data: payload }
      }).catch(() => {})
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

      if (actionsForPush.includes(action)) sendPartnerPush(action, payload)
    }
    return deliveryPromise.then(() => undefined)
  }

  const sendPartnerPush = (action: string, payload: any) => {
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

  const broadcastLiveStroke = (stroke: DuoDoodleStroke) => {
    const valid = normalizeStroke(stroke, 4096)
    if (valid) void broadcastToPartner('DOODLE_LIVE_STROKE', { stroke: valid })
  }

  const broadcastDrawingStatus = (isDrawing: boolean) => {
    broadcastToPartner('DOODLE_DRAWING_STATUS', { isDrawing })
    // Wakes the partner's widget ("rysuje") when their app is closed; one ping per drawing session.
    if (isDrawing && Date.now() - lastDrawingPushAt > DRAWING_PUSH_INTERVAL_MS) {
      lastDrawingPushAt = Date.now()
      sendPartnerPush('DOODLE_DRAWING_STATUS', { isDrawing })
    }
  }

  const saveDoodle = async (strokes: DuoDoodleStroke[], previewSvg?: string): Promise<DuoDoodle | null> => {
    const pid = partnership.value?.id
    if (!pid) return null
    const now = new Date().toISOString()
    const doodle: DuoDoodle = {
      id: newDocumentId('doodle_'),
      partnership_id: pid,
      strokes,
      preview_svg: previewSvg && previewSvg.length <= 500_000 ? previewSvg : undefined,
      author_id: currentUser.value.id,
      author_name: currentUser.value.name || 'Ty',
      created_at: now,
      updated_at: now
    }
    const { error } = await getDb().from('partnership_doodles').insert(doodle)
    if (error) {
      triggerToast('Nie udało się zapisać rysunku. Spróbuj ponownie.', { type: 'warning' })
      return null
    }
    if (partnership.value?.id !== pid) return null
    setDoodle(doodle)
    broadcastToPartner('DOODLE_SAVE', {})
    triggerToast('Zapisano rysunek na tablicy', { type: 'love' })
    return doodle
  }

  const clearDoodle = async () => {
    const pid = partnership.value?.id
    if (!pid) return false
    try {
      const bridge = getDb()
      const { data, error } = await bridge.from('partnership_doodles').select('id').eq('partnership_id', pid)
      if (error) throw error
      await bridge.commitSharedBatch('partnership_doodles', (data || []).map((row: DuoDoodle) => ({ id: row.id })))
      if (partnership.value?.id !== pid) return false
      setDoodle(null)
      triggerToast('Wyczyszczono tablicę')
      return true
    } catch {
      triggerToast('Nie udało się wyczyścić tablicy.', { type: 'warning' })
      return false
    }
  }

  const setDoodle = (doc: any) => {
    currentDoodle.value = doc ? {
      ...doc,
      strokes: Array.isArray(doc.strokes) ? doc.strokes.map((stroke: unknown) => normalizeStroke(stroke)).filter(Boolean) : []
    } : null
    saveToStorage('duonest_active_doodle', currentDoodle.value)
  }

  const subscribeToPartnershipRealtime = (pid: string) => {
    if (typeof window === 'undefined' || !pid || nativeRealtimeSuspended) return
    const bridge = getDb()
    const uid = bridge.auth.currentUser?.uid
    const profileId = currentUser.value.id
    if (!uid || !profileId || (activePartnershipUid === uid && activePartnershipId === pid)) return

    stopPartnershipRealtime()
    activePartnershipUid = uid
    activePartnershipId = pid
    realtimeStatus.value = 'connecting'

    let stopped = false
    let retry: ReturnType<typeof setTimeout> | undefined
    partnershipDisposers.push(() => {
      stopped = true
      clearTimeout(retry)
    })
    const isCurrent = () => !stopped && activePartnershipUid === uid && activePartnershipId === pid &&
      bridge.auth.currentUser?.uid === uid && currentUser.value.id === profileId
    let retryDelay = 1000
    const connect = async () => {
      const member = await bridge.syncAccount(true)
      if (!isCurrent()) return
      if (!member) {
        retry = setTimeout(() => void connect(), retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30000)
        return
      }
      if (member.profile_id !== profileId || member.partnership_id !== pid) {
        stopPartnershipRealtime()
        return
      }
      startPartnershipListeners(pid, uid, profileId, isCurrent)
    }
    void connect()
  }

  const startPartnershipListeners = (pid: string, uid: string, profileId: string, isCurrent: () => boolean) => {
    const bridge = getDb()
    const filters = { partnership_id: pid }
    const observe = (table: string, apply: (rows: any[]) => void, order?: { field: string; limit: number }) => {
      partnershipDisposers.push(bridge.observeCollection(table, filters, rows => {
        if (!isCurrent()) return
        apply(rows)
      }, order))
    }

    partnershipDisposers.push(bridge.observeDocument('members', uid, member => {
      if (!isCurrent() || (member?.partnership_id === pid && member.profile_id === profileId)) return
      stopPartnershipRealtime()
      options?.clearPartnershipData?.()
      triggerToast('Rozłączono Gniazdko', { type: 'warning' })
      if (window.location.pathname.startsWith('/tabs')) window.location.replace('/pairing')
    }))

    partnershipDisposers.push(bridge.observeDocument('profiles', profileId, profile => {
      if (!isCurrent() || !profile || profile.auth_user_id !== uid || profile.partnership_id !== pid) return
      currentUser.value = {
        ...currentUser.value,
        ...profile,
        email: authUser.value?.email || currentUser.value.email,
        points: Number(profile.points) || 0
      }
      saveToStorage('duonest_current_user', currentUser.value)
    }))

    let stopPartner: (() => void) | undefined
    let observedPartnerId: string | null = null
    partnershipDisposers.push(() => stopPartner?.())
    partnershipDisposers.push(bridge.observeDocument('partnerships', pid, row => {
      if (!isCurrent() || !row) return
      partnership.value = { ...partnership.value, ...row }
      saveToStorage('duonest_partnership', partnership.value)

      const partnerId = row.partner1_id === profileId ? row.partner2_id : row.partner1_id
      if (!partnerId || observedPartnerId === partnerId) return
      observedPartnerId = partnerId
      syncPresence()
      stopPartner?.()
      stopPartner = bridge.observeDocument('profiles', partnerId, profile => {
        if (!isCurrent() || !profile || profile.partnership_id !== pid) return
        const previousMood = partnerUser.value?.mood_updated_at
        partnerUser.value = { ...partnerUser.value, ...profile, points: Number(profile.points) || 0 }
        saveToStorage('duonest_partner_user', partnerUser.value)
        if (!isPartnerOnline.value && profile.last_seen_at && (!partnerLastSeenAt.value || profile.last_seen_at > partnerLastSeenAt.value)) {
          partnerLastSeenAt.value = profile.last_seen_at
          saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)
        }
        if (previousMood && profile.mood_updated_at && previousMood !== profile.mood_updated_at) {
          triggerToast(`${profile.name || 'Partner'} zmienił(a) nastrój`, { type: 'mood' })
        }
      })
    }))

    observe('shopping_items', rows => {
      shoppingItems.value = rows.sort(byNewest)
      saveToStorage('duonest_shopping', shoppingItems.value)
    })
    observe('tasks', rows => {
      tasksList.value = rows.sort(byNewest)
      saveToStorage('duonest_tasks', tasksList.value)
    })
    observe('events', rows => {
      eventsList.value = rows.map(normalizeEventRecord).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
      saveToStorage('duonest_events', eventsList.value)
    })
    let previousNudges: Set<string> | undefined
    observe('nudges', rows => {
      const newGesture = previousNudges && rows.find(row => row.sender_id !== profileId && !previousNudges!.has(row.id))
      nudgesList.value = rows.sort(byNewest)
      previousNudges = new Set(rows.map(row => row.id))
      saveToStorage('duonest_nudges', nudgesList.value)
      if (newGesture) triggerToast(`${partnerUser.value?.name || 'Partner'} przesłał(a) gest`, { type: 'love' })
    }, { field: 'created_at', limit: 20 })
    observe('milestones', rows => {
      milestonesList.value = rows.sort(byNewest)
      saveToStorage('duonest_milestones', milestonesList.value)
    })
    observe('movies', rows => {
      moviesList.value = deduplicateMoviesList(rows.sort(byNewest))
      saveToStorage('duonest_movies', moviesList.value)
    })
    observe('meals', rows => {
      mealsList.value = rows.sort((a, b) => String(a.date).localeCompare(String(b.date)))
      saveToStorage('duonest_meals', mealsList.value)
    })
    observe('partnership_doodles', rows => setDoodle(rows[0]), { field: 'updated_at', limit: 1 })

    const wishQueries = wishlistFilters(profileId, uid)
    const wishParts = new Map<number, WishlistItem[]>()
    wishQueries.forEach((where, index) => {
      partnershipDisposers.push(bridge.observeCollection('wishlist_items', { ...filters, ...where }, rows => {
        if (!isCurrent()) return
        wishParts.set(index, rows)
        if (wishParts.size !== wishQueries.length) return
        wishlistItems.value = combineWishlist([...wishParts.values()])
        saveToStorage('duonest_wishlist', wishlistItems.value)
      }))
    })

    let goalIds: Set<string> | null = null
    let contributions: SavingsContribution[] | null = null
    function applyContributions() {
      if (!goalIds || !contributions) return
      savingsContributions.value = contributions.filter(item => goalIds!.has(item.goal_id)).sort(byNewest)
      saveToStorage('duonest_savings_contributions', savingsContributions.value)
    }
    observe('savings_goals', rows => {
      savingsGoals.value = rows.filter(row => !row.deleted_at).sort(byNewest)
      goalIds = new Set(savingsGoals.value.map(row => row.id))
      saveToStorage('duonest_savings_goals', savingsGoals.value)
      applyContributions()
    })
    observe('savings_contributions', rows => {
      contributions = rows
      applyContributions()
    })

    const channel = bridge.channel(`duonest_channel_${pid}`, { config: { presence: { key: profileId } } })
    activePartnershipChannel = channel
    function syncPresence() {
      if (!isCurrent()) return
      const wasOnline = isPartnerOnline.value
      const sessions = observedPartnerId && channel.presenceState()[observedPartnerId]
      isPartnerOnline.value = Boolean(sessions && Object.keys(sessions).length)
      if (isPartnerOnline.value || wasOnline) {
        partnerLastSeenAt.value = new Date().toISOString()
        saveToStorage('duonest_partner_last_seen', partnerLastSeenAt.value)
      }
      if (isPartnerOnline.value && !wasOnline) triggerToast(`${partnerUser.value?.name || 'Partner'} jest online`)
    }
    // Account sync has published membership before we attach either set of listeners.
    channel.on('presence', { event: 'sync' }, syncPresence)
    channel.on('broadcast', { event: 'duo_sync' }, ({ payload, ts }: any) => {
      if (!isCurrent() || !partnerUser.value?.id || payload?.senderId !== partnerUser.value.id ||
          typeof ts !== 'number' || Date.now() - ts > 60000) return
      if (payload.action === 'DOODLE_LIVE_STROKE') {
        const stroke = normalizeStroke(payload.data?.stroke, 4096)
        if (!stroke) return
        partnerLiveStroke.value = { stroke, timestamp: Date.now() }
        isPartnerDrawing.value = true
      } else if (payload.action === 'DOODLE_DRAWING_STATUS' && typeof payload.data?.isDrawing === 'boolean') {
        isPartnerDrawing.value = payload.data.isDrawing
      } else {
        return
      }
      clearTimeout(partnerDrawingTimeout)
      if (isPartnerDrawing.value) partnerDrawingTimeout = setTimeout(() => { isPartnerDrawing.value = false }, 3500)
    })
    const trackPresence = (active: boolean) => {
      if (!isCurrent()) return
      if (active) channel.track()
      else void channel.untrack()
    }
    const syncVisibility = () => trackPresence(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', syncVisibility)
    partnershipDisposers.push(() => document.removeEventListener('visibilitychange', syncVisibility))
    syncVisibility()

    channel.subscribe((status: string) => {
      if (!isCurrent()) return
      realtimeStatus.value = status === 'SUBSCRIBED' ? 'connected' : 'disconnected'
    })
  }

  const setNativeRealtimeActive = (isActive: boolean) => {
    const suspended = !isActive
    if (nativeRealtimeSuspended === suspended) return
    nativeRealtimeSuspended = suspended
    if (suspended) stopPartnershipRealtime()
    getDb().setRealtimeConnectionActive(isActive)
    const pid = currentUser.value.partnership_id
    if (isActive && authUser.value?.id && pid) {
      subscribeToPartnershipRealtime(pid)
      void sendHeartbeat(true)
    }
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
    const profileId = currentUser.value.id
    const uid = bridge.auth.currentUser?.uid
    try {
      const [shops, tasks, evts, ndgs, wishes, movs, mls, mlsList, svgGoals, svgContribs, doodles] = await Promise.all([
        bridge.from('shopping_items').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('tasks').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('events').select('*').eq('partnership_id', partnershipId).order('start_time', { ascending: true }),
        bridge.from('nudges').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }).limit(20),
        readWishlist(partnershipId, profileId, uid).catch(() => null),
        bridge.from('movies').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('milestones').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('meals').select('*').eq('partnership_id', partnershipId).order('date', { ascending: true }),
        bridge.from('savings_goals').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('savings_contributions').select('*').eq('partnership_id', partnershipId).order('created_at', { ascending: false }),
        bridge.from('partnership_doodles').select('*').eq('partnership_id', partnershipId).order('updated_at', { ascending: false }).limit(1)
      ])

      if (bridge.auth.currentUser?.uid !== uid || currentUser.value.id !== profileId ||
          (partnership.value?.id || currentUser.value.partnership_id) !== partnershipId) return
      if (shops.data) shoppingItems.value = shops.data
      if (tasks.data) tasksList.value = tasks.data
      if (evts.data) eventsList.value = evts.data.map(normalizeEventRecord).sort((a: any, b: any) => String(a.start_time).localeCompare(String(b.start_time)))
      if (ndgs.data) nudgesList.value = ndgs.data
      if (wishes) wishlistItems.value = wishes
      if (movs?.data) moviesList.value = deduplicateMoviesList(movs.data)
      if (mls?.data) milestonesList.value = mls.data
      if (mlsList?.data) mealsList.value = mlsList.data
      if (svgGoals?.data) savingsGoals.value = svgGoals.data.filter((goal: SavingsGoal & { deleted_at?: string }) => !goal.deleted_at)
      if (svgContribs?.data) {
        const activeGoals = new Set(savingsGoals.value.map(goal => goal.id))
        savingsContributions.value = svgContribs.data.filter((entry: SavingsContribution) => activeGoals.has(entry.goal_id))
      }
      if (doodles?.data) setDoodle(doodles.data[0])

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
    setNativeRealtimeActive,
    subscribeToSecurityChannel,
    loadSupabaseData,
    sendHeartbeat,
    setupHeartbeat,
    initSupabaseSync
  }
}
