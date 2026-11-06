import {
  decodeHtmlEntities,
  formatSiteName,
  cleanProductTitle,
  isGenericTitle,
  isGenericLogo,
  formatSlugToTitle,
  extractTitleFromUrl
} from '../../utils/wishlistParser'

export interface ScrapedProductData {
  title: string
  price: string | null
  currency: string
  image_url: string | null
  site_name: string
  url: string
}

export function extractMeta(html: string, nameOrProp: string): string | null {
  const regex1 = new RegExp(`<meta[^>]+(?:property|name)=["']${nameOrProp}["'][^>]+content=["']([^"']*)["']`, 'i')
  const match1 = html.match(regex1)
  if (match1 && match1[1]) return decodeHtmlEntities(match1[1])

  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${nameOrProp}["']`, 'i')
  const match2 = html.match(regex2)
  if (match2 && match2[1]) return decodeHtmlEntities(match2[1])

  return null
}

export function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const images: string[] = []

  // 1. Meta og:image and twitter:image
  const metaImages = [
    extractMeta(html, 'og:image:secure_url'),
    extractMeta(html, 'og:image'),
    extractMeta(html, 'og:image:url'),
    extractMeta(html, 'twitter:image'),
    extractMeta(html, 'twitter:image:src')
  ].filter(Boolean) as string[]
  images.push(...metaImages)

  // 2. Link rel="image_src"
  const linkImage = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)
  if (linkImage && linkImage[1]) images.push(linkImage[1])

  // 3. Itemprop="image"
  const itempropImg = html.match(/<[^>]+itemprop=["']image["'][^>]+(?:src|content)=["']([^"']+)["']/i)
  if (itempropImg && itempropImg[1]) images.push(itempropImg[1])

  // 4. JSON-LD structured images
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1])
      const candidates = parsed['@graph'] && Array.isArray(parsed['@graph']) ? parsed['@graph'] : (Array.isArray(parsed) ? parsed : [parsed])
      for (const cand of candidates) {
        if (cand['@type'] === 'Product' || cand.offers) {
          if (typeof cand.image === 'string') {
            images.push(cand.image)
          } else if (Array.isArray(cand.image)) {
            cand.image.forEach((img: any) => {
              if (typeof img === 'string') images.push(img)
              else if (img?.url && typeof img.url === 'string') images.push(img.url)
            })
          } else if (cand.image?.url && typeof cand.image.url === 'string') {
            images.push(cand.image.url)
          }
        }
      }
    } catch (_) {}
  }

  // 5. Next.js __NEXT_DATA__ images
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch && nextDataMatch[1]) {
    try {
      const nd = JSON.parse(nextDataMatch[1])
      const jsonStr = JSON.stringify(nd)
      const matches = jsonStr.match(/"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)
      if (matches) {
        for (const m of matches.slice(0, 10)) {
          const u = m.replace(/"/g, '')
          if (!u.includes('logo') && !u.includes('icon') && !u.includes('svg')) {
            images.push(u)
          }
        }
      }
    } catch (_) {}
  }

  // 6. Common product img tags (e.g. data-src, zoom, gallery, pdp)
  const imgTagMatches = html.matchAll(/<img[^>]+(?:class|id|data-testid)=["'][^"']*(?:product|gallery|main|hero|primary|zoom|pdp)[^"']*["'][^>]+(?:src|data-src|data-zoom-image)=["']([^"']+)["']/gi)
  for (const m of imgTagMatches) {
    if (m && m[1]) images.push(m[1])
  }

  // Filter and normalize
  const valid = images
    .filter(u => u && typeof u === 'string' && u.length > 10)
    .map(u => {
      try {
        return new URL(u, baseUrl).href
      } catch (_) {
        return u
      }
    })
    .filter(u => {
      const lower = u.toLowerCase()
      if (lower.includes('data:image') || lower.includes('.svg') || lower.includes('pixel') || lower.includes('spacer') || lower.includes('1x1')) return false
      if (isGenericLogo(u)) return false
      return true
    })

  return [...new Set(valid)]
}

export function extractPriceFromHtml(html: string): { price: string | null; currency: string } {
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
  const ogPrice = extractMeta(html, 'product:price:amount') || extractMeta(html, 'og:price:amount') || extractMeta(html, 'price')
  const ogCurrency = extractMeta(html, 'product:price:currency') || extractMeta(html, 'og:price:currency') || extractMeta(html, 'currency')
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

  // 5. Next.js __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch && nextDataMatch[1]) {
    try {
      const nd = JSON.parse(nextDataMatch[1])
      const jsonStr = JSON.stringify(nd)
      const pMatch = jsonStr.match(/"(?:price|currentPrice|finalPrice|priceAmount)":\s*([0-9.]+)/i) ||
                     jsonStr.match(/"(?:formattedPrice|displayPrice)":\s*"([0-9\s.,]+)"/i)
      if (pMatch && pMatch[1]) {
        price = pMatch[1].replace(/[^\d.,]/g, '').replace(',', '.')
        return { price, currency }
      }
    } catch (_) {}
  }

  // 6. data-price attribute
  const dataPriceMatch = html.match(/data-(?:product-)?price=["']([0-9.,]+)["']/i)
  if (dataPriceMatch && dataPriceMatch[1]) {
    price = dataPriceMatch[1].replace(',', '.')
    return { price, currency }
  }

  // 7. Generic price patterns in HTML
  const classPriceMatch = html.match(/<[a-z0-9]+[^>]+class=["'][^"']*(?:total-price|product-price|current-price|price-wrapper|main-price|price__value|price)[^"']*["'][^>]*>\s*([0-9\s.,]+)\s*(zł|PLN|€|EUR|\$|USD)?\s*<\/[a-z0-9]+>/i)
  if (classPriceMatch && classPriceMatch[1]) {
    const rawVal = classPriceMatch[1].replace(/[^\d.,]/g, '').trim()
    if (rawVal && rawVal.length <= 10) {
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

function isPrivateHost(hostname: string): boolean {
  let host = hostname.toLowerCase().trim()

  // Strip IPv6 brackets if present
  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1)
  }

  // Common loopback, internal domains and cloud metadata names
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.lan') ||
    host.endsWith('.corp') ||
    host.endsWith('.home') ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === 'metadata.google.internal' ||
    host === 'instance-data'
  ) {
    return true
  }

  // Integer IP notation (e.g., 2130706433 = 127.0.0.1)
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

  // Hexadecimal notation (e.g. 0x7f000001)
  if (/^0x[0-9a-f]+$/i.test(host)) {
    const num = parseInt(host, 16)
    if (!isNaN(num) && num >= 0 && num <= 4294967295) {
      const b1 = (num >>> 24) & 255
      const b2 = (num >>> 16) & 255
      if (b1 === 127 || b1 === 10 || b1 === 0) return true
      if (b1 === 169 && b2 === 254) return true
      if (b1 === 172 && b2 >= 16 && b2 <= 31) return true
      if (b1 === 192 && b2 === 168) return true
    }
  }

  // IPv4 dotted notation (including octal or decimal parts)
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
      if (oct1 === 169 && oct2 === 254) return true // 169.254.0.0/16 Link-local / AWS metadata
      if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true // 172.16.0.0/12
      if (oct1 === 192 && oct2 === 168) return true // 192.168.0.0/16
      if (oct1 === 0) return true // 0.0.0.0/8
      if (oct1 === 100 && oct2 === 100) return true // Carrier-grade NAT / Alibaba metadata
    }
  }

  // IPv6 checks (loopback, link-local, ULA, IPv4-mapped)
  if (host.includes(':')) {
    if (host === '::1' || host === '::') return true
    if (host.startsWith('fe80:') || host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')) return true
    if (host.startsWith('fc00:') || host.startsWith('fd')) return true
    if (host.startsWith('::ffff:')) {
      const mappedIpv4 = host.replace('::ffff:', '')
      return isPrivateHost(mappedIpv4)
    }
  }

  return false
}

export async function processScrape(rawUrl: string): Promise<{
  success: boolean
  data?: ScrapedProductData
  notice?: string
  error?: string
  fallback?: ScrapedProductData
}> {
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

  // SSRF Protection: only allow standard http/https schemes and public hostnames
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return {
      success: false,
      error: 'Dozwolone są wyłącznie protokoły HTTP oraz HTTPS'
    }
  }

  if (isPrivateHost(parsedUrl.hostname)) {
    return {
      success: false,
      error: 'Podany adres URL jest niedozwolony ze względów bezpieczeństwa.'
    }
  }

  const siteDomain = parsedUrl.hostname.replace(/^www\./i, '')
  const friendlySiteName = formatSiteName(parsedUrl.hostname)
  const defaultLogoFallback = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=128`

  try {
    let currentUrl = parsedUrl.href
    let redirectCount = 0
    let response: Response | null = null

    // Safe redirect-following loop with per-hop SSRF validation
    while (redirectCount <= 4) {
      const res = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(7000)
      })

      // Inspect redirect response
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) break
        const nextUrl = new URL(location, currentUrl)
        if (!['http:', 'https:'].includes(nextUrl.protocol) || isPrivateHost(nextUrl.hostname)) {
          return {
            success: false,
            error: 'Niedozwolony cel przekierowania ze względów bezpieczeństwa.'
          }
        }
        currentUrl = nextUrl.href
        redirectCount++
        continue
      }

      response = res
      break
    }

    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status || 500}`)
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml') && !contentType.includes('text/plain')) {
      throw new Error('Nieobsługiwany typ zawartości strony')
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10)
    if (contentLength > 5 * 1024 * 1024) {
      throw new Error('Rozmiar strony przekracza dopuszczalny limit')
    }

    // Limit read size to 500KB to prevent memory exhaustion
    let html = ''
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let receivedBytes = 0
      const maxBytes = 500_000

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          receivedBytes += value.length
          html += decoder.decode(value, { stream: true })
        }
        if (receivedBytes >= maxBytes) {
          await reader.cancel()
          break
        }
      }
    } else {
      const rawText = await response.text()
      html = rawText.slice(0, 500_000)
    }

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
    const candidateImages = extractImagesFromHtml(html, parsedUrl.href)
    const imageUrl = candidateImages[0] || defaultLogoFallback

    // 3. Price & Currency Extraction
    const { price, currency } = extractPriceFromHtml(html)
    const siteName = extractMeta(html, 'og:site_name') || friendlySiteName

    return {
      success: true,
      data: {
        title: title || slugTitle || '',
        price: price || null,
        currency: currency || 'PLN',
        image_url: imageUrl || defaultLogoFallback,
        site_name: siteName,
        url: parsedUrl.href
      }
    }
  } catch (err: any) {
    const slugTitle = extractTitleFromUrl(parsedUrl)
    return {
      success: true,
      data: {
        title: slugTitle || '',
        price: null,
        currency: 'PLN',
        image_url: defaultLogoFallback,
        site_name: friendlySiteName || siteDomain,
        url: parsedUrl.href
      },
      notice: `Rozpoznano sklep ${friendlySiteName || 'internetowy'}! Uzupełnij brakujące szczegóły marzenia.`
    }
  }
}

