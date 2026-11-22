import { trackDuoEvent } from '~/composables/useDuoAnalytics'
import { getFirebaseBridge } from '../useFirebaseBridge'
import { shoppingItems, currentUser, partnership } from './state'
import { newDocumentId, saveToStorage } from './utils'
import type { ShoppingItem } from '~/types/duo'

const mergeShoppingQuantities = (current: string | null | undefined, incoming: string): string | null => {
  const currentValue = current?.trim() || ''
  const incomingValue = incoming.trim()
  if (!currentValue && !incomingValue) return '2'
  if (!currentValue) return incomingValue || null
  if (!incomingValue) return currentValue

  const parse = (value: string) => {
    const match = value.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
    if (!match) return null
    const amount = Number(match[1].replace(',', '.'))
    return Number.isFinite(amount) ? { amount, unit: match[2].trim() } : null
  }

  const currentQuantity = parse(currentValue)
  const incomingQuantity = parse(incomingValue)
  if (!currentQuantity || !incomingQuantity) return null
  if (currentQuantity.unit.toLocaleLowerCase('pl-PL') !== incomingQuantity.unit.toLocaleLowerCase('pl-PL')) return null

  const amount = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 })
    .format(currentQuantity.amount + incomingQuantity.amount)
  return currentQuantity.unit ? `${amount} ${currentQuantity.unit}` : amount
}

export function useShopping(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncShoppingToStorage = () => {
    saveToStorage('duonest_shopping', shoppingItems.value)
  }

  const fail = () => options.triggerToast('Nie udało się zapisać zmiany na liście zakupów.', { type: 'warning' })
  const normalize = (title: string) => title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL')

  const persistUpdate = async (item: ShoppingItem, updates: Partial<ShoppingItem>) => {
    try {
      const { error } = await getDb().from('shopping_items').update(updates).eq('id', item.id)
      if (error) throw error
      if (partnership.value?.id !== item.partnership_id) return false
      shoppingItems.value = shoppingItems.value.map(row => row.id === item.id ? { ...row, ...updates } : row)
      syncShoppingToStorage()
      return true
    } catch {
      fail()
      return false
    }
  }

  const addShoppingItem = async (title: string, category = 'Spożywcze', quantity = '') => {
    const pid = partnership.value?.id
    const cleanTitle = title.trim().replace(/\s+/g, ' ').slice(0, 100)
    if (!cleanTitle || !pid) return null
    const cleanCategory = category || 'Spożywcze'
    const cleanQty = quantity.trim().slice(0, 30)
    const duplicate = shoppingItems.value.find(item => item.partnership_id === pid && !item.is_completed &&
      item.category === cleanCategory && normalize(item.title) === normalize(cleanTitle))
    if (duplicate) {
      const merged = mergeShoppingQuantities(duplicate.quantity, cleanQty)
      if (merged !== null) {
        if (merged !== (duplicate.quantity || '') && !(await persistUpdate(duplicate, { quantity: merged }))) return null
        trackDuoEvent('duo_shopping_added')
        options.triggerToast('Połączono z pozycją na liście')
        return duplicate.id
      }
    }
    const item: ShoppingItem = {
      id: newDocumentId('shop_'),
      partnership_id: pid,
      title: cleanTitle,
      category: cleanCategory,
      quantity: cleanQty || null,
      is_completed: false,
      added_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }
    const { error } = await getDb().from('shopping_items').insert(item)
    if (error) { fail(); return null }
    if (partnership.value?.id !== pid) return null
    shoppingItems.value = [item, ...shoppingItems.value.filter(row => row.id !== item.id)]
    syncShoppingToStorage()
    options.broadcastToPartner('SHOPPING_ADD', item)
    trackDuoEvent('duo_shopping_added')
    options.triggerToast('Dodano produkt do listy zakupów')
    return item.id
  }

  const toggleShoppingItem = async (id: string) => {
    const item = shoppingItems.value.find(row => row.id === id)
    if (!item) return false
    const is_completed = !item.is_completed
    if (!(await persistUpdate(item, { is_completed, completed_by: is_completed ? currentUser.value.id : null }))) return false
    options.broadcastToPartner('SHOPPING_TOGGLE', { id, is_completed, title: item.title })
    return true
  }

  const deleteItems = async (ids: string[], message: string) => {
    const pid = partnership.value?.id
    if (!ids.length || !pid) return false
    try {
      await getDb().commitSharedBatch('shopping_items', ids.map(id => ({ id })))
      if (partnership.value?.id !== pid) return false
      const deleted = new Set(ids)
      shoppingItems.value = shoppingItems.value.filter(item => !deleted.has(item.id))
      syncShoppingToStorage()
      options.triggerToast(message)
      return true
    } catch {
      fail()
      return false
    }
  }

  const deleteShoppingItem = (id: string) => deleteItems([id], 'Usunięto produkt z listy zakupów')
  const clearCompletedShopping = () => deleteItems(
    shoppingItems.value.filter(item => item.is_completed).map(item => item.id),
    'Wyczyszczono kupione produkty'
  )

  const updateShoppingItem = async (id: string, updates: Partial<ShoppingItem>) => {
    const item = shoppingItems.value.find(row => row.id === id)
    if (!item || !(await persistUpdate(item, updates))) return false
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
