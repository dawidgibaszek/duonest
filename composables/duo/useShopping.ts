import { getFirebaseBridge } from '../useFirebaseBridge'
import { shoppingItems, currentUser, partnership, isOnlineWithSupabase } from './state'
import { saveToStorage } from './utils'
import type { ShoppingItem } from '~/types/duo'

export function useShopping(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncShoppingToStorage = () => {
    saveToStorage('duonest_shopping', shoppingItems.value)
  }

  const addShoppingItem = async (title: string, category: string = 'Inne', quantity: string = '') => {
    if (!title.trim() || !partnership.value?.id) return null
    const cleanTitle = title.trim()
    const cleanCategory = category || 'Inne'
    const cleanQty = quantity.trim() || null

    const newItem: ShoppingItem = {
      id: `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      partnership_id: partnership.value.id,
      title: cleanTitle,
      category: cleanCategory,
      quantity: cleanQty,
      is_completed: false,
      added_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }

    shoppingItems.value.unshift(newItem)
    syncShoppingToStorage()

    options.broadcastToPartner('SHOPPING_ADD', newItem)

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('shopping_items').insert(newItem)
      } catch (err) {
        console.warn('Błąd podczas zapisywania produktu:', err)
      }
    }

    options.triggerToast('Dodano produkt do listy zakupów')
    return newItem
  }

  const toggleShoppingItem = async (id: string) => {
    const item = shoppingItems.value.find(i => i.id === id)
    if (!item) return

    item.is_completed = !item.is_completed
    item.completed_by = item.is_completed ? currentUser.value.id : null
    syncShoppingToStorage()

    options.broadcastToPartner('SHOPPING_TOGGLE', { id, is_completed: item.is_completed })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('shopping_items').update({
          is_completed: item.is_completed,
          completed_by: item.completed_by
        }).eq('id', id)
      } catch (err) {
        console.warn('Błąd aktualizacji produktu:', err)
      }
    }
  }

  const deleteShoppingItem = async (id: string) => {
    const idx = shoppingItems.value.findIndex(i => i.id === id)
    if (idx === -1) return

    shoppingItems.value.splice(idx, 1)
    syncShoppingToStorage()

    options.broadcastToPartner('SHOPPING_DELETE', { id })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('shopping_items').delete().eq('id', id)
      } catch (err) {
        console.warn('Błąd usuwania produktu:', err)
      }
    }

    options.triggerToast('Usunięto produkt z listy zakupów')
  }

  const clearCompletedShopping = async () => {
    const completedIds = shoppingItems.value.filter(i => i.is_completed).map(i => i.id)
    if (completedIds.length === 0) return

    shoppingItems.value = shoppingItems.value.filter(i => !i.is_completed)
    syncShoppingToStorage()

    options.broadcastToPartner('SHOPPING_CLEAR_COMPLETED', { ids: completedIds })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        for (const cid of completedIds) {
          await bridge.from('shopping_items').delete().eq('id', cid)
        }
      } catch (_) {}
    }

    options.triggerToast('Wyczyszczono kupione produkty')
  }

  const updateShoppingItem = async (id: string, updates: Partial<ShoppingItem>) => {
    const item = shoppingItems.value.find(i => i.id === id)
    if (!item) return false

    Object.assign(item, updates)
    syncShoppingToStorage()

    options.broadcastToPartner('SHOPPING_UPDATE', { id, updates, item })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('shopping_items').update(updates).eq('id', id)
      } catch (_) {}
    }

    options.triggerToast('Zaktualizowano produkt')
    return true
  }

  return {
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    clearCompletedShopping,
    updateShoppingItem
  }
}
