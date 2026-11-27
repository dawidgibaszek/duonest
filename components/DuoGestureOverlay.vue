<template>
  <Teleport to="body">
    <div
      v-if="activeGestureAnimations.length > 0"
      class="dn-gesture-stage"
      aria-hidden="true"
    >
      <div
        v-for="gesture in activeGestureAnimations"
        :key="gesture.instanceId"
        class="dn-gesture-screen"
        :class="`is-${themeOf(gesture.nudge_type)}`"
      >
        <span
          v-for="particle in particlesFor(gesture)"
          :key="particle.id"
          class="dn-gesture-icon"
          :class="`anim-${themeOf(gesture.nudge_type)}`"
          :style="{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            '--g-dx': `${particle.dx}vw`,
            '--g-dy': `${particle.dy}vh`,
            '--g-rot': `${particle.rot}deg`,
            '--g-scale': String(particle.scale),
            '--g-accent': gesture.accentColor
          }"
        >
          <DuoIcon :name="particle.icon" :size="particle.size" />
        </span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import DuoIcon from '~/components/DuoIcon.vue'
import type { ActiveGestureAnimation } from '~/composables/duo/state'
import { MAX_PENDING_PARTNER_GESTURES } from '~/composables/duo/useNudges'
import { useDuoState } from '~/composables/useDuoState'
import { getDuoGestureMeta } from '~/utils/duoGestures'

const route = useRoute()
const {
  nudgesList,
  activeGestureAnimations,
  consumePendingPartnerGesture,
  currentUser,
  partnerUser,
  partnership,
  isPaired,
  isAuthLoading,
  isLoggingOut,
  partnerGrammar,
  partnerDisplayName,
  formatPartnerVerb,
  triggerToast
} = useDuoState()

const isForeground = ref(typeof document === 'undefined' ? true : document.visibilityState === 'visible')
const announcedInstances = new Set<string>()

let appStateHandle: PluginListenerHandle | undefined
let disposed = false

function themeOf(rawType?: string | null) {
  const type = String(rawType || 'love').toLowerCase()
  if (type === 'hug' || type === 'kiss' || type === 'tea' || type === 'love' || type === 'massage') {
    return type
  }
  return 'love'
}

interface GestureParticle {
  id: number
  icon: string
  x: number
  y: number
  size: number
  delay: number
  duration: number
  dx: number
  dy: number
  rot: number
  scale: number
}

const THEME_ICONS: Record<string, string[]> = {
  hug: ['nudge-hug', 'mood-loved'],
  kiss: ['nudge-kiss', 'mood-romantic'],
  tea: ['nudge-tea', 'mood-cozy'],
  love: ['nudge-love', 'mood-romantic', 'mood-loved'],
  massage: ['nudge-massage', 'sparkle']
}

function seedFromString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function particlesFor(gesture: ActiveGestureAnimation): GestureParticle[] {
  const theme = themeOf(gesture.nudge_type)
  const iconSet = THEME_ICONS[theme] || THEME_ICONS.love
  const seed = seedFromString(gesture.instanceId)
  const count = 26

  return Array.from({ length: count }, (_, idx) => {
    const col = idx % 6
    const row = Math.floor(idx / 6)
    const jitterX = (((idx * 37) + seed) % 16) - 8
    const jitterY = (((idx * 29) + seed) % 16) - 8

    const x = Math.min(94, Math.max(6, 8 + col * 16.5 + jitterX))
    const y = theme === 'kiss' || theme === 'tea'
      ? 68 + (((idx * 17) + seed) % 28)
      : Math.min(92, Math.max(10, 14 + row * 17 + jitterY))

    const sway = (((idx + seed) % 2 === 0 ? 1 : -1) * (4 + ((idx + seed) % 4) * 3))
    const dy = theme === 'kiss' || theme === 'tea'
      ? -(68 + (((idx * 13) + seed) % 28))
      : -(36 + (((idx * 11) + seed) % 30))

    return {
      id: idx,
      icon: iconSet[(idx + seed) % iconSet.length] || 'nudge-love',
      x,
      y,
      size: 26 + (((idx * 13) + seed) % 34),
      delay: ((idx * 17) % 10) * 0.06,
      duration: 1.9 + (((idx * 7) + seed) % 6) * 0.14,
      dx: sway,
      dy,
      rot: (((idx + seed) % 2 === 0 ? 1 : -1) * (10 + ((idx + seed) % 5) * 6)),
      scale: 0.95 + ((idx + seed) % 4) * 0.14
    }
  })
}

const canPlayForegroundGesture = computed(() =>
  isForeground.value &&
  !isAuthLoading.value &&
  !isLoggingOut.value &&
  isPaired.value &&
  route.path.startsWith('/tabs')
)

const replay = ref({ since: Date.now(), remaining: MAX_PENDING_PARTNER_GESTURES })
watch([canPlayForegroundGesture, () => currentUser.value?.id, () => partnership.value?.id], () => {
  replay.value = { since: Date.now(), remaining: MAX_PENDING_PARTNER_GESTURES }
})

watch(
  [nudgesList, replay, () => activeGestureAnimations.value.some(gesture => !gesture.isOwn)],
  ([rows, session]) => {
    if (canPlayForegroundGesture.value) consumePendingPartnerGesture(rows, session)
  },
  { immediate: true }
)

watch(
  activeGestureAnimations,
  (list) => {
    const latest = list[list.length - 1]
    if (!latest || announcedInstances.has(latest.instanceId)) return
    announcedInstances.add(latest.instanceId)
    if (announcedInstances.size > 60) {
      const oldestKey = announcedInstances.values().next().value
      if (oldestKey) announcedInstances.delete(oldestKey)
    }

    if (!latest.isOwn && Date.parse(latest.created_at || '') >= replay.value.since) {
      const meta = getDuoGestureMeta(latest.nudge_type)
      const verb = formatPartnerVerb('przesłał')
      const subject = partnerUser.value?.name?.trim() || partnerDisplayName.value
      const label = !partnerUser.value?.name && partnerGrammar.value === 'impersonal'
        ? `Przesłano gest: ${meta.title}`
        : `${subject} ${verb}: ${meta.title}`
      triggerToast(latest.message ? `${label} — ${latest.message}` : label, { type: 'love' })
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([16, 40, 20])
      } catch {}
    }
  },
  { flush: 'post' }
)

function onVisibilityChange() {
  isForeground.value = document.visibilityState === 'visible'
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => {
      isForeground.value = isActive
    }).then((listener) => {
      if (disposed) void listener.remove()
      else appStateHandle = listener
    }).catch(() => {})
  }
})

onBeforeUnmount(() => {
  disposed = true
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
  void appStateHandle?.remove()
})
</script>

<style scoped>
.dn-gesture-stage {
  position: fixed;
  inset: 0;
  z-index: 25000;
  pointer-events: none;
  overflow: hidden;
}

.dn-gesture-screen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.dn-gesture-icon {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--g-accent, var(--dn-ink));
  opacity: 0;
  will-change: transform, opacity;
  filter: drop-shadow(0 6px 14px rgba(28, 27, 25, 0.12));
}

.dn-gesture-screen.is-kiss .dn-gesture-icon,
.dn-gesture-screen.is-love .dn-gesture-icon {
  color: #c2412d;
}

.dn-gesture-screen.is-hug .dn-gesture-icon {
  color: var(--dn-ink);
}

.dn-gesture-screen.is-tea .dn-gesture-icon {
  color: #7a6a48;
}

.dn-gesture-screen.is-massage .dn-gesture-icon {
  color: var(--g-accent, #0d9488);
}

.dn-gesture-icon.anim-kiss {
  animation: dnEffectRise both cubic-bezier(0.22, 1, 0.36, 1);
}

.dn-gesture-icon.anim-tea {
  animation: dnEffectSteam both ease-out;
}

.dn-gesture-icon.anim-love {
  animation: dnEffectBloom both cubic-bezier(0.16, 1, 0.3, 1);
}

.dn-gesture-icon.anim-hug {
  animation: dnEffectSway both ease-in-out;
}

.dn-gesture-icon.anim-massage {
  animation: dnEffectGlide both ease-in-out;
}

@keyframes dnEffectRise {
  0% {
    opacity: 0;
    transform: translate3d(0, 12vh, 0) scale(0.35) rotate(0deg);
  }
  16% {
    opacity: 0.92;
    transform: translate3d(calc(var(--g-dx) * 0.25), calc(var(--g-dy) * 0.15), 0) scale(var(--g-scale)) rotate(calc(var(--g-rot) * 0.4));
  }
  78% {
    opacity: 0.86;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--g-dx), var(--g-dy), 0) scale(calc(var(--g-scale) * 0.9)) rotate(var(--g-rot));
  }
}

@keyframes dnEffectSteam {
  0% {
    opacity: 0;
    transform: translate3d(0, 10vh, 0) scale(0.45) rotate(-6deg);
  }
  20% {
    opacity: 0.88;
  }
  55% {
    transform: translate3d(calc(var(--g-dx) * 0.7), calc(var(--g-dy) * 0.55), 0) scale(var(--g-scale)) rotate(6deg);
  }
  100% {
    opacity: 0;
    transform: translate3d(calc(var(--g-dx) * -0.4), var(--g-dy), 0) scale(calc(var(--g-scale) * 0.92)) rotate(-4deg);
  }
}

@keyframes dnEffectBloom {
  0% {
    opacity: 0;
    transform: translate3d(0, 4vh, 0) scale(0.2) rotate(0deg);
  }
  22% {
    opacity: 0.95;
    transform: translate3d(calc(var(--g-dx) * 0.3), calc(var(--g-dy) * 0.25), 0) scale(calc(var(--g-scale) * 1.18)) rotate(calc(var(--g-rot) * 0.5));
  }
  75% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--g-dx), var(--g-dy), 0) scale(calc(var(--g-scale) * 0.85)) rotate(var(--g-rot));
  }
}

@keyframes dnEffectSway {
  0% {
    opacity: 0;
    transform: translate3d(-4vw, 8vh, 0) scale(0.45);
  }
  22% {
    opacity: 0.9;
  }
  58% {
    transform: translate3d(4vw, calc(var(--g-dy) * 0.55), 0) scale(var(--g-scale)) rotate(var(--g-rot));
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--g-dx), var(--g-dy), 0) scale(0.85) rotate(0deg);
  }
}

@keyframes dnEffectGlide {
  0% {
    opacity: 0;
    transform: translate3d(calc(var(--g-dx) * -0.6), 6vh, 0) scale(0.4);
  }
  25% {
    opacity: 0.86;
  }
  75% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--g-dx), calc(var(--g-dy) * 0.85), 0) scale(var(--g-scale)) rotate(var(--g-rot));
  }
}

@media (prefers-reduced-motion: reduce) {
  .dn-gesture-icon {
    animation-duration: 0.6s !important;
  }
}
</style>
