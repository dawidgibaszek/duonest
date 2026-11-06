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
                @click="activeSubView === 'my-recipes' ? openAddCookbookRecipeModal() : openAddCustomModal()"
                :aria-label="activeSubView === 'my-recipes' ? 'Dodaj przepis do książki' : 'Dodaj własny obiad'"
              >
                <ion-icon :icon="ioniconsAddOutline" />
                <span style="text-wrap: nowrap;">{{ activeSubView === 'my-recipes' ? 'Nowy przepis' : 'Własne' }}</span>
              </button>
            </div>
          </div>
        </div>
      </ion-toolbar>

      <!-- MAIN TABS: Zakupy vs Zadania vs Obiady vs Zwierzak (ZERO EMOJIS - ONLY SVG) -->
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

      <!-- SUB-VIEW SEGMENT: Plan Tygodnia vs Twoje Przepisy vs Inspiracje -->
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
            :class="{ active: activeSubView === 'my-recipes' }"
            @click="activeSubView = 'my-recipes'"
          >
            <ion-icon :icon="ioniconsBookOutline" />
            <span>Twoje Przepisy</span>
            <span class="subview-count-badge" v-if="savedRecipes.length > 0">{{ savedRecipes.length }}</span>
          </button>

          <button
            type="button"
            class="subview-pill"
            :class="{ active: activeSubView === 'explore' }"
            @click="activeSubView = 'explore'"
          >
            <ion-icon :icon="ioniconsSparklesOutline" />
            <span>Inspiracje</span>
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
                    {{ formatMealTitlePl(day.meal.titlePl || day.meal.title) }}
                  </h4>
                </div>

                <div class="meal-tags-row">
                  <span v-if="day.meal.categoryPl || day.meal.category" class="tag-pill category-pill">
                    {{ day.meal.categoryPl || day.meal.category }}
                  </span>
                  <span v-if="day.meal.areaPl || day.meal.area" class="tag-pill area-pill">
                    {{ day.meal.areaPl || day.meal.area }}
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
                    @click.stop="handleDeleteMeal(day.meal.id, day.meal.title)"
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
                  class="slot-btn slot-saved-btn"
                  @click="openPickSavedModal(day.dateStr)"
                >
                  <ion-icon :icon="ioniconsBookOutline" />
                  <span>Z Twoich przepisów</span>
                  <span class="slot-count-badge" v-if="savedRecipes.length > 0">{{ savedRecipes.length }}</span>
                </button>
                <button
                  type="button"
                  class="slot-btn slot-primary-btn"
                  @click="openExploreForDate(day.dateStr)"
                >
                  <ion-icon :icon="ioniconsSparklesOutline" />
                  <span>Z inspiracji</span>
                </button>
                <button
                  type="button"
                  class="slot-btn slot-secondary-btn"
                  @click="openAddCustomModal(day.dateStr)"
                >
                  <ion-icon :icon="ioniconsAddOutline" />
                  <span>Własne</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- WIDOK 2: TWOJE PRZEPISY (KSIĄŻKA KUCHARSKA)    -->
      <!-- ============================================== -->
      <div v-else-if="activeSubView === 'my-recipes'" class="saved-recipes-wrapper">
        <!-- Top Hero Bar -->
        <div class="saved-recipes-header dn-card">
          <div class="saved-header-texts">
            <div class="saved-title-row">
              <ion-icon :icon="ioniconsBookOutline" class="saved-hero-icon" />
              <h3 class="saved-heading">Twoje Przepisy</h3>
              <span class="count-chip" v-if="savedRecipes.length > 0">{{ savedRecipes.length }}</span>
            </div>
          </div>
          <div class="saved-header-actions-group">
            <button
              type="button"
              class="saved-action-btn import-btn"
              @click="openImportRecipeModal()"
              title="Importuj przepis z linku lub TikToka"
            >
              <ion-icon :icon="ioniconsLinkOutline" />
              <span>Importuj</span>
            </button>
            <button
              type="button"
              class="header-action-btn"
              @click="openAddCookbookRecipeModal()"
              title="Dodaj własny przepis do książki"
            >
              <ion-icon :icon="ioniconsAddOutline" />
              <span class="btn-text-full">Nowy przepis</span>
              <span class="btn-text-short">Dodaj</span>
            </button>
          </div>
        </div>

        <!-- Search & View Controls Bar -->
        <div class="saved-control-bar" v-if="savedRecipes.length > 0">
          <div class="saved-search-box">
            <ion-icon :icon="ioniconsSearchOutline" class="search-ico" />
            <input
              v-model="savedSearchQuery"
              type="text"
              placeholder="Szukaj dania lub składnika..."
              class="search-input-el"
            />
            <button
              v-if="savedSearchQuery"
              type="button"
              class="search-clear-ico"
              @click="savedSearchQuery = ''"
              aria-label="Wyczyść szukanie"
            >
              <ion-icon :icon="ioniconsCloseCircle" />
            </button>
          </div>

          <div class="saved-filter-actions-row">
            <!-- Sort Selector -->
            <div class="saved-sort-dropdown">
              <ion-icon :icon="ioniconsSwapVerticalOutline" class="sort-icon" />
              <select v-model="savedSortOption" class="sort-native-select" aria-label="Sortuj przepisy">
                <option value="recent">Ostatnio dodane</option>
                <option value="alpha">Nazwa A - Z</option>
                <option value="cookCount">Najczęściej gotowane</option>
                <option value="ingredients">Liczba składników</option>
              </select>
            </div>

            <!-- View Switcher (Grid / List) -->
            <div class="saved-view-toggle">
              <button
                type="button"
                class="view-btn"
                :class="{ active: savedViewMode === 'grid' }"
                @click="setSavedViewMode('grid')"
                title="Widok kafelków"
                aria-label="Widok kafelków"
              >
                <ion-icon :icon="ioniconsGridOutline" />
              </button>
              <button
                type="button"
                class="view-btn"
                :class="{ active: savedViewMode === 'list' }"
                @click="setSavedViewMode('list')"
                title="Widok listy"
                aria-label="Widok listy"
              >
                <ion-icon :icon="ioniconsListOutline" />
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Chips Level 1: Typ & Status dania -->
        <div class="quick-filter-scroll saved-source-scroll" v-if="savedRecipes.length > 0" data-no-swipe>
          <button
            type="button"
            class="curated-filter-pill"
            :class="{ active: savedFilterType === 'all' }"
            @click="savedFilterType = 'all'"
          >
            <span>Wszystkie ({{ savedRecipes.length }})</span>
          </button>
          <button
            type="button"
            class="curated-filter-pill"
            :class="{ active: savedFilterType === 'custom' }"
            @click="savedFilterType = 'custom'"
          >
            <ion-icon :icon="ioniconsPersonOutline" style="margin-right: 4px;" />
            <span>Własne ({{ savedCustomCount }})</span>
          </button>
          <button
            type="button"
            class="curated-filter-pill"
            :class="{ active: savedFilterType === 'import' }"
            @click="savedFilterType = 'import'"
          >
            <ion-icon :icon="ioniconsLinkOutline" style="margin-right: 4px;" />
            <span>Z linku / TikTok ({{ savedImportCount }})</span>
          </button>
          <button
            type="button"
            class="curated-filter-pill"
            :class="{ active: savedFilterType === 'api' }"
            @click="savedFilterType = 'api'"
          >
            <ion-icon :icon="ioniconsSparklesOutline" style="margin-right: 4px;" />
            <span>Z inspiracji ({{ savedApiCount }})</span>
          </button>
          <button
            v-if="savedUnplannedCount > 0"
            type="button"
            class="curated-filter-pill"
            :class="{ active: savedFilterType === 'unplanned' }"
            @click="savedFilterType = 'unplanned'"
          >
            <ion-icon :icon="ioniconsBookOutline" style="margin-right: 4px;" />
            <span>Tylko w książce ({{ savedUnplannedCount }})</span>
          </button>
          <button
            v-if="savedCookedCount > 0"
            type="button"
            class="curated-filter-pill"
            :class="{ active: savedFilterType === 'cooked' }"
            @click="savedFilterType = 'cooked'"
          >
            <ion-icon :icon="ioniconsFlameOutline" style="margin-right: 4px;" />
            <span>Ulubione ({{ savedCookedCount }})</span>
          </button>
        </div>

        <!-- Filter Chips Level 2: Kategorie kulinarne -->
        <div class="saved-categories-filter-row" v-if="savedRecipes.length > 0 && availableSavedCategories.length > 0" data-no-swipe>
          <div class="category-pills-scroll">
            <span class="cat-filter-prefix">Kategoria:</span>
            <button
              type="button"
              class="cat-pill-btn"
              :class="{ active: savedSelectedCategory === 'all' }"
              @click="savedSelectedCategory = 'all'"
            >
              Wszystkie
            </button>
            <button
              v-for="cat in availableSavedCategories"
              :key="cat.name"
              type="button"
              class="cat-pill-btn"
              :class="{ active: savedSelectedCategory.toLowerCase() === cat.name.toLowerCase() }"
              @click="savedSelectedCategory = (savedSelectedCategory.toLowerCase() === cat.name.toLowerCase()) ? 'all' : cat.name"
            >
              <span>{{ cat.name }}</span>
              <span class="cat-count-sub">{{ cat.count }}</span>
            </button>
          </div>
        </div>

        <!-- Active filters summary banner -->
        <div class="saved-active-summary-bar" v-if="savedRecipes.length > 0 && hasActiveFilters">
          <div class="summary-left">
            <span class="summary-count">Znaleziono: <strong>{{ filteredSavedRecipes.length }}</strong> z {{ savedRecipes.length }}</span>
            <span v-if="savedFilterType !== 'all'" class="summary-badge">
              {{ getFilterTypeLabel(savedFilterType) }}
              <ion-icon :icon="ioniconsCloseOutline" @click.stop="savedFilterType = 'all'" />
            </span>
            <span v-if="savedSelectedCategory !== 'all'" class="summary-badge">
              {{ savedSelectedCategory }}
              <ion-icon :icon="ioniconsCloseOutline" @click.stop="savedSelectedCategory = 'all'" />
            </span>
            <span v-if="savedSortOption !== 'recent'" class="summary-badge sort-badge">
              Sort: {{ getSortOptionLabel(savedSortOption) }}
              <ion-icon :icon="ioniconsCloseOutline" @click.stop="savedSortOption = 'recent'" />
            </span>
          </div>
          <button type="button" class="summary-reset-btn" @click="resetSavedFilters">
            <span>Resetuj</span>
          </button>
        </div>

        <!-- Empty state: when no saved recipes at all -->
        <div v-if="savedRecipes.length === 0" class="recipes-empty-state dn-card">
          <div class="empty-icon-circle">
            <ion-icon :icon="ioniconsBookOutline" />
          </div>
          <h3>Wasza książka kucharska jest pusta</h3>
          <p>Dodajcie własne danie, zaimportujcie ulubiony przepis z TikToka lub bloga kulinarnego, albo wybierzcie pyszne inspiracje.</p>
          <div class="saved-empty-actions">
            <button
              type="button"
              class="dn-button-primary saved-empty-btn"
              @click="openImportRecipeModal()"
            >
              <ion-icon :icon="ioniconsLinkOutline" />
              <span>Importuj z linku lub TikToka</span>
            </button>
            <button
              type="button"
              class="slot-btn slot-secondary-btn saved-empty-btn"
              @click="openAddCookbookRecipeModal()"
            >
              <ion-icon :icon="ioniconsAddOutline" />
              <span>Dodaj własny przepis</span>
            </button>
            <button
              type="button"
              class="slot-btn slot-secondary-btn saved-empty-btn"
              @click="activeSubView = 'explore'"
            >
              <ion-icon :icon="ioniconsSparklesOutline" />
              <span>Przeglądaj inspiracje</span>
            </button>
          </div>
        </div>

        <!-- Search / Filter empty state: no results -->
        <div v-else-if="filteredSavedRecipes.length === 0" class="recipes-empty-state dn-card">
          <div class="empty-icon-circle">
            <ion-icon :icon="ioniconsSearchOutline" />
          </div>
          <h3>Brak pasujących dań</h3>
          <p>Żaden przepis nie spełnia wybranych filtrów.</p>
          <button
            type="button"
            class="dn-button-primary"
            @click="resetSavedFilters"
            style="margin-top: 12px; padding: 10px 20px; font-size: 13px;"
          >
            Pokaż wszystkie przepisy ({{ savedRecipes.length }})
          </button>
        </div>

        <!-- Saved Recipes: Grid or List View -->
        <div v-else class="meals-cards-container">
          <!-- WIDOK A: KAFELKI (GRID VIEW) -->
          <div v-if="savedViewMode === 'grid'" class="meals-cards-grid">
            <div
              v-for="recipe in filteredSavedRecipes"
              :key="recipe.key"
              class="recipe-card dn-card"
              @click="openSavedRecipeDetails(recipe)"
            >
              <div class="recipe-card-media">
                <img
                  v-if="recipe.image_url"
                  :src="recipe.image_url"
                  :alt="recipe.title"
                  loading="lazy"
                  class="recipe-img"
                />
                <div v-else class="recipe-img-placeholder">
                  <ion-icon :icon="ioniconsRestaurantOutline" />
                  <span class="placeholder-label">{{ recipe.category || 'Domowy obiad' }}</span>
                </div>

                <div class="recipe-badges-overlay">
                  <span class="recipe-badge-source" :class="recipe.source">
                    <ion-icon :icon="recipe.source === 'import' ? ioniconsLinkOutline : (recipe.source === 'custom' ? ioniconsPersonOutline : ioniconsSparklesOutline)" />
                    <span>{{ recipe.source === 'import' ? (recipe.recipe_url?.includes('tiktok.com') ? 'TikTok' : 'Z linku') : (recipe.source === 'custom' ? 'Własny przepis' : 'Z inspiracji') }}</span>
                  </span>
                  <span class="recipe-badge-cooked" v-if="recipe.cookCount > 1">
                    <ion-icon :icon="ioniconsFlameOutline" />
                    <span>{{ recipe.cookCount }}x w menu</span>
                  </span>
                  <span class="recipe-badge-cookbook" v-else-if="!recipe.lastCookedDate">
                    <ion-icon :icon="ioniconsBookOutline" />
                    <span>Książka</span>
                  </span>
                  <span class="recipe-badge-cuisine" v-else-if="recipe.area || recipe.category">
                    {{ recipe.area || recipe.category }}
                  </span>
                </div>
              </div>

              <div class="recipe-card-body">
                <h4 class="recipe-card-title" :title="formatMealTitlePl(recipe.titlePl || recipe.title)">
                  {{ formatMealTitlePl(recipe.titlePl || recipe.title) }}
                </h4>

                <div class="saved-card-meta-row">
                  <span v-if="recipe.ingredients?.length" class="meta-tag ing-meta-tag">
                    <ion-icon :icon="ioniconsListOutline" />
                    {{ recipe.ingredients.length }} składników
                  </span>
                  <span v-if="recipe.category" class="meta-tag cat-meta-tag">
                    <ion-icon :icon="ioniconsRestaurantOutline" />
                    {{ recipe.category }}
                  </span>
                  <span v-if="recipe.lastCookedDate" class="meta-tag date-tag">
                    <ion-icon :icon="ioniconsCalendarOutline" />
                    {{ recipe.lastCookedDate }}
                  </span>
                  <span v-else class="meta-tag cookbook-tag">
                    <ion-icon :icon="ioniconsBookOutline" />
                    W książce
                  </span>
                </div>

                <div class="recipe-bottom-action">
                  <button
                    type="button"
                    class="recipe-action-outline-btn"
                    @click.stop="openSavedRecipeDetails(recipe)"
                  >
                    <ion-icon :icon="ioniconsInformationCircleOutline" />
                    <span>Przepis</span>
                  </button>
                  <button
                    type="button"
                    class="recipe-action-plan-btn"
                    @click.stop="openAssignModal(recipe)"
                  >
                    <ion-icon :icon="ioniconsCalendarOutline" />
                    <span>Zaplanuj</span>
                  </button>
                  <button
                    type="button"
                    class="recipe-action-delete-btn"
                    @click.stop="confirmDeleteSavedRecipe(recipe)"
                    aria-label="Usuń przepis z Twoich przepisów"
                    title="Usuń z Twoich przepisów"
                  >
                    <ion-icon :icon="ioniconsTrashOutline" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- WIDOK B: KOMPAKTOWA LISTA (LIST VIEW) -->
          <div v-else class="saved-recipes-list-view">
            <div
              v-for="recipe in filteredSavedRecipes"
              :key="recipe.key"
              class="saved-list-card dn-card"
              @click="openSavedRecipeDetails(recipe)"
            >
              <div class="saved-list-media">
                <img
                  v-if="recipe.image_url"
                  :src="recipe.image_url"
                  :alt="recipe.title"
                  loading="lazy"
                  class="saved-list-img"
                />
                <div v-else class="saved-list-img-placeholder">
                  <ion-icon :icon="ioniconsRestaurantOutline" />
                </div>
              </div>

              <div class="saved-list-info">
                <div class="saved-list-top-row">
                  <span class="saved-list-source-pill" :class="recipe.source">
                    {{ recipe.source === 'import' ? (recipe.recipe_url?.includes('tiktok.com') ? 'TikTok' : 'Link') : (recipe.source === 'custom' ? 'Własny' : 'Inspiracja') }}
                  </span>
                  <span v-if="recipe.category" class="saved-list-cat-pill">
                    {{ recipe.category }}
                  </span>
                  <span v-if="recipe.cookCount > 1" class="saved-list-cooked-pill">
                    <ion-icon :icon="ioniconsFlameOutline" /> {{ recipe.cookCount }}x
                  </span>
                  <span v-else-if="!recipe.lastCookedDate" class="saved-list-book-pill">
                    <ion-icon :icon="ioniconsBookOutline" /> Książka
                  </span>
                </div>

                <h4 class="saved-list-title" :title="formatMealTitlePl(recipe.titlePl || recipe.title)">
                  {{ formatMealTitlePl(recipe.titlePl || recipe.title) }}
                </h4>

                <div class="saved-list-meta-row">
                  <span v-if="recipe.ingredients?.length" class="saved-list-meta-item">
                    <ion-icon :icon="ioniconsListOutline" /> {{ recipe.ingredients.length }} składników
                  </span>
                  <span v-if="recipe.lastCookedDate" class="saved-list-meta-item">
                    <ion-icon :icon="ioniconsCalendarOutline" /> {{ recipe.lastCookedDate }}
                  </span>
                </div>
              </div>

              <div class="saved-list-actions">
                <button
                  type="button"
                  class="saved-list-plan-btn"
                  @click.stop="openAssignModal(recipe)"
                  title="Zaplanuj na ten tydzień"
                  aria-label="Zaplanuj obiad"
                >
                  <ion-icon :icon="ioniconsCalendarOutline" />
                  <span>Zaplanuj</span>
                </button>
                <button
                  type="button"
                  class="saved-list-delete-btn"
                  @click.stop="confirmDeleteSavedRecipe(recipe)"
                  title="Usuń z Twoich przepisów"
                  aria-label="Usuń przepis"
                >
                  <ion-icon :icon="ioniconsTrashOutline" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- WIDOK 3: INSPIRACJE & PRZEPISY (KATALOG)       -->
      <!-- ============================================== -->
      <div v-else class="meals-explore-wrapper">
        <!-- Compact modern surprise bar -->
        <div
          class="surprise-hero-bar dn-card"
          :class="{ 'is-rolling': isLoadingRandom }"
          @click="handleSurpriseMe"
        >
          <div class="surprise-left-content">
            <div class="surprise-icon-orb" :class="{ 'is-spinning': isLoadingRandom }">
              <ion-icon :icon="ioniconsShuffleOutline" />
            </div>
            <div class="surprise-texts">
              <span class="surprise-badge-label">Kulinarne koło fortuny</span>
              <h4 class="surprise-heading">Nie wiesz co dziś ugotować?</h4>
            </div>
          </div>
          <button
            type="button"
            class="surprise-pill-btn"
            :class="{ 'is-loading': isLoadingRandom }"
            :disabled="isLoadingRandom"
            @click.stop="handleSurpriseMe"
            aria-label="Wylosuj obiad"
          >
            <template v-if="isLoadingRandom">
              <span class="minimal-spinner" aria-hidden="true"></span>
              <span class="btn-rolling-text">Losowanie...</span>
            </template>
            <template v-else>
              <span>Wylosuj</span>
              <ion-icon :icon="ioniconsArrowForwardOutline" class="btn-arrow-icon" />
            </template>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="explore-search-container">
          <div class="explore-search-field">
            <ion-icon :icon="ioniconsSearchOutline" class="search-ico" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Szukaj dania lub składnika (np. kurczak, makaron)..."
              class="search-input-el"
              @keydown.enter="triggerSearch"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="search-clear-ico"
              @click="searchQuery = ''; triggerSearch()"
            >
              <ion-icon :icon="ioniconsCloseCircle" />
            </button>
          </div>
        </div>

        <!-- Curated Pills Filter Bar (Single clean horizontal row) -->
        <div class="quick-filter-scroll" data-no-swipe>
          <button
            v-for="pill in curatedFilterPills"
            :key="pill.id"
            type="button"
            class="curated-filter-pill"
            :class="{ active: activeFilterId === pill.id }"
            @click="applyCuratedFilter(pill)"
          >
            <span>{{ pill.label }}</span>
          </button>
        </div>

        <!-- Results Meta Bar (Total Count & Current Page) -->
        <div v-if="pagination.total > 0 && !isLoadingApi" class="recipes-meta-bar">
          <span class="meta-count-text">
            Dostępne przepisy: <strong>{{ pagination.total }}</strong>
          </span>
          <span class="meta-page-badge" v-if="pagination.totalPages > 1">
            Strona {{ pagination.page }} z {{ pagination.totalPages }}
          </span>
        </div>

        <!-- Loading state -->
        <div v-if="isLoadingApi" class="recipes-loading-state">
          <ion-spinner name="crescent" color="primary" />
          <p>Wyszukiwanie dań i przepisów...</p>
        </div>

        <!-- Empty state -->
        <div v-else-if="apiResults.length === 0" class="recipes-empty-state dn-card">
          <div class="empty-icon-circle">
            <ion-icon :icon="ioniconsRestaurantOutline" />
          </div>
          <h3>Brak dań dla tych kryteriów</h3>
          <p>Spróbuj zmienić kategorię lub wpisać inne hasło (np. pasta, chicken, pizza).</p>
        </div>

        <!-- Recipes Grid (Clean, symmetrical, aligned spacious cards) -->
        <div v-else class="meals-cards-container">
          <div class="meals-cards-grid">
            <div
              v-for="meal in (apiResults || []).filter(Boolean)"
              :key="meal.id || meal.api_id || meal.title"
              class="recipe-card dn-card"
              @click="openApiMealPreview(meal)"
            >
              <!-- Card Media with Badge Overlay -->
              <div class="recipe-card-media">
                <img
                  :src="meal.thumbnail"
                  :alt="meal.title"
                  loading="lazy"
                  class="recipe-img"
                />
                <div class="recipe-badges-overlay">
                  <span class="recipe-badge-cuisine" v-if="meal.areaPl || meal.area">
                    {{ meal.areaPl || meal.area }}
                  </span>
                  <span class="recipe-badge-category" v-if="meal.categoryPl || meal.category">
                    {{ meal.categoryPl || meal.category }}
                  </span>
                </div>
              </div>

              <!-- Card Content with Action Buttons -->
              <div class="recipe-card-body">
                <h4 class="recipe-card-title" :title="formatMealTitlePl(meal.titlePl || meal.title)">
                  {{ formatMealTitlePl(meal.titlePl || meal.title) }}
                </h4>

                <div class="recipe-bottom-action">
                  <button
                    type="button"
                    class="recipe-action-outline-btn"
                    @click.stop="openApiMealPreview(meal)"
                  >
                    <ion-icon :icon="ioniconsInformationCircleOutline" />
                    <span>Przepis</span>
                  </button>
                  <button
                    type="button"
                    class="recipe-action-bookmark-btn"
                    :class="{ 'is-saved': isRecipeInSaved(meal) }"
                    @click.stop="handleToggleSaveRecipe(meal)"
                    :title="isRecipeInSaved(meal) ? 'Zapisano w Twoich przepisach' : 'Zapisz w Twoich przepisach'"
                    :aria-label="isRecipeInSaved(meal) ? 'Usuń z Twoich przepisów' : 'Zapisz w Twoich przepisach'"
                  >
                    <ion-icon :icon="isRecipeInSaved(meal) ? ioniconsBookmark : ioniconsBookmarkOutline" />
                  </button>
                  <button
                    type="button"
                    class="recipe-action-plan-btn"
                    @click.stop="openAssignModal(meal)"
                  >
                    <ion-icon :icon="ioniconsCalendarOutline" />
                    <span>Zaplanuj</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination Bar -->
          <div v-if="pagination.totalPages > 1 && !isLoadingApi" class="meals-pagination-bar">
            <button
              type="button"
              class="pagination-nav-btn prev-btn"
              :disabled="pagination.page <= 1"
              @click="goToPage(pagination.page - 1)"
              aria-label="Poprzednia strona"
            >
              <ion-icon :icon="ioniconsChevronBackOutline" />
              <span>Poprzednia</span>
            </button>

            <div class="pagination-pages-group">
              <button
                v-for="(p, pIdx) in visiblePageNumbers"
                :key="pIdx"
                type="button"
                class="page-number-btn"
                :class="{ active: p === pagination.page, ellipsis: p === '...' }"
                :disabled="p === '...'"
                @click="p !== '...' && goToPage(p)"
              >
                {{ p }}
              </button>
            </div>

            <button
              type="button"
              class="pagination-nav-btn next-btn"
              :disabled="pagination.page >= pagination.totalPages"
              @click="goToPage(pagination.page + 1)"
              aria-label="Następna strona"
            >
              <span>Następna</span>
              <ion-icon :icon="ioniconsChevronForwardOutline" />
            </button>
          </div>
        </div>
      </div>

      <!-- Spacer for bottom bar -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>

    <!-- ============================================== -->
    <!-- MODAL 1: SZCZEGÓŁY OBIADU / PRZEPIS           -->
    <!-- ============================================== -->
    <ion-modal
      :is-open="showDetailsModal"
      @didDismiss="showDetailsModal = false"
      class="dn-meal-sheet-modal dn-recipe-details-modal"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :expand-to-scroll="false"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header ion-no-border">
        <div class="modal-sheet-handle-spacer" aria-hidden="true"></div>
        <div class="modal-sheet-header">
          <div class="modal-title-wrap">
            <div class="modal-title-icon-badge">
              <ion-icon :icon="ioniconsRestaurantOutline" class="modal-title-icon" />
            </div>
            <div class="modal-title-text-group">
              <h3 class="modal-main-title">Przepis i Składniki</h3>
              <span class="modal-sub-title">Inspiracja kulinarna dla Was</span>
            </div>
          </div>
          <div class="modal-header-actions-group">
            <button
              v-if="isRecipeInSaved(activeSelectedMeal)"
              type="button"
              class="modal-delete-icon-btn"
              @click="confirmDeleteSavedRecipe(activeSelectedMeal)"
              aria-label="Usuń przepis z Twoich przepisów"
              title="Usuń z Twoich przepisów"
            >
              <ion-icon :icon="ioniconsTrashOutline" />
            </button>
            <button
              v-else
              type="button"
              class="modal-save-icon-btn"
              @click="handleToggleSaveRecipe(activeSelectedMeal)"
              aria-label="Zapisz w Twoich przepisach"
              title="Zapisz w Twoich przepisach"
            >
              <ion-icon :icon="ioniconsBookmarkOutline" />
            </button>
            <button
              type="button"
              class="modal-close-icon-btn"
              @click="showDetailsModal = false"
              aria-label="Zamknij"
            >
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>
        </div>
      </ion-header>

      <ion-content class="ion-padding recipe-modal-content" :scroll-y="true" v-if="activeSelectedMeal">
        <div class="modal-recipe-body">
          <!-- Hero Image Banner with Glass Badges -->
          <div
            v-if="activeSelectedMeal.image_url || activeSelectedMeal.thumbnail"
            class="recipe-hero-card"
            :style="{ backgroundImage: `url(${activeSelectedMeal.image_url || activeSelectedMeal.thumbnail})` }"
          >
            <div class="recipe-hero-overlay"></div>
            <div class="recipe-hero-badges-row">
              <span v-if="activeSelectedMeal.areaPl || activeSelectedMeal.area" class="hero-glass-pill cuisine-pill">
                {{ activeSelectedMeal.areaPl || activeSelectedMeal.area }}
              </span>
              <span v-if="activeSelectedMeal.categoryPl || activeSelectedMeal.category" class="hero-glass-pill category-pill">
                {{ activeSelectedMeal.categoryPl || activeSelectedMeal.category }}
              </span>
            </div>
          </div>

          <!-- Recipe Title & Quick Meta -->
          <div class="recipe-title-section">
            <h2 class="recipe-display-title">{{ formatMealTitlePl(activeSelectedMeal.titlePl || activeSelectedMeal.title) }}</h2>
            <p v-if="(activeSelectedMeal.originalTitle || activeSelectedMeal.title) && formatMealTitlePl(activeSelectedMeal.titlePl || activeSelectedMeal.title) !== (activeSelectedMeal.originalTitle || activeSelectedMeal.title)" class="recipe-original-name">
              {{ activeSelectedMeal.originalTitle || activeSelectedMeal.title }}
            </p>

            <div class="recipe-quick-chips">
              <div class="quick-chip" v-if="activeSelectedMeal.ingredients?.length">
                <ion-icon :icon="ioniconsListOutline" />
                <span>{{ activeSelectedMeal.ingredients.length }} składników</span>
              </div>
              <div class="quick-chip" v-if="activeSelectedMeal.instructionsSteps?.length">
                <ion-icon :icon="ioniconsCheckmarkCircleOutline" />
                <span>{{ activeSelectedMeal.instructionsSteps.length }} kroków</span>
              </div>
              <div class="quick-chip" v-if="activeSelectedMeal.areaPl">
                <ion-icon :icon="ioniconsGlobeOutline" />
                <span>Kuchnia {{ activeSelectedMeal.areaPl.toLowerCase() }}</span>
              </div>
            </div>
          </div>

          <!-- Primary CTA Button: Plan this meal or save to cookbook -->
          <div class="recipe-plan-cta-box recipe-plan-cta-row">
            <button
              v-if="!isRecipeInSaved(activeSelectedMeal)"
              type="button"
              class="dn-button-secondary recipe-save-btn"
              @click="handleToggleSaveRecipe(activeSelectedMeal)"
            >
              <ion-icon :icon="ioniconsBookmarkOutline" />
              <span>Zapisz w przepisach</span>
            </button>
            <button
              type="button"
              class="dn-button-primary recipe-plan-btn"
              @click="openAssignFromDetails(activeSelectedMeal)"
            >
              <ion-icon :icon="ioniconsCalendarOutline" />
              <span>Zaplanuj na ten tydzień</span>
            </button>
          </div>

          <!-- Ingredients Section -->
          <div class="recipe-detail-section" v-if="activeSelectedMeal.ingredients?.length">
            <div class="section-heading-row">
              <div class="section-title-group">
                <div class="heading-icon-orb">
                  <ion-icon :icon="ioniconsCartOutline" />
                </div>
                <h3>Potrzebne składniki</h3>
              </div>
              <span class="count-tag">{{ activeSelectedMeal.ingredients.length }}</span>
            </div>

            <div class="ingredients-modern-grid">
              <div
                v-for="(ing, idx) in activeSelectedMeal.ingredients"
                :key="idx"
                class="ingredient-pill-card"
              >
                <div class="ing-bullet-orb">
                  <ion-icon :icon="ioniconsCheckmarkOutline" />
                </div>
                <div class="ing-info-col">
                  <span class="ing-title">{{ translateIngredientName(ing.name) }}</span>
                  <span v-if="ing.measure" class="ing-quantity">{{ formatMeasurePl(ing.measure) }}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="dn-button-primary add-shopping-action-btn"
              @click="handleAddIngredientsFromDetails"
            >
              <ion-icon :icon="ioniconsCartOutline" />
              <span>Dodaj wszystkie składniki do Listy Zakupów</span>
            </button>
          </div>

          <!-- Step-by-Step Preparation Instructions Section -->
          <div class="recipe-detail-section" v-if="activeSelectedMeal.instructions">
            <div class="section-heading-row">
              <div class="section-title-group">
                <div class="heading-icon-orb">
                  <ion-icon :icon="ioniconsBookOutline" />
                </div>
                <h3>Sposób przygotowania</h3>
              </div>
              <div v-if="isTranslatingRecipe" class="translating-indicator">
                <ion-spinner name="dots" class="mini-spinner" />
                <span>Tłumaczenie...</span>
              </div>
            </div>

            <!-- Numbered Steps -->
            <div
              v-if="activeSelectedMeal.instructionsSteps && activeSelectedMeal.instructionsSteps.length > 1"
              class="recipe-steps-list"
            >
              <div
                v-for="(step, sIdx) in activeSelectedMeal.instructionsSteps"
                :key="sIdx"
                class="recipe-step-card"
              >
                <div class="step-badge-number">{{ sIdx + 1 }}</div>
                <div class="step-card-body">
                  <span class="step-counter-label">Krok {{ sIdx + 1 }}</span>
                  <p class="step-instruction-text">{{ step }}</p>
                </div>
              </div>
            </div>

            <!-- Single paragraph fallback -->
            <div v-else class="single-instruction-box">
              <p class="recipe-instructions-text">{{ activeSelectedMeal.instructions }}</p>
            </div>
          </div>

          <!-- Video / External Recipe Link -->
          <div class="recipe-detail-section" v-if="activeSelectedMeal.youtube_url || activeSelectedMeal.youtubeUrl || activeSelectedMeal.recipe_url">
            <a
              :href="activeSelectedMeal.youtube_url || activeSelectedMeal.youtubeUrl || activeSelectedMeal.recipe_url"
              target="_blank"
              rel="noopener noreferrer"
              class="video-recipe-card"
            >
              <div class="video-icon-circle">
                <ion-icon :icon="(activeSelectedMeal.youtube_url || activeSelectedMeal.recipe_url?.includes('tiktok.com')) ? ioniconsPlayCircleOutline : ioniconsOpenOutline" />
              </div>
              <div class="video-meta">
                <span class="video-title">{{ activeSelectedMeal.recipe_url?.includes('tiktok.com') ? 'Wideo na TikToku' : (activeSelectedMeal.youtube_url ? 'Wideo z przygotowania' : 'Oryginalny przepis ze strony') }}</span>
                <span class="video-sub">Otwórz źródło w nowej karcie</span>
              </div>
              <ion-icon :icon="ioniconsChevronForwardOutline" class="video-arrow" />
            </a>
          </div>

          <!-- Bottom Floating Action Bar -->
          <div class="recipe-bottom-floating-bar">
            <button
              v-if="isRecipeInSaved(activeSelectedMeal)"
              type="button"
              class="recipe-modal-delete-btn"
              @click="confirmDeleteSavedRecipe(activeSelectedMeal)"
              aria-label="Usuń z Twoich przepisów"
              title="Usuń z Twoich przepisów"
            >
              <ion-icon :icon="ioniconsTrashOutline" />
              <span>Usuń</span>
            </button>
            <button
              v-else
              type="button"
              class="recipe-modal-save-btn"
              @click="handleToggleSaveRecipe(activeSelectedMeal)"
              aria-label="Zapisz w Twoich przepisach"
              title="Zapisz w Twoich przepisach"
            >
              <ion-icon :icon="ioniconsBookmarkOutline" />
              <span>Zapisz</span>
            </button>
            <button
              type="button"
              class="dn-button-primary bottom-plan-btn"
              @click="openAssignFromDetails(activeSelectedMeal)"
            >
              <ion-icon :icon="ioniconsCalendarOutline" />
              <span>Wybierz na obiad</span>
            </button>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- ============================================== -->
    <!-- MODAL 2: WYBÓR DNIA I KUCHARZA DLA DANIA       -->
    <!-- ============================================== -->
    <ion-modal
      :is-open="showAssignModal"
      @didDismiss="showAssignModal = false"
      class="dn-meal-sheet-modal"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :expand-to-scroll="false"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header ion-no-border">
        <div class="modal-sheet-handle-spacer" aria-hidden="true"></div>
        <div class="modal-sheet-header">
          <div class="modal-title-wrap">
            <div class="modal-title-icon-badge">
              <ion-icon :icon="ioniconsCalendarOutline" class="modal-title-icon" />
            </div>
            <div class="modal-title-text-group">
              <h3 class="modal-main-title">Zaplanuj ten obiad</h3>
              <span class="modal-sub-title">Wybierz dzień i kucharza dla przepisu</span>
            </div>
          </div>
          <button
            type="button"
            class="modal-close-icon-btn"
            @click="showAssignModal = false"
            aria-label="Zamknij"
          >
            <ion-icon :icon="ioniconsCloseOutline" />
          </button>
        </div>
      </ion-header>

      <ion-content class="ion-padding custom-meal-modal-content" :scroll-y="true" v-if="assignTargetMeal">
        <div class="assign-form">
          <div class="assign-meal-preview dn-card">
            <div
              class="assign-thumb"
              :style="{ backgroundImage: `url(${assignTargetMeal.thumbnail || assignTargetMeal.image_url})` }"
            />
            <div class="assign-meal-info">
              <h4 class="assign-meal-name">{{ formatMealTitlePl(assignTargetMeal.titlePl || assignTargetMeal.title) }}</h4>
              <p class="assign-meal-meta">{{ assignTargetMeal.categoryPl || assignTargetMeal.category }} • {{ assignTargetMeal.areaPl || assignTargetMeal.area }}</p>
            </div>
          </div>

          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsCalendarOutline" class="label-icon" />
                <span>Wybierz dzień tygodnia *</span>
              </label>
              <span class="selected-day-badge" v-if="selectedAssignDayLabel">
                {{ selectedAssignDayLabel }}
              </span>
            </div>
            <div class="days-select-grid">
              <button
                v-for="d in weekDays"
                :key="d.dateStr"
                type="button"
                class="day-select-btn"
                :class="{ active: assignDate === d.dateStr, 'has-meal': !!d.meal, 'is-today': d.isToday }"
                @click="assignDate = d.dateStr"
              >
                <span class="btn-day-name">{{ d.shortDay }}</span>
                <span class="btn-day-date">{{ d.displayDate.split(' ')[0] }}</span>
                <span v-if="d.meal" class="btn-day-indicator" title="Zaplanowano obiad"></span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              <ion-icon :icon="ioniconsPersonOutline" class="label-icon" />
              <span>Kto gotuje? *</span>
            </label>
            <div class="cook-chips-grid">
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: assignCook === 'me' }"
                @click="assignCook = 'me'"
              >
                <ion-icon :icon="ioniconsPersonOutline" />
                <span>Ja ({{ currentUser?.name || 'Mnie' }})</span>
              </button>

              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: assignCook === 'partner' }"
                @click="assignCook = 'partner'"
              >
                <ion-icon :icon="ioniconsHeartOutline" />
                <span>{{ partnerUser?.name || 'Partner' }}</span>
              </button>

              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: assignCook === 'both' }"
                @click="assignCook = 'both'"
              >
                <ion-icon :icon="ioniconsPeopleOutline" />
                <span>Razem</span>
              </button>

              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: assignCook === 'restaurant' }"
                @click="assignCook = 'restaurant'"
              >
                <ion-icon :icon="ioniconsStorefrontOutline" />
                <span>Restauracja</span>
              </button>

              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: assignCook === 'takeout' }"
                @click="assignCook = 'takeout'"
              >
                <ion-icon :icon="ioniconsBicycleOutline" />
                <span>Na wynos</span>
              </button>
            </div>
          </div>

          <div class="modal-submit-bar">
            <button
              type="button"
              class="dn-button-primary submit-custom-meal-btn"
              :disabled="!assignDate"
              @click="confirmAssignMeal"
            >
              <ion-icon :icon="ioniconsCheckmarkOutline" />
              <span>Zaplanuj ten obiad</span>
            </button>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- ============================================== -->
    <!-- MODAL 3: DODAWANIE WŁASNEGO OBIADU             -->
    <!-- ============================================== -->
    <ion-modal
      :is-open="showAddCustomModal"
      @didDismiss="showAddCustomModal = false"
      class="dn-meal-sheet-modal dn-custom-meal-modal"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :expand-to-scroll="false"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header ion-no-border">
        <div class="modal-sheet-handle-spacer" aria-hidden="true"></div>
        <div class="modal-sheet-header">
          <div class="modal-title-wrap">
            <div class="modal-title-icon-badge">
              <ion-icon :icon="ioniconsRestaurantOutline" class="modal-title-icon" />
            </div>
            <div class="modal-title-text-group">
              <h3 class="modal-main-title">{{ customDate ? 'Zaplanuj Własny Obiad' : 'Dodaj Przepis do Książki' }}</h3>
              <span class="modal-sub-title" v-if="customDate && selectedCustomDayLabel">
                Zaplanuj na: {{ selectedCustomDayLabel }}
              </span>
              <span class="modal-sub-title" v-else>Dodaj danie do Waszej bazy przepisów</span>
            </div>
          </div>
          <button
            type="button"
            class="modal-close-icon-btn"
            @click="showAddCustomModal = false"
            aria-label="Zamknij"
          >
            <ion-icon :icon="ioniconsCloseOutline" />
          </button>
        </div>
      </ion-header>

      <ion-content class="ion-padding custom-meal-modal-content" :scroll-y="true">
        <!-- Shortcut to import from URL or TikTok -->
        <button
          type="button"
          class="import-shortcut-banner"
          @click="showAddCustomModal = false; openImportRecipeModal()"
        >
          <div class="shortcut-text-wrap">
            <ion-icon :icon="ioniconsLinkOutline" class="shortcut-icon" />
            <span>Masz link do TikToka lub bloga? <strong>Importuj automatycznie</strong></span>
          </div>
          <ion-icon :icon="ioniconsChevronForwardOutline" class="shortcut-arrow" />
        </button>

        <form @submit.prevent="handleCreateCustomMeal" class="custom-meal-form">
          <!-- Nazwa obiadu -->
          <div class="form-group">
            <label class="form-label">
              <ion-icon :icon="ioniconsFastFoodOutline" class="label-icon" />
              <span>Nazwa obiadu lub przepisu *</span>
            </label>
            <div class="input-container-box">
              <ion-input
                v-model="customTitle"
                maxlength="100"
                placeholder="np. Kotlety schabowe z ziemniaczkami, Domowa lasagne..."
                class="modal-input"
                :clear-input="true"
              />
            </div>
          </div>

          <!-- Kategoria -->
          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsRestaurantOutline" class="label-icon" />
                <span>Kategoria</span>
              </label>
              <span class="label-badge-optional">opcjonalnie</span>
            </div>
            <div class="custom-category-chips-scroll" data-no-swipe>
              <button
                v-for="cat in customCategories"
                :key="cat"
                type="button"
                class="custom-category-pill"
                :class="{ active: customCategory === cat }"
                @click="customCategory = cat"
              >
                {{ cat }}
              </button>
            </div>
          </div>

          <!-- Dzień tygodnia -->
          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsCalendarOutline" class="label-icon" />
                <span>Planowanie na dzień</span>
              </label>
              <span class="label-badge-optional">opcjonalnie</span>
            </div>

            <!-- Choice 1: Only Cookbook (no day assigned) -->
            <div class="custom-day-mode-row">
              <button
                type="button"
                class="custom-mode-choice-btn"
                :class="{ active: !customDate }"
                @click="customDate = ''"
              >
                <ion-icon :icon="ioniconsBookOutline" />
                <span>Tylko książka kucharska (bez dnia w planerze)</span>
              </button>
            </div>

            <!-- Choice 2: Select a specific day of the week -->
            <div class="days-select-grid" :class="{ 'is-inactive': !customDate }">
              <button
                v-for="d in weekDays"
                :key="d.dateStr"
                type="button"
                class="day-select-btn"
                :class="{ active: customDate === d.dateStr, 'has-meal': !!d.meal, 'is-today': d.isToday }"
                @click="customDate = d.dateStr"
              >
                <span class="btn-day-name">{{ d.shortDay }}</span>
                <span class="btn-day-date">{{ d.displayDate.split(' ')[0] }}</span>
                <span v-if="d.meal" class="btn-day-indicator" title="Zaplanowano obiad"></span>
              </button>
            </div>
          </div>

          <!-- Zdjęcie potrawy (opcjonalnie) -->
          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsImageOutline" class="label-icon" />
                <span>Zdjęcie potrawy (link URL)</span>
              </label>
              <span class="label-badge-optional">opcjonalnie</span>
            </div>
            <div class="input-container-box">
              <ion-input
                v-model="customImageUrl"
                type="url"
                placeholder="https://... (link do zdjęcia dania)"
                class="modal-input"
                :clear-input="true"
              />
            </div>
          </div>

          <!-- Kto gotuje -->
          <div class="form-group">
            <label class="form-label">
              <ion-icon :icon="ioniconsPersonOutline" class="label-icon" />
              <span>Kto przygotowuje?</span>
            </label>
            <div class="cook-chips-grid">
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: customCook === 'me' }"
                @click="customCook = 'me'"
              >
                <ion-icon :icon="ioniconsPersonOutline" />
                <span>Ja ({{ currentUser?.name || 'Mnie' }})</span>
              </button>
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: customCook === 'partner' }"
                @click="customCook = 'partner'"
              >
                <ion-icon :icon="ioniconsHeartOutline" />
                <span>{{ partnerUser?.name || 'Partner' }}</span>
              </button>
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: customCook === 'both' }"
                @click="customCook = 'both'"
              >
                <ion-icon :icon="ioniconsPeopleOutline" />
                <span>Razem</span>
              </button>
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: customCook === 'restaurant' }"
                @click="customCook = 'restaurant'"
              >
                <ion-icon :icon="ioniconsStorefrontOutline" />
                <span>Restauracja</span>
              </button>
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: customCook === 'takeout' }"
                @click="customCook = 'takeout'"
              >
                <ion-icon :icon="ioniconsBicycleOutline" />
                <span>Na wynos</span>
              </button>
            </div>
          </div>

          <!-- Składniki -->
          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsCartOutline" class="label-icon" />
                <span>Składniki</span>
              </label>
              <span class="label-badge-optional">opcjonalnie</span>
            </div>
            <div class="textarea-container-box">
              <ion-textarea
                v-model="customIngredientsText"
                maxlength="1000"
                placeholder="Wpisz składniki po przecinku lub od nowej linii, np.:&#10;schab, bułka tarta, jajka, ziemniaki..."
                class="modal-textarea"
                :rows="3"
                :auto-grow="true"
              />
            </div>
            <div class="field-subtext-row">
              <ion-icon :icon="ioniconsInformationCircleOutline" />
              <span>Możesz przenieść te składniki do Listy Zakupów jednym kliknięciem.</span>
            </div>
          </div>

          <!-- Notatka lub przepis -->
          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsBookOutline" class="label-icon" />
                <span>Notatka lub przepis</span>
              </label>
              <span class="label-badge-optional">opcjonalnie</span>
            </div>
            <div class="textarea-container-box">
              <ion-textarea
                v-model="customInstructions"
                maxlength="2000"
                placeholder="np. Smażyć na maśle klarowanym, dodać świeży koperek..."
                class="modal-textarea"
                :rows="2"
                :auto-grow="true"
              />
            </div>
          </div>

          <!-- Przycisk zapisu -->
          <div class="modal-submit-bar">
            <button
              type="submit"
              class="dn-button-primary submit-custom-meal-btn"
              :disabled="!customTitle.trim() || isSubmittingCustomMeal"
            >
              <ion-spinner v-if="isSubmittingCustomMeal" name="crescent" style="width: 18px; height: 18px;" />
              <ion-icon v-else :icon="ioniconsCheckmarkOutline" />
              <span>{{ customDate ? 'Dodaj do Planera Tygodnia' : 'Zapisz w Twoich Przepisach' }}</span>
            </button>
          </div>
        </form>
      </ion-content>
    </ion-modal>

    <!-- ============================================== -->
    <!-- MODAL 4: WYBÓR Z TWOICH PRZEPISÓW NA DANY DZIEŃ -->
    <!-- ============================================== -->
    <ion-modal
      :is-open="showPickSavedModal"
      @didDismiss="showPickSavedModal = false"
      class="dn-meal-sheet-modal dn-pick-saved-modal"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :expand-to-scroll="false"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header ion-no-border">
        <div class="modal-sheet-handle-spacer" aria-hidden="true"></div>
        <div class="modal-sheet-header">
          <div class="modal-title-wrap">
            <div class="modal-title-icon-badge">
              <ion-icon :icon="ioniconsBookOutline" class="modal-title-icon" />
            </div>
            <div class="modal-title-text-group">
              <h3 class="modal-main-title">Wybierz z Twoich Przepisów</h3>
              <span class="modal-sub-title" v-if="selectedTargetPickDayLabel">
                Zaplanuj na: {{ selectedTargetPickDayLabel }}
              </span>
              <span class="modal-sub-title" v-else>Wybierz obiad z Waszej historii</span>
            </div>
          </div>
          <button
            type="button"
            class="modal-close-icon-btn"
            @click="showPickSavedModal = false"
            aria-label="Zamknij"
          >
            <ion-icon :icon="ioniconsCloseOutline" />
          </button>
        </div>
      </ion-header>

      <ion-content class="ion-padding custom-meal-modal-content" :scroll-y="true">
        <div class="pick-saved-modal-body">
          <!-- Search in modal -->
          <div class="explore-search-container" v-if="savedRecipes.length > 0">
            <div class="explore-search-field">
              <ion-icon :icon="ioniconsSearchOutline" class="search-ico" />
              <input
                v-model="pickModalSearch"
                type="text"
                placeholder="Szukaj w Twoich przepisach..."
                class="search-input-el"
              />
              <button
                v-if="pickModalSearch"
                type="button"
                class="search-clear-ico"
                @click="pickModalSearch = ''"
              >
                <ion-icon :icon="ioniconsCloseCircle" />
              </button>
            </div>
          </div>

          <!-- Kto gotuje selector -->
          <div class="form-group" style="margin-top: 10px;">
            <label class="form-label">
              <ion-icon :icon="ioniconsPersonOutline" class="label-icon" />
              <span>Kto przygotowuje obiad?</span>
            </label>
            <div class="cook-chips-grid">
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: pickModalCook === 'me' }"
                @click="pickModalCook = 'me'"
              >
                <ion-icon :icon="ioniconsPersonOutline" />
                <span>Ja ({{ currentUser?.name || 'Mnie' }})</span>
              </button>
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: pickModalCook === 'partner' }"
                @click="pickModalCook = 'partner'"
              >
                <ion-icon :icon="ioniconsHeartOutline" />
                <span>{{ partnerUser?.name || 'Partner' }}</span>
              </button>
              <button
                type="button"
                class="cook-chip-btn"
                :class="{ active: pickModalCook === 'both' }"
                @click="pickModalCook = 'both'"
              >
                <ion-icon :icon="ioniconsPeopleOutline" />
                <span>Razem</span>
              </button>
            </div>
          </div>

          <!-- Empty state if couple has 0 saved recipes yet -->
          <div v-if="savedRecipes.length === 0" class="recipes-empty-state dn-card" style="margin-top: 14px;">
            <div class="empty-icon-circle">
              <ion-icon :icon="ioniconsBookOutline" />
            </div>
            <h3>Brak zapisanych przepisów</h3>
            <p>Nie macie jeszcze żadnych zapisanych dań w historii. Możesz wybrać przepis z bazy inspiracji lub wpisać własny obiad.</p>
            <div class="saved-empty-actions" style="margin-top: 14px;">
              <button
                type="button"
                class="dn-button-primary saved-empty-btn"
                @click="showPickSavedModal = false; openExploreForDate(targetPickDate)"
              >
                <ion-icon :icon="ioniconsSparklesOutline" />
                <span>Odkryj inspiracje</span>
              </button>
              <button
                type="button"
                class="slot-btn slot-secondary-btn saved-empty-btn"
                @click="showPickSavedModal = false; openAddCustomModal(targetPickDate)"
              >
                <ion-icon :icon="ioniconsAddOutline" />
                <span>Wpisz własny obiad</span>
              </button>
            </div>
          </div>

          <!-- Filter empty state -->
          <div v-else-if="modalPickRecipesList.length === 0" class="recipes-empty-state dn-card" style="margin-top: 14px;">
            <div class="empty-icon-circle">
              <ion-icon :icon="ioniconsSearchOutline" />
            </div>
            <h3>Brak pasujących dań</h3>
            <p>Nie znaleziono przepisów pasujących do frazy "{{ pickModalSearch }}".</p>
            <button
              type="button"
              class="slot-btn slot-secondary-btn"
              @click="pickModalSearch = ''"
              style="padding: 8px 16px; font-size: 12px; margin-top: 10px;"
            >
              Wyczyść wyszukiwanie
            </button>
          </div>

          <!-- Filtered list of recipes to pick from -->
          <div v-else class="pick-recipes-list">
            <div
              v-for="rec in modalPickRecipesList"
              :key="rec.key"
              class="pick-recipe-item dn-card"
              @click="selectSavedRecipeForDay(rec)"
            >
              <div
                class="pick-item-thumb"
                :style="rec.image_url ? { backgroundImage: `url(${rec.image_url})` } : {}"
              >
                <ion-icon v-if="!rec.image_url" :icon="ioniconsRestaurantOutline" />
              </div>

              <div class="pick-item-info">
                <h4 class="pick-item-title">{{ formatMealTitlePl(rec.titlePl || rec.title) }}</h4>
                <div class="pick-item-meta">
                  <span class="pick-meta-chip source-chip" :class="rec.source">
                    {{ rec.source === 'custom' ? 'Domowy' : 'Inspiracja' }}
                  </span>
                  <span v-if="rec.cookCount > 1" class="pick-meta-chip cook-chip">
                    {{ rec.cookCount }}x
                  </span>
                  <span v-if="rec.category" class="pick-meta-chip">
                    {{ rec.category }}
                  </span>
                  <span v-if="rec.ingredients?.length" class="pick-meta-chip">
                    {{ rec.ingredients.length }} skł.
                  </span>
                </div>
              </div>

              <button
                type="button"
                class="pick-item-select-btn"
                @click.stop="selectSavedRecipeForDay(rec)"
              >
                <ion-icon :icon="ioniconsCheckmarkOutline" />
                <span>Wybierz</span>
              </button>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- ============================================== -->
    <!-- MODAL 5: IMPORT PRZEPISU Z LINKU / TIKTOKA     -->
    <!-- ============================================== -->
    <ion-modal
      :is-open="showImportModal"
      @didDismiss="closeImportModal"
      class="dn-meal-sheet-modal dn-import-recipe-modal"
      :breakpoints="[0, 1]"
      :initial-breakpoint="1"
      :expand-to-scroll="false"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header ion-no-border">
        <div class="modal-sheet-handle-spacer" aria-hidden="true"></div>
        <div class="modal-sheet-header">
          <div class="modal-title-wrap">
            <div class="modal-title-icon-badge">
              <ion-icon :icon="ioniconsLinkOutline" class="modal-title-icon" />
            </div>
            <div class="modal-title-text-group">
              <h3 class="modal-main-title">Importuj Przepis z Linku</h3>
              <span class="modal-sub-title">Wklej link z TikToka lub strony kulinarnej</span>
            </div>
          </div>
          <button
            type="button"
            class="modal-close-icon-btn"
            @click="closeImportModal"
            aria-label="Zamknij"
          >
            <ion-icon :icon="ioniconsCloseOutline" />
          </button>
        </div>
      </ion-header>

      <ion-content class="ion-padding import-modal-content" :scroll-y="true">
        <!-- KROK 1: Wprowadzanie adresu URL -->
        <div v-if="!importedRecipePreview" class="import-input-step">
          <!-- Supported Platforms Chips -->
          <div class="import-supported-platforms">
            <span class="platform-chip tiktok-chip">
              <ion-icon :icon="ioniconsPlayCircleOutline" />
              <span>TikTok</span>
            </span>
            <span class="platform-chip">
              <ion-icon :icon="ioniconsRestaurantOutline" />
              <span>Kwestia Smaku</span>
            </span>
            <span class="platform-chip">
              <ion-icon :icon="ioniconsRestaurantOutline" />
              <span>Ania Gotuje</span>
            </span>
            <span class="platform-chip">
              <ion-icon :icon="ioniconsRestaurantOutline" />
              <span>Przepisy.pl</span>
            </span>
            <span class="platform-chip">
              <ion-icon :icon="ioniconsGlobeOutline" />
              <span>Dowolny blog</span>
            </span>
          </div>

          <!-- Input Field with Clear & Paste buttons -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label">
              <ion-icon :icon="ioniconsLinkOutline" class="label-icon" />
              <span>Link do przepisu lub TikToka</span>
            </label>
            <div class="input-container-box import-link-input-box">
              <ion-input
                v-model="importUrlInput"
                type="url"
                placeholder="https://www.tiktok.com/... lub https://..."
                class="modal-input"
                :clear-input="true"
                @keyup.enter="handleFetchRecipeFromUrl"
              />
              <button
                v-if="canPasteClipboard && !importUrlInput"
                type="button"
                class="paste-clipboard-btn"
                @click="handlePasteFromClipboard"
              >
                <span>Wklej</span>
              </button>
            </div>
          </div>

          <!-- Error message if any -->
          <div v-if="importErrorMessage" class="import-error-banner">
            <ion-icon :icon="ioniconsAlertCircleOutline" />
            <span>{{ importErrorMessage }}</span>
          </div>

          <!-- Fetch Button -->
          <div class="modal-submit-bar" style="margin-top: 20px;">
            <button
              type="button"
              class="dn-button-primary submit-custom-meal-btn"
              :disabled="!importUrlInput.trim() || isFetchingImport"
              @click="handleFetchRecipeFromUrl"
            >
              <ion-spinner v-if="isFetchingImport" name="crescent" style="width: 18px; height: 18px;" />
              <ion-icon v-else :icon="ioniconsSparklesOutline" />
              <span>{{ isFetchingImport ? 'Pobieranie i analiza...' : 'Pobierz przepis' }}</span>
            </button>
          </div>
        </div>

        <!-- KROK 2: Podgląd i zatwierdzenie zaimportowanego przepisu -->
        <div v-else class="import-preview-step">
          <!-- Hero Card / Image Banner -->
          <div
            v-if="importedRecipePreview.imageUrl"
            class="imported-hero-banner"
            :style="{ backgroundImage: `url(${importedRecipePreview.imageUrl})` }"
          >
            <div class="imported-hero-overlay"></div>
            <div class="imported-source-badge">
              <ion-icon :icon="importedRecipePreview.sourceName?.includes('TikTok') ? ioniconsPlayCircleOutline : ioniconsGlobeOutline" />
              <span>{{ importedRecipePreview.sourceName || 'Zaimportowano z sieci' }}</span>
            </div>
            <div v-if="importedRecipePreview.aiFormatted" class="imported-ai-badge">
              <ion-icon :icon="ioniconsSparklesOutline" />
              <span>Uporządkowane przez AI</span>
            </div>
          </div>
          <div v-else-if="importedRecipePreview.aiFormatted" class="imported-ai-top-bar">
            <span class="imported-ai-pill">
              <ion-icon :icon="ioniconsSparklesOutline" />
              <span>Przepis uporządkowany przez Groq AI</span>
            </span>
          </div>

          <!-- Title Edit Field -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label">
              <ion-icon :icon="ioniconsFastFoodOutline" class="label-icon" />
              <span>Nazwa dania</span>
            </label>
            <div class="input-container-box">
              <ion-input
                v-model="importedRecipePreview.title"
                maxlength="100"
                class="modal-input"
                :clear-input="true"
              />
            </div>
          </div>

          <!-- Category Chips -->
          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsRestaurantOutline" class="label-icon" />
                <span>Kategoria</span>
              </label>
            </div>
            <div class="custom-category-chips-scroll" data-no-swipe>
              <button
                v-for="cat in customCategories"
                :key="cat"
                type="button"
                class="custom-category-pill"
                :class="{ active: importedRecipePreview.category === cat }"
                @click="importedRecipePreview.category = cat"
              >
                {{ cat }}
              </button>
            </div>
          </div>

          <!-- Day Selection (Cookbook vs specific day) -->
          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsCalendarOutline" class="label-icon" />
                <span>Gdzie zapisać?</span>
              </label>
              <span class="label-badge-optional">opcjonalnie</span>
            </div>

            <!-- Choice 1: Only Cookbook (no day assigned) -->
            <div class="custom-day-mode-row">
              <button
                type="button"
                class="custom-mode-choice-btn"
                :class="{ active: !importTargetDate }"
                @click="importTargetDate = ''"
              >
                <ion-icon :icon="ioniconsBookOutline" />
                <span>Tylko książka kucharska (bez dnia w planerze)</span>
              </button>
            </div>

            <!-- Choice 2: Select a specific day of the week -->
            <div class="days-select-grid" :class="{ 'is-inactive': !importTargetDate }">
              <button
                v-for="d in weekDays"
                :key="d.dateStr"
                type="button"
                class="day-select-btn"
                :class="{ active: importTargetDate === d.dateStr, 'has-meal': !!d.meal, 'is-today': d.isToday }"
                @click="importTargetDate = d.dateStr"
              >
                <span class="btn-day-name">{{ d.shortDay }}</span>
                <span class="btn-day-date">{{ d.displayDate.split(' ')[0] }}</span>
                <span v-if="d.meal" class="btn-day-indicator" title="Zaplanowano obiad"></span>
              </button>
            </div>
          </div>

          <!-- Ingredients List Preview (if any) -->
          <div class="form-group" v-if="importedRecipePreview.ingredients?.length">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsCartOutline" class="label-icon" />
                <span>Składniki ({{ importedRecipePreview.ingredients.length }})</span>
              </label>
            </div>
            <div class="imported-ingredients-list">
              <span
                v-for="(ing, iIdx) in importedRecipePreview.ingredients"
                :key="iIdx"
                class="imported-ing-pill"
              >
                {{ ing.name }}
              </span>
            </div>
          </div>

          <!-- Instructions / Caption Preview -->
          <div class="form-group" v-if="importedRecipePreview.instructions">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsBookOutline" class="label-icon" />
                <span>Opis / Przygotowanie</span>
              </label>
            </div>
            <div class="textarea-container-box">
              <ion-textarea
                v-model="importedRecipePreview.instructions"
                maxlength="3000"
                class="modal-textarea"
                :rows="3"
                :auto-grow="true"
              />
            </div>
          </div>

          <!-- Actions: Save & Change Link -->
          <div class="imported-actions-row">
            <button
              type="button"
              class="slot-btn slot-secondary-btn change-link-btn"
              @click="importedRecipePreview = null"
            >
              <span>Zmień link</span>
            </button>
            <button
              type="button"
              class="dn-button-primary submit-custom-meal-btn"
              :disabled="!importedRecipePreview.title?.trim() || isSavingImportedRecipe"
              @click="handleSaveImportedRecipe"
            >
              <ion-spinner v-if="isSavingImportedRecipe" name="crescent" style="width: 18px; height: 18px;" />
              <ion-icon v-else :icon="ioniconsCheckmarkOutline" />
              <span>{{ importTargetDate ? 'Zapisz i zaplanuj' : 'Zapisz w Twoich Przepisach' }}</span>
            </button>
          </div>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDuoState, type MealItem, type MealIngredient } from '~/composables/useDuoState'
import { usePetState } from '~/composables/usePetState'
import { useConfirm } from '~/composables/useConfirm'

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
  deleteSavedRecipe,
  toggleMealCompleted,
  addIngredientsToShopping,
  refreshMeals,
  triggerToast
} = useDuoState()

const { confirm } = useConfirm()

const {
  hasPet,
  petLevel,
  onEnterPetView
} = usePetState()

// Sub-view switcher inside meals: 'calendar' | 'my-recipes' | 'explore'
const activeSubView = ref<'calendar' | 'my-recipes' | 'explore'>('calendar')

// --- TWOJE PRZEPISY (COOKBOOK / HISTORY) ---
export interface SavedRecipe {
  key: string
  title: string
  titlePl?: string
  rawTitle?: string
  category?: string
  area?: string
  image_url?: string
  thumbnail?: string
  source: 'custom' | 'api' | 'import'
  api_id?: string
  ingredients?: MealIngredient[]
  instructions?: string
  instructionsSteps?: string[]
  youtube_url?: string
  recipe_url?: string
  cookCount: number
  lastCookedDate?: string
  latestMealId?: string
  createdAt?: string
}

const deletedSavedRecipeKeys = ref<Set<string>>(new Set())
if (process.client) {
  try {
    const raw = localStorage.getItem('duonest_deleted_saved_recipes')
    if (raw) {
      deletedSavedRecipeKeys.value = new Set(JSON.parse(raw))
    }
  } catch (_) {}
}

const unblockSavedRecipeKey = (key?: string) => {
  if (!key) return
  if (deletedSavedRecipeKeys.value.has(key)) {
    deletedSavedRecipeKeys.value.delete(key)
    if (process.client) {
      try {
        localStorage.setItem('duonest_deleted_saved_recipes', JSON.stringify(Array.from(deletedSavedRecipeKeys.value)))
      } catch (_) {}
    }
  }
}

const savedRecipes = computed<SavedRecipe[]>(() => {
  const map = new Map<string, SavedRecipe>()

  for (const m of mealsList.value) {
    if (!m.title) continue
    const key = m.api_id ? `api_${m.api_id}` : `custom_${m.title.trim().toLowerCase()}`
    if (deletedSavedRecipeKeys.value.has(key)) continue
    const existing = map.get(key)
    const hasDate = !!(m.date && m.date.trim())
    if (!existing) {
      map.set(key, {
        key,
        title: formatMealTitlePl(m.titlePl || m.title),
        titlePl: formatMealTitlePl(m.titlePl || m.title),
        rawTitle: m.title,
        category: m.category,
        area: m.area,
        image_url: m.image_url,
        thumbnail: m.image_url,
        source: m.source || (m.api_id ? 'api' : 'custom'),
        api_id: m.api_id,
        ingredients: m.ingredients || [],
        instructions: m.instructions || '',
        instructionsSteps: m.instructions ? m.instructions.split(/\r?\n+/).map(s => s.trim()).filter(Boolean) : [],
        youtube_url: m.youtube_url,
        recipe_url: m.recipe_url,
        cookCount: hasDate ? 1 : 0,
        lastCookedDate: hasDate ? m.date : undefined,
        latestMealId: m.id,
        createdAt: m.created_at || ''
      })
    } else {
      if (hasDate) {
        existing.cookCount++
        if (!existing.lastCookedDate || m.date > existing.lastCookedDate) {
          existing.lastCookedDate = m.date
          existing.latestMealId = m.id
        }
      }
      if (!existing.image_url && m.image_url) {
        existing.image_url = m.image_url
        existing.thumbnail = m.image_url
      }
      if ((!existing.ingredients || existing.ingredients.length === 0) && m.ingredients && m.ingredients.length > 0) {
        existing.ingredients = m.ingredients
      }
      if (!existing.instructions && m.instructions) {
        existing.instructions = m.instructions
        existing.instructionsSteps = m.instructions.split(/\r?\n+/).map(s => s.trim()).filter(Boolean)
      }
      if (!existing.youtube_url && m.youtube_url) existing.youtube_url = m.youtube_url
      if (!existing.category && m.category) existing.category = m.category
      if (!existing.area && m.area) existing.area = m.area
      if (!existing.createdAt && m.created_at) existing.createdAt = m.created_at
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const dateA = a.lastCookedDate || a.createdAt || ''
    const dateB = b.lastCookedDate || b.createdAt || ''
    return dateB.localeCompare(dateA)
  })
})

const savedSearchQuery = ref('')
const savedFilterType = ref<'all' | 'custom' | 'api' | 'import' | 'unplanned' | 'cooked'>('all')
const savedSelectedCategory = ref<string>('all')
const savedSortOption = ref<'recent' | 'alpha' | 'cookCount' | 'ingredients'>('recent')
const savedViewMode = ref<'grid' | 'list'>('grid')

if (process.client) {
  try {
    const savedMode = localStorage.getItem('duonest_saved_view_mode')
    if (savedMode === 'grid' || savedMode === 'list') {
      savedViewMode.value = savedMode
    }
  } catch (_) {}
}

const setSavedViewMode = (mode: 'grid' | 'list') => {
  savedViewMode.value = mode
  if (process.client) {
    try {
      localStorage.setItem('duonest_saved_view_mode', mode)
    } catch (_) {}
  }
}

const savedCustomCount = computed(() => savedRecipes.value.filter(r => r.source === 'custom').length)
const savedApiCount = computed(() => savedRecipes.value.filter(r => r.source === 'api').length)
const savedImportCount = computed(() => savedRecipes.value.filter(r => r.source === 'import').length)
const savedUnplannedCount = computed(() => savedRecipes.value.filter(r => !r.lastCookedDate).length)
const savedCookedCount = computed(() => savedRecipes.value.filter(r => r.cookCount > 1).length)

const availableSavedCategories = computed(() => {
  const map = new Map<string, number>()
  for (const r of savedRecipes.value) {
    const cat = r.category?.trim()
    if (cat) {
      map.set(cat, (map.get(cat) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'))
})

const hasActiveFilters = computed(() => {
  return savedFilterType.value !== 'all' ||
    savedSelectedCategory.value !== 'all' ||
    !!savedSearchQuery.value.trim() ||
    savedSortOption.value !== 'recent'
})

const resetSavedFilters = () => {
  savedFilterType.value = 'all'
  savedSelectedCategory.value = 'all'
  savedSearchQuery.value = ''
  savedSortOption.value = 'recent'
}

const getFilterTypeLabel = (type: string) => {
  switch (type) {
    case 'custom': return 'Własne dania'
    case 'import': return 'Z linku / TikTok'
    case 'api': return 'Z inspiracji'
    case 'unplanned': return 'Tylko w książce'
    case 'cooked': return 'Ulubione'
    default: return 'Wszystkie'
  }
}

const getSortOptionLabel = (option: string) => {
  switch (option) {
    case 'alpha': return 'A - Z'
    case 'cookCount': return 'Popularność'
    case 'ingredients': return 'Składniki'
    default: return 'Najnowsze'
  }
}

const filteredSavedRecipes = computed(() => {
  let list = savedRecipes.value

  // 1. Source / Status Filter
  if (savedFilterType.value === 'custom') {
    list = list.filter(r => r.source === 'custom')
  } else if (savedFilterType.value === 'import') {
    list = list.filter(r => r.source === 'import')
  } else if (savedFilterType.value === 'api') {
    list = list.filter(r => r.source === 'api')
  } else if (savedFilterType.value === 'unplanned') {
    list = list.filter(r => !r.lastCookedDate)
  } else if (savedFilterType.value === 'cooked') {
    list = list.filter(r => r.cookCount > 1)
  }

  // 2. Category Filter
  if (savedSelectedCategory.value !== 'all') {
    const targetCat = savedSelectedCategory.value.toLowerCase().trim()
    list = list.filter(r => (r.category?.toLowerCase().trim() || '') === targetCat)
  }

  // 3. Search Query Filter
  const q = savedSearchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r => {
      const matchTitle = r.title.toLowerCase().includes(q)
      const matchCat = r.category?.toLowerCase().includes(q)
      const matchArea = r.area?.toLowerCase().includes(q)
      const matchIng = r.ingredients?.some(i => i.name.toLowerCase().includes(q))
      return matchTitle || matchCat || matchArea || matchIng
    })
  }

  // 4. Sorting
  const sorted = [...list]
  if (savedSortOption.value === 'alpha') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'pl'))
  } else if (savedSortOption.value === 'cookCount') {
    sorted.sort((a, b) => b.cookCount - a.cookCount || a.title.localeCompare(b.title, 'pl'))
  } else if (savedSortOption.value === 'ingredients') {
    sorted.sort((a, b) => (a.ingredients?.length || 0) - (b.ingredients?.length || 0))
  } else {
    // 'recent'
    sorted.sort((a, b) => {
      const dateA = a.lastCookedDate || a.createdAt || ''
      const dateB = b.lastCookedDate || b.createdAt || ''
      return dateB.localeCompare(dateA)
    })
  }

  return sorted
})

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
  const currentDayOfWeek = now.getDay()
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
    const col = partnerUserAccentColor.value || '#1e293b'
    return {
      backgroundColor: hexToRgba(col, 0.12),
      color: col,
      borderColor: hexToRgba(col, 0.28)
    }
  }
  if (cookId === 'restaurant' || cookId === 'takeout') {
    return {
      backgroundColor: 'rgba(30, 41, 59, 0.1)',
      color: '#1e293b',
      borderColor: 'rgba(30, 41, 59, 0.24)'
    }
  }
  if (cookId === 'both') {
    return {
      backgroundColor: 'rgba(15, 23, 42, 0.1)',
      color: '#0f172a',
      borderColor: 'rgba(15, 23, 42, 0.24)'
    }
  }
  const myCol = currentUserAccentColor.value || '#0f172a'
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

const handleDeleteMeal = async (id: string, mealTitle?: string) => {
  const confirmed = await confirm({
    title: 'Usuń obiad z planu',
    message: mealTitle ? `Czy na pewno chcesz usunąć obiad "${mealTitle}" z jadłospisu na ten tydzień?` : 'Czy na pewno chcesz usunąć ten obiad z jadłospisu?',
    itemHighlight: mealTitle || '',
    confirmText: 'Usuń z planu',
    cancelText: 'Anuluj',
    type: 'danger',
    icon: 'trash'
  })
  if (confirmed) {
    await deleteMeal(id)
  }
}

const handleAddMealIngredientsToShopping = async (meal: MealItem) => {
  if (!meal.ingredients || meal.ingredients.length === 0) return
  const translated = meal.ingredients.map(ing => ({
    name: translateIngredientName(ing.name),
    measure: ing.measure ? formatMeasurePl(ing.measure) : ''
  }))
  await addIngredientsToShopping(translated)
}

// --- EXPLORE / RECIPES CATALOG STATE ---
const searchQuery = ref('')
const activeFilterId = ref('all')
const apiResults = ref<any[]>([])
const isLoadingApi = ref(false)
const isLoadingRandom = ref(false)
const currentPage = ref(1)
const pagination = ref({
  page: 1,
  limit: 24,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false
})

const curatedFilterPills = [
  { id: 'all', label: 'Wszystkie (793)', type: 'all', value: '' },
  { id: 'pasta', label: 'Makarony', type: 'category', value: 'Pasta' },
  { id: 'chicken', label: 'Drób & Kurczak', type: 'category', value: 'Chicken' },
  { id: 'beef', label: 'Wołowina', type: 'category', value: 'Beef' },
  { id: 'pork', label: 'Wieprzowina', type: 'category', value: 'Pork' },
  { id: 'seafood', label: 'Ryby & Owoce morza', type: 'category', value: 'Seafood' },
  { id: 'veg', label: 'Wegetariańskie', type: 'category', value: 'Vegetarian' },
  { id: 'vegan', label: 'Wegańskie', type: 'category', value: 'Vegan' },
  { id: 'breakfast', label: 'Śniadania', type: 'category', value: 'Breakfast' },
  { id: 'lamb', label: 'Jagnięcina', type: 'category', value: 'Lamb' },
  { id: 'soup', label: 'Zupy & Dodatki', type: 'category', value: 'Side' },
  { id: 'starter', label: 'Przekąski', type: 'category', value: 'Starter' },
  { id: 'dessert', label: 'Desery', type: 'category', value: 'Dessert' },
  { id: 'misc', label: 'Różne dania', type: 'category', value: 'Miscellaneous' },
  { id: 'italian', label: 'Włoska', type: 'area', value: 'Italian' },
  { id: 'asian', label: 'Azjatycka', type: 'area', value: 'Asian' },
  { id: 'mexican', label: 'Meksykańska', type: 'area', value: 'Mexican' },
  { id: 'french', label: 'Francuska', type: 'area', value: 'French' },
  { id: 'greek', label: 'Grecka', type: 'area', value: 'Greek' },
  { id: 'polish', label: 'Polska', type: 'area', value: 'Polish' }
]

const visiblePageNumbers = computed<(number | string)[]>(() => {
  const current = pagination.value.page
  const total = pagination.value.totalPages
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  if (current <= 3) {
    return [1, 2, 3, '...', total]
  }
  if (current >= total - 2) {
    return [1, '...', total - 2, total - 1, total]
  }
  return [1, '...', current - 1, current, current + 1, '...', total]
})

const fetchMealApi = async <T = any>(endpoint: string): Promise<T | null> => {
  // 1. Primary path: Nuxt server route (and Netlify redirect)
  try {
    const res = await $fetch<T>(endpoint)
    if (res && typeof res === 'object') return res
  } catch (_) {}

  // 2. Secondary path: direct Netlify serverless function invocation
  if (endpoint.startsWith('/api/meals/')) {
    const netlifyEndpoint = endpoint.replace('/api/meals/', '/.netlify/functions/meals-')
    try {
      const res = await $fetch<T>(netlifyEndpoint)
      if (res && typeof res === 'object') return res
    } catch (_) {}
  }

  // 3. Tertiary fallback: direct TheMealDB API
  try {
    if (endpoint.includes('/api/meals/search')) {
      const urlObj = new URL(endpoint, 'http://localhost')
      const isRandom = urlObj.searchParams.get('random') === 'true'
      const q = urlObj.searchParams.get('q') || ''
      const category = urlObj.searchParams.get('category') || ''

      let tmdbUrl = 'https://www.themealdb.com/api/json/v1/1/search.php?s='
      if (isRandom) {
        tmdbUrl = 'https://www.themealdb.com/api/json/v1/1/random.php'
      } else if (category && category !== 'all') {
        tmdbUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`
      } else if (q) {
        tmdbUrl = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`
      }

      const rawRes = await fetch(tmdbUrl, { headers: { Accept: 'application/json' } })
      if (rawRes.ok) {
        const data = await rawRes.json()
        const rawList = Array.isArray(data?.meals) ? data.meals : []
        const meals = rawList.map((raw: any) => ({
          id: String(raw.idMeal || ''),
          title: formatMealTitlePl(raw.strMeal || ''),
          titlePl: formatMealTitlePl(raw.strMeal || ''),
          originalTitle: raw.strMeal,
          category: raw.strCategory || 'Inne',
          categoryPl: raw.strCategory || 'Inne',
          area: raw.strArea || 'Międzynarodowa',
          areaPl: raw.strArea || 'Międzynarodowa',
          thumbnail: raw.strMealThumb || '',
          instructions: raw.strInstructions || '',
          instructionsSteps: raw.strInstructions ? raw.strInstructions.split(/\r?\n+/).map((s: string) => s.trim()).filter(Boolean) : [],
          tags: raw.strTags ? raw.strTags.split(',').map((t: string) => t.trim()) : [],
          youtubeUrl: raw.strYoutube || null,
          sourceUrl: raw.strSource || null,
          ingredients: []
        }))
        return {
          success: true,
          meals,
          pagination: {
            page: 1,
            limit: meals.length,
            total: meals.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        } as T
      }
    } else if (endpoint.includes('/api/meals/lookup')) {
      const urlObj = new URL(endpoint, 'http://localhost')
      const id = urlObj.searchParams.get('id') || ''
      if (id) {
        const rawRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } })
        if (rawRes.ok) {
          const data = await rawRes.json()
          const raw = data?.meals?.[0]
          if (raw) {
            const ingredients: any[] = []
            for (let i = 1; i <= 20; i++) {
              const ing = raw[`strIngredient${i}`]
              const measure = raw[`strMeasure${i}`]
              if (ing && ing.trim()) {
                ingredients.push({
                  name: translateIngredientName(ing.trim()),
                  measure: measure ? formatMeasurePl(measure.trim()) : ''
                })
              }
            }
            return {
              success: true,
              meal: {
                id: String(raw.idMeal || ''),
                title: formatMealTitlePl(raw.strMeal || ''),
                titlePl: formatMealTitlePl(raw.strMeal || ''),
                originalTitle: raw.strMeal,
                category: raw.strCategory || 'Inne',
                categoryPl: raw.strCategory || 'Inne',
                area: raw.strArea || 'Międzynarodowa',
                areaPl: raw.strArea || 'Międzynarodowa',
                thumbnail: raw.strMealThumb || '',
                instructions: raw.strInstructions || '',
                instructionsSteps: raw.strInstructions ? raw.strInstructions.split(/\r?\n+/).map((s: string) => s.trim()).filter(Boolean) : [],
                tags: raw.strTags ? raw.strTags.split(',').map((t: string) => t.trim()) : [],
                youtubeUrl: raw.strYoutube || null,
                sourceUrl: raw.strSource || null,
                ingredients
              }
            } as T
          }
        }
      }
    }
  } catch (_) {}

  return null
}

const fetchApiMeals = async (overrideType?: string, overrideVal?: string, targetPage?: number) => {
  isLoadingApi.value = true
  if (targetPage !== undefined) {
    currentPage.value = targetPage
  }
  try {
    const params = new URLSearchParams()
    params.set('page', String(currentPage.value || 1))
    params.set('limit', '24')

    if (searchQuery.value.trim()) {
      params.set('q', searchQuery.value.trim())
    } else {
      const currentPill = curatedFilterPills.find(p => p.id === activeFilterId.value)
      const type = overrideType || currentPill?.type || 'all'
      const val = overrideVal !== undefined ? overrideVal : (currentPill?.value || '')

      if (type === 'category' && val) {
        params.set('category', val)
      } else if (type === 'area' && val) {
        params.set('area', val)
      }
    }

    const res = await fetchMealApi<{ success: boolean; meals: any[]; pagination?: any }>(`/api/meals/search?${params.toString()}`)
    if (res && res.meals) {
      apiResults.value = (res.meals || []).filter((m: any) => m && (m.id || m.title))
      if (res.pagination) {
        pagination.value = res.pagination
      } else {
        pagination.value = {
          page: 1,
          limit: 24,
          total: res.meals.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      }
    } else {
      apiResults.value = []
      pagination.value = { page: 1, limit: 24, total: 0, totalPages: 1, hasNext: false, hasPrev: false }
    }
  } catch (e) {
    console.warn('fetchApiMeals error:', e)
    apiResults.value = []
  } finally {
    isLoadingApi.value = false
  }
}

const applyCuratedFilter = (pill: any) => {
  activeFilterId.value = pill.id
  searchQuery.value = ''
  currentPage.value = 1
  fetchApiMeals(pill.type, pill.value, 1)
}

const triggerSearch = () => {
  currentPage.value = 1
  fetchApiMeals(undefined, undefined, 1)
}

const clearSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
  fetchApiMeals(undefined, undefined, 1)
}

const goToPage = (page: number | string) => {
  if (typeof page !== 'number') return
  if (page < 1 || page > pagination.value.totalPages || page === pagination.value.page) return
  currentPage.value = page
  fetchApiMeals(undefined, undefined, page)
  if (typeof window !== 'undefined') {
    const el = document.querySelector('.quick-filter-scroll')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
}

const handleSurpriseMe = async () => {
  if (isLoadingRandom.value) return
  isLoadingRandom.value = true
  const minSuspenseDelay = new Promise(resolve => setTimeout(resolve, 650))
  try {
    const [res] = await Promise.all([
      fetchMealApi<{ success: boolean; meals: any[] }>('/api/meals/search?random=true'),
      minSuspenseDelay
    ])
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
const isTranslatingRecipe = ref(false)

const isTextInEnglish = (text?: string) => {
  if (!text) return false
  const sample = text.toLowerCase().slice(0, 300)
  return /\b(the|and|with|heat|oven|into|minutes|bowl|place|cook|until|add)\b/i.test(sample)
}

const ensureMealInstructionsTranslated = async (meal: any) => {
  if (!meal) return
  const needsSteps = !meal.instructionsSteps || meal.instructionsSteps.length === 0
  const englishDetected = isTextInEnglish(meal.instructions) || (meal.instructionsSteps && isTextInEnglish(meal.instructionsSteps[0]))

  if ((englishDetected || needsSteps) && meal.id) {
    isTranslatingRecipe.value = true
    try {
      const res = await fetchMealApi<{ success: boolean; meal: any }>(`/api/meals/lookup?id=${meal.id}`)
      if (res && res.meal) {
        if (activeSelectedMeal.value && String(activeSelectedMeal.value.id) === String(meal.id)) {
          activeSelectedMeal.value = {
            ...activeSelectedMeal.value,
            instructions: res.meal.instructions || activeSelectedMeal.value.instructions,
            instructionsSteps: res.meal.instructionsSteps || activeSelectedMeal.value.instructionsSteps,
            ingredients: res.meal.ingredients?.length ? res.meal.ingredients : activeSelectedMeal.value.ingredients
          }
        }
      }
    } catch (e) {
      console.warn('lookup error:', e)
    } finally {
      isTranslatingRecipe.value = false
    }
  }
}

const openMealDetailsModal = (meal: any) => {
  activeSelectedMeal.value = meal
  showDetailsModal.value = true
  ensureMealInstructionsTranslated(meal)
}

const openApiMealPreview = async (meal: any) => {
  activeSelectedMeal.value = meal
  showDetailsModal.value = true
  ensureMealInstructionsTranslated(meal)
}

const openAssignFromDetails = (meal: any) => {
  showDetailsModal.value = false
  setTimeout(() => {
    openAssignModal(meal)
  }, 220)
}

const handleAddIngredientsFromDetails = async () => {
  if (!activeSelectedMeal.value?.ingredients) return
  const translated = activeSelectedMeal.value.ingredients.map(ing => ({
    name: translateIngredientName(ing.name),
    measure: ing.measure ? formatMeasurePl(ing.measure) : ''
  }))
  await addIngredientsToShopping(translated)
}

// --- ASSIGN MEAL TO DAY MODAL ---
const showAssignModal = ref(false)
const assignTargetMeal = ref<any>(null)
const assignDate = ref('')
const assignCook = ref<'me' | 'partner' | 'both' | 'restaurant' | 'takeout'>('me')

const selectedAssignDayLabel = computed(() => {
  if (!assignDate.value) return ''
  const d = weekDays.value.find(item => item.dateStr === assignDate.value)
  return d ? `${d.dayName}, ${d.displayDate}` : ''
})

const openAssignModal = async (meal: any, defaultDate?: string) => {
  let fullMeal = meal
  if (meal.source === 'api' && meal.api_id && (!meal.ingredients || meal.ingredients.length === 0)) {
    try {
      const res = await fetchMealApi<{ success: boolean; meal: any }>(`/api/meals/lookup?id=${meal.api_id || meal.id}`)
      if (res?.meal) fullMeal = res.meal
    } catch (_) {}
  } else if (!meal.ingredients || meal.ingredients.length === 0) {
    try {
      const res = await fetchMealApi<{ success: boolean; meal: any }>(`/api/meals/lookup?id=${meal.id}`)
      if (res?.meal) fullMeal = res.meal
    } catch (_) {}
  }

  assignTargetMeal.value = fullMeal
  assignDate.value = defaultDate || weekDays.value.find(d => !d.meal)?.dateStr || weekDays.value[0]?.dateStr || toIsoDateString(new Date())
  assignCook.value = 'me'
  showAssignModal.value = true
}

const isSubmittingAssignMeal = ref(false)

const confirmAssignMeal = async () => {
  if (isSubmittingAssignMeal.value) return
  if (!assignTargetMeal.value || !assignDate.value) return
  const m = assignTargetMeal.value
  const targetDay = weekDays.value.find(d => d.dateStr === assignDate.value)

  isSubmittingAssignMeal.value = true
  try {
    const assignKey = (m.api_id || m.id) ? `api_${m.api_id || m.id}` : `custom_${(m.title || '').trim().toLowerCase()}`
    unblockSavedRecipeKey(assignKey)

    await addMeal({
      date: assignDate.value,
      day_name: targetDay?.dayName || '',
      title: formatMealTitlePl(m.titlePl || m.title),
      category: m.categoryPl || m.category || '',
      area: m.areaPl || m.area || '',
      cook_id: assignCook.value,
      image_url: m.thumbnail || m.image_url || '',
      source: m.source || (m.api_id ? 'api' : 'custom'),
      api_id: m.api_id || m.id,
      ingredients: m.ingredients || [],
      instructions: m.instructions || '',
      youtube_url: m.youtubeUrl || m.youtube_url || '',
      recipe_url: m.sourceUrl || m.recipe_url || ''
    })

    showAssignModal.value = false
    activeSubView.value = 'calendar'
  } finally {
    isSubmittingAssignMeal.value = false
  }
}

const openExploreForDate = (dateStr: string) => {
  assignDate.value = dateStr
  activeSubView.value = 'explore'
  if (apiResults.value.length === 0) {
    fetchApiMeals()
  }
}

// --- PICK FROM SAVED RECIPES MODAL ---
const showPickSavedModal = ref(false)
const targetPickDate = ref('')
const pickModalSearch = ref('')
const pickModalCook = ref<'me' | 'partner' | 'both' | 'restaurant' | 'takeout'>('me')

const selectedTargetPickDayLabel = computed(() => {
  if (!targetPickDate.value) return ''
  const d = weekDays.value.find(item => item.dateStr === targetPickDate.value)
  return d ? `${d.dayName}, ${d.displayDate}` : ''
})

const openPickSavedModal = (dateStr: string) => {
  targetPickDate.value = dateStr
  pickModalSearch.value = ''
  pickModalCook.value = 'me'
  showPickSavedModal.value = true
}

const modalPickRecipesList = computed(() => {
  const q = pickModalSearch.value.trim().toLowerCase()
  if (!q) return savedRecipes.value
  return savedRecipes.value.filter(r => {
    return r.title.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q) ||
      r.ingredients?.some(i => i.name.toLowerCase().includes(q))
  })
})

const isSubmittingSavedRecipe = ref(false)

const selectSavedRecipeForDay = async (recipe: SavedRecipe) => {
  if (isSubmittingSavedRecipe.value) return
  if (!targetPickDate.value) return
  const targetDay = weekDays.value.find(d => d.dateStr === targetPickDate.value)

  isSubmittingSavedRecipe.value = true
  try {
    unblockSavedRecipeKey(recipe.key)

    await addMeal({
      date: targetPickDate.value,
      day_name: targetDay?.dayName || '',
      title: formatMealTitlePl(recipe.titlePl || recipe.title),
      category: recipe.category || '',
      area: recipe.area || '',
      cook_id: pickModalCook.value,
      image_url: recipe.image_url || '',
      source: recipe.source,
      api_id: recipe.api_id,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || '',
      youtube_url: recipe.youtube_url || '',
      recipe_url: recipe.recipe_url || ''
    })

    showPickSavedModal.value = false
    activeSubView.value = 'calendar'
  } finally {
    isSubmittingSavedRecipe.value = false
  }
}

const isRecipeInSaved = (meal?: any): boolean => {
  if (!meal) return false
  const mealId = meal.api_id || (meal.source === 'api' ? meal.id : undefined)
  const cleanTitle = (meal.title || meal.name || meal.rawTitle || '').trim().toLowerCase()
  const key = meal.key || (mealId ? `api_${mealId}` : (meal.id ? `api_${meal.id}` : `custom_${cleanTitle}`))

  if (savedRecipes.value.some(r => r.key === key)) return true
  if (mealId && savedRecipes.value.some(r => r.api_id && String(r.api_id) === String(mealId))) return true
  if (cleanTitle && savedRecipes.value.some(r => (r.rawTitle?.trim().toLowerCase() === cleanTitle) || (r.title?.trim().toLowerCase() === cleanTitle))) return true
  return false
}

const confirmDeleteSavedRecipe = async (recipe: SavedRecipe | any) => {
  if (!recipe) return
  const title = formatMealTitlePl(recipe.titlePl || recipe.title || recipe.name)
  const confirmed = await confirm({
    title: 'Usuń przepis',
    message: `Czy na pewno chcesz usunąć przepis "${title}" z Twoich przepisów?`,
    itemHighlight: title,
    confirmText: 'Usuń z książki',
    cancelText: 'Anuluj',
    type: 'danger',
    icon: 'trash'
  })
  if (confirmed) {
    const key = recipe.key || (recipe.api_id ? `api_${recipe.api_id}` : (recipe.id ? `api_${recipe.id}` : `custom_${(recipe.title || '').trim().toLowerCase()}`))
    deletedSavedRecipeKeys.value.add(key)
    if (process.client) {
      try {
        localStorage.setItem('duonest_deleted_saved_recipes', JSON.stringify(Array.from(deletedSavedRecipeKeys.value)))
      } catch (_) {}
    }
    await deleteSavedRecipe(recipe)
    if (activeSelectedMeal.value) {
      const activeKey = activeSelectedMeal.value.key || (activeSelectedMeal.value.api_id ? `api_${activeSelectedMeal.value.api_id}` : `custom_${(activeSelectedMeal.value.title || '').trim().toLowerCase()}`)
      if (activeKey === key || (recipe.api_id && String(activeSelectedMeal.value.api_id) === String(recipe.api_id))) {
        showDetailsModal.value = false
      }
    }
  }
}

const handleToggleSaveRecipe = async (meal: any) => {
  if (!meal) return
  if (isRecipeInSaved(meal)) {
    await confirmDeleteSavedRecipe(meal)
    return
  }

  let fullMeal = meal
  const mealId = meal.api_id || meal.id
  if (meal.source === 'api' || mealId) {
    if (!meal.ingredients || meal.ingredients.length === 0) {
      try {
        const res = await fetchMealApi<{ success: boolean; meal: any }>(`/api/meals/lookup?id=${mealId}`)
        if (res?.meal) fullMeal = res.meal
      } catch (_) {}
    }
  }

  const recipeKey = mealId ? `api_${mealId}` : `custom_${(fullMeal.title || fullMeal.name || '').trim().toLowerCase()}`
  unblockSavedRecipeKey(recipeKey)

  await addMeal({
    date: '', // Brak wyznaczonego dnia - bezposrednio do ksiazki kucharskiej
    day_name: '',
    title: formatMealTitlePl(fullMeal.titlePl || fullMeal.title || fullMeal.name),
    category: fullMeal.categoryPl || fullMeal.category || '',
    area: fullMeal.areaPl || fullMeal.area || '',
    cook_id: 'me',
    image_url: fullMeal.thumbnail || fullMeal.image_url || '',
    source: fullMeal.source || (mealId ? 'api' : 'custom'),
    api_id: mealId ? String(mealId) : undefined,
    ingredients: fullMeal.ingredients || [],
    instructions: fullMeal.instructions || '',
    youtube_url: fullMeal.youtubeUrl || fullMeal.youtube_url || '',
    recipe_url: fullMeal.sourceUrl || fullMeal.recipe_url || ''
  })
}

const openSavedRecipeDetails = (recipe: SavedRecipe) => {
  activeSelectedMeal.value = {
    ...recipe,
    thumbnail: recipe.image_url,
    instructionsSteps: recipe.instructionsSteps?.length
      ? recipe.instructionsSteps
      : (recipe.instructions ? recipe.instructions.split(/\r?\n+/).map(s => s.trim()).filter(Boolean) : [])
  }
  showDetailsModal.value = true
}

// --- ADD CUSTOM MEAL / COOKBOOK RECIPE MODAL ---
const showAddCustomModal = ref(false)
const customTitle = ref('')
const customDate = ref('')
const customCook = ref<'me' | 'partner' | 'both' | 'restaurant' | 'takeout'>('me')
const customCategory = ref('Obiad domowy')
const customImageUrl = ref('')
const customIngredientsText = ref('')
const customInstructions = ref('')

const customCategories = [
  'Obiad domowy',
  'Makarony',
  'Drób',
  'Wołowina',
  'Wieprzowina',
  'Ryby',
  'Wegetariańskie',
  'Zupy',
  'Śniadania',
  'Desery',
  'Inne'
]

const selectedCustomDayLabel = computed(() => {
  if (!customDate.value) return 'Tylko w Twoich przepisach (bez dnia)'
  const d = weekDays.value.find(item => item.dateStr === customDate.value)
  return d ? `${d.dayName}, ${d.displayDate}` : customDate.value
})

const openAddCookbookRecipeModal = () => {
  customTitle.value = ''
  customDate.value = ''
  customCook.value = 'me'
  customCategory.value = 'Obiad domowy'
  customImageUrl.value = ''
  customIngredientsText.value = ''
  customInstructions.value = ''
  showAddCustomModal.value = true
}

const openAddCustomModal = (defaultDate?: string) => {
  customTitle.value = ''
  if (defaultDate !== undefined) {
    customDate.value = defaultDate
  } else {
    customDate.value = weekDays.value.find(d => !d.meal)?.dateStr || weekDays.value[0]?.dateStr || toIsoDateString(new Date())
  }
  customCook.value = 'me'
  customCategory.value = 'Obiad domowy'
  customImageUrl.value = ''
  customIngredientsText.value = ''
  customInstructions.value = ''
  showAddCustomModal.value = true
}

const isSubmittingCustomMeal = ref(false)

const handleCreateCustomMeal = async () => {
  if (isSubmittingCustomMeal.value) return
  const cleanTitle = customTitle.value.trim().slice(0, 100)
  if (!cleanTitle) return

  isSubmittingCustomMeal.value = true
  try {
    const ingredients: MealIngredient[] = []
    if (customIngredientsText.value.trim()) {
      const lines = customIngredientsText.value.split(/[\n,]+/).map(s => s.trim().slice(0, 80)).filter(Boolean)
      for (const item of lines) {
        ingredients.push({ name: item })
      }
    }

    const cleanDate = customDate.value ? customDate.value.trim() : ''
    const targetDay = cleanDate ? weekDays.value.find(d => d.dateStr === cleanDate) : null

    unblockSavedRecipeKey(`custom_${cleanTitle.toLowerCase()}`)

    await addMeal({
      date: cleanDate,
      day_name: targetDay?.dayName || '',
      title: cleanTitle,
      category: customCategory.value || 'Obiad domowy',
      image_url: customImageUrl.value.trim() || undefined,
      cook_id: customCook.value,
      source: 'custom',
      ingredients,
      instructions: customInstructions.value.trim().slice(0, 2000)
    })

    showAddCustomModal.value = false
  } finally {
    isSubmittingCustomMeal.value = false
  }
}

// --- IMPORT RECIPE FROM LINK / TIKTOK ---
const showImportModal = ref(false)
const importUrlInput = ref('')
const isFetchingImport = ref(false)
const importErrorMessage = ref('')
const importedRecipePreview = ref<any | null>(null)
const importTargetDate = ref('')
const isSavingImportedRecipe = ref(false)

const canPasteClipboard = computed(() => {
  if (process.server) return false
  return typeof navigator !== 'undefined' && !!navigator.clipboard?.readText
})

const openImportRecipeModal = () => {
  importUrlInput.value = ''
  importErrorMessage.value = ''
  importedRecipePreview.value = null
  importTargetDate.value = ''
  showImportModal.value = true
}

const closeImportModal = () => {
  showImportModal.value = false
  importedRecipePreview.value = null
  importErrorMessage.value = ''
  importUrlInput.value = ''
}

const handlePasteFromClipboard = async () => {
  try {
    if (navigator?.clipboard?.readText) {
      const text = await navigator.clipboard.readText()
      if (text && text.trim()) {
        importUrlInput.value = text.trim()
        importErrorMessage.value = ''
      }
    }
  } catch (_) {}
}

const handleFetchRecipeFromUrl = async () => {
  if (isFetchingImport.value) return
  const cleanUrl = importUrlInput.value.trim()
  if (!cleanUrl) {
    importErrorMessage.value = 'Wklej link do przepisu lub TikToka.'
    return
  }

  isFetchingImport.value = true
  importErrorMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; recipe?: any; error?: string }>('/api/meals/import', {
      method: 'POST',
      body: { url: cleanUrl }
    })

    if (res && res.success && res.recipe) {
      importedRecipePreview.value = {
        title: res.recipe.title || '',
        category: res.recipe.category || 'Obiad domowy',
        area: res.recipe.area || '',
        imageUrl: res.recipe.imageUrl || '',
        ingredients: res.recipe.ingredients || [],
        instructions: res.recipe.instructions || '',
        recipeUrl: res.recipe.recipeUrl || cleanUrl,
        sourceName: res.recipe.sourceName || 'Zaimportowano z sieci',
        source: 'import',
        aiFormatted: !!res.recipe.aiFormatted
      }
      importTargetDate.value = ''
    } else {
      importErrorMessage.value = res?.error || 'Nie udało się pobrać danych z tego linku.'
    }
  } catch (err: any) {
    importErrorMessage.value = err?.data?.statusMessage || err?.message || 'Wystąpił błąd podczas pobierania przepisu.'
  } finally {
    isFetchingImport.value = false
  }
}

const handleSaveImportedRecipe = async () => {
  if (isSavingImportedRecipe.value || !importedRecipePreview.value) return
  const cleanTitle = importedRecipePreview.value.title?.trim()
  if (!cleanTitle) return

  isSavingImportedRecipe.value = true
  try {
    const cleanDate = importTargetDate.value ? importTargetDate.value.trim() : ''
    const targetDay = cleanDate ? weekDays.value.find(d => d.dateStr === cleanDate) : null

    unblockSavedRecipeKey(`import_${cleanTitle.toLowerCase()}`)
    unblockSavedRecipeKey(`custom_${cleanTitle.toLowerCase()}`)

    await addMeal({
      date: cleanDate,
      day_name: targetDay?.dayName || '',
      title: cleanTitle,
      category: importedRecipePreview.value.category || 'Obiad domowy',
      area: importedRecipePreview.value.area || '',
      image_url: importedRecipePreview.value.imageUrl || '',
      cook_id: 'me',
      source: 'import',
      ingredients: importedRecipePreview.value.ingredients || [],
      instructions: importedRecipePreview.value.instructions || '',
      recipe_url: importedRecipePreview.value.recipeUrl || importUrlInput.value
    })

    closeImportModal()
    activeSubView.value = 'my-recipes'
  } finally {
    isSavingImportedRecipe.value = false
  }
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
  gap: 3px;
}

.subview-pill {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 6px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.subview-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.subview-count-badge {
  background: #0f172a;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
  margin-left: 2px;
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
  color: #0f172a;
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
  border-color: #0f172a;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
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
  background: #0f172a;
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
  overflow-wrap: break-word;
  word-break: break-word;
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
  flex-wrap: wrap;
  gap: 6px;
}

.slot-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 7px 11px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.slot-saved-btn {
  background: #0f172a;
  color: #ffffff;
}

.slot-primary-btn {
  background: #0f172a;
  color: #ffffff;
}

.slot-secondary-btn {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.slot-count-badge {
  background: rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
  margin-left: 2px;
}

/* WIDOK 2: INSPIRACJE & PRZEPISY (KATALOG) */
.meals-explore-wrapper {
  padding: 12px 14px 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* COMPACT SURPRISE BAR */
.surprise-hero-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.surprise-hero-bar:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.surprise-hero-bar:active {
  transform: scale(0.99);
}

.surprise-hero-bar.is-rolling {
  border-color: #cbd5e1;
  background: #ffffff;
}

.surprise-left-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.surprise-icon-orb {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #0f172a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.surprise-icon-orb.is-spinning {
  opacity: 0.75;
}

.surprise-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.surprise-badge-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: #0f172a;
  letter-spacing: 0.5px;
}

.surprise-heading {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin: 1px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.surprise-pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  min-width: 88px;
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  user-select: none;
}

.surprise-pill-btn:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
}

.surprise-pill-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.surprise-pill-btn .btn-arrow-icon {
  font-size: 13px;
  transition: transform 0.2s ease;
}

.surprise-pill-btn:hover .btn-arrow-icon {
  transform: translateX(2px);
}

/* Minimalist Loading State */
.surprise-pill-btn.is-loading {
  background: #0f172a;
  opacity: 0.88;
  cursor: wait;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
  gap: 7px;
}

.minimal-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: minimalSpin 0.75s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

@keyframes minimalSpin {
  to {
    transform: rotate(360deg);
  }
}

.btn-rolling-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #ffffff;
}

/* SEARCH FIELD */
.explore-search-container {
  width: 100%;
}

.explore-search-field {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 8px 12px;
  gap: 8px;
  transition: all 0.2s ease;
}

.explore-search-field:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.08);
}

.search-ico {
  font-size: 17px;
  color: #94a3b8;
  flex-shrink: 0;
}

.search-input-el {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  min-width: 0;
}

.search-input-el::placeholder {
  color: #94a3b8;
  font-size: 12.5px;
}

.search-clear-ico {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 17px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
}

/* SINGLE HORIZONTAL CURATED FILTER PILLS */
.quick-filter-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.quick-filter-scroll::-webkit-scrollbar {
  display: none;
}

.curated-filter-pill {
  flex-shrink: 0;
  padding: 6px 13px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.curated-filter-pill.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

/* RECIPES GRID: Spacious, high-impact recipe cards */
.meals-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

@media (min-width: 640px) {
  .meals-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
}

@media (min-width: 1024px) {
  .meals-cards-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
}

.recipe-card {
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.recipe-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.recipe-card:active {
  transform: scale(0.985);
}

.recipe-card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f1f5f9;
  overflow: hidden;
}

.recipe-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.recipe-card:hover .recipe-img {
  transform: scale(1.025);
}

.recipe-img-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
  gap: 6px;
}

.recipe-img-placeholder ion-icon {
  font-size: 36px;
  color: #94a3b8;
}

.placeholder-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.recipe-badges-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.recipe-badge-cuisine {
  background: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 7px;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-badge-category {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #0f172a;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 7px;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.recipe-badge-source {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 7px;
  font-size: 10.5px;
  font-weight: 700;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.recipe-badge-source.custom {
  background: rgba(2, 132, 199, 0.9);
  color: #ffffff;
}

.recipe-badge-source.api {
  background: rgba(15, 23, 42, 0.85);
  color: #ffffff;
}

.recipe-badge-cooked {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 7px;
  font-size: 10.5px;
  font-weight: 800;
  background: rgba(245, 158, 11, 0.95);
  color: #ffffff;
}

.recipe-badge-cookbook {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 7px;
  font-size: 10.5px;
  font-weight: 800;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #ffffff;
}

.recipe-card-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.recipe-card-title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.35;
  margin: 0 0 10px 0;
  min-height: 40px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.saved-card-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 12px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 3px 7px;
  border-radius: 6px;
}

.meta-tag.cookbook-tag {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  border: 1px solid rgba(15, 23, 42, 0.14);
}

.recipe-bottom-action {
  margin-top: auto;
  width: 100%;
  display: flex;
  gap: 8px;
}

.recipe-action-outline-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: #f8fafc;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.recipe-action-outline-btn:hover {
  background: #f1f5f9;
}

.recipe-action-bookmark-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  color: #64748b;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  padding: 0;
}

.recipe-action-bookmark-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.recipe-action-bookmark-btn.is-saved {
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  border-color: #0f172a;
}

.recipe-action-bookmark-btn:active {
  transform: scale(0.92);
}

.recipe-action-plan-btn {
  flex: 1.2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.recipe-action-plan-btn:hover {
  background: #1e293b;
}

.recipe-action-delete-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  color: #94a3b8;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  padding: 0;
}

.recipe-action-delete-btn:hover {
  background: #fef2f2;
  color: #ef4444;
  border-color: #fecaca;
}

.recipe-action-delete-btn:active {
  transform: scale(0.92);
}

/* TWOJE PRZEPISY (SAVED RECIPES VIEW) */
.saved-recipes-wrapper {
  padding: 12px 14px 40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.saved-recipes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  gap: 16px;
  flex-wrap: nowrap;
  min-height: 48px;
}

.saved-header-texts {
  display: flex;
  align-items: center;
  flex-shrink: 1;
  min-width: 0;
}

.saved-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  min-width: 0;
}

.saved-hero-icon {
  font-size: 16.5px;
  color: #0f172a;
  flex-shrink: 0;
}

.saved-heading {
  font-size: 13.5px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  white-space: nowrap;
  letter-spacing: -0.2px;
  flex-shrink: 0;
}

.saved-title-row .count-chip {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  padding: 1px 6px;
  border-radius: 9999px;
  line-height: 1.4;
  margin-right: 4px;
}

.saved-subheading {
  font-size: 11.5px;
  color: #64748b;
  margin: 2px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.saved-empty-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  width: 100%;
}

.saved-empty-actions .saved-empty-btn,
.saved-empty-actions button {
  width: 100%;
  max-width: 290px;
  height: 44px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  text-align: center;
  white-space: nowrap;
  transition: transform 0.15s ease, background 0.15s ease;
}

.saved-empty-actions .saved-empty-btn ion-icon,
.saved-empty-actions button ion-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.saved-empty-actions .saved-empty-btn:active,
.saved-empty-actions button:active {
  transform: scale(0.98);
}

/* TWOJE PRZEPISY: KONTROLKI, FILTROWANIE, SORTOWANIE I WIDOKI */
.saved-control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.saved-search-box {
  flex: 1 1 200px;
  min-width: 0;
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 10px;
  height: 40px;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.saved-search-box:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.06);
}

.saved-search-box .search-ico {
  font-size: 17px;
  color: #94a3b8;
  flex-shrink: 0;
}

.saved-search-box .search-input-el {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  font-family: inherit;
}

.saved-search-box .search-input-el::placeholder {
  color: #94a3b8;
}

.saved-search-box .search-clear-ico {
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 17px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.saved-search-box .search-clear-ico:hover {
  color: #0f172a;
}

.saved-filter-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.saved-sort-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  height: 40px;
  padding: 0 10px;
  gap: 6px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.saved-sort-dropdown:hover,
.saved-sort-dropdown:focus-within {
  border-color: #0f172a;
}

.saved-sort-dropdown .sort-icon {
  font-size: 16px;
  color: #64748b;
  pointer-events: none;
  flex-shrink: 0;
}

.saved-sort-dropdown .sort-native-select {
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
  cursor: pointer;
  padding-right: 4px;
  font-family: inherit;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.saved-view-toggle {
  display: inline-flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 3px;
  gap: 2px;
  border: 1px solid #e2e8f0;
  height: 40px;
  box-sizing: border-box;
}

.saved-view-toggle .view-btn {
  background: transparent;
  border: none;
  border-radius: 9px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 17px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.saved-view-toggle .view-btn:hover {
  color: #0f172a;
}

.saved-view-toggle .view-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.saved-source-scroll {
  margin: 0;
  padding-bottom: 2px;
}

.saved-categories-filter-row {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.saved-categories-filter-row::-webkit-scrollbar {
  display: none;
}

.category-pills-scroll {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: max-content;
}

.cat-filter-prefix {
  font-size: 11.5px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 2px;
  flex-shrink: 0;
}

.cat-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.cat-pill-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
}

.cat-pill-btn.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.cat-pill-btn .cat-count-sub {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #64748b;
  font-weight: 700;
}

.cat-pill-btn.active .cat-count-sub {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.saved-active-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12px;
  color: #475569;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.summary-count {
  font-size: 12px;
  color: #64748b;
  margin-right: 4px;
}

.summary-count strong {
  color: #0f172a;
  font-weight: 700;
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 600;
  color: #0f172a;
}

.summary-badge ion-icon {
  font-size: 13px;
  cursor: pointer;
  color: #94a3b8;
  transition: color 0.15s ease;
}

.summary-badge ion-icon:hover {
  color: #ef4444;
}

.summary-badge.sort-badge {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.summary-reset-btn {
  background: none;
  border: none;
  color: #e06d53;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  text-decoration: underline;
  flex-shrink: 0;
}

.summary-reset-btn:hover {
  color: #c2410c;
}

.saved-card-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 6px 0 10px;
}

.saved-card-meta-row .meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 2px 6px;
}

.saved-card-meta-row .meta-tag ion-icon {
  font-size: 12px;
}

.saved-card-meta-row .meta-tag.cookbook-tag {
  background: #eef2ff;
  color: #4338ca;
}

.saved-card-meta-row .meta-tag.cat-meta-tag {
  background: #fdf2f8;
  color: #be185d;
}

.saved-card-meta-row .meta-tag.ing-meta-tag {
  background: #f0fdf4;
  color: #15803d;
}

.saved-card-meta-row .meta-tag.date-tag {
  background: #f8fafc;
  color: #64748b;
}

/* WIDOK LISTY DWUKOLUMNOWY / POZIOMY (LIST VIEW) */
.saved-recipes-list-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.saved-list-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);
}

.saved-list-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.saved-list-media {
  width: 68px;
  height: 68px;
  border-radius: 12px;
  overflow: hidden;
  background: #f1f5f9;
  flex-shrink: 0;
  position: relative;
}

.saved-list-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.saved-list-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 24px;
}

.saved-list-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.saved-list-top-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.saved-list-source-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 5px;
  background: #f1f5f9;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.saved-list-source-pill.custom {
  background: #eff6ff;
  color: #1d4ed8;
}

.saved-list-source-pill.import {
  background: #fdf2f8;
  color: #be185d;
}

.saved-list-source-pill.api {
  background: #faf5ff;
  color: #7e22ce;
}

.saved-list-cat-pill {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 5px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.saved-list-cooked-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 5px;
  background: #fff7ed;
  color: #c2410c;
}

.saved-list-book-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 5px;
  background: #eef2ff;
  color: #4338ca;
}

.saved-list-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.saved-list-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.saved-list-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.saved-list-meta-item ion-icon {
  font-size: 12px;
  color: #94a3b8;
}

.saved-list-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.saved-list-plan-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 10px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.saved-list-plan-btn:hover {
  background: #1e293b;
  transform: translateY(-1px);
}

.saved-list-plan-btn:active {
  transform: scale(0.96);
}

.saved-list-delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.saved-list-delete-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
  color: #ef4444;
}

.saved-list-delete-btn:active {
  transform: scale(0.92);
}

@media (max-width: 480px) {
  .saved-list-media {
    width: 60px;
    height: 60px;
  }
  .saved-list-card {
    padding: 8px 10px;
    gap: 10px;
  }
  .saved-list-title {
    font-size: 13.5px;
  }
  .saved-list-plan-btn span {
    display: none;
  }
  .saved-list-plan-btn {
    padding: 7px 9px;
  }
}

/* PICK SAVED MODAL */
.pick-saved-modal-body {
  padding-bottom: 20px;
}

.pick-recipes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.pick-recipe-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.18s ease;
}

.pick-recipe-item:hover, .pick-recipe-item:active {
  border-color: #0f172a;
  background: #f8fafc;
}

.pick-item-thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  background-color: #f1f5f9;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 24px;
}

.pick-item-info {
  flex: 1;
  min-width: 0;
}

.pick-item-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pick-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pick-meta-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
}

.pick-meta-chip.source-chip.custom {
  background: #f1f5f9;
  color: #0f172a;
}

.pick-meta-chip.source-chip.api {
  background: #f1f5f9;
  color: #334155;
}

.pick-meta-chip.cook-chip {
  background: #fef3c7;
  color: #b45309;
}

.pick-item-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 9px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.pick-item-select-btn:active {
  transform: scale(0.96);
}

.recipes-loading-state,
.recipes-empty-state {
  text-align: center;
  padding: 40px 20px;
}

/* RESULTS META BAR & PAGINATION */
.recipes-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 8px;
  font-size: 12px;
  color: #64748b;
}

.meta-count-text strong {
  color: #0f172a;
}

.meta-page-badge {
  background: #f1f5f9;
  padding: 3px 9px;
  border-radius: 9999px;
  font-weight: 700;
  color: #0f172a;
  font-size: 11.5px;
  border: 1px solid #e2e8f0;
}

.meals-cards-container {
  display: flex;
  flex-direction: column;
}

.meals-pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 20px;
  margin-bottom: 24px;
  padding: 8px 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.pagination-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 11px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  flex-shrink: 0;
}

.pagination-nav-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #0f172a;
}

.pagination-nav-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.pagination-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: #e2e8f0;
}

.pagination-pages-group {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.pagination-pages-group::-webkit-scrollbar {
  display: none;
}

.page-number-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
}

.page-number-btn:hover:not(.active):not(.ellipsis) {
  background: #f1f5f9;
  color: #0f172a;
}

.page-number-btn:active:not(.active):not(.ellipsis) {
  transform: scale(0.92);
}

.page-number-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
}

.page-number-btn.ellipsis {
  cursor: default;
  color: #94a3b8;
}

/* ======================================================= */
/* RECIPE DETAILS MODAL (PREVIEW & STEPS)                  */
/* ======================================================= */
.recipe-modal-content {
  --background: #ffffff;
  --padding-top: 14px;
  --padding-bottom: 40px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.modal-recipe-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 24px;
}

/* Hero Image Card with Glass Tags */
.recipe-hero-card {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 18px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.1);
}

.recipe-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.05) 50%, rgba(15, 23, 42, 0.6) 100%);
}

.recipe-hero-badges-row {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
  z-index: 2;
}

.hero-glass-pill {
  padding: 5px 11px;
  border-radius: 9999px;
  font-size: 11.5px;
  font-weight: 700;
  color: #ffffff;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.hero-glass-pill.cuisine-pill {
  background: rgba(14, 165, 233, 0.85);
}

/* Title Section */
.recipe-title-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: -2px;
}

.recipe-display-title {
  font-size: 21px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  line-height: 1.25;
}

.recipe-original-name {
  font-size: 12px;
  color: #64748b;
  font-style: italic;
  margin: 0;
}

.recipe-quick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.quick-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #f1f5f9;
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
}

.quick-chip ion-icon {
  font-size: 13px;
  color: #0f172a;
}

/* Top Action Box */
.recipe-plan-cta-box {
  margin: 2px 0 4px;
}

.recipe-plan-btn {
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
}

/* Sections */
.recipe-detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.heading-icon-orb {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #0f172a;
}

.section-title-group h3 {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.count-tag {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 9999px;
}

.translating-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
}

.mini-spinner {
  width: 14px;
  height: 14px;
}

/* Modern Ingredients Grid */
.ingredients-modern-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
  gap: 8px;
}

.ingredient-pill-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 11px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.ing-bullet-orb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.ing-info-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ing-title {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
}

.ing-quantity {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-top: 1px;
}

.add-shopping-action-btn {
  width: 100%;
  padding: 11px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 4px;
  touch-action: manipulation;
}

/* Step-by-Step Instructions */
.recipe-steps-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recipe-step-card {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.step-badge-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #0f172a;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.step-card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.step-counter-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
}

.step-instruction-text {
  font-size: 13.5px;
  color: #1e293b;
  line-height: 1.55;
  margin: 0;
}

.single-instruction-box {
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.recipe-instructions-text {
  font-size: 13.5px;
  color: #1e293b;
  line-height: 1.6;
  white-space: pre-line;
  margin: 0;
}

/* Video Recipe Card */
.video-recipe-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  touch-action: manipulation;
}

.video-recipe-card:active {
  transform: scale(0.98);
  background: #f1f5f9;
}

.video-icon-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.video-meta {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.video-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.video-sub {
  font-size: 11.5px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-arrow {
  font-size: 18px;
  color: #94a3b8;
}

/* Bottom Plan Button */
.recipe-bottom-floating-bar {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  gap: 10px;
  align-items: center;
}

.recipe-modal-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 13px 16px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fee2e2;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  white-space: nowrap;
}

.recipe-modal-delete-btn:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.recipe-modal-delete-btn:active {
  transform: scale(0.96);
}

.recipe-modal-save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 13px 16px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  background: #f8fafc;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  white-space: nowrap;
}

.recipe-modal-save-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.recipe-modal-save-btn:active {
  transform: scale(0.96);
}

.recipe-plan-cta-row {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.recipe-plan-cta-row > button {
  flex: 1;
}

.recipe-save-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: #f8fafc;
  color: #0f172a;
  border: 1.5px solid #cbd5e1;
  transition: all 0.15s ease;
}

.recipe-save-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}

.bottom-plan-btn {
  flex: 1;
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
}

/* ======================================================= */
/* BOTTOM SHEET MODALS (CUSTOM MEAL, ASSIGN & DETAILS)     */
/* ======================================================= */
ion-modal.dn-meal-sheet-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.16);
}

ion-modal.dn-meal-sheet-modal::part(handle) {
  background: #94a3b8;
  width: 44px;
  height: 5px;
  border-radius: 9999px;
  margin-top: 8px;
  margin-bottom: 2px;
}

.modal-sheet-handle-spacer {
  height: 24px;
  width: 100%;
  pointer-events: none;
  background: #ffffff;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-custom-header {
  background: #ffffff;
  --background: #ffffff;
  border-bottom: 1px solid #f1f5f9;
}

.dn-meal-sheet-modal .modal-sheet-header,
.modal-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px 14px 18px;
  background: #ffffff;
  width: 100%;
  box-sizing: border-box;
}

.dn-meal-sheet-modal .modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
  margin-right: 12px;
}

.dn-meal-sheet-modal .modal-title-icon-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  font-size: 20px;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-title-text-group {
  display: flex;
  flex-direction: column;
  text-align: left;
  min-width: 0;
  flex: 1;
}

.dn-meal-sheet-modal .modal-main-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  padding: 0;
  margin: 0;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dn-meal-sheet-modal .modal-sub-title {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-top: 2px;
  margin-bottom: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-header-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-delete-icon-btn {
  background: #fef2f2;
  border: 1px solid #fee2e2;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-delete-icon-btn:hover {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.dn-meal-sheet-modal .modal-delete-icon-btn:active {
  transform: scale(0.92);
}

.dn-meal-sheet-modal .modal-save-icon-btn {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-save-icon-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.dn-meal-sheet-modal .modal-save-icon-btn:active {
  transform: scale(0.92);
}

.dn-meal-sheet-modal .modal-close-icon-btn {
  background: #f1f5f9;
  border: none;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-close-icon-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.dn-meal-sheet-modal .modal-close-icon-btn:active {
  transform: scale(0.92);
}

.custom-meal-modal-content {
  --background: #ffffff;
  --padding-top: 14px;
  --padding-bottom: 32px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.custom-meal-form,
.assign-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

/* Assign Preview Card */
.assign-meal-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 4px;
}

.assign-thumb {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  background-color: #f1f5f9;
  flex-shrink: 0;
}

.assign-meal-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.assign-meal-name {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assign-meal-meta {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

/* Form Groups & Labels */
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}

.label-between-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 4px;
}

.form-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}

.label-between-row .form-label {
  margin-bottom: 0;
}

.label-icon {
  font-size: 15px;
  color: #64748b;
}

.label-badge-optional {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 9999px;
}

.selected-day-badge {
  font-size: 11.5px;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  padding: 3px 10px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
}

/* Inputs & Textareas */
.input-container-box,
.textarea-container-box {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.input-container-box:focus-within,
.textarea-container-box:focus-within {
  background: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.modal-input {
  --background: transparent;
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
  --placeholder-opacity: 1;
  font-size: 14px;
  font-weight: 600;
  border: none;
}

.modal-textarea {
  --background: transparent;
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
  --placeholder-opacity: 1;
  font-size: 13.5px;
  line-height: 1.45;
  border: none;
  min-height: 75px;
}

.field-subtext-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.35;
}

.field-subtext-row ion-icon {
  font-size: 14px;
  flex-shrink: 0;
  color: #94a3b8;
}

/* Custom Meal Category Chips */
.custom-category-chips-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.custom-category-chips-scroll::-webkit-scrollbar {
  display: none;
}

.custom-category-pill {
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.custom-category-pill:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.custom-category-pill.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

/* Custom Day Selection & Mode Choice */
.custom-day-mode-row {
  margin-bottom: 8px;
}

.custom-mode-choice-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.custom-mode-choice-btn ion-icon {
  font-size: 16px;
}

.custom-mode-choice-btn:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #0f172a;
}

.custom-mode-choice-btn.active {
  background: rgba(15, 23, 42, 0.08);
  border-color: #0f172a;
  border-style: solid;
  color: #0f172a;
  font-weight: 700;
}

.days-select-grid.is-inactive {
  opacity: 0.85;
}

/* 7-Day Select Grid */
.days-select-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  width: 100%;
}

.day-select-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 2px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  touch-action: manipulation;
  min-width: 0;
  color: #475569;
}

.day-select-btn:active {
  transform: scale(0.95);
}

.day-select-btn.is-today:not(.active) {
  border-color: #0f172a;
  background: rgba(15, 23, 42, 0.04);
}

.day-select-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
}

.btn-day-name {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  line-height: 1.2;
}

.btn-day-date {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.85;
  margin-top: 2px;
  line-height: 1.2;
}

.btn-day-indicator {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
  position: absolute;
  top: 4px;
  right: 4px;
}

.day-select-btn.active .btn-day-indicator {
  background: #34d399;
}

/* Cook chips */
.cook-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cook-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.cook-chip-btn ion-icon {
  font-size: 15px;
}

.cook-chip-btn:hover {
  background: #f8fafc;
  color: #0f172a;
}

.cook-chip-btn:active {
  transform: scale(0.96);
}

.cook-chip-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.cook-chip-btn.active ion-icon {
  color: #ffffff;
}

/* Modal Submit Bar */
.modal-submit-bar {
  margin-top: 6px;
}

.submit-custom-meal-btn {
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.18);
}

.submit-custom-meal-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

/* ======================================================= */
/* IMPORT RECIPE & TWOJE PRZEPISY ACTIONS                  */
/* ======================================================= */
.saved-header-actions-group {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  margin-left: auto;
}

.saved-header-actions-group .header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 5px 9px;
  font-size: 11px;
  white-space: nowrap;
  border-radius: 9px;
  font-weight: 700;
  background: #0f172a;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  flex-shrink: 0;
  height: 30px;
}

.saved-header-actions-group .header-action-btn ion-icon {
  font-size: 13.5px;
}

.saved-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 5px 8px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  white-space: nowrap;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  flex-shrink: 0;
  height: 30px;
}

.saved-action-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.saved-action-btn:active,
.saved-header-actions-group .header-action-btn:active {
  transform: scale(0.96);
}

.saved-action-btn.import-btn {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

.saved-action-btn.import-btn ion-icon {
  font-size: 13px;
  color: #0f172a;
}

.saved-header-actions-group .btn-text-full {
  display: inline;
}

.saved-header-actions-group .btn-text-short {
  display: none;
}

@media (max-width: 560px) {
  .saved-header-actions-group .btn-text-full {
    display: none;
  }
  .saved-header-actions-group .btn-text-short {
    display: inline;
  }
}

@media (max-width: 375px) {
  .saved-recipes-header {
    padding: 7px 10px;
    gap: 10px;
  }
  .saved-heading {
    font-size: 13px;
  }
  .saved-hero-icon {
    font-size: 16px;
  }
  .saved-title-row {
    gap: 4px;
  }
  .saved-title-row .count-chip {
    font-size: 9.5px;
    padding: 1px 5px;
    margin-right: 2px;
  }
  .saved-header-actions-group {
    gap: 4px;
  }
  .saved-action-btn {
    padding: 4px 7px;
    font-size: 10.5px;
  }
  .saved-header-actions-group .header-action-btn {
    padding: 4px 8px;
    font-size: 10.5px;
  }
}

.recipe-badge-source.import {
  background: rgba(15, 23, 42, 0.9);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.import-shortcut-banner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.25);
  color: #0369a1;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  text-align: left;
}

.import-shortcut-banner:hover {
  background: rgba(14, 165, 233, 0.12);
  border-color: rgba(14, 165, 233, 0.4);
}

.import-shortcut-banner:active {
  transform: scale(0.98);
}

.import-shortcut-banner .shortcut-text-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #0c4a6e;
  min-width: 0;
}

.import-shortcut-banner .shortcut-text-wrap strong {
  font-weight: 700;
  text-decoration: underline;
}

.import-shortcut-banner .shortcut-icon {
  font-size: 16px;
  flex-shrink: 0;
  color: #0284c7;
}

.import-shortcut-banner .shortcut-arrow {
  font-size: 15px;
  color: #0284c7;
  flex-shrink: 0;
  margin-left: 6px;
}

/* ======================================================= */
/* MODAL 5: IMPORT RECIPE MODAL                           */
/* ======================================================= */
.dn-import-recipe-modal {
  --background: #ffffff;
}

.import-modal-content {
  --background: #ffffff;
  --padding-top: 14px;
  --padding-bottom: 50px;
  --padding-start: 16px;
  --padding-end: 16px;
}

.import-input-step,
.import-preview-step {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-supported-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.platform-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 9999px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-size: 11.5px;
  font-weight: 700;
  color: #475569;
}

.platform-chip ion-icon {
  font-size: 13px;
  color: #64748b;
}

.platform-chip.tiktok-chip {
  background: rgba(15, 23, 42, 0.06);
  border-color: #cbd5e1;
  color: #0f172a;
}

.platform-chip.tiktok-chip ion-icon {
  color: #0f172a;
}

.import-link-input-box {
  display: flex;
  align-items: center;
  position: relative;
}

.import-link-input-box .modal-input {
  flex: 1;
}

.paste-clipboard-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 11px;
  margin-right: 8px;
  border-radius: 8px;
  background: #0f172a;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  flex-shrink: 0;
}

.paste-clipboard-btn:hover {
  background: #1e293b;
}

.paste-clipboard-btn:active {
  transform: scale(0.95);
}

.import-error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 6px;
}

.import-error-banner ion-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.imported-hero-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 220px;
  border-radius: 16px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.imported-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.4) 0%, rgba(15, 23, 42, 0.1) 50%, rgba(15, 23, 42, 0.6) 100%);
}

.imported-source-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
}

.imported-source-badge ion-icon {
  font-size: 13px;
  color: #38bdf8;
}

.imported-ai-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.imported-ai-badge ion-icon {
  font-size: 13px;
  color: #fbbf24;
}

.imported-ai-top-bar {
  display: flex;
  margin-bottom: 8px;
}

.imported-ai-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  background: #fef3c7;
  color: #92400e;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #fde68a;
}

.imported-ai-pill ion-icon {
  font-size: 14px;
  color: #d97706;
}

.imported-ingredients-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
  padding: 8px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.imported-ing-pill {
  display: inline-block;
  padding: 4px 9px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  font-size: 11.5px;
  font-weight: 600;
  color: #334155;
  line-height: 1.3;
}

.imported-actions-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 14px;
  padding-bottom: 28px;
}

.change-link-btn {
  flex: 0 0 auto;
  padding: 13px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 14px;
}

.imported-actions-row .submit-custom-meal-btn {
  flex: 1;
}
</style>
