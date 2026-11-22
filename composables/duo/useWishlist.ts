import { trackDuoEvent } from '~/composables/useDuoAnalytics'
import { getFirebaseBridge } from '../useFirebaseBridge'
import { wishlistItems, currentUser, authUser, partnership } from './state'
import { newDocumentId, saveToStorage } from './utils'
import type { WishlistItem } from '~/types/duo'

let refreshWishlistInFlight = false

export function wishlistFilters(profileId: string, uid?: string): Record<string, string | boolean>[] {
  const owners = new Set([profileId, uid].filter((id): id is string => Boolean(id)))
  return [{ is_visible_to_partner: true }, ...[...owners].map(created_by => ({ created_by }))]
}

export function combineWishlist(items: WishlistItem[][]): WishlistItem[] {
  return Array.from(new Map(items.flat().map(item => [item.id, {
    ...item,
    url: item.url === undefined ? item.link_url : item.url,
    price: item.price === undefined ? item.price_estimate : item.price,
    note: item.note === undefined ? item.description : item.note,
    for_user_id: item.for_user_id ?? null
  }] as const)).values())
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
}

export async function readWishlist(partnershipId: string, profileId: string, uid?: string, serverOnly = false): Promise<WishlistItem[]> {
  const bridge = getFirebaseBridge()
  const results = await Promise.all(wishlistFilters(profileId, uid).map(async filter => {
    const request = bridge.from('wishlist_items', serverOnly).select('*').eq('partnership_id', partnershipId)
    for (const [key, value] of Object.entries(filter)) request.eq(key, value)
    const { data, error } = await request
    if (error) throw error
    return (data || []) as WishlistItem[]
  }))
  return combineWishlist(results)
}

export function useWishlist(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncWishlistToStorage = () => {
    saveToStorage('duonest_wishlist', wishlistItems.value)
  }

  const failedWrite = () => options.triggerToast('Nie udało się zapisać zmiany listy życzeń.', { type: 'warning' })

  const addWishlistItem = async (input: Pick<WishlistItem, 'title'> & Partial<Pick<WishlistItem,
    'url' | 'image_url' | 'price' | 'currency' | 'site_name' | 'note' | 'for_user_id' | 'is_visible_to_partner'
  >>) => {
    const pid = partnership.value?.id
    const title = input?.title?.trim()
    if (!title || !pid) return null
    const author = currentUser.value.id
    const item: WishlistItem = {
      id: newDocumentId('wish_'),
      partnership_id: pid,
      title,
      url: input.url?.trim() || null,
      image_url: input.image_url?.trim() || null,
      price: input.price?.trim() || null,
      currency: input.currency || 'PLN',
      site_name: input.site_name?.trim() || null,
      note: input.note?.trim() || null,
      for_user_id: input.for_user_id === undefined ? author : input.for_user_id,
      is_completed: false,
      completed_at: null,
      is_visible_to_partner: input.is_visible_to_partner !== false,
      created_by: author,
      created_at: new Date().toISOString()
    }

    const { error } = await getDb().from('wishlist_items').insert(item)
    if (error) { failedWrite(); return null }
    if (partnership.value?.id !== pid) return null
    wishlistItems.value = [item, ...wishlistItems.value.filter(wish => wish.id !== item.id)]
    syncWishlistToStorage()
    if (item.is_visible_to_partner) options.broadcastToPartner('WISHLIST_ADD', item)
    options.triggerToast(item.is_visible_to_partner ? 'Dodano marzenie' : 'Dodano niespodziankę')
    trackDuoEvent('duo_wish_added')
    return item
  }

  const persistUpdate = async (item: WishlistItem, changes: Partial<WishlistItem>) => {
    try {
      const { error } = await getDb().from('wishlist_items').update(changes).eq('id', item.id)
      if (error) throw error
      if (partnership.value?.id !== item.partnership_id) return null
      const updated = { ...item, ...changes }
      wishlistItems.value = wishlistItems.value.map(wish => wish.id === item.id ? updated : wish)
      syncWishlistToStorage()
      return updated
    } catch {
      failedWrite()
      return null
    }
  }

  const updateWishlistItem = async (id: string, changes: Partial<WishlistItem>) => {
    const item = wishlistItems.value.find(wish => wish.id === id)
    if (!item) return false
    const updated = await persistUpdate(item, changes)
    if (!updated) return false
    if (updated.is_visible_to_partner) {
      options.broadcastToPartner(item.is_visible_to_partner ? 'WISHLIST_UPDATE' : 'WISHLIST_ADD',
        item.is_visible_to_partner ? { id, updates: changes, item: updated } : updated)
    }
    options.triggerToast('Zaktualizowano marzenie')
    return true
  }

  const deleteWishlistItem = async (id: string) => {
    const pid = partnership.value?.id
    try {
      const { error } = await getDb().from('wishlist_items').delete().eq('id', id)
      if (error) throw error
      if (partnership.value?.id !== pid) return false
      wishlistItems.value = wishlistItems.value.filter(wish => wish.id !== id)
      syncWishlistToStorage()
      options.triggerToast('Usunięto marzenie')
      return true
    } catch {
      failedWrite()
      return false
    }
  }

  const toggleWishlistCompleted = async (id: string) => {
    const item = wishlistItems.value.find(wish => wish.id === id)
    if (!item) return false
    const is_completed = !item.is_completed
    if (!(await persistUpdate(item, { is_completed, completed_at: is_completed ? new Date().toISOString() : null }))) return false
    if (item.is_visible_to_partner) options.broadcastToPartner('WISHLIST_TOGGLE', { id, is_completed, title: item.title })
    if (is_completed) options.triggerToast('Marzenie spełnione', { type: 'wishlist' })
    return true
  }

  const refreshWishlist = async () => {
    if (refreshWishlistInFlight) return
    const pid = partnership.value?.id
    const profileId = currentUser.value?.id
    if (!pid || !profileId) return

    refreshWishlistInFlight = true
    try {
      const items = await readWishlist(pid, profileId, authUser.value?.id)
      if (partnership.value?.id !== pid || currentUser.value.id !== profileId) return
      wishlistItems.value = items
      syncWishlistToStorage()
    } catch (error) {
      if (process.dev) console.warn('Błąd odczytu listy życzeń', error)
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
