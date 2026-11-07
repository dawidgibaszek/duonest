<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="dn-header-title">
            <span>Lista Zakupów</span>
            <span class="count-chip">{{ uncompletedCount }}</span>
          </div>
          <p class="dn-header-subtitle">Wszystko, czego potrzebujecie w domu</p>
        </div>
      </ion-toolbar>

      <!-- MAIN TABS: Zakupy vs Zadania vs Obiady vs Zwierzak -->
      <ion-toolbar class="main-tabs-toolbar" data-no-swipe>
        <div class="main-tabs-pill-row">
          <button
            type="button"
            class="main-tab-pill active"
          >
            <ion-icon :icon="ioniconsCartOutline" />
            <span>Zakupy</span>
            <span class="pill-count-chip" v-if="uncompletedCount > 0">{{ uncompletedCount }}</span>
          </button>

          <button
            type="button"
            class="main-tab-pill"
            @click="switchToTasks"
          >
            <ion-icon :icon="ioniconsCheckboxOutline" />
            <span>Zadania</span>
            <span class="pill-count-chip" v-if="uncompletedTasksCount > 0">{{ uncompletedTasksCount }}</span>
          </button>

          <button
            type="button"
            class="main-tab-pill"
            @click="switchToMeals"
          >
            <ion-icon :icon="ioniconsRestaurantOutline" />
            <span>Obiady</span>
          </button>

          <button
            type="button"
            class="main-tab-pill pet-tab-pill"
            @click="switchToPet"
          >
            <ion-icon :icon="ioniconsPawOutline" />
            <span>Zwierzak</span>
            <span class="tab-pet-lvl" v-if="hasPet">lvl {{ petLevel }}</span>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- ADD ITEM CARD -->
      <div class="dn-card add-item-card">
        <form @submit.prevent="handleAddItem" class="add-item-form">
          <div class="input-row">
            <ion-input
              v-model="newItemTitle"
              maxlength="100"
              placeholder="Co trzeba kupić? (np. Mleko, Owoce...)"
              class="custom-ion-input"
              :clear-input="true"
            />
            <ion-input
              v-model="newItemQty"
              type="text"
              maxlength="30"
              placeholder="Ilość (np. 2 l)"
              class="qty-input"
            />
          </div>

          <div class="category-select-scroll">
            <button
              type="button"
              v-for="cat in categories.slice(1)"
              :key="cat.name"
              class="cat-chip"
              :class="{ active: selectedCategory === cat.name }"
              @click="selectedCategory = cat.name"
            >
              <DuoIcon :name="'cat-' + cat.key" :size="14" />
              <span>{{ cat.name }}</span>
            </button>
          </div>

          <div class="smart-quick-row" v-if="quickQtyPresets.length > 0">
            <span class="quick-label">Szybkie ilości</span>
            <div class="quick-pills">
              <button
                v-for="preset in quickQtyPresets"
                :key="preset"
                type="button"
                class="quick-pill"
                @click="newItemQty = preset"
              >
                {{ preset }}
              </button>
            </div>
          </div>

          <div class="smart-quick-row" v-if="recentShoppingSuggestions.length > 0">
            <span class="quick-label">Ostatnio kupowane</span>
            <div class="quick-pills">
              <button
                v-for="suggestion in recentShoppingSuggestions"
                :key="`${suggestion.title}-${suggestion.category}`"
                type="button"
                class="quick-pill subtle"
                @click="applyRecentSuggestion(suggestion)"
              >
                {{ suggestion.title }}
              </button>
            </div>
          </div>

          <button type="submit" class="dn-button-sea add-btn" :disabled="!newItemTitle.trim() || isSubmitting">
            <ion-spinner v-if="isSubmitting" name="crescent" style="width: 18px; height: 18px;" />
            <ion-icon v-else :icon="ioniconsAddOutline" />
            <span>Dodaj do koszyka</span>
          </button>
        </form>
      </div>

      <!-- CATEGORY FILTER CHIPS -->
      <div class="filter-scroll">
        <button
          v-for="cat in categories"
          :key="cat.name"
          class="filter-pill"
          :class="{ active: activeFilter === cat.name }"
          @click="activeFilter = cat.name"
        >
          <DuoIcon :name="'cat-' + cat.key" :size="15" />
          <span>{{ cat.name }}</span>
          <span class="filter-badge" v-if="getCategoryCount(cat.name) > 0">
            {{ getCategoryCount(cat.name) }}
          </span>
        </button>
      </div>

      <div class="shopping-search-row">
        <ion-icon :icon="ioniconsSearchOutline" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Szukaj produktów..."
          aria-label="Szukaj produktów na liście zakupów"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="search-clear-btn"
          aria-label="Wyczyść wyszukiwanie"
          @click="searchQuery = ''"
        >
          <ion-icon :icon="ioniconsCloseOutline" />
        </button>
      </div>

      <!-- ACTIVE SHOPPING LIST WITH SWIPE TO COMPLETE & DELETE -->
      <div class="items-section-header" v-if="filteredActiveItems.length > 0">
        <span>DO KUPIENIA ({{ filteredActiveItems.length }})</span>
      </div>


      <ion-list class="shopping-ion-list" :inset="true" v-if="filteredActiveItems.length > 0">
        <ion-item-sliding v-for="item in filteredActiveItems" :key="item.id">
          <!-- Swipe RIGHT gesture (side="start"): Mark as bought -->
          <ion-item-options side="start" @ionSwipe="handleSwipeComplete(item.id)">
            <ion-item-option color="success" :expandable="true" @click="handleSwipeComplete(item.id)">
              <ion-icon slot="icon-only" :icon="ioniconsCheckmarkDoneOutline" />
            </ion-item-option>
          </ion-item-options>

          <ion-item class="shopping-item" :class="{ completed: item.is_completed }" lines="full">
            <ion-checkbox
              slot="start"
              :checked="item.is_completed"
              @ionChange="toggleShoppingItem(item.id)"
              color="primary"
            />
            <ion-label>
              <div class="item-title-row">
                <span class="item-title">{{ item.title }}</span>
                <span class="item-qty-tag" v-if="item.quantity">{{ /^\d+$/.test(item.quantity) ? `×${item.quantity}` : item.quantity }}</span>
              </div>
              <div class="item-meta">
                <span class="item-category-tag">{{ item.category }}</span>
                <span
                  class="item-author-badge"
                  v-if="item.added_by"
                  :style="{
                    color: getUserAccentColor(item.added_by),
                    backgroundColor: hexToRgba(getUserAccentColor(item.added_by), 0.12),
                    borderColor: hexToRgba(getUserAccentColor(item.added_by), 0.3)
                  }"
                >
                  {{ item.added_by === currentUser.id ? 'Ty' : (partnerUser?.name || 'Partner') }}
                </span>
              </div>
            </ion-label>
            <button
              type="button"
              class="item-action-btn"
              :aria-label="`Edytuj ${item.title}`"
              @click.stop="openEditItem(item)"
            >
              <ion-icon :icon="ioniconsCreateOutline" />
            </button>
            <button
              type="button"
              class="item-action-btn delete"
              :aria-label="`Usuń ${item.title}`"
              @click.stop="handleSwipeDelete(item.id)"
            >
              <ion-icon :icon="ioniconsTrashOutline" />
            </button>
          </ion-item>

          <!-- Swipe LEFT gesture (side="end"): Delete -->
          <ion-item-options side="end" @ionSwipe="handleSwipeDelete(item.id)">
            <ion-item-option color="danger" :expandable="true" @click="handleSwipeDelete(item.id)">
              <ion-icon slot="icon-only" :icon="ioniconsTrashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <div class="empty-state" v-else-if="filteredCompletedItems.length === 0">
        <div class="empty-icon-circle">
          <DuoIcon name="empty-cart" :size="42" color-class="text-sea" />
        </div>
        <h3>{{ searchQuery.trim() ? 'Brak wyników' : 'Koszyk jest pusty' }}</h3>
        <p>{{ searchQuery.trim() ? 'Zmień frazę wyszukiwania lub kategorię.' : 'Wszystko kupione lub brak produktów w tej kategorii.' }}</p>
      </div>

      <!-- COMPLETED SECTION -->
      <div class="completed-wrapper" v-if="filteredCompletedItems.length > 0">
        <div class="items-section-header completed-header">
          <button
            type="button"
            class="completed-toggle"
            :aria-expanded="showCompletedItems"
            @click="showCompletedItems = !showCompletedItems"
          >
            <span>KUPIONE ({{ filteredCompletedItems.length }})</span>
            <ion-icon :icon="showCompletedItems ? ioniconsChevronUpOutline : ioniconsChevronDownOutline" />
          </button>
          <button type="button" class="clear-btn" @click="handleClearCompleted">
            Usuń widoczne
          </button>
        </div>

        <ion-list class="shopping-ion-list completed-list" :inset="true" v-if="showCompletedItems">
          <ion-item-sliding v-for="item in filteredCompletedItems" :key="item.id">
            <!-- Swipe RIGHT gesture (side="start"): Restore to active -->
            <ion-item-options side="start" @ionSwipe="handleSwipeRestore(item.id)">
              <ion-item-option color="primary" :expandable="true" @click="handleSwipeRestore(item.id)">
                <ion-icon slot="icon-only" :icon="ioniconsArrowUndoOutline" />
              </ion-item-option>
            </ion-item-options>

            <ion-item class="shopping-item completed" lines="full">
              <ion-checkbox
                slot="start"
                :checked="true"
                @ionChange="toggleShoppingItem(item.id)"
                color="medium"
              />
              <ion-label>
                <div class="item-title-row">
                  <span class="item-title strike">{{ item.title }}</span>
                  <span class="item-qty-tag strike" v-if="item.quantity">{{ /^\d+$/.test(item.quantity) ? `×${item.quantity}` : item.quantity }}</span>
                </div>
              </ion-label>
            </ion-item>

            <!-- Swipe LEFT gesture (side="end"): Delete -->
            <ion-item-options side="end" @ionSwipe="handleSwipeDelete(item.id)">
              <ion-item-option color="danger" :expandable="true" @click="handleSwipeDelete(item.id)">
                <ion-icon slot="icon-only" :icon="ioniconsTrashOutline" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
      </div>

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>

    <ion-modal
      :is-open="isEditModalOpen"
      @didDismiss="closeEditModal"
      class="dn-form-sheet-modal"
      :breakpoints="[0, 0.72, 0.92, 1]"
      :initial-breakpoint="0.72"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="dn-form-sheet-header ion-no-border">
        <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
        <ion-toolbar>
          <div class="dn-form-sheet-heading">
            <div class="dn-form-sheet-title-row">
              <div class="dn-form-sheet-icon">
                <ion-icon :icon="ioniconsCreateOutline" />
              </div>
              <div class="dn-form-sheet-title-text">
                <h3 class="dn-form-sheet-title">Edytuj produkt</h3>
                <span class="dn-form-sheet-subtitle">Zmień nazwę, ilość lub kategorię</span>
              </div>
            </div>
            <button type="button" class="dn-form-sheet-close" @click="closeEditModal" aria-label="Zamknij">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding shopping-edit-content">
        <form class="shopping-edit-form" @submit.prevent="handleUpdateItem">
          <div class="form-group">
            <label class="form-label" for="shopping-edit-title">Nazwa produktu</label>
            <ion-input
              id="shopping-edit-title"
              v-model="editItemTitle"
              maxlength="100"
              class="custom-ion-input"
              :clear-input="true"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="shopping-edit-quantity">Ilość</label>
            <ion-input
              id="shopping-edit-quantity"
              v-model="editItemQuantity"
              maxlength="30"
              placeholder="np. 2 l, 500 g, 1 opak."
              class="custom-ion-input"
              :clear-input="true"
            />
          </div>

          <div class="form-group">
            <span class="form-label">Kategoria</span>
            <div class="category-select-scroll">
              <button
                v-for="cat in categories.slice(1)"
                :key="cat.name"
                type="button"
                class="cat-chip"
                :class="{ active: editItemCategory === cat.name }"
                @click="editItemCategory = cat.name"
              >
                <DuoIcon :name="'cat-' + cat.key" :size="14" />
                <span>{{ cat.name }}</span>
              </button>
            </div>
          </div>

          <button type="submit" class="dn-button-sea add-btn" :disabled="!editItemTitle.trim() || isUpdatingItem">
            <ion-spinner v-if="isUpdatingItem" name="crescent" style="width: 18px; height: 18px;" />
            <ion-icon v-else :icon="ioniconsCheckmarkOutline" />
            <span>Zapisz zmiany</span>
          </button>
        </form>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDuoState, type ShoppingItem } from '~/composables/useDuoState'
import { usePetState } from '~/composables/usePetState'
import { useConfirm } from '~/composables/useConfirm'
import DuoIcon from '~/components/DuoIcon.vue'

const {
  shoppingItems,
  tasksList,
  activeDailySubTab,
  activeTasksMainTab,
  currentUser,
  partnerUser,
  addShoppingItem,
  updateShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCompletedShopping,
  getUserAccentColor,
  hexToRgba,
  initSupabaseSync
} = useDuoState()

const { confirm } = useConfirm()

const {
  hasPet,
  petLevel,
  currentPetDef,
  onEnterPetView
} = usePetState()

const uncompletedTasksCount = computed(() => {
  return tasksList.value.filter(t => !t.is_completed).length
})

const switchToTasks = () => {
  activeDailySubTab.value = 'tasks'
  activeTasksMainTab.value = 'tasks'
}

const switchToMeals = () => {
  activeDailySubTab.value = 'meals'
}

const switchToPet = () => {
  activeDailySubTab.value = 'tasks'
  activeTasksMainTab.value = 'pet'
  try {
    onEnterPetView()
  } catch (_) {}
}

const newItemTitle = ref('')
const newItemQty = ref('')
const selectedCategory = ref('Spożywcze')
const activeFilter = ref('Wszystkie')
const searchQuery = ref('')
const showCompletedItems = ref(false)
const isEditModalOpen = ref(false)
const isUpdatingItem = ref(false)
const editingItemId = ref<string | null>(null)
const editItemTitle = ref('')
const editItemQuantity = ref('')
const editItemCategory = ref('Spożywcze')
const quickQtyPresets = ['1', '2', '3', '500 g', '1 l', '1 opak.']
const recentShoppingSuggestions = ref<Array<{ title: string, category: string }>>([])

const loadRecentShoppingSuggestions = () => {
  if (typeof window === 'undefined') return

  try {
    const raw = localStorage.getItem('duonest_recent_shopping')
    if (!raw) {
      recentShoppingSuggestions.value = []
      return
    }

    const parsed = JSON.parse(raw)
    recentShoppingSuggestions.value = Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item.title === 'string' && typeof item.category === 'string').slice(0, 6)
      : []
  } catch (_) {
    recentShoppingSuggestions.value = []
  }
}

const saveRecentShoppingSuggestion = (title: string, category: string) => {
  if (typeof window === 'undefined') return

  const cleanTitle = title.trim().replace(/\s+/g, ' ')
  if (!cleanTitle) return

  const next = [{ title: cleanTitle, category: category || 'Spożywcze' }]
    .concat((recentShoppingSuggestions.value || []).filter(item => !(item.title.toLocaleLowerCase('pl-PL') === cleanTitle.toLocaleLowerCase('pl-PL') && item.category === category)))
    .slice(0, 6)

  recentShoppingSuggestions.value = next
  localStorage.setItem('duonest_recent_shopping', JSON.stringify(next))
}

const applyRecentSuggestion = (suggestion: { title: string, category: string }) => {
  newItemTitle.value = suggestion.title
  selectedCategory.value = suggestion.category
  if (!newItemQty.value.trim()) {
    const defaultQty = suggestion.title.toLowerCase().includes('mleko') ? '1 l' : suggestion.title.toLowerCase().includes('chleb') ? '1 bochenek' : ''
    if (defaultQty) {
      newItemQty.value = defaultQty
    }
  }
}

onMounted(async () => {
  loadRecentShoppingSuggestions()
  try {
    await initSupabaseSync()
  } catch (_) {}
})

const categories = [
  { name: 'Wszystkie', key: 'all' },
  { name: 'Spożywcze', key: 'groceries' },
  { name: 'Dom & Chemia', key: 'home' },
  { name: 'Kosmetyki', key: 'cosmetics' },
  { name: 'Przekąski', key: 'snacks' },
  { name: 'Napoje', key: 'drinks' },
  { name: 'Inne', key: 'other' }
]

const uncompletedCount = computed(() => {
  return shoppingItems.value.filter(i => !i.is_completed).length
})

const filteredActiveItems = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return shoppingItems.value.filter(item => {
    if (item.is_completed) return false
    if (activeFilter.value === 'Wszystkie') return true
    return item.category === activeFilter.value
  }).filter(item => matchesSearch(item, query))
})

const filteredCompletedItems = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return shoppingItems.value.filter(item => {
    if (!item.is_completed) return false
    if (activeFilter.value !== 'Wszystkie' && item.category !== activeFilter.value) return false
    return matchesSearch(item, query)
  })
})

const matchesSearch = (item: ShoppingItem, query: string) => {
  if (!query) return true
  return `${item.title} ${item.category} ${item.quantity || ''}`.toLocaleLowerCase().includes(query)
}

const getCategoryCount = (categoryName: string) => {
  if (categoryName === 'Wszystkie') {
    return shoppingItems.value.filter(i => !i.is_completed).length
  }
  return shoppingItems.value.filter(i => !i.is_completed && i.category === categoryName).length
}

const isSubmitting = ref(false)

const handleAddItem = async () => {
  if (isSubmitting.value) return
  const cleanTitle = newItemTitle.value.trim().slice(0, 100)
  if (!cleanTitle) return

  isSubmitting.value = true
  try {
    const cleanQty = newItemQty.value.trim().slice(0, 30)
    await addShoppingItem(cleanTitle, selectedCategory.value, cleanQty)
    saveRecentShoppingSuggestion(cleanTitle, selectedCategory.value)
    newItemTitle.value = ''
    newItemQty.value = ''
  } finally {
    isSubmitting.value = false
  }
}

const openEditItem = (item: ShoppingItem) => {
  editingItemId.value = item.id
  editItemTitle.value = item.title
  editItemQuantity.value = item.quantity || ''
  editItemCategory.value = item.category
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
}

const handleUpdateItem = async () => {
  if (!editingItemId.value || !editItemTitle.value.trim() || isUpdatingItem.value) return

  isUpdatingItem.value = true
  try {
    const saved = await updateShoppingItem(editingItemId.value, {
      title: editItemTitle.value.trim(),
      quantity: editItemQuantity.value.trim() || null,
      category: editItemCategory.value
    })
    if (saved) closeEditModal()
  } finally {
    isUpdatingItem.value = false
  }
}

const handleSwipeComplete = (id: string) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(15)
  }
  toggleShoppingItem(id)
}

const handleSwipeRestore = (id: string) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10)
  }
  toggleShoppingItem(id)
}

const handleSwipeDelete = (id: string) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([10, 30, 10])
  }
  deleteShoppingItem(id)
}

const handleClearCompleted = async () => {
  const count = filteredCompletedItems.value.length
  if (count === 0) return
  const confirmed = await confirm({
    title: 'Wyczyść kupione produkty',
    message: `Czy na pewno chcesz usunąć ${count} widocznych kupionych produktów z listy zakupów?`,
    confirmText: 'Usuń widoczne',
    cancelText: 'Anuluj',
    type: 'danger',
    icon: 'trash'
  })
  if (confirmed) {
    clearCompletedShopping(filteredCompletedItems.value.map(item => item.id))
  }
}

const handleRefresh = async (event: any) => {
  try {
    await initSupabaseSync()
  } catch (_) {}
  finally {
    event.target.complete()
  }
}
</script>

<style scoped>
/* MAIN TABS TOOLBAR & PILLS (Codzienność: Zakupy | Zadania | Zwierzak) */
.main-tabs-toolbar {
  --background: #ffffff;
  padding: 4px 16px 8px 16px;
}

.main-tabs-pill-row {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.main-tabs-pill-row::-webkit-scrollbar {
  display: none;
}

.main-tab-pill {
  flex: 1 0 auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 10px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.main-tab-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.main-tab-pill.pet-tab-pill.active {
  color: #db2777;
}

.pill-count-chip {
  background: #0f172a;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}

.tab-pet-emoji {
  font-size: 15px;
}

.tab-pet-lvl {
  font-size: 10px;
  font-weight: 800;
  background: #fdf2f8;
  color: #db2777;
  padding: 1px 5px;
  border-radius: 999px;
}

.gesture-hint-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 6px 12px;
  margin: 6px 16px 10px 16px;
}

.count-chip {
  background: #f1f5f9;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  padding: 2px 9px;
  border-radius: 999px;
}

/* ADD ITEM FORM */
.add-item-card {
  padding: 16px;
  margin-bottom: 8px;
}

.add-item-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-row {
  display: flex;
  gap: 8px;
}

.custom-ion-input {
  flex: 2;
  --background: #f8fafc;
  --padding-start: 14px;
  --padding-end: 14px;
  --border-radius: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.custom-ion-input:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.qty-input {
  flex: 1;
  --background: #f8fafc;
  --padding-start: 12px;
  --border-radius: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  max-width: 150px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.qty-input:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.category-select-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 0;
  scrollbar-width: none;
}
.category-select-scroll::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
}

.cat-chip.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.add-btn {
  width: 100%;
  margin-top: 0;
}

.smart-quick-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-label {
  display: block;
  line-height: 1.3;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.quick-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-pill {
  border: 1px solid #dfe7f2;
  background: #f8fafc;
  color: #0f172a;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-pill:hover,
.quick-pill:focus-visible {
  border-color: #0f172a;
  background: #eef2ff;
  outline: none;
}

.quick-pill.subtle {
  background: #eef6ff;
  border-color: #cfe2ff;
}

/* FILTER PILLS */
.filter-scroll {
  display: flex;
  gap: 8px;
  padding: 6px 16px 12px 16px;
  overflow-x: auto;
  scrollbar-width: none;
}
.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  transition: all 0.15s ease;
}

.filter-pill:active {
  transform: scale(0.96);
}

.filter-pill.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.filter-badge {
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
}

.filter-pill.active .filter-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.shopping-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  margin: 0 16px 8px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #64748b;
}

.shopping-search-row > ion-icon {
  flex: 0 0 auto;
  font-size: 18px;
}

.shopping-search-row input {
  width: 100%;
  min-width: 0;
  height: 44px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font: inherit;
  font-size: 14px;
}

.shopping-search-row:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.search-clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border: 0;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  font-size: 18px;
}

/* LIST & ITEMS */
.items-section-header {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #64748b;
  padding: 8px 20px 4px 20px;
}

.shopping-ion-list {
  background: transparent;
  margin: 4px 16px 16px 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03), 0 4px 12px rgba(15, 23, 42, 0.04);
}

.shopping-item {
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --min-height: 56px;
  min-width: 0;
  overflow: hidden;
}

.shopping-item ion-label {
  white-space: normal !important;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.item-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  width: 100%;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  flex: 1;
  min-width: 0;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: break-word;
}

.item-title.strike {
  text-decoration: line-through;
  color: #94a3b8;
}

.item-qty-tag {
  font-size: 11px;
  font-weight: 700;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 2px 7px;
  border-radius: 6px;
  color: #475569;
  flex-shrink: 0;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
}

.item-category-tag {
  font-size: 11px;
  color: #0f172a;
  font-weight: 600;
}

.item-author {
  font-size: 11px;
  color: #94a3b8;
}

.item-author-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
}

/* COMPLETED SECTION */
.completed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.completed-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.completed-toggle ion-icon {
  font-size: 16px;
}

.clear-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  min-height: 40px;
  padding: 0 4px;
  white-space: nowrap;
}

.item-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  margin-left: 4px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #64748b;
  font-size: 18px;
  cursor: pointer;
  touch-action: manipulation;
}

.item-action-btn:hover,
.item-action-btn:focus-visible {
  background: #f1f5f9;
  color: #0f172a;
  outline: none;
}

.item-action-btn.delete:hover,
.item-action-btn.delete:focus-visible {
  background: #fef2f2;
  color: #dc2626;
}

.shopping-edit-content {
  --background: #ffffff;
  --padding-start: 18px;
  --padding-end: 18px;
  --padding-bottom: max(24px, env(safe-area-inset-bottom));
}

.shopping-edit-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-top: 6px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #f1f5f9;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: #0f172a;
}

.empty-state h3 {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.empty-state p {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
}
</style>
