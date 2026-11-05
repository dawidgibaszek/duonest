import { defineEventHandler, getQuery } from 'h3'
import {
  getAllMealsCatalog,
  normalizeMealDbItem,
  translateRecipeInstructionsAsync
} from '../../utils/meals'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.id || query.i || '').trim()

  if (!id) {
    return { success: false, error: 'MISSING_ID', meal: null }
  }

  try {
    // 1. First check our pre-compiled rich catalog (instant response with full ingredients & steps)
    const catalog = await getAllMealsCatalog()
    const foundInCatalog = catalog.find(m => String(m.id) === id)
    if (foundInCatalog) {
      const isEn = /\b(the|and|with|heat|oven|into|minutes)\b/i.test(foundInCatalog.instructions || '')
      if (isEn && !foundInCatalog.instructionsPl) {
        try {
          const transResult = await translateRecipeInstructionsAsync(foundInCatalog.instructions)
          if (transResult.instructionsPl) {
            foundInCatalog.instructions = transResult.instructionsPl
            foundInCatalog.instructionsPl = transResult.instructionsPl
            foundInCatalog.instructionsSteps = transResult.stepsPl
            foundInCatalog.instructionsStepsPl = transResult.stepsPl
          }
        } catch (_) {}
      }
      return { success: true, meal: foundInCatalog }
    }

    // 2. Fallback to live TheMealDB API if ID is not in static catalog
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

    // Translate instructions to Polish
    try {
      const transResult = await translateRecipeInstructionsAsync(meal.instructions)
      if (transResult.instructionsPl) {
        meal.instructions = transResult.instructionsPl
        meal.instructionsSteps = transResult.stepsPl
      }
    } catch (_) {}

    return { success: true, meal }
  } catch (err: any) {
    return { success: false, error: err?.message || 'SERVER_ERROR', meal: null }
  }
})
