import type { ScrapedRecipeData } from './recipeScraper'

const ALLOWED_CATEGORIES = [
  'Śniadania',
  'Makarony',
  'Drób',
  'Wołowina',
  'Wieprzowina',
  'Ryby',
  'Wegetariańskie',
  'Zupy',
  'Desery',
  'Szybkie dania',
  'Kolacje',
  'Obiad domowy'
]

export async function formatRecipeWithGroq(scraped: ScrapedRecipeData): Promise<ScrapedRecipeData> {
  const apiKey = (process.env.GROQ_API_KEY || '').trim()
  if (!apiKey) {
    return scraped
  }

  const model = (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim()
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions'

  try {
    const rawIngredients = (scraped.ingredients || []).map((i) => i.name).filter(Boolean)
    const rawInstructions = scraped.instructions || (scraped.instructionsSteps || []).join('\n') || ''

    const promptPayload = {
      title: scraped.title || '',
      category: scraped.category || '',
      ingredients: rawIngredients,
      instructions: rawInstructions,
      source: scraped.sourceName || ''
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Jesteś profesjonalnym kucharzem i asystentem aplikacji kulinarnej DuoNest dla par.
Twoim zadaniem jest uporządkowanie, oczyszczenie i ujednolicenie zaimportowanego przepisu kulinarnego w języku polskim.
Odpowiedz wyłącznie poprawnym obiektem JSON w formacie:
{
  "title": "Czysta, krótka i apetyczna nazwa potrawy (bez dopisków typu blog, serwis czy social media)",
  "category": "Dokładnie jedna kategoria z listy: Śniadania, Makarony, Drób, Wołowina, Wieprzowina, Ryby, Wegetariańskie, Zupy, Desery, Szybkie dania, Kolacje, Obiad domowy",
  "ingredients": ["składnik 1 z miarą lub wagą", "składnik 2..."],
  "instructionsSteps": ["Krok 1 przygotowania...", "Krok 2..."],
  "instructions": "Całość instrukcji przygotowania w czytelnych akapitach"
}

Zasady:
1. Składniki: każdy element na liście powinien być zwięzły i konkretny (np. '500 g piersi z kurczaka', '2 ząbki czosnku', '1 łyżka oliwy').
2. Przygotowanie: podziel na logiczne, czytelne kroki w języku polskim. Usuń hashtagi, prośby o subskrypcję, odnośniki do profili społecznościowych itp.
3. Kategoria: wybierz jedną z dozwolonych kategorii, która najlepiej pasuje do dania.
4. Zachowaj oryginalne proporcje i sens dania.`
          },
          {
            role: 'user',
            content: JSON.stringify(promptPayload)
          }
        ]
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId))

    if (!response.ok) {
      console.warn(`[Groq AI] Request returned status ${response.status}`)
      return scraped
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return scraped
    }

    let parsed: any = null
    try {
      parsed = JSON.parse(content)
    } catch (_) {
      const match = content.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return scraped
    }

    const formattedTitle = typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim().slice(0, 100)
      : scraped.title

    let formattedCategory = scraped.category
    if (typeof parsed.category === 'string' && ALLOWED_CATEGORIES.includes(parsed.category.trim())) {
      formattedCategory = parsed.category.trim()
    }

    let formattedIngredients = scraped.ingredients
    if (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) {
      const validIngs = parsed.ingredients
        .map((ing: any) => (typeof ing === 'string' ? ing.trim() : (ing?.name ? String(ing.name).trim() : '')))
        .filter((name: string) => name && name.length > 1 && name.length < 150)

      if (validIngs.length > 0) {
        formattedIngredients = validIngs.map((name: string) => ({ name }))
      }
    }

    let formattedSteps = scraped.instructionsSteps || []
    if (Array.isArray(parsed.instructionsSteps) && parsed.instructionsSteps.length > 0) {
      const validSteps = parsed.instructionsSteps
        .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
        .filter((s: string) => s && s.length > 5)

      if (validSteps.length > 0) {
        formattedSteps = validSteps
      }
    }

    const formattedInstructions = typeof parsed.instructions === 'string' && parsed.instructions.trim()
      ? parsed.instructions.trim()
      : (formattedSteps.length > 0 ? formattedSteps.join('\n\n') : scraped.instructions)

    return {
      ...scraped,
      title: formattedTitle,
      category: formattedCategory,
      ingredients: formattedIngredients,
      instructionsSteps: formattedSteps,
      instructions: formattedInstructions,
      aiFormatted: true
    }
  } catch (err: any) {
    // Fail-safe: if Groq is slow, unavailable, or errors out, continue with scraped recipe
    console.warn('[Groq AI] Recipe formatting bypassed:', err?.message || err)
    return scraped
  }
}
