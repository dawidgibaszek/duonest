import {
  brushOutline, calendarClearOutline, cartOutline, checkboxOutline, filmOutline, giftOutline,
  happyOutline, heartOutline, homeOutline, musicalNotesOutline, pawOutline, restaurantOutline,
  starOutline, trophyOutline, walletOutline, appsOutline, locationOutline
} from 'ionicons/icons'
import type { DuoFeature, NestCard } from './duoPersonalization'

export const FEATURE_DETAILS: Record<DuoFeature, { label: string; icon: string }> = {
  shopping: { label: 'Zakupy', icon: cartOutline },
  tasks: { label: 'Zadania', icon: checkboxOutline },
  meals: { label: 'Obiady', icon: restaurantOutline },
  savings: { label: 'Skarbonki', icon: walletOutline },
  pet: { label: 'Zwierzak', icon: pawOutline },
  calendar: { label: 'Terminarz', icon: calendarClearOutline },
  movies: { label: 'Filmy i seriale', icon: filmOutline },
  wishlist: { label: 'Lista życzeń', icon: giftOutline }
}

export const NEST_CARD_DETAILS: Record<NestCard, { label: string; icon: string; description: string }> = {
  summary: { label: 'Podsumowanie relacji', icon: homeOutline, description: 'Czas razem i poziom Gniazdka' },
  points: { label: 'Punkty', icon: starOutline, description: 'Podział punktów za zadania' },
  rewards: { label: 'Cele i nagrody', icon: trophyOutline, description: 'Wspólne cele i ich postęp' },
  mood: { label: 'Nastrój', icon: happyOutline, description: 'Samopoczucie i ostatnia notatka' },
  music: { label: 'Muzyka', icon: musicalNotesOutline, description: 'Udostępniona aktywność muzyczna' },
  gestures: { label: 'Drobny gest', icon: heartOutline, description: 'Szybki sposób na okazanie bliskości' },
  today: { label: 'Na dziś', icon: calendarClearOutline, description: 'Najbliższe wydarzenie i zadania' },
  doodle: { label: 'Wspólny rysunek', icon: brushOutline, description: 'Szkicownik dla Was dwojga' },
  shortcuts: { label: 'Skróty', icon: appsOutline, description: 'Szybki dostęp do wybranych zakładek' },
  location: { label: 'Lokalizacja', icon: locationOutline, description: 'Odległość i ostatnia udostępniona pozycja' }
}
