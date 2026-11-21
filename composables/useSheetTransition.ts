import type { Ref } from 'vue'

export function useSheetTransition(isOpen: Ref<boolean>) {
  let pending: (() => void) | undefined

  function closeThen(action: () => void) {
    if (pending || !isOpen.value) return
    pending = action
    isOpen.value = false
  }

  function didDismiss() {
    isOpen.value = false
    const action = pending
    pending = undefined
    action?.()
  }

  return { closeThen, didDismiss }
}
