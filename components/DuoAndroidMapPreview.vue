<script setup lang="ts">
import { registerPlugin } from '@capacitor/core'
import type { DuoMapPin } from '~/utils/duoMapPin'
import { androidMapAvatar } from '~/utils/androidMapAvatar'

const maps = registerPlugin<{
  snapshot(options: { partner: DuoMapPin; icon: string; width: number; height: number }): Promise<{ image: string }>
}>('DuoGoogleMapPreview')

const props = defineProps<{ partner: DuoMapPin | null }>()
const emit = defineEmits<{ failed: [] }>()
const host = ref<HTMLElement>()
const image = ref('')
let resizeObserver: ResizeObserver | undefined
let visibilityObserver: IntersectionObserver | undefined
let visible = false
let stopped = false
let requestVersion = 0
let lastInput = ''

function update() {
  const partner = props.partner
  const rect = host.value?.getBoundingClientRect()
  if (!visible || !partner || !rect?.width || !rect.height || stopped) return

  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  const input = JSON.stringify([width, height, partner])
  if (input === lastInput) return
  lastInput = input
  const version = ++requestVersion
  void androidMapAvatar(partner).then(icon => {
    if (stopped || version !== requestVersion) return
    return maps.snapshot({ partner, icon, width, height })
  }).then(result => {
    if (!result || version !== requestVersion || stopped) return
    image.value = result.image
  }).catch(() => {
    if (version !== requestVersion || stopped) return
    emit('failed')
  })
}

onMounted(() => {
  if (!host.value) return
  resizeObserver = new ResizeObserver(update)
  resizeObserver.observe(host.value)
  visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting)
    update()
  })
  visibilityObserver.observe(host.value)
})

watch(() => props.partner, update)
onBeforeUnmount(() => {
  stopped = true
  ++requestVersion
  resizeObserver?.disconnect()
  visibilityObserver?.disconnect()
})
</script>

<template>
  <div ref="host" class="android-map-preview">
    <img v-if="image" :src="image" alt="" draggable="false" />
  </div>
</template>

<style scoped>
.android-map-preview { position: absolute; inset: 0; background: var(--dn-cream); }
.android-map-preview img { display: block; width: 100%; height: 100%; object-fit: fill; }
</style>
