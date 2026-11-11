export function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .trim()
}

import { formatRecipeWithGroq } from './groqRecipeFormatter'
import { fetchPublicUrl } from './safeExternalFetch'

export interface ScrapedRecipeData {
  title: string
  category: string
  area?: string
  imageUrl?: string
  ingredients: Array<{ name: string; measure?: string }>
  instructions?: string
  instructionsSteps?: string[]
  recipeUrl: string
  source: 'import'
  sourceName?: string
  authorName?: string
  aiFormatted?: boolean
}

export function isPrivateHost(host: string): boolean {
  if (!host) return true
  host = host.toLowerCase().trim()

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '::'
  ) {
    return true
  }

  if (
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    host.endsWith('.localdomain') ||
    host.endsWith('.corp') ||
    host.endsWith('.home') ||
    host.endsWith('.lan')
  ) {
    return true
  }

  if (
    host === '169.254.169.254' ||
    host === 'metadata.google.internal' ||
    host === 'instance-data' ||
    host.includes('metadata')
  ) {
    return true
  }

  // Integer representation of IP
  if (/^\d+$/.test(host)) {
    const num = parseInt(host, 10)
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      const b1 = (num >>> 24) & 255
      const b2 = (num >>> 16) & 255
      if (b1 === 127 || b1 === 10 || b1 === 0) return true
      if (b1 === 169 && b2 === 254) return true
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return true
      if (b1 === 192 && b2 === 168) return true
    }
  }

  // IPv4 dotted notation
  const ipv4Parts = host.split('.')
  if (ipv4Parts.length === 4) {
    const parsedOctets = ipv4Parts.map(part => {
      if (part.startsWith('0x') || part.startsWith('0X')) return parseInt(part, 16)
      if (part.startsWith('0') && part.length > 1) return parseInt(part, 8)
      return parseInt(part, 10)
    })

    if (parsedOctets.every(o => !isNaN(o) && o >= 0 && o <= 255)) {
      const [oct1, oct2] = parsedOctets
      if (oct1 === 10) return true // 10.0.0.0/8
      if (oct1 === 127) return true // 127.0.0.0/8
      if (oct1 === 169 && oct2 === 254) return true // 169.254.0.0/16 Link-local
      if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true // 172.16.0.0/12
      if (oct1 === 192 && oct2 === 168) return true // 192.168.0.0/16
      if (oct1 === 0) return true // 0.0.0.0/8
    }
  }

  // IPv6
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true
    if (host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd')) return true
    if (host.startsWith('::ffff:')) {
      return isPrivateHost(host.replace('::ffff:', ''))
    }
  }

  return false
}

function detectRecipeCategory(title: string, rawCategory?: string): string {
  const t = `${title} ${rawCategory || ''}`.toLowerCase()
  if (t.includes('makaron') || t.includes('spaghetti') || t.includes('penne') || t.includes('pasta') || t.includes('lasagn')) return 'Makarony'
  if (t.includes('kurczak') || t.includes('drób') || t.includes('indyk') || t.includes('kaczka') || t.includes('skrzydełk')) return 'Drób'
  if (t.includes('wołowin') || t.includes('stek') || t.includes('burger') || t.includes('bolognese') || t.includes('gulasz')) return 'Wołowina'
  if (t.includes('schab') || t.includes('wieprz') || t.includes('boczek') || t.includes('żeberk')) return 'Wieprzowina'
  if (t.includes('ryb') || t.includes('łosoś') || t.includes('dorsz') || t.includes('krewetk') || t.includes('tuńczyk') || t.includes('owoce morza')) return 'Ryby'
  if (t.includes('wege') || t.includes('tofu') || t.includes('ciecierzyc') || t.includes('soczewic') || t.includes('hummus')) return 'Wegetariańskie'
  if (t.includes('zupa') || t.includes('rosół') || t.includes('krem z') || t.includes('barszcz') || t.includes('pomidorow') || t.includes('żurek')) return 'Zupy'
  if (t.includes('śniadani') || t.includes('omlet') || t.includes('jajeczn') || t.includes('pancake') || t.includes('owsiank') || t.includes('szakszuk')) return 'Śniadania'
  if (t.includes('ciasto') || t.includes('deser') || t.includes('tarta') || t.includes('sernik') || t.includes('babeczk') || t.includes('słodk')) return 'Desery'
  return rawCategory || 'Obiad domowy'
}

function extractMetaTag(html: string, nameOrProp: string): string | null {
  const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${nameOrProp}["'][^>]+content=["']([^"']*)["']`, 'i')
  const match1 = html.match(regex1)
  if (match1 && match1[1]) return decodeHtmlEntities(match1[1])

  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${nameOrProp}["']`, 'i')
  const match2 = html.match(regex2)
  if (match2 && match2[1]) return decodeHtmlEntities(match2[1])

  return null
}

function parseIngredientsFromText(text: string): Array<{ name: string }> {
  if (!text) return []
  const lines = text.split(/\r?\n+/).map(l => l.trim()).filter(Boolean)
  const results: Array<{ name: string }> = []
  let foundSection = false

  for (const line of lines) {
    const lLower = line.toLowerCase()
    if (lLower.includes('składnik') || lLower.includes('ingredients:')) {
      foundSection = true
      continue
    }

    if (foundSection) {
      if (lLower.includes('przygotowanie') || lLower.includes('instrukcj') || lLower.includes('sposób') || lLower.includes('krok:')) {
        break
      }
      const clean = line.replace(/^[•\-*–—\d.)\s]+/, '').trim()
      if (clean && clean.length > 2 && clean.length < 120) {
        results.push({ name: clean })
      }
    } else {
      if (/^[•\-*–—]\s+/.test(line)) {
        const clean = line.replace(/^[•\-*–—\s]+/, '').trim()
        if (clean && clean.length > 2 && clean.length < 120) {
          results.push({ name: clean })
        }
      }
    }
  }

  return results
}

function cleanRecipeTitle(raw: string): string {
  if (!raw) return ''
  return decodeHtmlEntities(raw)
    .replace(/\s*[-–—|]\s*(Kwestia Smaku|Ania Gotuje|Przepisy\.pl|Smaker|Moje Wypieki|Allrecipes|BBC Good Food|TikTok).*$/i, '')
    .replace(/#\S+/g, '') // remove hashtags
    .replace(/\s+/g, ' ')
    .trim()
}

// -------------------------------------------------------------
// TIKTOK SCRAPER (TikWM + TikTok oEmbed + OpenGraph fallback)
// -------------------------------------------------------------
async function scrapeTikTok(targetUrl: string): Promise<ScrapedRecipeData> {
  let title = ''
  let description = ''
  let coverUrl = ''
  let authorName = ''

  // 1. Primary: TikWM public API
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(6000)
    })

    if (res.ok) {
      const json = await res.json()
      if (json && json.data) {
        const rawTitle = json.data.title || ''
        description = rawTitle.trim()
        coverUrl = json.data.cover || json.data.origin_cover || json.data.dynamic_cover || ''
        authorName = json.data.author?.nickname || json.data.author?.unique_id || ''

        // Format clean title from first sentence/line or hashtags
        const firstLine = rawTitle.split(/\r?\n+/)[0] || rawTitle
        title = cleanRecipeTitle(firstLine).slice(0, 90)
        if (!title && rawTitle) {
          title = rawTitle.slice(0, 90)
        }
      }
    }
  } catch (_) {}

  // 2. Fallback: TikTok oEmbed endpoint
  if (!title || !coverUrl) {
    try {
      const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`, {
        signal: AbortSignal.timeout(5000)
      })
      if (oembedRes.ok) {
        const odata = await oembedRes.json()
        if (odata.title && !title) {
          title = cleanRecipeTitle(odata.title.split(/\r?\n+/)[0] || odata.title).slice(0, 90)
          if (!description) description = odata.title.trim()
        }
        if (odata.thumbnail_url && !coverUrl) {
          coverUrl = odata.thumbnail_url
        }
        if (odata.author_name && !authorName) {
          authorName = odata.author_name
        }
      }
    } catch (_) {}
  }

  // Final fallbacks if video was extremely minimal
  if (!title) {
    try {
      const parsed = new URL(targetUrl)
      const segments = parsed.pathname.split('/').filter(Boolean)
      const userSeg = segments.find(s => s.startsWith('@'))
      title = userSeg ? `Przepis z TikToka (${userSeg})` : 'Przepis z TikToka'
    } catch (_) {
      title = 'Przepis z TikToka'
    }
  }

  const ingredients = parseIngredientsFromText(description)
  const category = detectRecipeCategory(title, 'Danie z TikToka')

  return {
    title: title || 'Przepis z TikToka',
    category,
    imageUrl: coverUrl || undefined,
    ingredients,
    instructions: description || 'Obejrzyj wideo na TikToku, aby zobaczyć przygotowanie krok po kroku.',
    instructionsSteps: description ? description.split(/\r?\n+/).map(s => s.trim()).filter(Boolean) : [],
    recipeUrl: targetUrl,
    source: 'import',
    sourceName: authorName ? `TikTok (@${authorName})` : 'TikTok',
    authorName: authorName || undefined
  }
}

// -------------------------------------------------------------
// YOUTUBE & YOUTUBE SHORTS SCRAPER
// -------------------------------------------------------------
async function scrapeYouTube(targetUrl: string): Promise<ScrapedRecipeData> {
  const isShorts = targetUrl.includes('/shorts/') || targetUrl.includes('shorts/')
  let title = ''
  let authorName = ''
  let imageUrl = ''
  let description = ''

  // 1. Try YouTube oEmbed (fast, official endpoint)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const data = await res.json()
      title = cleanRecipeTitle(data.title || '').slice(0, 100)
      if (data.author_name) authorName = data.author_name
      if (data.thumbnail_url) imageUrl = data.thumbnail_url
    }
  } catch (_) {}

  // 2. Fetch the YouTube/Shorts HTML page for rich description (where recipes and ingredients are written)
  try {
    const pageRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(6000)
    })

    if (pageRes.ok) {
      const html = await pageRes.text()
      if (!title) {
        const ogTitle = extractMetaTag(html, 'og:title')
        if (ogTitle) title = cleanRecipeTitle(ogTitle).slice(0, 100)
      }
      if (!imageUrl) {
        imageUrl = extractMetaTag(html, 'og:image') || ''
      }
      const ogDesc = extractMetaTag(html, 'og:description') || extractMetaTag(html, 'description')
      if (ogDesc) {
        description = ogDesc.trim()
      }

      // Extract full description from ytInitialData if present (often contains full ingredients list)
      const initialDataMatch = html.match(/ytInitialData\s*=\s*({[\s\S]+?});<\/script>/)
      if (initialDataMatch && initialDataMatch[1]) {
        try {
          const ytData = JSON.parse(initialDataMatch[1])
          const videoDesc = ytData?.engagementPanels?.find((p: any) => p?.engagementPanelSectionListRenderer?.panelIdentifier === 'engagement-panel-structured-description')
            ?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items
            ?.find((it: any) => it?.expandableVideoDescriptionBodyRenderer)?.expandableVideoDescriptionBodyRenderer?.descriptionBodyText?.runs
            ?.map((r: any) => r?.text).join('') || ''

          if (videoDesc && videoDesc.length > description.length) {
            description = videoDesc.trim()
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  if (!title) {
    title = isShorts ? 'Przepis z YouTube Shorts' : 'Przepis z YouTube'
  }

  // Parse ingredients if provided in description
  const ingredients = parseIngredientsFromText(description)
  const category = detectRecipeCategory(title, 'Obiad domowy')

  const instructions = description
    ? description
    : `Obejrzyj wideo na ${isShorts ? 'YouTube Shorts' : 'YouTube'}, aby zobaczyć przygotowanie krok po kroku.`

  const instructionsSteps = description
    ? description.split(/\r?\n+/).map(s => s.trim()).filter(Boolean)
    : [`Obejrzyj wideo na ${isShorts ? 'YouTube Shorts' : 'YouTube'}: ${title}`]

  const sourceName = isShorts
    ? (authorName ? `YouTube Shorts (${authorName})` : 'YouTube Shorts')
    : (authorName ? `YouTube (${authorName})` : 'YouTube')

  return {
    title,
    category,
    imageUrl: imageUrl || undefined,
    ingredients,
    instructions,
    instructionsSteps,
    recipeUrl: targetUrl,
    source: 'import',
    sourceName,
    authorName: authorName || undefined
  }
}

// -------------------------------------------------------------
// REGULAR RECIPE WEBSITES SCRAPER (JSON-LD + Microdata + OpenGraph)
// -------------------------------------------------------------
async function scrapeRecipeWebsite(targetUrl: string): Promise<ScrapedRecipeData> {
  let currentUrl = targetUrl
  let redirectCount = 0
  let response: Response | null = null

  // Safe redirect-following loop with per-hop SSRF validation
  while (redirectCount <= 4) {
    const res = await fetchPublicUrl(currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Upgrade-Insecure-Requests': '1'
      },
      timeoutMs: 8000,
      maxBytes: 1_500_000
    })

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) break
      const nextUrl = new URL(location, currentUrl)
      if (!['http:', 'https:'].includes(nextUrl.protocol) || isPrivateHost(nextUrl.hostname)) {
        throw new Error('Niedozwolony cel przekierowania ze względów bezpieczeństwa.')
      }
      currentUrl = nextUrl.href
      redirectCount++
      continue
    }

    response = res
    break
  }

  if (!response || !response.ok) {
    throw new Error(`Strona zwróciła błąd HTTP ${response?.status || 500}`)
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error('Adres nie prowadzi do strony HTML.')
  }

  // Limit read size to 1.5MB to prevent memory exhaustion while retaining full markup
  const rawText = await response.text()
  const html = rawText.slice(0, 1_500_000)

  const parsedUrl = new URL(currentUrl)
  const siteDomain = parsedUrl.hostname.replace(/^www\./i, '')
  let sourceName = extractMetaTag(html, 'og:site_name') || siteDomain

  let title = ''
  let category = ''
  let area = ''
  let imageUrl = ''
  const ingredients: Array<{ name: string; measure?: string }> = []
  const instructionsSteps: string[] = []

  // 1. JSON-LD Recipe Extraction
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1].trim())
      const items = parsed['@graph'] && Array.isArray(parsed['@graph'])
        ? parsed['@graph']
        : (Array.isArray(parsed) ? parsed : [parsed])

      const r = items.find(it => it && (it['@type'] === 'Recipe' || (Array.isArray(it['@type']) && it['@type'].includes('Recipe'))))
      if (r) {
        if (r.name && !title) title = cleanRecipeTitle(r.name)
        if (r.recipeCategory) {
          category = Array.isArray(r.recipeCategory) ? r.recipeCategory[0] : String(r.recipeCategory)
        }
        if (r.recipeCuisine) {
          area = Array.isArray(r.recipeCuisine) ? r.recipeCuisine[0] : String(r.recipeCuisine)
        }

        // Image
        if (!imageUrl) {
          if (typeof r.image === 'string') imageUrl = r.image
          else if (Array.isArray(r.image) && r.image.length > 0) {
            imageUrl = typeof r.image[0] === 'string' ? r.image[0] : (r.image[0]?.url || '')
          } else if (r.image?.url) {
            imageUrl = r.image.url
          }
        }

        // Ingredients
        if (Array.isArray(r.recipeIngredient)) {
          for (const item of r.recipeIngredient) {
            if (typeof item === 'string' && item.trim()) {
              ingredients.push({ name: decodeHtmlEntities(item.trim()) })
            }
          }
        }

        // Instructions
        if (r.recipeInstructions) {
          if (typeof r.recipeInstructions === 'string') {
            const steps = r.recipeInstructions.split(/\r?\n+/).map((s: string) => s.trim()).filter(Boolean)
            instructionsSteps.push(...steps)
          } else if (Array.isArray(r.recipeInstructions)) {
            for (const step of r.recipeInstructions) {
              if (typeof step === 'string') {
                instructionsSteps.push(decodeHtmlEntities(step.trim()))
              } else if (step && typeof step === 'object') {
                const text = step.text || step.name || ''
                if (text && typeof text === 'string') {
                  instructionsSteps.push(decodeHtmlEntities(text.trim()))
                } else if (Array.isArray(step.itemListElement)) {
                  for (const sub of step.itemListElement) {
                    if (sub && sub.text) instructionsSteps.push(decodeHtmlEntities(sub.text.trim()))
                  }
                }
              }
            }
          }
        }

        break
      }
    } catch (_) {}
  }

  // 2. Microdata fallback for ingredients / instructions
  if (ingredients.length === 0) {
    const microIngredientMatches = html.matchAll(/itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/[a-z0-9]+>/gi)
    for (const match of microIngredientMatches) {
      if (match && match[1]) {
        const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text && text.length > 1 && text.length < 150) {
          ingredients.push({ name: decodeHtmlEntities(text) })
        }
      }
    }
  }

  // 2b. Structural HTML fallback for ingredients (e.g. Kwestia Smaku, Moje Wypieki, WordPress food blogs)
  if (ingredients.length === 0) {
    const ingContainerRegex = /<div[^>]*class=["'][^"']*(?:field-name-field-skladniki|group-skladniki|recipe-ingredients|wprm-recipe-ingredients|skladniki-list|ingredients-list)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
    let containerMatch
    while ((containerMatch = ingContainerRegex.exec(html)) !== null) {
      const liMatches = containerMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)
      for (const li of liMatches) {
        const clean = decodeHtmlEntities(li[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        if (clean && clean.length > 1 && clean.length < 150) {
          ingredients.push({ name: clean })
        }
      }
    }

    if (ingredients.length === 0) {
      const articleMatch = html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i)
      let articleContent = articleMatch ? articleMatch[1] : html
      const commentsIdx = articleContent.search(/<(?:div|section)[^>]+id=["']comments["']/i)
      if (commentsIdx !== -1) {
        articleContent = articleContent.slice(0, commentsIdx)
      }

      const headingSections = [...articleContent.matchAll(/<h([2-5])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[2-5]|$)/gi)]
      for (const hSec of headingSections) {
        const headingText = hSec[2].replace(/<[^>]+>/g, '').toLowerCase()
        const content = hSec[3]

        if (/składnik|skladnik|ciasto|nadzienie|polewa|krem|dodatki|ponadto|spód|wierzch|ingredient/.test(headingText)) {
          const liMatches = content.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)
          for (const li of liMatches) {
            const clean = decodeHtmlEntities(li[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
            if (clean && clean.length > 1 && clean.length < 150) {
              ingredients.push({ name: clean })
            }
          }

          if (instructionsSteps.length === 0) {
            const pMatches = content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)
            for (const p of pMatches) {
              const clean = decodeHtmlEntities(p[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
              if (clean && clean.length > 40 && !clean.toLowerCase().includes('źródło przepisu')) {
                instructionsSteps.push(clean)
              }
            }
          }
        }
      }
    }
  }

  // 3. OpenGraph / Meta tags fallback
  if (!title) {
    const ogTitle = extractMetaTag(html, 'og:title') || extractMetaTag(html, 'twitter:title')
    if (ogTitle) {
      title = cleanRecipeTitle(ogTitle)
    } else {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      if (h1Match && h1Match[1]) {
        title = cleanRecipeTitle(h1Match[1].replace(/<[^>]+>/g, '').trim())
      } else {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch && titleMatch[1]) {
          title = cleanRecipeTitle(titleMatch[1].trim())
        }
      }
    }
  }

  if (!imageUrl) {
    imageUrl = extractMetaTag(html, 'og:image:secure_url') ||
               extractMetaTag(html, 'og:image') ||
               extractMetaTag(html, 'twitter:image') || ''
  }

  // Structural HTML fallback for preparation steps (e.g. Kwestia Smaku, Moje Wypieki, WordPress food blogs)
  if (instructionsSteps.length === 0) {
    const prepContainerRegex = /<div[^>]*class=["'][^"']*(?:field-name-field-przygotowanie|recipe-instructions|wprm-recipe-instructions|sposob-przygotowania|instructions-list)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
    let prepMatch
    while ((prepMatch = prepContainerRegex.exec(html)) !== null) {
      const liMatches = prepMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)
      for (const li of liMatches) {
        const clean = decodeHtmlEntities(li[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        if (clean && clean.length > 5) {
          instructionsSteps.push(clean)
        }
      }
      if (instructionsSteps.length === 0) {
        const pMatches = prepMatch[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)
        for (const p of pMatches) {
          const clean = decodeHtmlEntities(p[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          if (clean && clean.length > 10) {
            instructionsSteps.push(clean)
          }
        }
      }
    }

    if (instructionsSteps.length === 0) {
      const articleMatch = html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i)
      let articleContent = articleMatch ? articleMatch[1] : html
      const commentsIdx = articleContent.search(/<(?:div|section)[^>]+id=["']comments["']/i)
      if (commentsIdx !== -1) {
        articleContent = articleContent.slice(0, commentsIdx)
      }

      const prepHeadings = articleContent.matchAll(/<h([2-5])[^>]*>([\s\S]*?(?:przygotowanie|wykonanie|sposób|sposob|instrukcj|direction)[\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[2-5]|$)/gi)
      for (const hSec of prepHeadings) {
        const content = hSec[3]
        const items = content.matchAll(/<(?:p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)
        for (const it of items) {
          const clean = decodeHtmlEntities(it[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          if (clean && clean.length > 15) {
            instructionsSteps.push(clean)
          }
        }
      }
    }

    // Microdata itemprop="recipeInstructions" (e.g. Ania Gotuje and schema.org markup)
    if (instructionsSteps.length === 0) {
      const instContainerMatch = html.match(/itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/div>\s*(?:<div class=["']article-content-end|<footer|<\/article|<\/main|$)/i) ||
                                 html.match(/<[^>]+itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/(?:div|section|article)>/i)
      if (instContainerMatch && instContainerMatch[1]) {
        const pMatches = instContainerMatch[1].matchAll(/<(?:p|li)[^>]*>([\s\S]*?)<\/(?:p|li)>/gi)
        for (const p of pMatches) {
          const clean = decodeHtmlEntities(p[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          if (clean.length > 20 && !clean.toLowerCase().includes('źródło przepisu') && !clean.toLowerCase().includes('komentarze')) {
            instructionsSteps.push(clean)
          }
        }
      }
    }
  }

  if (instructionsSteps.length === 0) {
    const ogDesc = extractMetaTag(html, 'og:description') ||
                   extractMetaTag(html, 'twitter:description') ||
                   extractMetaTag(html, 'description')
    if (ogDesc) {
      instructionsSteps.push(decodeHtmlEntities(ogDesc.trim()))
    }
  }

  // Format final category
  category = detectRecipeCategory(title, category)

  return {
    title: title || 'Zaimportowany przepis',
    category,
    area: area || undefined,
    imageUrl: imageUrl || undefined,
    ingredients,
    instructions: instructionsSteps.join('\n\n'),
    instructionsSteps,
    recipeUrl: currentUrl,
    source: 'import',
    sourceName
  }
}

// -------------------------------------------------------------
// MAIN ENTRYPOINT: processRecipeImport
// -------------------------------------------------------------
export async function processRecipeImport(rawUrl: string): Promise<{
  success: boolean
  recipe?: ScrapedRecipeData
  error?: string
}> {
  if (!rawUrl || !rawUrl.trim()) {
    return { success: false, error: 'Wklej link do przepisu, TikToka lub YouTube Shorts.' }
  }

  let targetUrl = rawUrl.trim()
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch (_) {
    return { success: false, error: 'Niepoprawny format adresu URL. Upewnij się, że link jest poprawny.' }
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { success: false, error: 'Dozwolone są wyłącznie adresy stron internetowych (HTTP / HTTPS).' }
  }

  if (isPrivateHost(parsedUrl.hostname)) {
    return { success: false, error: 'Podany adres URL jest niedozwolony ze względów bezpieczeństwa.' }
  }

  const hostname = parsedUrl.hostname.toLowerCase()

  try {
    let recipe: ScrapedRecipeData

    // 1. TikTok
    if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
      recipe = await scrapeTikTok(parsedUrl.href)
    } else if (
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com') ||
      hostname === 'youtu.be'
    ) {
      // 2. YouTube & YouTube Shorts
      recipe = await scrapeYouTube(parsedUrl.href)
    } else {
      // 3. Regular recipe site
      recipe = await scrapeRecipeWebsite(parsedUrl.href)
    }

    // 4. AI formatting via Groq (graceful fallback if Groq is unconfigured or unavailable)
    if (recipe) {
      recipe = await formatRecipeWithGroq(recipe)
    }

    return { success: true, recipe }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Nie udało się pobrać danych z tego linku. Możesz dodać przepis ręcznie.'
    }
  }
}

