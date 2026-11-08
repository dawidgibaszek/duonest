import { ref, watch, onMounted, nextTick } from 'vue'
import { orgTabsScrollLeft, activeDailySubTab, activeTasksMainTab } from '~/composables/useDuoState'

export function useOrgTabsSync(subTabName: 'shopping' | 'tasks' | 'meals' | 'savings') {
  const pillRowRef = ref<HTMLElement | null>(null)

  const onTabsScroll = (e: Event) => {
    const el = e.target as HTMLElement
    if (el && typeof el.scrollLeft === 'number') {
      orgTabsScrollLeft.value = el.scrollLeft
    }
  }

  const applyScroll = (behavior: ScrollBehavior = 'auto') => {
    const el = pillRowRef.value
    if (!el) return

    // 1. Immediately restore the last known scroll position
    if (orgTabsScrollLeft.value > 0) {
      el.scrollLeft = orgTabsScrollLeft.value
    }

    // 2. Ensure the active button is fully visible in view
    requestAnimationFrame(() => {
      if (!el) return
      const activePill = el.querySelector('.main-tab-pill.active') as HTMLElement | null
      if (activePill) {
        const elRect = el.getBoundingClientRect()
        const pillRect = activePill.getBoundingClientRect()
        // If cut off on left or right, smoothly center it
        if (pillRect.left < elRect.left + 8 || pillRect.right > elRect.right - 8) {
          activePill.scrollIntoView({ inline: 'center', block: 'nearest', behavior })
          setTimeout(() => {
            if (el) orgTabsScrollLeft.value = el.scrollLeft
          }, 350)
        }
      }
    })
  }

  const syncScroll = (behavior: ScrollBehavior = 'auto') => {
    nextTick(() => applyScroll(behavior))
  }

  // Watch for sub-tab activation
  watch(activeDailySubTab, (newTab) => {
    if (newTab === subTabName) {
      syncScroll('auto')
    }
  })

  // In tasks.vue, also watch activeTasksMainTab (switching between Tasks and Pet)
  if (subTabName === 'tasks') {
    watch(activeTasksMainTab, () => {
      if (activeDailySubTab.value === 'tasks') {
        syncScroll('smooth')
      }
    })
  }

  onMounted(() => {
    if (activeDailySubTab.value === subTabName) {
      syncScroll('auto')
    }
  })

  return {
    pillRowRef,
    onTabsScroll,
    syncScroll
  }
}
