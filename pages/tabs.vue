<template>
  <ion-page class="tabs-root-page">
    <div
      ref="containerRef"
      class="tabs-touch-container"
    >
      <div
        ref="trackRef"
        class="tabs-track"
      >
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 0 }">
          <TabNest />
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 1 }">
          <div v-show="activeDailySubTab === 'shopping'" class="subtab-fill-container">
            <TabShopping />
          </div>
          <div v-show="activeDailySubTab === 'tasks'" class="subtab-fill-container">
            <TabTasks />
          </div>
          <div v-show="activeDailySubTab === 'meals'" class="subtab-fill-container">
            <TabMeals />
          </div>
          <div v-show="activeDailySubTab === 'savings'" class="subtab-fill-container">
            <TabSavings />
          </div>
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 2 }">
          <TabCalendar />
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 3 }">
          <div v-show="activeLeisureSubTab === 'movies'" class="subtab-fill-container">
            <TabMovies />
          </div>
          <div v-show="activeLeisureSubTab === 'wishlist'" class="subtab-fill-container">
            <TabWishlist />
          </div>
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 4 }">
          <TabRelationship />
        </div>
      </div>
    </div>

    <!-- Native DuoNest Bottom Navigation Bar with filled active icons -->
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
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 0 ? ioniconsHeart : ioniconsHeartOutline" />
          </div>
          <span class="tab-title">Gniazdko</span>
        </button>

        <button
          type="button"
          id="tab-btn-daily"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 1 }"
          @click="handleDailyTabClick"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 1 ? ioniconsCheckbox : ioniconsCheckboxOutline" />
            <span v-if="(pendingShoppingCount + pendingTasksCount) > 0" class="tab-badge primary-badge">
              {{ pendingShoppingCount + pendingTasksCount }}
            </span>
          </div>
          <span class="tab-title">Organizacja</span>
        </button>

        <button
          type="button"
          id="tab-btn-calendar"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 2 }"
          @click="goToTab(2)"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 2 ? ioniconsCalendar : ioniconsCalendarOutline" />
            <span v-if="todayEventsCount > 0" class="tab-badge primary-badge">
              {{ todayEventsCount }}
            </span>
          </div>
          <span class="tab-title">Terminarz</span>
        </button>

        <button
          type="button"
          id="tab-btn-leisure"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 3 }"
          @click="handleLeisureTabClick"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 3 ? ioniconsFilm : ioniconsFilmOutline" />
            <span v-if="(pendingMoviesCount + pendingWishlistCount) > 0" class="tab-badge primary-badge">
              {{ pendingMoviesCount + pendingWishlistCount }}
            </span>
          </div>
          <span class="tab-title">Rozrywka</span>
        </button>

        <button
          type="button"
          id="tab-btn-relationship"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 4 }"
          @click="goToTab(4)"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 4 ? ioniconsSparkles : ioniconsSparklesOutline" />
          </div>
          <span class="tab-title">Relacja</span>
        </button>
      </nav>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
const {
  shoppingItems,
  tasksList,
  eventsList,
  wishlistItems,
  moviesList,
  activeDailySubTab,
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
  currentTrackX = -activeTabIndex.value * width

  if (trackRef.value) {
    trackRef.value.style.transition = 'none'
  }
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
    while (touchHistory.length > 1 && now - touchHistory[0].time > 100) {
      touchHistory.shift()
    }

    const width = getContainerWidth()
    let effectiveDx = dx

    // Damping / rubber band effect at bounds
    if ((activeTabIndex.value === 0 && dx > 0) || (activeTabIndex.value === TABS.length - 1 && dx < 0)) {
      effectiveDx = applyRubberBand(dx, width)
    }

    currentTrackX = -activeTabIndex.value * width + effectiveDx

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

  if (isDragging) {
    isDragging = false

    const touch = e.changedTouches[0]
    const currentTouchX = touch ? touch.clientX : (touchHistory[touchHistory.length - 1]?.x ?? touchStartX)
    const totalDx = currentTouchX - touchStartX
    const width = getContainerWidth()

    // Calculate release velocity using recent touch history (last 80ms)
    const now = performance.now()
    const recentPoints = touchHistory.filter(p => now - p.time <= 80)
    let velocityX = 0
    if (recentPoints.length >= 2) {
      const first = recentPoints[0]
      const last = recentPoints[recentPoints.length - 1]
      const dt = last.time - first.time
      if (dt > 8) {
        velocityX = (last.x - first.x) / dt // px/ms (>0 swiping right / <0 swiping left)
      }
    }

    // Determine target tab
    let targetIndex = activeTabIndex.value

    if (Math.abs(velocityX) > 0.28) {
      // Fast flick gesture
      if (velocityX < -0.28 && activeTabIndex.value < TABS.length - 1) {
        targetIndex = activeTabIndex.value + 1
      } else if (velocityX > 0.28 && activeTabIndex.value > 0) {
        targetIndex = activeTabIndex.value - 1
      }
    } else {
      // Distance threshold: >22% drag
      if (totalDx < -width * 0.22 && activeTabIndex.value < TABS.length - 1) {
        targetIndex = activeTabIndex.value + 1
      } else if (totalDx > width * 0.22 && activeTabIndex.value > 0) {
        targetIndex = activeTabIndex.value - 1
      }
    }

    // Calculate natural organic settling duration (based on physical spring damping)
    const targetX = -targetIndex * width
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
      let targetPath = `/tabs/${TABS[targetIndex]}`
      if (targetIndex === 1) {
        targetPath = `/tabs/${activeDailySubTab.value}`
      } else if (targetIndex === 3) {
        targetPath = `/tabs/${activeLeisureSubTab.value}`
      }
      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        window.history.replaceState({}, '', targetPath)
      }
    }
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
  if (isDragging) {
    isDragging = false
    const width = getContainerWidth()
    const targetX = -activeTabIndex.value * width
    if (trackRef.value) {
      trackRef.value.style.transition = 'transform 340ms cubic-bezier(0.25, 0.9, 0.3, 1)'
      trackRef.value.style.transform = `translate3d(${targetX}px, 0, 0)`
    }
  }
  touchStartX = 0
  touchStartY = 0
  gestureDirection = null
  isTouchIgnored = false
  touchHistory = []
}

const goToTab = (index: number) => {
  if (index < 0 || index >= TABS.length) return
  const oldIndex = activeTabIndex.value
  activeTabIndex.value = index

  const width = getContainerWidth()
  const targetX = -index * width
  const dist = Math.abs(index - oldIndex)
  const duration = dist > 1 ? 440 : 380

  if (trackRef.value) {
    trackRef.value.style.transition = `transform ${duration}ms cubic-bezier(0.25, 0.9, 0.3, 1)`
    trackRef.value.style.transform = `translate3d(${targetX}px, 0, 0)`
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(12) } catch {}
  }

  let targetPath = `/tabs/${TABS[index]}`
  if (index === 1) {
    targetPath = `/tabs/${activeDailySubTab.value}`
  } else if (index === 3) {
    targetPath = `/tabs/${activeLeisureSubTab.value}`
  }

  if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
    window.history.replaceState({}, '', targetPath)
  }
}

const handleDailyTabClick = () => {
  if (activeTabIndex.value === 1) {
    // Cycle between shopping -> tasks -> meals -> savings -> shopping
    if (activeDailySubTab.value === 'shopping') {
      activeDailySubTab.value = 'tasks'
    } else if (activeDailySubTab.value === 'tasks') {
      activeDailySubTab.value = 'meals'
    } else if (activeDailySubTab.value === 'meals') {
      activeDailySubTab.value = 'savings'
    } else {
      activeDailySubTab.value = 'shopping'
    }
    const targetPath = `/tabs/${activeDailySubTab.value}`
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.replaceState({}, '', targetPath)
    }
  } else {
    goToTab(1)
  }
}

const handleLeisureTabClick = () => {
  if (activeTabIndex.value === 3) {
    // If already on Rozrywka tab, toggle between movies and wishlist
    activeLeisureSubTab.value = activeLeisureSubTab.value === 'movies' ? 'wishlist' : 'movies'
    const targetPath = `/tabs/${activeLeisureSubTab.value}`
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.replaceState({}, '', targetPath)
    }
  } else {
    goToTab(3)
  }
}

const handleResize = () => {
  const width = getContainerWidth()
  const targetX = -activeTabIndex.value * width
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
    activeDailySubTab.value = 'tasks'
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

  if (animate && idx !== activeTabIndex.value) {
    goToTab(idx)
  } else {
    activeTabIndex.value = idx
    const width = getContainerWidth()
    if (trackRef.value) {
      trackRef.value.style.transition = 'none'
      trackRef.value.style.transform = `translate3d(${-idx * width}px, 0, 0)`
    }
  }
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

watch(() => route?.path, () => {
  syncTabFromRoute(true)
})

watch(activeDailySubTab, (newVal) => {
  if (activeTabIndex.value === 1 && typeof window !== 'undefined') {
    const targetPath = `/tabs/${newVal}`
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, '', targetPath)
    }
  }
})

watch(activeLeisureSubTab, (newVal) => {
  if (activeTabIndex.value === 3 && typeof window !== 'undefined') {
    const targetPath = `/tabs/${newVal}`
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, '', targetPath)
    }
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
  background-color: #f8fafc;
}

.tabs-touch-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
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
  width: 500%; /* 5 slides * 100% */
  will-change: transform;
  transform: translate3d(0, 0, 0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  -webkit-perspective: 1000;
  perspective: 1000;
}

.tab-slide {
  width: 20%; /* 1/5th of 500% = 100% of container viewport */
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

/* ── TELEGRAM-STYLE FLOATING BOTTOM TAB BAR ── */

.duo-tab-bar-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 1000;
  padding: 0 14px;
  /* Lowered on iOS so it sits sleek and low right over the home indicator */
  padding-bottom: max(8px, env(safe-area-inset-bottom, 0px) - 12px);
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.duo-native-tab-bar {
  pointer-events: auto;
  width: 100%;
  max-width: 520px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 60px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 30px;
  box-shadow:
    0 10px 32px rgba(15, 23, 42, 0.12),
    0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 0 4px;
}

.duo-tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: none;
  border: none;
  padding: 6px 0 5px 0;
  cursor: pointer;
  color: #64748b;
  transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}

.duo-tab-btn:active {
  transform: scale(0.90);
}

.duo-tab-btn.is-active {
  color: #0f172a;
}

/* Animated pill indicator that appears under active icon */
.tab-icon-pill {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 30px;
  background: rgba(15, 23, 42, 0.07);
  border-radius: 999px;
  transition: width 0.32s cubic-bezier(0.25, 0.9, 0.3, 1);
  z-index: 0;
}

.duo-tab-btn.is-active .tab-icon-pill {
  width: 44px;
}

.duo-tab-btn.is-active .tab-icon-wrap ion-icon {
  animation: tabIconPop 0.32s cubic-bezier(0.25, 0.9, 0.3, 1);
}

@keyframes tabIconPop {
  0% { transform: scale(0.90); }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.tab-icon-wrap {
  position: relative;
  font-size: 22px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 28px;
}

.tab-icon-wrap ion-icon {
  position: relative;
  z-index: 1;
}

.tab-title {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.tab-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  padding: 1px 5px;
  color: #ffffff;
  line-height: 1.2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  z-index: 2;
}

.primary-badge { background: #0f172a; }
.secondary-badge { background: #1e293b; }
.tertiary-badge { background: #18181b; }
.pink-badge { background: #0f172a; }
.purple-badge { background: #1e293b; }
</style>
