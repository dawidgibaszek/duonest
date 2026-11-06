import fs from 'node:fs'
import path from 'node:path'
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

const CANDIDATE_MODELS = [
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
]

function resolveGroqApiKey(): string {
  let key = (process.env.GROQ_API_KEY || '').trim()
  if (key) return key

  try {
    // @ts-ignore
    const config = useRuntimeConfig?.()
    key = (config?.groqApiKey || '').trim()
    if (key) return key
  } catch (_) {}

  // Local development direct .env fallback
  if (typeof process !== 'undefined') {
    try {
      const envPath = path.resolve(process.cwd(), '.env')
      if (fs.existsSync(envPath)) {
        const text = fs.readFileSync(envPath, 'utf8')
        const match = text.match(/^\s*GROQ_API_KEY\s*=\s*(.*)?$/m)
        if (match && match[1]) {
          return match[1].trim().replace(/^["']|["']$/g, '')
        }
      }
    } catch (_) {}
  }

  return ''
}

function resolveGroqModel(): string {
  let model = (process.env.GROQ_MODEL || '').trim()
  if (model) return model

  try {
    // @ts-ignore
    const config = useRuntimeConfig?.()
    model = (config?.groqModel || '').trim()
    if (model) return model
  } catch (_) {}

  if (typeof process !== 'undefined') {
    try {
      const envPath = path.resolve(process.cwd(), '.env')
      if (fs.existsSync(envPath)) {
        const text = fs.readFileSync(envPath, 'utf8')
        const match = text.match(/^\s*GROQ_MODEL\s*=\s*(.*)?$/m)
        if (match && match[1]) {
          return match[1].trim().replace(/^["']|["']$/g, '')
        }
      }
    } catch (_) {}
  }

  return 'qwen/qwen3.8-27b'
}

export async function formatRecipeWithGroq(scraped: ScrapedRecipeData): Promise<ScrapedRecipeData> {
  const apiKey = resolveGroqApiKey()
  if (!apiKey) {
    return scraped
  }

  const userModel = resolveGroqModel()
  const modelsToTry = Array.from(new Set([userModel, ...CANDIDATE_MODELS].filter(Boolean))).slice(0, 2)
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

    let parsed: any = null

    for (const model of modelsToTry) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4500)

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 3200,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `Jesteś profesjonalnym szefem kuchni i asystentem aplikacji kulinarnej DuoNest dla par.
Twoim celem jest przekształcenie surowego, zaimportowanego przepisu kulinarnego (lub opisu z TikToka/YouTube/bloga) w czytelny, uporządkowany i gotowy do gotowania przepis w języku polskim.

Zwróć WYŁĄCZNIE poprawny obiekt JSON o strukturze:
{
  "title": "Zwięzła, apetyczna nazwa potrawy (usuń nazwy blogów, serwisów, dopiski typu najlepszy przepis, #hashtagi)",
  "category": "Dokładnie jedna kategoria z listy: Śniadania, Makarony, Drób, Wołowina, Wieprzowina, Ryby, Wegetariańskie, Zupy, Desery, Szybkie dania, Kolacje, Obiad domowy",
  "ingredients": [
    "Ilość i nazwa składnika (np. 500 g piersi z kurczaka)",
    "Ilość i nazwa kolejnego składnika..."
  ],
  "instructionsSteps": [
    "Krótki i konkretny opis pierwszej czynności (bez przedrostka Krok 1)",
    "Krótki i konkretny opis kolejnej czynności...",
    "..."
  ],
  "instructions": "1. Pierwszy krok przygotowania...\\n\\n2. Drugi krok przygotowania...\\n\\n3. Trzeci krok przygotowania..."
}

Zasady formatowania:
1. Składniki (ingredients):
   - Każdy element na liście to czysty, precyzyjny składnik z miarą lub wagą na początku (np. '200 ml śmietanki 30%', '1 łyżeczka oregano', 'szczypta soli').
   - Jeśli składniki były sklejone w jeden ciąg, bezwzględnie rozbij je na osobne pozycje.
   - Usuń reklamy marek, odnośniki i zbędne uwagi.
2. Kroki przygotowania (instructionsSteps oraz instructions):
   - Podziel proces na 3 do 7 ponumerowanych, logicznych i chronologicznych kroków (np. przygotowanie/krojenie, smażenie/gotowanie, sos, łączenie składników, podanie).
   - W 'instructionsSteps' podaj czyste opisy czynności (bez 'Krok 1:' czy '1.').
   - W 'instructions' każdy krok MUSI być ponumerowany (1., 2., 3...) i oddzielony podwójnym znakiem nowej linii (\\n\\n).
   - Bezwzględnie usuń zwroty ze stron i social mediów: 'zaobserwuj profil', 'subskrybuj', 'link w bio', 'zostaw serduszko', hashtagi.
   - Styl: naturalny, profesjonalny, konkretny i przyjazny język polski.
3. Kategoria:
   - Wybierz dokładnie jedną najbardziej trafną kategorię z listy (np. makaron -> Makarony; ciasta/serniki -> Desery; omlety -> Śniadania).
4. Zachowaj wierność oryginalnym proporcjom składników.`
              },
              {
                role: 'user',
                content: JSON.stringify(promptPayload)
              }
            ]
          }),
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId))

        if (response.status === 404) {
          // Model not found or not available in current Groq account, fallback to next model
          console.warn(`[Groq AI] Model ${model} not available (404), trying fallback model...`)
          continue
        }

        if (!response.ok) {
          const errDetail = await response.text().catch(() => '')
          console.warn(`[Groq AI] Request returned status ${response.status} for model ${model}: ${errDetail}`)
          continue
        }

        const data = await response.json()
        const content = data?.choices?.[0]?.message?.content
        if (!content) {
          continue
        }

        try {
          parsed = JSON.parse(content)
        } catch (_) {
          const match = content.match(/\{[\s\S]*\}/)
          if (match) {
            parsed = JSON.parse(match[0])
          }
        }

        if (parsed && typeof parsed === 'object') {
          break
        }
      } catch (err: any) {
        console.warn(`[Groq AI] Attempt failed with model ${model}:`, err?.message || err)
        continue
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return scraped
    }

    let formattedTitle = scraped.title
    if (typeof parsed.title === 'string' && parsed.title.trim()) {
      formattedTitle = parsed.title
        .trim()
        .replace(/^["'„”«»]+|["'„”«»]+$/g, '')
        .replace(/#\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100)
    }

    let formattedCategory = scraped.category
    if (typeof parsed.category === 'string' && ALLOWED_CATEGORIES.includes(parsed.category.trim())) {
      formattedCategory = parsed.category.trim()
    } else if (typeof parsed.category === 'string') {
      const match = ALLOWED_CATEGORIES.find(
        (c) => c.toLowerCase() === parsed.category.trim().toLowerCase()
      )
      if (match) formattedCategory = match
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

    let formattedSteps: string[] = []
    if (Array.isArray(parsed.instructionsSteps) && parsed.instructionsSteps.length > 0) {
      formattedSteps = parsed.instructionsSteps
        .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
        .map((s: string) => s.replace(/^(?:krok\s*\d+[\s.:-]*|\d+[\s.:)-]+)\s*/i, '').trim())
        .filter((s: string) => s && s.length > 5)
    }

    // If steps weren't parsed properly but instructions was, split instructions into steps
    if (formattedSteps.length <= 1 && typeof parsed.instructions === 'string' && parsed.instructions.trim()) {
      const splitSteps = parsed.instructions
        .split(/(?:\r?\n)+|(?<=\.)\s*(?=\d+\.\s+)/)
        .map((s: string) => s.replace(/^(?:krok\s*\d+[\s.:-]*|\d+[\s.:)-]+)\s*/i, '').trim())
        .filter((s: string) => s && s.length > 5)

      if (splitSteps.length > 1) {
        formattedSteps = splitSteps
      }
    }

    if (formattedSteps.length === 0 && scraped.instructionsSteps && scraped.instructionsSteps.length > 0) {
      formattedSteps = scraped.instructionsSteps
        .map((s: string) => s.replace(/^(?:krok\s*\d+[\s.:-]*|\d+[\s.:)-]+)\s*/i, '').trim())
        .filter((s: string) => s && s.length > 5)
    }

    let formattedInstructions = ''
    if (formattedSteps.length > 0) {
      formattedInstructions = formattedSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n\n')
    } else if (typeof parsed.instructions === 'string' && parsed.instructions.trim()) {
      formattedInstructions = parsed.instructions.trim()
    } else {
      formattedInstructions = scraped.instructions || ''
    }

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
