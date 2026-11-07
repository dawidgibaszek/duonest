<template>
  <div
    class="pet-sprite-container"
    :style="{
      width: `${32 * scale}px`,
      height: `${32 * scale}px`
    }"
    :class="{ 'is-interactive': interactive }"
    @click="handleClick"
  >
    <!-- Ground Shadow -->
    <div
      class="pet-ground-shadow"
      :class="{
        'shadow-jumping': animation === 'jump',
        'shadow-sleeping': animation === 'sleep'
      }"
      :style="{
        width: `${24 * scale}px`,
        height: `${6 * scale}px`,
        bottom: `${1 * scale}px`
      }"
    />

    <canvas
      ref="previousCanvasRef"
      :width="32"
      :height="32"
      class="pet-canvas pet-canvas-previous"
      :class="{ 'is-visible': isSpriteTransitioning }"
      :style="{
        width: `${32 * scale}px`,
        height: `${32 * scale}px`
      }"
    />

    <!-- Canvas Sprite Renderer -->
    <canvas
      ref="canvasRef"
      :width="32"
      :height="32"
      class="pet-canvas pet-canvas-current"
      :class="{ 'is-hidden': isSpriteTransitioning }"
      :style="{
        width: `${32 * scale}px`,
        height: `${32 * scale}px`
      }"
    />

    <!-- Floating Emotion FX -->
    <transition name="fade">
      <div v-if="animation === 'sleep'" class="sleep-zzz-container">
        <span class="zzz-letter z1">z</span>
        <span class="zzz-letter z2">Z</span>
        <span class="zzz-letter z3">Z</span>
      </div>
    </transition>

    <transition name="bounce-heart">
      <div v-if="showHeart" class="click-heart-fx">
        <span>💖</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { getPetDefinition } from '~/composables/usePetState'

const props = withDefaults(
  defineProps<{
    pet?: string
    animation?: 'idle' | 'happy' | 'jump' | 'sleep'
    scale?: number
    interactive?: boolean
    loop?: boolean
  }>(),
  {
    pet: 'Cat',
    animation: 'idle',
    scale: 3,
    interactive: true,
    loop: true
  }
)

const emit = defineEmits<{
  (e: 'click', ev: MouseEvent): void
  (e: 'finished', anim: string): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const previousCanvasRef = ref<HTMLCanvasElement | null>(null)
const showHeart = ref(false)
const isSpriteTransitioning = ref(false)
let heartTimeout: any = null
let spriteLoadSequence = 0

// Animation frame state
let currentFrame = 0
let lastFrameTime = 0
let animFrameId: number | null = null
let isComponentMounted = true

// Image Cache to avoid flickering
const imageCache = new Map<string, HTMLImageElement>()
let currentImage: HTMLImageElement | null = null

const petDef = computed(() => getPetDefinition(props.pet))

const currentFps = computed(() => {
  const fpsMap = petDef.value.fps || { idle: 8, jump: 12, sleep: 6, happy: 10 }
  return fpsMap[props.animation] || 8
})

// Build asset path (using /pets/[Pet]/[pet]_[anim]_32.png)
const getSpriteUrl = (petId: string, animName: string): string => {
  const lowerPet = petId.toLowerCase()
  return `/pets/${petId}/${lowerPet}_${animName}_32.png`
}

// Load and cache sprite image
const loadSpriteImage = (petId: string, animName: string): Promise<HTMLImageElement> => {
  const url = getSpriteUrl(petId, animName)
  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url)!)
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = url
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = (err) => {
      console.warn(`[PetSprite] Failed to load sprite: ${url}`, err)
      reject(err)
    }
  })
}

// Preload all 4 animations for current pet
const preloadPetAnimations = (petId: string) => {
  const anims = ['idle', 'happy', 'jump', 'sleep']
  anims.forEach(a => {
    loadSpriteImage(petId, a).catch(() => {})
  })
}

// Draw a single 32x32 frame on the canvas
const drawFrame = (frameIndex: number) => {
  const canvas = canvasRef.value
  if (!canvas || !currentImage) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, 32, 32)

  // Each frame is 32px wide in a horizontal strip of 8 frames (256x32)
  const sx = (frameIndex % 8) * 32
  const sy = 0

  ctx.drawImage(currentImage, sx, sy, 32, 32, 0, 0, 32, 32)
}

const copyCurrentFrame = () => {
  const canvas = canvasRef.value
  const previousCanvas = previousCanvasRef.value
  const ctx = previousCanvas?.getContext('2d')
  if (!canvas || !previousCanvas || !ctx) return

  ctx.clearRect(0, 0, 32, 32)
  if (currentImage) ctx.drawImage(canvas, 0, 0, 32, 32)
}

// Main animation tick loop
const stepAnimation = (timestamp: number) => {
  if (!isComponentMounted) return

  if (!lastFrameTime) lastFrameTime = timestamp
  const elapsed = timestamp - lastFrameTime
  const frameDuration = 1000 / currentFps.value

  if (elapsed >= frameDuration) {
    lastFrameTime = timestamp

    if (currentImage) {
      drawFrame(currentFrame)
    }

    currentFrame++
    if (currentFrame >= 8) {
      if (props.loop) {
        currentFrame = 0
      } else {
        currentFrame = 7 // stay on last frame
        emit('finished', props.animation)
      }
    }
  }

  animFrameId = requestAnimationFrame(stepAnimation)
}

// Switch animation or pet cleanly
const updateSpriteSource = async () => {
  const loadSequence = ++spriteLoadSequence
  copyCurrentFrame()
  isSpriteTransitioning.value = true

  try {
    currentFrame = 0
    lastFrameTime = 0
    const img = await loadSpriteImage(props.pet, props.animation)
    if (!isComponentMounted || loadSequence !== spriteLoadSequence) return

    currentImage = img
    drawFrame(0)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (isComponentMounted && loadSequence === spriteLoadSequence) {
          isSpriteTransitioning.value = false
        }
      })
    })
  } catch (e) {
    if (loadSequence === spriteLoadSequence) isSpriteTransitioning.value = false
  }
}

const handleClick = (e: MouseEvent) => {
  if (!props.interactive) return
  showHeart.value = true
  if (heartTimeout) clearTimeout(heartTimeout)
  heartTimeout = setTimeout(() => {
    showHeart.value = false
  }, 1200)

  emit('click', e)
}

watch(
  () => [props.pet, props.animation],
  () => {
    updateSpriteSource()
  }
)

watch(
  () => props.pet,
  (newPet) => {
    preloadPetAnimations(newPet)
  },
  { immediate: true }
)

onMounted(() => {
  isComponentMounted = true
  updateSpriteSource()
  animFrameId = requestAnimationFrame(stepAnimation)
})

onUnmounted(() => {
  isComponentMounted = false
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (heartTimeout) clearTimeout(heartTimeout)
})
</script>

<style scoped>
.pet-sprite-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  cursor: default;
}

.pet-sprite-container.is-interactive {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.pet-sprite-container.is-interactive:active {
  transform: scale(0.94);
}

.pet-canvas {
  position: absolute;
  inset: 0;
  z-index: 2;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
  transition: opacity 180ms ease;
}

.pet-canvas-previous {
  opacity: 0;
}

.pet-canvas-previous.is-visible {
  opacity: 1;
}

.pet-canvas-current {
  z-index: 3;
}

.pet-canvas-current.is-hidden {
  opacity: 0;
}

/* Soft Ground Shadow */
.pet-ground-shadow {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.14);
  border-radius: 50%;
  z-index: 1;
  transition: all 0.25s ease;
}

.pet-ground-shadow.shadow-jumping {
  transform: translateX(-50%) scale(0.6);
  opacity: 0.35;
}

.pet-ground-shadow.shadow-sleeping {
  transform: translateX(-50%) scale(1.1);
  opacity: 0.1;
}

/* Zzz Floating Bubbles */
.sleep-zzz-container {
  position: absolute;
  top: -10px;
  right: -8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.zzz-letter {
  font-family: 'Comic Sans MS', 'Nunito', sans-serif;
  font-weight: 800;
  color: #8b5cf6;
  opacity: 0;
  animation: float-zzz 2.4s infinite;
}

.zzz-letter.z1 {
  font-size: 11px;
  animation-delay: 0s;
}

.zzz-letter.z2 {
  font-size: 14px;
  animation-delay: 0.8s;
  margin-left: 6px;
}

.zzz-letter.z3 {
  font-size: 17px;
  animation-delay: 1.6s;
  margin-left: 12px;
}

@keyframes float-zzz {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.6);
  }
  30% {
    opacity: 0.9;
  }
  80% {
    opacity: 0.6;
    transform: translate(6px, -18px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(10px, -26px) scale(1.1);
  }
}

/* Bounce Heart Effect on Click */
.click-heart-fx {
  position: absolute;
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  z-index: 20;
  pointer-events: none;
  animation: heart-pop 1.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes heart-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, 4px) scale(0.4);
  }
  30% {
    opacity: 1;
    transform: translate(-50%, -10px) scale(1.2);
  }
  70% {
    opacity: 0.9;
    transform: translate(-50%, -20px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -32px) scale(0.7);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

