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
          <div v-show="activeDailySubTab === 'shopping'" class="subtab-fill-container">
            <TabShopping v-if="isFeatureEnabled('shopping')" />
          </div>
          <div v-show="activeDailySubTab === 'tasks'" class="subtab-fill-container">
            <TabTasks v-if="isFeatureEnabled('tasks') || isFeatureEnabled('pet')" />
          </div>
          <div v-show="activeDailySubTab === 'meals'" class="subtab-fill-container">
            <TabMeals v-if="isFeatureEnabled('meals')" />
          </div>
          <div v-show="activeDailySubTab === 'savings'" class="subtab-fill-container">
            <TabSavings v-if="isFeatureEnabled('savings')" />
          </div>
        </div>
        <div v-show="visibleTabs.includes(2)" class="tab-slide" :style="slideWidth" :inert="activeTabIndex !== 2" :class="{ 'is-active': activeTabIndex === 2 }">
          <TabCalendar v-if="isFeatureEnabled('calendar')" />
        </div>
        <div v-show="visibleTabs.includes(3)" class="tab-slide" :style="slideWidth" :inert="activeTabIndex !== 3" :class="{ 'is-active': activeTabIndex === 3 }">
          <div v-show="activeLeisureSubTab === 'movies'" class="subtab-fill-container">
            <TabMovies v-if="isFeatureEnabled('movies')" />
          </div>
          <div v-show="activeLeisureSubTab === 'wishlist'" class="subtab-fill-container">
            <TabWishlist v-if="isFeatureEnabled('wishlist')" />
          </div>
        </div>
        <div v-show="visibleTabs.includes(4)" class="tab-slide" :style="slideWidth" :inert="activeTabIndex !== 4" :class="{ 'is-active': activeTabIndex === 4 }">
          <TabRelationship />
        </div>
      </div>
    </div>

    <!-- DuoNest bottom navigation: outline icons, active item in ink (inspiration/menu style.png) -->
    <div class="duo-tab-bar-wrapper">
      <nav class="duo-native-tab-bar">
        <button
          type="button"
          id="tab-btn-nest"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 0 }"
          @click="goToTab(0)"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="ioniconsHomeOutline" />
          </div>
          <span class="tab-title">Gniazdko</span>
        </button>

        <button
          type="button"
          v-if="visibleTabs.includes(1)"
          id="tab-btn-daily"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 1 }"
          @click="handleDailyTabClick"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="dailyFeatures.length === 1 && dailyFeatures[0] ? FEATURE_DETAILS[dailyFeatures[0]].icon : ioniconsCheckboxOutline" />
            <span v-if="dailyBadge > 0" class="tab-badge primary-badge">
              {{ dailyBadge }}
            </span>
          </div>
          <span class="tab-title">{{ dailyFeatures.length === 1 && dailyFeatures[0] ? FEATURE_DETAILS[dailyFeatures[0]].label : 'Organizacja' }}</span>
        </button>

        <button
          type="button"
          v-if="visibleTabs.includes(2)"
          id="tab-btn-calendar"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 2 }"
          @click="goToTab(2)"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="ioniconsCalendarClearOutline" />
            <span v-if="todayEventsCount > 0" class="tab-badge primary-badge">
              {{ todayEventsCount }}
            </span>
          </div>
          <span class="tab-title">Terminarz</span>
        </button>

        <button
          type="button"
          v-if="visibleTabs.includes(3)"
          id="tab-btn-leisure"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 3 }"
          @click="handleLeisureTabClick"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="leisureFeatures.length === 1 && leisureFeatures[0] ? FEATURE_DETAILS[leisureFeatures[0]].icon : ioniconsFilmOutline" />
            <span v-if="leisureBadge > 0" class="tab-badge primary-badge">
              {{ leisureBadge }}
            </span>
          </div>
          <span class="tab-title">{{ leisureFeatures.length === 1 && leisureFeatures[0] ? FEATURE_DETAILS[leisureFeatures[0]].label : 'Rozrywka' }}</span>
        </button>

        <button
          type="button"
          id="tab-btn-relationship"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 4 }"
          @click="goToTab(4)"
        >
          <div class="tab-icon-wrap">
            <ion-icon :icon="ioniconsHeartOutline" />
          </div>
          <span class="tab-title">Relacja</span>
        </button>
      </nav>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { DAILY_FEATURES, LEISURE_FEATURES, featurePath } from '~/utils/duoPersonalization'
import { FEATURE_DETAILS } from '~/utils/duoPersonalizationUi'
import { useDuoState } from '~/composables/useDuoState'

import TabNest from '~/pages/tabs/nest.vue'
import TabShopping from '~/pages/tabs/shopping.vue'
import TabTasks from '~/pages/tabs/tasks.vue'
import TabMeals from '~/pages/tabs/meals.vue'
import TabSavings from '~/pages/tabs/savings.vue'
import TabCalendar from '~/pages/tabs/calendar.vue'
import TabWishlist from '~/pages/tabs/wishlist.vue'
import TabMovies from '~/pages/tabs/movies.vue'
import TabRelationship from '~/pages/tabs/relationship.vue'

const route = useRoute()
const router = useRouter()
const {
  shoppingItems,
  tasksList,
  eventsList,
  wishlistItems,
  moviesList,
  activeDailySubTab,
  activeTasksMainTab,
  activeLeisureSubTab
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

const TABS = ['nest', 'daily', 'calendar', 'leisure', 'relationship']
const { isFeatureEnabled, enabledFeatures } = useDuoPersonalization()
const dailyFeatures = computed(() => DAILY_FEATURES.filter(isFeatureEnabled))
const leisureFeatures = computed(() => LEISURE_FEATURES.filter(isFeatureEnabled))
const dailyBadge = computed(() => (isFeatureEnabled('shopping') ? pendingShoppingCount.value : 0)
  + (isFeatureEnabled('tasks') ? pendingTasksCount.value : 0))
const leisureBadge = computed(() => (isFeatureEnabled('movies') ? pendingMoviesCount.value : 0)
  + (isFeatureEnabled('wishlist') ? pendingWishlistCount.value : 0))
const visibleTabs = computed(() => [
  0, ...(dailyFeatures.value.length ? [1] : []), ...(isFeatureEnabled('calendar') ? [2] : []),
  ...(leisureFeatures.value.length ? [3] : []), 4
])
const slideWidth = computed(() => ({ width: `${100 / visibleTabs.value.length}%` }))
const dailyFeature = computed(() => activeDailySubTab.value === 'tasks' ? activeTasksMainTab.value : activeDailySubTab.value)

function selectDaily(feature: typeof DAILY_FEATURES[number]) {
  if (feature === 'tasks' || feature === 'pet') activeTasksMainTab.value = feature
  activeDailySubTab.value = feature === 'pet' ? 'tasks' : feature
}

function normalizeSubTabs() {
  const firstDaily = dailyFeatures.value[0]
  if (firstDaily && !isFeatureEnabled(dailyFeature.value)) selectDaily(firstDaily)
  const firstLeisure = leisureFeatures.value[0]
  if (firstLeisure && !isFeatureEnabled(activeLeisureSubTab.value)) activeLeisureSubTab.value = firstLeisure
}

function tabPosition(index: number) {
  return visibleTabs.value.indexOf(index)
}

function updateTabUrl(index: number) {
  const target = index === 1 ? featurePath(dailyFeature.value)
    : index === 3 ? featurePath(activeLeisureSubTab.value)
      : `/tabs/${TABS[index]}`
  // Preserve contextual query parameters, such as the settings section.
  const currentPath = route.path
  const petChanged = currentPath === '/tabs/tasks' &&
    (route.query.view === 'pet') !== (target === featurePath('pet'))
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
  normalizeSubTabs()
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

const handleDailyTabClick = () => {
  if (activeTabIndex.value === 1) {
    const next = dailyFeatures.value[(dailyFeatures.value.indexOf(dailyFeature.value) + 1) % dailyFeatures.value.length]
    if (next) selectDaily(next)
  } else {
    goToTab(1)
  }
}

const handleLeisureTabClick = () => {
  if (activeTabIndex.value === 3) {
    const next = leisureFeatures.value[(leisureFeatures.value.indexOf(activeLeisureSubTab.value) + 1) % leisureFeatures.value.length]
    if (next) activeLeisureSubTab.value = next
  } else {
    goToTab(3)
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
  const path = route?.path || (typeof window !== 'undefined' ? window.location.pathname : '')
  let idx = 0

  if (path.includes('nest')) {
    idx = 0
  } else if (path.includes('shopping')) {
    idx = 1
    activeDailySubTab.value = 'shopping'
  } else if (path.includes('tasks')) {
    idx = 1
    selectDaily(route.query.view === 'pet' ? 'pet' : 'tasks')
  } else if (path.includes('meals') || path.includes('dinner')) {
    idx = 1
    activeDailySubTab.value = 'meals'
  } else if (path.includes('savings') || path.includes('budget') || path.includes('skarbonki')) {
    idx = 1
    activeDailySubTab.value = 'savings'
  } else if (path.includes('daily') || path.includes('organization') || path.includes('organizacja')) {
    idx = 1
  } else if (path.includes('calendar')) {
    idx = 2
  } else if (path.includes('movies')) {
    idx = 3
    activeLeisureSubTab.value = 'movies'
  } else if (path.includes('wishlist')) {
    idx = 3
    activeLeisureSubTab.value = 'wishlist'
  } else if (path.includes('leisure')) {
    idx = 3
  } else if (path.includes('relationship')) {
    idx = 4
  }

  normalizeSubTabs()
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

watch(() => route.fullPath, () => syncTabFromRoute(true))

watch(dailyFeature, () => {
  if (activeTabIndex.value === 1) updateTabUrl(1)
})
watch(activeLeisureSubTab, () => {
  if (activeTabIndex.value === 3) updateTabUrl(3)
})

watch(enabledFeatures, () => {
  normalizeSubTabs()
  if (!visibleTabs.value.includes(activeTabIndex.value)) goToTab(0)
  else handleResize()
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
  background-color: #f8f9fb;
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

/* ── DOCKED BOTTOM TAB BAR (inspiration/menu style.png) ── */

.duo-tab-bar-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 1000;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.duo-native-tab-bar {
  pointer-events: auto;
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  padding: 10px 8px calc(8px + env(safe-area-inset-bottom, 0px));
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -1px 0 var(--dn-line), 0 -8px 24px rgba(28, 27, 25, 0.04);
}

.duo-tab-btn {
  flex: 1;
  max-width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 2px 0;
  cursor: pointer;
  color: #b4b8c0;
  transition: color 0.2s ease, transform 0.15s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}

.duo-tab-btn:active {
  transform: scale(0.94);
}

.duo-tab-btn.is-active {
  color: var(--dn-ink);
}

.tab-icon-wrap {
  position: relative;
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 32px;
  border-radius: 999px;
  transition: background 0.2s ease;
}

/* Beige accent pill behind the active tab icon */
.duo-tab-btn.is-active .tab-icon-wrap {
  background: var(--dn-cream);
}

.tab-icon-wrap ion-icon {
  --ionicon-stroke-width: 28px;
}

.tab-title {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.3;
}

.duo-tab-btn.is-active .tab-title {
  font-weight: 600;
}

.tab-badge {
  position: absolute;
  top: -3px;
  right: 8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: 999px;
  color: #ffffff;
  background: var(--dn-ink);
  box-shadow: 0 0 0 2px #ffffff;
  line-height: 1;
}
</style>
