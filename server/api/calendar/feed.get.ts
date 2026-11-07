import { defineEventHandler, getQuery, setHeader, createError } from 'h3'
import { getSupabaseServerClient } from '~/server/utils/webPush'
import { checkRateLimit } from '~/server/utils/rateLimit'

function formatIcsUtc(dateInput: Date | string | number): string {
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

function escapeIcsText(str?: string | null): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function getCategoryLabelPl(category: string): string {
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

export default defineEventHandler(async (event) => {
  const rate = await checkRateLimit(event, { maxRequests: 60, windowMs: 60000, keyPrefix: 'cal_feed' })
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zbyt wiele zapytań o kalendarz. Odczekaj chwilę.'
    })
  }

  const query = getQuery(event)
  const partnershipId = (query.p || query.partnershipId || query.token) as string

  if (!partnershipId || typeof partnershipId !== 'string' || partnershipId.length > 128) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Brak lub nieprawidłowy identyfikator pary.'
    })
  }

  const config = useRuntimeConfig(event)
  const supabase = getSupabaseServerClient(config)

  let eventsList: any[] = []
  let partnershipName = 'Wspólny Terminarz DuoNest'

  if (supabase) {
    try {
      const [eventsRes, partnerRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('partnership_id', partnershipId)
          .order('start_time', { ascending: true })
          .limit(500),
        supabase
          .from('partnerships')
          .select('nest_name')
          .eq('id', partnershipId)
          .single()
      ])

      if (eventsRes.data) {
        eventsList = eventsRes.data
      }
      if (partnerRes.data?.nest_name) {
        partnershipName = `DuoNest - ${partnerRes.data.nest_name}`
      }
    } catch (err) {
      console.warn('[Calendar Feed] Error fetching events from Supabase:', err)
    }
  }

  const headerLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DuoNest//Wspolny Terminarz Par//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(partnershipName)}`,
    'X-WR-TIMEZONE:Europe/Warsaw'
  ]

  const nowUtc = formatIcsUtc(new Date())

  const eventBlocks = eventsList.map((item) => {
    const uid = item.id ? `duonest-${item.id}@duonestapp.pl` : `duonest-${Math.random().toString(36).substring(2, 9)}@duonestapp.pl`
    const dtstamp = formatIcsUtc(item.created_at || nowUtc)
    const dtstart = formatIcsUtc(item.start_time)

    let dtend = ''
    if (item.end_time) {
      dtend = formatIcsUtc(item.end_time)
    } else {
      const startDate = new Date(item.start_time)
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
      dtend = formatIcsUtc(endDate)
    }

    const categoryName = getCategoryLabelPl(item.category || 'date')
    let descriptionText = item.description || ''
    if (item.planner_name) {
      descriptionText = descriptionText
        ? `${descriptionText}\n\nOrganizator: ${item.planner_name} (DuoNest)`
        : `Organizator: ${item.planner_name} (DuoNest)`
    }

    const lines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeIcsText(item.title || 'Wspólny plan')}`,
      `CATEGORIES:${escapeIcsText(categoryName)}`,
      `STATUS:${item.is_completed ? 'COMPLETED' : 'CONFIRMED'}`
    ]

    if (descriptionText) {
      lines.push(`DESCRIPTION:${escapeIcsText(descriptionText)}`)
    }

    if (item.location) {
      lines.push(`LOCATION:${escapeIcsText(item.location)}`)
    }

    lines.push('END:VEVENT')
    return lines.join('\r\n')
  })

  const footerLines = ['END:VCALENDAR']
  const icsOutput = [...headerLines, ...eventBlocks, ...footerLines].join('\r\n')

  setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'inline; filename="duonest-terminarz.ics"')
  setHeader(event, 'Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
  setHeader(event, 'Pragma', 'no-cache')

  return icsOutput
})

