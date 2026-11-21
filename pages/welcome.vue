<template>
  <ion-page>
    <ion-content :fullscreen="true" class="dn-auth-content dn-auth-content--hero">
      <div class="dn-auth-page">
        <DuoAuthHero :tiles="heroTiles" layout="scatter" />

        <div class="dn-auth-body dn-auth-body--after-hero">
          <header class="dn-auth-heading welcome-heading">
            <h1 class="dn-auth-title">Witaj w DuoNest</h1>
            <p class="dn-auth-subtitle">
              Zakupy, obowiązki, plany i wspólne chwile – jedno gniazdko dla Was dwojga.
            </p>
          </header>

          <div class="welcome-actions">
            <button type="button" class="dn-auth-btn" @click="goTo('register')">
              Załóż konto
            </button>
            <button type="button" class="dn-auth-btn dn-auth-btn--outline" @click="goTo('login')">
              Mam już konto
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  heart as ioniconsHeart,
  cart as ioniconsCart,
  calendar as ioniconsCalendar,
  film as ioniconsFilm,
  restaurant as ioniconsRestaurant
} from 'ionicons/icons'
import type { DuoAuthHeroTile } from '~/components/DuoAuthHero.vue'

const heroTiles: DuoAuthHeroTile[] = [
  { icon: ioniconsHeart, color: '#e5484d' },
  { icon: ioniconsCart, color: '#2f9e44' },
  { icon: ioniconsCalendar, color: '#3b82f6' },
  { icon: ioniconsFilm, color: '#7c5cff' },
  { icon: ioniconsRestaurant, color: '#e8a33d' }
]

const goTo = (mode: 'login' | 'register') => {
  navigateTo(mode === 'register' ? '/login?mode=register' : '/login')
}
</script>

<style scoped>
.welcome-heading {
  margin-bottom: 28px;
}

.welcome-actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
