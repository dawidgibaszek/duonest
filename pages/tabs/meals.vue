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
                <span style="text-wrap: nowrap;">Własne</span>
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

      <!-- SUB-VIEW SEGMENT: Plan Tygodnia vs Inspiracje & Przepisy -->
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
            <span>Inspiracje & Przepisy</span>
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
                  class="slot-btn slot-primary-btn"
                  @click="openExploreForDate(day.dateStr)"
                >
                  <ion-icon :icon="ioniconsSparklesOutline" />
                  <span>Wybierz przepis</span>
                </button>
                <button
                  type="button"
                  class="slot-btn slot-secondary-btn"
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
      <!-- WIDOK 2: INSPIRACJE & PRZEPISY (KATALOG)       -->
      <!-- ============================================== -->
      <div v-else class="meals-explore-wrapper">
        <!-- Compact modern surprise bar -->
        <div class="surprise-hero-bar dn-card" @click="handleSurpriseMe">
          <div class="surprise-left-content">
            <div class="surprise-icon-orb">
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
            :disabled="isLoadingRandom"
            @click.stop="handleSurpriseMe"
          >
            <ion-spinner v-if="isLoadingRandom" name="crescent" class="btn-spinner" />
            <span v-else>Wylosuj</span>
            <ion-icon v-if="!isLoadingRandom" :icon="ioniconsArrowForwardOutline" />
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

        <!-- Recipes Grid (Clean, symmetrical, aligned 2-column cards) -->
        <div v-else class="meals-cards-container">
          <div class="meals-cards-grid">
            <div
              v-for="meal in apiResults"
              :key="meal.id"
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

              <!-- Card Content with Pinned Action Button -->
              <div class="recipe-card-body">
                <h4 class="recipe-card-title" :title="meal.title">
                  {{ meal.title }}
                </h4>

                <div class="recipe-bottom-action">
                  <button
                    type="button"
                    class="recipe-plan-pill-btn"
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
      :breakpoints="[0, 0.9, 1]"
      :initial-breakpoint="0.9"
      :handle="true"
      handle-behavior="cycle"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header">
        <ion-toolbar>
          <div class="modal-header-inner">
            <div class="modal-title-wrap">
              <div class="modal-title-icon-badge">
                <ion-icon :icon="ioniconsRestaurantOutline" class="modal-title-icon" />
              </div>
              <div class="modal-title-text-group">
                <ion-title class="modal-main-title">Przepis i Składniki</ion-title>
                <span class="modal-sub-title">Inspiracja kulinarna dla Was</span>
              </div>
            </div>
            <ion-buttons slot="end">
              <button
                type="button"
                class="modal-close-icon-btn"
                @click="showDetailsModal = false"
                aria-label="Zamknij"
              >
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </ion-buttons>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding recipe-modal-content" v-if="activeSelectedMeal">
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
            <h2 class="recipe-display-title">{{ activeSelectedMeal.titlePl || activeSelectedMeal.title }}</h2>
            <p v-if="activeSelectedMeal.titlePl && activeSelectedMeal.titlePl !== activeSelectedMeal.title" class="recipe-original-name">
              {{ activeSelectedMeal.title }}
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

          <!-- Primary CTA Button: Plan this meal -->
          <div class="recipe-plan-cta-box">
            <button
              type="button"
              class="dn-button-primary recipe-plan-btn"
              @click="openAssignFromDetails(activeSelectedMeal)"
            >
              <ion-icon :icon="ioniconsCalendarOutline" />
              <span>Zaplanuj ten obiad na ten tydzień</span>
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
                  <span class="ing-title">{{ ing.name }}</span>
                  <span v-if="ing.measure" class="ing-quantity">{{ ing.measure }}</span>
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
          <div class="recipe-detail-section" v-if="activeSelectedMeal.youtube_url || activeSelectedMeal.youtubeUrl">
            <a
              :href="activeSelectedMeal.youtube_url || activeSelectedMeal.youtubeUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="video-recipe-card"
            >
              <div class="video-icon-circle">
                <ion-icon :icon="ioniconsPlayCircleOutline" />
              </div>
              <div class="video-meta">
                <span class="video-title">Wideo z przygotowania</span>
                <span class="video-sub">Zobacz przygotowanie tego dania krok po kroku</span>
              </div>
              <ion-icon :icon="ioniconsChevronForwardOutline" class="video-arrow" />
            </a>
          </div>

          <!-- Bottom Floating Action Bar -->
          <div class="recipe-bottom-floating-bar">
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
      :breakpoints="[0, 0.75, 0.94]"
      :initial-breakpoint="0.75"
      :handle="true"
      handle-behavior="cycle"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header">
        <ion-toolbar>
          <div class="modal-header-inner">
            <div class="modal-title-wrap">
              <div class="modal-title-icon-badge">
                <ion-icon :icon="ioniconsCalendarOutline" class="modal-title-icon" />
              </div>
              <div class="modal-title-text-group">
                <ion-title class="modal-main-title">Zaplanuj ten obiad</ion-title>
                <span class="modal-sub-title">Wybierz dzień i kucharza dla przepisu</span>
              </div>
            </div>
            <ion-buttons slot="end">
              <button
                type="button"
                class="modal-close-icon-btn"
                @click="showAssignModal = false"
                aria-label="Zamknij"
              >
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </ion-buttons>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding custom-meal-modal-content" v-if="assignTargetMeal">
        <div class="assign-form">
          <div class="assign-meal-preview dn-card">
            <div
              class="assign-thumb"
              :style="{ backgroundImage: `url(${assignTargetMeal.thumbnail || assignTargetMeal.image_url})` }"
            />
            <div class="assign-meal-info">
              <h4 class="assign-meal-name">{{ assignTargetMeal.title }}</h4>
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
      :breakpoints="[0, 0.82, 0.95]"
      :initial-breakpoint="0.82"
      :handle="true"
      handle-behavior="cycle"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header">
        <ion-toolbar>
          <div class="modal-header-inner">
            <div class="modal-title-wrap">
              <div class="modal-title-icon-badge">
                <ion-icon :icon="ioniconsRestaurantOutline" class="modal-title-icon" />
              </div>
              <div class="modal-title-text-group">
                <ion-title class="modal-main-title">Dodaj Własny Obiad</ion-title>
                <span class="modal-sub-title">Zaplanuj domowy posiłek dla Was</span>
              </div>
            </div>
            <ion-buttons slot="end">
              <button
                type="button"
                class="modal-close-icon-btn"
                @click="showAddCustomModal = false"
                aria-label="Zamknij"
              >
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </ion-buttons>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding custom-meal-modal-content">
        <form @submit.prevent="handleCreateCustomMeal" class="custom-meal-form">
          <!-- Nazwa obiadu -->
          <div class="form-group">
            <label class="form-label">
              <ion-icon :icon="ioniconsFastFoodOutline" class="label-icon" />
              <span>Nazwa obiadu *</span>
            </label>
            <div class="input-container-box">
              <ion-input
                v-model="customTitle"
                placeholder="np. Kotlety schabowe z ziemniaczkami, Domowa lasagne..."
                class="modal-input"
                :clear-input="true"
              />
            </div>
          </div>

          <!-- Dzień tygodnia -->
          <div class="form-group">
            <div class="label-between-row">
              <label class="form-label">
                <ion-icon :icon="ioniconsCalendarOutline" class="label-icon" />
                <span>Wybierz dzień *</span>
              </label>
              <span class="selected-day-badge" v-if="selectedCustomDayLabel">
                {{ selectedCustomDayLabel }}
              </span>
            </div>
            <div class="days-select-grid">
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
              :disabled="!customTitle.trim() || !customDate"
            >
              <ion-icon :icon="ioniconsCheckmarkOutline" />
              <span>Dodaj do Planera Tygodnia</span>
            </button>
          </div>
        </form>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  { id: 'all', label: 'Wszystkie (790+)', type: 'all', value: '' },
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
  { id: 'italian', label: 'Włoska', type: 'area', value: 'Italian' },
  { id: 'asian', label: 'Azjatycka', type: 'area', value: 'Asian' },
  { id: 'mexican', label: 'Meksykańska', type: 'area', value: 'Mexican' }
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

    const res = await $fetch<{ success: boolean; meals: any[]; pagination?: any }>(`/api/meals/search?${params.toString()}`)
    if (res && res.meals) {
      apiResults.value = res.meals
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
const isTranslatingRecipe = ref(false)

const openMealDetailsModal = (meal: any) => {
  activeSelectedMeal.value = meal
  showDetailsModal.value = true
}

const openApiMealPreview = async (meal: any) => {
  activeSelectedMeal.value = meal
  showDetailsModal.value = true

  // If steps or translated ingredients are not yet populated, fetch lookup
  if (!meal.instructionsSteps || meal.instructionsSteps.length === 0 || !meal.ingredients || meal.ingredients.length === 0) {
    isTranslatingRecipe.value = true
    try {
      const res = await $fetch<{ success: boolean; meal: any }>(`/api/meals/lookup?id=${meal.id}`)
      if (res && res.meal) {
        activeSelectedMeal.value = res.meal
      }
    } catch (e) {
      console.warn('lookup error:', e)
    } finally {
      isTranslatingRecipe.value = false
    }
  }
}

const openAssignFromDetails = (meal: any) => {
  showDetailsModal.value = false
  setTimeout(() => {
    openAssignModal(meal)
  }, 220)
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

const selectedAssignDayLabel = computed(() => {
  if (!assignDate.value) return ''
  const d = weekDays.value.find(item => item.dateStr === assignDate.value)
  return d ? `${d.dayName}, ${d.displayDate}` : ''
})

const openAssignModal = async (meal: any, defaultDate?: string) => {
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

const selectedCustomDayLabel = computed(() => {
  if (!customDate.value) return ''
  const d = weekDays.value.find(item => item.dateStr === customDate.value)
  return d ? `${d.dayName}, ${d.displayDate}` : ''
})

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
  padding: 7px 12px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12.5px;
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
  padding: 6px 11px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.slot-primary-btn {
  background: #0f172a;
  color: #ffffff;
}

.slot-secondary-btn {
  background: #f1f5f9;
  color: #334155;
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
  transition: all 0.2s ease;
}

.surprise-hero-bar:active {
  transform: scale(0.99);
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
  color: #0284c7;
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
  gap: 4px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  flex-shrink: 0;
  cursor: pointer;
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

/* RECIPES GRID: Rock-solid symmetrical 2-column layout */
.meals-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.recipe-card {
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.recipe-card:active {
  transform: scale(0.985);
}

.recipe-card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 11;
  background: #f1f5f9;
  overflow: hidden;
}

.recipe-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.recipe-badges-overlay {
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  display: flex;
  justify-content: space-between;
  gap: 4px;
  pointer-events: none;
}

.recipe-badge-cuisine {
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-badge-category {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  color: #0f172a;
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-card-body {
  padding: 10px 10px 12px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.recipe-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  margin: 0 0 10px 0;
  height: 35px; /* Exactly 2 lines height across all cards */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recipe-bottom-action {
  margin-top: auto;
  width: 100%;
}

.recipe-plan-pill-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.recipe-plan-pill-btn:hover {
  background: #1e293b;
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
  --padding-top: 4px;
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
  color: #0284c7;
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
}

.bottom-plan-btn {
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
  margin-top: 10px;
  margin-bottom: 2px;
}

.dn-meal-sheet-modal .modal-custom-header ion-toolbar {
  --background: #ffffff;
  --border-width: 0;
  padding: 4px 14px 8px;
}

.dn-meal-sheet-modal .modal-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 2px;
}

.dn-meal-sheet-modal .modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dn-meal-sheet-modal .modal-title-icon-badge {
  width: 38px;
  height: 38px;
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
}

.dn-meal-sheet-modal .modal-main-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  padding: 0;
  line-height: 1.25;
}

.dn-meal-sheet-modal .modal-sub-title {
  font-size: 11.5px;
  font-weight: 500;
  color: #64748b;
  margin-top: 1px;
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
  font-size: 22px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
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
  --padding-top: 6px;
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
}

.day-select-btn:active {
  transform: scale(0.95);
}

.day-select-btn.is-today:not(.active) {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.05);
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
</style>
