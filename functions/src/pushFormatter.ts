// Copy of server/utils/pushFormatter.ts – keep both files in sync.
// Helper to format partner actions into Polish titles, bodies, and URLs
import { resolveGrammaticalGender, v } from './duoGrammar'

export function formatPartnerAction(
  action: string,
  data: any,
  senderName: string,
  senderGender?: string | null,
  senderGrammar?: string | null
): { title: string; body: string; url: string; category: string } | null {
  const g = resolveGrammaticalGender(senderGender, senderGrammar)
  const defaultTitle = g === 'female' ? 'Twoja Partnerka' : g === 'neutral' ? 'Twoja Osoba partnerska' : 'Twój Partner'
  const name = senderName || defaultTitle

  switch (action) {
    case 'NUDGE_SEND': {
      const type = (data?.nudge_type || 'love').toLowerCase()
      let label = 'słodkiego buziaka'
      if (type.includes('hug') || type.includes('przytulas')) {
        label = 'ciepłego przytulasa'
      } else if (type.includes('touch') || type.includes('puk')) {
        label = 'delikatne puknięcie'
      } else if (type.includes('miss') || type.includes('tęsk')) {
        label = 'wiadomość, że za Tobą tęskni'
      }
      return {
        title: `${name} myśli o Tobie!`,
        body: `${name} przesyła Ci ${label}. Otwórz Gniazdko, by odpowiedzieć!`,
        url: '/tabs/nest',
        category: 'nudges'
      }
    }

    case 'MOOD_UPDATE': {
      const mood = data?.mood || 'happy'
      const moodLabels: Record<string, string> = {
        great: 'Wspaniały',
        happy: 'Radosny',
        calm: 'Spokojny',
        tired: 'Zmęczony',
        sad: 'Smutny',
        stressed: 'Zestresowany',
        romantic: 'Romantyczny'
      }
      const label = moodLabels[mood] || mood
      const note = data?.note ? ` („${data.note}”)` : ''
      return {
        title: `${name} ${v('zaktualizował', g)} nastrój`,
        body: `Aktualny nastrój: ${label}${note}`,
        url: '/tabs/nest',
        category: 'mood'
      }
    }

    case 'SHOPPING_ADD': {
      const itemName = data?.title || data?.name || 'nową pozycję'
      return {
        title: `Lista zakupów`,
        body: `${name} ${v('dodał', g)} do listy: ${itemName}`,
        url: '/tabs/shopping',
        category: 'shopping'
      }
    }

    case 'SHOPPING_TOGGLE': {
      if (data?.is_completed) {
        const itemName = data?.title || data?.name || 'pozycję'
        return {
          title: `Zakupy we dwoje`,
          body: `${name} ${v('kupił', g)} i ${v('odhaczył', g)}: ${itemName}`,
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
        title: `Nowy obowiązek domowy`,
        body: `${name} ${v('dodał', g)} zadanie: ${taskTitle}${pts}`,
        url: '/tabs/tasks',
        category: 'tasks'
      }
    }

    case 'TASK_TOGGLE': {
      if (data?.is_completed) {
        const taskTitle = data?.title || 'zadanie'
        const pts = data?.points ? ` (+${data.points} pkt)` : ''
        return {
          title: `Zadanie ukończone!`,
          body: `${name} ${v('zrealizował', g)}: ${taskTitle}${pts}!`,
          url: '/tabs/tasks',
          category: 'tasks'
        }
      }
      return null
    }

    case 'EVENT_ADD': {
      const evtTitle = data?.title || 'wspólne plany'
      return {
        title: `Wspólny terminarz`,
        body: `${name} ${v('zaplanował', g)}: ${evtTitle}`,
        url: '/tabs/calendar',
        category: 'calendar'
      }
    }

    case 'EVENT_UPDATE': {
      const evtTitle = data?.updates?.title || 'wspólny plan'
      return {
        title: `Wspólny terminarz`,
        body: `${name} ${v('zmienił', g)} szczegóły planu: ${evtTitle}`,
        url: '/tabs/calendar',
        category: 'calendar'
      }
    }

    case 'EVENT_TOGGLE_COMPLETED': {
      if (data?.is_completed) {
        const evtTitle = data?.title || 'plan'
        return {
          title: `Plan zrealizowany!`,
          body: `${name} ${v('oznaczył', g)} plan jako zrealizowany: ${evtTitle}`,
          url: '/tabs/calendar',
          category: 'calendar'
        }
      }
      return null
    }

    case 'WISHLIST_ADD': {
      if (data?.is_visible_to_partner === false) return null
      const wishTitle = data?.title || 'nowe marzenie'
      return {
        title: `Wishlista i marzenia`,
        body: `${name} ${v('dodał', g)} nowe marzenie: ${wishTitle}`,
        url: '/tabs/wishlist',
        category: 'wishlist'
      }
    }

    case 'WISHLIST_UPDATE': {
      if (data?.item?.is_visible_to_partner === false || data?.updates?.is_visible_to_partner === false) return null
      const wishTitle = data?.updates?.title || data?.item?.title || 'marzenie'
      return {
        title: `Wishlista i marzenia`,
        body: `${name} ${v('zaktualizował', g)} marzenie: ${wishTitle}`,
        url: '/tabs/wishlist',
        category: 'wishlist'
      }
    }

    case 'WISHLIST_TOGGLE':
    case 'WISHLIST_TOGGLE_COMPLETED': {
      if (data?.is_visible_to_partner === false) return null
      if (data?.is_completed) {
        const wishTitle = data?.title || 'marzenie'
        return {
          title: `Marzenie spełnione!`,
          body: `${name} ${v('spełnił', g)} Wasze marzenie: ${wishTitle}!`,
          url: '/tabs/wishlist',
          category: 'wishlist'
        }
      }
      return null
    }

    case 'MOVIE_ADD': {
      const movieTitle = data?.title || 'nowy seans'
      return {
        title: `Kino we dwoje`,
        body: `${name} ${v('dodał', g)} do listy filmów: ${movieTitle}`,
        url: '/tabs/movies',
        category: 'wishlist'
      }
    }

    case 'MOVIE_UPDATE': {
      const movieTitle = data?.title || 'listę filmów'
      return {
        title: `Kino we dwoje`,
        body: `${name} ${v('zaktualizował', g)} film: ${movieTitle}`,
        url: '/tabs/movies',
        category: 'wishlist'
      }
    }

    case 'MOVIE_TOGGLE_WATCHED': {
      if (data?.status === 'watched') {
        const movieTitle = data?.title || 'seans'
        return {
          title: `Obejrzane we dwoje!`,
          body: `${name} ${v('oznaczył', g)} film jako obejrzany: ${movieTitle}`,
          url: '/tabs/movies',
          category: 'wishlist'
        }
      }
      return null
    }

    case 'MILESTONE_CLAIM': {
      const milestoneTitle = data?.title || 'wspólny cel'
      return {
        title: `Nagroda odblokowana!`,
        body: `${name} ${v('odebrał', g)} Wasz cel: ${milestoneTitle}!`,
        url: '/tabs/nest',
        category: 'tasks'
      }
    }

    case 'MEAL_ADD': {
      const mealTitle = data?.titlePl || data?.title || 'nowy posiłek'
      return {
        title: `Planer obiadów`,
        body: `${name} ${v('zaplanował', g)} obiad: ${mealTitle}`,
        url: '/tabs/meals',
        category: 'meals'
      }
    }

    case 'MEAL_UPDATE': {
      const mealTitle = data?.titlePl || data?.title || 'posiłek'
      return {
        title: `Planer obiadów`,
        body: `${name} ${v('zaktualizował', g)} obiad: ${mealTitle}`,
        url: '/tabs/meals',
        category: 'meals'
      }
    }

    case 'MEAL_TOGGLE':
    case 'MEAL_TOGGLE_COMPLETED': {
      if (data?.is_completed) {
        const mealTitle = data?.titlePl || data?.title || 'dzisiejszy obiad'
        return {
          title: `Smacznego! Obiad gotowy`,
          body: `${name} ${v('oznaczył', g)} obiad „${mealTitle}” jako zjedzony!`,
          url: '/tabs/meals',
          category: 'meals'
        }
      }
      return null
    }

    case 'SAVINGS_GOAL_ADD': {
      const goalTitle = data?.title || 'nowy cel'
      const target = data?.target_amount ? ` (${data.target_amount} zł)` : ''
      return {
        title: `Nowa skarbonka!`,
        body: `${name} ${v('utworzył', g)} cel: ${goalTitle}${target}`,
        url: '/tabs/savings',
        category: 'savings'
      }
    }

    case 'SAVINGS_CONTRIBUTION_ADD': {
      const goalTitle = data?.goalTitle || data?.title || 'wspólny cel'
      const amount = Number(data?.contribution?.amount ?? data?.amount ?? 0)
      const isCompleted = Boolean(data?.isCompleted)
      const newCurrent = data?.newCurrentAmount !== undefined ? ` (uzbierano ${data.newCurrentAmount} zł)` : ''

      if (isCompleted) {
        return {
          title: `Cel zrealizowany! 🎯`,
          body: `Gratulacje! Razem osiągnęliście cel: ${goalTitle}!`,
          url: '/tabs/savings',
          category: 'savings'
        }
      }

      if (amount > 0) {
        return {
          title: `Wpłata do skarbonki!`,
          body: `${name} ${v('dorzucił', g)} +${amount} zł na cel: ${goalTitle}${newCurrent}`,
          url: '/tabs/savings',
          category: 'savings'
        }
      } else if (amount < 0) {
        return {
          title: `Wypłata ze skarbonki`,
          body: `${name} ${v('wypłacił', g)} ${Math.abs(amount)} zł ze skarbonki: ${goalTitle}`,
          url: '/tabs/savings',
          category: 'savings'
        }
      }
      return null
    }

    case 'SAVINGS_GOAL_UPDATE': {
      const goalTitle = data?.updates?.title || data?.title || 'skarbonkę'
      return {
        title: `Skarbonka zaktualizowana`,
        body: `${name} ${v('zaktualizował', g)} cel: ${goalTitle}`,
        url: '/tabs/savings',
        category: 'savings'
      }
    }

    case 'DOODLE_SAVE':
      return {
        title: 'Wspólny rysunek',
        body: `${name} ${v('zapisał', g)} zmiany we wspólnym rysunku.`,
        url: '/tabs/nest',
        category: 'nudges'
      }

    default:
      return null
  }
}
