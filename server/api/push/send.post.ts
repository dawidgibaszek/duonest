import { defineEventHandler, readBody, createError } from 'h3'
import {
  configureWebPush,
  getSupabaseServerClient,
  sendWebPushToSubscription,
  type PushNotificationPayload
} from '~/server/utils/webPush'

// Helper to format partner actions into Polish titles, bodies, and URLs
function formatPartnerAction(
  action: string,
  data: any,
  senderName: string
): { title: string; body: string; url: string; category: string } | null {
  const name = senderName || 'Twój Partner'

  switch (action) {
    case 'NUDGE_SEND': {
      const type = (data?.nudge_type || 'love').toLowerCase()
      let label = 'słodkiego buziaka'
      let emoji = '💋'
      if (type.includes('hug') || type.includes('przytulas')) {
        label = 'ciepłego przytulasa'
        emoji = '🤗'
      } else if (type.includes('touch') || type.includes('puk')) {
        label = 'delikatne puknięcie'
        emoji = '👉'
      } else if (type.includes('miss') || type.includes('tęsk')) {
        label = 'wiadomość, że za Tobą tęskni'
        emoji = '🥺'
      }
      return {
        title: `${name} myśli o Tobie! ${emoji}`,
        body: `${name} przesyła Ci ${label}. Otwórz Gniazdko, by odpowiedzieć!`,
        url: '/tabs/nest',
        category: 'nudges'
      }
    }

    case 'MOOD_UPDATE': {
      const mood = data?.mood || 'happy'
      const moodLabels: Record<string, string> = {
        great: 'Wspaniały 🌟',
        happy: 'Radosny 😊',
        calm: 'Spokojny 🍃',
        tired: 'Zmęczony 🥱',
        sad: 'Smutny 🥺',
        stressed: 'Zestresowany ⚡',
        romantic: 'Romantyczny 💕'
      }
      const label = moodLabels[mood] || mood
      const note = data?.note ? ` („${data.note}”)` : ''
      return {
        title: `${name} zaktualizował(a) nastrój 💌`,
        body: `Aktualny nastrój: ${label}${note}`,
        url: '/tabs/nest',
        category: 'mood'
      }
    }

    case 'SHOPPING_ADD': {
      const itemName = data?.title || data?.name || 'nową pozycję'
      return {
        title: `Lista zakupów 🛒`,
        body: `${name} dodał(a) do listy: ${itemName}`,
        url: '/tabs/shopping',
        category: 'shopping'
      }
    }

    case 'SHOPPING_TOGGLE': {
      if (data?.is_completed) {
        const itemName = data?.title || data?.name || 'pozycję'
        return {
          title: `Zakupy we dwoje 🛒`,
          body: `${name} kupił(a) i odhaczył(a): ${itemName}`,
          url: '/tabs/shopping',
          category: 'shopping'
        }
      }
      return null
    }

    case 'TASK_ADD': {
      const taskTitle = data?.title || 'nowe zadanie'
      const pts = data?.points ? ` (+${data.points} pkt)` : ''
      return {
        title: `Nowy obowiązek domowy ✨`,
        body: `${name} dodał(a) zadanie: ${taskTitle}${pts}`,
        url: '/tabs/tasks',
        category: 'tasks'
      }
    }

    case 'TASK_TOGGLE': {
      if (data?.is_completed) {
        const taskTitle = data?.title || 'zadanie'
        const pts = data?.points ? ` (+${data.points} pkt)` : ''
        return {
          title: `Zadanie ukończone! 🎉`,
          body: `${name} zrealizował(a): ${taskTitle}${pts}!`,
          url: '/tabs/tasks',
          category: 'tasks'
        }
      }
      return null
    }

    case 'EVENT_ADD': {
      const evtTitle = data?.title || 'wspólne plany'
      return {
        title: `Wspólny terminarz 📅`,
        body: `${name} zaplanował(a): ${evtTitle}`,
        url: '/tabs/calendar',
        category: 'calendar'
      }
    }

    case 'EVENT_TOGGLE_COMPLETED': {
      if (data?.is_completed) {
        const evtTitle = data?.title || 'plan'
        return {
          title: `Plan zrealizowany! ❤️`,
          body: `${name} oznaczył(a) plan jako zrealizowany: ${evtTitle}`,
          url: '/tabs/calendar',
          category: 'calendar'
        }
      }
      return null
    }

    case 'WISHLIST_ADD': {
      const wishTitle = data?.title || 'nowe marzenie'
      return {
        title: `Wishlista i marzenia 🎁`,
        body: `${name} dodał(a) nowe marzenie: ${wishTitle}`,
        url: '/tabs/wishlist',
        category: 'wishlist'
      }
    }

    case 'WISHLIST_TOGGLE_COMPLETED': {
      if (data?.is_completed) {
        const wishTitle = data?.title || 'marzenie'
        return {
          title: `Marzenie spełnione! 💖`,
          body: `${name} spełnił(a) Wasze marzenie: ${wishTitle}!`,
          url: '/tabs/wishlist',
          category: 'wishlist'
        }
      }
      return null
    }

    case 'MOVIE_ADD': {
      const movieTitle = data?.title || 'nowy seans'
      return {
        title: `Kino we dwoje 🎬`,
        body: `${name} dodał(a) do listy filmów: ${movieTitle}`,
        url: '/tabs/movies',
        category: 'wishlist'
      }
    }

    case 'MOVIE_TOGGLE_WATCHED': {
      if (data?.status === 'watched') {
        const movieTitle = data?.title || 'seans'
        return {
          title: `Obejrzane we dwoje! 🍿`,
          body: `${name} oznaczył(a) film jako obejrzany: ${movieTitle}`,
          url: '/tabs/movies',
          category: 'wishlist'
        }
      }
      return null
    }

    case 'MILESTONE_CLAIM': {
      const milestoneTitle = data?.title || 'wspólny cel'
      return {
        title: `Nagroda odblokowana! 🏆`,
        body: `${name} odebrał(a) Wasz cel: ${milestoneTitle}!`,
        url: '/tabs/nest',
        category: 'milestones'
      }
    }

    case 'MEAL_ADD': {
      const mealTitle = data?.titlePl || data?.title || 'nowy posiłek'
      return {
        title: `Planer obiadów 🍳`,
        body: `${name} zaplanował(a) obiad: ${mealTitle}`,
        url: '/tabs/meals',
        category: 'meals'
      }
    }

    case 'MEAL_UPDATE': {
      const mealTitle = data?.titlePl || data?.title || 'posiłek'
      return {
        title: `Planer obiadów 🍲`,
        body: `${name} zaktualizował(a) obiad: ${mealTitle}`,
        url: '/tabs/meals',
        category: 'meals'
      }
    }

    case 'MEAL_TOGGLE_COMPLETED': {
      if (data?.is_completed) {
        const mealTitle = data?.titlePl || data?.title || 'dzisiejszy obiad'
        return {
          title: `Smacznego! Obiad gotowy 🍽️`,
          body: `${name} oznaczył(a) obiad „${mealTitle}” jako zjedzony!`,
          url: '/tabs/meals',
          category: 'meals'
        }
      }
      return null
    }

    default:
      return null
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)

  if (!body) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing request body'
    })
  }

  const wp = configureWebPush(config)
  if (!wp) {
    console.warn('[WebPush] VAPID keys not configured, skipping web push')
    return {
      success: false,
      message: 'VAPID keys not configured on server'
    }
  }

  const supabase = getSupabaseServerClient(config)
  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase server client not available'
    })
  }

  let finalPayload: PushNotificationPayload | null = null

  // 1. Either formatted directly:
  if (body.title && body.body) {
    finalPayload = {
      title: body.title,
      body: body.body,
      icon: body.icon || '/pwa-192x192.png',
      badge: body.badge || '/favicon.png',
      data: {
        url: body.url || '/tabs/nest',
        category: body.category || 'nudges',
        ...(body.data || {})
      },
      tag: body.tag || 'duonest-' + Date.now(),
      vibrate: body.vibrate || [120, 60, 120, 60, 180],
      renotify: true
    }
  } else if (body.action) {
    // 2. Or formatted from high-level partner action:
    const formatted = formatPartnerAction(body.action, body.payload, body.senderName)
    if (!formatted) {
      return {
        success: true,
        message: 'Action ignored (no notification needed)'
      }
    }
    finalPayload = {
      title: formatted.title,
      body: formatted.body,
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
      data: {
        url: formatted.url,
        category: formatted.category,
        action: body.action
      },
      tag: `duonest-${formatted.category}-${Date.now()}`,
      vibrate: [120, 60, 120, 60, 180],
      renotify: true
    }
  }

  if (!finalPayload) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Could not construct notification payload from request'
    })
  }

  // Find target subscriptions:
  let query = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth, user_id')

  if (body.targetUserId) {
    query = query.eq('user_id', body.targetUserId)
  } else if (body.partnershipId) {
    query = query.eq('partnership_id', body.partnershipId)
    if (body.senderUserId) {
      query = query.neq('user_id', body.senderUserId)
    }
  } else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Must specify targetUserId or partnershipId'
    })
  }

  const { data: subscriptions, error } = await query

  if (error) {
    console.error('[WebPush] Error fetching subscriptions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch subscriptions'
    })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return {
      success: true,
      sentCount: 0,
      message: 'No active push subscriptions found for recipient'
    }
  }

  // Send to all recipient devices in parallel
  const sendPromises = subscriptions.map((sub: any) =>
    sendWebPushToSubscription(wp, supabase, sub, finalPayload!)
  )

  const results = await Promise.allSettled(sendPromises)
  const successfulCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length

  return {
    success: true,
    sentCount: successfulCount,
    totalDevices: subscriptions.length
  }
})

