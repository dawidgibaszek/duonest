<template>
  <ion-page>
    <div
      class="tabs-touch-wrapper"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <ion-tabs>
        <ion-router-outlet />
        <ion-tab-bar slot="bottom">
          <ion-tab-button tab="nest" href="/tabs/nest">
            <ion-icon :icon="ioniconsHeartOutline" />
            <ion-label>Gniazdko</ion-label>
          </ion-tab-button>

          <ion-tab-button tab="shopping" href="/tabs/shopping">
            <ion-icon :icon="ioniconsCartOutline" />
            <ion-label>Zakupy</ion-label>
            <ion-badge v-if="pendingShoppingCount > 0" color="primary" class="tab-badge">
              {{ pendingShoppingCount }}
            </ion-badge>
          </ion-tab-button>

          <ion-tab-button tab="tasks" href="/tabs/tasks">
            <ion-icon :icon="ioniconsCheckboxOutline" />
            <ion-label>Zadania</ion-label>
            <ion-badge v-if="pendingTasksCount > 0" color="secondary" class="tab-badge">
              {{ pendingTasksCount }}
            </ion-badge>
          </ion-tab-button>

          <ion-tab-button tab="calendar" href="/tabs/calendar">
            <ion-icon :icon="ioniconsCalendarOutline" />
            <ion-label>Terminarz</ion-label>
            <ion-badge v-if="todayEventsCount > 0" color="tertiary" class="tab-badge">
              {{ todayEventsCount }}
            </ion-badge>
          </ion-tab-button>

          <ion-tab-button tab="relationship" href="/tabs/relationship">
            <ion-icon :icon="ioniconsSparklesOutline" />
            <ion-label>Relacja</ion-label>
          </ion-tab-button>
        </ion-tab-bar>
      </ion-tabs>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

// Tab navigation order for native horizontal swipe gestures
const TABS_ORDER = [
  '/tabs/nest',
  '/tabs/shopping',
  '/tabs/tasks',
  '/tabs/calendar',
  '/tabs/relationship'
]

let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0

const onTouchStart = (e: TouchEvent) => {
  const target = e.target as HTMLElement | null
  // Do NOT intercept if the user is swiping an ion-item-sliding or scrollable container
  if (
    target?.closest('ion-item-sliding') ||
    target?.closest('.filter-scroll') ||
    target?.closest('.category-select-scroll') ||
    target?.closest('.category-filter-scroll') ||
    target?.closest('.quick-chips-row') ||
    target?.closest('.calendar-card') ||
    target?.closest('input') ||
    target?.closest('textarea') ||
    target?.closest('select') ||
    target?.closest('ion-modal')
  ) {
    touchStartX = 0
    return
  }

  touchStartX = e.changedTouches[0].screenX
  touchStartY = e.changedTouches[0].screenY
  touchStartTime = Date.now()
}

const onTouchEnd = (e: TouchEvent) => {
  if (!touchStartX) return
  const touchEndX = e.changedTouches[0].screenX
  const touchEndY = e.changedTouches[0].screenY
  const deltaX = touchEndX - touchStartX
  const deltaY = touchEndY - touchStartY
  const duration = Date.now() - touchStartTime

  touchStartX = 0

  // Require distinct horizontal swipe: > 45px, mostly horizontal angle, and under 500ms
  if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && duration < 500) {
    const currentPath = route.path
    const currentIndex = TABS_ORDER.findIndex(tab => currentPath.startsWith(tab))
    if (currentIndex === -1) return

    if (deltaX < 0 && currentIndex < TABS_ORDER.length - 1) {
      // Swipe left -> Next tab
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12)
      }
      router.push(TABS_ORDER[currentIndex + 1])
    } else if (deltaX > 0 && currentIndex > 0) {
      // Swipe right -> Previous tab
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12)
      }
      router.push(TABS_ORDER[currentIndex - 1])
    }
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
</style>
