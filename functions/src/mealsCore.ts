import { getMealCategoriesAndAreas, searchMealsCatalog, lookupMealById } from './meals'
import { processRecipeImport } from './recipeScraper'

export async function handleMealsCategories() {
  try {
    return getMealCategoriesAndAreas()
  } catch (err: any) {
    console.error('[Meals Categories Error]:', err?.message || err)
    return { categories: [], areas: [] }
  }
}

export async function handleMealsSearch(query: any) {
  const searchQuery = String(query.q || query.query || query.s || '').trim().slice(0, 80)
  const category = String(query.category || query.c || '').trim().slice(0, 40)
  const area = String(query.area || query.a || '').trim().slice(0, 40)
  const isRandom = query.random === 'true' || query.random === '1'

  const rawPage = parseInt(String(query.page || 1), 10)
  const pageNum = Number.isFinite(rawPage) ? Math.max(1, Math.min(rawPage, 1000)) : 1

  const rawLimit = parseInt(String(query.limit || 24), 10)
  const limitNum = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 60)) : 24

  return await searchMealsCatalog({
    searchQuery,
    category,
    area,
    isRandom,
    pageNum,
    limitNum
  })
}

export async function handleMealsLookup(query: any) {
  const id = String(query.id || query.i || '').trim()
  if (!id || !/^[a-zA-Z0-9_-]{1,30}$/.test(id)) {
    return { success: false, error: 'INVALID_ID', meal: null }
  }
  return await lookupMealById(id)
}

export async function handleMealsImport(body: any) {
  const rawUrl = String(body?.url || '').trim()
  if (!rawUrl) {
    return {
      success: false,
      error: 'Wklej poprawny link do przepisu, TikToka lub YouTube Shorts.'
    }
  }
  return await processRecipeImport(rawUrl)
}
