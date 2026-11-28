<template>
  <ion-page class="tabs-root-page">
    <div
      ref="containerRef"
      class="tabs-touch-container"
      @scroll.passive="onContainerScroll"
    >
      <div
        ref="trackRef"
        class="tabs-track"
        :style="{ width: `${visibleTabs.length * 100}%` }"
      >
        <div v-show="visibleTabs.includes(0)" class="tab-slide" :style="slideWidth" :inert="activeTabIndex !== 0" :class="{ 'is-active': activeTabIndex === 0 }">
          <TabNest />
        </div>
        <div v-show="visibleTabs.includes(1)" class="tab-slide" :style="slideWidth" :inert="activeTabIndex !== 1" :class="{ 'is-active': activeTabIndex === 1 }">
          <Transition name="section-menu" :css="animateOrganization">
            <div v-show="!activeDailySubTab" class="subtab-fill-container" :inert="!!activeDailySubTab">
              <TabDaily />
            </div>
          </Transition>
          <Transition v-for="feature in dailyFeatures" :key="feature" name="section-view" :css="animateOrganization">
            <div
              v-show="activeDailySubTab === feature"
              class="subtab-fill-container section-view"
              :inert="activeDailySubTab !== feature"
            >
              <component :is="dailySections[feature]" />
            </div>
          </Transition>
        </div>
        <div v-show="visibleTabs.includes(2)" class="tab-slide" :style="slideWidth" :inert="activeTabIndex !== 2" :class="{ 'is-active': activeTabIndex === 2 }">
          <DuoPetTab v-if="isFeatureEnabled('pet')" :active="activeTabIndex === 2" />
        </div>
        <div v-show="visibleTabs.includes(3)" class="tab-slide" :style="slideWidth" :inert="activeTabIndex !== 3" :class="{ 'is-active': activeTabIndex === 3 }">
          <Transition name="section-menu" :css="animateLeisure">
            <div v-show="!activeLeisureSubTab" class="subtab-fill-container" :inert="!!activeLeisureSubTab">
              <TabLeisure />
            </div>
          </Transition>
          <Transition v-for="feature in leisureFeatures" :key="feature" name="section-view" :css="animateLeisure">
            <div
              v-show="activeLeisureSubTab === feature"
              class="subtab-fill-container section-view"
              :inert="activeLeisureSubTab !== feature"
            >
              <component :is="leisureSections[feature]" />
            </div>
          </Transition>
        </div>
        <div v-show="visibleTabs.includes(4)" class="tab-slide" :style="slideWidth" :inert="activeTabIndex !== 4" :class="{ 'is-active': activeTabIndex === 4 }">
          <TabRelationship />
        </div>
      </div>
    </div>

    <div class="duo-tab-bar-wrapper">
      <nav class="duo-native-tab-bar" aria-label="Menu główne">
        <button
          type="button"
          id="tab-btn-nest"
          class="duo-tab-btn"
          :aria-current="activeTabIndex === 0 ? 'page' : undefined"
          @click="goToTab(0)"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="ioniconsHome" aria-hidden="true" />
          </div>
          <span class="ion-sr-only">Gniazdko</span>
        </button>

        <button
          type="button"
          v-if="visibleTabs.includes(1)"
          id="tab-btn-daily"
          class="duo-tab-btn"
          :aria-current="activeTabIndex === 1 ? 'page' : undefined"
          @click="goToTab(1)"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="ioniconsCheckbox" aria-hidden="true" />
            <span v-if="dailyBadge > 0" class="tab-badge">
              {{ dailyBadge }}
            </span>
          </div>
          <span class="ion-sr-only">Organizacja</span>
        </button>

        <button
          type="button"
          v-if="visibleTabs.includes(2)"
          id="tab-btn-pet"
          class="duo-tab-btn"
          :aria-current="activeTabIndex === 2 ? 'page' : undefined"
          @click="goToTab(2)"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="ioniconsPaw" aria-hidden="true" />
          </div>
          <span class="ion-sr-only">Zwierzak</span>
        </button>

        <button
          type="button"
          v-if="visibleTabs.includes(3)"
          id="tab-btn-leisure"
          class="duo-tab-btn"
          :aria-current="activeTabIndex === 3 ? 'page' : undefined"
          @click="goToTab(3)"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="ioniconsSparkles" aria-hidden="true" />
            <span v-if="leisureBadge > 0" class="tab-badge">
              {{ leisureBadge }}
            </span>
          </div>
          <span class="ion-sr-only">Rozrywka</span>
        </button>

        <button
          type="button"
          id="tab-btn-relationship"
          class="duo-tab-btn"
          :aria-current="activeTabIndex === 4 ? 'page' : undefined"
          @click="goToTab(4)"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="ioniconsHeart" aria-hidden="true" />
          </div>
          <span class="ion-sr-only">Relacja</span>
        </button>
      </nav>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, type Component } from 'vue'
import { DAILY_FEATURES, LEISURE_FEATURES, featurePath } from '~/utils/duoPersonalization'
import { useDuoState } from '~/composables/useDuoState'

import TabNest from '~/pages/tabs/nest.vue'
import TabDaily from '~/pages/tabs/daily.vue'
import TabShopping from '~/pages/tabs/shopping.vue'
import TabTasks from '~/pages/tabs/tasks.vue'
import TabMeals from '~/pages/tabs/meals.vue'
import TabSavings from '~/pages/tabs/savings.vue'
import TabCalendar from '~/pages/tabs/calendar.vue'
import TabLeisure from '~/pages/tabs/leisure.vue'
import TabWishlist from '~/pages/tabs/wishlist.vue'
import TabMovies from '~/pages/tabs/movies.vue'
import TabRelationship from '~/pages/tabs/relationship.vue'

const router = useRouter()
const route = router.currentRoute
const {
  shoppingItems,
  tasksList,
  eventsList,
  wishlistItems,
  moviesList
} = useDuoState()

const pendingShoppingCount = computed(() => {
  return shoppingItems.value.filter(i => !i.is_completed).length
})

const pendingTasksCount = computed(() => {
  return tasksList.value.filter(t => !t.is_completed).length
})

const todayEventsCount = computed(() => {
  const todayStr = new Date().toISOString().split('T')[0]
  return eventsList.value.filter(e => !e.is_completed && e.start_time?.startsWith(todayStr)).length
})

const pendingWishlistCount = computed(() => {
  return wishlistItems.value.filter(w => !w.is_completed).length
})

const pendingMoviesCount = computed(() => {
  return moviesList.value.filter(m => m.status === 'planned').length
})

const TABS = ['nest', 'daily', 'pet', 'leisure', 'relationship']
const dailySections = {
  shopping: TabShopping,
  tasks: TabTasks,
  meals: TabMeals,
  savings: TabSavings,
  calendar: TabCalendar
} satisfies Record<typeof DAILY_FEATURES[number], Component>
const leisureSections = {
  movies: TabMovies,
  wishlist: TabWishlist
} satisfies Record<typeof LEISURE_FEATURES[number], Component>
const { isFeatureEnabled, enabledFeatures } = useDuoPersonalization()
const dailyFeatures = computed(() => DAILY_FEATURES.filter(isFeatureEnabled))
const leisureFeatures = computed(() => LEISURE_FEATURES.filter(isFeatureEnabled))
const tabPath = computed(() => route.value.path.replace(/\/$/, ''))
const dailyRouteFeature = computed(() => {
  const path = tabPath.value
  if (path === '/tabs/tasks' && route.value.query.view === 'pet') return undefined
  return DAILY_FEATURES.find(feature => featurePath(feature) === path)
})
const activeDailySubTab = computed(() => dailyFeatures.value.find(feature => feature === dailyRouteFeature.value))
const leisureRouteFeature = computed(() => LEISURE_FEATURES.find(feature => featurePath(feature) === tabPath.value))
const activeLeisureSubTab = computed(() => leisureFeatures.value.find(feature => feature === leisureRouteFeature.value))
const animateOrganization = ref(false)
const animateLeisure = ref(false)
const dailyBadge = computed(() => (isFeatureEnabled('shopping') ? pendingShoppingCount.value : 0)
  + (isFeatureEnabled('tasks') ? pendingTasksCount.value : 0)
  + (isFeatureEnabled('calendar') ? todayEventsCount.value : 0))
const leisureBadge = computed(() => (isFeatureEnabled('movies') ? pendingMoviesCount.value : 0)
  + (isFeatureEnabled('wishlist') ? pendingWishlistCount.value : 0))
const visibleTabs = computed(() => [
  0, ...(dailyFeatures.value.length ? [1] : []), ...(isFeatureEnabled('pet') ? [2] : []),
  ...(leisureFeatures.value.length ? [3] : []), 4
])
const slideWidth = computed(() => ({ width: `${100 / visibleTabs.value.length}%` }))

function tabPosition(index: number) {
  return visibleTabs.value.indexOf(index)
}

function updateTabUrl(index: number) {
  const target = index === 2 ? featurePath('pet')
    : `/tabs/${TABS[index]}`
  // Preserve contextual query parameters, such as the settings section.
  const currentPath = route.value.path
  const petChanged = currentPath === '/tabs/tasks' &&
    (route.value.query.view === 'pet') !== (target === featurePath('pet'))
  if (currentPath !== target.split('?')[0] || petChanged) {
    void router.replace(target)
  }
}
const activeTabIndex = ref(0)
const containerRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)

// Calculate container width safely
const getContainerWidth = () => {
  if (containerRef.value?.clientWidth) {
    return containerRef.value.clientWidth
  }
  return typeof window !== 'undefined' ? window.innerWidth : 375
}

// Direct DOM manipulation & gesture tracking (zero Vue ref updates during gesture -> solid 120 FPS)
let touchStartX = 0
let touchStartY = 0
let isDragging = false
let gestureDirection: 'horizontal' | 'vertical' | null = null
let isTouchIgnored = false
let currentTrackX = 0
let rAFId: number | null = null

interface TouchSample {
  x: number
  time: number
}
let touchHistory: TouchSample[] = []

const hasHorizontalScroll = (el: HTMLElement | null): boolean => {
  let cur = el
  while (cur && cur !== containerRef.value && cur !== document.body) {
    if (cur.scrollWidth > cur.clientWidth + 6) {
      const overflowX = window.getComputedStyle(cur).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
    cur = cur.parentElement
  }
  return false
}

// Logarithmic rubber-band resistance curve for outer edges (iOS standard)
const applyRubberBand = (distance: number, dimension: number) => {
  const abs = Math.abs(distance)
  const resisted = (abs * 0.55 * dimension) / (dimension + 0.55 * abs)
  return distance < 0 ? -resisted : resisted
}

const onTouchStart = (e: TouchEvent) => {
  gestureDirection = null
  isTouchIgnored = false
  isDragging = false

  const touch = e.touches[0]
  if (!touch) return

  // Prevent conflict with iOS Safari native back/forward edge gestures (within 20px of edge)
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 375
  if (touch.clientX < 20 || touch.clientX > screenWidth - 20) {
    isTouchIgnored = true
    return
  }

  const target = e.target as HTMLElement | null

  // Ignore touches on interactive, scrollable horizontal, or sliding components
  if (
    target?.closest('ion-item-sliding') ||
    target?.closest('.filter-scroll') ||
    target?.closest('.category-select-scroll') ||
    target?.closest('.category-filter-scroll') ||
    target?.closest('.quick-chips-row') ||
    target?.closest('.chips-scroll') ||
    target?.closest('.recurrence-options') ||
    target?.closest('.modal-ideas-chips') ||
    target?.closest('.calendar-card') ||
    target?.closest('.week-strip-card') ||
    target?.closest('.calendar-days-grid') ||
    target?.closest('[data-no-swipe]') ||
    target?.closest('input') ||
    target?.closest('textarea') ||
    target?.closest('select') ||
    target?.closest('ion-modal') ||
    target?.closest('ion-alert') ||
    target?.closest('ion-popover') ||
    target?.closest('ion-action-sheet') ||
    target?.closest('.duo-action-sheet-overlay') ||
    target?.closest('ion-range') ||
    hasHorizontalScroll(target)
  ) {
    isTouchIgnored = true
    return
  }

  touchStartX = touch.clientX
  touchStartY = touch.clientY
  const now = performance.now()
  touchHistory = [{ x: touch.clientX, time: now }]

  const width = getContainerWidth()
  currentTrackX = -tabPosition(activeTabIndex.value) * width
}

const onTouchMove = (e: TouchEvent) => {
  if (isTouchIgnored || !touchStartX) return

  const touch = e.touches[0]
  if (!touch) return

  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  // Disambiguation phase
  if (!gestureDirection) {
    if (absDx < 8 && absDy < 8) return

    // If vertical movement dominates -> native vertical scroll takes over
    if (absDy >= absDx) {
      gestureDirection = 'vertical'
      isTouchIgnored = true
      return
    }

    // Lock to horizontal swipe
    if (absDx > absDy * 1.25) {
      gestureDirection = 'horizontal'
      isDragging = true
      if (trackRef.value) {
        trackRef.value.style.transition = 'none'
      }
    } else {
      gestureDirection = 'vertical'
      isTouchIgnored = true
      return
    }
  }

  if (gestureDirection === 'horizontal') {
    // Prevent vertical scroll interruption while actively swiping tabs
    if (e.cancelable) {
      e.preventDefault()
    }

    const now = performance.now()
    touchHistory.push({ x: touch.clientX, time: now })
    // Keep only samples from last 100ms for accurate release velocity calculation
    while (touchHistory.length > 1 && now - (touchHistory[0]?.time ?? now) > 100) {
      touchHistory.shift()
    }

    const width = getContainerWidth()
    let effectiveDx = dx

    // Damping / rubber band effect at bounds
    if ((tabPosition(activeTabIndex.value) === 0 && dx > 0) || (tabPosition(activeTabIndex.value) === visibleTabs.value.length - 1 && dx < 0)) {
      effectiveDx = applyRubberBand(dx, width)
    }

    currentTrackX = -tabPosition(activeTabIndex.value) * width + effectiveDx

    // Direct GPU transform update batched with requestAnimationFrame for 120Hz display refresh
    if (rAFId === null) {
      rAFId = requestAnimationFrame(() => {
        if (trackRef.value) {
          trackRef.value.style.transform = `translate3d(${currentTrackX}px, 0, 0)`
        }
        rAFId = null
      })
    }
  }
}

const onTouchEnd = (e: TouchEvent) => {
  if (rAFId !== null) {
    cancelAnimationFrame(rAFId)
    rAFId = null
  }

  const width = getContainerWidth()

  if (isDragging) {
    isDragging = false

    const touch = e.changedTouches[0]
    const currentTouchX = touch ? touch.clientX : (touchHistory[touchHistory.length - 1]?.x ?? touchStartX)
    const totalDx = currentTouchX - touchStartX

    // Calculate release velocity using recent touch history (last 80ms)
    const now = performance.now()
    const recentPoints = touchHistory.filter(p => now - p.time <= 80)
    let velocityX = 0
    const first = recentPoints[0]
    const last = recentPoints.at(-1)
    if (first && last) {
      const dt = last.time - first.time
      if (dt > 8) {
        velocityX = (last.x - first.x) / dt // px/ms (>0 swiping right / <0 swiping left)
      }
    }

    const position = tabPosition(activeTabIndex.value)
    const direction = Math.abs(velocityX) > 0.28 ? Math.sign(velocityX)
      : Math.abs(totalDx) > width * 0.22 ? Math.sign(totalDx) : 0
    const targetIndex = visibleTabs.value[position - direction] ?? activeTabIndex.value
    const targetX = -tabPosition(targetIndex) * width
    const isSnapBack = targetIndex === activeTabIndex.value
    const speed = Math.abs(velocityX)

    let animDuration = 400
    if (isSnapBack) {
      animDuration = 340
    } else if (speed > 1.2) {
      animDuration = 340
    } else if (speed > 0.6) {
      animDuration = 380
    } else {
      animDuration = 420
    }

    if (trackRef.value) {
      // Synchronize exact position and force style flush to ensure seamless CSS transition interpolation
      trackRef.value.style.transform = `translate3d(${currentTrackX}px, 0, 0)`
      void trackRef.value.offsetWidth
      // Fluid, organic iOS easing with a gentle, soft landing (zero abrupt brake)
      trackRef.value.style.transition = `transform ${animDuration}ms cubic-bezier(0.25, 0.9, 0.3, 1)`
      trackRef.value.style.transform = `translate3d(${targetX}px, 0, 0)`
    }

    const changed = targetIndex !== activeTabIndex.value
    activeTabIndex.value = targetIndex

    if (changed) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(10) } catch {}
      }
      updateTabUrl(targetIndex)
    }
  } else {
    // If not dragging, always ensure track is securely positioned at activeTabIndex
    const targetX = -tabPosition(activeTabIndex.value) * width
    if (trackRef.value) {
      trackRef.value.style.transition = 'transform 280ms cubic-bezier(0.25, 0.9, 0.3, 1)'
      trackRef.value.style.transform = `translate3d(${targetX}px, 0, 0)`
    }
  }

  if (containerRef.value && containerRef.value.scrollLeft !== 0) {
    containerRef.value.scrollLeft = 0
  }

  touchStartX = 0
  touchStartY = 0
  gestureDirection = null
  isTouchIgnored = false
  touchHistory = []
}

const onTouchCancel = () => {
  if (rAFId !== null) {
    cancelAnimationFrame(rAFId)
    rAFId = null
  }
  isDragging = false
  const width = getContainerWidth()
  const targetX = -tabPosition(activeTabIndex.value) * width
  if (trackRef.value) {
    trackRef.value.style.transition = 'transform 340ms cubic-bezier(0.25, 0.9, 0.3, 1)'
    trackRef.value.style.transform = `translate3d(${targetX}px, 0, 0)`
  }
  if (containerRef.value && containerRef.value.scrollLeft !== 0) {
    containerRef.value.scrollLeft = 0
  }
  touchStartX = 0
  touchStartY = 0
  gestureDirection = null
  isTouchIgnored = false
  touchHistory = []
}

const goToTab = (index: number, updateUrl = true) => {
  if (!visibleTabs.value.includes(index)) return
  const oldIndex = activeTabIndex.value
  activeTabIndex.value = index

  const width = getContainerWidth()
  const targetX = -tabPosition(index) * width
  const dist = Math.abs(index - oldIndex)
  const duration = dist > 1 ? 440 : 380

  if (trackRef.value) {
    trackRef.value.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.9, 0.3, 1)`
    trackRef.value.style.transform = `translate3d(${targetX}px, 0, 0)`
  }

  if (containerRef.value && containerRef.value.scrollLeft !== 0) {
    containerRef.value.scrollLeft = 0
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(12) } catch {}
  }

  if (updateUrl) updateTabUrl(index)
}

const onContainerScroll = () => {
  if (containerRef.value && containerRef.value.scrollLeft !== 0) {
    containerRef.value.scrollLeft = 0
  }
}

const handleResize = () => {
  const width = getContainerWidth()
  const targetX = -tabPosition(activeTabIndex.value) * width
  if (trackRef.value) {
    trackRef.value.style.transition = 'none'
    trackRef.value.style.transform = `translate3d(${targetX}px, 0, 0)`
  }
}

// Synchronize active tab from initial route URL
const syncTabFromRoute = (animate: boolean = false) => {
  const path = route.value.path
  let idx = 0

  if (path.includes('nest')) {
    idx = 0
  } else if (path.includes('tasks') && route.value.query.view === 'pet') {
    idx = 2
  } else if (dailyRouteFeature.value || path.includes('daily')) {
    idx = 1
  } else if (leisureRouteFeature.value || tabPath.value === '/tabs/leisure') {
    idx = 3
  } else if (path.includes('relationship')) {
    idx = 4
  }

  if (!visibleTabs.value.includes(idx)) idx = 0
  if (animate) {
    if (idx !== activeTabIndex.value) goToTab(idx, false)
    return
  }
  activeTabIndex.value = idx
  handleResize()
}

onMounted(() => {
  syncTabFromRoute(false)

  const el = containerRef.value
  if (el) {
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })
  }

  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', handleResize)
})

onUnmounted(() => {
  if (rAFId !== null) {
    cancelAnimationFrame(rAFId)
    rAFId = null
  }

  const el = containerRef.value
  if (el) {
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchCancel)
  }

  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orientationchange', handleResize)
})

watch(() => route.value.fullPath, () => syncTabFromRoute(true))
watch([() => route.value.name, activeDailySubTab], ([name, feature], [previousName, previousFeature]) => {
  animateOrganization.value = (previousName === 'tabs-daily' && !!feature)
    || (name === 'tabs-daily' && !!previousFeature)
})

watch([() => route.value.name, activeLeisureSubTab], ([name, feature], [previousName, previousFeature]) => {
  animateLeisure.value = (previousName === 'tabs-leisure' && !!feature)
    || (name === 'tabs-leisure' && !!previousFeature)
})

watch(enabledFeatures, () => {
  if (!visibleTabs.value.includes(activeTabIndex.value)) goToTab(0)
  else {
    if (activeTabIndex.value === 1 && dailyRouteFeature.value && !activeDailySubTab.value) updateTabUrl(1)
    if (activeTabIndex.value === 3 && leisureRouteFeature.value && !activeLeisureSubTab.value) updateTabUrl(3)
    handleResize()
  }
})
</script>

<style scoped>
.tabs-root-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background-color: var(--dn-bg);
}

.tabs-touch-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: clip;
  overflow-x: clip;
  overflow-y: clip;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.tabs-track {
  display: flex;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  transform: translate3d(0, 0, 0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-perspective: 1000;
  perspective: 1000;
}

.tab-slide {
  flex-shrink: 0;
  height: 100%;
  position: relative;
  overflow: hidden;
  contain: layout style;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
}

.subtab-fill-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.section-view {
  z-index: 1;
  background: var(--dn-bg);
}

.section-menu-enter-active,
.section-menu-leave-active,
.section-view-enter-active,
.section-view-leave-active {
  transition: transform 340ms cubic-bezier(0.25, 0.9, 0.3, 1);
}

.section-menu-enter-from,
.section-menu-leave-to {
  transform: translate3d(-24%, 0, 0);
}

.section-view-enter-from,
.section-view-leave-to {
  transform: translate3d(100%, 0, 0);
}

@media (prefers-reduced-motion: reduce) {
  .section-menu-enter-active,
  .section-menu-leave-active,
  .section-view-enter-active,
  .section-view-leave-active {
    transition: none;
  }
}

.tab-slide :deep(ion-page) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.tab-slide :deep(ion-page > ion-content) {
  --padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px));
}

.duo-tab-bar-wrapper {
  position: absolute;
  bottom: max(12px, env(safe-area-inset-bottom, 0px));
  left: max(16px, env(safe-area-inset-left, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  z-index: 1000;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.duo-native-tab-bar {
  pointer-events: auto;
  box-sizing: border-box;
  width: min(100%, 430px);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border: 1px solid var(--dn-line);
  border-radius: 999px;
  background: var(--dn-bg);
  box-shadow: 0 8px 24px rgba(28, 27, 25, 0.09), 0 2px 6px rgba(28, 27, 25, 0.04);
}

.duo-tab-btn {
  --tab-surface: var(--dn-bg);
  flex: 1 1 0;
  min-width: 0;
  min-height: 50px;
  display: grid;
  place-items: center;
  background: var(--tab-surface);
  border: none;
  border-radius: 999px;
  padding: 0;
  cursor: pointer;
  color: var(--dn-ink-soft);
  touch-action: manipulation;
  transition: background-color 0.2s ease, color 0.2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.duo-tab-btn[aria-current="page"] {
  --tab-surface: var(--dn-cream);
  color: var(--dn-ink);
}

.duo-tab-btn:active {
  --tab-surface: var(--dn-soft-press);
}

.duo-tab-btn:focus-visible {
  outline: 2px solid var(--dn-ink);
  outline-offset: -2px;
}

.tab-icon-wrap {
  position: relative;
  display: grid;
  place-items: center;
  font-size: 25px;
}

.duo-tab-btn .ion-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.tab-badge {
  position: absolute;
  top: -6px;
  left: 17px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  border-radius: 999px;
  color: var(--dn-bg);
  background: var(--dn-ink);
  box-shadow: 0 0 0 2px var(--tab-surface);
  line-height: 1;
}

@media (prefers-reduced-motion: reduce) {
  .duo-tab-btn {
    transition: none;
  }
}
</style>
