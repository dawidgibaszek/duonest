<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div>
              <div class="dn-header-title">
                <span>Planer Obiadów</span>
                <span class="count-chip" v-if="weekMealsCount > 0">{{ weekMealsCount }} / 7</span>
              </div>
              <p class="dn-header-subtitle">Wspólny jadłospis na ten tydzień i inspiracje</p>
            </div>
            <div class="header-buttons">
              <button
                type="button"
                class="header-action-btn"
                @click="openAddCustomModal()"
                aria-label="Dodaj własny obiad"
              >
                <ion-icon :icon="ioniconsAddOutline" />
                <span>Nowe</span>
              </button>
            </div>
          </div>
        </div>
      </ion-toolbar>

      <!-- MAIN TABS: Zakupy vs Zadania vs Obiady vs Zwierzak -->
      <ion-toolbar class="main-tabs-toolbar" data-no-swipe>
        <div class="main-tabs-pill-row">
          <button
            type="button"
            class="main-tab-pill"
            @click="switchToShopping"
          >
            <ion-icon :icon="ioniconsCartOutline" />
            <span>Zakupy</span>
            <span class="pill-count-chip" v-if="uncompletedShoppingCount > 0">{{ uncompletedShoppingCount }}</span>
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
            class="main-tab-pill active"
          >
            <ion-icon :icon="ioniconsRestaurantOutline" />
            <span>Obiady</span>
            <span class="pill-count-chip" v-if="weekMealsCount > 0">{{ weekMealsCount }}</span>
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

      <!-- SUB-VIEW SEGMENT: Kalendarz Tygodnia vs Odkrywaj z API -->
      <ion-toolbar class="subview-toolbar" data-no-swipe>
        <div class="subview-segmented-wrap">
          <button
            type="button"
            class="subview-pill"
            :class="{ active: activeSubView === 'calendar' }"
            @click="activeSubView = 'calendar'"
          >
            <ion-icon :icon="ioniconsCalendarOutline" />
            <span>Plan Tygodnia</span>
          </button>

          <button
            type="button"
            class="subview-pill"
            :class="{ active: activeSubView === 'explore' }"
            @click="activeSubView = 'explore'"
          >
            <ion-icon :icon="ioniconsSparklesOutline" />
            <span>Odkrywaj z API</span>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- ============================================== -->
      <!-- WIDOK 1: KALENDARZ TYGODNIA                    -->
      <!-- ============================================== -->
      <div v-if="activeSubView === 'calendar'" class="meals-calendar-wrapper">
        <!-- Week navigation bar -->
        <div class="week-nav-bar dn-card">
          <button
            type="button"
            class="week-nav-arrow"
            @click="changeWeek(-1)"
            aria-label="Poprzedni tydzień"
          >
            <ion-icon :icon="ioniconsChevronBackOutline" />
          </button>

          <div class="week-range-text">
            <span class="week-title">{{ weekRangeLabel }}</span>
            <button
              v-if="weekOffset !== 0"
              type="button"
              class="today-return-btn"
              @click="weekOffset = 0"
            >
              Wróć do dzisiaj
            </button>
          </div>

          <button
            type="button"
            class="week-nav-arrow"
            @click="changeWeek(1)"
            aria-label="Następny tydzień"
          >
            <ion-icon :icon="ioniconsChevronForwardOutline" />
          </button>
        </div>

        <!-- 7 Days List -->
        <div class="days-list">
          <div
            v-for="day in weekDays"
            :key="day.dateStr"
            class="dn-card day-meal-card"
            :class="{ 'is-today': day.isToday, 'has-meal': !!day.meal, 'is-completed': day.meal?.is_completed }"
          >
            <!-- Day header row -->
            <div class="day-card-header">
              <div class="day-date-info">
                <span class="day-name">{{ day.dayName }}</span>
                <span class="day-date">{{ day.displayDate }}</span>
                <span v-if="day.isToday" class="today-pill">DZISIAJ</span>
              </div>

              <!-- Cook indicator badge -->
              <div v-if="day.meal" class="cook-badge" :style="getCookBadgeStyle(day.meal.cook_id)">
                <ion-icon :icon="getCookIcon(day.meal.cook_id)" />
                <span>{{ getCookLabel(day.meal.cook_id) }}</span>
              </div>
            </div>

            <!-- When a meal is planned for this day -->
            <div v-if="day.meal" class="meal-content-row">
              <div
                class="meal-thumb-box"
                :style="day.meal.image_url ? { backgroundImage: `url(${day.meal.image_url})` } : {}"
                @click="openMealDetailsModal(day.meal)"
              >
                <div v-if="!day.meal.image_url" class="meal-thumb-fallback">
                  <ion-icon :icon="ioniconsRestaurantOutline" />
                </div>
              </div>

              <div class="meal-details-box">
                <div class="meal-title-row">
                  <h4
                    class="meal-title"
                    :class="{ 'strike': day.meal.is_completed }"
                    @click="openMealDetailsModal(day.meal)"
                  >
                    {{ day.meal.title }}
                  </h4>
                </div>

                <div class="meal-tags-row">
                  <span v-if="day.meal.category" class="tag-pill category-pill">
                    {{ day.meal.category }}
                  </span>
                  <span v-if="day.meal.area" class="tag-pill area-pill">
                    {{ day.meal.area }}
                  </span>
                  <span v-if="day.meal.ingredients?.length" class="tag-pill ingredients-pill">
                    <ion-icon :icon="ioniconsListOutline" />
                    {{ day.meal.ingredients.length }} składników
                  </span>
                </div>

                <!-- Action buttons -->
                <div class="meal-card-actions">
                  <button
                    type="button"
                    class="meal-action-btn done-toggle-btn"
                    :class="{ 'done': day.meal.is_completed }"
                    @click="handleToggleCompleted(day.meal)"
                  >
                    <ion-icon :icon="day.meal.is_completed ? ioniconsCheckmarkCircle : ioniconsCheckmarkCircleOutline" />
                    <span>{{ day.meal.is_completed ? 'Zjedzone' : 'Oznacz zjedzone' }}</span>
                  </button>

                  <button
                    v-if="day.meal.ingredients?.length"
                    type="button"
                    class="meal-action-btn shopping-add-btn"
                    @click="handleAddMealIngredientsToShopping(day.meal)"
                    title="Dodaj składniki do Listy Zakupów"
                  >
                    <ion-icon :icon="ioniconsCartOutline" />
                    <span>Do zakupów</span>
                  </button>

                  <button
                    type="button"
                    class="meal-action-btn recipe-btn"
                    @click="openMealDetailsModal(day.meal)"
                    title="Przepis i szczegóły"
                  >
                    <ion-icon :icon="ioniconsInformationCircleOutline" />
                  </button>

                  <button
                    type="button"
                    class="meal-action-btn delete-btn"
                    @click="handleDeleteMeal(day.meal.id)"
                    title="Usuń z planu"
                  >
                    <ion-icon :icon="ioniconsTrashOutline" />
                  </button>
                </div>
              </div>
            </div>

            <!-- When NO meal is planned for this day -->
            <div v-else class="day-empty-slot">
              <div class="empty-slot-text">
                <ion-icon :icon="ioniconsRestaurantOutline" class="empty-fork-icon" />
                <span>Brak zaplanowanego dania</span>
              </div>
              <div class="empty-slot-buttons">
                <button
                  type="button"
                  class="slot-btn slot-api-btn"
                  @click="openExploreForDate(day.dateStr)"
                >
                  <ion-icon :icon="ioniconsSparklesOutline" />
                  <span>Wybierz z API</span>
                </button>
                <button
                  type="button"
                  class="slot-btn slot-custom-btn"
                  @click="openAddCustomModal(day.dateStr)"
                >
                  <ion-icon :icon="ioniconsAddOutline" />
                  <span>Własne danie</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- WIDOK 2: ODKRYWAJ Z API (KATALOG & FILTRY)     -->
      <!-- ============================================== -->
      <div v-else class="meals-explore-wrapper">
        <!-- Surprise / Random meal generator banner -->
        <div class="dn-card surprise-banner">
          <div class="surprise-text-box">
            <div class="surprise-icon-circle">
              <ion-icon :icon="ioniconsShuffleOutline" />
            </div>
            <div>
              <h3 class="surprise-title">Nie wiecie co dziś zjeść?</h3>
              <p class="surprise-sub">Wylosujcie kulinarną propozycję obiadową jednym kliknięciem!</p>
            </div>
          </div>
          <button
            type="button"
            class="dn-button-primary surprise-btn"
            :disabled="isLoadingRandom"
            @click="handleSurpriseMe"
          >
            <ion-spinner v-if="isLoadingRandom" name="crescent" class="btn-spinner" />
            <ion-icon v-else :icon="ioniconsShuffleOutline" />
            <span>Zaskocz nas pomysłem</span>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="explore-search-wrap">
          <div class="custom-search-field">
            <ion-icon :icon="ioniconsSearchOutline" class="search-input-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Szukaj dania lub składnika (np. kurczak, makaron)..."
              class="search-native-input"
              @keydown.enter="triggerSearch"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear-btn"
              @click="searchQuery = ''; triggerSearch()"
            >
              <ion-icon :icon="ioniconsCloseCircle" />
            </button>
          </div>
        </div>

        <!-- Filter Chips: Kuchnie Świata -->
        <div class="filter-section">
          <div class="filter-section-header">
            <ion-icon :icon="ioniconsGlobeOutline" />
            <span>Kuchnie świata</span>
          </div>
          <div class="filter-chips-scroll" data-no-swipe>
            <button
              v-for="area in areaFilters"
              :key="area.key"
              type="button"
              class="filter-chip"
              :class="{ active: selectedArea === area.key }"
              @click="selectArea(area.key)"
            >
              <span>{{ area.label }}</span>
            </button>
          </div>
        </div>

        <!-- Filter Chips: Kategorie Dań -->
        <div class="filter-section">
          <div class="filter-section-header">
            <ion-icon :icon="ioniconsNutritionOutline" />
            <span>Rodzaj posiłku</span>
          </div>
          <div class="filter-chips-scroll" data-no-swipe>
            <button
              v-for="cat in categoryFilters"
              :key="cat.key"
              type="button"
              class="filter-chip"
              :class="{ active: selectedCategory === cat.key }"
              @click="selectCategory(cat.key)"
            >
              <span>{{ cat.label }}</span>
            </button>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="isLoadingApi" class="api-loading-state">
          <ion-spinner name="crescent" color="primary" />
          <p>Wyszukiwanie dań i przepisów...</p>
        </div>

        <!-- Empty state -->
        <div v-else-if="apiResults.length === 0" class="api-empty-state dn-card">
          <div class="empty-icon-circle">
            <ion-icon :icon="ioniconsRestaurantOutline" />
          </div>
          <h3>Nie znaleziono dań</h3>
          <p>Spróbuj zmienić filtry lub wpisać inne hasło (np. pasta, chicken, pizza).</p>
        </div>

        <!-- Meals Grid -->
        <div v-else class="meals-api-grid">
          <div
            v-for="meal in apiResults"
            :key="meal.id"
            class="dn-card api-meal-tile"
          >
            <div
              class="tile-image"
              :style="{ backgroundImage: `url(${meal.thumbnail})` }"
              @click="openApiMealPreview(meal)"
            >
              <div class="tile-category-badge">
                {{ meal.categoryPl || meal.category }}
              </div>
            </div>

            <div class="tile-body">
              <span class="tile-area-tag">{{ meal.areaPl || meal.area || 'Międzynarodowa' }}</span>
              <h4 class="tile-title" @click="openApiMealPreview(meal)">
                {{ meal.title }}
              </h4>

              <div class="tile-btn-row">
                <button
                  type="button"
                  class="tile-info-btn"
                  @click="openApiMealPreview(meal)"
                  title="Przepis i składniki"
                >
                  <ion-icon :icon="ioniconsInformationCircleOutline" />
                </button>
                <button
                  type="button"
                  class="tile-choose-btn dn-button-primary"
                  @click="openAssignModal(meal)"
                >
                  <ion-icon :icon="ioniconsAddOutline" />
                  <span>Wybierz na obiad</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Spacer for bottom bar -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>

    <!-- ============================================== -->
    <!-- MODAL 1: SZCZEGÓŁY OBIADU / PRZEPIS           -->
    <!-- ============================================== -->
    <ion-modal :is-open="showDetailsModal" @didDismiss="showDetailsModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Szczegóły Przepisu</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showDetailsModal = false">Zamknij</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding" v-if="activeSelectedMeal">
        <div class="modal-recipe-content">
          <div
            v-if="activeSelectedMeal.image_url || activeSelectedMeal.thumbnail"
            class="modal-recipe-hero"
            :style="{ backgroundImage: `url(${activeSelectedMeal.image_url || activeSelectedMeal.thumbnail})` }"
          />

          <div class="modal-recipe-header">
            <h2 class="modal-recipe-title">{{ activeSelectedMeal.title }}</h2>
            <div class="modal-recipe-tags">
              <span v-if="activeSelectedMeal.category" class="tag-pill category-pill">
                {{ activeSelectedMeal.category }}
              </span>
              <span v-if="activeSelectedMeal.area" class="tag-pill area-pill">
                {{ activeSelectedMeal.area }}
              </span>
            </div>
          </div>

          <!-- Ingredients section -->
          <div class="recipe-section" v-if="activeSelectedMeal.ingredients?.length">
            <div class="section-title-row">
              <ion-icon :icon="ioniconsNutritionOutline" />
              <h3>Składniki ({{ activeSelectedMeal.ingredients.length }})</h3>
            </div>

            <div class="ingredients-list">
              <div
                v-for="(ing, idx) in activeSelectedMeal.ingredients"
                :key="idx"
                class="ingredient-item"
              >
                <ion-icon :icon="ioniconsCheckmarkOutline" class="ing-bullet-icon" />
                <span class="ing-name">{{ ing.name }}</span>
                <span v-if="ing.measure" class="ing-measure">{{ ing.measure }}</span>
              </div>
            </div>

            <button
              type="button"
              class="dn-button-primary add-all-shopping-btn"
              @click="handleAddIngredientsFromDetails"
            >
              <ion-icon :icon="ioniconsCartOutline" />
              <span>Dodaj wszystkie składniki do Listy Zakupów</span>
            </button>
          </div>

          <!-- Instructions section -->
          <div class="recipe-section" v-if="activeSelectedMeal.instructions">
            <div class="section-title-row">
              <ion-icon :icon="ioniconsBookOutline" />
              <h3>Sposób przygotowania</h3>
            </div>
            <p class="recipe-instructions-text">{{ activeSelectedMeal.instructions }}</p>
          </div>

          <!-- YouTube Video Link -->
          <div class="recipe-section" v-if="activeSelectedMeal.youtube_url || activeSelectedMeal.youtubeUrl">
            <a
              :href="activeSelectedMeal.youtube_url || activeSelectedMeal.youtubeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="dn-button-sea video-link-btn"
            >
              <ion-icon :icon="ioniconsPlayCircleOutline" />
              <span>Zobacz wideo z przygotowania</span>
            </a>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- ============================================== -->
    <!-- MODAL 2: WYBÓR DNIA I KUCHARZA DLA DANIA Z API -->
    <!-- ============================================== -->
    <ion-modal :is-open="showAssignModal" @didDismiss="showAssignModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Zaplanuj ten obiad</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showAssignModal = false">Anuluj</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding" v-if="assignTargetMeal">
        <div class="assign-form">
          <div class="assign-meal-preview dn-card">
            <div
              class="assign-thumb"
              :style="{ backgroundImage: `url(${assignTargetMeal.thumbnail || assignTargetMeal.image_url})` }"
            />
            <div>
              <h4 class="assign-meal-name">{{ assignTargetMeal.title }}</h4>
              <p class="assign-meal-meta">{{ assignTargetMeal.categoryPl || assignTargetMeal.category }} • {{ assignTargetMeal.areaPl || assignTargetMeal.area }}</p>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Wybierz dzień tygodnia *</label>
            <div class="days-select-grid">
              <button
                v-for="d in weekDays"
                :key="d.dateStr"
                type="button"
                class="day-select-btn"
                :class="{ active: assignDate === d.dateStr }"
                @click="assignDate = d.dateStr"
              >
                <span class="btn-day-name">{{ d.shortDay }}</span>
                <span class="btn-day-date">{{ d.displayDate }}</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Kto gotuje? *</label>
            <div class="cook-select-row">
              <button
                type="button"
                class="cook-btn"
                :class="{ active: assignCook === 'me' }"
                @click="assignCook = 'me'"
              >
                <ion-icon :icon="ioniconsPersonOutline" />
                <span>Ja ({{ currentUser?.name || 'Mnie' }})</span>
              </button>

              <button
                type="button"
                class="cook-btn"
                :class="{ active: assignCook === 'partner' }"
                @click="assignCook = 'partner'"
              >
                <ion-icon :icon="ioniconsHeartOutline" />
                <span>{{ partnerUser?.name || 'Partner' }}</span>
              </button>

              <button
                type="button"
                class="cook-btn"
                :class="{ active: assignCook === 'both' }"
                @click="assignCook = 'both'"
              >
                <ion-icon :icon="ioniconsPeopleOutline" />
                <span>Razem</span>
              </button>

              <button
                type="button"
                class="cook-btn"
                :class="{ active: assignCook === 'restaurant' }"
                @click="assignCook = 'restaurant'"
              >
                <ion-icon :icon="ioniconsStorefrontOutline" />
                <span>Restauracja</span>
              </button>

              <button
                type="button"
                class="cook-btn"
                :class="{ active: assignCook === 'takeout' }"
                @click="assignCook = 'takeout'"
              >
                <ion-icon :icon="ioniconsBicycleOutline" />
                <span>Na wynos</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            class="dn-button-primary submit-assign-btn"
            :disabled="!assignDate"
            @click="confirmAssignMeal"
          >
            <ion-icon :icon="ioniconsCheckmarkOutline" />
            <span>Zapisz w Planerze</span>
          </button>
        </div>
      </ion-content>
    </ion-modal>

    <!-- ============================================== -->
    <!-- MODAL 3: DODAWANIE WŁASNEGO OBIADU             -->
    <!-- ============================================== -->
    <ion-modal :is-open="showAddCustomModal" @didDismiss="showAddCustomModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>Nowy Własny Obiad</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showAddCustomModal = false">Anuluj</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <form @submit.prevent="handleCreateCustomMeal" class="custom-meal-form">
          <div class="form-group">
            <label class="form-label">Nazwa obiadu *</label>
            <ion-input
              v-model="customTitle"
              placeholder="np. Kotlety schabowe z ziemniaczkami, Domowa lasagne..."
              class="modal-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Dzień *</label>
            <div class="days-select-grid">
              <button
                v-for="d in weekDays"
                :key="d.dateStr"
                type="button"
                class="day-select-btn"
                :class="{ active: customDate === d.dateStr }"
                @click="customDate = d.dateStr"
              >
                <span class="btn-day-name">{{ d.shortDay }}</span>
                <span class="btn-day-date">{{ d.displayDate }}</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Kto gotuje?</label>
            <div class="cook-select-row">
              <button
                type="button"
                class="cook-btn"
                :class="{ active: customCook === 'me' }"
                @click="customCook = 'me'"
              >
                <ion-icon :icon="ioniconsPersonOutline" />
                <span>Ja</span>
              </button>
              <button
                type="button"
                class="cook-btn"
                :class="{ active: customCook === 'partner' }"
                @click="customCook = 'partner'"
              >
                <ion-icon :icon="ioniconsHeartOutline" />
                <span>{{ partnerUser?.name || 'Partner' }}</span>
              </button>
              <button
                type="button"
                class="cook-btn"
                :class="{ active: customCook === 'both' }"
                @click="customCook = 'both'"
              >
                <ion-icon :icon="ioniconsPeopleOutline" />
                <span>Razem</span>
              </button>
              <button
                type="button"
                class="cook-btn"
                :class="{ active: customCook === 'restaurant' }"
                @click="customCook = 'restaurant'"
              >
                <ion-icon :icon="ioniconsStorefrontOutline" />
                <span>Restauracja</span>
              </button>
              <button
                type="button"
                class="cook-btn"
                :class="{ active: customCook === 'takeout' }"
                @click="customCook = 'takeout'"
              >
                <ion-icon :icon="ioniconsBicycleOutline" />
                <span>Na wynos</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Składniki (opcjonalnie, po przecinku lub w nowej linii)</label>
            <ion-textarea
              v-model="customIngredientsText"
              placeholder="np. schab, bułka tarta, jajka, ziemniaki..."
              class="modal-input modal-textarea"
              :rows="3"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Notatka lub przepis (opcjonalnie)</label>
            <ion-textarea
              v-model="customInstructions"
              placeholder="np. Smażyć na maśle klarowanym..."
              class="modal-input modal-textarea"
              :rows="2"
            />
          </div>

          <button
            type="submit"
            class="dn-button-primary submit-assign-btn"
            :disabled="!customTitle.trim() || !customDate"
          >
            <ion-icon :icon="ioniconsCheckmarkOutline" />
            <span>Dodaj do Planera</span>
          </button>
        </form>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useDuoState, type MealItem, type MealIngredient } from '~/composables/useDuoState'
import { usePetState } from '~/composables/usePetState'

const {
  shoppingItems,
  tasksList,
  mealsList,
  currentUser,
  partnerUser,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor,
  hexToRgba,
  activeDailySubTab,
  activeTasksMainTab,
  addMeal,
  updateMeal,
  deleteMeal,
  toggleMealCompleted,
  addIngredientsToShopping,
  refreshMeals,
  triggerToast
} = useDuoState()

const {
  hasPet,
  petLevel,
  onEnterPetView
} = usePetState()

// Sub-view switcher inside meals: 'calendar' | 'explore'
const activeSubView = ref<'calendar' | 'explore'>('calendar')

// Counts for pill chips
const uncompletedShoppingCount = computed(() => shoppingItems.value.filter(i => !i.is_completed).length)
const uncompletedTasksCount = computed(() => tasksList.value.filter(t => !t.is_completed).length)

// Week navigation offset (0 = current week, -1 = last week, +1 = next week)
const weekOffset = ref(0)

const changeWeek = (delta: number) => {
  weekOffset.value += delta
}

// Sub-tab navigation methods
const switchToShopping = () => {
  activeDailySubTab.value = 'shopping'
}

const switchToTasks = () => {
  activeDailySubTab.value = 'tasks'
  activeTasksMainTab.value = 'tasks'
}

const switchToPet = () => {
  activeDailySubTab.value = 'tasks'
  activeTasksMainTab.value = 'pet'
  try { onEnterPetView() } catch (_) {}
}

// Format Date as 'YYYY-MM-DD'
const toIsoDateString = (d: Date): string => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate 7 days of the week for weekOffset
const POLISH_DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
const POLISH_DAYS_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']
const POLISH_MONTHS_SHORT = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']

interface DaySlot {
  dateStr: string
  dayName: string
  shortDay: string
  displayDate: string
  isToday: boolean
  meal?: MealItem
}

const weekDays = computed<DaySlot[]>(() => {
  const now = new Date()
  // Current day of week: Sunday = 0, Monday = 1, ...
  const currentDayOfWeek = now.getDay()
  // Distance to this week's Monday (in ISO week Monday = 1, Sunday = 7)
  const distanceToMonday = (currentDayOfWeek + 6) % 7

  const monday = new Date(now)
  monday.setDate(now.getDate() - distanceToMonday + (weekOffset.value * 7))
  monday.setHours(0, 0, 0, 0)

  const todayIso = toIsoDateString(now)
  const days: DaySlot[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = toIsoDateString(d)
    const dayIndex = d.getDay()
    const monthIndex = d.getMonth()
    const dayNumber = d.getDate()

    const meal = mealsList.value.find(m => m.date === dateStr)

    days.push({
      dateStr,
      dayName: POLISH_DAYS[dayIndex],
      shortDay: POLISH_DAYS_SHORT[dayIndex],
      displayDate: `${dayNumber} ${POLISH_MONTHS_SHORT[monthIndex]}`,
      isToday: dateStr === todayIso,
      meal
    })
  }

  return days
})

const weekMealsCount = computed(() => {
  return weekDays.value.filter(d => !!d.meal).length
})

const weekRangeLabel = computed(() => {
  const days = weekDays.value
  if (days.length === 0) return ''
  const first = days[0].displayDate
  const last = days[6].displayDate
  return `${first} – ${last}`
})

// Cook badge helpers
const getCookLabel = (cookId?: string): string => {
  if (cookId === 'partner') return partnerUser.value?.name || 'Partner'
  if (cookId === 'both') return 'Gotujemy razem'
  if (cookId === 'restaurant') return 'Restauracja'
  if (cookId === 'takeout') return 'Dostawa na wynos'
  return currentUser.value?.name ? `Gotuje: ${currentUser.value.name}` : 'Gotuję Ja'
}

const getCookIcon = (cookId?: string) => {
  if (cookId === 'partner') return ioniconsHeartOutline
  if (cookId === 'both') return ioniconsPeopleOutline
  if (cookId === 'restaurant') return ioniconsStorefrontOutline
  if (cookId === 'takeout') return ioniconsBicycleOutline
  return ioniconsPersonOutline
}

const getCookBadgeStyle = (cookId?: string) => {
  if (cookId === 'partner') {
    const col = partnerUserAccentColor.value || '#ec4899'
    return {
      backgroundColor: hexToRgba(col, 0.12),
      color: col,
      borderColor: hexToRgba(col, 0.28)
    }
  }
  if (cookId === 'restaurant' || cookId === 'takeout') {
    return {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      color: '#d97706',
      borderColor: 'rgba(245, 158, 11, 0.28)'
    }
  }
  if (cookId === 'both') {
    return {
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      color: '#7c3aed',
      borderColor: 'rgba(139, 92, 246, 0.28)'
    }
  }
  const myCol = currentUserAccentColor.value || '#0284c7'
  return {
    backgroundColor: hexToRgba(myCol, 0.12),
    color: myCol,
    borderColor: hexToRgba(myCol, 0.28)
  }
}

// Meal actions
const handleToggleCompleted = async (meal: MealItem) => {
  await toggleMealCompleted(meal.id)
}

const handleDeleteMeal = async (id: string) => {
  await deleteMeal(id)
}

const handleAddMealIngredientsToShopping = async (meal: MealItem) => {
  if (!meal.ingredients || meal.ingredients.length === 0) return
  await addIngredientsToShopping(meal.ingredients)
}

// --- EXPLORE API STATE ---
const searchQuery = ref('')
const selectedArea = ref('all')
const selectedCategory = ref('all')
const apiResults = ref<any[]>([])
const isLoadingApi = ref(false)
const isLoadingRandom = ref(false)

const areaFilters = [
  { key: 'all', label: 'Wszystkie kuchnie' },
  { key: 'Italian', label: 'Włoska' },
  { key: 'Mexican', label: 'Meksykańska' },
  { key: 'American', label: 'Amerykańska' },
  { key: 'Chinese', label: 'Chińska' },
  { key: 'Japanese', label: 'Japońska' },
  { key: 'French', label: 'Francuska' },
  { key: 'Greek', label: 'Grecka' },
  { key: 'Polish', label: 'Polska' },
  { key: 'Indian', label: 'Indyjska' }
]

const categoryFilters = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'Pasta', label: 'Makarony' },
  { key: 'Chicken', label: 'Drób & Kurczak' },
  { key: 'Beef', label: 'Wołowina' },
  { key: 'Pork', label: 'Wieprzowina' },
  { key: 'Seafood', label: 'Ryby & Owoce morza' },
  { key: 'Vegetarian', label: 'Wegetariańskie' },
  { key: 'Side', label: 'Dodatki & Zupy' },
  { key: 'Dessert', label: 'Desery' }
]

const fetchApiMeals = async () => {
  isLoadingApi.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value.trim()) {
      params.set('q', searchQuery.value.trim())
    }
    if (selectedCategory.value !== 'all') {
      params.set('category', selectedCategory.value)
    }
    if (selectedArea.value !== 'all') {
      params.set('area', selectedArea.value)
    }

    const res = await $fetch<{ success: boolean; meals: any[] }>(`/api/meals/search?${params.toString()}`)
    if (res && res.meals) {
      apiResults.value = res.meals
    } else {
      apiResults.value = []
    }
  } catch (e) {
    console.warn('fetchApiMeals error:', e)
    apiResults.value = []
  } finally {
    isLoadingApi.value = false
  }
}

const triggerSearch = () => {
  fetchApiMeals()
}

const selectArea = (key: string) => {
  selectedArea.value = key
  if (key !== 'all') selectedCategory.value = 'all'
  fetchApiMeals()
}

const selectCategory = (key: string) => {
  selectedCategory.value = key
  if (key !== 'all') selectedArea.value = 'all'
  fetchApiMeals()
}

const handleSurpriseMe = async () => {
  isLoadingRandom.value = true
  try {
    const res = await $fetch<{ success: boolean; meals: any[] }>('/api/meals/search?random=true')
    if (res && res.meals && res.meals.length > 0) {
      openApiMealPreview(res.meals[0])
    }
  } catch (e) {
    console.warn('random meal error:', e)
  } finally {
    isLoadingRandom.value = false
  }
}

// --- MODALS & DETAILS ---
const showDetailsModal = ref(false)
const activeSelectedMeal = ref<any>(null)

const openMealDetailsModal = (meal: any) => {
  activeSelectedMeal.value = meal
  showDetailsModal.value = true
}

const openApiMealPreview = async (meal: any) => {
  // If meal has no full ingredients (from filter.php), fetch full lookup
  if (!meal.ingredients || meal.ingredients.length === 0) {
    try {
      const res = await $fetch<{ success: boolean; meal: any }>(`/api/meals/lookup?id=${meal.id}`)
      if (res && res.meal) {
        activeSelectedMeal.value = res.meal
        showDetailsModal.value = true
        return
      }
    } catch (_) {}
  }
  activeSelectedMeal.value = meal
  showDetailsModal.value = true
}

const handleAddIngredientsFromDetails = async () => {
  if (!activeSelectedMeal.value?.ingredients) return
  await addIngredientsToShopping(activeSelectedMeal.value.ingredients)
}

// --- ASSIGN MEAL TO DAY MODAL ---
const showAssignModal = ref(false)
const assignTargetMeal = ref<any>(null)
const assignDate = ref('')
const assignCook = ref<'me' | 'partner' | 'both' | 'restaurant' | 'takeout'>('me')

const openAssignModal = async (meal: any, defaultDate?: string) => {
  // Fetch full details if not loaded
  let fullMeal = meal
  if (!meal.ingredients || meal.ingredients.length === 0) {
    try {
      const res = await $fetch<{ success: boolean; meal: any }>(`/api/meals/lookup?id=${meal.id}`)
      if (res?.meal) fullMeal = res.meal
    } catch (_) {}
  }

  assignTargetMeal.value = fullMeal
  assignDate.value = defaultDate || weekDays.value.find(d => !d.meal)?.dateStr || weekDays.value[0]?.dateStr || toIsoDateString(new Date())
  assignCook.value = 'me'
  showAssignModal.value = true
}

const confirmAssignMeal = async () => {
  if (!assignTargetMeal.value || !assignDate.value) return
  const m = assignTargetMeal.value
  const targetDay = weekDays.value.find(d => d.dateStr === assignDate.value)

  await addMeal({
    date: assignDate.value,
    day_name: targetDay?.dayName || '',
    title: m.title,
    category: m.categoryPl || m.category,
    area: m.areaPl || m.area,
    cook_id: assignCook.value,
    image_url: m.thumbnail || m.image_url,
    source: 'api',
    api_id: m.id,
    ingredients: m.ingredients || [],
    instructions: m.instructions || '',
    youtube_url: m.youtubeUrl || m.youtube_url || '',
    recipe_url: m.sourceUrl || m.recipe_url || ''
  })

  showAssignModal.value = false
  activeSubView.value = 'calendar'
}

const openExploreForDate = (dateStr: string) => {
  assignDate.value = dateStr
  activeSubView.value = 'explore'
  if (apiResults.value.length === 0) {
    fetchApiMeals()
  }
}

// --- ADD CUSTOM MEAL MODAL ---
const showAddCustomModal = ref(false)
const customTitle = ref('')
const customDate = ref('')
const customCook = ref<'me' | 'partner' | 'both' | 'restaurant' | 'takeout'>('me')
const customIngredientsText = ref('')
const customInstructions = ref('')

const openAddCustomModal = (defaultDate?: string) => {
  customTitle.value = ''
  customDate.value = defaultDate || weekDays.value.find(d => !d.meal)?.dateStr || weekDays.value[0]?.dateStr || toIsoDateString(new Date())
  customCook.value = 'me'
  customIngredientsText.value = ''
  customInstructions.value = ''
  showAddCustomModal.value = true
}

const handleCreateCustomMeal = async () => {
  if (!customTitle.value.trim() || !customDate.value) return

  const ingredients: MealIngredient[] = []
  if (customIngredientsText.value.trim()) {
    const lines = customIngredientsText.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    for (const item of lines) {
      ingredients.push({ name: item })
    }
  }

  const targetDay = weekDays.value.find(d => d.dateStr === customDate.value)

  await addMeal({
    date: customDate.value,
    day_name: targetDay?.dayName || '',
    title: customTitle.value.trim(),
    cook_id: customCook.value,
    source: 'custom',
    ingredients,
    instructions: customInstructions.value.trim()
  })

  showAddCustomModal.value = false
}

const handleRefresh = async (event: any) => {
  try {
    await refreshMeals()
    if (activeSubView.value === 'explore') {
      await fetchApiMeals()
    }
  } finally {
    event.target.complete()
  }
}

onMounted(() => {
  refreshMeals()
  fetchApiMeals()
})
</script>

<style scoped>
/* MAIN TABS TOOLBAR & PILLS (Organizacja: Zakupy | Zadania | Obiady | Zwierzak) */
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
  padding: 1px 5px;
  border-radius: 999px;
}

.tab-pet-lvl {
  font-size: 10px;
  font-weight: 800;
  background: #fdf2f8;
  color: #db2777;
  padding: 1px 5px;
  border-radius: 999px;
}

/* SUB-VIEW SEGMENT TOOLBAR */
.subview-toolbar {
  --background: #ffffff;
  padding: 0 16px 8px;
}

.subview-segmented-wrap {
  display: flex;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 3px;
  border-radius: 12px;
  gap: 4px;
}

.subview-pill {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.subview-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

/* HEADER ACTION BUTTONS */
.header-action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* WIDOK 1: KALENDARZ TYGODNIA */
.meals-calendar-wrapper {
  padding: 12px 14px 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.week-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 14px;
}

.week-nav-arrow {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: #f1f5f9;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
}

.week-range-text {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.week-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.today-return-btn {
  background: none;
  border: none;
  color: #0284c7;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 2px;
}

.days-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-meal-card {
  padding: 12px 14px;
  border-radius: 16px;
  transition: all 0.2s ease;
  border: 1px solid #e2e8f0;
}

.day-meal-card.is-today {
  border-color: #0284c7;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.08);
}

.day-meal-card.is-completed {
  opacity: 0.85;
  background: #f8fafc;
}

.day-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.day-date-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.day-name {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.day-date {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.today-pill {
  font-size: 9px;
  font-weight: 800;
  background: #0284c7;
  color: #ffffff;
  padding: 1px 6px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

.cook-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
}

/* MEAL CONTENT */
.meal-content-row {
  display: flex;
  gap: 12px;
}

.meal-thumb-box {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  background-color: #f1f5f9;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.meal-thumb-fallback {
  color: #94a3b8;
  font-size: 26px;
}

.meal-details-box {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.meal-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
  cursor: pointer;
  line-height: 1.3;
}

.meal-title.strike {
  text-decoration: line-through;
  color: #94a3b8;
}

.meal-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tag-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.category-pill {
  background: #f1f5f9;
  color: #334155;
}

.area-pill {
  background: #ecfdf5;
  color: #059669;
}

.ingredients-pill {
  background: #eff6ff;
  color: #2563eb;
}

.meal-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.meal-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.done-toggle-btn.done {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.shopping-add-btn {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
}

.delete-btn {
  color: #ef4444;
  border-color: #fee2e2;
  margin-left: auto;
}

/* EMPTY SLOT */
.day-empty-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px 2px;
  gap: 8px;
  flex-wrap: wrap;
}

.empty-slot-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.empty-fork-icon {
  font-size: 16px;
}

.empty-slot-buttons {
  display: flex;
  gap: 6px;
}

.slot-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.slot-api-btn {
  background: #0f172a;
  color: #ffffff;
}

.slot-custom-btn {
  background: #f1f5f9;
  color: #334155;
}

/* WIDOK 2: ODKRYWAJ Z API */
.meals-explore-wrapper {
  padding: 12px 14px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.surprise-banner {
  padding: 14px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
}

.surprise-text-box {
  display: flex;
  align-items: center;
  gap: 12px;
}

.surprise-icon-circle {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #0f172a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.surprise-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 2px;
}

.surprise-sub {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.surprise-btn {
  width: 100%;
  padding: 9px;
  font-size: 13px;
}

/* SEARCH */
.custom-search-field {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 8px 12px;
  gap: 8px;
}

.search-input-icon {
  font-size: 18px;
  color: #94a3b8;
}

.search-native-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13.5px;
  color: #0f172a;
  outline: none;
}

.search-clear-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* FILTERS */
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-section-header {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-left: 2px;
}

.filter-chips-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.filter-chips-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.filter-chip.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

/* GRID */
.meals-api-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.api-meal-tile {
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.tile-image {
  width: 100%;
  aspect-ratio: 16 / 11;
  background-size: cover;
  background-position: center;
  background-color: #f1f5f9;
  position: relative;
  cursor: pointer;
}

.tile-category-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
}

.tile-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
}

.tile-area-tag {
  font-size: 10px;
  font-weight: 700;
  color: #059669;
  margin-bottom: 2px;
}

.tile-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 10px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}

.tile-btn-row {
  display: flex;
  gap: 6px;
}

.tile-info-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
}

.tile-choose-btn {
  flex: 1;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.api-loading-state,
.api-empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* MODALS */
.modal-recipe-hero {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-size: cover;
  background-position: center;
  border-radius: 14px;
  margin-bottom: 14px;
}

.modal-recipe-title {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 8px;
}

.modal-recipe-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.recipe-section {
  margin-bottom: 20px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: #0f172a;
}

.section-title-row h3 {
  font-size: 15px;
  font-weight: 800;
  margin: 0;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 12px;
}

.ingredient-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.ing-bullet-icon {
  color: #059669;
  font-size: 16px;
  flex-shrink: 0;
}

.ing-name {
  color: #0f172a;
  font-weight: 600;
  flex: 1;
}

.ing-measure {
  color: #64748b;
  font-weight: 700;
}

.add-all-shopping-btn {
  width: 100%;
  padding: 10px;
  font-size: 13px;
}

.recipe-instructions-text {
  font-size: 13.5px;
  color: #334155;
  line-height: 1.6;
  white-space: pre-line;
}

.video-link-btn {
  width: 100%;
  padding: 10px;
  font-size: 13px;
  text-decoration: none;
}

/* ASSIGN MODAL */
.assign-meal-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.assign-thumb {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  background-color: #f1f5f9;
}

.assign-meal-name {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 2px;
}

.assign-meal-meta {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 6px;
}

.days-select-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.day-select-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-select-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.btn-day-name {
  font-size: 12px;
  font-weight: 800;
}

.btn-day-date {
  font-size: 10px;
  opacity: 0.8;
}

.cook-select-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cook-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cook-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.submit-assign-btn {
  width: 100%;
  padding: 11px;
  font-size: 13.5px;
  margin-top: 10px;
}

.modal-input {
  --background: #f8fafc;
  --padding-start: 12px;
  --padding-end: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
}

.modal-textarea {
  min-height: 70px;
}
</style>
