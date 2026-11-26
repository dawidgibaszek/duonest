<template>
  <ion-page>
    <ion-header :translucent="true">
      <DuoOrganizationNav />
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div class="dn-header-title">Zakupy</div>
            <button
              type="button"
              class="dn-header-btn"
              aria-label="Dodaj produkt"
              @click="isAddSheetOpen = true"
            >
              <ion-icon :icon="ioniconsAddOutline" aria-hidden="true" />
              <span>Produkt</span>
            </button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <div class="shopping-controls" data-no-swipe>
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
        <ion-select
          class="shopping-category-select"
          v-model="activeFilter"
          interface="alert"
          :interface-options="{ header: 'Kategoria produktów' }"
          :selected-text="activeFilter === 'Wszystkie' ? 'Kategorie' : activeFilter"
          aria-label="Kategoria produktów"
          ok-text="Zastosuj"
          cancel-text="Anuluj"
        >
          <ion-select-option v-for="cat in categories" :key="cat.key" :value="cat.name">
            {{ cat.name }}
          </ion-select-option>
        </ion-select>
      </div>

      <!-- ACTIVE SHOPPING LIST WITH SWIPE TO COMPLETE & DELETE -->
      <div class="items-section-header" v-if="filteredActiveItems.length > 0">
        <span>Do kupienia · {{ filteredActiveItems.length }}</span>
      </div>

      <div class="shopping-list-wrapper" v-if="filteredActiveItems.length > 0">
        <TransitionGroup name="dn-list" tag="div" class="shopping-transition-container">
          <ion-item-sliding
            v-for="item in filteredActiveItems"
            :key="item.id"
            :class="{
              'dn-completing': completingItemIds.has(item.id),
              'dn-just-added': justAddedItemId === item.id
            }"
          >
            <!-- Swipe RIGHT gesture (side="start"): Mark as bought -->
            <ion-item-options side="start" @ionSwipe="handleSwipeComplete(item.id)">
              <ion-item-option color="success" :expandable="true" @click="handleSwipeComplete(item.id)">
                <ion-icon slot="icon-only" :icon="ioniconsCheckmarkDoneOutline" />
              </ion-item-option>
            </ion-item-options>

            <ion-item class="shopping-item" :class="{ completed: item.is_completed }" lines="none">
              <!-- Custom Interactive Animated Checkbox -->
              <button
                slot="start"
                type="button"
                class="dn-checkbox-btn"
                :class="{ checked: item.is_completed || completingItemIds.has(item.id) }"
                :aria-label="item.is_completed ? 'Odznacz produkt' : 'Oznacz jako kupione'"
                @click.stop="animatedToggleShoppingItem(item.id, item.is_completed)"
              >
                <ion-icon
                  :icon="ioniconsCheckmarkOutline"
                  class="dn-check-icon"
                  :class="{ 'dn-check-pop': completingItemIds.has(item.id) }"
                />
              </button>

              <div class="shopping-item-content" @click="openEditItem(item)">
                <div class="item-title-row">
                  <span
                    class="item-title"
                    :class="{
                      strike: item.is_completed,
                      'dn-strike-animated': completingItemIds.has(item.id)
                    }"
                  >
                    {{ item.title }}
                  </span>
                  <span class="item-qty-tag" v-if="item.quantity">
                    {{ /^\d+$/.test(item.quantity) ? `×${item.quantity}` : item.quantity }}
                  </span>
                </div>
                <div class="item-meta">
                  <span class="item-category-tag">
                    <DuoIcon :name="'cat-' + getCategoryKey(item.category)" :size="12" class="meta-cat-icon" />
                    <span>{{ item.category }}</span>
                  </span>
                  <span
                    class="item-author-badge"
                    v-if="item.added_by"
                  >
                    {{ item.added_by === currentUser?.id ? 'Ty' : (partnerDisplayName) }}
                  </span>
                </div>
              </div>

              <div slot="end" class="item-actions-cluster">
                <button
                  type="button"
                  class="item-action-btn edit-btn"
                  :aria-label="`Edytuj ${item.title}`"
                  @click.stop="openEditItem(item)"
                >
                  <ion-icon :icon="ioniconsCreateOutline" />
                </button>
                <button
                  type="button"
                  class="item-action-btn delete-btn"
                  :aria-label="`Usuń ${item.title}`"
                  @click.stop="animatedDeleteShoppingItem(item.id)"
                >
                  <ion-icon :icon="ioniconsTrashOutline" />
                </button>
              </div>
            </ion-item>

            <!-- Swipe LEFT gesture (side="end"): Delete -->
            <ion-item-options side="end" @ionSwipe="handleSwipeDelete(item.id)">
              <ion-item-option color="danger" :expandable="true" @click="handleSwipeDelete(item.id)">
                <ion-icon slot="icon-only" :icon="ioniconsTrashOutline" />
              </ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </TransitionGroup>
      </div>

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
            <span>Kupione · {{ filteredCompletedItems.length }}</span>
            <ion-icon :icon="showCompletedItems ? ioniconsChevronUpOutline : ioniconsChevronDownOutline" />
          </button>
          <button type="button" class="clear-btn" @click="handleClearCompleted">
            Usuń widoczne
          </button>
        </div>

        <div class="shopping-list-wrapper completed-list-wrapper" v-if="showCompletedItems">
          <TransitionGroup name="dn-list" tag="div" class="shopping-transition-container">
            <ion-item-sliding
              v-for="item in filteredCompletedItems"
              :key="item.id"
            >
              <!-- Swipe RIGHT gesture (side="start"): Restore to active -->
              <ion-item-options side="start" @ionSwipe="handleSwipeRestore(item.id)">
                <ion-item-option color="primary" :expandable="true" @click="handleSwipeRestore(item.id)">
                  <ion-icon slot="icon-only" :icon="ioniconsArrowUndoOutline" />
                </ion-item-option>
              </ion-item-options>

              <ion-item class="shopping-item completed" lines="none">
                <button
                  slot="start"
                  type="button"
                  class="dn-checkbox-btn checked"
                  aria-label="Przywróć produkt do listy"
                  @click.stop="animatedToggleShoppingItem(item.id, true)"
                >
                  <ion-icon :icon="ioniconsCheckmarkOutline" class="dn-check-icon" />
                </button>

                <div class="shopping-item-content" @click="animatedToggleShoppingItem(item.id, true)">
                  <div class="item-title-row">
                    <span class="item-title strike">{{ item.title }}</span>
                    <span class="item-qty-tag strike" v-if="item.quantity">{{ /^\d+$/.test(item.quantity) ? `×${item.quantity}` : item.quantity }}</span>
                  </div>
                </div>

                <div slot="end" class="item-actions-cluster">
                  <button
                    type="button"
                    class="item-action-btn delete-btn"
                    :aria-label="`Usuń ${item.title}`"
                    @click.stop="animatedDeleteShoppingItem(item.id)"
                  >
                    <ion-icon :icon="ioniconsTrashOutline" />
                  </button>
                </div>
              </ion-item>

              <!-- Swipe LEFT gesture (side="end"): Delete -->
              <ion-item-options side="end" @ionSwipe="handleSwipeDelete(item.id)">
                <ion-item-option color="danger" :expandable="true" @click="handleSwipeDelete(item.id)">
                  <ion-icon slot="icon-only" :icon="ioniconsTrashOutline" />
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </TransitionGroup>
        </div>
      </div>

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>

    <!-- ADD ITEM SHEET (opened from the "+" in the header) -->
    <ion-modal
      :is-open="isAddSheetOpen"
      @didDismiss="isAddSheetOpen = false"
      class="dn-form-sheet-modal"
      :expand-to-scroll="false"
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
              <div class="dn-form-sheet-title-text">
                <h3 class="dn-form-sheet-title">Nowy produkt</h3>
                <span class="dn-form-sheet-subtitle">Arkusz zostaje otwarty – możesz dodać kilka rzeczy pod rząd</span>
              </div>
            </div>
            <button type="button" class="dn-form-sheet-close" @click="isAddSheetOpen = false" aria-label="Zamknij">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding shopping-add-content">
        <form @submit.prevent="handleAddItem" class="add-item-form">
          <div class="input-row">
            <ion-input aria-label="Nazwa produktu"
              v-model="newItemTitle"
              maxlength="100"
              placeholder="Co trzeba kupić? (np. Mleko, Owoce...)"
              class="custom-ion-input"
              :clear-input="true"
            />
            <ion-input aria-label="Ilość"
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

          <button type="submit" class="dn-button-sea add-btn" :disabled="isSubmitting">
            <ion-spinner v-if="isSubmitting" name="crescent" style="width: 18px; height: 18px;" />
            <ion-icon v-else :icon="ioniconsAddOutline" />
            <span>Dodaj do koszyka</span>
          </button>
        </form>
      </ion-content>
    </ion-modal>

    <ion-modal
      :is-open="isEditModalOpen"
      @didDismiss="closeEditModal"
      class="dn-form-sheet-modal"
      :expand-to-scroll="false"
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
            <ion-input aria-label="Nazwa produktu"
              id="shopping-edit-title"
              v-model="editItemTitle"
              maxlength="100"
              class="custom-ion-input"
              :clear-input="true"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="shopping-edit-quantity">Ilość</label>
            <ion-input aria-label="Ilość"
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

          <button type="submit" class="dn-button-sea add-btn" :disabled="isUpdatingItem">
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
import { useDuoState } from '~/composables/useDuoState'
import type { ShoppingItem } from '~/types/duo'
import { usePetState } from '~/composables/usePetState'
import { useConfirm } from '~/composables/useConfirm'
import DuoIcon from '~/components/DuoIcon.vue'

const {
  shoppingItems,
  currentUser,
  partnerUser,
  partnerDisplayName,
  addShoppingItem,
  updateShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCompletedShopping,
  getUserAccentColor,
  hexToRgba,
  initSupabaseSync,
  triggerToast
} = useDuoState()

const { confirm } = useConfirm()

const newItemTitle = ref('')
const newItemQty = ref('')
const selectedCategory = ref('Spożywcze')
const activeFilter = ref('Wszystkie')
const searchQuery = ref('')
const showCompletedItems = ref(false)
const isEditModalOpen = ref(false)
const isAddSheetOpen = ref(false)
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

const completingItemIds = ref<Set<string>>(new Set())

const filteredActiveItems = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return shoppingItems.value.filter(item => {
    if (item.is_completed && !completingItemIds.value.has(item.id)) return false
    if (activeFilter.value === 'Wszystkie') return true
    return item.category === activeFilter.value
  }).filter(item => matchesSearch(item, query))
})

const filteredCompletedItems = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return shoppingItems.value.filter(item => {
    if (!item.is_completed || completingItemIds.value.has(item.id)) return false
    if (activeFilter.value !== 'Wszystkie' && item.category !== activeFilter.value) return false
    return matchesSearch(item, query)
  })
})

const matchesSearch = (item: ShoppingItem, query: string) => {
  if (!query) return true
  return `${item.title} ${item.category} ${item.quantity || ''}`.toLocaleLowerCase().includes(query)
}

const isSubmitting = ref(false)
const justAddedItemId = ref<string | null>(null)

const getCategoryKey = (catName: string) => {
  const found = categories.find(c => c.name === catName)
  return found?.key || 'groceries'
}

const animatedToggleShoppingItem = (id: string, currentlyCompleted?: boolean) => {
  if (completingItemIds.value.has(id)) return

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(currentlyCompleted ? 15 : 30)
  }
  completingItemIds.value.add(id)
  toggleShoppingItem(id)
  setTimeout(() => {
    completingItemIds.value.delete(id)
  }, 320)
}

const animatedDeleteShoppingItem = (id: string) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([15, 30, 15])
  }
  deleteShoppingItem(id)
}

const handleAddItem = async () => {
  if (isSubmitting.value) return
  const cleanTitle = newItemTitle.value.trim().slice(0, 100)
  if (!cleanTitle) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([20, 30, 20])
    }
    triggerToast('Wpisz nazwę produktu przed dodaniem do koszyka', { type: 'warning' })
    return
  }

  isSubmitting.value = true
  try {
    const cleanQty = newItemQty.value.trim().slice(0, 30)
    const addedId = await addShoppingItem(cleanTitle, selectedCategory.value, cleanQty)
    if (!addedId) return
    saveRecentShoppingSuggestion(cleanTitle, selectedCategory.value)
    newItemTitle.value = ''
    newItemQty.value = ''

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 25])
    }

    if (addedId) {
      justAddedItemId.value = addedId
      setTimeout(() => {
        if (justAddedItemId.value === addedId) {
          justAddedItemId.value = null
        }
      }, 2200)
    }

    triggerToast(`Dodano "${cleanTitle}" do listy zakupów`, { type: 'shopping' })
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
  if (!editingItemId.value || isUpdatingItem.value) return
  const cleanTitle = editItemTitle.value.trim()
  if (!cleanTitle) {
    triggerToast('Wpisz nazwę produktu przed zapisaniem zmian', { type: 'warning' })
    return
  }

  isUpdatingItem.value = true
  try {
    const saved = await updateShoppingItem(editingItemId.value, {
      title: cleanTitle,
      quantity: editItemQuantity.value.trim() || null,
      category: editItemCategory.value
    })
    if (saved) {
      triggerToast('Zaktualizowano produkt', { type: 'shopping' })
      closeEditModal()
    }
  } finally {
    isUpdatingItem.value = false
  }
}

const handleSwipeComplete = (id: string) => {
  animatedToggleShoppingItem(id, false)
}

const handleSwipeRestore = (id: string) => {
  animatedToggleShoppingItem(id, true)
}

const handleSwipeDelete = (id: string) => {
  animatedDeleteShoppingItem(id)
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
.dn-completing {
  animation-duration: 0.32s;
}

.dn-check-pop {
  animation-duration: 0.32s;
}
/* MAIN TABS TOOLBAR & PILLS (Codzienność: Zakupy | Zadania | Zwierzak) */

.gesture-hint-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #1c1b19;
  background: #f8f9fb;
  border: 1px dashed #d4d4d4;
  border-radius: 8px;
  padding: 6px 12px;
  margin: 6px 16px 10px 16px;
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
  --background: var(--dn-field);
  --padding-start: 14px;
  --padding-end: 14px;
  --border-radius: 14px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--dn-field-line);
  font-size: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-height: 52px;
}

.custom-ion-input:focus-within {
  border-color: var(--dn-ink);
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
}

.qty-input {
  flex: 1;
  --background: var(--dn-field);
  --padding-start: 12px;
  --border-radius: 14px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--dn-field-line);
  font-size: 16px;
  max-width: 150px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-height: 52px;
}

.qty-input:focus-within {
  border-color: var(--dn-ink);
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
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
  font-weight: 500;
  background: var(--dn-soft);
  border: none;
  color: #545454;
  cursor: pointer;
  white-space: nowrap;
}

.cat-chip.active {
  background: #1c1b19;
  border-color: #1c1b19;
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
  color: #737373;
}

.quick-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-pill {
  border: none;
  background: var(--dn-soft);
  color: #1c1b19;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-pill:hover,
.quick-pill:focus-visible {
  border-color: #1c1b19;
  background: #f0f1f3;
  outline: none;
}

.quick-pill.subtle {
  background: #f3f4f6;
  border-color: #e0e0e0;
}

.shopping-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 6px 16px 8px;
}

.shopping-category-select {
  flex: 0 1 auto;
  width: auto;
  max-width: 100%;
  min-height: 46px;
  border-radius: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
  background: var(--dn-soft);
  color: var(--dn-ink);
  font-size: 0.875rem;
}

.shopping-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  flex: 1 1 9rem;
  min-width: 0;
  padding: 0 12px;
  border: 1px solid var(--dn-line);
  border-radius: 12px;
  background: #ffffff;
  color: #737373;
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
  color: #1c1b19;
  font: inherit;
  font-size: 14px;
}

.shopping-search-row:focus-within {
  border-color: var(--dn-ink);
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
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
  background: var(--dn-soft);
  color: #545454;
  font-size: 18px;
}

/* LIST & ITEMS */
.items-section-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #737373;
  padding: 8px 20px 4px 20px;
}

.shopping-list-wrapper {
  margin: 4px 16px 16px 16px;
}

.shopping-transition-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shopping-item {
  --background: #ffffff;
  --padding-start: 14px;
  --inner-padding-end: 12px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  --min-height: 64px;
  border-radius: 16px;
  border: 1px solid #eff0f2;
  background: #ffffff;
  box-shadow: none;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  margin-bottom: 8px;
  overflow: hidden;
}

.shopping-item:hover {
  border-color: #e5e6e8;
  box-shadow: none;
}

.shopping-item.completed {
  background: #f8f9fb;
  border-color: #f2f3f5;
  box-shadow: none;
  opacity: 0.82;
}

/* Custom Checkbox */
.dn-checkbox-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  min-width: 25px;
  border-radius: 50%;
  border: none;
  background: var(--dn-soft);
  color: transparent;
  cursor: pointer;
  margin-inline-end: 12px;
  margin-inline-start: 0;
  padding: 0;
  transition: all 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.dn-checkbox-btn:hover {
  border-color: #1c1b19;
  transform: scale(1.08);
}

.dn-checkbox-btn.checked {
  background: #1c1b19;
  border-color: #1c1b19;
  color: #ffffff;
  box-shadow: none;
}

.dn-check-icon {
  font-size: 15px;
  stroke-width: 2.5;
  transition: transform 0.2s ease;
}

.shopping-item-content {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  padding: 6px 0;
}

.item-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.item-title {
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
  line-height: 1.35;
  letter-spacing: -0.01em;
  transition: color 0.2s ease;
  word-break: break-word;
}

.item-title.strike {
  text-decoration: line-through;
  color: #a2a2a2;
}

.item-qty-tag {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  background: var(--dn-soft);
  border: none;
  padding: 2px 8px;
  border-radius: 999px;
  color: #404040;
  flex-shrink: 0;
  white-space: nowrap;
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.item-qty-tag.strike {
  text-decoration: line-through;
  opacity: 0.6;
}

.item-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 5px;
}

.item-category-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #545454;
  font-weight: 600;
  background: #f8f9fb;
  border: 1px solid #eff0f2;
  padding: 2px 7px;
  border-radius: 6px;
}

.meta-cat-icon {
  display: inline-flex;
}

.item-author-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--dn-soft);
  color: var(--dn-muted);
  font-size: 11.5px;
  font-weight: 500;
}

.item-actions-cluster {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-inline-start: 10px;
  margin-inline-end: 0;
  flex-shrink: 0;
}

.item-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: #f8f9fb;
  color: #737373;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 0;
}

.item-action-btn.edit-btn:hover,
.item-action-btn.edit-btn:active {
  background: #f2f3f5;
  border-color: #d4d4d4;
  color: #1c1b19;
  transform: scale(1.06);
}

.item-action-btn.delete-btn:hover,
.item-action-btn.delete-btn:active {
  background: #f3f4f6;
  border-color: #fcefec;
  color: #d96856;
  transform: scale(1.06);
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
  color: #737373;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.completed-toggle ion-icon {
  font-size: 16px;
}

.clear-btn {
  background: none;
  border: none;
  color: #d96856;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  min-height: 40px;
  padding: 0 4px;
  white-space: nowrap;
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

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #f2f3f5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: #1c1b19;
}

.empty-state h3 {
  font-size: 17px;
  font-weight: 700;
  color: #1c1b19;
}

.empty-state p {
  font-size: 13px;
  color: #737373;
  margin-top: 4px;
}

/* ===== Beige accent: empty states ===== */
.empty-icon-circle {
  background: var(--dn-cream) !important;
  color: var(--dn-cream-ink) !important;
  border: none !important;
}
</style>
