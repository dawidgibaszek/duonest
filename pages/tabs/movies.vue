<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="dn-header-title">
            <span>Filmy & Seriale</span>
            <span class="count-chip" v-if="plannedCount > 0">{{ plannedCount }}</span>
          </div>
          <p class="dn-header-subtitle">Wspólna lista seansów, maratony i Wasze recenzje</p>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- 1. NOT PAIRED EMPTY STATE -->
      <div v-if="!partnership" class="not-paired-container">
        <div class="dn-card not-paired-card">
          <div class="not-paired-icon">
            <ion-icon :icon="ioniconsFilmOutline" />
          </div>
          <h3>Wspólne kino we dwoje</h3>
          <p>Połącz się w parę ze swoją drugą połówką, aby wspólnie planować seanse, prowadzić listę filmów, seriali oraz anime i wymieniać się prywatnymi recenzjami.</p>
          <button type="button" class="dn-button-primary" @click="navigateTo('/pairing')">
            <ion-icon :icon="ioniconsHeart" />
            <span>Przejdź do łączenia w parę</span>
          </button>
        </div>
      </div>

      <!-- 2. PAIRED VIEW -->
      <div v-else class="movies-main-wrapper">
        <!-- TOP ACTIONS CARD -->
        <div class="dn-card quick-actions-card">
          <div class="actions-header-row">
            <div class="header-icon-box">
              <ion-icon :icon="ioniconsFilm" />
            </div>
            <div class="header-text-meta">
              <span class="actions-title">Kino we dwoje</span>
              <span class="actions-sub">Wyszukaj z bazy TMDB lub wylosuj seans na dziś!</span>
            </div>
          </div>

          <div class="quick-actions-grid">
            <button type="button" class="action-tile action-search" @click="openSearchModal">
              <ion-icon :icon="ioniconsSearchOutline" />
              <div class="tile-meta">
                <span class="tile-title">Szukaj z TMDB</span>
                <span class="tile-sub">Filmy, seriale, anime</span>
              </div>
            </button>

            <button type="button" class="action-tile action-random" @click="openRandomPickerModal">
              <ion-icon :icon="ioniconsDiceOutline" />
              <div class="tile-meta">
                <span class="tile-title">Co oglądamy?</span>
                <span class="tile-sub">Wylosuj seans na wieczór</span>
              </div>
            </button>

            <button type="button" class="action-tile action-manual" @click="openManualAddModal">
              <ion-icon :icon="ioniconsAddCircleOutline" />
              <div class="tile-meta">
                <span class="tile-title">Dodaj ręcznie</span>
                <span class="tile-sub">Własny tytuł / notatka</span>
              </div>
            </button>
          </div>
        </div>

        <!-- FILTER TABS & SEARCH -->
        <div class="filters-container">
          <!-- Status Filters -->
          <div class="filter-scroll" data-no-swipe="true">
            <button
              v-for="st in statusFilters"
              :key="st.id"
              type="button"
              class="filter-pill"
              :class="{ active: activeStatusFilter === st.id }"
              @click="activeStatusFilter = st.id"
            >
              <ion-icon :icon="st.icon" />
              <span>{{ st.label }}</span>
              <span class="filter-badge" v-if="getStatusCount(st.id) > 0">
                {{ getStatusCount(st.id) }}
              </span>
            </button>
          </div>

          <!-- Media Type Chips -->
          <div class="media-type-chips-row" data-no-swipe="true">
            <button
              v-for="mt in mediaTypeFilters"
              :key="mt.id"
              type="button"
              class="media-chip"
              :class="{ active: activeMediaTypeFilter === mt.id }"
              @click="activeMediaTypeFilter = mt.id"
            >
              <span>{{ mt.emoji }} {{ mt.label }}</span>
            </button>
          </div>

          <!-- Collection Live Search Input -->
          <div class="collection-search-wrap" v-if="moviesList.length > 3">
            <ion-icon :icon="ioniconsSearchOutline" class="search-input-icon" />
            <input
              v-model="collectionSearchQuery"
              type="text"
              placeholder="Filtruj Waszą listę..."
              class="collection-search-input"
            />
            <button
              v-if="collectionSearchQuery"
              type="button"
              class="clear-search-btn"
              @click="collectionSearchQuery = ''"
            >
              <ion-icon :icon="ioniconsCloseCircleOutline" />
            </button>
          </div>
        </div>

        <!-- MOVIES LIST -->
        <div v-if="filteredMovies.length > 0" class="movies-grid">
          <div
            v-for="movie in filteredMovies"
            :key="movie.id"
            class="dn-card movie-card"
            :class="{
              'is-watched': movie.status === 'watched',
              'is-watching': movie.status === 'watching'
            }"
          >
            <!-- TOP SECTION: POSTER & MAIN INFO -->
            <div class="movie-card-main">
              <!-- Poster -->
              <div class="poster-container" @click="openMovieDetailsModal(movie)">
                <img
                  v-if="movie.poster_path"
                  :src="movie.poster_path"
                  :alt="movie.title"
                  class="movie-poster-img"
                  loading="lazy"
                />
                <div v-else class="poster-placeholder">
                  <ion-icon :icon="ioniconsFilmOutline" />
                  <span>{{ movie.title }}</span>
                </div>

                <!-- Badges over poster -->
                <div class="poster-overlay-badges">
                  <span class="type-tag" :class="'type-' + movie.media_type">
                    {{ getMediaTypeLabel(movie.media_type) }}
                  </span>
                  <span v-if="movie.vote_average" class="tmdb-score-tag">
                    <ion-icon :icon="ioniconsStar" />
                    {{ movie.vote_average }}
                  </span>
                </div>
              </div>

              <!-- Meta Column -->
              <div class="movie-meta-col">
                <div class="title-row">
                  <h3 class="movie-title" @click="openMovieDetailsModal(movie)">{{ movie.title }}</h3>
                  <button type="button" class="more-menu-btn" @click="confirmDeleteMovie(movie)">
                    <ion-icon :icon="ioniconsTrashOutline" />
                  </button>
                </div>

                <p v-if="movie.original_title && movie.original_title !== movie.title" class="movie-original-title">
                  {{ movie.original_title }}
                </p>

                <div class="movie-sub-info">
                  <span v-if="movie.release_year" class="year-tag">{{ movie.release_year }}</span>
                  <span v-if="movie.genres && movie.genres.length > 0" class="genres-text">
                    {{ movie.genres.slice(0, 2).join(' • ') }}
                  </span>
                </div>

                <!-- Status Badge -->
                <div class="status-pill-row">
                  <span class="status-pill" :class="'status-' + movie.status">
                    <span class="status-dot"></span>
                    {{ getStatusLabel(movie.status) }}
                  </span>
                  <span v-if="movie.watched_at && movie.status === 'watched'" class="watched-date-meta">
                    {{ formatWatchedDate(movie.watched_at) }}
                  </span>
                </div>

                <!-- Overview Excerpt -->
                <p v-if="movie.overview" class="movie-overview-excerpt">
                  {{ movie.overview }}
                </p>
              </div>
            </div>

            <!-- REVIEWS SECTION (Visible especially for watched items or when reviews exist) -->
            <div v-if="movie.status === 'watched' || hasReviews(movie)" class="reviews-section-box">
              <div class="reviews-header-bar">
                <div class="duo-score-chip" v-if="getDuoAverageRating(movie)">
                  <ion-icon :icon="ioniconsStar" class="star-gold" />
                  <span class="duo-score-val">{{ getDuoAverageRating(movie) }}</span>
                  <span class="duo-score-sub">/ 10 Wasza ocena</span>
                </div>
                <div v-else class="duo-score-chip not-rated-chip">
                  <ion-icon :icon="ioniconsChatbubbleEllipsesOutline" />
                  <span>Brak recenzji</span>
                </div>

                <button
                  type="button"
                  class="add-review-btn"
                  @click="openReviewModal(movie)"
                >
                  <ion-icon :icon="hasUserReviewed(movie) ? ioniconsCreateOutline : ioniconsStarOutline" />
                  <span>{{ hasUserReviewed(movie) ? 'Edytuj recenzję' : 'Oceń seans' }}</span>
                </button>
              </div>

              <!-- Two Review Cards (Ty i Partner) -->
              <div class="reviews-couple-grid">
                <!-- User 1 Review (Ty) -->
                <div class="review-bubble bubble-mine" :class="{ 'empty-bubble': !getUserReview(movie) }">
                  <div class="review-user-header">
                    <div class="avatar-circle-sm" :style="{ backgroundColor: currentUserAccentColor }">
                      <span>{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
                    </div>
                    <span class="review-author-name">{{ currentUser.name || 'Ty' }}</span>
                    <span v-if="getUserReview(movie)" class="user-score-badge">
                      <ion-icon :icon="ioniconsStar" />
                      {{ getUserReview(movie)?.rating }}/10
                    </span>
                  </div>

                  <p v-if="getUserReview(movie)?.comment" class="review-comment-text">
                    "{{ getUserReview(movie)?.comment }}"
                  </p>
                  <p v-else-if="getUserReview(movie)" class="review-comment-empty">
                    Ocena: {{ getUserReview(movie)?.rating }}/10 (brak notatki)
                  </p>
                  <div v-else class="review-placeholder" @click="openReviewModal(movie)">
                    <ion-icon :icon="ioniconsAddOutline" />
                    <span>Dodaj swoją ocenę i recenzję</span>
                  </div>
                </div>

                <!-- User 2 Review (Partner) -->
                <div class="review-bubble bubble-theirs" :class="{ 'empty-bubble': !getPartnerReview(movie) }">
                  <div class="review-user-header">
                    <div class="avatar-circle-sm" :style="{ backgroundColor: partnerUserAccentColor }">
                      <span>{{ partnerUser ? (partnerUser.name || 'P').charAt(0).toUpperCase() : '?' }}</span>
                    </div>
                    <span class="review-author-name">{{ partnerUser?.name || 'Partner' }}</span>
                    <span v-if="getPartnerReview(movie)" class="user-score-badge partner-badge">
                      <ion-icon :icon="ioniconsStar" />
                      {{ getPartnerReview(movie)?.rating }}/10
                    </span>
                  </div>

                  <p v-if="getPartnerReview(movie)?.comment" class="review-comment-text">
                    "{{ getPartnerReview(movie)?.comment }}"
                  </p>
                  <p v-else-if="getPartnerReview(movie)" class="review-comment-empty">
                    Ocena: {{ getPartnerReview(movie)?.rating }}/10 (brak notatki)
                  </p>
                  <p v-else class="review-waiting-note">
                    Czeka na recenzję {{ partnerUser?.name || 'partnera' }}...
                  </p>
                </div>
              </div>
            </div>

            <!-- ACTION BUTTONS ROW -->
            <div class="movie-actions-footer">
              <!-- Status Toggle Action -->
              <button
                v-if="movie.status !== 'watched'"
                type="button"
                class="footer-btn mark-watched-btn"
                @click="toggleMovieStatus(movie, 'watched')"
              >
                <ion-icon :icon="ioniconsCheckmarkCircleOutline" />
                <span>Obejrzane</span>
              </button>

              <button
                v-if="movie.status === 'planned'"
                type="button"
                class="footer-btn start-watching-btn"
                @click="toggleMovieStatus(movie, 'watching')"
              >
                <ion-icon :icon="ioniconsPlayCircleOutline" />
                <span>Oglądamy</span>
              </button>

              <button
                v-if="movie.status === 'watched' || movie.status === 'watching'"
                type="button"
                class="footer-btn back-planned-btn"
                @click="toggleMovieStatus(movie, 'planned')"
              >
                <ion-icon :icon="ioniconsTimeOutline" />
                <span>Do planowanych</span>
              </button>

              <!-- Schedule Movie Date to Calendar -->
              <button
                type="button"
                class="footer-btn schedule-date-btn"
                @click="scheduleMovieDate(movie)"
              >
                <ion-icon :icon="ioniconsCalendarOutline" />
                <span>Zaplanuj seans</span>
              </button>
            </div>
          </div>
        </div>

        <!-- EMPTY STATE (WHEN NO MOVIES IN CURRENT FILTER) -->
        <div v-else class="empty-movies-box dn-card">
          <div class="empty-icon-wrap">
            <ion-icon :icon="ioniconsVideocamOutline" />
          </div>
          <h3>{{ getEmptyStateTitle() }}</h3>
          <p>{{ getEmptyStateDesc() }}</p>
          <div class="empty-actions-row">
            <button type="button" class="dn-button-primary" @click="openSearchModal">
              <ion-icon :icon="ioniconsSearchOutline" />
              <span>Wyszukaj z bazy TMDB</span>
            </button>
            <button type="button" class="manual-fallback-btn" @click="openManualAddModal">
              Wpisz tytuł ręcznie
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================== -->
      <!-- MODAL 1: TMDB SEARCH & RECOMMENDATIONS MODAL -->
      <!-- ========================================================== -->
      <ion-modal
        :is-open="isSearchModalOpen"
        :breakpoints="[0, 0.92, 1]"
        :initial-breakpoint="0.92"
        handle-behavior="cycle"
        @didDismiss="closeSearchModal"
      >
        <div class="dn-modal-container">
          <div class="dn-modal-header">
            <div class="modal-title-col">
              <h3>Wyszukaj film, serial lub anime</h3>
              <p>Oficjalna baza The Movie Database (TMDB)</p>
            </div>
            <button type="button" class="modal-close-btn" @click="closeSearchModal">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <!-- Search Input Bar -->
          <div class="tmdb-search-input-box">
            <ion-icon :icon="ioniconsSearchOutline" class="input-search-icon" />
            <input
              ref="searchInputRef"
              v-model="tmdbSearchQuery"
              type="text"
              placeholder="Wpisz np. Incepcja, Spirited Away, Sukcesja..."
              class="tmdb-input"
              @input="onSearchInput"
              @keydown.enter.prevent="executeSearch"
            />
            <button
              v-if="tmdbSearchQuery"
              type="button"
              class="clear-btn"
              @click="clearSearch"
            >
              <ion-icon :icon="ioniconsCloseCircleOutline" />
            </button>
          </div>

          <!-- Category filter inside search -->
          <div class="search-category-tabs" data-no-swipe="true">
            <button
              v-for="cat in searchCategoryTabs"
              :key="cat.id"
              type="button"
              class="search-tab-pill"
              :class="{ active: searchCategory === cat.id }"
              @click="selectSearchCategory(cat.id)"
            >
              {{ cat.label }}
            </button>
          </div>

          <!-- TMDB API Key notice banner if missing -->
          <div v-if="apiKeyWarning" class="api-key-warning-card">
            <ion-icon :icon="ioniconsAlertCircleOutline" />
            <div class="warning-text">
              <span class="warning-title">Klucz TMDB API</span>
              <span class="warning-desc">{{ apiKeyWarning }}</span>
            </div>
            <button type="button" class="warning-action-btn" @click="openApiKeyPrompt">
              Wpisz klucz
            </button>
          </div>

          <!-- Content: Loading or Results or Trending -->
          <div class="modal-scrollable-content">
            <!-- Spinner -->
            <div v-if="isSearching" class="search-loading-state">
              <ion-spinner name="crescent" />
              <span>Przeszukuję bazę TMDB...</span>
            </div>

            <!-- Error notice -->
            <div v-else-if="searchError" class="search-error-state">
              <ion-icon :icon="ioniconsAlertCircleOutline" />
              <p>{{ searchError }}</p>
              <button type="button" class="retry-btn" @click="executeSearch">Spróbuj ponownie</button>
            </div>

            <!-- Results List -->
            <div v-else-if="searchResults.length > 0" class="search-results-list">
              <span class="results-heading">Wyniki wyszukiwania ({{ searchResults.length }})</span>
              <div
                v-for="res in searchResults"
                :key="res.tmdb_id"
                class="search-result-card"
              >
                <!-- Thumbnail -->
                <div class="res-thumb">
                  <img
                    v-if="res.poster_path"
                    :src="res.poster_path"
                    :alt="res.title"
                    loading="lazy"
                  />
                  <div v-else class="res-thumb-empty">
                    <ion-icon :icon="ioniconsFilmOutline" />
                  </div>
                </div>

                <!-- Info -->
                <div class="res-meta">
                  <div class="res-title-row">
                    <h4 class="res-title">{{ res.title }}</h4>
                    <span class="type-tag-small" :class="'type-' + res.media_type">
                      {{ getMediaTypeLabel(res.media_type) }}
                    </span>
                  </div>
                  <div class="res-sub-row">
                    <span v-if="res.release_year">{{ res.release_year }}</span>
                    <span v-if="res.vote_average" class="res-star">
                      <ion-icon :icon="ioniconsStar" />
                      {{ res.vote_average }}
                    </span>
                    <span v-if="res.genres.length > 0" class="res-genres">
                      {{ res.genres.slice(0, 2).join(', ') }}
                    </span>
                  </div>
                  <p v-if="res.overview" class="res-overview">{{ res.overview }}</p>

                  <!-- Add Buttons -->
                  <div class="res-actions-row">
                    <button
                      v-if="!isAlreadyInList(res.tmdb_id)"
                      type="button"
                      class="add-planned-btn"
                      @click="addFromTmdb(res, 'planned')"
                    >
                      <ion-icon :icon="ioniconsAddCircleOutline" />
                      <span>Do obejrzenia</span>
                    </button>
                    <button
                      v-if="!isAlreadyInList(res.tmdb_id)"
                      type="button"
                      class="add-watched-btn"
                      @click="addFromTmdb(res, 'watched')"
                    >
                      <ion-icon :icon="ioniconsCheckmarkCircleOutline" />
                      <span>Obejrzane</span>
                    </button>
                    <span v-else class="already-added-pill">
                      <ion-icon :icon="ioniconsCheckmarkOutline" />
                      <span>Na Waszej liście</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Trending / Recommendations (When query is empty) -->
            <div v-else-if="!tmdbSearchQuery" class="trending-section">
              <span class="results-heading">🔥 Popularne i polecane w tym tygodniu</span>
              <div v-if="trendingList.length > 0" class="trending-grid">
                <div
                  v-for="tr in trendingList"
                  :key="tr.tmdb_id"
                  class="trending-card"
                  @click="addFromTmdb(tr, 'planned')"
                >
                  <div class="tr-poster-box">
                    <img v-if="tr.poster_path" :src="tr.poster_path" :alt="tr.title" loading="lazy" />
                    <span class="tr-type-pill" :class="'type-' + tr.media_type">
                      {{ getMediaTypeLabel(tr.media_type) }}
                    </span>
                    <div class="tr-add-overlay">
                      <ion-icon :icon="ioniconsAddCircle" />
                    </div>
                  </div>
                  <span class="tr-title">{{ tr.title }}</span>
                  <span class="tr-meta">{{ tr.release_year }} • ⭐ {{ tr.vote_average }}</span>
                </div>
              </div>
              <div v-else class="trending-empty-note">
                <p>Wpisz tytuł powyżej, aby znaleźć dowolny film, serial lub anime.</p>
              </div>
            </div>

            <!-- No results found for query -->
            <div v-else class="no-results-state">
              <ion-icon :icon="ioniconsSearchOutline" />
              <h4>Brak wyników dla "{{ tmdbSearchQuery }}"</h4>
              <p>Sprawdź pisownię lub dodaj pozycję ręcznie wpisując tytuł.</p>
              <button type="button" class="dn-button-primary" @click="openManualAddWithTitle(tmdbSearchQuery)">
                <ion-icon :icon="ioniconsAddOutline" />
                <span>Dodaj "{{ tmdbSearchQuery }}" ręcznie</span>
              </button>
            </div>
          </div>
        </div>
      </ion-modal>

      <!-- ========================================================== -->
      <!-- MODAL 2: REVIEW & RATING MODAL (DLA OBOJGA PARTNERÓW) -->
      <!-- ========================================================== -->
      <ion-modal
        :is-open="isReviewModalOpen"
        :breakpoints="[0, 0.92, 1]"
        :initial-breakpoint="0.92"
        handle-behavior="cycle"
        @didDismiss="closeReviewModal"
      >
        <div class="dn-modal-container review-modal-content" v-if="selectedMovieForReview">
          <div class="dn-modal-header">
            <div class="modal-title-col">
              <h3>Wasza recenzja seansu</h3>
              <p>{{ selectedMovieForReview.title }}</p>
            </div>
            <button type="button" class="modal-close-btn" @click="closeReviewModal">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <div class="modal-scrollable-content">
            <!-- Movie Header Preview -->
            <div class="review-movie-preview">
              <img
                v-if="selectedMovieForReview.poster_path"
                :src="selectedMovieForReview.poster_path"
                :alt="selectedMovieForReview.title"
                class="review-thumb"
              />
              <div class="review-preview-meta">
                <h4>{{ selectedMovieForReview.title }}</h4>
                <span>{{ selectedMovieForReview.release_year }} • {{ getMediaTypeLabel(selectedMovieForReview.media_type) }}</span>
                <p v-if="selectedMovieForReview.overview" class="preview-desc-trunc">
                  {{ selectedMovieForReview.overview }}
                </p>
              </div>
            </div>

            <!-- Interactive Rating Scale (1 - 10) -->
            <div class="rating-picker-section">
              <span class="rating-title-label">Twoja ocena (1 do 10):</span>
              <div class="rating-display-badge">
                <span class="rating-big-num">{{ reviewForm.rating }}</span>
                <span class="rating-big-scale">/ 10</span>
                <span class="rating-descriptor">{{ getRatingDescriptor(reviewForm.rating) }}</span>
              </div>

              <!-- Star Rating Bar -->
              <div class="stars-selector-row">
                <button
                  v-for="star in 10"
                  :key="star"
                  type="button"
                  class="star-score-btn"
                  :class="{ active: star <= reviewForm.rating }"
                  @click="reviewForm.rating = star"
                >
                  <ion-icon :icon="star <= reviewForm.rating ? ioniconsStar : ioniconsStarOutline" />
                </button>
              </div>

              <!-- Quick number chips -->
              <div class="rating-quick-chips">
                <button
                  v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
                  :key="num"
                  type="button"
                  class="rating-chip-btn"
                  :class="{ active: reviewForm.rating === num }"
                  @click="reviewForm.rating = num"
                >
                  {{ num }}
                </button>
              </div>
            </div>

            <!-- Review Textarea -->
            <div class="review-textarea-section">
              <label class="textarea-label">
                <span>Twoja recenzja & wrażenia</span>
                <span class="textarea-hint">Będzie widoczna dla {{ partnerUser?.name || 'Twojego partnera' }}</span>
              </label>
              <textarea
                v-model="reviewForm.comment"
                rows="4"
                placeholder="Co najbardziej podobało Ci się w tym seansie? Warto było obejrzeć? Ulubiona scena..."
                class="review-textarea"
              ></textarea>
            </div>

            <!-- Partner's Review Preview (If already reviewed) -->
            <div v-if="getPartnerReview(selectedMovieForReview)" class="partner-existing-review-box">
              <span class="partner-rev-title">
                Recenzja {{ partnerUser?.name || 'partnera' }} ({{ getPartnerReview(selectedMovieForReview)?.rating }}/10 ⭐):
              </span>
              <p class="partner-rev-quote">
                "{{ getPartnerReview(selectedMovieForReview)?.comment || 'Tylko ocena punktowa' }}"
              </p>
            </div>

            <!-- Submit Button -->
            <button
              type="button"
              class="dn-button-primary submit-review-btn"
              @click="submitReview"
            >
              <ion-icon :icon="ioniconsCheckmarkCircle" />
              <span>Zapisz recenzję</span>
            </button>
          </div>
        </div>
      </ion-modal>

      <!-- ========================================================== -->
      <!-- MODAL 3: "CO OGLĄDAMY DZIŚ?" RANDOM PICKER -->
      <!-- ========================================================== -->
      <ion-modal
        :is-open="isRandomModalOpen"
        :breakpoints="[0, 0.9, 1]"
        :initial-breakpoint="0.9"
        handle-behavior="cycle"
        @didDismiss="closeRandomModal"
      >
        <div class="dn-modal-container random-modal-content">
          <div class="dn-modal-header">
            <div class="modal-title-col">
              <h3>🎲 Co oglądamy dzisiaj?</h3>
              <p>Losowanie filmu na wspólny wieczór</p>
            </div>
            <button type="button" class="modal-close-btn" @click="closeRandomModal">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <div class="modal-scrollable-content random-picker-body">
            <!-- Filter for randomizer -->
            <div class="random-filter-row">
              <button
                v-for="opt in randomFilterOptions"
                :key="opt.id"
                type="button"
                class="random-filter-pill"
                :class="{ active: randomFilterType === opt.id }"
                @click="randomFilterType = opt.id"
              >
                {{ opt.label }}
              </button>
            </div>

            <!-- Shuffler card container -->
            <div class="random-display-card dn-card">
              <div v-if="isSpinning" class="spinning-state">
                <div class="spinning-dice">
                  <ion-icon :icon="ioniconsDice" class="dice-spin-anim" />
                </div>
                <h4>Losuję seans...</h4>
                <p class="shuffle-title">{{ currentShuffleTitle }}</p>
              </div>

              <div v-else-if="selectedRandomMovie" class="winner-state">
                <div class="winner-poster-box">
                  <img
                    v-if="selectedRandomMovie.poster_path"
                    :src="selectedRandomMovie.poster_path"
                    :alt="selectedRandomMovie.title"
                    class="winner-poster"
                  />
                  <div v-else class="winner-poster-empty">
                    <ion-icon :icon="ioniconsFilmOutline" />
                  </div>
                  <span class="winner-type-pill" :class="'type-' + selectedRandomMovie.media_type">
                    {{ getMediaTypeLabel(selectedRandomMovie.media_type) }}
                  </span>
                </div>

                <div class="winner-meta">
                  <span class="winner-badge-pill">✨ Dziś wieczorem oglądacie:</span>
                  <h3 class="winner-title">{{ selectedRandomMovie.title }}</h3>
                  <span class="winner-details">
                    {{ selectedRandomMovie.release_year }} • {{ selectedRandomMovie.genres?.join(', ') || 'Film' }}
                  </span>
                  <p v-if="selectedRandomMovie.overview" class="winner-desc">
                    {{ selectedRandomMovie.overview }}
                  </p>
                </div>
              </div>

              <div v-else class="random-prompt-state">
                <ion-icon :icon="ioniconsSparkles" class="prompt-icon" />
                <h4>Nie możecie się zdecydować?</h4>
                <p>Kliknij przycisk poniżej, a DuoNest wylosuje idealną propozycję z Waszej listy planowanych seansów!</p>
              </div>
            </div>

            <!-- Spin Actions -->
            <div class="random-actions-footer">
              <button
                type="button"
                class="dn-button-primary spin-btn"
                :disabled="isSpinning || plannedCandidates.length === 0"
                @click="spinRandomMovie"
              >
                <ion-icon :icon="ioniconsDice" />
                <span>{{ selectedRandomMovie ? 'Losuj inny' : 'Wylosuj seans!' }}</span>
              </button>

              <div v-if="selectedRandomMovie && !isSpinning" class="winner-actions-row">
                <button
                  type="button"
                  class="winner-action-btn start-now-btn"
                  @click="acceptRandomMovie(selectedRandomMovie)"
                >
                  <ion-icon :icon="ioniconsPlayCircle" />
                  <span>Oglądamy ten!</span>
                </button>

                <button
                  type="button"
                  class="winner-action-btn schedule-cal-btn"
                  @click="scheduleMovieDate(selectedRandomMovie)"
                >
                  <ion-icon :icon="ioniconsCalendar" />
                  <span>Zaplanuj w kalendarzu</span>
                </button>
              </div>

              <span v-if="plannedCandidates.length === 0" class="random-empty-warn">
                Brak pozycji w tej kategorii na liście "Do obejrzenia". Dodaj najpierw filmy lub zmień filtr.
              </span>
            </div>
          </div>
        </div>
      </ion-modal>

      <!-- ========================================================== -->
      <!-- MODAL 4: MANUAL ADD MODAL -->
      <!-- ========================================================== -->
      <ion-modal
        :is-open="isManualModalOpen"
        :breakpoints="[0, 0.88, 1]"
        :initial-breakpoint="0.88"
        handle-behavior="cycle"
        @didDismiss="closeManualModal"
      >
        <div class="dn-modal-container manual-modal-content">
          <div class="dn-modal-header">
            <div class="modal-title-col">
              <h3>Dodaj film ręcznie</h3>
              <p>Wpisz własne dane bez korzystania z bazy TMDB</p>
            </div>
            <button type="button" class="modal-close-btn" @click="closeManualModal">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <div class="modal-scrollable-content manual-form-body">
            <!-- Title -->
            <div class="form-group">
              <label class="form-label">Tytuł *</label>
              <input
                v-model="manualForm.title"
                type="text"
                placeholder="np. Władca Pierścieni: Drużyna Pierścienia"
                class="form-input"
              />
            </div>

            <!-- Category -->
            <div class="form-group">
              <label class="form-label">Kategoria</label>
              <div class="category-choice-row">
                <button
                  v-for="cat in [
                    { id: 'movie', label: '🎬 Film' },
                    { id: 'tv', label: '📺 Serial' },
                    { id: 'anime', label: '⛩️ Anime' }
                  ]"
                  :key="cat.id"
                  type="button"
                  class="choice-pill"
                  :class="{ active: manualForm.media_type === cat.id }"
                  @click="manualForm.media_type = cat.id as any"
                >
                  {{ cat.label }}
                </button>
              </div>
            </div>

            <!-- Status -->
            <div class="form-group">
              <label class="form-label">Status</label>
              <div class="category-choice-row">
                <button
                  v-for="st in [
                    { id: 'planned', label: 'Do obejrzenia' },
                    { id: 'watching', label: 'W trakcie' },
                    { id: 'watched', label: 'Już obejrzane' }
                  ]"
                  :key="st.id"
                  type="button"
                  class="choice-pill"
                  :class="{ active: manualForm.status === st.id }"
                  @click="manualForm.status = st.id as any"
                >
                  {{ st.label }}
                </button>
              </div>
            </div>

            <!-- Year & Genres -->
            <div class="form-row-2col">
              <div class="form-group">
                <label class="form-label">Rok premiery</label>
                <input
                  v-model="manualForm.release_year"
                  type="text"
                  placeholder="np. 2024"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Gatunek</label>
                <input
                  v-model="manualForm.genreInput"
                  type="text"
                  placeholder="np. Fantasy, Przygodowy"
                  class="form-input"
                />
              </div>
            </div>

            <!-- Poster image URL -->
            <div class="form-group">
              <label class="form-label">Link do plakatu / zdjęcia (opcjonalnie)</label>
              <input
                v-model="manualForm.poster_path"
                type="url"
                placeholder="https://..."
                class="form-input"
              />
            </div>

            <!-- Overview -->
            <div class="form-group">
              <label class="form-label">Krótki opis / dlaczego warto obejrzeć</label>
              <textarea
                v-model="manualForm.overview"
                rows="3"
                placeholder="Krótki opis..."
                class="form-textarea"
              ></textarea>
            </div>

            <!-- Submit -->
            <button
              type="button"
              class="dn-button-primary submit-manual-btn"
              :disabled="!manualForm.title.trim()"
              @click="submitManualAdd"
            >
              <ion-icon :icon="ioniconsAddCircle" />
              <span>Dodaj do Waszej listy</span>
            </button>
          </div>
        </div>
      </ion-modal>

      <!-- ========================================================== -->
      <!-- MODAL 5: DETAILS MODAL -->
      <!-- ========================================================== -->
      <ion-modal
        :is-open="isDetailsModalOpen"
        :breakpoints="[0, 0.85, 1]"
        :initial-breakpoint="0.85"
        handle-behavior="cycle"
        @didDismiss="closeDetailsModal"
      >
        <div class="dn-modal-container" v-if="selectedMovieForDetails">
          <div class="dn-modal-header">
            <div class="modal-title-col">
              <h3>{{ selectedMovieForDetails.title }}</h3>
              <p>{{ selectedMovieForDetails.release_year }} • {{ getMediaTypeLabel(selectedMovieForDetails.media_type) }}</p>
            </div>
            <button type="button" class="modal-close-btn" @click="closeDetailsModal">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <div class="modal-scrollable-content details-body">
            <div class="details-poster-backdrop">
              <img
                v-if="selectedMovieForDetails.backdrop_path || selectedMovieForDetails.poster_path"
                :src="selectedMovieForDetails.backdrop_path || selectedMovieForDetails.poster_path"
                :alt="selectedMovieForDetails.title"
                class="details-backdrop-img"
              />
            </div>

            <div class="details-content-meta">
              <div class="details-pills-row">
                <span class="type-tag" :class="'type-' + selectedMovieForDetails.media_type">
                  {{ getMediaTypeLabel(selectedMovieForDetails.media_type) }}
                </span>
                <span v-if="selectedMovieForDetails.vote_average" class="tmdb-score-tag">
                  ⭐ {{ selectedMovieForDetails.vote_average }} (TMDB)
                </span>
                <span class="status-pill" :class="'status-' + selectedMovieForDetails.status">
                  {{ getStatusLabel(selectedMovieForDetails.status) }}
                </span>
              </div>

              <h4 class="details-section-heading">Opis</h4>
              <p class="details-full-desc">
                {{ selectedMovieForDetails.overview || 'Brak opisu dla tej pozycji.' }}
              </p>

              <h4 class="details-section-heading">Gatunki</h4>
              <div class="details-genres-wrap">
                <span v-for="g in selectedMovieForDetails.genres" :key="g" class="genre-pill">
                  {{ g }}
                </span>
              </div>

              <!-- Quick action buttons -->
              <div class="details-modal-actions">
                <button
                  type="button"
                  class="details-action-btn date-btn"
                  @click="scheduleMovieDate(selectedMovieForDetails)"
                >
                  <ion-icon :icon="ioniconsCalendar" />
                  <span>Zaplanuj seans w Terminarzu</span>
                </button>

                <button
                  v-if="selectedMovieForDetails.status === 'watched'"
                  type="button"
                  class="details-action-btn review-btn"
                  @click="openReviewFromDetails"
                >
                  <ion-icon :icon="ioniconsStar" />
                  <span>Oceń / napisz recenzję</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDuoState, type MovieItem } from '~/composables/useDuoState'
import confetti from 'canvas-confetti'

const {
  currentUser,
  partnerUser,
  partnership,
  moviesList,
  addMovie,
  updateMovie,
  deleteMovie,
  toggleMovieWatched,
  saveMovieReview,
  refreshMovies,
  addEvent,
  currentUserAccentColor,
  partnerUserAccentColor,
  triggerToast
} = useDuoState()

// Content ref for scrolling
const contentRef = ref<any>(null)

// --- FILTERS & STATE ---
const activeStatusFilter = ref<'all' | 'planned' | 'watching' | 'watched'>('all')
const activeMediaTypeFilter = ref<'all' | 'movie' | 'tv' | 'anime'>('all')
const collectionSearchQuery = ref('')

const statusFilters = [
  { id: 'all', label: 'Wszystkie', icon: ioniconsFilmOutline },
  { id: 'planned', label: 'Do obejrzenia', icon: ioniconsTimeOutline },
  { id: 'watching', label: 'W trakcie', icon: ioniconsPlayOutline },
  { id: 'watched', label: 'Obejrzane', icon: ioniconsCheckmarkCircleOutline }
] as const

const mediaTypeFilters = [
  { id: 'all', label: 'Wszystko', emoji: '🍿' },
  { id: 'movie', label: 'Filmy', emoji: '🎬' },
  { id: 'tv', label: 'Seriale', emoji: '📺' },
  { id: 'anime', label: 'Anime', emoji: '⛩️' }
] as const

const plannedCount = computed(() => {
  return moviesList.value.filter(m => m.status === 'planned').length
})

const getStatusCount = (statusId: string) => {
  if (statusId === 'all') return moviesList.value.length
  return moviesList.value.filter(m => m.status === statusId).length
}

const filteredMovies = computed(() => {
  let list = [...moviesList.value]

  // Filter by status
  if (activeStatusFilter.value !== 'all') {
    list = list.filter(m => m.status === activeStatusFilter.value)
  }

  // Filter by media type
  if (activeMediaTypeFilter.value !== 'all') {
    list = list.filter(m => m.media_type === activeMediaTypeFilter.value)
  }

  // Filter by live text search
  if (collectionSearchQuery.value.trim()) {
    const q = collectionSearchQuery.value.toLowerCase().trim()
    list = list.filter(m => {
      return (
        m.title.toLowerCase().includes(q) ||
        (m.original_title && m.original_title.toLowerCase().includes(q)) ||
        (m.genres && m.genres.some(g => g.toLowerCase().includes(q)))
      )
    })
  }

  return list
})

// --- REVIEWS & RATINGS HELPERS ---
const hasReviews = (movie: MovieItem): boolean => {
  return !!movie.reviews && Object.keys(movie.reviews).length > 0
}

const getUserReview = (movie: MovieItem) => {
  if (!movie.reviews || !currentUser.value?.id) return null
  return movie.reviews[currentUser.value.id] || null
}

const getPartnerReview = (movie: MovieItem) => {
  if (!movie.reviews || !partnerUser.value?.id) return null
  return movie.reviews[partnerUser.value.id] || null
}

const hasUserReviewed = (movie: MovieItem): boolean => {
  return !!getUserReview(movie)
}

const getDuoAverageRating = (movie: MovieItem): string | null => {
  if (!movie.reviews) return null
  const entries = Object.values(movie.reviews)
  if (entries.length === 0) return null
  const sum = entries.reduce((s, r) => s + (Number(r.rating) || 0), 0)
  const avg = sum / entries.length
  return (Math.round(avg * 10) / 10).toFixed(1)
}

const getRatingDescriptor = (score: number): string => {
  if (score >= 10) return 'Arcydzieło! 🔥'
  if (score >= 9) return 'Świetny seans! ⭐'
  if (score >= 8) return 'Bardzo dobry seans 👍'
  if (score >= 7) return 'Dobry, podobał mi się 🙂'
  if (score >= 6) return 'Całkiem niezły 👌'
  if (score >= 5) return 'Przeciętny / średni 😐'
  if (score >= 4) return 'Rozczarowujący 😕'
  if (score >= 3) return 'Słaby 👎'
  return 'Szkoda czasu ❌'
}

const formatWatchedDate = (isoStr?: string | null): string => {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

// --- MODAL 1: TMDB SEARCH & RECOMMENDATIONS ---
const isSearchModalOpen = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
const tmdbSearchQuery = ref('')
const searchCategory = ref<'all' | 'movie' | 'tv' | 'anime'>('all')
const isSearching = ref(false)
const searchError = ref('')
const searchResults = ref<any[]>([])
const trendingList = ref<any[]>([])
const apiKeyWarning = ref('')

const searchCategoryTabs = [
  { id: 'all', label: 'Wszystko' },
  { id: 'movie', label: 'Filmy' },
  { id: 'tv', label: 'Seriale' },
  { id: 'anime', label: 'Anime' }
] as const

let searchDebounceTimeout: any = null

const getStoredTmdbApiKey = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('duonest_tmdb_api_key') || ''
  }
  return ''
}

const openSearchModal = () => {
  isSearchModalOpen.value = true
  searchError.value = ''
  apiKeyWarning.value = ''
  loadTrendingIfEmpty()
  setTimeout(() => {
    searchInputRef.value?.focus()
  }, 350)
}

const closeSearchModal = () => {
  isSearchModalOpen.value = false
  tmdbSearchQuery.value = ''
  searchResults.value = []
}

const clearSearch = () => {
  tmdbSearchQuery.value = ''
  searchResults.value = []
  searchError.value = ''
}

const selectSearchCategory = (catId: 'all' | 'movie' | 'tv' | 'anime') => {
  searchCategory.value = catId
  if (tmdbSearchQuery.value.trim()) {
    executeSearch()
  }
}

const onSearchInput = () => {
  if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout)
  if (!tmdbSearchQuery.value.trim()) {
    searchResults.value = []
    searchError.value = ''
    return
  }
  searchDebounceTimeout = setTimeout(() => {
    executeSearch()
  }, 400)
}

const executeSearch = async () => {
  const query = tmdbSearchQuery.value.trim()
  if (!query) return

  isSearching.value = true
  searchError.value = ''
  apiKeyWarning.value = ''

  try {
    const customKey = getStoredTmdbApiKey()
    const params = new URLSearchParams({
      q: query,
      type: searchCategory.value
    })
    if (customKey) params.set('apiKey', customKey)

    const res = await $fetch<any>(`/api/movies/search?${params.toString()}`)
    if (res.success) {
      searchResults.value = res.results || []
    } else {
      if (res.error === 'NO_API_KEY') {
        apiKeyWarning.value = 'Aby wyszukiwać automatycznie w TMDB, wpisz darmowy klucz TMDB API.'
      } else {
        searchError.value = res.message || 'Wystąpił błąd podczas wyszukiwania.'
      }
      searchResults.value = []
    }
  } catch (err: any) {
    searchError.value = 'Nie udało się połączyć z usługą wyszukiwania.'
  } finally {
    isSearching.value = false
  }
}

const loadTrendingIfEmpty = async () => {
  if (trendingList.value.length > 0) return
  try {
    const customKey = getStoredTmdbApiKey()
    const url = customKey ? `/api/movies/trending?apiKey=${encodeURIComponent(customKey)}` : '/api/movies/trending'
    const res = await $fetch<any>(url)
    if (res?.success && res.results) {
      trendingList.value = res.results
    }
  } catch {}
}

const openApiKeyPrompt = () => {
  const currentKey = getStoredTmdbApiKey()
  const entered = window.prompt('Wprowadź swój klucz TMDB API (v3 key lub token):', currentKey)
  if (entered !== null) {
    const clean = entered.trim()
    if (clean) {
      localStorage.setItem('duonest_tmdb_api_key', clean)
      apiKeyWarning.value = ''
      triggerToast('Zapisano klucz TMDB API!', { type: 'movies', title: 'TMDB' })
      if (tmdbSearchQuery.value) {
        executeSearch()
      } else {
        loadTrendingIfEmpty()
      }
    } else {
      localStorage.removeItem('duonest_tmdb_api_key')
    }
  }
}

const isAlreadyInList = (tmdbId?: number | null): boolean => {
  if (!tmdbId) return false
  return moviesList.value.some(m => m.tmdb_id === tmdbId)
}

const addFromTmdb = async (item: any, status: 'planned' | 'watched') => {
  await addMovie({
    title: item.title,
    original_title: item.original_title,
    tmdb_id: item.tmdb_id,
    media_type: item.media_type || 'movie',
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    release_year: item.release_year,
    genres: item.genres,
    overview: item.overview,
    vote_average: item.vote_average,
    status
  })

  // Celebrate with confetti
  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.85 }
    })
  } catch {}
}

// --- MODAL 2: REVIEW MODAL ---
const isReviewModalOpen = ref(false)
const selectedMovieForReview = ref<MovieItem | null>(null)
const reviewForm = ref({
  rating: 8,
  comment: ''
})

const openReviewModal = (movie: MovieItem) => {
  selectedMovieForReview.value = movie
  const existing = getUserReview(movie)
  if (existing) {
    reviewForm.value.rating = existing.rating
    reviewForm.value.comment = existing.comment || ''
  } else {
    reviewForm.value.rating = 8
    reviewForm.value.comment = ''
  }
  isReviewModalOpen.value = true
}

const closeReviewModal = () => {
  isReviewModalOpen.value = false
  selectedMovieForReview.value = null
}

const submitReview = async () => {
  if (!selectedMovieForReview.value) return
  await saveMovieReview(
    selectedMovieForReview.value.id,
    reviewForm.value.rating,
    reviewForm.value.comment
  )

  try {
    confetti({
      particleCount: 45,
      spread: 70,
      origin: { y: 0.7 }
    })
  } catch {}

  closeReviewModal()
}

// --- MODAL 3: RANDOM MOVIE PICKER ---
const isRandomModalOpen = ref(false)
const randomFilterType = ref<'all' | 'movie' | 'tv' | 'anime'>('all')
const isSpinning = ref(false)
const currentShuffleTitle = ref('')
const selectedRandomMovie = ref<MovieItem | null>(null)

const randomFilterOptions = [
  { id: 'all', label: 'Wszystko' },
  { id: 'movie', label: 'Tylko filmy' },
  { id: 'tv', label: 'Tylko seriale' },
  { id: 'anime', label: 'Tylko anime' }
] as const

const plannedCandidates = computed(() => {
  let list = moviesList.value.filter(m => m.status === 'planned')
  if (randomFilterType.value !== 'all') {
    list = list.filter(m => m.media_type === randomFilterType.value)
  }
  return list
})

const openRandomPickerModal = () => {
  selectedRandomMovie.value = null
  isSpinning.value = false
  isRandomModalOpen.value = true
}

const closeRandomModal = () => {
  isRandomModalOpen.value = false
  selectedRandomMovie.value = null
  isSpinning.value = false
}

const spinRandomMovie = () => {
  const candidates = plannedCandidates.value
  if (candidates.length === 0) return

  isSpinning.value = true
  selectedRandomMovie.value = null

  // Fast shuffle animation
  let counter = 0
  const maxShuffle = Math.min(20, Math.max(8, candidates.length * 3))
  const interval = setInterval(() => {
    const rand = candidates[Math.floor(Math.random() * candidates.length)]
    currentShuffleTitle.value = rand.title
    counter++
    if (counter >= maxShuffle) {
      clearInterval(interval)
      // Pick final winner
      const winner = candidates[Math.floor(Math.random() * candidates.length)]
      selectedRandomMovie.value = winner
      isSpinning.value = false

      try {
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.6 }
        })
      } catch {}
    }
  }, 100)
}

const acceptRandomMovie = async (movie: MovieItem) => {
  await toggleMovieStatus(movie, 'watching')
  closeRandomModal()
}

// --- MODAL 4: MANUAL ADD MODAL ---
const isManualModalOpen = ref(false)
const manualForm = ref({
  title: '',
  media_type: 'movie' as 'movie' | 'tv' | 'anime',
  status: 'planned' as 'planned' | 'watching' | 'watched',
  release_year: '',
  genreInput: '',
  poster_path: '',
  overview: ''
})

const openManualAddModal = () => {
  manualForm.value = {
    title: '',
    media_type: 'movie',
    status: 'planned',
    release_year: new Date().getFullYear().toString(),
    genreInput: '',
    poster_path: '',
    overview: ''
  }
  isManualModalOpen.value = true
}

const openManualAddWithTitle = (title: string) => {
  closeSearchModal()
  openManualAddModal()
  manualForm.value.title = title
}

const closeManualModal = () => {
  isManualModalOpen.value = false
}

const submitManualAdd = async () => {
  if (!manualForm.value.title.trim()) return

  const genres = manualForm.value.genreInput
    ? manualForm.value.genreInput.split(',').map(s => s.trim()).filter(Boolean)
    : []

  await addMovie({
    title: manualForm.value.title.trim(),
    media_type: manualForm.value.media_type,
    status: manualForm.value.status,
    release_year: manualForm.value.release_year.trim() || null,
    genres,
    poster_path: manualForm.value.poster_path.trim() || null,
    overview: manualForm.value.overview.trim() || null
  })

  closeManualModal()
}

// --- MODAL 5: DETAILS MODAL ---
const isDetailsModalOpen = ref(false)
const selectedMovieForDetails = ref<MovieItem | null>(null)

const openMovieDetailsModal = (movie: MovieItem) => {
  selectedMovieForDetails.value = movie
  isDetailsModalOpen.value = true
}

const closeDetailsModal = () => {
  isDetailsModalOpen.value = false
  selectedMovieForDetails.value = null
}

const openReviewFromDetails = () => {
  const m = selectedMovieForDetails.value
  closeDetailsModal()
  if (m) {
    openReviewModal(m)
  }
}

// --- CARD ACTIONS ---
const toggleMovieStatus = async (movie: MovieItem, newStatus: 'planned' | 'watching' | 'watched') => {
  await toggleMovieWatched(movie.id, newStatus)
}

const confirmDeleteMovie = (movie: MovieItem) => {
  if (window.confirm(`Czy na pewno chcesz usunąć "${movie.title}" z Waszej listy filmów?`)) {
    deleteMovie(movie.id)
  }
}

const scheduleMovieDate = async (movie: MovieItem) => {
  // Suggest tomorrow evening or tonight
  const now = new Date()
  now.setHours(20, 0, 0, 0)
  const startTime = now.toISOString()

  await addEvent(
    `Randka filmowa: ${movie.title}`,
    'date',
    startTime,
    `Wspólny seans: ${movie.title} (${getMediaTypeLabel(movie.media_type)}). Nie zapomnijcie o przekąskach! 🍿✨`,
    'Domowy seans / Kanapa',
    new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    false,
    currentUser.value?.name || 'Wspólnie'
  )

  triggerToast(`Dodano seans "${movie.title}" do Terminarza! (+10 pkt po seansie) 📅🍿`, {
    type: 'calendar',
    title: 'Terminarz'
  })
}

// --- LABELS & STRINGS ---
const getMediaTypeLabel = (type: string) => {
  switch (type) {
    case 'anime': return 'Anime'
    case 'tv': return 'Serial'
    default: return 'Film'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'watched': return 'Obejrzane'
    case 'watching': return 'W trakcie'
    default: return 'Do obejrzenia'
  }
}

const getEmptyStateTitle = () => {
  if (activeStatusFilter.value === 'watched') return 'Brak obejrzanych seansów'
  if (activeStatusFilter.value === 'watching') return 'Nic aktualnie nie oglądacie'
  if (activeStatusFilter.value === 'planned') return 'Brak planowanych seansów'
  return 'Wasza lista seansów jest pusta'
}

const getEmptyStateDesc = () => {
  if (activeStatusFilter.value === 'watched') {
    return 'Gdy obejrzycie film lub odcinek, oznaczcie go jako obejrzany, by dodać Wasze recenzje!'
  }
  return 'Wyszukajcie film, anime lub serial z bazy TMDB i stwórzcie Waszą prywatną filmotekę!'
}

const handleRefresh = async (event: any) => {
  try {
    await refreshMovies()
  } finally {
    event.target.complete()
  }
}

onMounted(() => {
  refreshMovies()
})
</script>

<style scoped>
/* PAGE HEADER & GENERAL WRAPPERS */
.movies-main-wrapper {
  padding: 12px 14px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dn-page-header {
  padding: 8px 16px 12px;
}

.dn-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
}

.dn-header-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.count-chip {
  background: #8b5cf6;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
}

/* TOP ACTIONS CARD */
.quick-actions-card {
  padding: 14px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.actions-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.header-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.header-text-meta {
  display: flex;
  flex-direction: column;
}

.actions-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.actions-sub {
  font-size: 12px;
  color: #64748b;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.action-tile {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
}

.action-tile:active {
  transform: scale(0.96);
  background: #f1f5f9;
}

.action-tile ion-icon {
  font-size: 22px;
}

.action-search ion-icon { color: #8b5cf6; }
.action-random ion-icon { color: #f59e0b; }
.action-manual ion-icon { color: #0284c7; }

.tile-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.tile-title {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.tile-sub {
  font-size: 9px;
  color: #94a3b8;
  line-height: 1.1;
}

/* FILTERS CONTAINER */
.filters-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 2px 6px;
  -webkit-overflow-scrolling: touch;
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
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.filter-pill ion-icon {
  font-size: 16px;
}

.filter-pill.active {
  background: #8b5cf6;
  color: #ffffff;
  border-color: #8b5cf6;
  box-shadow: 0 3px 10px rgba(139, 92, 246, 0.25);
}

.filter-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 6px;
  border-radius: 999px;
}

.filter-pill.active .filter-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Media Type Chips Row */
.media-type-chips-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 2px 4px;
  scrollbar-width: none;
}

.media-type-chips-row::-webkit-scrollbar {
  display: none;
}

.media-chip {
  padding: 5px 12px;
  background: rgba(241, 245, 249, 0.9);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}

.media-chip.active {
  background: #1e293b;
  color: #ffffff;
  border-color: #1e293b;
}

/* Collection Search Input */
.collection-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input-icon {
  position: absolute;
  left: 12px;
  font-size: 17px;
  color: #94a3b8;
  pointer-events: none;
}

.collection-search-input {
  width: 100%;
  padding: 8px 34px 8px 36px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.collection-search-input:focus {
  border-color: #8b5cf6;
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* MOVIES GRID & CARDS */
.movies-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.movie-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.movie-card.is-watched {
  border-color: rgba(16, 185, 129, 0.3);
}

.movie-card.is-watching {
  border-color: rgba(245, 158, 11, 0.4);
  background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
}

.movie-card-main {
  display: flex;
  gap: 14px;
}

/* Poster Container */
.poster-container {
  width: 100px;
  min-width: 100px;
  height: 148px;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  background: #0f172a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  flex-shrink: 0;
}

.movie-poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e293b, #334155);
  color: #94a3b8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  text-align: center;
  gap: 6px;
}

.poster-placeholder ion-icon {
  font-size: 32px;
  color: #cbd5e1;
}

.poster-placeholder span {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.2;
}

.poster-overlay-badges {
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

.type-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.type-movie { background: #0284c7; }
.type-tv { background: #0d9488; }
.type-anime { background: #8b5cf6; }

.tmdb-score-tag {
  font-size: 9.5px;
  font-weight: 800;
  background: rgba(15, 23, 42, 0.85);
  color: #fbbf24;
  padding: 2px 5px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 2px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.tmdb-score-tag ion-icon {
  font-size: 10px;
}

/* Movie Meta Column */
.movie-meta-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
}

.movie-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
  cursor: pointer;
  word-break: break-word;
}

.more-menu-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 17px;
  padding: 2px;
  cursor: pointer;
}

.more-menu-btn:hover {
  color: #ef4444;
}

.movie-original-title {
  margin: 2px 0 0;
  font-size: 11px;
  color: #64748b;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-sub-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11.5px;
  color: #64748b;
  font-weight: 500;
}

.year-tag {
  font-weight: 700;
  color: #334155;
}

.genres-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
}

.status-planned {
  background: #f1f5f9;
  color: #475569;
}
.status-planned .status-dot { background: #94a3b8; }

.status-watching {
  background: #fef3c7;
  color: #b45309;
}
.status-watching .status-dot {
  background: #f59e0b;
  animation: pulseDot 1.5s infinite;
}

.status-watched {
  background: #d1fae5;
  color: #065f46;
}
.status-watched .status-dot { background: #10b981; }

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

@keyframes pulseDot {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.4); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}

.watched-date-meta {
  font-size: 11px;
  color: #94a3b8;
}

.movie-overview-excerpt {
  margin: 8px 0 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* REVIEWS SECTION IN CARD */
.reviews-section-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reviews-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duo-score-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.star-gold {
  color: #f59e0b;
  font-size: 15px;
}

.duo-score-val {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.duo-score-sub {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
}

.not-rated-chip {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
}

.add-review-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 700;
  color: #8b5cf6;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-review-btn:active {
  transform: scale(0.96);
  background: #f5f3ff;
}

/* Reviews Couple Grid */
.reviews-couple-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.review-bubble {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-user-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.avatar-circle-sm {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.review-author-name {
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-score-badge {
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 800;
  color: #f59e0b;
  display: flex;
  align-items: center;
  gap: 2px;
}

.review-comment-text {
  margin: 0;
  font-size: 11.5px;
  color: #1e293b;
  font-style: italic;
  line-height: 1.35;
  word-break: break-word;
}

.review-comment-empty {
  margin: 0;
  font-size: 10.5px;
  color: #94a3b8;
}

.review-placeholder {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: #8b5cf6;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
}

.review-waiting-note {
  margin: 0;
  font-size: 10.5px;
  color: #94a3b8;
  font-style: italic;
}

/* MOVIE ACTIONS FOOTER */
.movie-actions-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 4px;
  border-top: 1px solid #f1f5f9;
}

.footer-btn {
  flex: 1;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.footer-btn:active {
  transform: scale(0.96);
}

.mark-watched-btn {
  background: #10b981;
  color: #ffffff;
}

.start-watching-btn {
  background: #f59e0b;
  color: #ffffff;
}

.back-planned-btn {
  background: #f1f5f9;
  color: #475569;
}

.schedule-date-btn {
  background: #f8fafc;
  color: #6366f1;
  border: 1px solid #e0e7ff;
}

/* EMPTY STATE */
.empty-movies-box {
  padding: 32px 20px;
  background: #ffffff;
  border-radius: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #f5f3ff;
  color: #8b5cf6;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-movies-box h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.empty-movies-box p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
  max-width: 300px;
  line-height: 1.45;
}

.empty-actions-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 260px;
  margin-top: 8px;
}

.manual-fallback-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  padding: 6px;
  cursor: pointer;
  text-decoration: underline;
}

/* NOT PAIRED CARD */
.not-paired-container {
  padding: 24px 16px;
}

.not-paired-card {
  padding: 32px 20px;
  background: #ffffff;
  border-radius: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2e8f0;
}

.not-paired-icon {
  width: 68px;
  height: 68px;
  border-radius: 22px;
  background: #f5f3ff;
  color: #8b5cf6;
  font-size: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.not-paired-card h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: #0f172a;
}

.not-paired-card p {
  margin: 0;
  font-size: 13.5px;
  color: #64748b;
  line-height: 1.5;
}

/* ========================================================== */
/* MODALS STYLING */
/* ========================================================== */
.dn-modal-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.dn-modal-header {
  padding: 16px 18px 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #f1f5f9;
}

.modal-title-col h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.modal-title-col p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}

.modal-close-btn {
  background: #f1f5f9;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #64748b;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.modal-scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* TMDB SEARCH MODAL SPECIFICS */
.tmdb-search-input-box {
  margin: 12px 18px 6px;
  position: relative;
  display: flex;
  align-items: center;
}

.input-search-icon {
  position: absolute;
  left: 14px;
  font-size: 20px;
  color: #8b5cf6;
  pointer-events: none;
}

.tmdb-input {
  width: 100%;
  padding: 12px 38px 12px 42px;
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  outline: none;
  transition: all 0.2s ease;
}

.tmdb-input:focus {
  border-color: #8b5cf6;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
}

.clear-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.search-category-tabs {
  display: flex;
  gap: 6px;
  padding: 0 18px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.search-category-tabs::-webkit-scrollbar {
  display: none;
}

.search-tab-pill {
  padding: 6px 12px;
  border-radius: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
}

.search-tab-pill.active {
  background: #8b5cf6;
  color: #ffffff;
  border-color: #8b5cf6;
}

.api-key-warning-card {
  margin: 0 18px;
  padding: 10px 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b45309;
}

.api-key-warning-card ion-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.warning-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.warning-title {
  font-size: 12px;
  font-weight: 700;
}

.warning-desc {
  font-size: 11px;
}

.warning-action-btn {
  padding: 4px 10px;
  background: #f59e0b;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.search-loading-state,
.search-error-state,
.no-results-state {
  padding: 30px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  color: #64748b;
}

.search-error-state ion-icon,
.no-results-state ion-icon {
  font-size: 40px;
  color: #94a3b8;
}

.search-results-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.results-heading {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.search-result-card {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
}

.res-thumb {
  width: 64px;
  min-width: 64px;
  height: 94px;
  border-radius: 8px;
  overflow: hidden;
  background: #0f172a;
}

.res-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.res-thumb-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 24px;
}

.res-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 3px;
}

.res-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
}

.res-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}

.type-tag-small {
  font-size: 8.5px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  color: #ffffff;
  text-transform: uppercase;
}

.res-sub-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
}

.res-star {
  color: #f59e0b;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 2px;
}

.res-genres {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.res-overview {
  margin: 3px 0 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.res-actions-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.add-planned-btn {
  padding: 4px 8px;
  border-radius: 6px;
  background: #8b5cf6;
  color: #ffffff;
  border: none;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.add-watched-btn {
  padding: 4px 8px;
  border-radius: 6px;
  background: #10b981;
  color: #ffffff;
  border: none;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.already-added-pill {
  font-size: 11px;
  font-weight: 700;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Trending Grid */
.trending-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.trending-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.tr-poster-box {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #1e293b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tr-poster-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tr-type-pill {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 8px;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 4px;
  color: #ffffff;
  text-transform: uppercase;
}

.tr-add-overlay {
  position: absolute;
  right: 4px;
  bottom: 4px;
  background: rgba(15, 23, 42, 0.7);
  border-radius: 50%;
  color: #ffffff;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.tr-title {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tr-meta {
  font-size: 10px;
  color: #64748b;
}

/* REVIEW MODAL SPECIFICS */
.review-movie-preview {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
}

.review-thumb {
  width: 60px;
  height: 90px;
  border-radius: 8px;
  object-fit: cover;
}

.review-preview-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.review-preview-meta h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.review-preview-meta span {
  font-size: 11.5px;
  color: #64748b;
  margin-top: 2px;
}

.preview-desc-trunc {
  margin: 4px 0 0;
  font-size: 11px;
  color: #475569;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rating-picker-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  background: #faf5ff;
  border: 1px solid #f3e8ff;
  border-radius: 16px;
}

.rating-title-label {
  font-size: 13px;
  font-weight: 700;
  color: #6b21a8;
}

.rating-display-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.rating-big-num {
  font-size: 42px;
  font-weight: 900;
  color: #8b5cf6;
  line-height: 1;
}

.rating-big-scale {
  font-size: 16px;
  font-weight: 700;
  color: #a855f7;
}

.rating-descriptor {
  font-size: 14px;
  font-weight: 700;
  color: #475569;
  margin-left: 8px;
}

.stars-selector-row {
  display: flex;
  gap: 4px;
}

.star-score-btn {
  background: none;
  border: none;
  font-size: 26px;
  color: #cbd5e1;
  cursor: pointer;
  padding: 2px;
  transition: transform 0.15s ease;
}

.star-score-btn.active {
  color: #f59e0b;
}

.rating-quick-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.rating-chip-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
}

.rating-chip-btn.active {
  background: #8b5cf6;
  color: #ffffff;
  border-color: #8b5cf6;
}

.review-textarea-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.textarea-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.textarea-hint {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.review-textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
  color: #0f172a;
  outline: none;
  font-family: inherit;
  resize: vertical;
}

.review-textarea:focus {
  border-color: #8b5cf6;
}

.partner-existing-review-box {
  padding: 12px;
  background: #f1f5f9;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.partner-rev-title {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

.partner-rev-quote {
  margin: 0;
  font-size: 12px;
  color: #0f172a;
  font-style: italic;
}

.submit-review-btn {
  margin-top: 6px;
  width: 100%;
  padding: 14px;
  font-size: 15px;
}

/* RANDOM PICKER MODAL SPECIFICS */
.random-picker-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.random-filter-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.random-filter-pill {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}

.random-filter-pill.active {
  background: #f59e0b;
  color: #ffffff;
  border-color: #f59e0b;
}

.random-display-card {
  width: 100%;
  min-height: 240px;
  padding: 20px;
  background: #ffffff;
  border-radius: 20px;
  border: 2px dashed #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.spinning-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.dice-spin-anim {
  font-size: 56px;
  color: #f59e0b;
  animation: diceSpin 0.6s infinite ease-in-out;
}

@keyframes diceSpin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.15); }
  100% { transform: rotate(360deg) scale(1); }
}

.shuffle-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.winner-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: winnerPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes winnerPop {
  0% { transform: scale(0.85); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.winner-poster-box {
  width: 110px;
  height: 160px;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.winner-poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.winner-poster-empty {
  width: 100%;
  height: 100%;
  background: #1e293b;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.winner-type-pill {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  color: #ffffff;
  text-transform: uppercase;
}

.winner-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.winner-badge-pill {
  font-size: 12px;
  font-weight: 700;
  color: #f59e0b;
}

.winner-title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
}

.winner-details {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.winner-desc {
  margin: 6px 0 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.4;
  max-width: 320px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.random-prompt-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
}

.prompt-icon {
  font-size: 40px;
  color: #f59e0b;
}

.random-actions-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.spin-btn {
  width: 100%;
  max-width: 280px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  padding: 14px;
  font-size: 15px;
}

.winner-actions-row {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 340px;
}

.winner-action-btn {
  flex: 1;
  padding: 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  border: none;
}

.start-now-btn {
  background: #10b981;
  color: #ffffff;
}

.schedule-cal-btn {
  background: #e0e7ff;
  color: #4338ca;
}

.random-empty-warn {
  font-size: 12px;
  color: #ef4444;
  text-align: center;
}

/* MANUAL ADD FORM SPECIFICS */
.manual-form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.form-input {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
  color: #0f172a;
  outline: none;
}

.form-input:focus {
  border-color: #8b5cf6;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
  color: #0f172a;
  outline: none;
  font-family: inherit;
  resize: vertical;
}

.form-textarea:focus {
  border-color: #8b5cf6;
}

.form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.category-choice-row {
  display: flex;
  gap: 8px;
}

.choice-pill {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
}

.choice-pill.active {
  background: #8b5cf6;
  color: #ffffff;
  border-color: #8b5cf6;
}

.submit-manual-btn {
  width: 100%;
  padding: 14px;
  font-size: 15px;
  margin-top: 8px;
}

/* DETAILS MODAL SPECIFICS */
.details-body {
  padding: 0 0 20px;
}

.details-poster-backdrop {
  width: 100%;
  height: 180px;
  background: #0f172a;
  position: relative;
  overflow: hidden;
}

.details-backdrop-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.85;
}

.details-content-meta {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.details-pills-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.details-section-heading {
  margin: 8px 0 2px;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.details-full-desc {
  margin: 0;
  font-size: 13.5px;
  color: #1e293b;
  line-height: 1.5;
}

.details-genres-wrap {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.genre-pill {
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.details-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.details-action-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  border: none;
}

.date-btn {
  background: #e0e7ff;
  color: #4338ca;
}

.review-btn {
  background: #8b5cf6;
  color: #ffffff;
}

/* BUTTONS */
.dn-button-primary {
  background: #8b5cf6;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);
}

.dn-button-primary:active {
  transform: scale(0.97);
}
</style>

