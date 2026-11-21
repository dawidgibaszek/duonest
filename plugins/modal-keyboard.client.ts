const editable = 'input:not([readonly], [disabled], [type="file"], [type="checkbox"], [type="radio"], [type="range"], [type="button"], [type="submit"]), textarea:not([readonly], [disabled]), [contenteditable="true"]'

function focusedField() {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active instanceof HTMLElement && active.matches(editable) ? active : null
}

function findParent<T extends Element>(element: Element, selector: string): T | null {
  for (let node: Element | null = element; node;) {
    const match = node.closest<T>(selector)
    if (match) return match
    const root = node.getRootNode()
    node = root instanceof ShadowRoot ? root.host : null
  }
  return null
}

export default defineNuxtPlugin((nuxtApp) => {
  const modals: HTMLElement[] = []
  const events = new AbortController()
  const options = { signal: events.signal, capture: true }
  const viewport = window.visualViewport
  let keyboardVisible = false
  let frame = 0
  let paddedHost: HTMLElement | null = null

  function resetPadding() {
    paddedHost?.style.removeProperty('--dn-keyboard-overlap')
    paddedHost = null
  }

  async function revealField() {
    while (modals.length && !modals[modals.length - 1].isConnected) modals.pop()
    const field = focusedField()
    const modal = modals[modals.length - 1]
    if (!field || !modal || findParent(field, 'ion-modal') !== modal) return resetPadding()
    const unscaledViewport = viewport?.scale === 1 ? viewport : null
    const visibleBottom = unscaledViewport
      ? Math.min(window.innerHeight, unscaledViewport.offsetTop + unscaledViewport.height)
      : window.innerHeight
    const occluded = window.innerHeight - visibleBottom
    if (!keyboardVisible && occluded < 100) return resetPadding()
    const host = findParent<HTMLIonContentElement | HTMLElement>(field, 'ion-content, .ion-content-scroll-host')
    if (!host || findParent(host, 'ion-modal') !== modal) return
    const scroll = host.tagName === 'ION-CONTENT' ? await (host as HTMLIonContentElement).getScrollElement() : host
    if (focusedField() !== field || modals[modals.length - 1] !== modal) return

    if (paddedHost !== host) resetPadding()
    paddedHost = host
    const bounds = scroll.getBoundingClientRect()
    const bottom = Math.min(bounds.bottom, visibleBottom)
    host.style.setProperty('--dn-keyboard-overlap', `${Math.max(0, bounds.bottom - bottom)}px`)
    const fieldBounds = field.getBoundingClientRect()
    const top = Math.max(bounds.top, unscaledViewport?.offsetTop ?? 0)
    if (fieldBounds.top < top + 12 || fieldBounds.height >= bottom - top - 24) {
      scroll.scrollTop += fieldBounds.top - top - 12
    } else if (fieldBounds.bottom > bottom - 12) {
      scroll.scrollTop += fieldBounds.bottom - bottom + 12
    }
  }

  function schedule() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => { void revealField() })
  }

  document.addEventListener('ionModalWillPresent', event => {
    if (event.target instanceof HTMLElement && event.target.matches('ion-modal')) modals.push(event.target)
  }, options)
  document.addEventListener('ionModalDidPresent', schedule, options)
  document.addEventListener('ionModalWillDismiss', event => {
    const modal = event.target
    if (!(modal instanceof HTMLElement) || !modal.matches('ion-modal')) return
    const field = focusedField()
    if (field && findParent(field, 'ion-modal') === modal) field.blur()
    const index = modals.lastIndexOf(modal)
    if (index >= 0) modals.splice(index, 1)
    schedule()
  }, options)
  document.addEventListener('focusin', schedule, options)
  document.addEventListener('focusout', schedule, options)
  window.addEventListener('keyboardDidShow', () => {
    keyboardVisible = true
    schedule()
  }, options)
  window.addEventListener('keyboardDidHide', () => {
    keyboardVisible = false
    schedule()
  }, options)
  window.addEventListener('resize', schedule, options)
  viewport?.addEventListener('resize', schedule, options)
  viewport?.addEventListener('scroll', schedule, options)

  nuxtApp.vueApp.onUnmount(() => {
    events.abort()
    cancelAnimationFrame(frame)
    resetPadding()
  })
})
