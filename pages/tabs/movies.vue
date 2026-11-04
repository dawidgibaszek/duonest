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
        class="dn-movies-search-modal"
        @didDismiss="closeSearchModal"
      >
        <div class="dn-modal-container search-modal-layout">
          <!-- Premium Header -->
          <div class="search-modal-header">
            <div class="search-header-branding">
              <div class="header-glyph-box">
                <ion-icon :icon="ioniconsVideocamOutline" />
              </div>
              <div class="header-text-block">
                <div class="branding-tag-row">
                  <span class="tmdb-pill">TMDB</span>
                  <span class="catalog-live-pill">
                    <span class="live-dot"></span>
                    Katalog online
                  </span>
                </div>
                <h3 class="search-modal-heading">Wyszukaj seans</h3>
              </div>
            </div>
            <button
              type="button"
              class="modal-circle-close-btn"
              @click="closeSearchModal"
              aria-label="Zamknij"
            >
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <!-- Sticky Search Bar & Segment Controls -->
          <div class="search-controls-wrapper">
            <!-- Modern iOS Search Bar -->
            <div
              class="tmdb-search-input-box"
              :class="{ 'is-active': isSearchFocused || !!tmdbSearchQuery }"
            >
              <div class="search-icon-orb">
                <ion-icon :icon="ioniconsSearchOutline" />
              </div>
              <input
                ref="searchInputRef"
                v-model="tmdbSearchQuery"
                type="text"
                placeholder="Wpisz np. Incepcja, The Last of Us, Spirited Away..."
                class="tmdb-input"
                @focus="isSearchFocused = true"
                @blur="isSearchFocused = false"
                @input="onSearchInput"
                @keydown.enter.prevent="executeSearch"
              />
              <button
                v-if="tmdbSearchQuery"
                type="button"
                class="clear-btn"
                @click="clearSearch"
                aria-label="Wyczyść wyszukiwanie"
              >
                <ion-icon :icon="ioniconsCloseCircleOutline" />
              </button>
            </div>

            <!-- Segmented Category Pill Tabs -->
            <div class="search-category-tabs" data-no-swipe="true">
              <button
                v-for="cat in searchCategoryTabs"
                :key="cat.id"
                type="button"
                class="search-tab-pill"
                :class="{ active: searchCategory === cat.id }"
                @click="selectSearchCategory(cat.id)"
              >
                <span class="pill-emoji">{{ cat.emoji }}</span>
                <span class="pill-label">{{ cat.label }}</span>
              </button>
            </div>

            <!-- Sleek API Key Alert Banner (if needed) -->
            <div v-if="apiKeyWarning" class="api-key-warning-card">
              <div class="warning-icon-pill">
                <ion-icon :icon="ioniconsAlertCircleOutline" />
              </div>
              <div class="warning-text">
                <span class="warning-title">Klucz TMDB API</span>
                <span class="warning-desc">{{ apiKeyWarning }}</span>
              </div>
              <button type="button" class="warning-action-btn" @click="openApiKeyPrompt">
                Ustaw klucz
              </button>
            </div>
          </div>

          <!-- Modal Scrollable Content -->
          <div class="modal-scrollable-content search-results-scroll">
            <!-- Loading State with Pulsing Ring / Spinner -->
            <div v-if="isSearching" class="search-loading-state">
              <div class="spinner-pulse-ring">
                <ion-spinner name="crescent" class="loading-crescent" />
              </div>
              <span class="loading-title">Przeszukuję bazę TMDB...</span>
              <span class="loading-subtitle">Pobieram oceny, gatunki i oficjalne plakaty</span>
            </div>

            <!-- Error State -->
            <div v-else-if="searchError" class="search-error-state">
              <div class="error-icon-box">
                <ion-icon :icon="ioniconsAlertCircleOutline" />
              </div>
              <h4 class="error-title">Coś poszło nie tak</h4>
              <p class="error-desc">{{ searchError }}</p>
              <button type="button" class="retry-search-btn" @click="executeSearch">
                Spróbuj ponownie
              </button>
            </div>

            <!-- Live Search Results -->
            <div v-else-if="searchResults.length > 0" class="search-results-list">
              <div class="results-header-bar">
                <span class="results-count-title">
                  Wyniki wyszukiwania
                  <span class="count-bubble">{{ searchResults.length }}</span>
                </span>
                <button
                  type="button"
                  class="results-manual-link"
                  @click="openManualAddWithTitle(tmdbSearchQuery)"
                >
                  Nie ma na liście? Dodaj ręcznie &rarr;
                </button>
              </div>

              <!-- Card for each TMDB result -->
              <div
                v-for="res in searchResults"
                :key="res.tmdb_id"
                class="search-result-card"
              >
                <!-- High-Res Poster Thumbnail with Type Badge -->
                <div class="res-thumb-container">
                  <img
                    v-if="res.poster_path"
                    :src="res.poster_path"
                    :alt="res.title"
                    class="res-thumb-img"
                    loading="lazy"
                  />
                  <div v-else class="res-thumb-fallback">
                    <ion-icon :icon="ioniconsFilmOutline" />
                  </div>
                  <span class="res-type-pill" :class="'type-' + res.media_type">
                    {{ getMediaTypeLabel(res.media_type) }}
                  </span>
                </div>

                <!-- Media Details -->
                <div class="res-meta-col">
                  <!-- Title Row -->
                  <div class="res-header-row">
                    <h4 class="res-main-title">{{ res.title }}</h4>
                    <span v-if="res.original_title && res.original_title !== res.title" class="res-orig-title">
                      {{ res.original_title }}
                    </span>
                  </div>

                  <!-- Badges & Ratings -->
                  <div class="res-badges-line">
                    <span v-if="res.release_year" class="meta-year-badge">
                      {{ res.release_year }}
                    </span>
                    <span v-if="res.vote_average" class="meta-rating-badge">
                      <ion-icon :icon="ioniconsStar" class="star-icon" />
                      {{ res.vote_average }}
                    </span>
                    <span v-if="res.genres && res.genres.length > 0" class="meta-genre-badge">
                      {{ res.genres.slice(0, 2).join(' • ') }}
                    </span>
                  </div>

                  <!-- Brief Synopsis Overview -->
                  <p v-if="res.overview" class="res-synopsis">
                    {{ res.overview }}
                  </p>

                  <!-- Action Buttons -->
                  <div class="res-actions-bar">
                    <template v-if="!isAlreadyInList(res.tmdb_id)">
                      <button
                        type="button"
                        class="action-pill-btn btn-plan"
                        @click="addFromTmdb(res, 'planned')"
                      >
                        <ion-icon :icon="ioniconsBookmarkOutline" />
                        <span>Chcę obejrzeć</span>
                      </button>
                      <button
                        type="button"
                        class="action-pill-btn btn-watched"
                        @click="addFromTmdb(res, 'watched')"
                      >
                        <ion-icon :icon="ioniconsCheckmarkCircleOutline" />
                        <span>Obejrzane</span>
                      </button>
                    </template>
                    <div v-else class="already-added-indicator">
                      <ion-icon :icon="ioniconsCheckmarkCircle" />
                      <span>Na Waszej liście seansów</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Zero Query / Trending Section -->
            <div v-else-if="!tmdbSearchQuery" class="trending-section">
              <div class="trending-header-bar">
                <div class="trending-title-group">
                  <div class="flame-badge">
                    <ion-icon :icon="ioniconsFlame" />
                  </div>
                  <div>
                    <h4 class="trending-heading">Popularne w tym tygodniu</h4>
                    <p class="trending-subheading">Hity i nowości według bazy The Movie Database</p>
                  </div>
                </div>
              </div>

              <!-- Trending Grid Cards -->
              <div v-if="trendingList.length > 0" class="trending-posters-grid">
                <div
                  v-for="tr in trendingList"
                  :key="tr.tmdb_id"
                  class="trending-item-card"
                  @click="addFromTmdb(tr, 'planned')"
                >
                  <div class="tr-poster-wrapper">
                    <img
                      v-if="tr.poster_path"
                      :src="tr.poster_path"
                      :alt="tr.title"
                      class="tr-poster-img"
                      loading="lazy"
                    />
                    <div v-else class="tr-poster-empty">
                      <ion-icon :icon="ioniconsFilmOutline" />
                    </div>

                    <!-- Top Glass Tags -->
                    <div class="tr-top-glass-tags">
                      <span v-if="tr.vote_average" class="tr-glass-score">
                        ⭐ {{ tr.vote_average }}
                      </span>
                      <span class="tr-glass-type" :class="'type-' + tr.media_type">
                        {{ getMediaTypeLabel(tr.media_type) }}
                      </span>
                    </div>

                    <!-- Add Quick Action Button Overlay -->
                    <div
                      class="tr-add-hover-btn"
                      :class="{ 'is-added': isAlreadyInList(tr.tmdb_id) }"
                    >
                      <ion-icon
                        :icon="isAlreadyInList(tr.tmdb_id) ? ioniconsCheckmarkOutline : ioniconsAddOutline"
                      />
                    </div>
                  </div>

                  <!-- Text details -->
                  <div class="tr-caption-box">
                    <span class="tr-title-text">{{ tr.title }}</span>
                    <span class="tr-meta-text">
                      {{ tr.release_year || 'Nowość' }}
                      <span v-if="isAlreadyInList(tr.tmdb_id)" class="tr-on-list-tag">✓ Na liście</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Trending Fallback Note if empty -->
              <div v-else class="trending-placeholder-note">
                <div class="note-icon-wrap">
                  <ion-icon :icon="ioniconsSearchOutline" />
                </div>
                <p>Wpisz powyżej tytuł dowolnego filmu, anime lub serialu, aby rozpocząć wyszukiwanie!</p>
              </div>
            </div>

            <!-- Query typed, but 0 results found -->
            <div v-else class="no-results-state">
              <div class="no-results-icon-orb">
                <ion-icon :icon="ioniconsFilmOutline" />
              </div>
              <h4 class="no-results-title">Brak wyników dla "{{ tmdbSearchQuery }}"</h4>
              <p class="no-results-desc">
                Nie znaleziono takiego tytułu w bazie TMDB. Możesz wpisać inną frazę lub dodać go ręcznie do Waszej listy.
              </p>
              <button
                type="button"
                class="dn-button-primary add-manual-from-search-btn"
                @click="openManualAddWithTitle(tmdbSearchQuery)"
              >
                <ion-icon :icon="ioniconsAddCircleOutline" />
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
        :breakpoints="[0, 0.95, 1]"
        :initial-breakpoint="0.95"
        handle-behavior="cycle"
        class="dn-movies-random-modal"
        @didDismiss="closeRandomModal"
      >
        <div class="dn-modal-container random-modal-layout">
          <!-- Header -->
          <div class="random-modal-header">
            <div class="random-header-branding">
              <div class="header-glyph-box glyph-amber">
                <ion-icon :icon="ioniconsDice" />
              </div>
              <div class="header-text-block">
                <span class="random-brand-badge">Ruletka filmowa</span>
                <h3 class="random-modal-heading">Co oglądamy dzisiaj?</h3>
              </div>
            </div>
            <button
              type="button"
              class="modal-circle-close-btn"
              @click="closeRandomModal"
              aria-label="Zamknij"
            >
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <!-- Modal Scrollable Content -->
          <div class="modal-scrollable-content random-picker-scroll">
            <!-- 1. Source Choice Segmented Control (Z Waszej listy vs Odkrywaj z TMDB) -->
            <div class="random-source-tabs" data-no-swipe="true">
              <button
                type="button"
                class="source-tab-pill"
                :class="{ active: randomSource === 'list' }"
                @click="randomSource = 'list'; selectedRandomMovie = null; randomError = ''"
              >
                <ion-icon :icon="ioniconsBookmarkOutline" />
                <span>Z Waszej listy</span>
                <span class="source-count-tag">{{ plannedCandidatesAll.length }}</span>
              </button>

              <button
                type="button"
                class="source-tab-pill"
                :class="{ active: randomSource === 'tmdb' }"
                @click="randomSource = 'tmdb'; selectedRandomMovie = null; randomError = ''"
              >
                <ion-icon :icon="ioniconsGlobeOutline" />
                <span>Baza TMDB ✨</span>
              </button>
            </div>

            <!-- 2. Filters for 'list' source -->
            <div v-if="randomSource === 'list'" class="source-filters-box">
              <div class="filters-sub-label">
                <span>Filtruj wg typu seansu:</span>
              </div>
              <div class="random-filter-row" data-no-swipe="true">
                <button
                  v-for="opt in randomFilterOptions"
                  :key="opt.id"
                  type="button"
                  class="random-filter-pill"
                  :class="{ active: randomFilterType === opt.id }"
                  @click="randomFilterType = opt.id; selectedRandomMovie = null"
                >
                  <span>{{ opt.emoji }} {{ opt.label }}</span>
                </button>
              </div>

              <!-- Available count badge -->
              <div class="available-counter-bar">
                <span v-if="plannedCandidates.length > 0">
                  Dostępnych seansów do wylosowania: <strong>{{ plannedCandidates.length }}</strong>
                </span>
                <span v-else class="empty-warn-text">
                  Brak zapisanych seansów w tej kategorii.
                </span>
              </div>
            </div>

            <!-- 3. Filters for 'tmdb' source -->
            <div v-else class="source-filters-box tmdb-filters-box">
              <!-- Type -->
              <div class="filters-sub-label">
                <span>Kategoria:</span>
              </div>
              <div class="random-filter-row" data-no-swipe="true">
                <button
                  v-for="opt in randomFilterOptions"
                  :key="opt.id"
                  type="button"
                  class="random-filter-pill"
                  :class="{ active: randomFilterType === opt.id }"
                  @click="randomFilterType = opt.id; selectedRandomMovie = null"
                >
                  <span>{{ opt.emoji }} {{ opt.label }}</span>
                </button>
              </div>

              <!-- Genre -->
              <div class="filters-sub-label">
                <span>Gatunek filmu lub serialu:</span>
              </div>
              <div class="random-genres-scroll" data-no-swipe="true">
                <button
                  v-for="g in randomGenreOptions"
                  :key="g.id"
                  type="button"
                  class="genre-chip-btn"
                  :class="{ active: randomGenre === g.id }"
                  @click="randomGenre = g.id; selectedRandomMovie = null"
                >
                  <span class="genre-emoji">{{ g.emoji }}</span>
                  <span>{{ g.label }}</span>
                </button>
              </div>

              <!-- Min rating -->
              <div class="filters-sub-label">
                <span>Minimalna ocena:</span>
              </div>
              <div class="random-ratings-row" data-no-swipe="true">
                <button
                  v-for="r in randomRatingOptions"
                  :key="r.val"
                  type="button"
                  class="rating-filter-pill"
                  :class="{ active: randomMinRating === r.val }"
                  @click="randomMinRating = r.val; selectedRandomMovie = null"
                >
                  {{ r.label }}
                </button>
              </div>
            </div>

            <!-- 4. Shuffler / Winner Card Display -->
            <div class="random-display-card dn-card">
              <!-- Spinning State -->
              <div v-if="isSpinning" class="spinning-state">
                <div class="spinning-dice-orb">
                  <ion-icon :icon="ioniconsDice" class="dice-spin-anim" />
                </div>
                <h4 class="spinning-header">Losuję seans...</h4>
                <div class="shuffle-title-badge">
                  <span>{{ currentShuffleTitle }}</span>
                </div>
              </div>

              <!-- Winner State -->
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
                  <div class="winner-badge-pill">
                    <ion-icon :icon="ioniconsSparkles" />
                    <span>Dziś wieczorem oglądacie:</span>
                  </div>
                  <h3 class="winner-title">{{ selectedRandomMovie.title }}</h3>
                  <div class="winner-tags-row">
                    <span v-if="selectedRandomMovie.release_year" class="winner-year">
                      {{ selectedRandomMovie.release_year }}
                    </span>
                    <span v-if="selectedRandomMovie.vote_average" class="winner-score">
                      ⭐ {{ selectedRandomMovie.vote_average }} (TMDB)
                    </span>
                    <span v-if="selectedRandomMovie.genres && selectedRandomMovie.genres.length > 0" class="winner-genre">
                      {{ selectedRandomMovie.genres.slice(0, 2).join(' • ') }}
                    </span>
                  </div>
                  <p v-if="selectedRandomMovie.overview" class="winner-desc">
                    {{ selectedRandomMovie.overview }}
                  </p>

                  <div v-if="isAlreadyInList(selectedRandomMovie.tmdb_id)" class="winner-already-note">
                    <ion-icon :icon="ioniconsCheckmarkCircle" />
                    <span>Znajduje się już na Waszej liście</span>
                  </div>
                </div>
              </div>

              <!-- Error State -->
              <div v-else-if="randomError" class="random-error-state">
                <ion-icon :icon="ioniconsAlertCircleOutline" class="error-glyph" />
                <h4>Brak wyników</h4>
                <p>{{ randomError }}</p>
              </div>

              <!-- Initial Prompt State -->
              <div v-else class="random-prompt-state">
                <div class="prompt-orb-glow">
                  <ion-icon :icon="ioniconsSparkles" class="prompt-icon" />
                </div>
                <h4>Nie możecie się zdecydować?</h4>
                <p v-if="randomSource === 'list'">
                  Kliknij przycisk poniżej, a DuoNest wylosuje idealną propozycję z Waszej listy planowanych seansów!
                </p>
                <p v-else>
                  Kliknij przycisk poniżej, a DuoNest wylosuje niespodziankę z bazy TMDB z wybranego gatunku!
                </p>
              </div>
            </div>

            <!-- 5. Spin and Action Buttons Footer -->
            <div class="random-actions-footer">
              <!-- Spin Trigger Button -->
              <button
                type="button"
                class="dn-button-primary spin-main-btn"
                :disabled="isSpinning || (randomSource === 'list' && plannedCandidates.length === 0)"
                @click="spinRandomMovie"
              >
                <ion-icon :icon="ioniconsDice" />
                <span>{{ selectedRandomMovie ? 'Wylosuj inny seans' : 'Wylosuj seans!' }}</span>
              </button>

              <!-- Winner Actions Bar -->
              <div v-if="selectedRandomMovie && !isSpinning" class="winner-actions-grid">
                <!-- Action 1: Oglądamy ten! -->
                <button
                  type="button"
                  class="winner-btn btn-watch-now"
                  @click="acceptRandomMovie(selectedRandomMovie)"
                >
                  <ion-icon :icon="ioniconsPlayCircle" />
                  <span>Oglądamy ten!</span>
                </button>

                <!-- Action 2: Jeśli z TMDB i brak na liście -> Chcę obejrzeć / Zapisz -->
                <button
                  v-if="!isAlreadyInList(selectedRandomMovie.tmdb_id)"
                  type="button"
                  class="winner-btn btn-save-list"
                  @click="addRandomToPlanned(selectedRandomMovie)"
                >
                  <ion-icon :icon="ioniconsBookmarkOutline" />
                  <span>Zapisz na listę</span>
                </button>

                <!-- Action 3: Zaplanuj w Terminarzu -->
                <button
                  type="button"
                  class="winner-btn btn-plan-date"
                  @click="scheduleMovieDate(selectedRandomMovie)"
                >
                  <ion-icon :icon="ioniconsCalendar" />
                  <span>Randka w Terminarzu</span>
                </button>
              </div>

              <!-- Warning if list empty -->
              <div v-if="randomSource === 'list' && plannedCandidates.length === 0" class="empty-list-switch-box">
                <p>Nie macie żadnych planowanych filmów w tej kategorii.</p>
                <button
                  type="button"
                  class="switch-to-tmdb-btn"
                  @click="randomSource = 'tmdb'"
                >
                  Wylosuj z całej bazy TMDB &rarr;
                </button>
              </div>
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
const isSearchFocused = ref(false)
const searchError = ref('')
const searchResults = ref<any[]>([])
const trendingList = ref<any[]>([])
const apiKeyWarning = ref('')

const searchCategoryTabs = [
  { id: 'all', label: 'Wszystko', emoji: '🍿' },
  { id: 'movie', label: 'Filmy', emoji: '🎬' },
  { id: 'tv', label: 'Seriale', emoji: '📺' },
  { id: 'anime', label: 'Anime', emoji: '⛩️' }
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
const randomSource = ref<'list' | 'tmdb'>('list')
const randomFilterType = ref<'all' | 'movie' | 'tv' | 'anime'>('all')
const randomGenre = ref<string>('all')
const randomMinRating = ref<number>(0)
const isSpinning = ref(false)
const currentShuffleTitle = ref('')
const selectedRandomMovie = ref<any | null>(null)
const randomError = ref('')

const randomFilterOptions = [
  { id: 'all', label: 'Wszystko', emoji: '🍿' },
  { id: 'movie', label: 'Tylko filmy', emoji: '🎬' },
  { id: 'tv', label: 'Tylko seriale', emoji: '📺' },
  { id: 'anime', label: 'Tylko anime', emoji: '⛩️' }
] as const

const randomGenreOptions = [
  { id: 'all', label: 'Dowolny gatunek', emoji: '🍿' },
  { id: 'action', label: 'Akcja', emoji: '💥' },
  { id: 'comedy', label: 'Komedia', emoji: '😂' },
  { id: 'horror', label: 'Horror', emoji: '👻' },
  { id: 'romance', label: 'Romans', emoji: '❤️' },
  { id: 'scifi', label: 'Sci-Fi', emoji: '🚀' },
  { id: 'drama', label: 'Dramat', emoji: '🎭' },
  { id: 'thriller', label: 'Thriller', emoji: '🕵️‍♂️' },
  { id: 'animation', label: 'Animacja', emoji: '🎨' },
  { id: 'adventure', label: 'Przygoda', emoji: '🗺️' },
  { id: 'crime', label: 'Kryminał', emoji: '🔍' },
  { id: 'fantasy', label: 'Fantasy', emoji: '🧙‍♂️' },
  { id: 'family', label: 'Familijny', emoji: '🧸' },
  { id: 'documentary', label: 'Dokument', emoji: '🎥' }
] as const

const randomRatingOptions = [
  { val: 0, label: '⭐ Dowolna ocena' },
  { val: 6.5, label: '⭐ 6.5+ (Dobre)' },
  { val: 7.5, label: '⭐ 7.5+ (Bardzo dobre)' },
  { val: 8.0, label: '⭐ 8.0+ (Hity & Klasyki)' }
] as const

const plannedCandidatesAll = computed(() => {
  return moviesList.value.filter(m => m.status === 'planned')
})

const plannedCandidates = computed(() => {
  let list = moviesList.value.filter(m => m.status === 'planned')
  if (randomFilterType.value !== 'all') {
    list = list.filter(m => m.media_type === randomFilterType.value)
  }
  return list
})

const openRandomPickerModal = () => {
  selectedRandomMovie.value = null
  randomError.value = ''
  isSpinning.value = false
  isRandomModalOpen.value = true
}

const closeRandomModal = () => {
  isRandomModalOpen.value = false
  selectedRandomMovie.value = null
  isSpinning.value = false
  randomError.value = ''
}

const spinRandomMovie = async () => {
  randomError.value = ''
  selectedRandomMovie.value = null

  if (randomSource.value === 'list') {
    const candidates = plannedCandidates.value
    if (candidates.length === 0) return

    isSpinning.value = true

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
  } else {
    // TMDB Random Discover with filters
    isSpinning.value = true
    currentShuffleTitle.value = 'Przeszukuję bazę TMDB...'

    const tempTitles = [
      'Przeszukuję bazę TMDB...',
      'Filtruję gatunki...',
      'Wybieram najwyżej oceniane...',
      'Sprawdzam recenzje...',
      'Przygotowuję niespodziankę...'
    ]
    let tIdx = 0
    const fetchInterval = setInterval(() => {
      currentShuffleTitle.value = tempTitles[tIdx % tempTitles.length]
      tIdx++
    }, 250)

    try {
      const customKey = getStoredTmdbApiKey()
      const params = new URLSearchParams({
        type: randomFilterType.value,
        genre: randomGenre.value,
        minRating: String(randomMinRating.value)
      })
      if (customKey) params.set('apiKey', customKey)

      const res = await $fetch<any>(`/api/movies/random?${params.toString()}`)
      clearInterval(fetchInterval)

      if (!res.success || !res.winner) {
        isSpinning.value = false
        randomError.value = res.message || 'Nie udało się wylosować seansu z bazy TMDB.'
        return
      }

      // Fast flickering through candidate pool
      const pool = res.pool && res.pool.length > 0 ? res.pool : [res.winner]
      let counter = 0
      const maxShuffle = 12
      const shuffleInterval = setInterval(() => {
        const item = pool[counter % pool.length]
        currentShuffleTitle.value = item.title
        counter++
        if (counter >= maxShuffle) {
          clearInterval(shuffleInterval)
          selectedRandomMovie.value = res.winner
          isSpinning.value = false

          try {
            confetti({
              particleCount: 65,
              spread: 85,
              origin: { y: 0.6 }
            })
          } catch {}
        }
      }, 90)
    } catch (err: any) {
      clearInterval(fetchInterval)
      isSpinning.value = false
      randomError.value = 'Wystąpił błąd podczas losowania z bazy TMDB.'
    }
  }
}

const acceptRandomMovie = async (movie: any) => {
  if (movie.id) {
    await toggleMovieStatus(movie, 'watching')
  } else {
    await addMovie({
      title: movie.title,
      original_title: movie.original_title,
      tmdb_id: movie.tmdb_id,
      media_type: movie.media_type || 'movie',
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      release_year: movie.release_year,
      genres: movie.genres,
      overview: movie.overview,
      vote_average: movie.vote_average,
      status: 'watching'
    })
    triggerToast(`Dodano seans "${movie.title}" jako oglądany! 🍿`, {
      type: 'movies',
      title: 'Kino we dwoje'
    })
  }

  try {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 }
    })
  } catch {}

  closeRandomModal()
}

const addRandomToPlanned = async (movie: any) => {
  if (isAlreadyInList(movie.tmdb_id)) {
    triggerToast(`Film "${movie.title}" jest już na Waszej liście!`, {
      type: 'movies',
      title: 'Kino we dwoje'
    })
    return
  }

  await addMovie({
    title: movie.title,
    original_title: movie.original_title,
    tmdb_id: movie.tmdb_id,
    media_type: movie.media_type || 'movie',
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    release_year: movie.release_year,
    genres: movie.genres,
    overview: movie.overview,
    vote_average: movie.vote_average,
    status: 'planned'
  })

  triggerToast(`Zapisano "${movie.title}" do Waszej listy planowanych seansów! 📌`, {
    type: 'movies',
    title: 'Kino we dwoje'
  })

  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.85 }
    })
  } catch {}
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

const scheduleMovieDate = async (movie: any) => {
  // If drawn from TMDB and not yet saved in list, save it first as planned
  if (!movie.id && movie.tmdb_id && !isAlreadyInList(movie.tmdb_id)) {
    await addMovie({
      title: movie.title,
      original_title: movie.original_title,
      tmdb_id: movie.tmdb_id,
      media_type: movie.media_type || 'movie',
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      release_year: movie.release_year,
      genres: movie.genres,
      overview: movie.overview,
      vote_average: movie.vote_average,
      status: 'planned'
    })
  }

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

/* ========================================================== */
/* TMDB SEARCH MODAL (PREMIUM IOS BOTTOM SHEET) */
/* ========================================================== */
ion-modal.dn-movies-search-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.16);
}

.search-modal-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  overflow: hidden;
}

.search-modal-header {
  padding: 16px 18px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid rgba(241, 245, 249, 0.9);
}

.search-header-branding {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-glyph-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 22px;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.28);
  flex-shrink: 0;
}

.header-text-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.branding-tag-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tmdb-pill {
  background: #01b4e4;
  color: #ffffff;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.catalog-live-pill {
  background: #f1f5f9;
  color: #475569;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.search-modal-heading {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.modal-circle-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f1f5f9;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.modal-circle-close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.modal-circle-close-btn:active {
  transform: scale(0.92);
}

/* Sticky Search Bar & Segment Controls */
.search-controls-wrapper {
  padding: 12px 18px 10px;
  background: #ffffff;
  border-bottom: 1px solid #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.tmdb-search-input-box {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

.tmdb-search-input-box.is-active {
  border-color: #8b5cf6;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.12), 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.search-icon-orb {
  position: absolute;
  left: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #8b5cf6;
  pointer-events: none;
}

.tmdb-input {
  width: 100%;
  padding: 13px 40px 13px 44px;
  border: none;
  background: transparent;
  font-size: 14.5px;
  font-weight: 600;
  color: #0f172a;
  outline: none;
}

.tmdb-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}

.clear-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 21px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  touch-action: manipulation;
  transition: color 0.15s ease, transform 0.15s ease;
}

.clear-btn:hover {
  color: #64748b;
}

.clear-btn:active {
  transform: scale(0.9);
}

.search-category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.search-category-tabs::-webkit-scrollbar {
  display: none;
}

.search-tab-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.search-tab-pill .pill-emoji {
  font-size: 13px;
  line-height: 1;
}

.search-tab-pill:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.search-tab-pill:active {
  transform: scale(0.95);
}

.search-tab-pill.active {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.32);
}

/* API Key Warning */
.api-key-warning-card {
  padding: 10px 14px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #92400e;
}

.warning-icon-pill {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #d97706;
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
  color: #92400e;
}

.warning-desc {
  font-size: 11px;
  color: #b45309;
}

.warning-action-btn {
  padding: 6px 12px;
  background: #f59e0b;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.15s ease, background 0.15s ease;
}

.warning-action-btn:active {
  transform: scale(0.94);
}

/* Scrollable Content Container */
.search-results-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-overflow-scrolling: touch;
}

/* Loading State */
.search-loading-state {
  padding: 48px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.spinner-pulse-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #f5f3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 6px rgba(139, 92, 246, 0.08);
}

.loading-crescent {
  color: #8b5cf6;
  width: 28px;
  height: 28px;
}

.loading-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.loading-subtitle {
  font-size: 12px;
  color: #64748b;
  max-width: 240px;
}

/* Error State */
.search-error-state {
  padding: 40px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.error-icon-box {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #fef2f2;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}

.error-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.error-desc {
  margin: 0;
  font-size: 12.5px;
  color: #64748b;
  max-width: 280px;
}

.retry-search-btn {
  margin-top: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.retry-search-btn:active {
  transform: scale(0.95);
}

/* Results List */
.search-results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2px;
  margin-bottom: 2px;
}

.results-count-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.count-bubble {
  background: #8b5cf6;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 999px;
}

.results-manual-link {
  background: none;
  border: none;
  color: #8b5cf6;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 4px;
}

.results-manual-link:hover {
  text-decoration: underline;
}

/* SEARCH RESULT CARD */
.search-result-card {
  display: flex;
  gap: 14px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 18px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.search-result-card:active {
  transform: scale(0.99);
}

.res-thumb-container {
  width: 82px;
  min-width: 82px;
  aspect-ratio: 2 / 3;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #0f172a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
}

.res-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.res-thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 28px;
  background: #1e293b;
}

.res-type-pill {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 5px;
  color: #ffffff;
  letter-spacing: 0.4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.res-meta-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.res-header-row {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.res-main-title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}

.res-orig-title {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.res-badges-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 2px 0;
}

.meta-year-badge {
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
}

.meta-rating-badge {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fef3c7;
  font-size: 11px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.meta-rating-badge .star-icon {
  color: #f59e0b;
  font-size: 12px;
}

.meta-genre-badge {
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.res-synopsis {
  margin: 2px 0 6px;
  font-size: 11.5px;
  color: #475569;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.res-actions-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.action-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 10px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.action-pill-btn:active {
  transform: scale(0.94);
}

.action-pill-btn.btn-plan {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.28);
}

.action-pill-btn.btn-watched {
  background: #ecfdf5;
  color: #059669;
  border: 1.5px solid #a7f3d0;
}

.already-added-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #bbf7d0;
  font-size: 11px;
  font-weight: 700;
}

.already-added-indicator ion-icon {
  font-size: 15px;
}

/* Trending Section */
.trending-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.trending-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.trending-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.flame-badge {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.28);
  flex-shrink: 0;
}

.trending-heading {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.trending-subheading {
  margin: 1px 0 0;
  font-size: 11.5px;
  color: #64748b;
}

.trending-posters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.trending-item-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s ease;
}

.trending-item-card:active {
  transform: scale(0.96);
}

.tr-poster-wrapper {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  background: #0f172a;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.tr-poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tr-poster-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 24px;
  background: #1e293b;
}

.tr-top-glass-tags {
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
}

.tr-glass-score {
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 6px;
  color: #fbbf24;
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tr-glass-type {
  font-size: 8px;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 6px;
  text-transform: uppercase;
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.tr-add-hover-btn {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  transition: all 0.15s ease;
}

.tr-add-hover-btn.is-added {
  background: #10b981;
  color: #ffffff;
}

.tr-caption-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tr-title-text {
  font-size: 11.5px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tr-meta-text {
  font-size: 10.5px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tr-on-list-tag {
  color: #10b981;
  font-weight: 700;
}

.trending-placeholder-note {
  padding: 36px 16px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  color: #64748b;
}

.note-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #8b5cf6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* No Results State */
.no-results-state {
  padding: 44px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.no-results-icon-orb {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
  color: #8b5cf6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.15);
}

.no-results-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.no-results-desc {
  margin: 0;
  font-size: 12.5px;
  color: #64748b;
  max-width: 290px;
  line-height: 1.4;
}

.add-manual-from-search-btn {
  margin-top: 4px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 380px) {
  .search-result-card {
    gap: 10px;
    padding: 10px;
  }
  .res-thumb-container {
    width: 72px;
    min-width: 72px;
  }
  .action-pill-btn {
    padding: 6px 9px;
    font-size: 10.5px;
  }
  .trending-posters-grid {
    gap: 8px;
  }
}

@media (max-width: 340px) {
  .trending-posters-grid {
    grid-template-columns: repeat(2, 1fr);
  }
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
  background: #faf5ff;
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

/* ========================================================== */
/* RANDOM PICKER MODAL (CO OGLĄDAMY DZIŚ?) */
/* ========================================================== */
ion-modal.dn-movies-random-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.16);
}

.random-modal-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  overflow: hidden;
}

.random-modal-header {
  padding: 16px 18px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid rgba(241, 245, 249, 0.9);
}

.random-header-branding {
  display: flex;
  align-items: center;
  gap: 12px;
}

.glyph-amber {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.28) !important;
}

.random-brand-badge {
  background: #fef3c7;
  color: #b45309;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: inline-block;
  line-height: 1.2;
}

.random-modal-heading {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.random-picker-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-overflow-scrolling: touch;
}

/* Source Choice Segmented Control */
.random-source-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 14px;
}

.source-tab-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.source-tab-pill ion-icon {
  font-size: 16px;
}

.source-tab-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  font-weight: 800;
}

.source-count-tag {
  background: #e2e8f0;
  color: #475569;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}

.source-tab-pill.active .source-count-tag {
  background: #fef3c7;
  color: #b45309;
}

/* Filters Containers */
.source-filters-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filters-sub-label {
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-top: 2px;
}

.random-filter-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.random-filter-row::-webkit-scrollbar {
  display: none;
}

.random-filter-pill {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.random-filter-pill:active {
  transform: scale(0.95);
}

.random-filter-pill.active {
  background: #f59e0b;
  color: #ffffff;
  border-color: #f59e0b;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.available-counter-bar {
  font-size: 11.5px;
  color: #64748b;
  margin-top: 2px;
}

.available-counter-bar strong {
  color: #0f172a;
}

.empty-warn-text {
  color: #dc2626;
  font-weight: 600;
}

/* TMDB Specific Genre & Rating Filters */
.random-genres-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.random-genres-scroll::-webkit-scrollbar {
  display: none;
}

.genre-chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.genre-chip-btn:active {
  transform: scale(0.95);
}

.genre-chip-btn.active {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.random-ratings-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.random-ratings-row::-webkit-scrollbar {
  display: none;
}

.rating-filter-pill {
  padding: 5px 10px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  font-size: 11.5px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.rating-filter-pill:active {
  transform: scale(0.95);
}

.rating-filter-pill.active {
  background: #fffbeb;
  color: #b45309;
  border-color: #f59e0b;
  font-weight: 800;
}

/* Shuffler / Winner Card */
.random-display-card {
  width: 100%;
  min-height: 250px;
  padding: 20px 16px;
  background: #ffffff;
  border-radius: 20px;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
}

/* Spinning State */
.spinning-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinning-dice-orb {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  color: #d97706;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.25);
}

.dice-spin-anim {
  animation: diceSpin 0.7s infinite ease-in-out;
}

@keyframes diceSpin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.15); }
  100% { transform: rotate(360deg) scale(1); }
}

.spinning-header {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.shuffle-title-badge {
  padding: 6px 14px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 800;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Winner State */
.winner-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: winnerPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  width: 100%;
}

@keyframes winnerPop {
  0% { transform: scale(0.85); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.winner-poster-box {
  width: 120px;
  height: 175px;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
  background: #0f172a;
}

.winner-poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.winner-poster-empty {
  width: 100%;
  height: 100%;
  background: #1e293b;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
}

.winner-type-pill {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 5px;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.winner-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.winner-badge-pill {
  font-size: 12px;
  font-weight: 800;
  color: #d97706;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.winner-title {
  margin: 2px 0 0;
  font-size: 19px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.25;
}

.winner-tags-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 4px 0 2px;
}

.winner-year {
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
}

.winner-score {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid #fef3c7;
  font-size: 11px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 6px;
}

.winner-genre {
  color: #64748b;
  font-size: 11.5px;
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

.winner-already-note {
  margin-top: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #059669;
}

/* Prompt State */
.random-prompt-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #64748b;
  padding: 16px;
}

.prompt-orb-glow {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.2);
}

.random-prompt-state h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.random-prompt-state p {
  margin: 0;
  font-size: 12.5px;
  max-width: 290px;
  line-height: 1.4;
}

/* Error State in Randomizer */
.random-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #64748b;
  padding: 20px;
}

.error-glyph {
  font-size: 40px;
  color: #ef4444;
}

.random-error-state h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.random-error-state p {
  margin: 0;
  font-size: 12.5px;
  max-width: 280px;
}

/* Footer & Buttons */
.random-actions-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spin-main-btn {
  width: 100%;
  max-width: 320px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  padding: 14px;
  font-size: 15px;
  font-weight: 800;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.32);
}

.winner-actions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  max-width: 380px;
  justify-content: center;
}

.winner-btn {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 12.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  border: none;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.winner-btn:active {
  transform: scale(0.95);
}

.btn-watch-now {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28);
  flex: 1 1 130px;
}

.btn-save-list {
  background: #f5f3ff;
  color: #7c3aed;
  border: 1.5px solid #ddd6fe;
  flex: 1 1 120px;
}

.btn-plan-date {
  background: #e0e7ff;
  color: #4338ca;
  border: 1.5px solid #c7d2fe;
  flex: 1 1 140px;
}

.empty-list-switch-box {
  padding: 12px;
  background: #fffbeb;
  border: 1px dashed #fde68a;
  border-radius: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-list-switch-box p {
  margin: 0;
  font-size: 12px;
  color: #92400e;
}

.switch-to-tmdb-btn {
  background: none;
  border: none;
  color: #d97706;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  padding: 2px 4px;
}

.switch-to-tmdb-btn:hover {
  text-decoration: underline;
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

