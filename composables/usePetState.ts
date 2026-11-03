import { ref, computed } from 'vue'
import { useDuoState } from '~/composables/useDuoState'

export interface PetDefinition {
  id: string
  name: string
  polishName: string
  emoji: string
  theme: string
  description: string
  fps: {
    idle: number
    jump: number
    sleep: number
    happy: number
  }
}

export const PET_CATALOG: PetDefinition[] = [
  { id: 'Cat', name: 'Cat', polishName: 'Kotek', emoji: '🐱', theme: 'Forest', description: 'Ciekawski i mruczący towarzysz czystego domu', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Dog', name: 'Dog', polishName: 'Piesek', emoji: '🐶', theme: 'Loyal', description: 'Wierny przyjaciel pełen energii do pomocy', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Bear', name: 'Bear', polishName: 'Niedźwiadek', emoji: '🐻', theme: 'Cuddly', description: 'Ciepły, milusiński i opiekuńczy strażnik spokoju', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Bunny', name: 'Bunny', polishName: 'Króliczek', emoji: '🐰', theme: 'Spring', description: 'Puchaty i skoczny promyk domowego słońca', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Chick', name: 'Chick', polishName: 'Kurczaczek', emoji: '🐥', theme: 'Sunny', description: 'Radosny i zawsze ciekawy wspólnych planów', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Dragon', name: 'Dragon', polishName: 'Smoczek', emoji: '🐲', theme: 'Mythic', description: 'Dzielny strażnik Waszego domowego ogniska', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Fox', name: 'Fox', polishName: 'Lisek', emoji: '🦊', theme: 'Sly', description: 'Bystry i sprytny pomocnik w codziennych obowiązkach', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Frog', name: 'Frog', polishName: 'Żabka', emoji: '🐸', theme: 'Pond', description: 'Wesoło kumkający mistrz domowego porządku', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Ghost', name: 'Ghost', polishName: 'Duszek', emoji: '👻', theme: 'Spooky', description: 'Przeuroczy duszek dbający o magię Waszego gniazdka', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Panda', name: 'Panda', polishName: 'Panda', emoji: '🐼', theme: 'Bamboo', description: 'Spokojna, kochająca drzemki i przytulasy po pracy', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Penguin', name: 'Penguin', polishName: 'Pingwinek', emoji: '🐧', theme: 'Frosty', description: 'Elegancki i zawsze chętny do wspólnego działania', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
  { id: 'Slime', name: 'Slime', polishName: 'Glutek', emoji: '🟢', theme: 'Gooey', description: 'Milutki, elastyczny i super słodki towarzysz', fps: { idle: 8, jump: 12, sleep: 6, happy: 10 } },
]

export const getPetDefinition = (id: string): PetDefinition => {
  return PET_CATALOG.find(p => p.id.toLowerCase() === id.toLowerCase()) || PET_CATALOG[0]
}

// Global animation state shared across task views
const currentAnimation = ref<'idle' | 'happy' | 'jump' | 'sleep'>('idle')
let actionTimeout: any = null

export const usePetState = () => {
  const {
    partnership,
    tasksList,
    triggerToast,
    updatePet: duoUpdatePet
  } = useDuoState()

  // Check if couple has adopted/chosen a pet
  const hasPet = computed<boolean>(() => {
    return !!partnership.value?.pet_id
  })

  // Current pet ID (e.g. 'Cat', 'Dog', etc.)
  const petId = computed<string>(() => {
    return partnership.value?.pet_id || 'Cat'
  })

  // Current pet name
  const petName = computed<string>(() => {
    return partnership.value?.pet_name || getPetDefinition(petId.value).polishName
  })

  // Pet definition details
  const currentPetDef = computed<PetDefinition>(() => {
    return getPetDefinition(petId.value)
  })

  // Pet XP (50 XP per level)
  const petXp = computed<number>(() => {
    return partnership.value?.pet_xp || 0
  })

  const petLevel = computed<number>(() => {
    return 1 + Math.floor(petXp.value / 50)
  })

  const petXpInCurrentLevel = computed<number>(() => {
    return petXp.value % 50
  })

  const petXpToNextLevel = computed<number>(() => {
    return 50 - petXpInCurrentLevel.value
  })

  const petLevelProgressPct = computed<number>(() => {
    return Math.min(100, Math.round((petXpInCurrentLevel.value / 50) * 100))
  })

  // Happiness calculation based on task completion
  const petHappiness = computed<number>(() => {
    const total = tasksList.value.length
    if (total === 0) return 100 // All clean, max happy
    const completed = tasksList.value.filter(t => t.is_completed).length
    const ratio = completed / total
    return Math.max(15, Math.min(100, Math.round(ratio * 100)))
  })

  const happinessLabel = computed<string>(() => {
    const h = petHappiness.value
    if (h >= 90) return 'Przeszczęśliwy! 💖'
    if (h >= 70) return 'Zadowolony 😊'
    if (h >= 40) return 'Czeka na Ciebie 🐾'
    return 'Potrzebuje uwagi 🥺'
  })

  const happinessEmoji = computed<string>(() => {
    const h = petHappiness.value
    if (h >= 90) return '💖'
    if (h >= 70) return '😊'
    if (h >= 40) return '🐾'
    return '🥺'
  })

  // Trigger one-shot animations ('happy' or 'jump') with automatic return
  const triggerPetAnimation = (
    anim: 'happy' | 'jump',
    durationMs?: number,
    onComplete?: () => void
  ) => {
    if (actionTimeout) clearTimeout(actionTimeout)
    currentAnimation.value = anim

    const def = currentPetDef.value
    const fps = def.fps[anim] || 10
    // 8 frames in the spritesheet -> calculate 1 or 2 full cycles
    const computedDuration = durationMs || Math.round((8 / fps) * 1000 * 1.5)

    actionTimeout = setTimeout(() => {
      // If there are no uncompleted tasks, the pet goes to sleep; otherwise idle
      const uncompletedCount = tasksList.value.filter(t => !t.is_completed).length
      if (uncompletedCount === 0) {
        currentAnimation.value = 'sleep'
      } else {
        currentAnimation.value = 'idle'
      }
      if (onComplete) onComplete()
    }, computedDuration)
  }

  // Handle entry into the Pet view
  const onEnterPetView = () => {
    const uncompletedCount = tasksList.value.filter(t => !t.is_completed).length
    if (uncompletedCount === 0) {
      // No chores to do -> pet is resting peacefully
      currentAnimation.value = 'sleep'
    } else {
      // Chores to do -> greets the user happily, then goes to idle
      triggerPetAnimation('happy', 1400)
    }
  }

  // Change pet species & optionally name
  const selectPet = async (newId: string, customName?: string) => {
    const def = getPetDefinition(newId)
    const newName = customName || def.polishName
    if (duoUpdatePet) {
      await duoUpdatePet(def.id, newName)
    } else if (partnership.value) {
      partnership.value.pet_id = def.id
      partnership.value.pet_name = newName
    }
    triggerToast(`Twój nowy pupil to: ${def.emoji} ${newName}!`, { type: 'love', title: 'Wspólny Zwierzak' })
    triggerPetAnimation('happy')
  }

  // Rename current pet
  const renamePet = async (newName: string) => {
    const clean = newName.trim()
    if (!clean) return
    if (duoUpdatePet) {
      await duoUpdatePet(petId.value, clean)
    } else if (partnership.value) {
      partnership.value.pet_name = clean
    }
    triggerToast(`Zmieniono imię zwierzaka na: "${clean}" 🐾`, { type: 'love', title: 'Wspólny Zwierzak' })
  }

  return {
    hasPet,
    PET_CATALOG,
    getPetDefinition,
    currentAnimation,
    petId,
    petName,
    currentPetDef,
    petXp,
    petLevel,
    petXpInCurrentLevel,
    petXpToNextLevel,
    petLevelProgressPct,
    petHappiness,
    happinessLabel,
    happinessEmoji,
    triggerPetAnimation,
    onEnterPetView,
    selectPet,
    renamePet
  }
}

