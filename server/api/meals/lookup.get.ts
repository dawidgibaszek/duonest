import { defineEventHandler, getQuery } from 'h3'
import {
  normalizeMealDbItem,
  translateRecipeInstructionsAsync,
  translateTextToPolish
} from '../../utils/meals'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.id || query.i || '').trim()

  if (!id) {
    return { success: false, error: 'MISSING_ID', meal: null }
  }

  try {
    const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!response.ok) {
      return { success: false, error: `HTTP_${response.status}`, meal: null }
    }

    const data = await response.json()
    const rawMeals = Array.isArray(data?.meals) ? data.meals : []
    if (rawMeals.length === 0) {
      return { success: false, error: 'NOT_FOUND', meal: null }
    }

    const meal = normalizeMealDbItem(rawMeals[0])

    // Translate instructions & title to Polish
    try {
      const [transResult, transTitle] = await Promise.all([
        translateRecipeInstructionsAsync(meal.instructions),
        translateTextToPolish(meal.title)
      ])
      if (transResult.instructionsPl) {
        meal.instructions = transResult.instructionsPl
        meal.instructionsSteps = transResult.stepsPl
      }
      if (transTitle && transTitle.length > 2) {
        meal.titlePl = transTitle
      }
    } catch (_) {}

    return { success: true, meal }
  } catch (err: any) {
    return { success: false, error: err?.message || 'SERVER_ERROR', meal: null }
  }
})
