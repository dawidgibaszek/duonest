import { authenticateNetlifyUser } from './_shared/pushAuth'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    }
  }

  try {
    const authResult = await authenticateNetlifyUser(event)
    if ('error' in authResult) {
      return {
        statusCode: authResult.statusCode || 401,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: authResult.error })
      }
    }

    const { supabase, profile } = authResult
    const body = event.body ? JSON.parse(event.body) : {}

    if (!body || !body.endpoint || typeof body.endpoint !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Missing or invalid endpoint URL' })
      }
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', body.endpoint)
      .eq('user_id', profile.id)

    if (error) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Nie udało się usunąć subskrypcji' })
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Push subscription removed successfully'
      })
    }
  } catch (err: any) {
    console.error('[push-unsubscribe] Error deleting subscription:', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message || 'Internal error' })
    }
  }
}
