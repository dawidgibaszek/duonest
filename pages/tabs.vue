<template>
  <ion-page>
    <div
      class="tabs-touch-wrapper"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchCancel"
    >
      <ion-tabs>
        <ion-router-outlet :class="['tabs-outlet', slideAnimationClass]" />
        
        <ion-tab-bar slot="bottom">
          <ion-tab-button id="tab-btn-nest" tab="nest" href="/tabs/nest">
            <ion-icon :icon="ioniconsHeartOutline" />
            <ion-label>Gniazdko</ion-label>
          </ion-tab-button>

          <ion-tab-button id="tab-btn-shopping" tab="shopping" href="/tabs/shopping">
            <ion-icon :icon="ioniconsCartOutline" />
            <ion-label>Zakupy</ion-label>
            <ion-badge v-if="pendingShoppingCount > 0" color="primary" class="tab-badge">
              {{ pendingShoppingCount }}
            </ion-badge>
          </ion-tab-button>

          <ion-tab-button id="tab-btn-tasks" tab="tasks" href="/tabs/tasks">
            <ion-icon :icon="ioniconsCheckboxOutline" />
            <ion-label>Zadania</ion-label>
            <ion-badge v-if="pendingTasksCount > 0" color="secondary" class="tab-badge">
              {{ pendingTasksCount }}
            </ion-badge>
          </ion-tab-button>

          <ion-tab-button id="tab-btn-calendar" tab="calendar" href="/tabs/calendar">
            <ion-icon :icon="ioniconsCalendarOutline" />
            <ion-label>Terminarz</ion-label>
            <ion-badge v-if="todayEventsCount > 0" color="tertiary" class="tab-badge">
              {{ todayEventsCount }}
            </ion-badge>
          </ion-tab-button>

          <ion-tab-button id="tab-btn-relationship" tab="relationship" href="/tabs/relationship">
            <ion-icon :icon="ioniconsSparklesOutline" />
            <ion-label>Relacja</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDuoState } from '~/composables/useDuoState'

const route = useRoute()
const router = useRouter()
const { shoppingItems, tasksList, eventsList } = useDuoState()

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

// Tab navigation order
const TABS_ORDER = [
  'nest',
  'shopping',
  'tasks',
  'calendar',
  'relationship'
]

// State for gesture detection
let startX = 0
let startY = 0
let startTime = 0
let gestureLocked: 'horizontal' | 'vertical' | null = null
let isIgnored = false
let isEdgeSwipe = false
let isNavigating = false
const slideAnimationClass = ref('')

// Check if an element or its ancestor has horizontal scrolling enabled
const hasHorizontalScroll = (el: HTMLElement | null): boolean => {
  let cur = el
  while (cur && cur !== document.body) {
    if (cur.scrollWidth > cur.clientWidth + 4) {
      const overflowX = window.getComputedStyle(cur).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
    cur = cur.parentElement
  }
  return false
}

const onTouchStart = (e: TouchEvent) => {
  gestureLocked = null
  isIgnored = false
  isEdgeSwipe = false

  const touch = e.touches[0]
  if (!touch) return

  const target = e.target as HTMLElement | null

  // 1. Never intercept when touching interactive or horizontal scrolling components
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
    isIgnored = true
    return
  }

  startX = touch.clientX
  startY = touch.clientY
  startTime = performance.now()

  // Detect native edge swipe (within 40px of screen edge)
  if (typeof window !== 'undefined') {
    const screenWidth = window.innerWidth
    if (startX <= 40 || startX >= screenWidth - 40) {
      isEdgeSwipe = true
    }
  }
}

const onTouchMove = (e: TouchEvent) => {
  if (isIgnored || !startX) return

  const touch = e.touches[0]
  if (!touch) return

  const dx = touch.clientX - startX
  const dy = touch.clientY - startY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  // Disambiguation phase
  if (!gestureLocked) {
    // Deadzone before making a decision
    if (absDx < 10 && absDy < 10) return

    // If vertical movement is dominant or equal -> user is scrolling content!
    // Lock to vertical and immediately cancel tab navigation for this touch.
    if (absDy >= absDx || absDx < 14) {
      gestureLocked = 'vertical'
      isIgnored = true
      return
    }

    // Only lock to horizontal swipe if movement is strictly horizontal (ratio > 2.0)
    if (absDx > absDy * 2.0) {
      gestureLocked = 'horizontal'
    } else {
      // Ambiguous diagonal movement -> safe fallback to vertical scrolling
      gestureLocked = 'vertical'
      isIgnored = true
      return
    }
  }
}

const onTouchEnd = (e: TouchEvent) => {
  if (isIgnored || gestureLocked !== 'horizontal' || !startX || isNavigating) {
    startX = 0
    startY = 0
    gestureLocked = null
    isIgnored = false
    isEdgeSwipe = false
    return
  }

  const touch = e.changedTouches[0]
  if (!touch) return

  const deltaX = touch.clientX - startX
  const deltaY = touch.clientY - startY
  const duration = performance.now() - startTime
  const velocity = Math.abs(deltaX) / Math.max(duration, 1)

  // Reset tracking state
  startX = 0
  startY = 0
  gestureLocked = null
  isIgnored = false

  // Determine current tab
  const currentPath = route.path
  const currentTabName = TABS_ORDER.find(tab => currentPath.includes(tab)) || 'nest'
  const currentIndex = TABS_ORDER.indexOf(currentTabName)
  if (currentIndex === -1) return

  // Criteria for intentional native swipe:
  // - Either edge swipe with delta > 35px
  // - Or deliberate horizontal swipe (delta > 55px, duration < 500ms, velocity > 0.2 px/ms)
  // - Or quick flick (delta > 35px, velocity > 0.45 px/ms)
  const isIntentional =
    (isEdgeSwipe && Math.abs(deltaX) > 35 && duration < 600) ||
    (Math.abs(deltaX) > 55 && velocity > 0.2 && duration < 500 && Math.abs(deltaX) > Math.abs(deltaY) * 1.8) ||
    (Math.abs(deltaX) > 35 && velocity > 0.45 && duration < 350)

  if (!isIntentional) return

  let targetIndex = -1
  let direction: 'left' | 'right' = 'left'

  if (deltaX < 0 && currentIndex < TABS_ORDER.length - 1) {
    // Swiped left -> Move to NEXT tab (slide from right)
    targetIndex = currentIndex + 1
    direction = 'left'
  } else if (deltaX > 0 && currentIndex > 0) {
    // Swiped right -> Move to PREVIOUS tab (slide from left)
    targetIndex = currentIndex - 1
    direction = 'right'
  }

  if (targetIndex !== -1) {
    const nextTab = TABS_ORDER[targetIndex]
    switchToTab(nextTab, direction)
  }
}

const onTouchCancel = () => {
  startX = 0
  startY = 0
  gestureLocked = null
  isIgnored = false
  isEdgeSwipe = false
}

// Instant tab switching with smooth native animation and haptic feedback
const switchToTab = (targetTab: string, direction: 'left' | 'right') => {
  if (isNavigating) return
  isNavigating = true

  // Haptic feedback (10ms crisp native vibration)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(10)
    } catch {}
  }

  // Trigger smooth native CSS slide transition
  slideAnimationClass.value = direction === 'left' ? 'tab-slide-left' : 'tab-slide-right'
  setTimeout(() => {
    slideAnimationClass.value = ''
    isNavigating = false
  }, 230)

  // Fast tab activation via tab button click (invokes Ionic's native tab controller without router push lag)
  const btn = (document.getElementById(`tab-btn-${targetTab}`) ||
    document.querySelector(`ion-tab-button[tab="${targetTab}"]`)) as HTMLElement | null

  if (btn) {
    btn.click()
  } else {
    router.replace(`/tabs/${targetTab}`)
  }
}
</script>

<style scoped>
.tabs-touch-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-badge {
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  padding: 2px 5px;
  position: absolute;
  top: 4px;
  right: calc(50% - 20px);
}

/* Native-feel hardware-accelerated slide transitions */
@keyframes tabSlideInLeft {
  0% {
    transform: translate3d(24px, 0, 0);
    opacity: 0.9;
  }
  100% {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
}

@keyframes tabSlideInRight {
  0% {
    transform: translate3d(-24px, 0, 0);
    opacity: 0.9;
  }
  100% {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
}

.tab-slide-left :deep(.ion-page:not(.ion-page-hidden)) {
  animation: tabSlideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

.tab-slide-right :deep(.ion-page:not(.ion-page-hidden)) {
  animation: tabSlideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}
</style>
