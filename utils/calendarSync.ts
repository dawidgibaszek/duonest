import type { EventItem } from '~/composables/useDuoState'

export interface ParsedIcsEvent {
  title: string
  startTime: string
  endTime?: string
  description?: string
  location?: string
  category: EventItem['category']
}

/**
 * Format Date to UTC timestamp: YYYYMMDDTHHmmssZ
 */
export function formatIcsUtc(dateInput: Date | string | number): string {
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }
  const pad = (n: number) => (n < 10 ? '0' + n : String(n))
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

/**
 * Escape iCalendar text according to RFC 5545
 */
export function escapeIcsText(str?: string | null): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Unescape iCalendar text
 */
export function unescapeIcsText(str?: string | null): string {
  if (!str) return ''
  return str
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

/**
 * Map category key to Polish category name
 */
export function getCategoryLabelPl(category: EventItem['category']): string {
  switch (category) {
    case 'date':
      return 'Randka'
    case 'trip':
      return 'Wyjazd / Wycieczka'
    case 'home':
      return 'Wspólny Dom'
    case 'anniversary':
      return 'Rocznica / Święto'
    case 'work':
      return 'Praca / Obowiązki'
    default:
      return 'Wspólny plan'
  }
}

/**
 * Guess category from event text and title
 */
export function inferCategoryFromText(text: string): EventItem['category'] {
  const lower = text.toLowerCase()
  if (lower.includes('randk') || lower.includes('kolacj') || lower.includes('kino') || lower.includes('teatr') || lower.includes('spacer') || lower.includes('film')) {
    return 'date'
  }
  if (lower.includes('wyjazd') || lower.includes('lot') || lower.includes('urlop') || lower.includes('wakacj') || lower.includes('hotel') || lower.includes('pociag') || lower.includes('podroz')) {
    return 'trip'
  }
  if (lower.includes('rocznic') || lower.includes('urodzin') || lower.includes('imienin') || lower.includes('swieto') || lower.includes('jubileusz')) {
    return 'anniversary'
  }
  if (lower.includes('dom') || lower.includes('zakup') || lower.includes('sprzatan') || lower.includes('remont') || lower.includes('gotowan') || lower.includes('obiad')) {
    return 'home'
  }
  if (lower.includes('praca') || lower.includes('spotkan') || lower.includes('dyzur') || lower.includes('biur') || lower.includes('lekarz') || lower.includes('wizyt')) {
    return 'work'
  }
  return 'other'
}

/**
 * Generate a single VEVENT block RFC 5545
 */
export function generateVEventBlock(event: EventItem): string {
  const uid = event.id ? `duonest-${event.id}@duonestapp.pl` : `duonest-${Math.random().toString(36).substring(2, 9)}@duonestapp.pl`
  const dtstamp = formatIcsUtc(event.created_at || new Date())
  const dtstart = formatIcsUtc(event.start_time)

  let dtend = ''
  if (event.end_time) {
    dtend = formatIcsUtc(event.end_time)
  } else {
    // Default 1 hour duration
    const startDate = new Date(event.start_time)
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    dtend = formatIcsUtc(endDate)
  }

  const categoryName = getCategoryLabelPl(event.category)
  let descriptionText = event.description || ''
  if (event.planner_name) {
    descriptionText = descriptionText
      ? `${descriptionText}\n\nOrganizator: ${event.planner_name} (DuoNest)`
      : `Organizator: ${event.planner_name} (DuoNest)`
  }

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `CATEGORIES:${escapeIcsText(categoryName)}`,
    `STATUS:${event.is_completed ? 'COMPLETED' : 'CONFIRMED'}`
  ]

  if (descriptionText) {
    lines.push(`DESCRIPTION:${escapeIcsText(descriptionText)}`)
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`)
  }

  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

/**
 * Generate full RFC 5545 iCalendar string
 */
export function generateIcsCalendar(
  events: EventItem[],
  calendarName: string = 'DuoNest - Wspólny Terminarz'
): string {
  const headerLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DuoNest//Wspolny Terminarz Par//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Warsaw'
  ]

  const eventBlocks = events.map(e => generateVEventBlock(e))
  const footerLines = ['END:VCALENDAR']

  return [...headerLines, ...eventBlocks, ...footerLines].join('\r\n')
}

/**
 * Generate single event .ics content
 */
export function generateSingleEventIcs(event: EventItem): string {
  return generateIcsCalendar([event], `DuoNest - ${event.title}`)
}

/**
 * Trigger file download for an .ics string
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  if (typeof window === 'undefined') return

  const cleanFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = cleanFilename
  document.body.appendChild(a)
  a.click()

  setTimeout(() => {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Generate Google Calendar direct add URL
 */
export function generateGoogleCalendarUrl(event: EventItem): string {
  const dtstart = formatIcsUtc(event.start_time)
  let dtend = ''
  if (event.end_time) {
    dtend = formatIcsUtc(event.end_time)
  } else {
    const startDate = new Date(event.start_time)
    dtend = formatIcsUtc(new Date(startDate.getTime() + 60 * 60 * 1000))
  }

  let details = event.description || ''
  if (event.planner_name) {
    details = details ? `${details}\n\nInicjator: ${event.planner_name} (DuoNest)` : `Inicjator: ${event.planner_name} (DuoNest)`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${dtstart}/${dtend}`,
    details,
    location: event.location || ''
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Generate Google Calendar subscription URL for a live WebCal feed
 */
export function generateGoogleCalendarSubscribeUrl(feedUrl: string): string {
  const webcalUrl = feedUrl.replace(/^https?:\/\//i, 'webcal://')
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
}

/**
 * Generate Microsoft Outlook direct add URL
 */
export function generateOutlookCalendarUrl(event: EventItem): string {
  const startDate = new Date(event.start_time)
  const endDate = event.end_time ? new Date(event.end_time) : new Date(startDate.getTime() + 60 * 60 * 1000)

  let body = event.description || ''
  if (event.planner_name) {
    body = body ? `${body}\n\nInicjator: ${event.planner_name} (DuoNest)` : `Inicjator: ${event.planner_name} (DuoNest)`
  }

  const params = new URLSearchParams({
    subject: event.title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body,
    location: event.location || ''
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

/**
 * Generate Microsoft Outlook subscription URL for a live WebCal feed
 */
export function generateOutlookCalendarSubscribeUrl(feedUrl: string): string {
  const httpsUrl = feedUrl.replace(/^webcal:\/\//i, 'https://')
  return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}`
}

/**
 * Generate webcal:// and https:// URLs for partnership calendar feed
 */
export function getCalendarFeedUrls(partnershipId: string, currentOrigin?: string): { webcalUrl: string; httpsUrl: string } {
  const origin = currentOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://duonestapp.pl')
  const cleanOrigin = origin.replace(/\/+$/, '')
  const path = `/api/calendar/feed?p=${encodeURIComponent(partnershipId)}`

  const httpsUrl = `${cleanOrigin}${path}`
  const webcalUrl = httpsUrl.replace(/^https?:\/\//i, 'webcal://')

  return {
    webcalUrl,
    httpsUrl
  }
}

/**
 * Parse an iCalendar date string (handles UTC 'Z', local, date-only, and TZID prefixes)
 */
function parseIcsDateString(rawDate: string): string | null {
  if (!rawDate) return null
  const clean = rawDate.trim()

  // Match YYYYMMDDTHHmmssZ
  const utcMatch = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
  if (utcMatch) {
    const [, y, m, d, h, min, s] = utcMatch
    const date = new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s))
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  // Match YYYYMMDDTHHmmss (local)
  const localMatch = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/)
  if (localMatch) {
    const [, y, m, d, h, min, s] = localMatch
    const date = new Date(+y, +m - 1, +d, +h, +min, +s)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  // Match YYYYMMDD (all day date)
  const dateOnlyMatch = clean.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch
    const date = new Date(+y, +m - 1, +d, 12, 0, 0)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  // Fallback to standard Date parse
  const parsed = new Date(clean)
  return isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/**
 * Robust RFC 5545 iCalendar Parser
 */
export function parseIcsContent(icsText: string): ParsedIcsEvent[] {
  if (!icsText || typeof icsText !== 'string') return []

  // 1. Unfold lines (RFC 5545 section 3.1: folded line starts with CRLF followed by single space or tab)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  const events: ParsedIcsEvent[] = []
  let insideEvent = false
  let currentEventProps: Record<string, string> = {}

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line === 'BEGIN:VEVENT') {
      insideEvent = true
      currentEventProps = {}
      continue
    }

    if (line === 'END:VEVENT') {
      if (insideEvent) {
        insideEvent = false
        const title = unescapeIcsText(currentEventProps['SUMMARY'] || 'Nowe wydarzenie')
        const rawStart = currentEventProps['DTSTART'] || ''
        const rawEnd = currentEventProps['DTEND'] || ''
        const description = unescapeIcsText(currentEventProps['DESCRIPTION'] || '')
        const location = unescapeIcsText(currentEventProps['LOCATION'] || '')

        const startTime = parseIcsDateString(rawStart) || new Date().toISOString()
        const endTime = parseIcsDateString(rawEnd) || undefined
        const category = inferCategoryFromText(title + ' ' + description)

        events.push({
          title,
          startTime,
          endTime,
          description: description || undefined,
          location: location || undefined,
          category
        })
      }
      continue
    }

    if (insideEvent) {
      // Split property name (with possible parameters like DTSTART;VALUE=DATE:) and value
      const colonIndex = line.indexOf(':')
      if (colonIndex > 0) {
        const rawKey = line.substring(0, colonIndex).toUpperCase()
        const value = line.substring(colonIndex + 1)
        const key = rawKey.split(';')[0].trim()
        currentEventProps[key] = value
      }
    }
  }

  return events
}

