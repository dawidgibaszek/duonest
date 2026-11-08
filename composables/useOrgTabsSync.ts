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
    // Strictly only run if the element is rendered and visible, and only for the active subtab
    if (!el || el.clientWidth === 0 || activeDailySubTab.value !== subTabName) return

    // 1. Restore the shared horizontal scroll position directly within the pill container
    if (orgTabsScrollLeft.value > 0) {
      el.scrollLeft = orgTabsScrollLeft.value
    }

    // 2. Check if the active pill is out of view inside `el` and center it without touching ancestor containers
    requestAnimationFrame(() => {
      if (!el || el.clientWidth === 0 || activeDailySubTab.value !== subTabName) return
      const activePill = el.querySelector('.main-tab-pill.active') as HTMLElement | null
      if (activePill) {
        const pillLeft = activePill.offsetLeft
        const pillWidth = activePill.offsetWidth
        const containerWidth = el.clientWidth
        const currentScroll = el.scrollLeft

        const isCutOffLeft = pillLeft < currentScroll + 6
        const isCutOffRight = pillLeft + pillWidth > currentScroll + containerWidth - 6

        if (isCutOffLeft || isCutOffRight) {
          const targetScroll = Math.max(0, Math.round(pillLeft - (containerWidth / 2) + (pillWidth / 2)))
          el.scrollTo({ left: targetScroll, behavior })
          orgTabsScrollLeft.value = targetScroll
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
