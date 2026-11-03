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
              placeholder="Co trzeba kupić? (np. Mleko, Owoce...)"
              class="custom-ion-input"
              :clear-input="true"
            />
            <ion-input
              v-model="newItemQty"
              placeholder="Ilość"
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

          <button type="submit" class="dn-button-sea add-btn" :disabled="!newItemTitle.trim()">
            <ion-icon :icon="ioniconsAddOutline" />
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
                <span class="item-qty-tag" v-if="item.quantity">{{ item.quantity }}</span>
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
        <h3>Koszyk jest pusty</h3>
        <p>Wszystko kupione lub brak produktów w tej kategorii!</p>
      </div>

      <!-- COMPLETED SECTION -->
      <div class="completed-wrapper" v-if="filteredCompletedItems.length > 0">
        <div class="items-section-header completed-header">
          <span>KUPIONE ({{ filteredCompletedItems.length }})</span>
          <button class="clear-btn" @click="clearCompletedShopping">
            Wyczyść kupione
          </button>
        </div>

        <ion-list class="shopping-ion-list completed-list" :inset="true">
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
                  <span class="item-qty-tag strike" v-if="item.quantity">{{ item.quantity }}</span>
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

      <div style="height: 30px;"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDuoState } from '~/composables/useDuoState'
import DuoIcon from '~/components/DuoIcon.vue'

const {
  shoppingItems,
  currentUser,
  partnerUser,
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCompletedShopping,
  getUserAccentColor,
  hexToRgba
} = useDuoState()

const newItemTitle = ref('')
const newItemQty = ref('')
const selectedCategory = ref('Spożywcze')
const activeFilter = ref('Wszystkie')

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
  return shoppingItems.value.filter(item => {
    if (item.is_completed) return false
    if (activeFilter.value === 'Wszystkie') return true
    return item.category === activeFilter.value
  })
})

const filteredCompletedItems = computed(() => {
  return shoppingItems.value.filter(item => {
    if (!item.is_completed) return false
    if (activeFilter.value === 'Wszystkie') return true
    return item.category === activeFilter.value
  })
})

const getCategoryCount = (categoryName: string) => {
  if (categoryName === 'Wszystkie') {
    return shoppingItems.value.filter(i => !i.is_completed).length
  }
  return shoppingItems.value.filter(i => !i.is_completed && i.category === categoryName).length
}

const handleAddItem = async () => {
  if (!newItemTitle.value.trim()) return
  await addShoppingItem(newItemTitle.value, selectedCategory.value, newItemQty.value)
  newItemTitle.value = ''
  newItemQty.value = ''
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

const handleRefresh = (event: any) => {
  setTimeout(() => {
    event.target.complete()
  }, 600)
}
</script>

<style scoped>
.gesture-hint-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #0284c7;
  background: #f0f9ff;
  border: 1px dashed #bae6fd;
  border-radius: 8px;
  padding: 6px 12px;
  margin: 6px 16px 10px 16px;
}

.count-chip {
  background: #e0f2fe;
  color: #0284c7;
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
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.14);
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
  max-width: 90px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.qty-input:focus-within {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.14);
}

.category-select-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 10px 0;
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
  background: #e0f2fe;
  border-color: #0284c7;
  color: #0284c7;
}

.add-btn {
  width: 100%;
  margin-top: 4px;
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
}

.filter-pill.active {
  background: #0284c7;
  color: #ffffff;
  border-color: #0284c7;
}

.filter-badge {
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
}

.filter-pill.active .filter-badge {
  background: rgba(255, 255, 255, 0.3);
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
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--dn-card-shadow);
}

.shopping-item {
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --min-height: 56px;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.item-title.strike {
  text-decoration: line-through;
  color: #94a3b8;
}

.item-qty-tag {
  font-size: 11px;
  font-weight: 700;
  background: #f1f5f9;
  padding: 2px 7px;
  border-radius: 6px;
  color: #475569;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
}

.item-category-tag {
  font-size: 11px;
  color: #0284c7;
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
}

.clear-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #f0f9ff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: #0284c7;
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
