<template>
  <ion-page>
    <ion-header :translucent="true">
      <DuoOrganizationNav />
      <ion-toolbar>
        <div class="dn-page-header header-action-row">
          <div class="dn-header-title">Obiady</div>
          <button
            v-if="activeSubView === 'my-recipes'"
            type="button"
            class="dn-header-btn"
            aria-label="Dodaj przepis"
            @click="openAddCookbookRecipeModal()"
          >
            <ion-icon :icon="ioniconsAddOutline" aria-hidden="true" />
            <span>Przepis</span>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <div class="dn-subtabs" role="group" aria-label="Widok obiadów" data-no-swipe>
        <button
          type="button"
          class="dn-subtab"
          :class="{ active: activeSubView === 'calendar' }"
          :aria-pressed="activeSubView === 'calendar'"
          @click="activeSubView = 'calendar'"
        >
          <span>Plan tygodnia</span>
        </button>

        <button
          type="button"
          class="dn-subtab"
          :class="{ active: activeSubView === 'my-recipes' }"
          :aria-pressed="activeSubView === 'my-recipes'"
          @click="activeSubView = 'my-recipes'"
        >
          <span>Przepisy</span>
        </button>

        <button
          type="button"
          class="dn-subtab"
          :class="{ active: activeSubView === 'explore' }"
          :aria-pressed="activeSubView === 'explore'"
          @click="activeSubView = 'explore'"
        >
          <span>Inspiracje</span>
        </button>
      </div>

      <!-- ============================================== -->
      <!-- WIDOK 1: KALENDARZ TYGODNIA                    -->
      <!-- ============================================== -->
      <div v-if="activeSubView === 'calendar'" class="meals-calendar-wrapper">
        <!-- Week navigation -->
        <div class="ml-weeknav">
          <button type="button" class="ml-weeknav-btn" @click="changeWeek(-1)" aria-label="Poprzedni tydzień">
            <ion-icon :icon="ioniconsChevronBackOutline" />
          </button>
          <div class="ml-weeknav-center">
            <span class="ml-weeknav-title">{{ weekRangeLabel }}</span>
            <span class="ml-weeknav-count">{{ weekMealsCount }} z 7 dni zaplanowanych</span>
            <button v-if="weekOffset !== 0" type="button" class="ml-weeknav-today" @click="weekOffset = 0">Wróć do dzisiaj</button>
          </div>
          <button type="button" class="ml-weeknav-btn" @click="changeWeek(1)" aria-label="Następny tydzień">
            <ion-icon :icon="ioniconsChevronForwardOutline" />
          </button>
        </div>

        <!-- 7 days -->
        <div class="ml-days">
          <div
            v-for="day in weekDays"
            :key="day.dateStr"
            class="ml-day"
            :class="{ 'is-today': day.isToday, 'has-meal': !!day.meal, 'is-done': day.meal?.is_completed }"
          >
            <div class="ml-date">
              <span class="ml-date-dow">{{ day.dayName.slice(0, 3) }}</span>
              <span class="ml-date-num">{{ day.displayDate.split(' ')[0] }}</span>
            </div>

            <template v-if="day.meal">
              <button type="button" class="ml-meal" @click="openMealDetailsModal(day.meal)">
                <span
                  class="ml-thumb"
                  :style="day.meal.image_url ? { backgroundImage: `url(${day.meal.image_url})` } : {}"
                >
                  <ion-icon v-if="!day.meal.image_url" :icon="ioniconsRestaurantOutline" />
                </span>
                <span class="ml-meal-text">
                  <span class="ml-meal-title">{{ formatMealTitlePl(day.meal.titlePl || day.meal.title) }}</span>
                  <span class="ml-meal-meta">
                    {{ getCookLabel(day.meal.cook_id) }}<template v-if="day.meal.ingredients?.length"> · {{ day.meal.ingredients.length }} składn.</template>
                  </span>
                </span>
              </button>
              <button
                type="button"
                class="ml-check"
                :class="{ done: day.meal.is_completed }"
                :aria-label="day.meal.is_completed ? 'Oznacz jako niezjedzone' : 'Oznacz jako zjedzone'"
                @click="handleToggleCompleted(day.meal)"
              >
                <ion-icon :icon="ioniconsCheckmarkOutline" />
              </button>
              <button type="button" class="ml-more" aria-label="Więcej" @click="openMealActions(day.meal)">
                <ion-icon :icon="ioniconsEllipsisHorizontal" />
              </button>
            </template>

            <template v-else>
              <span class="ml-empty">{{ day.isToday ? 'Co dziś jemy?' : 'Brak planu' }}</span>
              <button type="button" class="ml-plan-btn" @click="openPlanDayActions(day.dateStr)">
                <ion-icon :icon="ioniconsAddOutline" />
                <span>Zaplanuj</span>
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- WIDOK 2: TWOJE PRZEPISY (KSIĄŻKA KUCHARSKA)    -->
      <!-- ============================================== -->
      <div v-else-if="activeSubView === 'my-recipes'" class="saved-recipes-wrapper">
        <div class="saved-recipe-actions">
          <button
            type="button"
            class="dn-header-btn dn-header-btn--soft"
            aria-label="Importuj przepis z linku"
            @click="openImportRecipeModal()"
          >
            <ion-icon :icon="ioniconsLinkOutline" aria-hidden="true" />
            <span>Importuj</span>
          </button>
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
          <TransitionGroup
            name="dn-list"
            tag="div"
            v-if="savedViewMode === 'grid'"
            class="meals-cards-grid"
          >
            <div
              v-for="recipe in filteredSavedRecipes"
              :key="recipe.key"
              class="recipe-card dn-card"
              :class="{ 'dn-item-deleting': deletingRecipeKeys.has(recipe.key) }"
              @click="openSavedRecipeDetails(recipe)"
            >
              <div class="recipe-card-media">
                <img
                  v-if="recipe.image_url && !failedSavedRecipeImages.has(recipe.key)"
                  :src="recipe.image_url"
                  :alt="recipe.title"
                  loading="lazy"
                  class="recipe-img"
                  @error="markSavedRecipeImageFailed(recipe.key)"
                />
                <div v-else class="recipe-img-placeholder">
                  <ion-icon :icon="ioniconsRestaurantOutline" />
                  <span class="placeholder-label">{{ recipe.category || 'Domowy obiad' }}</span>
                </div>

                <div class="recipe-badges-overlay">
                  <span class="recipe-badge-source" :class="recipe.source">
                    <ion-icon :icon="recipe.source === 'import' ? ioniconsLinkOutline : (recipe.source === 'custom' ? ioniconsPersonOutline : ioniconsSparklesOutline)" />
                    <span>{{ recipe.source === 'import' ? (recipe.recipe_url?.includes('tiktok.com') ? 'TikTok' : (recipe.recipe_url?.includes('/shorts/') || recipe.sourceName?.includes('Shorts') ? 'YT Shorts' : (recipe.recipe_url?.includes('youtu') ? 'YouTube' : 'Z linku'))) : (recipe.source === 'custom' ? 'Własny przepis' : 'Z inspiracji') }}</span>
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
          </TransitionGroup>

          <!-- WIDOK B: KOMPAKTOWA LISTA (LIST VIEW) -->
          <TransitionGroup
            name="dn-list"
            tag="div"
            v-else
            class="saved-recipes-list-view"
          >
            <div
              v-for="recipe in filteredSavedRecipes"
              :key="recipe.key"
              class="saved-list-card dn-card"
              :class="{ 'dn-item-deleting': deletingRecipeKeys.has(recipe.key) }"
              @click="openSavedRecipeDetails(recipe)"
            >
              <div class="saved-list-media">
                <img
                  v-if="recipe.image_url && !failedSavedRecipeImages.has(recipe.key)"
                  :src="recipe.image_url"
                  :alt="recipe.title"
                  loading="lazy"
                  class="saved-list-img"
                  @error="markSavedRecipeImageFailed(recipe.key)"
                />
                <div v-else class="saved-list-img-placeholder">
                  <ion-icon :icon="ioniconsRestaurantOutline" />
                </div>
              </div>

              <div class="saved-list-info">
                <div class="saved-list-top-row">
                  <span class="saved-list-source-pill" :class="recipe.source">
                    {{ recipe.source === 'import' ? (recipe.recipe_url?.includes('tiktok.com') ? 'TikTok' : (recipe.recipe_url?.includes('/shorts/') || recipe.sourceName?.includes('Shorts') ? 'Shorts' : (recipe.recipe_url?.includes('youtu') ? 'YouTube' : 'Link'))) : (recipe.source === 'custom' ? 'Własny' : 'Inspiracja') }}
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
          </TransitionGroup>
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
      <DuoActionSheet
        :is-open="mealSheet.open"
        :title="mealSheet.title"
        :subtitle="mealSheet.subtitle"
        :buttons="mealSheet.buttons"
        @dismiss="mealSheet.open = false"
      />

      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>

    <!-- ============================================== -->
    <!-- MODAL 1: SZCZEGÓŁY OBIADU / PRZEPIS           -->
    <!-- ============================================== -->
    <ion-modal
      :is-open="showDetailsModal"
      @didDismiss="detailsTransition.didDismiss"
      class="dn-meal-sheet-modal dn-recipe-details-modal"
      :breakpoints="[0, 0.92, 1]"
      :initial-breakpoint="0.92"
      :expand-to-scroll="false"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="dn-form-sheet-header ion-no-border rp-header">
        <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
        <div class="rp-header-row">
          <span class="rp-header-label">Przepis</span>
          <div class="rp-header-actions">
            <button
              v-if="activeSelectedMeal && isRecipeInSaved(activeSelectedMeal)"
              type="button"
              class="rp-icon-btn is-saved"
              @click="confirmDeleteSavedRecipe(activeSelectedMeal)"
              aria-label="Usuń z Twoich przepisów"
            >
              <ion-icon :icon="ioniconsBookmark" />
            </button>
            <button
              v-else-if="activeSelectedMeal"
              type="button"
              class="rp-icon-btn"
              @click="handleToggleSaveRecipe(activeSelectedMeal)"
              aria-label="Zapisz w Twoich przepisach"
            >
              <ion-icon :icon="ioniconsBookmarkOutline" />
            </button>
            <button type="button" class="rp-icon-btn" @click="showDetailsModal = false" aria-label="Zamknij">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>
        </div>
      </ion-header>

      <ion-content class="rp-content" :scroll-y="true" v-if="activeSelectedMeal">
        <div class="rp-body">
          <!-- Photo -->
          <div class="rp-hero" :class="{ 'is-empty': !getRecipePreviewImage(activeSelectedMeal) }">
            <img
              v-if="getRecipePreviewImage(activeSelectedMeal)"
              :src="getRecipePreviewImage(activeSelectedMeal)"
              :alt="activeSelectedMeal.title"
              @error="markRecipePreviewImageFailed(activeSelectedMeal)"
            />
            <span v-else class="rp-hero-icon">
              <ion-icon :icon="ioniconsRestaurantOutline" />
            </span>
          </div>

          <!-- Title -->
          <h2 class="rp-title">{{ formatMealTitlePl(activeSelectedMeal.titlePl || activeSelectedMeal.title) }}</h2>
          <p
            v-if="(activeSelectedMeal.originalTitle || activeSelectedMeal.title) && formatMealTitlePl(activeSelectedMeal.titlePl || activeSelectedMeal.title) !== (activeSelectedMeal.originalTitle || activeSelectedMeal.title)"
            class="rp-original"
          >
            {{ activeSelectedMeal.originalTitle || activeSelectedMeal.title }}
          </p>

          <div class="rp-chips">
            <span v-if="activeSelectedMeal.categoryPl || activeSelectedMeal.category" class="rp-chip is-cream">
              {{ activeSelectedMeal.categoryPl || activeSelectedMeal.category }}
            </span>
            <span v-if="activeSelectedMeal.areaPl || activeSelectedMeal.area" class="rp-chip">
              Kuchnia {{ (activeSelectedMeal.areaPl || activeSelectedMeal.area).toLowerCase() }}
            </span>
            <span v-if="activeSelectedMeal.ingredients?.length" class="rp-chip">
              {{ activeSelectedMeal.ingredients.length }} składników
            </span>
            <span v-if="activeSelectedMeal.instructionsSteps?.length > 1" class="rp-chip">
              {{ activeSelectedMeal.instructionsSteps.length }} kroków
            </span>
          </div>

          <!-- Ingredients -->
          <section v-if="activeSelectedMeal.ingredients?.length" class="rp-section">
            <div class="rp-section-head">
              <h3 class="rp-section-title">Składniki</h3>
              <button type="button" class="rp-link-btn" @click="handleAddIngredientsFromDetails">
                <ion-icon :icon="ioniconsCartOutline" />
                <span>Do zakupów</span>
              </button>
            </div>
            <ul class="rp-ingredients">
              <li v-for="(ing, idx) in activeSelectedMeal.ingredients" :key="idx" class="rp-ing">
                <span class="rp-ing-name">{{ translateIngredientName(ing.name) }}</span>
                <span v-if="ing.measure || ing.amount" class="rp-ing-qty">
                  {{ ing.measure ? formatMeasurePl(ing.measure) : [ing.amount, ing.unit].filter(Boolean).join(' ') }}
                </span>
              </li>
            </ul>
          </section>

          <!-- Steps -->
          <section v-if="activeSelectedMeal.instructions" class="rp-section">
            <div class="rp-section-head">
              <h3 class="rp-section-title">Przygotowanie</h3>
              <span v-if="isTranslatingRecipe" class="rp-translating">
                <ion-spinner name="dots" />
                Tłumaczenie…
              </span>
            </div>
            <ol
              v-if="activeSelectedMeal.instructionsSteps && activeSelectedMeal.instructionsSteps.length > 1"
              class="rp-steps"
            >
              <li v-for="(step, sIdx) in activeSelectedMeal.instructionsSteps" :key="sIdx" class="rp-step">
                <span class="rp-step-num">{{ sIdx + 1 }}</span>
                <p class="rp-step-text">{{ cleanStepDisplay(step) }}</p>
              </li>
            </ol>
            <p v-else class="rp-paragraph">{{ activeSelectedMeal.instructions }}</p>
          </section>

          <!-- Source -->
          <a
            v-if="activeSelectedMeal.youtube_url || activeSelectedMeal.youtubeUrl || activeSelectedMeal.recipe_url"
            :href="activeSelectedMeal.youtube_url || activeSelectedMeal.youtubeUrl || activeSelectedMeal.recipe_url"
            target="_blank"
            rel="noopener noreferrer"
            class="rp-source"
          >
            <span class="rp-source-icon">
              <ion-icon :icon="(activeSelectedMeal.youtube_url || activeSelectedMeal.recipe_url?.includes('tiktok.com') || activeSelectedMeal.recipe_url?.includes('youtu')) ? ioniconsPlayCircleOutline : ioniconsOpenOutline" />
            </span>
            <span class="rp-source-text">
              <span class="rp-source-title">{{ activeSelectedMeal.recipe_url?.includes('/shorts/') ? 'Wideo na YouTube Shorts' : (activeSelectedMeal.recipe_url?.includes('tiktok.com') ? 'Wideo na TikToku' : (activeSelectedMeal.recipe_url?.includes('youtu') ? 'Wideo na YouTube' : (activeSelectedMeal.youtube_url ? 'Wideo z przygotowania' : 'Oryginalny przepis'))) }}</span>
              <span class="rp-source-sub">Otwórz źródło</span>
            </span>
            <ion-icon :icon="ioniconsChevronForwardOutline" class="rp-source-arrow" />
          </a>
        </div>

        <!-- Sticky footer -->
        <div class="rp-footer">
          <button type="button" class="dn-button-primary rp-plan-btn" @click="openAssignFromDetails(activeSelectedMeal)">
            <ion-icon :icon="ioniconsCalendarOutline" />
            <span>Zaplanuj obiad</span>
          </button>
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
      :breakpoints="[0, 0.92, 1]"
      :initial-breakpoint="0.92"
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
                <span>{{ partnerDisplayName }}</span>
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
      @didDismiss="customMealTransition.didDismiss"
      class="dn-meal-sheet-modal dn-custom-meal-modal"
      :breakpoints="[0, 0.92, 1]"
      :initial-breakpoint="0.92"
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
          @click="customMealTransition.closeThen(openImportRecipeModal)"
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
              <ion-input aria-label="Nazwa obiadu lub przepisu"
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
              <ion-input aria-label="Link do zdjęcia potrawy"
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
                <span>{{ partnerDisplayName }}</span>
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
              <ion-textarea aria-label="Składniki"
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
              <ion-textarea aria-label="Notatka lub przepis"
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
              :disabled="isSubmittingCustomMeal"
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
      @didDismiss="savedMealTransition.didDismiss"
      class="dn-meal-sheet-modal dn-pick-saved-modal"
      :breakpoints="[0, 0.92, 1]"
      :initial-breakpoint="0.92"
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
                <span>{{ partnerDisplayName }}</span>
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
                @click="savedMealTransition.closeThen(() => openExploreForDate(targetPickDate))"
              >
                <ion-icon :icon="ioniconsSparklesOutline" />
                <span>Odkryj inspiracje</span>
              </button>
              <button
                type="button"
                class="slot-btn slot-secondary-btn saved-empty-btn"
                @click="savedMealTransition.closeThen(() => openAddCustomModal(targetPickDate))"
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
      :breakpoints="[0, 0.92, 1]"
      :initial-breakpoint="0.92"
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
            <span class="platform-chip youtube-chip">
              <ion-icon :icon="ioniconsLogoYoutube" />
              <span>YT Shorts</span>
            </span>
            <span class="platform-chip">
              <ion-icon :icon="ioniconsRestaurantOutline" />
              <span>Ania Gotuje</span>
            </span>
            <span class="platform-chip">
              <ion-icon :icon="ioniconsRestaurantOutline" />
              <span>Kwestia Smaku</span>
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
              <span>Link do przepisu, TikToka lub YouTube Shorts</span>
            </label>
            <div class="input-container-box import-link-input-box">
              <ion-input aria-label="Link do przepisu"
                v-model="importUrlInput"
                type="url"
                placeholder="https://www.tiktok.com/... lub https://youtube.com/shorts/... lub strona z przepisem"
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
              <ion-icon :icon="(importedRecipePreview.sourceName?.includes('TikTok') || importedRecipePreview.sourceName?.includes('YouTube')) ? ioniconsPlayCircleOutline : ioniconsGlobeOutline" />
              <span>{{ importedRecipePreview.sourceName || 'Zaimportowano z sieci' }}</span>
            </div>
          </div>

          <!-- Title Edit Field -->
          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label">
              <ion-icon :icon="ioniconsFastFoodOutline" class="label-icon" />
              <span>Nazwa dania</span>
            </label>
            <div class="input-container-box">
              <ion-input aria-label="Nazwa dania"
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
              <ion-textarea aria-label="Przygotowanie"
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
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'
import { ref, computed, onMounted, reactive } from 'vue'
import {
  bicycleOutline as ioniconsBicycleOutline,
  bookOutline as ioniconsBookOutline,
  cartOutline as ioniconsCartOutline,
  createOutline as ioniconsCreateOutline,
  heartOutline as ioniconsHeartOutline,
  peopleOutline as ioniconsPeopleOutline,
  personOutline as ioniconsPersonOutline,
  sparklesOutline as ioniconsSparklesOutline,
  storefrontOutline as ioniconsStorefrontOutline,
  trashOutline as ioniconsTrashOutline
} from 'ionicons/icons'
import DuoActionSheet, { type DuoActionSheetButton } from '~/components/DuoActionSheet.vue'
import { useDuoState } from '~/composables/useDuoState'
import type { MealItem, MealIngredient } from '~/types/duo'
import { useConfirm } from '~/composables/useConfirm'

const {
  mealsList,
  currentUser,
  partnerUser,
  partnerDisplayName,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor,
  hexToRgba,
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

const deletingMealIds = ref<Set<string>>(new Set())
const deletingRecipeKeys = ref<Set<string>>(new Set())
const failedSavedRecipeImages = ref<Set<string>>(new Set())
const failedRecipePreviewImages = ref<Set<string>>(new Set())

const markSavedRecipeImageFailed = (recipeKey: string) => {
  failedSavedRecipeImages.value = new Set(failedSavedRecipeImages.value).add(recipeKey)
}

type RecipePreviewImageSource = Pick<MealItem, 'id' | 'title' | 'image_url'> & {
  api_id?: string
  thumbnail?: string
  categoryPl?: string
}

const getRecipePreviewKey = (meal: RecipePreviewImageSource) => meal.id || meal.api_id || meal.title

const getRecipePreviewImage = (meal: RecipePreviewImageSource) => {
  const key = getRecipePreviewKey(meal)
  if (failedRecipePreviewImages.value.has(key)) return ''
  return meal.image_url || meal.thumbnail || ''
}

const markRecipePreviewImageFailed = (meal: RecipePreviewImageSource) => {
  failedRecipePreviewImages.value = new Set(failedRecipePreviewImages.value).add(getRecipePreviewKey(meal))
}

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

const savedRecipes = computed<SavedRecipe[]>(() => {
  const map = new Map<string, SavedRecipe>()

  for (const m of mealsList.value) {
    if (!m.title || m.is_saved_recipe === false) continue
    const key = m.api_id ? `api_${m.api_id}` : `custom_${m.title.trim().toLowerCase()}`
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

// Week navigation offset (0 = current week, -1 = last week, +1 = next week)
const weekOffset = ref(0)

const changeWeek = (delta: number) => {
  weekOffset.value += delta
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

// ---- Bottom action sheets for the week plan (keeps day rows clean) ----
const mealSheet = reactive<{ open: boolean; title: string; subtitle: string; buttons: DuoActionSheetButton[] }>({
  open: false,
  title: '',
  subtitle: '',
  buttons: []
})

const openPlanDayActions = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00')
  mealSheet.title = 'Zaplanuj obiad'
  mealSheet.subtitle = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  mealSheet.buttons = [
    {
      text: 'Z Twoich przepisów',
      description: savedRecipes.value.length ? `${savedRecipes.value.length} zapisanych` : 'Wybierz z książki kucharskiej',
      icon: ioniconsBookOutline,
      handler: () => { openPickSavedModal(dateStr) }
    },
    {
      text: 'Z inspiracji',
      description: 'Przeglądaj propozycje dań',
      icon: ioniconsSparklesOutline,
      handler: () => { openExploreForDate(dateStr) }
    },
    {
      text: 'Własne danie',
      description: 'Wpisz nazwę i składniki',
      icon: ioniconsCreateOutline,
      handler: () => { openAddCustomModal(dateStr) }
    }
  ]
  mealSheet.open = true
}

const openMealActions = (meal: any) => {
  mealSheet.title = formatMealTitlePl(meal.titlePl || meal.title)
  mealSheet.subtitle = getCookLabel(meal.cook_id)
  const buttons: DuoActionSheetButton[] = [
    {
      text: 'Przepis i szczegóły',
      icon: ioniconsBookOutline,
      handler: () => { openMealDetailsModal(meal) }
    }
  ]
  if (meal.ingredients?.length) {
    buttons.push({
      text: 'Dodaj składniki do zakupów',
      description: `${meal.ingredients.length} pozycji`,
      icon: ioniconsCartOutline,
      handler: () => { handleAddMealIngredientsToShopping(meal) }
    })
  }
  buttons.push({
    text: 'Usuń z planu',
    role: 'destructive',
    icon: ioniconsTrashOutline,
    handler: () => { handleDeleteMeal(meal.id, meal.title) }
  })
  mealSheet.buttons = buttons
  mealSheet.open = true
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
  if (cookId === 'partner') return partnerDisplayName.value
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
    if (deletingMealIds.value.has(id)) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 30, 10])
    }
    deletingMealIds.value.add(id)
    setTimeout(async () => {
      try {
        await deleteMeal(id)
      } finally {
        deletingMealIds.value.delete(id)
      }
    }, 240)
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
  // 1. Primary path: API (Firebase Cloud Function / Nuxt dev server)
  try {
    const res = await $fetch<T>(endpoint)
    if (res && typeof res === 'object') return res
  } catch (_) {}

  // 2. Fallback: direct TheMealDB API
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
const detailsTransition = useSheetTransition(showDetailsModal)
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
  detailsTransition.closeThen(() => { void openAssignModal(meal) })
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

    const saved = await addMeal({
      date: assignDate.value,
      day_name: targetDay?.dayName || '',
      title: formatMealTitlePl(m.titlePl || m.title),
      category: m.categoryPl || m.category || '',
      area: m.areaPl || m.area || '',
      cook_id: assignCook.value,
      image_url: m.thumbnail || m.image_url || '',
      source: m.source || (m.api_id ? 'api' : 'custom'),
      api_id: recipeApiId(m),
      ingredients: m.ingredients || [],
      instructions: m.instructions || '',
      youtube_url: m.youtubeUrl || m.youtube_url || '',
      recipe_url: m.sourceUrl || m.recipe_url || ''
    })

    if (!saved) return
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
const savedMealTransition = useSheetTransition(showPickSavedModal)
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

    const saved = await addMeal({
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

    if (!saved) return
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

const recipeApiId = (meal: any): string | undefined => {
  const id = meal.api_id || (meal.source === 'api' || /^\d+$/.test(String(meal.id || '')) ? meal.id : undefined)
  return id ? String(id) : undefined
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
    const apiId = recipeApiId(recipe)
    const key = recipe.key || (apiId ? `api_${apiId}` : `custom_${(recipe.title || '').trim().toLowerCase()}`)
    if (deletingRecipeKeys.value.has(key)) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 30, 10])
    }
    deletingRecipeKeys.value.add(key)
    setTimeout(async () => {
      try {
        if (!(await deleteSavedRecipe({ ...recipe, api_id: recipeApiId(recipe) }))) return
        if (activeSelectedMeal.value) {
          const activeKey = activeSelectedMeal.value.key || (activeSelectedMeal.value.api_id ? `api_${activeSelectedMeal.value.api_id}` : `custom_${(activeSelectedMeal.value.title || '').trim().toLowerCase()}`)
          if (activeKey === key || (recipe.api_id && String(activeSelectedMeal.value.api_id) === String(recipe.api_id))) {
            showDetailsModal.value = false
          }
        }
      } finally {
        deletingRecipeKeys.value.delete(key)
      }
    }, 240)
  }
}

const handleToggleSaveRecipe = async (meal: any) => {
  if (!meal) return
  if (isRecipeInSaved(meal)) {
    await confirmDeleteSavedRecipe(meal)
    return
  }

  let fullMeal = meal
  const mealId = recipeApiId(meal)
  if (mealId) {
    if (!meal.ingredients || meal.ingredients.length === 0) {
      try {
        const res = await fetchMealApi<{ success: boolean; meal: any }>(`/api/meals/lookup?id=${mealId}`)
        if (res?.meal) fullMeal = res.meal
      } catch (_) {}
    }
  }


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

const cleanStepDisplay = (step: string): string => {
  if (!step) return ''
  return step.replace(/^(?:krok\s*\d+[\s.:-]*|\d+[\s.:)-]+)\s*/i, '').trim()
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
const customMealTransition = useSheetTransition(showAddCustomModal)
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
  if (!cleanTitle) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40)
    triggerToast('Wpisz nazwę obiadu lub dania przed zapisaniem', { type: 'warning' })
    return
  }

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


    const saved = await addMeal({
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

    if (!saved) return
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
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40)
    triggerToast('Wklej link do przepisu lub TikToka', { type: 'warning' })
    importErrorMessage.value = 'Wklej link do przepisu lub TikToka.'
    return
  }

  isFetchingImport.value = true
  importErrorMessage.value = ''
  try {
    const res = await getFirebaseBridge().callApi<{ success: boolean; recipe?: any; error?: string }>(
      '/api/meals/import', { url: cleanUrl }
    )

    if (res && res.success && res.recipe) {
      importedRecipePreview.value = {
        title: res.recipe.title || '',
        category: res.recipe.category || 'Obiad domowy',
        area: res.recipe.area || '',
        imageUrl: res.recipe.imageUrl || '',
        ingredients: res.recipe.ingredients || [],
        instructions: res.recipe.instructions || '',
        instructionsSteps: res.recipe.instructionsSteps || [],
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


    const saved = await addMeal({
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

    if (!saved) return
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
/* WIDOK 1: KALENDARZ TYGODNIA */
.meals-calendar-wrapper {
  padding: 8px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 2px;
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
  background: #f2f3f5;
  color: #1c1b19;
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
  font-weight: 700;
  color: #1c1b19;
}

.today-return-btn {
  background: none;
  border: none;
  color: #1c1b19;
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
  border: 1px solid #e5e6e8;
}

.day-meal-card.is-today {
  border-color: #1c1b19;
  box-shadow: none;
}

.day-meal-card.is-completed {
  opacity: 0.85;
  background: #f8f9fb;
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
  font-weight: 700;
  color: #1c1b19;
}

.day-date {
  font-size: 12px;
  color: #737373;
  font-weight: 600;
}

.today-pill {
  font-size: 9px;
  font-weight: 700;
  background: #1c1b19;
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
  background-color: #f2f3f5;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.meal-thumb-fallback {
  color: #a2a2a2;
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
  color: #1c1b19;
  margin: 0 0 4px;
  cursor: pointer;
  line-height: 1.3;
  overflow-wrap: break-word;
  word-break: break-word;
}

.meal-title.strike {
  text-decoration: line-through;
  color: #a2a2a2;
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
  background: #f2f3f5;
  color: #404040;
}

.area-pill {
  background: #f7f8fa;
  color: #838383;
}

.ingredients-pill {
  background: #f3f4f6;
  color: #6d6d6d;
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
  border: 1px solid #e5e6e8;
  background: #ffffff;
  color: #545454;
  cursor: pointer;
  transition: all 0.15s ease;
}

.done-toggle-btn.done {
  background: #f2f3f5;
  color: #585858;
  border-color: #e7e8ea;
}

.shopping-add-btn {
  background: #f8f9fb;
  color: #8e8e8e;
  border-color: #e7e8ea;
}

.delete-btn {
  color: #d96856;
  border-color: #e6e7e9;
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
  color: #a2a2a2;
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
  background: #1c1b19;
  color: #ffffff;
}

.slot-primary-btn {
  background: #1c1b19;
  color: #ffffff;
}

.slot-secondary-btn {
  background: #f2f3f5;
  color: #404040;
  border: 1px solid #e5e6e8;
}

.slot-count-badge {
  background: rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
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
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fb 100%);
  border: 1px solid #e5e6e8;
  box-shadow: none;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.surprise-hero-bar:hover {
  border-color: #d4d4d4;
  box-shadow: none;
}

.surprise-hero-bar:active {
  transform: scale(0.99);
}

.surprise-hero-bar.is-rolling {
  border-color: #d4d4d4;
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
  background: #1c1b19;
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
  font-weight: 700;
  text-transform: uppercase;
  color: #1c1b19;
  letter-spacing: 0.5px;
}

.surprise-heading {
  font-size: 13px;
  font-weight: 700;
  color: #1c1b19;
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
  background: #1c1b19;
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
  background: #1c1b19;
  transform: translateY(-1px);
  box-shadow: none;
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
  background: #1c1b19;
  opacity: 0.88;
  cursor: wait;
  box-shadow: none;
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
  border: 1px solid var(--dn-line);
  border-radius: 12px;
  padding: 8px 12px;
  gap: 8px;
  transition: all 0.2s ease;
}

.explore-search-field:focus-within {
  border-color: var(--dn-ink);
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
}

.search-ico {
  font-size: 17px;
  color: #a2a2a2;
  flex-shrink: 0;
}

.search-input-el {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #1c1b19;
  outline: none;
  min-width: 0;
}

.search-input-el::placeholder {
  color: #a2a2a2;
  font-size: 12.5px;
}

.search-clear-ico {
  border: none;
  background: transparent;
  color: #a2a2a2;
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
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  border-radius: 999px;
  border: none;
  background: var(--dn-soft);
  color: #545454;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.curated-filter-pill.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
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
  border: 1px solid #e5e6e8;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: none;
}

.recipe-card:hover {
  border-color: #d4d4d4;
  box-shadow: none;
}

.recipe-card:active {
  transform: scale(0.985);
}

.recipe-card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f2f3f5;
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
  background: linear-gradient(135deg, #f8f9fb 0%, #e5e6e8 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #737373;
  gap: 6px;
}

.recipe-img-placeholder ion-icon {
  font-size: 36px;
  color: #a2a2a2;
}

.placeholder-label {
  font-size: 12px;
  font-weight: 700;
  color: #737373;
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
  background: rgba(28, 27, 25, 0.82);
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
  color: #1c1b19;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 7px;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-shadow: none;
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
  background: rgba(125, 125, 125, 0.9);
  color: #ffffff;
}

.recipe-badge-source.api {
  background: rgba(28, 27, 25, 0.85);
  color: #ffffff;
}

.recipe-badge-cooked {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 7px;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(177, 177, 177, 0.95);
  color: #ffffff;
}

.recipe-badge-cookbook {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 7px;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(28, 27, 25, 0.85);
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
  font-weight: 700;
  color: #1c1b19;
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
  color: #737373;
  background: #f2f3f5;
  padding: 3px 7px;
  border-radius: 6px;
}

.meta-tag.cookbook-tag {
  background: rgba(28, 27, 25, 0.08);
  color: #1c1b19;
  border: 1px solid rgba(28, 27, 25, 0.14);
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
  background: #f8f9fb;
  color: #404040;
  border: 1px solid #d4d4d4;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.recipe-action-outline-btn:hover {
  background: #f2f3f5;
}

.recipe-action-bookmark-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fb;
  color: #737373;
  border: 1px solid #d4d4d4;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  padding: 0;
}

.recipe-action-bookmark-btn:hover {
  background: #f2f3f5;
  color: #1c1b19;
}

.recipe-action-bookmark-btn.is-saved {
  background: rgba(28, 27, 25, 0.08);
  color: #1c1b19;
  border-color: #1c1b19;
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
  background: #1c1b19;
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
  background: #1c1b19;
}

.recipe-action-delete-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fb;
  color: #a2a2a2;
  border: 1px solid #d4d4d4;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s ease;
  flex-shrink: 0;
  padding: 0;
}

.recipe-action-delete-btn:hover {
  background: #f3f4f6;
  color: #d96856;
  border-color: #fcefec;
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

.saved-recipe-actions {
  display: flex;
  justify-content: flex-end;
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
  border: 1px solid var(--dn-line);
  border-radius: 12px;
  padding: 0 10px;
  height: 40px;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: none;
}

.saved-search-box:focus-within {
  border-color: var(--dn-ink);
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
}

.saved-search-box .search-ico {
  font-size: 17px;
  color: #a2a2a2;
  flex-shrink: 0;
}

.saved-search-box .search-input-el {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #1c1b19;
  outline: none;
  font-family: inherit;
}

.saved-search-box .search-input-el::placeholder {
  color: #a2a2a2;
}

.saved-search-box .search-clear-ico {
  background: none;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a2a2a2;
  font-size: 17px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s ease;
}

.saved-search-box .search-clear-ico:hover {
  color: #1c1b19;
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
  border: 1px solid var(--dn-line);
  border-radius: 12px;
  height: 40px;
  padding: 0 10px;
  gap: 6px;
  transition: all 0.2s ease;
  box-shadow: none;
}

.saved-sort-dropdown:hover,
.saved-sort-dropdown:focus-within {
  border-color: #1c1b19;
}

.saved-sort-dropdown .sort-icon {
  font-size: 16px;
  color: #737373;
  pointer-events: none;
  flex-shrink: 0;
}

.saved-sort-dropdown .sort-native-select {
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: #1c1b19;
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
  background: #f2f3f5;
  border-radius: 12px;
  padding: 3px;
  gap: 2px;
  border: 1px solid #e5e6e8;
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
  color: #737373;
  font-size: 17px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.saved-view-toggle .view-btn:hover {
  color: #1c1b19;
}

.saved-view-toggle .view-btn.active {
  background: #ffffff;
  color: #1c1b19;
  box-shadow: none;
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
  color: #a2a2a2;
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
  border: 1px solid var(--dn-line);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #545454;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.cat-pill-btn:hover {
  border-color: #d4d4d4;
  background: #f8f9fb;
  color: #1c1b19;
}

.cat-pill-btn.active {
  background: #1c1b19;
  border-color: #1c1b19;
  color: #ffffff;
}

.cat-pill-btn .cat-count-sub {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 10px;
  background: #f2f3f5;
  color: #737373;
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
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12px;
  color: #545454;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.summary-count {
  font-size: 12px;
  color: #737373;
  margin-right: 4px;
}

.summary-count strong {
  color: #1c1b19;
  font-weight: 700;
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 600;
  color: #1c1b19;
}

.summary-badge ion-icon {
  font-size: 13px;
  cursor: pointer;
  color: #a2a2a2;
  transition: color 0.15s ease;
}

.summary-badge ion-icon:hover {
  color: #d96856;
}

.summary-badge.sort-badge {
  background: #f3f4f6;
  border-color: #d8d8d8;
  color: #5c5c5c;
}

.summary-reset-btn {
  background: none;
  border: none;
  color: #d96856;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  text-decoration: underline;
  flex-shrink: 0;
}

.summary-reset-btn:hover {
  color: #6d6d6d;
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
  color: #737373;
  background: #f2f3f5;
  border-radius: 6px;
  padding: 2px 6px;
}

.saved-card-meta-row .meta-tag ion-icon {
  font-size: 12px;
}

.saved-card-meta-row .meta-tag.cookbook-tag {
  background: #f0f1f3;
  color: #515151;
}

.saved-card-meta-row .meta-tag.cat-meta-tag {
  background: #f3f4f6;
  color: #636363;
}

.saved-card-meta-row .meta-tag.ing-meta-tag {
  background: #f8f9fb;
  color: #6f6f6f;
}

.saved-card-meta-row .meta-tag.date-tag {
  background: #f8f9fb;
  color: #737373;
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
  border: 1px solid var(--dn-line);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: none;
}

.saved-list-card:hover {
  border-color: #d4d4d4;
  box-shadow: none;
  transform: translateY(-1px);
}

.saved-list-media {
  width: 68px;
  height: 68px;
  border-radius: 12px;
  overflow: hidden;
  background: #f2f3f5;
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
  background: #f8f9fb;
  color: #a2a2a2;
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
  background: #f2f3f5;
  color: #545454;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.saved-list-source-pill.custom {
  background: #f3f4f6;
  color: #5c5c5c;
}

.saved-list-source-pill.import {
  background: #f3f4f6;
  color: #636363;
}

.saved-list-source-pill.api {
  background: #f5f6f8;
  color: #595959;
}

.saved-list-cat-pill {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 5px;
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  color: #737373;
}

.saved-list-cooked-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 5px;
  background: #f6f7f9;
  color: #6d6d6d;
}

.saved-list-book-pill {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 5px;
  background: #f0f1f3;
  color: #515151;
}

.saved-list-title {
  font-size: 14px;
  font-weight: 700;
  color: #1c1b19;
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
  color: #737373;
  font-weight: 500;
}

.saved-list-meta-item ion-icon {
  font-size: 12px;
  color: #a2a2a2;
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
  background: #1c1b19;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.saved-list-plan-btn:hover {
  background: #1c1b19;
  transform: translateY(-1px);
}

.saved-list-plan-btn:active {
  transform: scale(0.96);
}

.saved-list-delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid #e5e6e8;
  background: #ffffff;
  color: #a2a2a2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.saved-list-delete-btn:hover {
  background: #f3f4f6;
  border-color: #fcefec;
  color: #d96856;
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
  border: 1px solid var(--dn-line);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.18s ease;
}

.pick-recipe-item:hover, .pick-recipe-item:active {
  border-color: #1c1b19;
  background: #f8f9fb;
}

.pick-item-thumb {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  background-color: #f2f3f5;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a2a2a2;
  font-size: 24px;
}

.pick-item-info {
  flex: 1;
  min-width: 0;
}

.pick-item-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #1c1b19;
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
  background: #f2f3f5;
  color: #737373;
}

.pick-meta-chip.source-chip.custom {
  background: #f2f3f5;
  color: #1c1b19;
}

.pick-meta-chip.source-chip.api {
  background: #f2f3f5;
  color: #404040;
}

.pick-meta-chip.cook-chip {
  background: #f1f2f4;
  color: #6f6f6f;
}

.pick-item-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #1c1b19;
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
  color: #737373;
}

.meta-count-text strong {
  color: #1c1b19;
}

.meta-page-badge {
  background: var(--dn-soft);
  padding: 3px 9px;
  border-radius: 9999px;
  font-weight: 500;
  color: #1c1b19;
  font-size: 11.5px;
  border: none;
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
  border: 1px solid var(--dn-line);
  border-radius: 16px;
  box-shadow: none;
}

.pagination-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 11px;
  border-radius: 10px;
  border: 1px solid #d4d4d4;
  background: #ffffff;
  color: #1c1b19;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  flex-shrink: 0;
}

.pagination-nav-btn:hover:not(:disabled) {
  background: #f8f9fb;
  border-color: #1c1b19;
}

.pagination-nav-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.pagination-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  border-color: #e5e6e8;
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
  color: #545454;
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
  background: #f2f3f5;
  color: #1c1b19;
}

.page-number-btn:active:not(.active):not(.ellipsis) {
  transform: scale(0.92);
}

.page-number-btn.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
}

.page-number-btn.ellipsis {
  cursor: default;
  color: #a2a2a2;
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
  box-shadow: none;
}

.recipe-hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.recipe-hero-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #737373;
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.9), transparent 38%),
    linear-gradient(135deg, #f8f9fb, #e5e6e8);
  font-size: 13px;
  font-weight: 700;
}

.recipe-hero-placeholder ion-icon {
  font-size: 42px;
  color: #1c1b19;
}

.recipe-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(28, 27, 25, 0.35) 0%, rgba(28, 27, 25, 0.05) 50%, rgba(28, 27, 25, 0.6) 100%);
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
  background: rgba(28, 27, 25, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: none;
}

.hero-glass-pill.cuisine-pill {
  background: rgba(155, 155, 155, 0.85);
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
  font-weight: 700;
  color: #1c1b19;
  margin: 0;
  line-height: 1.25;
}

.recipe-original-name {
  font-size: 12px;
  color: #737373;
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
  background: var(--dn-soft);
  font-size: 11.5px;
  font-weight: 500;
  color: #545454;
}

.quick-chip ion-icon {
  font-size: 13px;
  color: #1c1b19;
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
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  touch-action: manipulation;
  box-shadow: none;
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
  background: #f2f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #1c1b19;
}

.section-title-group h3 {
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
  margin: 0;
}

.count-tag {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dn-ink);
  background: var(--dn-soft);
  padding: 2px 8px;
  border-radius: 9999px;
}

.translating-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: #737373;
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
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
}

.ing-bullet-orb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(163, 163, 163, 0.14);
  color: #838383;
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
  color: #1c1b19;
  line-height: 1.25;
}

.ing-quantity {
  font-size: 11px;
  font-weight: 600;
  color: #737373;
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
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
}

.step-badge-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1c1b19;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
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
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #737373;
}

.step-instruction-text {
  font-size: 13.5px;
  color: #1c1b19;
  line-height: 1.55;
  margin: 0;
}

.single-instruction-box {
  padding: 14px;
  border-radius: 14px;
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
}

.recipe-instructions-text {
  font-size: 13.5px;
  color: #1c1b19;
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
  background: #f8f9fb;
  border: 1.5px solid #e5e6e8;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  touch-action: manipulation;
}

.video-recipe-card:active {
  transform: scale(0.98);
  background: #f2f3f5;
}

.video-icon-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(217, 104, 86, 0.12);
  color: #d96856;
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
  color: #1c1b19;
}

.video-sub {
  font-size: 11.5px;
  color: #737373;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-arrow {
  font-size: 18px;
  color: #a2a2a2;
}

/* Bottom Plan Button */
.recipe-bottom-floating-bar {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid #f2f3f5;
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
  background: #f3f4f6;
  color: #c2412d;
  border: 1px solid #e6e7e9;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  white-space: nowrap;
}

.recipe-modal-delete-btn:hover {
  background: #e6e7e9;
  color: #c2412d;
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
  background: #f8f9fb;
  color: #1c1b19;
  border: 1px solid #d4d4d4;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  white-space: nowrap;
}

.recipe-modal-save-btn:hover {
  background: #f2f3f5;
  border-color: #a2a2a2;
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
  background: #f8f9fb;
  color: #1c1b19;
  border: 1.5px solid #d4d4d4;
  transition: all 0.15s ease;
}

.recipe-save-btn:hover {
  background: #f2f3f5;
  border-color: #a2a2a2;
}

.bottom-plan-btn {
  flex: 1;
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  touch-action: manipulation;
  box-shadow: none;
}

/* ======================================================= */
/* BOTTOM SHEET MODALS (CUSTOM MEAL, ASSIGN & DETAILS)     */
/* ======================================================= */
ion-modal.dn-meal-sheet-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -12px 40px rgba(28, 27, 25, 0.16);
}

ion-modal.dn-meal-sheet-modal::part(handle) {
  background: #a2a2a2;
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
  border-bottom: 1px solid #f2f3f5;
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
  background: #f2f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1c1b19;
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
  font-weight: 700;
  color: #1c1b19;
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
  color: #737373;
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
  background: var(--dn-soft);
  border: none;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dn-ink);
  cursor: pointer;
  font-size: 18px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-delete-icon-btn:hover {
  background: #e6e7e9;
  color: #c2412d;
  border-color: #fcefec;
}

.dn-meal-sheet-modal .modal-delete-icon-btn:active {
  transform: scale(0.92);
}

.dn-meal-sheet-modal .modal-save-icon-btn {
  background: var(--dn-soft);
  border: none;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1c1b19;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-save-icon-btn:hover {
  background: #f2f3f5;
  border-color: #a2a2a2;
  color: #1c1b19;
}

.dn-meal-sheet-modal .modal-save-icon-btn:active {
  transform: scale(0.92);
}

.dn-meal-sheet-modal .modal-close-icon-btn {
  background: var(--dn-soft);
  border: none;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dn-ink);
  cursor: pointer;
  font-size: 20px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
  flex-shrink: 0;
}

.dn-meal-sheet-modal .modal-close-icon-btn:hover {
  background: #e5e6e8;
  color: #1c1b19;
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
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  margin-bottom: 4px;
}

.assign-thumb {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  background-color: #f2f3f5;
  flex-shrink: 0;
}

.assign-meal-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.assign-meal-name {
  font-size: 14px;
  font-weight: 700;
  color: #1c1b19;
  margin: 0 0 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.assign-meal-meta {
  font-size: 12px;
  color: #737373;
  margin: 0;
}

/* Form Groups & Labels */

.label-between-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 4px;
}

.label-between-row .form-label {
  margin-bottom: 0;
}

.label-icon {
  font-size: 15px;
  color: #737373;
}

.label-badge-optional {
  font-size: 11px;
  font-weight: 500;
  color: #a2a2a2;
  background: var(--dn-soft);
  padding: 2px 8px;
  border-radius: 9999px;
}

.selected-day-badge {
  font-size: 11.5px;
  font-weight: 700;
  color: #1c1b19;
  background: #f2f3f5;
  padding: 3px 10px;
  border-radius: 9999px;
  border: 1px solid #e5e6e8;
}

/* Inputs & Textareas */
.input-container-box,
.textarea-container-box {
  background: #f8f9fb;
  border: 1.5px solid #e5e6e8;
  border-radius: 14px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.input-container-box:focus-within,
.textarea-container-box:focus-within {
  background: #ffffff;
  border-color: var(--dn-ink);
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
}

.modal-input {
  --background: var(--dn-field);
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  --color: #1c1b19;
  --placeholder-color: #a2a2a2;
  --placeholder-opacity: 1;
  font-size: 16px;
  font-weight: 600;
  border: 1px solid var(--dn-field-line);
  min-height: 52px;
}

.modal-textarea {
  --background: var(--dn-field);
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 10px;
  --padding-bottom: 10px;
  --color: #1c1b19;
  --placeholder-color: #a2a2a2;
  --placeholder-opacity: 1;
  font-size: 16px;
  line-height: 1.45;
  border: 1px solid var(--dn-field-line);
  min-height: 75px;
}

.field-subtext-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11.5px;
  color: #737373;
  line-height: 1.35;
}

.field-subtext-row ion-icon {
  font-size: 14px;
  flex-shrink: 0;
  color: #a2a2a2;
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
  font-weight: 500;
  background: var(--dn-soft);
  color: #545454;
  border: none;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.custom-category-pill:hover {
  background: #f2f3f5;
  border-color: #d4d4d4;
}

.custom-category-pill.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
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
  background: #f8f9fb;
  border: 1.5px dashed #d4d4d4;
  color: #545454;
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
  background: #f2f3f5;
  border-color: #a2a2a2;
  color: #1c1b19;
}

.custom-mode-choice-btn.active {
  background: rgba(28, 27, 25, 0.08);
  border-color: #1c1b19;
  border-style: solid;
  color: #1c1b19;
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
  border: 1px solid var(--dn-line);
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  touch-action: manipulation;
  min-width: 0;
  color: #545454;
}

.day-select-btn:active {
  transform: scale(0.95);
}

.day-select-btn.is-today:not(.active) {
  border-color: #1c1b19;
  background: rgba(28, 27, 25, 0.04);
}

.day-select-btn.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
}

.btn-day-name {
  font-size: 11px;
  font-weight: 700;
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
  background: #a3a3a3;
  position: absolute;
  top: 4px;
  right: 4px;
}

.day-select-btn.active .btn-day-indicator {
  background: #bbbbbb;
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
  border: 1px solid var(--dn-line);
  background: #ffffff;
  color: #545454;
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
  background: #f8f9fb;
  color: #1c1b19;
}

.cook-chip-btn:active {
  transform: scale(0.96);
}

.cook-chip-btn.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
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
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  touch-action: manipulation;
  box-shadow: none;
}

.submit-custom-meal-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.recipe-badge-source.import {
  background: rgba(28, 27, 25, 0.9);
  color: #b1b1b1;
  border: 1px solid rgba(177, 177, 177, 0.3);
}

.import-shortcut-banner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: rgba(155, 155, 155, 0.08);
  border: 1px solid rgba(155, 155, 155, 0.25);
  color: #646464;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
  text-align: left;
}

.import-shortcut-banner:hover {
  background: rgba(155, 155, 155, 0.12);
  border-color: rgba(155, 155, 155, 0.4);
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
  color: #464646;
  min-width: 0;
}

.import-shortcut-banner .shortcut-text-wrap strong {
  font-weight: 700;
  text-decoration: underline;
}

.import-shortcut-banner .shortcut-icon {
  font-size: 16px;
  flex-shrink: 0;
  color: #7d7d7d;
}

.import-shortcut-banner .shortcut-arrow {
  font-size: 15px;
  color: #7d7d7d;
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
  background: var(--dn-soft);
  border: none;
  font-size: 11.5px;
  font-weight: 500;
  color: #545454;
}

.platform-chip ion-icon {
  font-size: 13px;
  color: #737373;
}

.platform-chip.tiktok-chip {
  background: rgba(28, 27, 25, 0.06);
  border-color: #d4d4d4;
  color: #1c1b19;
}

.platform-chip.tiktok-chip ion-icon {
  color: #1c1b19;
}

.platform-chip.youtube-chip {
  background: rgba(217, 104, 86, 0.08);
  border-color: rgba(217, 104, 86, 0.25);
  color: #c2412d;
}

.platform-chip.youtube-chip ion-icon {
  color: #c2412d;
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
  background: #1c1b19;
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
  background: #1c1b19;
}

.paste-clipboard-btn:active {
  transform: scale(0.95);
}

.import-error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f3f4f6;
  border: 1px solid #fcefec;
  color: #c2412d;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 6px;
}

.import-error-banner ion-icon {
  font-size: 16px;
  flex-shrink: 0;
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
  box-shadow: none;
}

.imported-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(28, 27, 25, 0.4) 0%, rgba(28, 27, 25, 0.1) 50%, rgba(28, 27, 25, 0.6) 100%);
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
  background: rgba(28, 27, 25, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
}

.imported-source-badge ion-icon {
  font-size: 13px;
  color: #b1b1b1;
}

.imported-ingredients-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 160px;
  overflow-y: auto;
  padding: 8px;
  border-radius: 12px;
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
}

.imported-ing-pill {
  display: inline-block;
  padding: 4px 9px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #d4d4d4;
  font-size: 11.5px;
  font-weight: 600;
  color: #404040;
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

/* ===== Beige accent: empty states ===== */
.empty-icon-circle {
  width: 64px !important;
  height: 64px !important;
  margin: 0 auto 16px !important;
  border-radius: 20px !important;
  background: var(--dn-cream) !important;
  color: var(--dn-cream-ink) !important;
  border: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 28px !important;
  flex-shrink: 0;
}

/* =========================================================
   WEEK PLAN – compact day rows (ml-*)
   ========================================================= */
.ml-weeknav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 20px 6px;
}

.ml-weeknav-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
}

.ml-weeknav-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.ml-weeknav-title {
  font-family: var(--dn-serif);
  font-size: 20px;
  font-weight: 600;
  color: var(--dn-ink);
}

.ml-weeknav-count {
  color: var(--dn-muted);
  font-size: 0.75rem;
}

.ml-weeknav-today {
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dn-cream-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.ml-days {
  display: flex;
  flex-direction: column;
  margin: 6px 20px 0;
}

.ml-day {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 10px 0;
  border-bottom: 1px solid var(--dn-line);
}

.ml-day:last-child {
  border-bottom: none;
}

.ml-day.is-today {
  margin: 4px -12px;
  padding: 10px 12px;
  border-bottom: none;
  border-radius: 20px;
  background: var(--dn-cream);
}

.ml-date {
  width: 48px;
  height: 52px;
  border-radius: 14px;
  background: var(--dn-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ml-day.is-today .ml-date {
  background: var(--dn-ink);
}

.ml-date-dow {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dn-muted);
}

.ml-date-num {
  font-family: var(--dn-serif);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--dn-ink);
}

.ml-day.is-today .ml-date-dow {
  color: rgba(255, 255, 255, 0.7);
}

.ml-day.is-today .ml-date-num {
  color: #ffffff;
}

.ml-meal {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: left;
  color: var(--dn-ink);
  cursor: pointer;
}

.ml-thumb {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--dn-cream) center / cover no-repeat;
  color: var(--dn-cream-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.ml-day.is-today .ml-thumb {
  background-color: #ffffff;
}

.ml-meal-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ml-meal-title {
  font-size: 15.5px;
  font-weight: 500;
  color: var(--dn-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-day.is-done .ml-meal-title {
  color: var(--dn-faint);
  text-decoration: line-through;
}

.ml-meal-meta {
  font-size: 12.5px;
  color: var(--dn-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-check {
  width: 30px;
  height: 30px;
  border: 1.5px solid #c9ccd2;
  border-radius: 50%;
  background: transparent;
  color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  cursor: pointer;
}

.ml-check.done {
  background: var(--dn-ink);
  border-color: var(--dn-ink);
  color: #ffffff;
}

.ml-more {
  width: 32px;
  height: 32px;
  margin-right: -6px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--dn-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  cursor: pointer;
}

.ml-empty {
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
  color: var(--dn-faint);
}

.ml-day.is-today .ml-empty {
  color: var(--dn-cream-ink);
  font-weight: 500;
}

.ml-plan-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 0 14px 0 10px;
  border: none;
  border-radius: 999px;
  background: var(--dn-soft);
  color: var(--dn-ink);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  flex-shrink: 0;
  cursor: pointer;
}

.ml-plan-btn ion-icon {
  font-size: 16px;
}

.ml-day.is-today .ml-plan-btn {
  background: var(--dn-ink);
  color: #ffffff;
}

/* =========================================================
   RECIPE PREVIEW SHEET (rp-*)
   ========================================================= */
.rp-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 20px 8px;
}

.rp-header-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dn-muted);
}

.rp-header-actions {
  display: flex;
  gap: 8px;
}

.rp-icon-btn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
}

.rp-icon-btn.is-saved {
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
}

.rp-content {
  --background: #ffffff;
}

.rp-body {
  padding: 4px 20px 24px;
}

.rp-hero {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 22px;
  overflow: hidden;
  background: var(--dn-soft);
}

.rp-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.rp-hero.is-empty {
  aspect-ratio: auto;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: var(--dn-cream);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rp-hero-icon {
  color: var(--dn-cream-ink);
  font-size: 32px;
  display: flex;
}

.rp-title {
  margin: 18px 0 0;
  font-family: var(--dn-serif);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.01em;
  color: var(--dn-ink);
}

.rp-original {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--dn-muted);
}

.rp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.rp-chip {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--dn-soft);
  font-size: 13px;
  font-weight: 500;
  color: var(--dn-ink);
}

.rp-chip.is-cream {
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
}

.rp-section {
  margin-top: 28px;
}

.rp-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.rp-section-title {
  margin: 0;
  font-family: var(--dn-serif);
  font-size: 21px;
  font-weight: 600;
  color: var(--dn-ink);
}

.rp-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: var(--dn-cream);
  color: var(--dn-ink);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
}

.rp-link-btn ion-icon {
  font-size: 16px;
}

.rp-translating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: var(--dn-muted);
}

.rp-translating ion-spinner {
  width: 18px;
  height: 18px;
}

.rp-ingredients,
.rp-steps {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rp-ing {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--dn-line);
}

.rp-ing:last-child {
  border-bottom: none;
}

.rp-ing-name {
  font-size: 15px;
  color: var(--dn-ink);
}

.rp-ing-qty {
  font-size: 14px;
  color: var(--dn-muted);
  text-align: right;
  flex-shrink: 0;
  max-width: 45%;
}

.rp-step {
  display: flex;
  gap: 14px;
  padding: 10px 0;
}

.rp-step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--dn-ink);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.rp-step-text,
.rp-paragraph {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--dn-ink);
  white-space: pre-line;
}

.rp-step-text {
  padding-top: 3px;
}

.rp-source {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 14px;
  border-radius: 18px;
  background: var(--dn-soft);
  color: var(--dn-ink);
  text-decoration: none;
}

.rp-source-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.rp-source-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rp-source-title {
  font-size: 15px;
  font-weight: 500;
}

.rp-source-sub {
  font-size: 13px;
  color: var(--dn-muted);
}

.rp-source-arrow {
  color: var(--dn-faint);
  font-size: 18px;
}

.rp-footer {
  position: sticky;
  bottom: 0;
  padding: 28px 20px calc(16px + env(safe-area-inset-bottom));
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), #ffffff 40%);
}

.rp-plan-btn {
  width: 100%;
}
</style>
