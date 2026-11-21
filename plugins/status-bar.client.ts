/**
 * Keeps the area under the notch / status bar in the colour of the screen
 * behind it: cream on the start screens (boot splash + welcome hero),
 * white everywhere else.
 *
 * - `theme-color` drives the status bar on Android and in iOS PWAs / Safari ≤ 18.
 * - html/body background covers iOS 26+ Safari, which samples the page
 *   background instead of `theme-color`, and the safe-area strip itself.
 */
const CREAM = '#f6f2e7'
const WHITE = '#ffffff'
const CREAM_ROUTES = new Set(['/', '/welcome'])

export default defineNuxtPlugin(() => {
  const router = useRouter()

  const apply = (path: string) => {
    const color = CREAM_ROUTES.has(path) ? CREAM : WHITE

    let metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    if (!metas.length) {
      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
      metas = [meta]
    }
    for (const meta of metas) {
      if (meta.content !== color) meta.content = color
    }

    document.documentElement.style.backgroundColor = color
    document.body.style.backgroundColor = color
  }

  apply(router.currentRoute.value.path)
  router.afterEach((to) => apply(to.path))
})
