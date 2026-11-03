import { defineEventHandler, readBody } from 'h3'

function decodeHtmlEntities(str: string): string {
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

function extractMeta(html: string, nameOrProp: string): string | null {
  const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${nameOrProp}["'][^>]+content=["']([^"']*)["']`, 'i')
  const match1 = html.match(regex1)
  if (match1 && match1[1]) return decodeHtmlEntities(match1[1])

  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${nameOrProp}["']`, 'i')
  const match2 = html.match(regex2)
  if (match2 && match2[1]) return decodeHtmlEntities(match2[1])

  return null
}

function formatSiteName(hostname: string): string {
  const clean = hostname.replace(/^www\./i, '').toLowerCase()
  const map: Record<string, string> = {
    'allegro': 'Allegro',
    'ceneo': 'Ceneo',
    'amazon': 'Amazon',
    'zalando': 'Zalando',
    'ebay': 'eBay',
    'ikea': 'IKEA',
    'empik': 'Empik',
    'mediaexpert': 'Media Expert',
    'mediamarkt': 'Media Markt',
    'euro.com.pl': 'RTV Euro AGD',
    'x-kom': 'x-kom',
    'morele': 'Morele',
    'komputronik': 'Komputronik',
    'aliexpress': 'AliExpress',
    'notino': 'Notino',
    'sephora': 'Sephora',
    'douglas': 'Douglas',
    'zara': 'Zara',
    'hm.com': 'H&M',
    'reserved': 'Reserved',
    'sinsay': 'Sinsay',
    'cropp': 'Cropp',
    'housebrand': 'House',
    'mohito': 'Mohito',
    'answear': 'Answear',
    'eobuwie': 'eobuwie',
    'modivo': 'Modivo',
    'ccc.eu': 'CCC',
    'decathlon': 'Decathlon',
    'castorama': 'Castorama',
    'leroymerlin': 'Leroy Merlin',
    'obi.pl': 'OBI',
    'jysk': 'Jysk',
    'pepco': 'Pepco',
    'action': 'Action',
    'smyk': 'Smyk',
    'vinted': 'Vinted',
    'temu': 'Temu',
    'shein': 'Shein',
    'apple.com': 'Apple'
  }

  for (const [key, val] of Object.entries(map)) {
    if (clean.includes(key)) return val
  }

  const parts = clean.split('.')
  if (parts.length > 0 && parts[0]) {
    const raw = parts[0].replace(/[-_]/g, ' ')
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }
  return clean
}

function cleanProductTitle(rawTitle: string): string {
  if (!rawTitle) return ''
  let title = decodeHtmlEntities(rawTitle).trim()

  // Remove common store, opinions and SEO postfixes
  title = title
    .replace(/\s*[-–|•:]\s*(?:Opinie\s+i\s+ceny\s+na\s+|Ceny\s+i\s+opinie\s+na\s+|Opinie\s+na\s+|Ceny\s+na\s+|Sklep\s+|Kup\s+teraz\s+w\s+)?[A-Z0-9.\-_ ]*(?:\.(?:pl|com|de|eu|org|net)|Ceneo|Allegro|Amazon|Zalando|Empik|IKEA|Media Expert|Media Markt|RTV EURO AGD|Komputronik|x-kom|Morele|Castorama|Leroy Merlin|Obi|Lidl|Biedronka|Smyk|eobuwie|Modivo|Answear|Reserved|House|Cropp|Sinsay|Mohito|CCC|Decathlon)[\s\S]*$/i, '')
    .replace(/\s*[-–|•]\s*(?:Ceneo|Allegro|Amazon|Zalando|Empik|IKEA|Media Expert|RTV Euro AGD|x-kom)[\s\S]*$/i, '')
    .trim()

  return title
}

function isGenericTitle(title: string | null): boolean {
  if (!title || title.length < 3) return true
  const lower = title.toLowerCase().trim()
  if (['produkty', 'sklep', 'home', 'strona główna', 'allegro.pl', 'allegro', 'ceneo.pl', 'ceneo', 'zalando.pl', 'empik.com', 'ikea', 'media expert'].includes(lower)) return true
  if (lower.includes('10 000 000 produktów') || lower.includes('dostawa za 0 zł') || lower.includes('wyszukiwarka') || lower.includes('szukaj')) return true
  if (lower.startsWith('sklep internetowy') || lower.startsWith('kupuj online') || lower.startsWith('zaloguj się')) return true
  return false
}

function isGenericLogo(url: string | null): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return lower.includes('logo-for-fb') || lower.includes('socialmediaimage') || lower.includes('favicon') || lower.includes('/logo.') || lower.includes('default-image')
}

function formatSlugToTitle(slug: string): string {
  const specialMap: Record<string, string> = {
    'iphone': 'iPhone',
    'ipad': 'iPad',
    'imac': 'iMac',
    'ipod': 'iPod',
    'ios': 'iOS',
    'esim': 'eSIM',
    '5g': '5G',
    '4g': '4G',
    '3g': '3G',
    'lte': 'LTE',
    'gb': 'GB',
    'tb': 'TB',
    'mb': 'MB',
    'ram': 'RAM',
    'ssd': 'SSD',
    'hdd': 'HDD',
    'pro': 'Pro',
    'max': 'Max',
    'mini': 'Mini',
    'ultra': 'Ultra',
    'plus': 'Plus',
    'se': 'SE',
    'oled': 'OLED',
    'led': 'LED',
    'qled': 'QLED',
    '4k': '4K',
    '8k': '8K',
    'hd': 'HD',
    'fhd': 'FHD',
    'uhd': 'UHD',
    'usb': 'USB',
    'usbc': 'USB-C',
    'usb-c': 'USB-C',
    'bt': 'Bluetooth',
    'bluetooth': 'Bluetooth',
    'wifi': 'Wi-Fi',
    'wi-fi': 'Wi-Fi',
    'ps4': 'PS4',
    'ps5': 'PS5',
    'xbox': 'Xbox',
    'lego': 'LEGO',
    'apple': 'Apple',
    'samsung': 'Samsung',
    'xiaomi': 'Xiaomi',
    'sony': 'Sony',
    'nike': 'Nike',
    'adidas': 'Adidas',
    'smartfon': 'Smartfon',
    'wiedzmin': 'Wiedźmin'
  }

  // Preserve hyphen between digits (e.g. 1-8 -> 1-8)
  const safeSlug = slug.replace(/(\d+)-(\d+)/g, '$1§$2')
  const words = safeSlug.split(/[-_+]+/).filter(Boolean)

  const formatted = words.map((rawWord) => {
    const w = rawWord.replace(/§/g, '-')
    const lower = w.toLowerCase()
    if (specialMap[lower]) {
      return specialMap[lower]
    }
    const matchSize = lower.match(/^(\d+)(gb|tb|mb)$/)
    if (matchSize && matchSize[1] && matchSize[2]) {
      return `${matchSize[1]} ${matchSize[2].toUpperCase()}`
    }
    const matchHz = lower.match(/^(\d+)(hz|khz|mhz|ghz)$/)
    if (matchHz && matchHz[1]) {
      return `${matchHz[1]}Hz`
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })

  return formatted.join(' ').trim()
}

function extractTitleFromUrl(parsedUrl: URL): string | null {
  const pathname = decodeURIComponent(parsedUrl.pathname)
  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '')
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  // 1. Allegro: /produkt/<slug>-<uuid> or /oferta/<slug>-<id>
  if (hostname.includes('allegro')) {
    for (const seg of segments) {
      if (seg === 'produkt' || seg === 'oferta') continue
      let slug = seg.replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, '')
      slug = slug.replace(/-\d{8,}$/, '')
      if (slug.length > 3) {
        return formatSlugToTitle(slug)
      }
    }
  }

  // 2. Amazon: /<slug>/dp/<id>
  if (hostname.includes('amazon')) {
    const dpIdx = segments.indexOf('dp')
    if (dpIdx > 0 && segments[dpIdx - 1]) {
      return formatSlugToTitle(segments[dpIdx - 1])
    }
  }

  // 3. Zalando: /<slug>-<sku>.html
  if (hostname.includes('zalando')) {
    const last = segments[segments.length - 1] || ''
    let cleanLast = last.replace(/\.html?$/i, '')
    cleanLast = cleanLast.replace(/-[a-z0-9]{8,15}-[a-z0-9]{2,5}$/i, '')
    cleanLast = cleanLast.replace(/-[a-z0-9]{9,15}$/i, '')
    if (cleanLast.length > 3) {
      return formatSlugToTitle(cleanLast)
    }
  }

  // 4. IKEA: /p/<slug>-<artNumber>/
  if (hostname.includes('ikea')) {
    const pIdx = segments.indexOf('p')
    if (pIdx !== -1 && segments[pIdx + 1]) {
      const slug = segments[pIdx + 1].replace(/-\d{6,10}\/?$/, '')
      return formatSlugToTitle(slug)
    }
  }

  // 5. General e-commerce (Empik, Media Expert, Euro, etc.): find longest descriptive slug segment
  let bestCandidate = ''
  for (let i = segments.length - 1; i >= 0; i--) {
    let seg = segments[i]
    seg = seg.replace(/\.[a-z0-9]+$/i, '')
    seg = seg.replace(/,p\d+.*$/i, '')
    seg = seg.replace(/-\d{6,}$/i, '')
    seg = seg.replace(/^[a-z0-9]{8}-[0-9a-f-]{20,}$/i, '')

    const words = seg.split(/[-_]+/).filter(w => w.length > 1)
    if (words.length >= 2 && seg.length > bestCandidate.length) {
      bestCandidate = seg
    }
  }

  if (bestCandidate.length > 3) {
    return formatSlugToTitle(bestCandidate)
  }

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

  // 5. Formatted embedded price in JSON (Zalando, Shopify, Magento, etc.)
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

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  let rawUrl = (body?.url || '').trim()

  if (!rawUrl) {
    return {
      success: false,
      error: 'Brak podanego adresu URL'
    }
  }

  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = 'https://' + rawUrl
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl)
  } catch (err) {
    return {
      success: false,
      error: 'Niepoprawny format adresu URL'
    }
  }

  const siteDomain = parsedUrl.hostname.replace(/^www\./i, '')
  const friendlySiteName = formatSiteName(parsedUrl.hostname)

  try {
    // Fetch HTML with realistic modern browser headers (avoiding fake bot UAs that trigger Akamai/Cloudflare blocks)
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

    // If title is generic (e.g. "Produkty", "allegro.pl", "Empik.com | ..."), replace with slug title
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

    // If image is a generic store logo/social media placeholder, discard it
    if (imageUrl) {
      try {
        imageUrl = new URL(imageUrl, parsedUrl.href).href
      } catch (_) {}
      if (isGenericLogo(imageUrl)) {
        imageUrl = null
      }
    }

    // 3. Price & Currency Extraction (Universal multi-strategy)
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
    // Intelligent heuristic fallback for anti-bot protection (Allegro DataDome, Cloudflare, etc.) or network timeouts
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

    // Graceful fallback for blocked requests / timeouts
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
})
