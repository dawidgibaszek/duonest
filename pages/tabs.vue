<template>
  <ion-page class="tabs-root-page">
    <div
      ref="containerRef"
      class="tabs-touch-container"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchCancel"
    >
      <div
        class="tabs-track"
        :style="trackStyle"
      >
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 0 }">
          <TabNest />
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 1 }">
          <TabShopping />
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 2 }">
          <TabTasks />
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 3 }">
          <TabCalendar />
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 4 }">
          <TabWishlist />
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 5 }">
          <TabMovies />
        </div>
        <div class="tab-slide" :class="{ 'is-active': activeTabIndex === 6 }">
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
          id="tab-btn-shopping"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 1 }"
          @click="goToTab(1)"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 1 ? ioniconsCart : ioniconsCartOutline" />
            <span v-if="pendingShoppingCount > 0" class="tab-badge primary-badge">
              {{ pendingShoppingCount }}
            </span>
          </div>
          <span class="tab-title">Zakupy</span>
        </button>

        <button
          type="button"
          id="tab-btn-tasks"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 2 }"
          @click="goToTab(2)"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 2 ? ioniconsCheckbox : ioniconsCheckboxOutline" />
            <span v-if="pendingTasksCount > 0" class="tab-badge primary-badge">
              {{ pendingTasksCount }}
            </span>
          </div>
          <span class="tab-title">Zadania</span>
        </button>

        <button
          type="button"
          id="tab-btn-calendar"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 3 }"
          @click="goToTab(3)"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 3 ? ioniconsCalendar : ioniconsCalendarOutline" />
            <span v-if="todayEventsCount > 0" class="tab-badge primary-badge">
              {{ todayEventsCount }}
            </span>
          </div>
          <span class="tab-title">Terminarz</span>
        </button>

        <button
          type="button"
          id="tab-btn-wishlist"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 4 }"
          @click="goToTab(4)"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 4 ? ioniconsGift : ioniconsGiftOutline" />
            <span v-if="pendingWishlistCount > 0" class="tab-badge primary-badge">
              {{ pendingWishlistCount }}
            </span>
          </div>
          <span class="tab-title">Wishlista</span>
        </button>

        <button
          type="button"
          id="tab-btn-movies"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 5 }"
          @click="goToTab(5)"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 5 ? ioniconsFilm : ioniconsFilmOutline" />
            <span v-if="pendingMoviesCount > 0" class="tab-badge primary-badge">
              {{ pendingMoviesCount }}
            </span>
          </div>
          <span class="tab-title">Filmy</span>
        </button>

        <button
          type="button"
          id="tab-btn-relationship"
          class="duo-tab-btn"
          :class="{ 'is-active': activeTabIndex === 6 }"
          @click="goToTab(6)"
        >
          <div class="tab-icon-wrap">
            <div class="tab-icon-pill"></div>
            <ion-icon :icon="activeTabIndex === 6 ? ioniconsSparkles : ioniconsSparklesOutline" />
          </div>
          <span class="tab-title">Relacja</span>
        </button>
      </nav>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDuoState } from '~/composables/useDuoState'

import TabNest from '~/pages/tabs/nest.vue'
import TabShopping from '~/pages/tabs/shopping.vue'
import TabTasks from '~/pages/tabs/tasks.vue'
import TabCalendar from '~/pages/tabs/calendar.vue'
import TabWishlist from '~/pages/tabs/wishlist.vue'
import TabMovies from '~/pages/tabs/movies.vue'
import TabRelationship from '~/pages/tabs/relationship.vue'

const route = useRoute()
const { shoppingItems, tasksList, eventsList, wishlistItems, moviesList } = useDuoState()

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

const TABS = ['nest', 'shopping', 'tasks', 'calendar', 'wishlist', 'movies', 'relationship']
const activeTabIndex = ref(0)
const dragOffset = ref(0)
const isDragging = ref(false)
const containerRef = ref<HTMLElement | null>(null)

// Calculate container width safely
const getContainerWidth = () => {
  if (containerRef.value?.clientWidth) {
    return containerRef.value.clientWidth
  }
  return typeof window !== 'undefined' ? window.innerWidth : 375
}

// Hardware-accelerated real-time translation style with fluid cubic-bezier snap
const trackStyle = computed(() => {
  const width = getContainerWidth()
  const baseOffset = -activeTabIndex.value * width
  const totalOffset = baseOffset + dragOffset.value

  return {
    transform: `translate3d(${totalOffset}px, 0, 0)`,
    transition: isDragging.value ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
    willChange: 'transform'
  }
})

// Touch gesture tracking state
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0
let gestureDirection: 'horizontal' | 'vertical' | null = null
let isTouchIgnored = false

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

const onTouchStart = (e: TouchEvent) => {
  gestureDirection = null
  isTouchIgnored = false
  dragOffset.value = 0

  const touch = e.touches[0]
  if (!touch) return

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
    hasHorizontalScroll(target)
  ) {
    isTouchIgnored = true
    return
  }

  touchStartX = touch.clientX
  touchStartY = touch.clientY
  touchStartTime = performance.now()
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

    // If vertical movement dominates -> user is scrolling vertically
    if (absDy >= absDx) {
      gestureDirection = 'vertical'
      isTouchIgnored = true
      return
    }

    // Lock to horizontal swipe
    if (absDx > absDy * 1.35) {
      gestureDirection = 'horizontal'
      isDragging.value = true
    } else {
      gestureDirection = 'vertical'
      isTouchIgnored = true
      return
    }
  }

  if (gestureDirection === 'horizontal') {
    // 1:1 real-time drag following the finger with edge damping
    let effectiveDx = dx
    if ((activeTabIndex.value === 0 && dx > 0) || (activeTabIndex.value === TABS.length - 1 && dx < 0)) {
      effectiveDx = dx * 0.28 // Rubber-band effect
    }
    dragOffset.value = effectiveDx
  }
}

const onTouchEnd = (e: TouchEvent) => {
  if (isDragging.value) {
    isDragging.value = false
    const touch = e.changedTouches[0]
    const dx = touch ? touch.clientX - touchStartX : dragOffset.value
    const duration = performance.now() - touchStartTime
    const velocity = Math.abs(dx) / Math.max(duration, 1)
    const width = getContainerWidth()

    // Smoothly snap to final position
    dragOffset.value = 0

    const isIntentionalSwipe = (Math.abs(dx) > width * 0.22 || velocity > 0.35) && Math.abs(dx) > 35

    if (isIntentionalSwipe) {
      if (dx < 0 && activeTabIndex.value < TABS.length - 1) {
        // Dragged left -> next tab
        goToTab(activeTabIndex.value + 1)
      } else if (dx > 0 && activeTabIndex.value > 0) {
        // Dragged right -> previous tab
        goToTab(activeTabIndex.value - 1)
      }
    }
  }

  touchStartX = 0
  touchStartY = 0
  gestureDirection = null
  isTouchIgnored = false
}

const onTouchCancel = () => {
  isDragging.value = false
  dragOffset.value = 0
  touchStartX = 0
  touchStartY = 0
  gestureDirection = null
  isTouchIgnored = false
}

const goToTab = (index: number) => {
  if (index < 0 || index >= TABS.length) return
  activeTabIndex.value = index

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(12) } catch {}
  }

  const targetPath = `/tabs/${TABS[index]}`
  if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
    window.history.replaceState({}, '', targetPath)
  }
}

// Synchronize active tab from initial route URL
const syncTabFromRoute = () => {
  const path = route.path
  const tabName = TABS.find(t => path.includes(t))
  if (tabName) {
    const idx = TABS.indexOf(tabName)
    if (idx !== -1) {
      if (idx !== activeTabIndex.value) {
        activeTabIndex.value = idx
      }
    }
  }
}

onMounted(() => {
  syncTabFromRoute()
})

watch(() => route.path, () => {
  syncTabFromRoute()
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
}

.tabs-track {
  display: flex;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  width: 700%; /* 7 slides * 100% */
  will-change: transform;
}

.tab-slide {
  width: 14.285714%; /* 1/7th of 700% = 100% of container viewport */
  height: 100%;
  position: relative;
  overflow: hidden;
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
  transition: width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 0;
}

.duo-tab-btn.is-active .tab-icon-pill {
  width: 44px;
}

.duo-tab-btn.is-active .tab-icon-wrap ion-icon {
  animation: tabIconPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes tabIconPop {
  0% { transform: scale(0.80); }
  60% { transform: scale(1.18); }
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
.secondary-badge { background: #0d9488; }
.tertiary-badge { background: #6366f1; }
.pink-badge { background: #f43f5e; }
.purple-badge { background: #8b5cf6; }
</style>
