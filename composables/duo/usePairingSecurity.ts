import { getFirebaseBridge } from '../useFirebaseBridge'
import { stopPartnershipRealtime } from './useRealtimeSync'
import {
  currentUser,
  partnerUser,
  partnership,
  authUser,
  isPaired,
  isPartnerOnline,
  partnerLastSeenAt,
  nestLevel,
  activeToastMessage,
  activeToastItem,
  shoppingItems, tasksList, eventsList, nudgesList, milestonesList,
  wishlistItems, moviesList, mealsList, savingsGoals, savingsContributions,
  currentDoodle
} from './state'
import {
  saveToStorage,
  normalizePairingCode,
  getCleanAccentColor,
  createInitialProfile,
  inferToastMetadata,
  PROFILE_SELECT_FIELDS
} from './utils'
import { translateAppError } from '~/utils/errorTranslator'
import type { Profile, Partnership, DuoToastItem } from '~/types/duo'

let activePairingChannel: any = null
let activePairingCode: string | null = null
let isSecurityVerifying = false
let lastSecurityVerifiedAt = 0

export function usePairingSecurity(options: {
  triggerToast: (msg: string, opts?: any) => void
  subscribeToPartnershipRealtime?: (partnershipId: string) => void
  broadcastToPartner?: (action: string, data: any) => void | Promise<void>
  signOutUser?: () => Promise<void>
}) {
  const getDb = () => getFirebaseBridge()

  const clearPartnershipData = () => {
    stopPartnershipRealtime()
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
    savingsGoals.value = []
    savingsContributions.value = []
    currentDoodle.value = null
    isPartnerOnline.value = false
    partnerLastSeenAt.value = null
    if (typeof window !== 'undefined') {
      for (const key of [
        'partner_user', 'partnership', 'shopping', 'tasks', 'events', 'nudges',
        'milestones', 'wishlist', 'movies', 'meals', 'savings_goals',
        'savings_contributions', 'active_doodle', 'partner_last_seen'
      ]) localStorage.removeItem('duonest_' + key)
      saveToStorage('duonest_current_user', currentUser.value)
    }
  }

  const loadPartnershipAndPartner = async (partnershipId: string, currentUserId: string) => {
    const bridge = getDb()
    if (!bridge || !partnershipId) return

    try {
      const { data: pData } = await bridge
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
          const { data: pUser } = await bridge
            .from('profiles')
            .select(PROFILE_SELECT_FIELDS)
            .eq('id', partnerId)
            .maybeSingle()

          if (pUser) {
            partnerUser.value = {
              ...createInitialProfile(),
              ...pUser,
              name: pUser.name || 'Partner',
              avatar_color: getCleanAccentColor(pUser.avatar_color, '#0d9488'),
              points: Number(pUser.points) || 0
            }
            saveToStorage('duonest_partner_user', partnerUser.value)
          }
        }
      }
    } catch (err) {
      console.warn('loadPartnershipAndPartner error:', err)
    }
  }

  const checkDbPairingStatus = async (): Promise<boolean> => {
    const bridge = getDb()
    const myId = currentUser.value?.id || authUser.value?.id
    if (!bridge || !myId) return Boolean(partnership.value?.id)

    try {
      const { data, error } = await bridge
        .from('profiles')
        .select('partnership_id')
        .eq('id', myId)
        .maybeSingle()
      if (error || (currentUser.value?.id || authUser.value?.id) !== myId) return Boolean(partnership.value?.id)

      if (data?.partnership_id) {
        if (!partnership.value?.id || partnership.value.id !== data.partnership_id) {
          currentUser.value.partnership_id = data.partnership_id
          await loadPartnershipAndPartner(data.partnership_id, myId)
          saveToStorage('duonest_current_user', currentUser.value)
          if (options.subscribeToPartnershipRealtime) {
            options.subscribeToPartnershipRealtime(data.partnership_id)
          }
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

  const subscribeToPairingChannel = (myPairingCode: string) => {
    const bridge = getDb()
    if (!bridge || typeof window === 'undefined') return
    const code = normalizePairingCode(myPairingCode)
    if (!code) return

    const pairChannelName = `duonest_pair_${code}`
    if (activePairingChannel && activePairingCode === code) return

    if (activePairingChannel) {
      try { bridge.removeChannel(activePairingChannel) } catch (_) {}
      activePairingChannel = null
    }

    activePairingCode = code
    const pairChan = bridge.channel(pairChannelName, { config: { private: true } })
    activePairingChannel = pairChan

    const myId = currentUser.value?.id || authUser.value?.id
    if (myId) {
      pairChan.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${myId}` },
        async (payload: any) => {
          const newPId = payload.new?.partnership_id
          if (newPId && (!partnership.value?.id || partnership.value?.id !== newPId)) {
            currentUser.value.partnership_id = newPId
            await loadPartnershipAndPartner(newPId, myId)
            saveToStorage('duonest_current_user', currentUser.value)
            options.triggerToast('Połączono z partnerem! 🎉', { type: 'love' })
            setTimeout(() => {
              try { bridge.removeChannel(pairChan) } catch (_) {}
              activePairingChannel = null
              activePairingCode = null
              if (options.subscribeToPartnershipRealtime) {
                options.subscribeToPartnershipRealtime(newPId)
              }
            }, 500)
          }
        }
      )
    }

    pairChan.subscribe()
  }

  const pairWithCode = async (rawInput: string, partnerDisplayName: string = 'Partner'): Promise<{ success: boolean; error?: string }> => {
    if (!rawInput || !rawInput.trim()) {
      return { success: false, error: 'Wprowadź kod parowania partnera.' }
    }
    if (rawInput.includes('@')) {
      return { success: false, error: translateAppError('pairing_code_required') }
    }

    const trimmedInput = rawInput.trim()
    const code = normalizePairingCode(trimmedInput.replace(/\s+/g, ''))
    if (!/^DN-[A-Z0-9]{4,12}$/.test(code)) {
      return { success: false, error: translateAppError('invalid_pairing_input') }
    }
    const myCode = normalizePairingCode(currentUser.value?.pairing_code)
    const myCleanEmail = (currentUser.value?.email || authUser.value?.email || '').toLowerCase().trim()

    if (trimmedInput.toLowerCase() === myCleanEmail || code === myCode) {
      return { success: false, error: 'Nie możesz sparować konta ze swoim własnym kodem lub adresem e-mail.' }
    }

    const bridge = getDb()
    if (!bridge) {
      return { success: false, error: 'Brak połączenia z bazą danych.' }
    }

    try {
      const { data, error } = await bridge.rpc('pair_with_code', {
        pairing_input: code,
        display_name: currentUser.value.name || null
      })

      if (error || data?.error) {
        const retryAfter = error?.retryAfterSeconds
        const friendlyMessage = error?.status === 429 && Number.isSafeInteger(retryAfter) && retryAfter > 0
          ? `Zbyt wiele prób parowania. Spróbuj ponownie za ${retryAfter} s.`
          : translateAppError(data?.error || error)
        return { success: false, error: friendlyMessage }
      }

      if (!data?.partnership?.id || !data?.partner?.id) {
        return { success: false, error: 'Nie udało się połączyć kont. Sprawdź poprawność kodu i spróbuj ponownie.' }
      }

      currentUser.value.partnership_id = data.partnership.id
      partnership.value = data.partnership
      partnerUser.value = {
        ...createInitialProfile(),
        ...data.partner,
        name: data.partner.name || partnerDisplayName || 'Partner'
      }

      saveToStorage('duonest_current_user', currentUser.value)
      saveToStorage('duonest_partner_user', partnerUser.value)
      saveToStorage('duonest_partnership', partnership.value)

      if (options.subscribeToPartnershipRealtime) {
        options.subscribeToPartnershipRealtime(data.partnership.id)
      }

      options.triggerToast('Konta zostały pomyślnie sparowane! Witamy w Waszym Gniazdku! 💖', { type: 'love' })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: translateAppError(err) }
    }
  }

  const disconnectPartnership = async (): Promise<boolean> => {
    const bridge = getDb()
    if (!bridge) {
      options.triggerToast('Brak połączenia. Spróbuj ponownie.', { type: 'warning' })
      return false
    }

    try {
      const { error } = await bridge.rpc('disconnect_my_partnership')
      if (error) throw error
    } catch (err) {
      // Do not pretend it worked – after a reload the nest would come back.
      console.warn('Błąd podczas rozłączania związku:', err)
      options.triggerToast('Nie udało się rozłączyć. Sprawdź połączenie i spróbuj ponownie.', { type: 'warning' })
      return false
    }

    clearPartnershipData()
    options.triggerToast('Rozłączono konto z partnerem.', { type: 'warning' })

    if (typeof window !== 'undefined') {
      navigateTo('/pairing', { replace: true })
    }
    return true
  }

  const updateMyName = async (newName: string) => {
    const name = newName.trim()
    if (!name) return false
    if (name === currentUser.value.name) return true
    return updateMyProfile({ name })
  }

  const updateMyProfile = async (updates: Partial<Profile>) => {
    const id = currentUser.value.id
    if (!id) return false
    const { error } = await getDb().from('profiles').update(updates).eq('id', id)
    if (error) throw error
    if (currentUser.value.id !== id) return false
    currentUser.value = { ...currentUser.value, ...updates }
    saveToStorage('duonest_current_user', currentUser.value)
    return true
  }

  const updatePartnershipSettings = async (updates: Partial<Partnership>) => {
    const pid = partnership.value?.id
    if (!pid) return false
    const { error } = await getDb().from('partnerships').update(updates).eq('id', pid)
    if (error) throw error
    if (partnership.value?.id !== pid) return false
    partnership.value = { ...partnership.value, ...updates }
    saveToStorage('duonest_partnership', partnership.value)

    if (options.broadcastToPartner) {
      await options.broadcastToPartner('PARTNERSHIP_SETTINGS_UPDATE', { updates })
    }
    return true
  }

  const verifyUserAndPartnershipAccess = async (force: boolean = false): Promise<boolean> => {
    if (typeof window === 'undefined' || !authUser.value?.id) return true
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true

    const now = Date.now()
    if (!force && now - lastSecurityVerifiedAt < 5000) return true

    const bridge = getDb()
    if (!bridge || isSecurityVerifying) return true
    isSecurityVerifying = true

    try {
      const { data: profileId } = await bridge.rpc('my_profile_id')
      let { data: dbProfile } = profileId
        ? await bridge.from('profiles').select(PROFILE_SELECT_FIELDS).eq('id', profileId).maybeSingle()
        : { data: null }

      if (!dbProfile && authUser.value?.id) {
        const { data: fallbackProfile } = await bridge.from('profiles').select(PROFILE_SELECT_FIELDS).eq('auth_user_id', authUser.value.id).maybeSingle()
        if (fallbackProfile) dbProfile = fallbackProfile
      }

      if (dbProfile) {
        // The partner disconnected while we missed the realtime message
        const hadPartnership = Boolean(partnership.value?.id)
        if (hadPartnership && !dbProfile.partnership_id) {
          clearPartnershipData()
          options.triggerToast('Gniazdko zostało rozłączone.', { type: 'warning' })
          navigateTo('/pairing', { replace: true })
        }
        currentUser.value = {
          ...currentUser.value,
          ...dbProfile,
          name: dbProfile.name || currentUser.value.name || '',
          avatar_color: getCleanAccentColor(dbProfile.avatar_color, currentUser.value.avatar_color || '#0f172a'),
          partnership_id: dbProfile.partnership_id || null,
          points: Number(dbProfile.points) || 0
        }
        lastSecurityVerifiedAt = Date.now()
        return true
      }

      return true
    } catch (_) {
      return true
    } finally {
      isSecurityVerifying = false
    }
  }

  return {
    clearPartnershipData,
    loadPartnershipAndPartner,
    checkDbPairingStatus,
    subscribeToPairingChannel,
    pairWithCode,
    disconnectPartnership,
    updateMyName,
    updateMyProfile,
    updatePartnershipSettings,
    verifyUserAndPartnershipAccess,
    normalizePairingCode
  }
}
