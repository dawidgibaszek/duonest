import { createClient } from '@supabase/supabase-js'
import { getRateLimitResponse } from './_shared/rateLimit'

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

export const handler = async (event: any) => {
  const query = event.queryStringParameters || {}
  const partnershipId = (query.p || query.partnershipId || query.token) as string

  const headers = {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'inline; filename="duonest-terminarz.ics"',
    'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  }

  const rateLimitResponse = await getRateLimitResponse(event, 'calendar-feed', 60, 60, headers)
  if (rateLimitResponse) return rateLimitResponse

  if (!partnershipId || typeof partnershipId !== 'string' || partnershipId.length > 128) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Brak lub nieprawidlowy identyfikator pary.'
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || ('https://' + 'hfvgobhxiuchchblaajq.supabase.co')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return {
      statusCode: 503,
      headers: { ...headers, 'Cache-Control': 'no-store' },
      body: 'Calendar feed is unavailable.'
    }
  }

  let eventsList: any[] = []
  let partnershipName = 'Wspolny Terminarz DuoNest'

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

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
    console.warn('[Calendar Feed] Supabase error:', err)
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

  return {
    statusCode: 200,
    headers,
    body: icsOutput
  }
}

