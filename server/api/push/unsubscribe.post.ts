import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseServerClient } from '~/server/utils/webPush'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body || !body.endpoint) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing endpoint'
    })
  }

  const supabase = getSupabaseServerClient(config)
  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase server client not available'
    })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)

  if (error) {
    console.error('[WebPush] Error deleting push subscription:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to delete push subscription'
    })
  }

  return {
    success: true,
    message: 'Push subscription removed successfully'
  }
})

