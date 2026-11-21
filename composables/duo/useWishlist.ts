import { getFirebaseBridge } from '../useFirebaseBridge'
import { wishlistItems, currentUser, authUser, partnership, isOnlineWithSupabase } from './state'
import { saveToStorage } from './utils'
import type { WishlistItem } from '~/types/duo'

let refreshWishlistInFlight = false

export function useWishlist(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncWishlistToStorage = () => {
    saveToStorage('duonest_wishlist', wishlistItems.value)
  }

  const addWishlistItem = async (
    title: string,
    optionsData: {
      description?: string
      link_url?: string
      image_url?: string
      price_estimate?: string
      priority?: 'low' | 'medium' | 'high'
      category?: string
      is_surprise?: boolean
      is_visible_to_partner?: boolean
    } = {}
  ) => {
    if (!title.trim() || !partnership.value?.id) return null

    const newItem: WishlistItem = {
      id: `wish_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      partnership_id: partnership.value.id,
      title: title.trim(),
      description: optionsData.description?.trim() || null,
      link_url: optionsData.link_url?.trim() || null,
      image_url: optionsData.image_url?.trim() || null,
      price_estimate: optionsData.price_estimate?.trim() || null,
      priority: optionsData.priority || 'medium',
      category: optionsData.category || 'Inne',
      is_surprise: Boolean(optionsData.is_surprise),
      is_completed: false,
      is_visible_to_partner: optionsData.is_visible_to_partner !== false,
      created_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }

    wishlistItems.value.unshift(newItem)
    syncWishlistToStorage()

    if (newItem.is_visible_to_partner) {
      options.broadcastToPartner('WISHLIST_ADD', newItem)
    }

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('wishlist_items').insert(newItem)
      } catch (err) {
        console.warn('Błąd podczas zapisywania marzenia:', err)
      }
    }

    options.triggerToast('Dodano marzenie do listy')
    return newItem
  }

  const updateWishlistItem = async (id: string, updates: Partial<WishlistItem>) => {
    const item = wishlistItems.value.find(w => w.id === id)
    if (!item) return false

    Object.assign(item, updates)
    syncWishlistToStorage()

    if (item.is_visible_to_partner) {
      options.broadcastToPartner('WISHLIST_UPDATE', { id, updates, item })
    }

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('wishlist_items').update(updates).eq('id', id)
      } catch (_) {}
    }

    options.triggerToast('Zaktualizowano marzenie')
    return true
  }

  const deleteWishlistItem = async (id: string) => {
    const idx = wishlistItems.value.findIndex(w => w.id === id)
    if (idx === -1) return

    wishlistItems.value.splice(idx, 1)
    syncWishlistToStorage()

    options.broadcastToPartner('WISHLIST_DELETE', { id })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('wishlist_items').delete().eq('id', id)
      } catch (_) {}
    }

    options.triggerToast('Usunięto marzenie')
  }

  const toggleWishlistCompleted = async (id: string) => {
    const item = wishlistItems.value.find(w => w.id === id)
    if (!item) return

    item.is_completed = !item.is_completed
    item.completed_at = item.is_completed ? new Date().toISOString() : null
    syncWishlistToStorage()

    if (item.is_visible_to_partner !== false) {
      options.broadcastToPartner('WISHLIST_TOGGLE', { id, is_completed: item.is_completed, title: item.title })
    }

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('wishlist_items').update({
          is_completed: item.is_completed,
          completed_at: item.completed_at
        }).eq('id', id)
      } catch (_) {}
    }

    if (item.is_completed) {
      options.triggerToast('Marzenie spełnione! 🎁', { type: 'wishlist' })
    }
  }

  const refreshWishlist = async () => {
    if (refreshWishlistInFlight) return
    const pId = partnership.value?.id
    const bridge = getDb()
    if (!bridge || !pId) return

    refreshWishlistInFlight = true
    try {
      const { data, error } = await bridge
        .from('wishlist_items')
        .select('*')
        .eq('partnership_id', pId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const myIds = new Set([currentUser.value?.id, authUser.value?.id].filter(Boolean))
        const filtered = data.filter((item: WishlistItem) => item.is_visible_to_partner || myIds.has(item.created_by))
        wishlistItems.value = filtered
        syncWishlistToStorage()
      }
    } catch (_) {
    } finally {
      refreshWishlistInFlight = false
    }
  }

  return {
    addWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
    toggleWishlistCompleted,
    refreshWishlist
  }
}
