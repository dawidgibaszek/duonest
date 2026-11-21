import { getFirebaseBridge } from '../useFirebaseBridge'
import { mealsList, shoppingItems, currentUser, partnership } from './state'
import { newDocumentId, saveToStorage } from './utils'
import type { MealItem, MealIngredient, ShoppingItem } from '~/types/duo'

type MealInput = Pick<MealItem, 'title'> & Partial<Pick<MealItem,
  'date' | 'day_name' | 'category' | 'area' | 'cook_id' | 'image_url' | 'source' | 'api_id' |
  'ingredients' | 'instructions' | 'youtube_url' | 'recipe_url' | 'titlePl'
>>
type SavedRecipeKey = { key?: string; api_id?: string; title?: string; rawTitle?: string; titlePl?: string }

const lower = (value?: string) => value?.trim().toLocaleLowerCase('pl-PL') || ''
const matchesRecipe = (meal: MealItem, recipe: SavedRecipeKey) => {
  if (recipe.api_id) return Boolean(meal.api_id && String(meal.api_id) === String(recipe.api_id))
  if (meal.api_id) return false
  const titles = [recipe.rawTitle, recipe.title, recipe.titlePl].map(lower).filter(Boolean)
  return titles.includes(lower(meal.title)) || titles.includes(lower(meal.titlePl))
}

let refreshMealsInFlight = false

export function useMeals(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()
  const syncMeals = () => saveToStorage('duonest_meals', mealsList.value)
  const notifyFailure = () => options.triggerToast('Nie udało się zapisać zmiany. Spróbuj ponownie.', { type: 'warning' })

  const addMeal = async (input: MealInput): Promise<MealItem | null> => {
    const pid = partnership.value?.id
    const title = input?.title?.trim().slice(0, 100)
    if (!pid || !title) return null

    const date = input.date?.trim() || ''
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
    const current = mealsList.value.find(meal => meal.partnership_id === pid &&
      (date ? meal.date === date : !meal.date && matchesRecipe(meal, input)))
    const now = new Date().toISOString()
    const meal: MealItem = {
      id: current?.id || (date ? `meal_${pid}_${date}` : newDocumentId('meal_')),
      partnership_id: pid,
      date,
      day_name: input.day_name || '',
      title,
      titlePl: input.titlePl,
      category: input.category || '',
      area: input.area || '',
      cook_id: input.cook_id || 'me',
      image_url: input.image_url?.trim() || '',
      source: input.source || 'custom',
      api_id: input.api_id ? String(input.api_id) : '',
      ingredients: input.ingredients || [],
      instructions: input.instructions || '',
      youtube_url: input.youtube_url || '',
      recipe_url: input.recipe_url || '',
      is_completed: date ? false : current?.is_completed ?? false,
      completed_at: date ? null : current?.completed_at ?? null,
      is_saved_recipe: true,
      created_by: current?.created_by || currentUser.value.id,
      created_at: current?.created_at || now,
      updated_at: now
    }
    try {
      const { error } = await getDb().from('meals').upsert(meal)
      if (error) throw error
      if (partnership.value?.id !== pid) return null
      mealsList.value = [meal, ...mealsList.value.filter(item => item.id !== meal.id)]
      syncMeals()
      options.broadcastToPartner(current ? 'MEAL_UPDATE' : 'MEAL_ADD', meal)
      options.triggerToast(date ? 'Zaplanowano obiad' : 'Zapisano przepis', { type: 'meals' })
      return meal
    } catch {
      notifyFailure()
      return null
    }
  }

  const persistMealUpdate = async (meal: MealItem, updates: Partial<MealItem>) => {
    try {
      const patch = { ...updates, updated_at: new Date().toISOString() }
      const { error } = await getDb().from('meals').update(patch).eq('id', meal.id)
      if (error) throw error
      if (partnership.value?.id !== meal.partnership_id) return false
      mealsList.value = mealsList.value.map(item => item.id === meal.id ? { ...item, ...patch } : item)
      syncMeals()
      return true
    } catch {
      notifyFailure()
      return false
    }
  }

  const updateMeal = async (id: string, updates: Partial<MealItem>) => {
    const meal = mealsList.value.find(item => item.id === id)
    if (!meal || !(await persistMealUpdate(meal, updates))) return false
    options.broadcastToPartner('MEAL_UPDATE', { ...meal, ...updates })
    options.triggerToast('Zaktualizowano posiłek')
    return true
  }

  const toggleMealCompleted = async (id: string) => {
    const meal = mealsList.value.find(item => item.id === id)
    if (!meal) return false
    const is_completed = !meal.is_completed
    const completed_at = is_completed ? new Date().toISOString() : null
    if (!(await persistMealUpdate(meal, { is_completed, completed_at }))) return false
    options.broadcastToPartner('MEAL_TOGGLE', { id, is_completed, title: meal.title })
    if (is_completed) options.triggerToast('Oznaczono obiad jako zjedzony', { type: 'meals' })
    return true
  }

  const deleteMeal = async (id: string) => {
    const pid = partnership.value?.id
    if (!pid || !mealsList.value.some(item => item.id === id && item.partnership_id === pid)) return false
    try {
      const { error } = await getDb().from('meals').delete().eq('id', id)
      if (error) throw error
      if (partnership.value?.id !== pid) return false
      mealsList.value = mealsList.value.filter(item => item.id !== id)
      syncMeals()
      options.triggerToast('Usunięto z planu')
      return true
    } catch {
      notifyFailure()
      return false
    }
  }

  const deleteSavedRecipe = async (recipe: SavedRecipeKey) => {
    const pid = partnership.value?.id
    if (!pid) return false
    const matches = mealsList.value.filter(item => item.partnership_id === pid && matchesRecipe(item, recipe))
    if (!matches.length) return false
    try {
      await getDb().commitSharedBatch('meals', matches.map(item =>
        item.date ? { id: item.id, updates: { is_saved_recipe: false } } : { id: item.id }
      ))
      if (partnership.value?.id !== pid) return false
      const ids = new Set(matches.map(item => item.id))
      mealsList.value = mealsList.value.filter(item => item.date || !ids.has(item.id))
        .map(item => ids.has(item.id) ? { ...item, is_saved_recipe: false } : item)
      syncMeals()
      options.triggerToast('Usunięto przepis z książki')
      return true
    } catch {
      notifyFailure()
      return false
    }
  }

  const addIngredientsToShopping = async (ingredients: MealIngredient[]) => {
    const pid = partnership.value?.id
    if (!pid) return false
    const items: ShoppingItem[] = ingredients.filter(ingredient => ingredient.name?.trim()).map(ingredient => ({
      id: newDocumentId('shop_'),
      partnership_id: pid,
      title: ingredient.name.trim(),
      category: 'Spożywcze',
      quantity: ingredient.measure || [ingredient.amount, ingredient.unit].filter(Boolean).join(' ') || null,
      is_completed: false,
      added_by: currentUser.value.id,
      created_at: new Date().toISOString()
    }))
    if (!items.length) return false
    try {
      await getDb().commitSharedBatch('shopping_items', items.map(item => ({ id: item.id, insert: item })))
      if (partnership.value?.id !== pid) return false
      const known = new Set(shoppingItems.value.map(item => item.id))
      shoppingItems.value = [...items.filter(item => !known.has(item.id)), ...shoppingItems.value]
      saveToStorage('duonest_shopping', shoppingItems.value)
      options.triggerToast(`Dodano ${items.length} składników do listy zakupów`, { type: 'shopping' })
      return true
    } catch {
      notifyFailure()
      return false
    }
  }

  const refreshMeals = async () => {
    if (refreshMealsInFlight) return
    const pid = partnership.value?.id
    if (!pid) return
    refreshMealsInFlight = true
    try {
      const { data, error } = await getDb().from('meals').select('*').eq('partnership_id', pid).order('date', { ascending: true })
      if (!error && data && partnership.value?.id === pid) {
        mealsList.value = data
        syncMeals()
      }
    } finally {
      refreshMealsInFlight = false
    }
  }

  return { addMeal, updateMeal, toggleMealCompleted, deleteMeal, deleteSavedRecipe, addIngredientsToShopping, refreshMeals }
}
