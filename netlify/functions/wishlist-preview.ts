import {
  decodeHtmlEntities,
  formatSiteName,
  cleanProductTitle,
  isGenericTitle,
  isGenericLogo,
  formatSlugToTitle,
  extractTitleFromUrl
} from '../../utils/wishlistParser'

function extractMeta(html: string, nameOrProp: string): string | null {
  const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${nameOrProp}["'][^>]+content=["']([^"']*)["']`, 'i')
  const match1 = html.match(regex1)
  if (match1 && match1[1]) return decodeHtmlEntities(match1[1])

  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${nameOrProp}["']`, 'i')
  const match2 = html.match(regex2)
  if (match2 && match2[1]) return decodeHtmlEntities(match2[1])

  return null
}

function extractPriceFromHtml(html: string): { price: string | null; currency: string } {
  let price: string | null = null
  let currency = 'PLN'

  // 1. Ceneo specific: <span class="value">57</span><span class="penny">,16</span>
  const ceneoMatch = html.match(/<span class="value">\s*([0-9\s.]+)\s*<\/span>\s*<span class="penny">\s*([,0-9]+)\s*<\/span>/i)
  if (ceneoMatch && ceneoMatch[1]) {
    const full = `${ceneoMatch[1]}${ceneoMatch[2] || ''}`.replace(/\s+/g, '').replace(',', '.')
    if (full) return { price: full, currency: 'PLN' }
  }

  // 2. Microdata itemprop="price"
  const itempropPrice = html.match(/itemprop=["']price["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/content=["']([^"']+)["'][^>]+itemprop=["']price["']/i)
  const itempropCurrency = html.match(/itemprop=["']priceCurrency["'][^>]+content=["']([^"']+)["']/i) ||
                          html.match(/content=["']([^"']+)["'][^>]+itemprop=["']priceCurrency["']/i)
  if (itempropPrice && itempropPrice[1]) {
    price = itempropPrice[1].replace(',', '.').trim()
    if (itempropCurrency && itempropCurrency[1]) currency = itempropCurrency[1].toUpperCase().trim()
    return { price, currency }
  }

  // 3. OpenGraph / Product tags
  const ogPrice = extractMeta(html, 'product:price:amount') || extractMeta(html, 'price')
  const ogCurrency = extractMeta(html, 'product:price:currency') || extractMeta(html, 'currency')
  if (ogPrice) {
    price = ogPrice.replace(',', '.').trim()
    if (ogCurrency) currency = ogCurrency.toUpperCase().trim()
    return { price, currency }
  }

  // 4. JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1])
      const candidates = parsed['@graph'] && Array.isArray(parsed['@graph']) ? parsed['@graph'] : (Array.isArray(parsed) ? parsed : [parsed])
      for (const cand of candidates) {
        if (cand['@type'] === 'Product' || cand.offers) {
          const offer = Array.isArray(cand.offers) ? cand.offers[0] : cand.offers
          if (offer) {
            const p = offer.price || offer.lowPrice
            if (p !== undefined && p !== null) {
              price = String(p).replace(',', '.').trim()
              if (offer.priceCurrency) currency = String(offer.priceCurrency).toUpperCase().trim()
              return { price, currency }
            }
          }
        }
      }
    } catch (_) {}
  }

  // 5. Formatted embedded price in JSON
  const formattedMatch = html.match(/"(?:displayPrice|price)"[^{]*\{[^{]*"formatted":\s*"([^"]+)"/i) ||
                         html.match(/"formatted":\s*"([0-9\s.,]+)\s*(?:zł|PLN|€|EUR|\$|USD)?"/i) ||
                         html.match(/"price":\s*"([0-9.,]+)"/i) ||
                         html.match(/"price":\s*([0-9.]+)/i)
  if (formattedMatch && formattedMatch[1]) {
    const rawVal = formattedMatch[1].replace(/[^\d.,]/g, '').trim()
    if (rawVal) {
      price = rawVal.replace(',', '.')
      return { price, currency }
    }
  }

  // 6. Common CSS class price element
  const classPriceMatch = html.match(/<[a-z]+[^>]+class=["'][^"']*(?:total-price|product-price|current-price|price-wrapper|main-price)[^"']*["'][^>]*>\s*([0-9\s.,]+)\s*(zł|PLN|€|EUR|\$|USD)?\s*<\/[a-z]+>/i)
  if (classPriceMatch && classPriceMatch[1]) {
    const rawVal = classPriceMatch[1].replace(/[^\d.,]/g, '').trim()
    if (rawVal) {
      price = rawVal.replace(',', '.')
      if (classPriceMatch[2]) {
        const cur = classPriceMatch[2].toUpperCase()
        currency = (cur === 'ZŁ' || cur === 'PLN') ? 'PLN' : cur
      }
      return { price, currency }
    }
  }

  return { price, currency }
}

export async function processScrape(rawUrl: string) {
  if (!rawUrl || !rawUrl.trim()) {
    return {
      success: false,
      error: 'Brak podanego adresu URL'
    }
  }

  let targetUrl = rawUrl.trim()
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(targetUrl)
  } catch (err) {
    return {
      success: false,
      error: 'Niepoprawny format adresu URL'
    }
  }

  const siteDomain = parsedUrl.hostname.replace(/^www\./i, '')
  const friendlySiteName = formatSiteName(parsedUrl.hostname)

  try {
    const response = await fetch(parsedUrl.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()

    // 1. Title Extraction
    let rawTitle = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title')
    if (!rawTitle) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      if (h1Match && h1Match[1]) {
        rawTitle = h1Match[1].replace(/<[^>]+>/g, '').trim()
      }
    }
    if (!rawTitle) {
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleTagMatch && titleTagMatch[1]) {
        rawTitle = decodeHtmlEntities(titleTagMatch[1])
      }
    }

    let title = cleanProductTitle(rawTitle || '')
    const slugTitle = extractTitleFromUrl(parsedUrl)

    if (isGenericTitle(title) && slugTitle) {
      title = slugTitle
    } else if (slugTitle && slugTitle.length > (title || '').length && !title.includes(' ')) {
      title = slugTitle
    }

    // 2. Image Extraction
    let imageUrl =
      extractMeta(html, 'og:image:secure_url') ||
      extractMeta(html, 'og:image') ||
      extractMeta(html, 'og:image:url') ||
      extractMeta(html, 'twitter:image') ||
      extractMeta(html, 'twitter:image:src')

    if (imageUrl) {
      try {
        imageUrl = new URL(imageUrl, parsedUrl.href).href
      } catch (_) {}
      if (isGenericLogo(imageUrl)) {
        imageUrl = null
      }
    }

    // 3. Price & Currency Extraction
    const { price, currency } = extractPriceFromHtml(html)
    const siteName = extractMeta(html, 'og:site_name') || friendlySiteName

    return {
      success: true,
      data: {
        title: title || slugTitle || '',
        price: price || null,
        currency: currency || 'PLN',
        image_url: imageUrl || null,
        site_name: siteName,
        url: parsedUrl.href
      }
    }
  } catch (err: any) {
    const slugTitle = extractTitleFromUrl(parsedUrl)
    if (slugTitle) {
      return {
        success: true,
        data: {
          title: slugTitle,
          price: null,
          currency: 'PLN',
          image_url: null,
          site_name: friendlySiteName || siteDomain,
          url: parsedUrl.href
        },
        notice: `Rozpoznano przedmiot z ${friendlySiteName || 'linku'}! Uzupełnij cenę i zapisz marzenie ✨`
      }
    }

    return {
      success: false,
      error: 'Nie udało się automatycznie pobrać danych ze sklepu',
      fallback: {
        title: '',
        price: null,
        currency: 'PLN',
        image_url: null,
        site_name: friendlySiteName || siteDomain,
        url: parsedUrl.href
      }
    }
  }
}

// Netlify Functions v2 handler
export default async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    let urlParam = ''
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      urlParam = body?.url || ''
    } else {
      const parsed = new URL(req.url)
      urlParam = parsed.searchParams.get('url') || ''
    }

    const result = await processScrape(urlParam)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Server error' }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

// Netlify Functions v1 compatibility handler
export const handler = async (event: any) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  try {
    let urlParam = ''
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      urlParam = body?.url || ''
    } else {
      urlParam = event.queryStringParameters?.url || ''
    }

    const result = await processScrape(urlParam)
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message || 'Server error' })
    }
  }
}

