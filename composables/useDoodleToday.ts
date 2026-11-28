import { onMounted, onUnmounted, ref } from 'vue'
import { doodleDayBounds } from '~/utils/duoDoodle'

export function useDoodleToday() {
  const today = ref(doodleDayBounds(new Date()).start)
  let midnightTimer: ReturnType<typeof setTimeout> | undefined

  function updateToday() {
    const { start, end } = doodleDayBounds(new Date())
    if (today.value.getTime() !== start.getTime()) today.value = start
    clearTimeout(midnightTimer)
    midnightTimer = setTimeout(updateToday, end.getTime() - Date.now() + 20)
  }

  onMounted(() => {
    updateToday()
    document.addEventListener('visibilitychange', updateToday)
  })
  onUnmounted(() => {
    clearTimeout(midnightTimer)
    document.removeEventListener('visibilitychange', updateToday)
  })

  return today
}
