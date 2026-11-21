import { getFirebaseBridge } from '../useFirebaseBridge'
import { mealsList, shoppingItems, currentUser, partnership, isOnlineWithSupabase } from './state'
import { saveToStorage } from './utils'
import type { MealItem, MealIngredient, ShoppingItem } from '~/types/duo'

let refreshMealsInFlight = false

export function useMeals(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncMealsToStorage = () => {
    saveToStorage('duonest_meals', mealsList.value)
  }

  const addMeal = async (
    title: string,
    date: string,
    mealType: MealItem['meal_type'] = 'dinner',
    optionsData: {
      description?: string
      recipe_url?: string
      image_url?: string
      ingredients?: MealIngredient[]
      is_saved_recipe?: boolean
    } = {}
  ) => {
    if (!title.trim() || !partnership.value?.id) return null

    const newMeal: MealItem = {
      id: `meal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      partnership_id: partnership.value.id,
      title: title.trim(),
      date,
      meal_type: mealType,
      description: optionsData.description?.trim() || null,
      recipe_url: optionsData.recipe_url?.trim() || null,
      image_url: optionsData.image_url?.trim() || null,
      ingredients: optionsData.ingredients || [],
      is_completed: false,
      created_by: currentUser.value.id,
      created_at: new Date().toISOString(),
      is_saved_recipe: Boolean(optionsData.is_saved_recipe)
    }

    mealsList.value.push(newMeal)
    syncMealsToStorage()

    options.broadcastToPartner('MEAL_ADD', newMeal)

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('meals').insert(newMeal)
      } catch (err) {
        console.warn('Błąd podczas zapisywania posiłku:', err)
      }
    }

    options.triggerToast('Zaplanowano posiłek 🍲', { type: 'meals' })
    return newMeal
  }

  const updateMeal = async (id: string, updates: Partial<MealItem>) => {
    const meal = mealsList.value.find(m => m.id === id)
    if (!meal) return false

    Object.assign(meal, updates)
    syncMealsToStorage()

    options.broadcastToPartner('MEAL_UPDATE', { id, updates, meal })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('meals').update(updates).eq('id', id)
      } catch (_) {}
    }

    options.triggerToast('Zaktualizowano posiłek')
    return true
  }

  const toggleMealCompleted = async (id: string) => {
    const meal = mealsList.value.find(m => m.id === id)
    if (!meal) return

    meal.is_completed = !meal.is_completed
    syncMealsToStorage()

    options.broadcastToPartner('MEAL_TOGGLE', { id, is_completed: meal.is_completed, title: meal.title })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('meals').update({ is_completed: meal.is_completed }).eq('id', id)
      } catch (_) {}
    }

    if (meal.is_completed) {
      options.triggerToast('Smacznego! Posiłek zjedzony! 😋', { type: 'meals' })
    }
  }

  const deleteMeal = async (id: string) => {
    const idx = mealsList.value.findIndex(m => m.id === id)
    if (idx === -1) return

    mealsList.value.splice(idx, 1)
    syncMealsToStorage()

    options.broadcastToPartner('MEAL_DELETE', { id })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('meals').delete().eq('id', id)
      } catch (err) {
        console.warn('Błąd usuwania posiłku:', err)
      }
    }

    options.triggerToast('Usunięto posiłek')
  }

  const deleteSavedRecipe = async (id: string) => {
    return deleteMeal(id)
  }

  const addIngredientsToShopping = async (ingredients: MealIngredient[]) => {
    if (!ingredients || ingredients.length === 0 || !partnership.value?.id) return

    const newShoppingItems: ShoppingItem[] = []
    for (const ing of ingredients) {
      if (!ing.name || !ing.name.trim()) continue
      const title = ing.name.trim()
      const qty = [ing.amount, ing.unit].filter(Boolean).join(' ') || null

      const newItem: ShoppingItem = {
        id: `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        partnership_id: partnership.value.id,
        title,
        category: 'Spożywcze',
        quantity: qty,
        is_completed: false,
        added_by: currentUser.value.id,
        created_at: new Date().toISOString()
      }
      shoppingItems.value.unshift(newItem)
      newShoppingItems.push(newItem)
    }

    saveToStorage('duonest_shopping', shoppingItems.value)

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        for (const item of newShoppingItems) {
          await bridge.from('shopping_items').insert(item)
          options.broadcastToPartner('SHOPPING_ADD', item)
        }
      } catch (_) {}
    }

    options.triggerToast(`Dodano ${newShoppingItems.length} składników do listy zakupów! 🛒`, { type: 'shopping' })
  }

  const refreshMeals = async () => {
    if (refreshMealsInFlight) return
    const pId = partnership.value?.id
    const bridge = getDb()
    if (!bridge || !pId) return

    refreshMealsInFlight = true
    try {
      const { data, error } = await bridge
        .from('meals')
        .select('*')
        .eq('partnership_id', pId)
        .order('date', { ascending: true })

      if (!error && data) {
        mealsList.value = data
        syncMealsToStorage()
      }
    } catch (_) {
    } finally {
      refreshMealsInFlight = false
    }
  }

  return {
    addMeal,
    updateMeal,
    toggleMealCompleted,
    deleteMeal,
    deleteSavedRecipe,
    addIngredientsToShopping,
    refreshMeals
  }
}
