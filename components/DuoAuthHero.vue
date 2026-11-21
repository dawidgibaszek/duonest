<template>
  <div class="dn-hero" :class="bare ? 'dn-hero--bare' : 'dn-hero--panel'">
    <!-- SCATTER: "artistic mess" – tiles of different sizes, tilted and loosely overlapping -->
    <div v-if="layout === 'scatter'" class="dn-hero-scatter" aria-hidden="true">
      <div
        v-for="(tile, i) in visibleTiles"
        :key="i"
        class="dn-hero-tile dn-hero-tile--scatter"
        :style="scatterStyle(tile, i)"
      >
        <img v-if="tile.image" :src="tile.image" alt="" class="dn-hero-tile-img" />
        <ion-icon v-else-if="tile.icon" :icon="tile.icon" />
      </div>
    </div>

    <!-- STACK: tidy pyramid (1 on top, 2 below) -->
    <div v-else class="dn-hero-tiles" :class="`dn-hero-tiles--${Math.min(tiles.length, 3)}`" aria-hidden="true">
      <div
        v-for="(tile, i) in tiles"
        :key="i"
        class="dn-hero-tile"
        :style="{ '--tile-color': tile.color || 'var(--dn-auth-ink)', '--tile-delay': `${i * -1.7}s` }"
      >
        <img v-if="tile.image" :src="tile.image" alt="" class="dn-hero-tile-img" />
        <ion-icon v-else-if="tile.icon" :icon="tile.icon" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export interface DuoAuthHeroTile {
  icon?: string
  image?: string
  color?: string
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  tiles: DuoAuthHeroTile[]
  layout?: 'stack' | 'scatter'
  /** Bare = small inline illustration on white (forms). Panel = big cream hero (welcome screen). */
  bare?: boolean
}>(), {
  layout: 'scatter',
  bare: false
})

type Slot = { x: number; y: number; s: number; r: number; z: number }

/**
 * Hand-placed slots for the scatter layout, per tile count.
 * x / y = tile centre in % of the stage, s = size relative to --tile, r = tilt in degrees.
 * The first tile is always the large "hero" one.
 */
const SCATTER_SLOTS: Record<number, Slot[]> = {
  1: [{ x: 50, y: 50, s: 1.25, r: -7, z: 1 }],
  2: [
    { x: 40, y: 56, s: 1.15, r: -8, z: 2 },
    { x: 72, y: 34, s: 0.85, r: 10, z: 1 }
  ],
  3: [
    { x: 50, y: 60, s: 1.15, r: -7, z: 2 },
    { x: 81, y: 30, s: 0.78, r: 12, z: 1 },
    { x: 18, y: 38, s: 0.7, r: -13, z: 3 }
  ],
  4: [
    { x: 43, y: 52, s: 1.18, r: -8, z: 3 },
    { x: 72, y: 25, s: 0.84, r: 11, z: 2 },
    { x: 77, y: 72, s: 1.0, r: 5, z: 4 },
    { x: 15, y: 30, s: 0.68, r: -15, z: 1 }
  ],
  5: [
    { x: 43, y: 52, s: 1.18, r: -8, z: 3 },
    { x: 72, y: 25, s: 0.84, r: 11, z: 2 },
    { x: 77, y: 72, s: 1.0, r: 5, z: 4 },
    { x: 15, y: 24, s: 0.64, r: -15, z: 1 },
    { x: 14, y: 76, s: 0.74, r: 13, z: 2 }
  ]
}

const visibleTiles = computed(() => props.tiles.slice(0, 5))

const scatterStyle = (tile: DuoAuthHeroTile, i: number) => {
  const slots = SCATTER_SLOTS[Math.max(1, visibleTiles.value.length)]
  const slot = slots[i]
  return {
    '--tile-color': tile.color || 'var(--dn-auth-ink)',
    '--tile-delay': `${i * -1.3}s`,
    '--s': slot.s,
    '--r': `${slot.r}deg`,
    left: `${slot.x}%`,
    top: `${slot.y}%`,
    zIndex: slot.z
  }
}
</script>

<style scoped>
.dn-hero {
  --tile: 84px;
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Big cream panel – welcome screen only */
.dn-hero--panel {
  --tile: 90px;
  height: calc(clamp(300px, 50vh, 440px) + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  background: var(--dn-auth-cream);
  border-radius: 0 0 44px 44px;
  overflow: hidden;
}

/* Small inline illustration on white – login, register, pairing, reset, verified */
.dn-hero--bare {
  --tile: 54px;
  padding: 18px 0 8px;
}

/* ---------- Stack layout ---------- */
.dn-hero-tiles {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: repeat(2, var(--tile));
  gap: calc(var(--tile) * 0.2) calc(var(--tile) * 0.24);
  justify-items: center;
  margin-bottom: calc(var(--tile) * 0.35);
}

.dn-hero-tiles--1 {
  grid-template-columns: var(--tile);
}

.dn-hero-tiles--3 .dn-hero-tile:first-child {
  grid-column: 1 / -1;
}

/* ---------- Scatter layout ---------- */
.dn-hero-scatter {
  position: relative;
  isolation: isolate;
  width: calc(var(--tile) * 3.8);
  height: calc(var(--tile) * 2.7);
}

.dn-hero--panel .dn-hero-scatter {
  margin-bottom: calc(var(--tile) * 0.15);
}

/* Beige "plate" the tiles rest on (panel only) */
.dn-hero--panel .dn-hero-tiles::before,
.dn-hero--panel .dn-hero-scatter::before {
  content: '';
  position: absolute;
  z-index: -1;
  left: 50%;
  bottom: calc(var(--tile) * -0.5);
  width: calc(var(--tile) * 3.3);
  height: calc(var(--tile) * 1.15);
  transform: translateX(-50%);
  border-radius: 50%;
  background: var(--dn-auth-plate);
}

.dn-hero--panel .dn-hero-scatter::before {
  bottom: calc(var(--tile) * -0.25);
  width: calc(var(--tile) * 3.9);
  height: calc(var(--tile) * 1.25);
}

/* ---------- Tiles ---------- */
.dn-hero-tile {
  width: var(--tile);
  height: var(--tile);
  border-radius: calc(var(--tile) * 0.26);
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 1px 0 rgba(28, 27, 25, 0.03),
    0 12px 24px -14px rgba(28, 27, 25, 0.22);
  animation: dnTileFloat 5.2s ease-in-out infinite;
  animation-delay: var(--tile-delay);
}

.dn-hero-tile ion-icon {
  font-size: calc(var(--tile) * 0.46);
  color: var(--tile-color);
}

.dn-hero-tile--scatter {
  position: absolute;
  width: calc(var(--tile) * var(--s));
  height: calc(var(--tile) * var(--s));
  margin: calc(var(--tile) * var(--s) / -2) 0 0 calc(var(--tile) * var(--s) / -2);
  border-radius: calc(var(--tile) * var(--s) * 0.27);
  transform: rotate(var(--r));
  box-shadow:
    0 1px 0 rgba(28, 27, 25, 0.03),
    0 14px 26px -14px rgba(28, 27, 25, 0.28);
  animation-name: dnTileDrift;
  animation-duration: 6s;
}

.dn-hero-tile--scatter ion-icon {
  font-size: calc(var(--tile) * var(--s) * 0.46);
}

/* On white, tiles get a soft tint of their own colour – like the coloured bubbles in the inspiration */
.dn-hero--bare .dn-hero-tile {
  background: var(--dn-auth-soft);
  background: color-mix(in srgb, var(--tile-color) 13%, #ffffff);
  box-shadow: none;
}

.dn-hero-tile-img {
  width: 62%;
  height: 62%;
  object-fit: contain;
  border-radius: 22%;
}

@keyframes dnTileFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* Keeps each tile's own tilt while it drifts */
@keyframes dnTileDrift {
  0%, 100% { transform: translateY(0) rotate(var(--r)); }
  50% { transform: translateY(-5px) rotate(calc(var(--r) * 0.7)); }
}

@media (prefers-reduced-motion: reduce) {
  .dn-hero-tile {
    animation: none;
  }
}
</style>
