export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return

  // Detect iOS and standalone PWA mode
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches

  if (isIos && isStandalone) {
    // Intercept clicks on internal links to prevent iOS Safari from launching browser controls
    window.addEventListener('click', (e: MouseEvent) => {
      let target = e.target as HTMLElement | null
      while (target && target.tagName !== 'A') {
        target = target.parentElement
      }
      if (target && target.tagName === 'A') {
        const href = target.getAttribute('href')
        // Only intercept internal, non-target-blank links
        if (
          href &&
          (href.startsWith('/') || href.startsWith('#')) &&
          !target.hasAttribute('target') &&
          !href.startsWith('//')
        ) {
          e.preventDefault()
          const router = useRouter()
          router.push(href)
        }
      }
    }, true)
  }
})
