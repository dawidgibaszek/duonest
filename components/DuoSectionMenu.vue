<template>
  <ion-page class="section-menu-page">
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <h1 class="dn-header-title">{{ title }}</h1>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <nav class="section-menu-list" :aria-label="navLabel">
        <NuxtLink
          v-for="feature in features"
          :key="feature"
          :to="featurePath(feature)"
          class="dn-card section-menu-tile"
          :data-feature="feature"
        >
          <span class="section-menu-tile-symbol" aria-hidden="true">
            <ion-icon :icon="FEATURE_DETAILS[feature].icon" />
          </span>
          <span class="section-menu-tile-copy">
            <span class="section-menu-tile-label">{{ FEATURE_DETAILS[feature].label }}</span>
            <span class="section-menu-tile-detail">{{ descriptions[feature] }}</span>
          </span>
          <span class="section-menu-tile-arrow" aria-hidden="true">
            <ion-icon :icon="chevronForwardOutline" />
          </span>
        </NuxtLink>
      </nav>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { chevronForwardOutline } from 'ionicons/icons'
import { type DAILY_FEATURES, type LEISURE_FEATURES, featurePath } from '~/utils/duoPersonalization'
import { FEATURE_DETAILS } from '~/utils/duoPersonalizationUi'

type SectionFeature = typeof DAILY_FEATURES[number] | typeof LEISURE_FEATURES[number]

const props = defineProps<{
  title: string
  navLabel: string
  sectionFeatures: readonly SectionFeature[]
}>()

const { isFeatureEnabled } = useDuoPersonalization()
const features = computed(() => props.sectionFeatures.filter(feature => feature === 'drawing' || isFeatureEnabled(feature)))
const descriptions: Record<SectionFeature, string> = {
  shopping: 'Wspólna lista zakupów',
  tasks: 'Rzeczy do zrobienia',
  meals: 'Plan posiłków i przepisy',
  savings: 'Cele oszczędnościowe',
  calendar: 'Plany i ważne daty',
  movies: 'Wspólna lista do obejrzenia',
  wishlist: 'Pomysły na prezenty i wspólne zakupy',
  drawing: 'Wspólne płótno i archiwum rysunków'
}
</script>

<style scoped>
.section-menu-page {
  --section-menu-gutter: clamp(16px, 5vw, 36px);
}

.dn-page-header {
  padding-inline: var(--section-menu-gutter);
}

.dn-header-title {
  margin: 0;
  font-size: clamp(32px, 5vw, 40px);
}

.section-menu-list {
  display: grid;
  gap: 12px;
  padding: 14px var(--section-menu-gutter) 0;
}

.section-menu-tile {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-height: 84px;
  margin: 0;
  padding: 12px 14px;
  border-radius: 24px;
  border-color: color-mix(in srgb, var(--tile-ink) 13%, var(--tile-surface));
  background: var(--tile-surface);
  color: var(--dn-ink);
  text-decoration: none;
  touch-action: manipulation;
}

.section-menu-tile[data-feature='shopping'] {
  --tile-surface: #eaf2e8;
  --tile-ink: #3d6146;
}

.section-menu-tile[data-feature='tasks'],
.section-menu-tile[data-feature='movies'] {
  --tile-surface: #eeebf8;
  --tile-ink: #594a86;
}

.section-menu-tile[data-feature='meals'] {
  --tile-surface: #fbece2;
  --tile-ink: #894a32;
}

.section-menu-tile[data-feature='savings'],
.section-menu-tile[data-feature='wishlist'] {
  --tile-surface: var(--dn-cream);
  --tile-ink: #735619;
}

.section-menu-tile[data-feature='calendar'] {
  --tile-surface: #e8eff9;
  --tile-ink: #3e5a85;
}

.section-menu-tile-symbol,
.section-menu-tile-arrow {
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--dn-bg) 64%, var(--tile-surface));
  color: var(--tile-ink);
}

.section-menu-tile-symbol {
  width: 50px;
  height: 50px;
  border-radius: 17px;
  font-size: 25px;
}

.section-menu-tile-arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 16px;
}

.section-menu-tile-copy {
  display: grid;
  gap: 3px;
  overflow-wrap: anywhere;
}

.section-menu-tile-label {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.2;
}

.section-menu-tile-detail {
  color: var(--tile-ink);
  font-size: 0.8125rem;
  line-height: 1.35;
}

@media (hover: hover) {
  .section-menu-tile:hover {
    background: color-mix(in srgb, var(--tile-ink) 6%, var(--tile-surface));
  }
}

.section-menu-tile:active {
  background: color-mix(in srgb, var(--tile-ink) 11%, var(--tile-surface));
}

.section-menu-tile:focus-visible {
  outline: 2px solid var(--dn-ink);
  outline-offset: 2px;
}
</style>
