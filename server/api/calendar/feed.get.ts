import { defineEventHandler, getQuery, setHeader, createError } from 'h3'
import { getFirebaseAdminDb } from '~/server/utils/firebaseAdmin'
import { getCalendarFeed } from '~/functions/src/calendarCore'
import { DuoDataError } from '~/functions/src/partnershipAccess'

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const feed = await getCalendarFeed(getFirebaseAdminDb(), getQuery(event).token)
    setHeader(event, 'Content-Type', 'text/calendar; charset=utf-8')
    setHeader(event, 'Content-Disposition', 'inline; filename="duonest-calendar.ics"')
    return feed
  } catch (error) {
    if (error instanceof DuoDataError) throw createError({ statusCode: error.status, data: { message: error.message } })
    throw error
  }
})
