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

export function formatSiteName(hostname: string): string {
  if (!hostname) return ''
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

export function cleanProductTitle(rawTitle: string): string {
  if (!rawTitle) return ''
  let title = decodeHtmlEntities(rawTitle).trim()

  // Remove common store, opinions and SEO postfixes
  title = title
    .replace(/\s*[-–|•:]\s*(?:Opinie\s+i\s+ceny\s+na\s+|Ceny\s+i\s+opinie\s+na\s+|Opinie\s+na\s+|Ceny\s+na\s+|Sklep\s+|Kup\s+teraz\s+w\s+)?[A-Z0-9.\-_ ]*(?:\.(?:pl|com|de|eu|org|net)|Ceneo|Allegro|Amazon|Zalando|Empik|IKEA|Media Expert|Media Markt|RTV EURO AGD|Komputronik|x-kom|Morele|Castorama|Leroy Merlin|Obi|Lidl|Biedronka|Smyk|eobuwie|Modivo|Answear|Reserved|House|Cropp|Sinsay|Mohito|CCC|Decathlon)[\s\S]*$/i, '')
    .replace(/\s*[-–|•]\s*(?:Ceneo|Allegro|Amazon|Zalando|Empik|IKEA|Media Expert|RTV Euro AGD|x-kom)[\s\S]*$/i, '')
    .trim()

  return title
}

export function isGenericTitle(title: string | null): boolean {
  if (!title || title.length < 3) return true
  const lower = title.toLowerCase().trim()
  if (['produkty', 'sklep', 'home', 'strona główna', 'allegro.pl', 'allegro', 'ceneo.pl', 'ceneo', 'zalando.pl', 'empik.com', 'ikea', 'media expert'].includes(lower)) return true
  if (lower.includes('10 000 000 produktów') || lower.includes('dostawa za 0 zł') || lower.includes('wyszukiwarka') || lower.includes('szukaj')) return true
  if (lower.startsWith('sklep internetowy') || lower.startsWith('kupuj online') || lower.startsWith('zaloguj się')) return true
  return false
}

export function isGenericLogo(url: string | null): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  return lower.includes('logo-for-fb') || lower.includes('socialmediaimage') || lower.includes('favicon') || lower.includes('/logo.') || lower.includes('default-image')
}

export function formatSlugToTitle(slug: string): string {
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

export function extractTitleFromUrl(parsedUrl: URL): string | null {
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

  // 5. Ceneo: /<slug>-<id>.htm
  if (hostname.includes('ceneo')) {
    for (const seg of segments) {
      let slug = seg.replace(/\.html?$/i, '').replace(/-\d{6,}$/i, '')
      if (slug.length > 3 && !slug.startsWith('kategoria') && !slug.startsWith('opinie')) {
        return formatSlugToTitle(slug)
      }
    }
  }

  // 6. General e-commerce: find longest descriptive slug segment
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

