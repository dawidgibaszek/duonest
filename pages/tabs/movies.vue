<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div class="dn-header-title">
              <span>Filmy</span>
              <span class="count-chip" v-if="plannedCount > 0">{{ plannedCount }}</span>
            </div>
            <button
              type="button"
              class="dn-header-btn dn-header-btn--icon"
              aria-label="Dodaj film lub serial"
              @click="openSearchModal"
            >
              <ion-icon :icon="ioniconsAddOutline" />
            </button>
          </div>
        </div>
      </ion-toolbar>

      <!-- MAIN TABS: Filmy & Seriale vs Wishlista -->
      <ion-toolbar class="main-tabs-toolbar" data-no-swipe>
        <div class="main-tabs-pill-row">
          <button
            type="button"
            class="main-tab-pill active"
          >
            <ion-icon :icon="ioniconsFilmOutline" />
            <span>Filmy i seriale</span>
            <span class="pill-count-chip" v-if="plannedCount > 0">{{ plannedCount }}</span>
          </button>

          <button
            type="button"
            class="main-tab-pill"
            @click="switchToWishlist"
          >
            <ion-icon :icon="ioniconsGiftOutline" />
            <span>Lista życzeń</span>
            <span class="pill-count-chip" v-if="uncompletedWishlistCount > 0">{{ uncompletedWishlistCount }}</span>
          </button>
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
        <!-- CINEMA HUB CARD -->
        <div class="cinema-hub-card">
          <!-- Main Search Trigger Bar -->
          <div class="cinema-search-trigger" @click="openSearchModal" role="button" tabindex="0">
            <div class="search-trigger-content">
              <div class="search-trigger-icon">
                <ion-icon :icon="ioniconsSearchOutline" />
              </div>
              <div class="search-trigger-text">
                <span class="trigger-label">Szukaj filmów, seriali, anime...</span>
                <span class="trigger-hint">Baza TMDB, trendy i rekomendacje</span>
              </div>
            </div>
            <div class="trigger-action-pill">
              <ion-icon :icon="ioniconsSparkles" />
              <span>Odkryj</span>
            </div>
          </div>

          <!-- Secondary Quick Tools -->
          <div class="cinema-quick-tools">
            <button type="button" class="tool-btn tool-random" @click="openRandomPickerModal">
              <ion-icon :icon="ioniconsDiceOutline" />
              <span>Wylosuj seans</span>
            </button>
            <button type="button" class="tool-btn tool-manual" @click="openManualAddModal">
              <ion-icon :icon="ioniconsAddCircleOutline" />
              <span>Dodaj ręcznie</span>
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
              <span>{{ mt.label }}</span>
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
        <TransitionGroup
          name="dn-list"
          tag="div"
          v-if="filteredMovies.length > 0"
          class="movies-grid"
        >
          <div
            v-for="movie in filteredMovies"
            :key="movie.id"
            class="mv-row"
            :class="{
              'is-watched': movie.status === 'watched',
              'is-watching': movie.status === 'watching',
              'dn-completing': completingMovieIds.has(movie.id),
              'dn-item-deleting': deletingMovieIds.has(movie.id)
            }"
          >
            <button type="button" class="mv-poster" @click="openMovieDetailsModal(movie)" :aria-label="movie.title">
              <img v-if="movie.poster_path" :src="movie.poster_path" :alt="movie.title" loading="lazy" />
              <ion-icon v-else :icon="ioniconsFilmOutline" />
            </button>

            <div class="mv-body">
              <button type="button" class="mv-title" @click="openMovieDetailsModal(movie)">{{ movie.title }}</button>
              <span class="mv-meta">
                {{ getMediaTypeLabel(movie.media_type) }}<template v-if="movie.release_year"> · {{ movie.release_year }}</template><template v-if="movie.genres && movie.genres.length"> · {{ movie.genres.slice(0, 2).join(', ') }}</template>
              </span>

              <!-- Status line -->
              <div class="mv-status-row">
                <span class="mv-status" :class="'is-' + movie.status">{{ getStatusLabel(movie.status) }}</span>
                <span v-if="movie.vote_average" class="mv-score">
                  <ion-icon :icon="ioniconsStar" />{{ movie.vote_average }}
                </span>
                <span v-if="movie.watched_at && movie.status === 'watched'" class="mv-date">{{ formatWatchedDate(movie.watched_at) }}</span>
              </div>

              <!-- Series episode stepper -->
              <div v-if="movie.status === 'watching' && isSeries(movie)" class="mv-episode">
                <button type="button" class="mv-ep-label" @click="openEpisodeModal(movie)">
                  S{{ movie.last_watched_season || 1 }} · E{{ movie.last_watched_episode || 1 }}
                </button>
                <button
                  type="button"
                  class="mv-ep-btn"
                  aria-label="Poprzedni odcinek"
                  :disabled="(movie.last_watched_episode || 1) <= 1"
                  @click.stop="decrementEpisode(movie)"
                >
                  <ion-icon :icon="ioniconsRemove" />
                </button>
                <button type="button" class="mv-ep-btn is-plus" aria-label="Następny odcinek" @click.stop="incrementEpisode(movie)">
                  <ion-icon :icon="ioniconsAdd" />
                </button>
              </div>

              <!-- Couple ratings -->
              <button
                v-if="movie.status === 'watched' || hasReviews(movie)"
                type="button"
                class="mv-ratings"
                @click="openReviewModal(movie)"
              >
                <span class="mv-rate">
                  <span class="mv-rate-av" :style="{ backgroundColor: currentUserAccentColor }">{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
                  {{ getUserReview(movie) ? getUserReview(movie)?.rating + '/10' : 'Oceń' }}
                </span>
                <span class="mv-rate">
                  <span class="mv-rate-av" :style="{ backgroundColor: partnerUserAccentColor }">{{ partnerUser ? (partnerUser.name || 'P').charAt(0).toUpperCase() : '?' }}</span>
                  {{ getPartnerReview(movie) ? getPartnerReview(movie)?.rating + '/10' : '—' }}
                </span>
                <span v-if="getDuoAverageRating(movie)" class="mv-rate-avg">
                  <ion-icon :icon="ioniconsStar" />{{ getDuoAverageRating(movie) }}
                </span>
              </button>
              <p v-if="movie.status === 'watched' && (getUserReview(movie)?.comment || getPartnerReview(movie)?.comment)" class="mv-quote">
                „{{ getUserReview(movie)?.comment || getPartnerReview(movie)?.comment }}”
              </p>
            </div>

            <div class="mv-side">
              <button
                type="button"
                class="mv-check"
                :class="{ done: movie.status === 'watched' }"
                :aria-label="movie.status === 'watched' ? 'Przywróć do planowanych' : 'Oznacz jako obejrzane'"
                @click="toggleMovieStatus(movie, movie.status === 'watched' ? 'planned' : 'watched')"
              >
                <ion-icon :icon="ioniconsCheckmarkOutline" />
              </button>
              <button type="button" class="mv-more" aria-label="Więcej" @click="openMovieActions(movie)">
                <ion-icon :icon="ioniconsEllipsisHorizontal" />
              </button>
            </div>
          </div>
        </TransitionGroup>

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
              <span>Wyszukaj film lub serial</span>
            </button>
            <button type="button" class="manual-fallback-btn" @click="openManualAddModal">
              Wpisz tytuł ręcznie
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================== -->
      <!-- MODAL 1: SEARCH & RECOMMENDATIONS MODAL -->
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
                  <span class="tmdb-pill">Kino</span>
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
                <span class="warning-title">Klucz katalogu filmów</span>
                <span class="warning-desc">{{ apiKeyWarning }}</span>
              </div>
              <button type="button" class="warning-action-btn" @click="openApiKeyPrompt">
                Ustaw klucz
              </button>
            </div>
          </div>

          <!-- Modal Scrollable Content -->
          <div class="ion-content-scroll-host modal-scrollable-content search-results-scroll">
            <!-- Loading State with Pulsing Ring / Spinner -->
            <div v-if="isSearching" class="search-loading-state">
              <div class="spinner-pulse-ring">
                <ion-spinner name="crescent" class="loading-crescent" />
              </div>
              <span class="loading-title">Przeszukuję bazę filmów...</span>
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
                @click="openMovieDetailsModal(res)"
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
                    <template v-if="!isAlreadyInList(res)">
                      <button
                        type="button"
                        class="action-pill-btn btn-plan"
                        @click.stop="addFromTmdb(res, 'planned')"
                      >
                        <ion-icon :icon="ioniconsBookmarkOutline" />
                        <span>Chcę obejrzeć</span>
                      </button>
                      <button
                        type="button"
                        class="action-pill-btn btn-watched"
                        @click.stop="addFromTmdb(res, 'watched')"
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
                    <h4 class="trending-heading">{{ getTrendingHeading() }}</h4>
                    <p class="trending-subheading">{{ getTrendingSubheading() }}</p>
                  </div>
                </div>
              </div>

              <!-- Trending Category Loading State -->
              <div v-if="isTrendingLoading" class="trending-loading-box">
                <ion-spinner name="crescent" />
                <span>Ładowanie propozycji...</span>
              </div>

              <!-- Trending Grid Cards -->
              <div v-else-if="trendingList.length > 0" class="trending-posters-grid">
                <div
                  v-for="tr in trendingList"
                  :key="tr.tmdb_id"
                  class="trending-item-card"
                  @click="openMovieDetailsModal(tr)"
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
                      :class="{ 'is-added': isAlreadyInList(tr) }"
                      @click.stop="!isAlreadyInList(tr) && addFromTmdb(tr, 'planned')"
                    >
                      <ion-icon
                        :icon="isAlreadyInList(tr) ? ioniconsCheckmarkOutline : ioniconsAddOutline"
                      />
                    </div>
                  </div>

                  <!-- Text details -->
                  <div class="tr-caption-box">
                    <span class="tr-title-text">{{ tr.title }}</span>
                    <span class="tr-meta-text">
                      {{ tr.release_year || 'Nowość' }}
                      <span v-if="isAlreadyInList(tr)" class="tr-on-list-tag">✓ Na liście</span>
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

          <div class="ion-content-scroll-host modal-scrollable-content">
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
          <div class="ion-content-scroll-host modal-scrollable-content random-picker-scroll">
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
                  <span>{{ opt.label }}</span>
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
                  <span>{{ opt.label }}</span>
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

              <!-- Winner State (Clean Horizontal iOS Card) -->
              <div v-else-if="selectedRandomMovie" class="winner-card-layout">
                <div class="winner-poster-box">
                  <img
                    v-if="selectedRandomMovie.poster_path"
                    :src="selectedRandomMovie.poster_path"
                    :alt="selectedRandomMovie.title"
                    class="winner-poster-img"
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
                    <span>Wylosowany seans</span>
                  </div>
                  <h3 class="winner-title">{{ selectedRandomMovie.title }}</h3>
                  <div class="winner-tags-row">
                    <span v-if="selectedRandomMovie.release_year" class="winner-year">
                      {{ selectedRandomMovie.release_year }}
                    </span>
                    <span v-if="selectedRandomMovie.vote_average" class="winner-score">
                      ⭐ {{ selectedRandomMovie.vote_average }}
                    </span>
                    <span v-if="selectedRandomMovie.genres && selectedRandomMovie.genres.length > 0" class="winner-genre">
                      {{ selectedRandomMovie.genres[0] }}
                    </span>
                  </div>
                  <p v-if="selectedRandomMovie.overview" class="winner-desc">
                    {{ selectedRandomMovie.overview }}
                  </p>

                  <div v-if="isAlreadyInList(selectedRandomMovie)" class="winner-already-note">
                    <ion-icon :icon="ioniconsCheckmarkCircle" />
                    <span>✓ Znajduje się już na Waszej liście</span>
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
                <div class="prompt-orb-icon">
                  <ion-icon :icon="ioniconsSparkles" />
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
              <!-- When a movie has been drawn -->
              <template v-if="selectedRandomMovie && !isSpinning">
                <!-- Action 1: Oglądamy ten! (Full width primary button) -->
                <button
                  type="button"
                  class="winner-primary-btn"
                  @click="acceptRandomMovie(selectedRandomMovie)"
                >
                  <ion-icon :icon="ioniconsPlayCircle" />
                  <span>Oglądamy ten seans!</span>
                </button>

                <!-- Action 2 & 3: Save to list + Schedule Date (2-column secondary row) -->
                <div class="winner-secondary-row" :class="{ 'single-col': isAlreadyInList(selectedRandomMovie) }">
                  <button
                    v-if="!isAlreadyInList(selectedRandomMovie)"
                    type="button"
                    class="winner-secondary-btn"
                    @click="addRandomToPlanned(selectedRandomMovie)"
                  >
                    <ion-icon :icon="ioniconsBookmarkOutline" />
                    <span>Zapisz na listę</span>
                  </button>

                  <button
                    type="button"
                    class="winner-secondary-btn"
                    @click="scheduleMovieDate(selectedRandomMovie)"
                  >
                    <ion-icon :icon="ioniconsCalendarOutline" />
                    <span>Randka w Terminarzu</span>
                  </button>
                </div>

                <!-- Respin button -->
                <button
                  type="button"
                  class="spin-again-btn"
                  @click="spinRandomMovie"
                >
                  <ion-icon :icon="ioniconsDiceOutline" />
                  <span>Wylosuj inny seans</span>
                </button>
              </template>

              <!-- When no movie drawn yet -->
              <template v-else>
                <button
                  type="button"
                  class="spin-main-btn"
                  :disabled="isSpinning || (randomSource === 'list' && plannedCandidates.length === 0)"
                  @click="spinRandomMovie"
                >
                  <ion-icon :icon="ioniconsDice" />
                  <span>{{ isSpinning ? 'Losowanie w toku...' : 'Wylosuj seans!' }}</span>
                </button>
              </template>

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

          <div class="ion-content-scroll-host modal-scrollable-content manual-form-body">
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
                    { id: 'movie', label: 'Film' },
                    { id: 'tv', label: 'Serial' },
                    { id: 'anime', label: 'Anime' }
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

            <!-- Series Episode Progress (If watching series/anime) -->
            <div v-if="manualForm.status === 'watching' && isSeries(manualForm)" class="form-row-2col">
              <div class="form-group">
                <label class="form-label">Aktualny sezon</label>
                <input
                  v-model.number="manualForm.season"
                  type="number"
                  min="1"
                  class="form-input"
                  placeholder="1"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Aktualny odcinek</label>
                <input
                  v-model.number="manualForm.episode"
                  type="number"
                  min="1"
                  class="form-input"
                  placeholder="1"
                />
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
              :disabled="isSubmittingManual"
              @click="submitManualAdd"
            >
              <ion-spinner v-if="isSubmittingManual" name="crescent" style="width: 18px; height: 18px;" />
              <ion-icon v-else :icon="ioniconsAddCircle" />
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
        :breakpoints="[0, 0.9, 1]"
        :initial-breakpoint="0.9"
        handle-behavior="cycle"
        class="dn-movies-details-modal"
        @didDismiss="closeDetailsModal"
      >
        <div class="dn-modal-container details-modal-layout" v-if="selectedMovieForDetails">
          <!-- Header -->
          <div class="dn-modal-header details-modal-header">
            <div class="modal-title-col">
              <span class="details-top-badge badge-saved" v-if="savedMovieInList">
                ✓ Na liście: {{ getStatusLabel(savedMovieInList.status) }}
              </span>
              <span class="details-top-badge badge-tmdb" v-else>
                Katalog TMDB (Podgląd)
              </span>
              <h3 class="details-header-title">{{ selectedMovieForDetails.title }}</h3>
            </div>
            <button
              type="button"
              class="modal-circle-close-btn"
              @click="closeDetailsModal"
              aria-label="Zamknij"
            >
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <div class="ion-content-scroll-host modal-scrollable-content details-body">
            <!-- Backdrop Image & Floating Poster -->
            <div class="details-hero-wrap">
              <div class="details-poster-backdrop">
                <img
                  v-if="selectedMovieForDetails.backdrop_path || selectedMovieForDetails.poster_path"
                  :src="selectedMovieForDetails.backdrop_path || selectedMovieForDetails.poster_path"
                  :alt="selectedMovieForDetails.title"
                  class="details-backdrop-img"
                />
                <div class="backdrop-gradient-overlay"></div>
              </div>

              <!-- Floating Poster & Title Badge -->
              <div class="details-floating-meta">
                <div class="details-float-poster">
                  <img
                    v-if="selectedMovieForDetails.poster_path"
                    :src="selectedMovieForDetails.poster_path"
                    :alt="selectedMovieForDetails.title"
                  />
                  <div v-else class="float-poster-empty">
                    <ion-icon :icon="ioniconsFilmOutline" />
                  </div>
                </div>

                <div class="details-float-text">
                  <h4 class="float-title">{{ selectedMovieForDetails.title }}</h4>
                  <span
                    v-if="selectedMovieForDetails.original_title && selectedMovieForDetails.original_title !== selectedMovieForDetails.title"
                    class="float-orig-title"
                  >
                    {{ selectedMovieForDetails.original_title }}
                  </span>
                  <div class="details-pills-row">
                    <span class="type-tag" :class="'type-' + selectedMovieForDetails.media_type">
                      {{ getMediaTypeLabel(selectedMovieForDetails.media_type) }}
                    </span>
                    <span v-if="selectedMovieForDetails.release_year" class="details-year-tag">
                      {{ selectedMovieForDetails.release_year }}
                    </span>
                    <span v-if="selectedMovieForDetails.vote_average" class="tmdb-score-tag">
                      ⭐ {{ selectedMovieForDetails.vote_average }} (TMDB)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="details-content-meta">
              <!-- Overview / Synopsis -->
              <h4 class="details-section-heading">Opis fabuły</h4>
              <p class="details-full-desc">
                {{ selectedMovieForDetails.overview || 'Brak oficjalnego opisu dla tej pozycji.' }}
              </p>

              <!-- Genres -->
              <div v-if="selectedMovieForDetails.genres && selectedMovieForDetails.genres.length > 0">
                <h4 class="details-section-heading">Gatunki</h4>
                <div class="details-genres-wrap">
                  <span v-for="g in selectedMovieForDetails.genres" :key="g" class="genre-pill">
                    {{ g }}
                  </span>
                </div>
              </div>

              <!-- Reviews Section (if already watched and reviewed) -->
              <div v-if="savedMovieInList && hasReviews(savedMovieInList)" class="details-reviews-box">
                <h4 class="details-section-heading">Wasze recenzje</h4>
                <div class="details-reviews-grid">
                  <!-- User review -->
                  <div v-if="getUserReview(savedMovieInList)" class="mini-review-card">
                    <div class="review-user-name">Ty: ⭐ {{ getUserReview(savedMovieInList)?.rating }}/10</div>
                    <p class="review-comment-text">{{ getUserReview(savedMovieInList)?.comment || 'Brak opisu wrażeń' }}</p>
                  </div>
                  <!-- Partner review -->
                  <div v-if="getPartnerReview(savedMovieInList)" class="mini-review-card partner">
                    <div class="review-user-name">{{ partnerUser?.name || 'Partner' }}: ⭐ {{ getPartnerReview(savedMovieInList)?.rating }}/10</div>
                    <p class="review-comment-text">{{ getPartnerReview(savedMovieInList)?.comment || 'Brak opisu wrażeń' }}</p>
                  </div>
                </div>
              </div>

              <!-- Quick action buttons -->
              <div class="details-modal-actions">
                <!-- IF NOT IN LIST YET: Add options -->
                <template v-if="!savedMovieInList">
                  <div class="details-add-options-label">
                    <span>Dodaj seans do kolekcji:</span>
                  </div>
                  <div class="details-add-grid">
                    <button
                      type="button"
                      class="details-btn-primary add-plan-btn"
                      @click="addFromTmdb(selectedMovieForDetails, 'planned')"
                    >
                      <ion-icon :icon="ioniconsBookmark" />
                      <span>Chcę obejrzeć</span>
                    </button>

                    <div class="details-secondary-row">
                      <button
                        type="button"
                        class="details-btn-secondary"
                        @click="addFromTmdb(selectedMovieForDetails, 'watching')"
                      >
                        <ion-icon :icon="ioniconsPlayCircleOutline" />
                        <span>Oglądamy teraz</span>
                      </button>

                      <button
                        type="button"
                        class="details-btn-secondary"
                        @click="addFromTmdb(selectedMovieForDetails, 'watched')"
                      >
                        <ion-icon :icon="ioniconsCheckmarkCircleOutline" />
                        <span>Już obejrzane</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      class="details-btn-secondary date-btn"
                      @click="scheduleMovieDate(selectedMovieForDetails)"
                    >
                      <ion-icon :icon="ioniconsCalendarOutline" />
                      <span>Zaplanuj seans w Terminarzu</span>
                    </button>
                  </div>
                </template>

                <!-- IF ALREADY IN LIST: Status toggle, review, schedule date, delete -->
                <template v-else>
                  <div class="details-status-control-box">
                    <span class="details-status-label">Status na Waszej liście:</span>
                    <div class="details-status-change-row">
                      <button
                        type="button"
                        class="status-toggle-pill"
                        :class="{ active: savedMovieInList.status === 'planned' }"
                        @click="toggleMovieStatus(savedMovieInList, 'planned')"
                      >
                        Do obejrzenia
                      </button>
                      <button
                        type="button"
                        class="status-toggle-pill"
                        :class="{ active: savedMovieInList.status === 'watching' }"
                        @click="toggleMovieStatus(savedMovieInList, 'watching')"
                      >
                        W trakcie
                      </button>
                      <button
                        type="button"
                        class="status-toggle-pill"
                        :class="{ active: savedMovieInList.status === 'watched' }"
                        @click="toggleMovieStatus(savedMovieInList, 'watched')"
                      >
                        Obejrzane
                      </button>
                    </div>
                  </div>

                  <!-- Series Episode tracker in Details Modal -->
                  <div
                    v-if="savedMovieInList.status === 'watching' && isSeries(savedMovieInList)"
                    class="details-series-tracker-box"
                  >
                    <div class="details-series-header">
                      <div class="details-series-title-grp">
                        <ion-icon :icon="ioniconsTvOutline" />
                        <span>Ostatnio obejrzany odcinek</span>
                      </div>
                      <span class="details-series-indicator">
                        S{{ savedMovieInList.last_watched_season || 1 }}:E{{ savedMovieInList.last_watched_episode || 1 }}
                      </span>
                    </div>

                    <div class="details-series-steppers-grid">
                      <!-- Season control -->
                      <div class="series-stepper-cell">
                        <span class="stepper-sublabel">Sezon</span>
                        <div class="stepper-control-row">
                          <button
                            type="button"
                            class="step-circle-btn"
                            :disabled="(savedMovieInList.last_watched_season || 1) <= 1"
                            @click="updateMovieProgress(savedMovieInList.id, (savedMovieInList.last_watched_season || 1) - 1, savedMovieInList.last_watched_episode || 1)"
                          >
                            <ion-icon :icon="ioniconsRemove" />
                          </button>
                          <span class="step-num-val">{{ savedMovieInList.last_watched_season || 1 }}</span>
                          <button
                            type="button"
                            class="step-circle-btn"
                            @click="updateMovieProgress(savedMovieInList.id, (savedMovieInList.last_watched_season || 1) + 1, savedMovieInList.last_watched_episode || 1)"
                          >
                            <ion-icon :icon="ioniconsAdd" />
                          </button>
                        </div>
                      </div>

                      <!-- Episode control -->
                      <div class="series-stepper-cell">
                        <span class="stepper-sublabel">Odcinek</span>
                        <div class="stepper-control-row">
                          <button
                            type="button"
                            class="step-circle-btn"
                            :disabled="(savedMovieInList.last_watched_episode || 1) <= 1"
                            @click="decrementEpisode(savedMovieInList)"
                          >
                            <ion-icon :icon="ioniconsRemove" />
                          </button>
                          <span class="step-num-val">{{ savedMovieInList.last_watched_episode || 1 }}</span>
                          <button
                            type="button"
                            class="step-circle-btn step-circle-plus"
                            @click="incrementEpisode(savedMovieInList)"
                          >
                            <ion-icon :icon="ioniconsAdd" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      class="details-btn-secondary ep-custom-change-btn"
                      @click="openEpisodeModal(savedMovieInList)"
                    >
                      <ion-icon :icon="ioniconsCreateOutline" />
                      <span>Wpisz inny numer odcinka / sezonu</span>
                    </button>
                  </div>

                  <button
                    v-if="savedMovieInList.status === 'watched'"
                    type="button"
                    class="details-btn-primary review-btn"
                    @click="openReviewFromDetails"
                  >
                    <ion-icon :icon="ioniconsStar" />
                    <span>{{ hasUserReviewed(savedMovieInList) ? 'Edytuj Twoją ocenę' : 'Oceń / napisz recenzję' }}</span>
                  </button>

                  <button
                    type="button"
                    class="details-btn-secondary date-btn"
                    @click="scheduleMovieDate(savedMovieInList)"
                  >
                    <ion-icon :icon="ioniconsCalendarOutline" />
                    <span>Zaplanuj seans w Terminarzu</span>
                  </button>

                  <button
                    type="button"
                    class="details-delete-btn"
                    @click="deleteFromDetails(savedMovieInList)"
                  >
                    <ion-icon :icon="ioniconsTrashOutline" />
                    <span>Usuń z Waszej listy</span>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </ion-modal>

      <!-- ========================================================== -->
      <!-- MODAL 6: EPISODE PROGRESS MODAL (ZAZNACZ ODCINEK SERIALU) -->
      <!-- ========================================================== -->
      <ion-modal
        :is-open="isEpisodeModalOpen"
        :breakpoints="[0, 0.65, 0.95]"
        :initial-breakpoint="0.65"
        handle-behavior="cycle"
        class="dn-movies-episode-modal"
        @didDismiss="closeEpisodeModal"
      >
        <div class="dn-modal-container ep-modal-container" v-if="selectedMovieForEpisode">
          <div class="dn-modal-header">
            <div class="modal-title-col">
              <h3>Postęp seansu serialu</h3>
              <p>Na którym odcinku skończyliście?</p>
            </div>
            <button type="button" class="modal-close-btn" @click="closeEpisodeModal">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <div class="ion-content-scroll-host modal-scrollable-content ep-modal-scroll">
            <!-- Series preview bar -->
            <div class="ep-series-preview">
              <img
                v-if="selectedMovieForEpisode.poster_path"
                :src="selectedMovieForEpisode.poster_path"
                :alt="selectedMovieForEpisode.title"
                class="ep-series-thumb"
              />
              <div class="ep-series-meta">
                <h4>{{ selectedMovieForEpisode.title }}</h4>
                <div class="ep-current-pill">
                  <ion-icon :icon="ioniconsTvOutline" />
                  <span>Aktualnie: Sezon {{ selectedMovieForEpisode.last_watched_season || 1 }}, Odc. {{ selectedMovieForEpisode.last_watched_episode || 1 }}</span>
                </div>
              </div>
            </div>

            <!-- Steppers Box for Season and Episode -->
            <div class="ep-selectors-grid">
              <!-- Season Stepper -->
              <div class="ep-stepper-card">
                <span class="ep-card-title">SEZON</span>
                <div class="ep-stepper-action-row">
                  <button
                    type="button"
                    class="ep-circle-stepper-btn"
                    :disabled="episodeForm.season <= 1"
                    @click="episodeForm.season = Math.max(1, episodeForm.season - 1)"
                  >
                    <ion-icon :icon="ioniconsRemove" />
                  </button>
                  <div class="ep-number-display">
                    <span class="ep-big-num">{{ episodeForm.season }}</span>
                  </div>
                  <button
                    type="button"
                    class="ep-circle-stepper-btn"
                    @click="episodeForm.season++"
                  >
                    <ion-icon :icon="ioniconsAdd" />
                  </button>
                </div>
              </div>

              <!-- Episode Stepper -->
              <div class="ep-stepper-card">
                <span class="ep-card-title">ODCINEK</span>
                <div class="ep-stepper-action-row">
                  <button
                    type="button"
                    class="ep-circle-stepper-btn"
                    :disabled="episodeForm.episode <= 1"
                    @click="episodeForm.episode = Math.max(1, episodeForm.episode - 1)"
                  >
                    <ion-icon :icon="ioniconsRemove" />
                  </button>
                  <div class="ep-number-display">
                    <span class="ep-big-num">{{ episodeForm.episode }}</span>
                  </div>
                  <button
                    type="button"
                    class="ep-circle-stepper-btn ep-circle-primary"
                    @click="episodeForm.episode++"
                  >
                    <ion-icon :icon="ioniconsAdd" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Quick Number Input & Fast Presets -->
            <div class="ep-manual-input-box">
              <label class="ep-input-label">Wpisz bezpośrednio numer odcinka:</label>
              <div class="ep-input-row">
                <span class="ep-input-prefix">Odcinek nr:</span>
                <input
                  v-model.number="episodeForm.episode"
                  type="number"
                  min="1"
                  max="9999"
                  class="ep-manual-number-input"
                  placeholder="np. 12"
                />
              </div>

              <!-- Fast Presets -->
              <div class="ep-presets-row">
                <button
                  type="button"
                  class="ep-preset-chip"
                  @click="episodeForm.episode += 1"
                >
                  +1 odcinek
                </button>
                <button
                  type="button"
                  class="ep-preset-chip"
                  @click="episodeForm.episode += 5"
                >
                  +5 odcinków
                </button>
                <button
                  type="button"
                  class="ep-preset-chip"
                  @click="episodeForm.season += 1; episodeForm.episode = 1"
                >
                  Kolejny sezon (odc. 1)
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="button"
              class="details-btn-primary ep-save-btn"
              @click="submitEpisodeProgress"
            >
              <ion-icon :icon="ioniconsCheckmarkCircleOutline" />
              <span>Zapisz postęp: Sezon {{ episodeForm.season }}, Odc. {{ episodeForm.episode }}</span>
            </button>
          </div>
        </div>
      </ion-modal>

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <DuoActionSheet
        :is-open="movieSheet.open"
        :title="movieSheet.title"
        :subtitle="movieSheet.subtitle"
        :buttons="movieSheet.buttons"
        @dismiss="movieSheet.open = false"
      />

      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import {
  calendarOutline as ioniconsCalendarOutline,
  checkmarkCircleOutline as ioniconsCheckmarkCircleOutline,
  filmOutline as ioniconsFilmOutline,
  informationCircleOutline as ioniconsInformationCircleOutline,
  playCircleOutline as ioniconsPlayCircleOutline,
  playOutline as ioniconsPlayOutline,
  starOutline as ioniconsStarOutline,
  timeOutline as ioniconsTimeOutline,
  trashOutline as ioniconsTrashOutline
} from 'ionicons/icons'
import DuoActionSheet, { type DuoActionSheetButton } from '~/components/DuoActionSheet.vue'
import { useDuoState, type MovieItem } from '~/composables/useDuoState'
import { useConfirm } from '~/composables/useConfirm'
import confetti from 'canvas-confetti'

const {
  currentUser,
  partnerUser,
  partnership,
  moviesList,
  wishlistItems,
  activeLeisureSubTab,
  addMovie,
  updateMovie,
  updateMovieProgress,
  deleteMovie,
  toggleMovieWatched,
  saveMovieReview,
  refreshMovies,
  addEvent,
  currentUserAccentColor,
  partnerUserAccentColor,
  triggerToast
} = useDuoState()

const { confirm } = useConfirm()

const completingMovieIds = ref<Set<string>>(new Set())
const deletingMovieIds = ref<Set<string>>(new Set())

// Subtab switcher to Wishlist
const uncompletedWishlistCount = computed(() => {
  return wishlistItems.value.filter(i => !i.is_completed).length
})

const switchToWishlist = () => {
  activeLeisureSubTab.value = 'wishlist'
}

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

const movieStatusOrder: Record<MovieItem['status'], number> = {
  watching: 0,
  planned: 1,
  watched: 2
}

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

  // Keep active titles first, planned titles in the middle, and watched titles last.
  list.sort((a, b) => movieStatusOrder[a.status] - movieStatusOrder[b.status])

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
  if (score >= 10) return 'Arcydzieło!'
  if (score >= 9) return 'Świetny seans!'
  if (score >= 8) return 'Bardzo dobry seans'
  if (score >= 7) return 'Dobry, podobał mi się'
  if (score >= 6) return 'Całkiem niezły'
  if (score >= 5) return 'Przeciętny / średni'
  if (score >= 4) return 'Rozczarowujący'
  if (score >= 3) return 'Słaby'
  return 'Szkoda czasu'
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
const isTrendingLoading = ref(false)
const trendingCache = ref<Record<string, any[]>>({})

const getTrendingHeading = (): string => {
  switch (searchCategory.value) {
    case 'movie':
      return 'Popularne filmy w tym tygodniu'
    case 'tv':
      return 'Najpopularniejsze seriale'
    case 'anime':
      return 'Najpopularniejsze anime'
    case 'all':
    default:
      return 'Popularne w tym tygodniu'
  }
}

const getTrendingSubheading = (): string => {
  switch (searchCategory.value) {
    case 'movie':
      return 'Topowe hity kinowe i nowości na platformach'
    case 'tv':
      return 'Seriale i miniseriale, które teraz ogląda świat'
    case 'anime':
      return 'Hity japońskiej animacji i uwielbiane serie'
    case 'all':
    default:
      return 'Hity i nowości według bazy The Movie Database'
  }
}

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
  loadTrendingForCategory(searchCategory.value)
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
  loadTrendingForCategory(searchCategory.value)
}

const selectSearchCategory = (catId: 'all' | 'movie' | 'tv' | 'anime') => {
  searchCategory.value = catId
  if (tmdbSearchQuery.value.trim()) {
    executeSearch()
  } else {
    loadTrendingForCategory(catId)
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

const fetchTmdbApi = async (path: string, params: URLSearchParams): Promise<any> => {
  const customKey = getStoredTmdbApiKey()
  const queryString = params.toString() ? `?${params.toString()}` : ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (customKey) headers['X-TMDB-API-Key'] = customKey

  const endpoints = [`${path}${queryString}`]

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep, {
        headers
      })
      const contentType = resp.headers.get('content-type') || ''
      if (resp.ok && contentType.includes('application/json')) {
        const data = await resp.json()
        if (data && typeof data === 'object') {
          return data
        }
      }
    } catch (_) {}
  }
  return null
}

const executeSearch = async () => {
  const query = tmdbSearchQuery.value.trim()
  if (!query) return

  isSearching.value = true
  searchError.value = ''
  apiKeyWarning.value = ''

  try {
    const params = new URLSearchParams({
      q: query,
      type: searchCategory.value
    })

    const res = await fetchTmdbApi('/api/movies/search', params)
    if (res && res.success) {
      searchResults.value = res.results || []
    } else {
      if (res?.error === 'NO_API_KEY') {
        apiKeyWarning.value = 'Aby wyszukiwać w internetowej bazie filmów, podaj klucz dostępu TMDB.'
      } else {
        searchError.value = res?.message || 'Wystąpił błąd podczas wyszukiwania.'
      }
      searchResults.value = []
    }
  } catch (err: any) {
    searchError.value = 'Nie udało się połączyć z usługą wyszukiwania.'
  } finally {
    isSearching.value = false
  }
}

const loadTrendingForCategory = async (catId: 'all' | 'movie' | 'tv' | 'anime' = 'all', forceRefresh = false) => {
  if (!forceRefresh && trendingCache.value[catId]?.length) {
    trendingList.value = trendingCache.value[catId]
    return
  }

  isTrendingLoading.value = true
  try {
    const params = new URLSearchParams({ type: catId })
    const res = await fetchTmdbApi('/api/movies/trending', params)
    if (res?.success && res.results) {
      trendingCache.value[catId] = res.results
      if (searchCategory.value === catId) {
        trendingList.value = res.results
      }
    }
  } catch (err) {
    console.warn('Failed to load trending items:', err)
  } finally {
    isTrendingLoading.value = false
  }
}

const loadTrendingIfEmpty = async () => {
  return loadTrendingForCategory(searchCategory.value)
}

const openApiKeyPrompt = () => {
  const currentKey = getStoredTmdbApiKey()
  const entered = window.prompt('Wprowadź swój klucz dostępu TMDB (v3 key lub token):', currentKey)
  if (entered !== null) {
    const clean = entered.trim()
    if (clean) {
      localStorage.setItem('duonest_tmdb_api_key', clean)
      apiKeyWarning.value = ''
      triggerToast('Zapisano klucz API', { type: 'movies' })
      if (tmdbSearchQuery.value) {
        executeSearch()
      } else {
        loadTrendingForCategory(searchCategory.value, true)
      }
    } else {
      localStorage.removeItem('duonest_tmdb_api_key')
    }
  }
}

const normalizeMovieTitle = (str?: string | null): string => {
  if (!str) return ''
  return str.trim().toLowerCase().replace(/[\s\-_:,'"]+/g, ' ')
}

const findMovieInList = (itemOrTmdbId?: any, optionalTitle?: string | null): MovieItem | undefined => {
  if (!itemOrTmdbId && !optionalTitle) return undefined

  let tmdbId: number | null = null
  let title: string | null = null
  let originalTitle: string | null = null

  if (typeof itemOrTmdbId === 'object' && itemOrTmdbId !== null) {
    tmdbId = itemOrTmdbId.tmdb_id || null
    title = itemOrTmdbId.title || null
    originalTitle = itemOrTmdbId.original_title || null
  } else if (typeof itemOrTmdbId === 'number') {
    tmdbId = itemOrTmdbId
    title = optionalTitle || null
  } else if (typeof itemOrTmdbId === 'string') {
    title = itemOrTmdbId
  }

  const targetTitleNorm = normalizeMovieTitle(title)
  const targetOrigNorm = normalizeMovieTitle(originalTitle)

  return moviesList.value.find(m => {
    // 1. Check TMDB ID if present in both
    if (tmdbId && m.tmdb_id && Number(m.tmdb_id) === Number(tmdbId)) {
      return true
    }
    // 2. Check normalized title
    const mTitleNorm = normalizeMovieTitle(m.title)
    const mOrigNorm = normalizeMovieTitle(m.original_title)

    if (targetTitleNorm && mTitleNorm && targetTitleNorm === mTitleNorm) return true
    if (targetTitleNorm && mOrigNorm && targetTitleNorm === mOrigNorm) return true
    if (targetOrigNorm && mTitleNorm && targetOrigNorm === mTitleNorm) return true
    if (targetOrigNorm && mOrigNorm && targetOrigNorm === mOrigNorm) return true

    return false
  })
}

const isAlreadyInList = (itemOrTmdbId?: any, optionalTitle?: string | null): boolean => {
  return !!findMovieInList(itemOrTmdbId, optionalTitle)
}

const addFromTmdb = async (item: any, status: 'planned' | 'watched' | 'watching' = 'planned') => {
  if (!item) return
  if (isAlreadyInList(item)) {
    triggerToast('Film jest już na liście', {
      type: 'movies'
    })
    return
  }

  const added = await addMovie({
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

  if (!added) return

  // Celebrate with confetti
  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.85 }
    })
  } catch {}

  if (status === 'watching' && isSeries(added)) {
    openEpisodeModal(added)
  }
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
  const saved = await saveMovieReview(
    selectedMovieForReview.value.id,
    reviewForm.value.rating,
    reviewForm.value.comment
  )
  if (!saved) return

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
      const params = new URLSearchParams({
        type: randomFilterType.value,
        genre: randomGenre.value,
        minRating: String(randomMinRating.value)
      })

      const res = await fetchTmdbApi('/api/movies/random', params)
      clearInterval(fetchInterval)

      if (!res || !res.success || !res.winner) {
        isSpinning.value = false
        randomError.value = res?.message || 'Nie udało się wylosować seansu z bazy TMDB.'
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
  const existing = movie.id ? moviesList.value.find(m => m.id === movie.id) : findMovieInList(movie)
  if (existing) {
    if (!(await toggleMovieStatus(existing, 'watching'))) return
  } else {
    const added = await addMovie({
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
    if (!added) return
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
  if (isAlreadyInList(movie)) {
    triggerToast('Film jest już na liście', {
      type: 'movies'
    })
    return
  }

  const added = await addMovie({
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
  if (!added) return

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
  overview: '',
  season: 1,
  episode: 1
})

const openManualAddModal = () => {
  manualForm.value = {
    title: '',
    media_type: 'movie',
    status: 'planned',
    release_year: new Date().getFullYear().toString(),
    genreInput: '',
    poster_path: '',
    overview: '',
    season: 1,
    episode: 1
  }
  isManualModalOpen.value = true
}

const openManualAddWithTitle = (title: string) => {
  if (isAlreadyInList(title)) {
    triggerToast('Film jest już na liście', {
      type: 'movies'
    })
    return
  }
  closeSearchModal()
  openManualAddModal()
  manualForm.value.title = title
}

const closeManualModal = () => {
  isManualModalOpen.value = false
}

const isSubmittingManual = ref(false)

const submitManualAdd = async () => {
  if (isSubmittingManual.value) return
  const title = manualForm.value.title.trim().slice(0, 150)
  if (!title) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40)
    }
    triggerToast('Wpisz tytuł filmu lub serialu przed dodaniem', { type: 'warning' })
    return
  }

  if (isAlreadyInList(title)) {
    triggerToast('Film jest już na liście', {
      type: 'movies'
    })
    return
  }

  isSubmittingManual.value = true
  try {
    const genres = manualForm.value.genreInput
      ? manualForm.value.genreInput.split(',').map(s => s.trim().slice(0, 40)).filter(Boolean)
      : []

    const rawSeason = parseInt(String(manualForm.value.season), 10)
    const cleanSeason = Number.isFinite(rawSeason) ? Math.max(1, Math.min(rawSeason, 100)) : 1
    const rawEpisode = parseInt(String(manualForm.value.episode), 10)
    const cleanEpisode = Number.isFinite(rawEpisode) ? Math.max(1, Math.min(rawEpisode, 1000)) : 1

    const added = await addMovie({
      title,
      media_type: manualForm.value.media_type,
      status: manualForm.value.status,
      release_year: manualForm.value.release_year.trim().slice(0, 10) || null,
      genres,
      poster_path: manualForm.value.poster_path.trim().slice(0, 500) || null,
      overview: manualForm.value.overview.trim().slice(0, 1000) || null,
      last_watched_season: isSeries(manualForm.value) ? cleanSeason : null,
      last_watched_episode: isSeries(manualForm.value) ? cleanEpisode : null
    })

    if (added) closeManualModal()
  } finally {
    isSubmittingManual.value = false
  }
}

// --- MODAL 5: DETAILS MODAL ---
const isDetailsModalOpen = ref(false)
const selectedMovieForDetails = ref<any | null>(null)

const savedMovieInList = computed<MovieItem | null>(() => {
  if (!selectedMovieForDetails.value) return null
  if (selectedMovieForDetails.value.id) {
    const fromList = moviesList.value.find(m => m.id === selectedMovieForDetails.value?.id)
    if (fromList) return fromList
  }
  return findMovieInList(selectedMovieForDetails.value) || null
})

const openMovieDetailsModal = (movie: any) => {
  selectedMovieForDetails.value = movie
  isDetailsModalOpen.value = true
}

const closeDetailsModal = () => {
  isDetailsModalOpen.value = false
  selectedMovieForDetails.value = null
}

const openReviewFromDetails = () => {
  const m = savedMovieInList.value || selectedMovieForDetails.value
  closeDetailsModal()
  if (m && m.id) {
    openReviewModal(m)
  }
}

const deleteFromDetails = (movie: MovieItem) => {
  closeDetailsModal()
  confirmDeleteMovie(movie)
}

// --- MODAL 6: EPISODE PROGRESS MODAL ---
const isEpisodeModalOpen = ref(false)
const selectedMovieForEpisode = ref<MovieItem | null>(null)
const episodeForm = ref({
  season: 1,
  episode: 1
})

const isSeries = (item?: any): boolean => {
  if (!item) return false
  return item.media_type === 'tv' || item.media_type === 'anime'
}

const openEpisodeModal = (movie: MovieItem) => {
  selectedMovieForEpisode.value = movie
  episodeForm.value = {
    season: movie.last_watched_season || 1,
    episode: movie.last_watched_episode || 1
  }
  isEpisodeModalOpen.value = true
}

const closeEpisodeModal = () => {
  isEpisodeModalOpen.value = false
  selectedMovieForEpisode.value = null
}

const submitEpisodeProgress = async () => {
  if (!selectedMovieForEpisode.value) return
  const s = Math.max(1, Math.floor(episodeForm.value.season || 1))
  const ep = Math.max(1, Math.floor(episodeForm.value.episode || 1))
  await updateMovieProgress(selectedMovieForEpisode.value.id, s, ep)
  closeEpisodeModal()
}

const incrementEpisode = async (movie: MovieItem) => {
  const currentEp = movie.last_watched_episode || 1
  const currentSeason = movie.last_watched_season || 1
  await updateMovieProgress(movie.id, currentSeason, currentEp + 1)
}

const decrementEpisode = async (movie: MovieItem) => {
  const currentEp = movie.last_watched_episode || 1
  const currentSeason = movie.last_watched_season || 1
  if (currentEp > 1) {
    await updateMovieProgress(movie.id, currentSeason, currentEp - 1)
  }
}

// --- CARD ACTIONS ---
const toggleMovieStatus = async (movie: MovieItem, newStatus: 'planned' | 'watching' | 'watched') => {
  if (!(await toggleMovieWatched(movie.id, newStatus))) return false
  if (newStatus === 'watched') {
    completingMovieIds.value.add(movie.id)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([20, 40, 20])
    }
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    })
    setTimeout(() => {
      completingMovieIds.value.delete(movie.id)
    }, 450)
  }
  if (newStatus === 'watching' && isSeries(movie)) {
    openEpisodeModal(movie)
  }
  return true
}

const confirmDeleteMovie = async (movie: MovieItem) => {
  const confirmed = await confirm({
    title: 'Usuń z listy filmów',
    message: `Czy na pewno chcesz usunąć "${movie.title}" z Waszej wspólnej listy?`,
    itemHighlight: movie.title,
    confirmText: 'Usuń film',
    cancelText: 'Anuluj',
    type: 'danger',
    icon: 'trash'
  })
  if (confirmed) {
    if (deletingMovieIds.value.has(movie.id)) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 30, 10])
    }
    deletingMovieIds.value.add(movie.id)
    setTimeout(async () => {
      try {
        await deleteMovie(movie.id)
      } finally {
        deletingMovieIds.value.delete(movie.id)
      }
    }, 240)
  }
}

const scheduleMovieDate = async (movie: any) => {
  // If drawn from TMDB and not yet saved in list, save it first as planned
  if (!movie.id && !isAlreadyInList(movie)) {
    const added = await addMovie({
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
    if (!added) return
  }

  // Suggest tonight (or tomorrow evening if past 20:00)
  const now = new Date()
  now.setHours(20, 0, 0, 0)
  if (now.getTime() < Date.now()) {
    now.setDate(now.getDate() + 1)
  }
  const startTime = now.toISOString()

  const saved = await addEvent(
    `Randka filmowa: ${movie.title}`,
    'date',
    startTime,
    `Wspólny seans: ${movie.title} (${getMediaTypeLabel(movie.media_type)}). Nie zapomnijcie o przekąskach! 🍿✨`,
    'Domowy seans / Kanapa',
    new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    false,
    currentUser.value?.name || 'Wspólnie'
  )

  if (saved) triggerToast('Dodano do terminarza', { type: 'calendar' })
}

// --- LABELS & STRINGS ---
const getMediaTypeLabel = (type: string) => {
  switch (type) {
    case 'anime': return 'Anime'
    case 'tv': return 'Serial'
    default: return 'Film'
  }
}

// ---- Bottom action sheet for a movie row ----
const movieSheet = reactive<{ open: boolean; title: string; subtitle: string; buttons: DuoActionSheetButton[] }>({
  open: false,
  title: '',
  subtitle: '',
  buttons: []
})

const openMovieActions = (movie: any) => {
  movieSheet.title = movie.title
  movieSheet.subtitle = getStatusLabel(movie.status)
  const buttons: DuoActionSheetButton[] = []
  if (movie.status === 'planned') {
    buttons.push({ text: 'Oglądamy', description: 'Przenieś do „W trakcie”', icon: ioniconsPlayCircleOutline, handler: () => { toggleMovieStatus(movie, 'watching') } })
  }
  if (movie.status !== 'planned') {
    buttons.push({ text: 'Przywróć do planowanych', icon: ioniconsTimeOutline, handler: () => { toggleMovieStatus(movie, 'planned') } })
  }
  if (movie.status !== 'watched') {
    buttons.push({ text: 'Obejrzane', icon: ioniconsCheckmarkCircleOutline, handler: () => { toggleMovieStatus(movie, 'watched') } })
  }
  buttons.push({
    text: hasUserReviewed(movie) ? 'Edytuj recenzję' : 'Oceń seans',
    icon: ioniconsStarOutline,
    handler: () => { openReviewModal(movie) }
  })
  buttons.push({ text: 'Zaplanuj seans', description: 'Dodaj do terminarza', icon: ioniconsCalendarOutline, handler: () => { scheduleMovieDate(movie) } })
  buttons.push({ text: 'Szczegóły', icon: ioniconsInformationCircleOutline, handler: () => { openMovieDetailsModal(movie) } })
  buttons.push({ text: 'Usuń z kolekcji', role: 'destructive', icon: ioniconsTrashOutline, handler: () => { confirmDeleteMovie(movie) } })
  movieSheet.buttons = buttons
  movieSheet.open = true
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
  return 'Wyszukajcie film, anime lub serial i stwórzcie Waszą prywatną filmotekę!'
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
/* MAIN TABS TOOLBAR & PILLS (Rozrywka: Filmy & Seriale | Wishlista) */

/* PAGE HEADER & GENERAL WRAPPERS */
.movies-main-wrapper {
  padding: 12px 14px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* CINEMA HUB CARD */
.cinema-hub-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cinema-search-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 6px 6px 6px 16px;
  border-radius: 999px;
  background: var(--dn-field);
  border: 1px solid var(--dn-field-line);
  color: var(--dn-ink);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.cinema-search-trigger:active {
  transform: scale(0.985);
  opacity: 0.96;
}

.search-trigger-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.search-trigger-icon {
  display: flex;
  font-size: 20px;
  color: var(--dn-muted);
  flex-shrink: 0;
}

.search-trigger-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.trigger-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--dn-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-hint {
  display: none;
}

.trigger-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--dn-ink);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.trigger-action-pill ion-icon {
  font-size: 14px;
  color: #ffffff;
}

/* Secondary Quick Tools */
.cinema-quick-tools {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid #e5e6e8;
  background: #f8f9fb;
  color: #1c1b19;
  -webkit-tap-highlight-color: transparent;
}

.tool-btn:active {
  transform: scale(0.97);
  background: #f2f3f5;
}

.tool-btn ion-icon {
  font-size: 16px;
}

.tool-random ion-icon {
  color: #b1b1b1;
}

.tool-manual ion-icon {
  color: #9b9b9b;
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
  padding: 2px 2px 4px;
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
  padding: 8px 14px;
  background: var(--dn-soft);
  border: none;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dn-ink);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
}

.filter-pill:active {
  transform: scale(0.96);
}

.filter-pill ion-icon {
  font-size: 15px;
  color: #a2a2a2;
  transition: color 0.15s ease;
}

.filter-pill.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
}

.filter-pill.active ion-icon {
  color: #ffffff;
}

.filter-badge {
  font-size: 10px;
  font-weight: 500;
  background: var(--dn-soft);
  color: #545454;
  padding: 1.5px 6.5px;
  border-radius: 999px;
  line-height: 1.2;
}

.filter-pill.active .filter-badge {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

/* Media Type Chips Row */
.media-type-chips-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 1px 2px 2px;
  scrollbar-width: none;
}

.media-type-chips-row::-webkit-scrollbar {
  display: none;
}

.media-chip {
  padding: 5px 12px;
  background: var(--dn-soft);
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dn-ink);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.media-chip.active {
  background: #1c1b19;
  color: #ffffff;
  box-shadow: none;
}

/* Collection Search Input */
.collection-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 2px;
}

.search-input-icon {
  position: absolute;
  left: 12px;
  font-size: 16px;
  color: #a2a2a2;
  pointer-events: none;
}

.collection-search-input {
  width: 100%;
  padding: 9px 34px 9px 36px;
  border-radius: 12px;
  border: 1px solid var(--dn-line);
  background: #ffffff;
  font-size: 12.5px;
  color: #1c1b19;
  outline: none;
  box-shadow: none;
  transition: all 0.15s ease;
}

.collection-search-input:focus {
  border-color: #1c1b19;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.05);
}

.collection-search-input::placeholder {
  color: #a2a2a2;
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #a2a2a2;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

/* MOVIES GRID & CARDS */
.movies-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.movie-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 14px;
  border: 1px solid var(--dn-line);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  min-width: 0;
  overflow: hidden;
}

.movie-card.is-watched {
  border-color: rgba(163, 163, 163, 0.25);
}

.movie-card.is-watching {
  border-color: rgba(177, 177, 177, 0.35);
  background: linear-gradient(180deg, #ffffff 0%, #fdfdfd 100%);
}

.movie-card-main {
  display: flex;
  gap: 12px;
}

/* Poster Container */
.poster-container {
  width: 96px;
  min-width: 96px;
  height: 144px;
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  background: #1c1b19;
  box-shadow: none;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.poster-container:active {
  transform: scale(0.97);
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
  background: linear-gradient(135deg, #1c1b19, #404040);
  color: #a2a2a2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  text-align: center;
  gap: 6px;
}

.poster-placeholder ion-icon {
  font-size: 30px;
  color: #d4d4d4;
}

.poster-placeholder span {
  font-size: 9.5px;
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
  pointer-events: none;
}

.type-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2.5px 6px;
  border-radius: 6px;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: none;
}

.type-movie { background: rgba(28, 27, 25, 0.85); }
.type-tv { background: rgba(28, 27, 25, 0.88); }
.type-anime { background: rgba(64, 64, 64, 0.88); }

.tmdb-score-tag {
  font-size: 9.5px;
  font-weight: 700;
  background: rgba(28, 27, 25, 0.85);
  color: #c8c8c8;
  padding: 2.5px 5.5px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 2.5px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: none;
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
  justify-content: flex-start;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
}

.movie-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
  color: #1c1b19;
  line-height: 1.28;
  cursor: pointer;
  word-break: break-word;
  padding-bottom: 2px;
  transition: color 0.15s ease;
}

.movie-title:active {
  color: #7d7d7d;
}

.more-menu-btn {
  background: none;
  border: none;
  color: #a2a2a2;
  font-size: 18px;
  padding: 2px;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.more-menu-btn:hover,
.more-menu-btn:active {
  color: #d96856;
  background: rgba(217, 104, 86, 0.08);
}

.movie-original-title {
  margin: 1px 0 0;
  font-size: 11px;
  color: #737373;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.35;
  padding-bottom: 1px;
}

.movie-sub-info {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  font-size: 11.5px;
  color: #737373;
  font-weight: 500;
  line-height: 1.35;
}

.year-tag {
  font-weight: 700;
  color: #404040;
  line-height: 1.35;
}

.sub-info-bullet {
  color: #d4d4d4;
  font-weight: 700;
}

.genres-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.35;
  padding-bottom: 1px;
}

.status-pill-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  line-height: 1.25;
}

.status-planned {
  background: #f2f3f5;
  color: #545454;
}
.status-planned .status-dot { background: #a2a2a2; }

.status-watching {
  background: #f1f2f4;
  color: #6f6f6f;
}
.status-watching .status-dot {
  background: #b1b1b1;
  box-shadow: none;
  animation: pulseDot 1.5s infinite;
}

.status-watched {
  background: #f7f8fa;
  color: #535353;
}
.status-watched .status-dot { background: #a3a3a3; }

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

@keyframes pulseDot {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.4); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}

.watched-date-meta {
  font-size: 10.5px;
  color: #a2a2a2;
  font-weight: 500;
}

.movie-overview-excerpt {
  margin: 6px 0 0;
  font-size: 11.5px;
  color: #545454;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* REVIEWS SECTION IN CARD */
.reviews-section-box {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.reviews-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.duo-score-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  padding: 3px 9px;
  border-radius: 8px;
  border: 1px solid #e5e6e8;
  box-shadow: none;
}

.star-gold {
  color: #b1b1b1;
  font-size: 14px;
}

.duo-score-val {
  font-size: 12.5px;
  font-weight: 700;
  color: #1c1b19;
}

.duo-score-sub {
  font-size: 10px;
  color: #737373;
  font-weight: 600;
}

.not-rated-chip {
  color: #a2a2a2;
  font-size: 11px;
  font-weight: 600;
}

.add-review-btn {
  background: #ffffff;
  border: 1px solid #d4d4d4;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #1c1b19;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.add-review-btn:active {
  transform: scale(0.96);
  background: #f2f3f5;
}

/* Reviews Couple Grid */
.reviews-couple-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.review-bubble {
  background: #ffffff;
  border: 1px solid var(--dn-line);
  border-left-width: 3px;
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: none;
}

.review-user-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.avatar-circle-sm {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.review-author-name {
  font-size: 11px;
  font-weight: 700;
  color: #404040;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.35;
  padding-bottom: 1px;
}

.user-score-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  color: #b1b1b1;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.user-score-badge ion-icon {
  font-size: 11px;
}

.review-comment-text {
  margin: 0;
  font-size: 11px;
  color: #1c1b19;
  font-style: italic;
  line-height: 1.35;
  word-break: break-word;
}

.review-comment-empty {
  margin: 0;
  font-size: 10px;
  color: #a2a2a2;
}

.review-placeholder {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #7d7d7d;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
}

.review-waiting-note {
  margin: 0;
  font-size: 10px;
  color: #a2a2a2;
  font-style: italic;
}

/* MOVIE ACTIONS FOOTER */
.movie-actions-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-top: 6px;
  border-top: 1px solid #f2f3f5;
}

.footer-btn {
  flex: 1;
  padding: 8px 10px;
  border-radius: 11px;
  font-size: 11.5px;
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
  transform: scale(0.97);
}

.mark-watched-btn {
  background: #838383;
  color: #ffffff;
  box-shadow: none;
}

.start-watching-btn {
  background: #1c1b19;
  color: #ffffff;
  box-shadow: none;
}

.back-planned-btn {
  background: #f2f3f5;
  color: #545454;
  border: 1px solid #e5e6e8;
}

.schedule-date-btn {
  background: #ffffff;
  color: #1c1b19;
  border: 1px solid #e5e6e8;
  box-shadow: none;
}

.schedule-date-btn ion-icon {
  color: #737373;
  font-size: 13px;
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
  border: 1px solid var(--dn-line);
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #f2f3f5;
  color: #1c1b19;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-movies-box h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1c1b19;
}

.empty-movies-box p {
  margin: 0;
  font-size: 13px;
  color: #737373;
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
  color: #737373;
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
  border: 1px solid var(--dn-line);
}

.not-paired-icon {
  width: 68px;
  height: 68px;
  border-radius: 22px;
  background: #f2f3f5;
  color: #1c1b19;
  font-size: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.not-paired-card h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: #1c1b19;
}

.not-paired-card p {
  margin: 0;
  font-size: 13.5px;
  color: #737373;
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
  border-bottom: 1px solid #f2f3f5;
}

.modal-title-col h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1c1b19;
}

.modal-title-col p {
  margin: 2px 0 0;
  font-size: 12px;
  color: #737373;
}

.modal-close-btn {
  background: var(--dn-soft);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--dn-ink);
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
  --box-shadow: 0 -12px 40px rgba(28, 27, 25, 0.16);
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
  border-bottom: 1px solid rgba(242, 243, 245, 0.9);
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
  background: #1c1b19;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 20px;
  box-shadow: none;
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
  background: #a6a6a6;
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.catalog-live-pill {
  background: var(--dn-soft);
  color: #545454;
  font-size: 10.5px;
  font-weight: 500;
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
  background: #a3a3a3;
}

.search-modal-heading {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1c1b19;
  letter-spacing: -0.2px;
}

.modal-circle-close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--dn-soft);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dn-ink);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.modal-circle-close-btn:hover {
  background: #e5e6e8;
  color: #1c1b19;
}

.modal-circle-close-btn:active {
  transform: scale(0.92);
}

/* Sticky Search Bar & Segment Controls */
.search-controls-wrapper {
  padding: 12px 18px 10px;
  background: #ffffff;
  border-bottom: 1px solid #f8f9fb;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
}

.tmdb-search-input-box {
  position: relative;
  display: flex;
  align-items: center;
  background: #f8f9fb;
  border: 1.5px solid #e5e6e8;
  border-radius: 16px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: inset 0 1px 2px rgba(28, 27, 25, 0.02);
}

.tmdb-search-input-box.is-active {
  border-color: #1c1b19;
  background: #ffffff;
  box-shadow: none;
}

.search-icon-orb {
  position: absolute;
  left: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #737373;
  pointer-events: none;
}

.tmdb-input {
  width: 100%;
  padding: 13px 40px 13px 44px;
  border: none;
  background: transparent;
  font-size: 14.5px;
  font-weight: 600;
  color: #1c1b19;
  outline: none;
}

.tmdb-input::placeholder {
  color: #a2a2a2;
  font-weight: 400;
}

.clear-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: #a2a2a2;
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
  color: #737373;
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
  background: var(--dn-soft);
  border: none;
  font-size: 12px;
  font-weight: 500;
  color: #545454;
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
  background: #f2f3f5;
  border-color: #d4d4d4;
}

.search-tab-pill:active {
  transform: scale(0.95);
}

.search-tab-pill.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
}

/* API Key Warning */
.api-key-warning-card {
  padding: 10px 14px;
  background: #f9fafc;
  border: 1px solid #e4e5e7;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #585858;
}

.warning-icon-pill {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f1f2f4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #909090;
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
  color: #585858;
}

.warning-desc {
  font-size: 11px;
  color: #6f6f6f;
}

.warning-action-btn {
  padding: 6px 12px;
  background: #b1b1b1;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
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
  background: var(--dn-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

.loading-crescent {
  color: #1c1b19;
  width: 28px;
  height: 28px;
}

.loading-title {
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
}

.loading-subtitle {
  font-size: 12px;
  color: #737373;
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
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}

.error-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1c1b19;
}

.error-desc {
  margin: 0;
  font-size: 12.5px;
  color: #737373;
  max-width: 280px;
}

.retry-search-btn {
  margin-top: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  background: #f2f3f5;
  border: 1px solid #e5e6e8;
  color: #1c1b19;
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
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #737373;
  display: flex;
  align-items: center;
  gap: 6px;
}

.count-bubble {
  background: #1c1b19;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
}

.results-manual-link {
  background: none;
  border: none;
  color: #1c1b19;
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
  border: 1px solid var(--dn-line);
  border-radius: 18px;
  box-shadow: none;
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
  background: #1c1b19;
  box-shadow: none;
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
  color: #737373;
  font-size: 28px;
  background: #1c1b19;
}

.res-type-pill {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 5px;
  color: #ffffff;
  letter-spacing: 0.4px;
  box-shadow: 0 2px 4px rgba(28, 27, 25, 0.3);
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
  font-weight: 700;
  color: #1c1b19;
  line-height: 1.25;
}

.res-orig-title {
  font-size: 11px;
  color: #a2a2a2;
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
  background: #f2f3f5;
  color: #545454;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
}

.meta-rating-badge {
  background: #f9fafc;
  color: #6f6f6f;
  border: 1px solid #f1f2f4;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.meta-rating-badge .star-icon {
  color: #b1b1b1;
  font-size: 12px;
}

.meta-genre-badge {
  color: #737373;
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
  color: #545454;
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
  background: #1c1b19;
  color: #ffffff;
  border: none;
  box-shadow: none;
}

.action-pill-btn.btn-watched {
  background: #f7f8fa;
  color: #838383;
  border: 1.5px solid #e1e2e4;
}

.already-added-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 10px;
  background: #f7f8fa;
  color: #838383;
  border: 1px solid #e7e8ea;
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
  background: #f3f4f6;
  color: #d96856;
  border: 1px solid #e6e7e9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: none;
  flex-shrink: 0;
}

.trending-heading {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
}

.trending-subheading {
  margin: 1px 0 0;
  font-size: 11.5px;
  color: #737373;
}

.trending-loading-box {
  padding: 48px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #737373;
  font-size: 13.5px;
  font-weight: 500;
}

.trending-loading-box ion-spinner {
  width: 32px;
  height: 32px;
  color: #888888;
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
  background: #1c1b19;
  box-shadow: none;
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
  color: #737373;
  font-size: 24px;
  background: #1c1b19;
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
  background: rgba(28, 27, 25, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 6px;
  color: #c8c8c8;
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 5px;
  box-shadow: none;
}

.tr-glass-type {
  font-size: 8px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 6px;
  text-transform: uppercase;
  color: #ffffff;
  box-shadow: none;
}

.tr-add-hover-btn {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(28, 27, 25, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(28, 27, 25, 0.25);
  transition: all 0.15s ease;
}

.tr-add-hover-btn.is-added {
  background: #a3a3a3;
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
  color: #1c1b19;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.tr-meta-text {
  font-size: 10.5px;
  color: #737373;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tr-on-list-tag {
  color: #a3a3a3;
  font-weight: 700;
}

.trending-placeholder-note {
  padding: 36px 16px;
  background: #f8f9fb;
  border: 1px dashed #d4d4d4;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  color: #737373;
}

.note-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--dn-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--dn-ink);
  box-shadow: none;
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
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: none;
}

.no-results-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1c1b19;
}

.no-results-desc {
  margin: 0;
  font-size: 12.5px;
  color: #737373;
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
  background: #f8f9fb;
  border-radius: 14px;
  border: 1px solid #e5e6e8;
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
  font-weight: 700;
  color: #1c1b19;
}

.review-preview-meta span {
  font-size: 11.5px;
  color: #737373;
  margin-top: 2px;
}

.preview-desc-trunc {
  margin: 4px 0 0;
  font-size: 11px;
  color: #545454;
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
  background: #f5f6f8;
  border: 1px solid #eaebed;
  border-radius: 16px;
}

.rating-title-label {
  font-size: 13px;
  font-weight: 700;
  color: #4b4b4b;
}

.rating-display-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.rating-big-num {
  font-size: 42px;
  font-weight: 700;
  color: #1c1b19;
  line-height: 1;
}

.rating-big-scale {
  font-size: 16px;
  font-weight: 700;
  color: #404040;
}

.rating-descriptor {
  font-size: 14px;
  font-weight: 700;
  color: #545454;
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
  color: #d4d4d4;
  cursor: pointer;
  padding: 2px;
  transition: transform 0.15s ease;
}

.star-score-btn.active {
  color: #b1b1b1;
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
  border: none;
  background: var(--dn-soft);
  font-size: 12px;
  font-weight: 500;
  color: #545454;
  cursor: pointer;
}

.rating-chip-btn.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
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
  color: #1c1b19;
}

.textarea-hint {
  font-size: 11px;
  color: #a2a2a2;
  font-weight: 500;
}

.review-textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #d4d4d4;
  font-size: 13.5px;
  color: #1c1b19;
  background: #f8f9fb;
  outline: none;
  font-family: inherit;
  resize: vertical;
}

.review-textarea:focus {
  border-color: #1c1b19;
}

.partner-existing-review-box {
  padding: 12px;
  background: #f2f3f5;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.partner-rev-title {
  font-size: 12px;
  font-weight: 700;
  color: #404040;
}

.partner-rev-quote {
  margin: 0;
  font-size: 12px;
  color: #1c1b19;
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
  --box-shadow: 0 -12px 40px rgba(28, 27, 25, 0.16);
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
  border-bottom: 1px solid rgba(242, 243, 245, 0.9);
}

.random-header-branding {
  display: flex;
  align-items: center;
  gap: 12px;
}

.glyph-amber {
  background: #f1f2f4 !important;
  color: #909090 !important;
  border: 1px solid #e4e5e7 !important;
  box-shadow: none !important;
}

.random-brand-badge {
  background: var(--dn-soft);
  color: #545454;
  font-size: 10px;
  font-weight: 500;
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
  font-weight: 700;
  color: #1c1b19;
  letter-spacing: -0.2px;
}

.random-picker-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  -webkit-overflow-scrolling: touch;
}

/* Source Choice Segmented Control */
.random-source-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  background: #f2f3f5;
  border-radius: 14px;
}

.source-tab-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #737373;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.source-tab-pill ion-icon {
  font-size: 16px;
}

.source-tab-pill.active {
  background: #ffffff;
  color: #1c1b19;
  box-shadow: none;
  font-weight: 700;
}

.source-count-tag {
  background: #e5e6e8;
  color: #545454;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
}

.source-tab-pill.active .source-count-tag {
  background: #f2f3f5;
  color: #1c1b19;
}

/* Filters Containers */
.source-filters-box {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filters-sub-label {
  font-size: 10.5px;
  font-weight: 700;
  color: #737373;
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
  padding: 5px 11px;
  border-radius: 999px;
  border: none;
  background: var(--dn-soft);
  font-size: 12px;
  font-weight: 500;
  color: #545454;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.random-filter-pill:active {
  transform: scale(0.96);
}

.random-filter-pill.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
}

.available-counter-bar {
  font-size: 11px;
  color: #737373;
  margin-top: 1px;
}

.available-counter-bar strong {
  color: #1c1b19;
}

.empty-warn-text {
  color: #c2412d;
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
  padding: 5px 11px;
  border-radius: 9px;
  background: #ffffff;
  border: 1px solid #e5e6e8;
  font-size: 12px;
  font-weight: 600;
  color: #545454;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.genre-chip-btn:active {
  transform: scale(0.96);
}

.genre-chip-btn.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
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
  border: 1px solid #e5e6e8;
  font-size: 11.5px;
  font-weight: 600;
  color: #545454;
  cursor: pointer;
  white-space: nowrap;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.rating-filter-pill:active {
  transform: scale(0.96);
}

.rating-filter-pill.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
  box-shadow: none;
}

/* Shuffler / Winner Card */
.random-display-card {
  width: auto;
  min-height: 160px;
  padding: 16px;
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid var(--dn-line);
  box-shadow: none;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* Spinning State */
.spinning-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 10px;
}

.spinning-dice-orb {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--dn-soft);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #1c1b19;
}

.dice-spin-anim {
  animation: diceSpin 0.7s infinite ease-in-out;
}

@keyframes diceSpin {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}

.spinning-header {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
}

.shuffle-title-badge {
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--dn-soft);
  color: #1c1b19;
  font-size: 13px;
  font-weight: 500;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Winner State - Horizontal Compact iOS Style */
.winner-card-layout {
  display: flex;
  gap: 12px;
  width: 100%;
  align-items: stretch;
  animation: winnerPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes winnerPop {
  0% { transform: scale(0.92); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.winner-poster-box {
  width: 90px;
  min-width: 90px;
  height: 135px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #1c1b19;
  border: 1px solid #e5e6e8;
  flex-shrink: 0;
}

.winner-poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.winner-poster-empty {
  width: 100%;
  height: 100%;
  background: #1c1b19;
  color: #a2a2a2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}

.winner-type-pill {
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.winner-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: left;
  gap: 3px;
}

.winner-badge-pill {
  font-size: 11px;
  font-weight: 700;
  color: #1c1b19;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.winner-title {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
  color: #1c1b19;
  line-height: 1.25;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.winner-tags-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin: 2px 0 1px;
}

.winner-year {
  background: #f2f3f5;
  color: #545454;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 5px;
}

.winner-score {
  background: #f9fafc;
  color: #6f6f6f;
  border: 1px solid #f1f2f4;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 5px;
}

.winner-genre {
  color: #737373;
  font-size: 11px;
  font-weight: 600;
}

.winner-desc {
  margin: 1px 0 0;
  font-size: 11.5px;
  color: #737373;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.winner-already-note {
  margin-top: 3px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #838383;
}

/* Prompt State */
.random-prompt-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #737373;
  padding: 12px;
}

.prompt-orb-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--dn-soft);
  border: none;
  color: #1c1b19;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.random-prompt-state h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
}

.random-prompt-state p {
  margin: 0;
  font-size: 12px;
  max-width: 290px;
  line-height: 1.4;
}

/* Error State in Randomizer */
.random-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #737373;
  padding: 16px;
}

.error-glyph {
  font-size: 32px;
  color: #d96856;
}

.random-error-state h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
}

.random-error-state p {
  margin: 0;
  font-size: 12px;
  max-width: 280px;
}

/* Footer & Buttons */
.random-actions-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}

.winner-primary-btn {
  width: 100%;
  background: #1c1b19;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 13px 18px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: none;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  touch-action: manipulation;
}

.winner-primary-btn:active {
  transform: scale(0.97);
  background: #1c1b19;
}

.winner-secondary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.winner-secondary-row.single-col {
  grid-template-columns: 1fr;
}

.winner-secondary-btn {
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8f9fb;
  color: #1c1b19;
  border: 1px solid #e5e6e8;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.winner-secondary-btn:active {
  transform: scale(0.97);
  background: #f2f3f5;
}

.spin-main-btn {
  width: 100%;
  background: #1c1b19;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 13px 18px;
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: none;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  touch-action: manipulation;
}

.spin-main-btn:active {
  transform: scale(0.97);
  background: #1c1b19;
}

.spin-again-btn {
  width: 100%;
  padding: 10px;
  border-radius: 12px;
  background: transparent;
  color: #737373;
  border: 1px solid #e5e6e8;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.spin-again-btn:active {
  transform: scale(0.97);
  background: #f8f9fb;
}

.empty-list-switch-box {
  padding: 12px;
  background: #f8f9fb;
  border: 1px dashed #d4d4d4;
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
  color: #737373;
}

.switch-to-tmdb-btn {
  background: none;
  border: none;
  color: #1c1b19;
  font-size: 12px;
  font-weight: 700;
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

.form-input {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--dn-line);
  font-size: 13.5px;
  color: #1c1b19;
  outline: none;
  background: #ffffff;
}

.form-input:focus {
  border-color: #1c1b19;
}

.form-textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--dn-line);
  font-size: 13.5px;
  color: #1c1b19;
  outline: none;
  font-family: inherit;
  resize: vertical;
  background: #ffffff;
}

.form-textarea:focus {
  border-color: #1c1b19;
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
  border: 1px solid #d4d4d4;
  background: #f8f9fb;
  font-size: 12px;
  font-weight: 700;
  color: #545454;
  cursor: pointer;
}

.choice-pill.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
}

.submit-manual-btn {
  width: 100%;
  padding: 14px;
  font-size: 15px;
  margin-top: 8px;
}

/* ========================================================== */
/* DETAILS MODAL (PODGLĄD FILMU / SZCZEGÓŁY) */
/* ========================================================== */
ion-modal.dn-movies-details-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -12px 40px rgba(28, 27, 25, 0.16);
}

.details-modal-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  overflow: hidden;
}

.details-modal-header {
  padding: 14px 18px 12px;
  border-bottom: 1px solid rgba(242, 243, 245, 0.9);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.details-top-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: inline-block;
  margin-bottom: 2px;
}

.badge-saved {
  background: #f2f3f5;
  color: #6f6f6f;
}

.badge-tmdb {
  background: #f2f3f5;
  color: #1c1b19;
}

.details-header-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #1c1b19;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
}

.details-body {
  padding: 0 0 32px;
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 2rem;
}

.details-hero-wrap {
  position: relative;
  overflow: hidden;
  min-height: 230px;
  background: #1c1b19;
}

.details-poster-backdrop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
  background: #1c1b19;
}

.details-backdrop-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 25%;
  opacity: 0.92;
  display: block;
}

.backdrop-gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(28, 27, 25, 0.1) 0%,
    rgba(28, 27, 25, 0.35) 45%,
    rgba(28, 27, 25, 0.75) 80%,
    rgba(28, 27, 25, 0.92) 100%
  );
}

.details-floating-meta {
  display: flex;
  gap: 14px;
  padding: 80px 18px 20px 18px;
  position: relative;
  z-index: 2;
  align-items: flex-end;
  margin: 0;
  width: 100%;
}

.details-float-poster {
  width: 96px;
  min-width: 96px;
  height: 144px;
  border-radius: 14px;
  overflow: hidden;
  background: #1c1b19;
  box-shadow: none;
  border: 2px solid rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}

.details-float-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.float-poster-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a2a2a2;
  font-size: 32px;
}

.details-float-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 4px;
}

.float-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.25;
  text-shadow: 0 1px 4px rgba(28, 27, 25, 0.7);
  word-break: break-word;
}

.float-orig-title {
  font-size: 11.5px;
  color: #d4d4d4;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(28, 27, 25, 0.6);
}

.details-pills-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.details-pills-row .type-tag {
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.details-year-tag {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.details-content-meta {
  padding: 18px 18px 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.details-section-heading {
  margin: 6px 0 2px;
  font-size: 12px;
  font-weight: 700;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.details-full-desc {
  margin: 0;
  font-size: 13.5px;
  color: #404040;
  line-height: 1.55;
}

.details-genres-wrap {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.genre-pill {
  padding: 4px 10px;
  background: #f2f3f5;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #545454;
}

.details-reviews-box {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.details-reviews-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-review-card {
  padding: 8px 10px;
  background: #ffffff;
  border-radius: 10px;
  border-left: 3px solid #1c1b19;
}

.mini-review-card.partner {
  border-left-color: #a6a6a6;
}

.review-user-name {
  font-size: 11px;
  font-weight: 700;
  color: #1c1b19;
}

.review-comment-text {
  margin: 2px 0 0;
  font-size: 12px;
  color: #545454;
  line-height: 1.35;
  overflow-wrap: break-word;
  word-break: break-word;
}

.details-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid #f2f3f5;
}

.details-add-options-label,
.details-status-label {
  font-size: 11px;
  font-weight: 700;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
  display: block;
}

.details-add-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.details-btn-primary {
  width: 100%;
  padding: 13px 18px;
  border-radius: 13px;
  background: #1c1b19;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: none;
  touch-action: manipulation;
  transition: transform 0.15s ease, background 0.15s ease;
}

.details-btn-primary:active {
  transform: scale(0.98);
  background: #1c1b19;
}

.details-btn-primary ion-icon {
  font-size: 18px;
}

.details-btn-primary.review-btn {
  background: #1c1b19;
  box-shadow: none;
}

.details-secondary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.details-btn-secondary {
  padding: 11px 12px;
  border-radius: 12px;
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  color: #1c1b19;
  font-size: 12.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.details-btn-secondary:active {
  transform: scale(0.97);
  background: #f2f3f5;
}

.details-btn-secondary ion-icon {
  font-size: 16px;
  color: #737373;
}

.details-btn-secondary.date-btn {
  width: 100%;
  background: #f8f9fb;
  border: 1px dashed #d4d4d4;
  color: #404040;
}

.details-status-control-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.details-status-change-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4px;
  padding: 4px;
  background: #f2f3f5;
  border-radius: 12px;
}

.status-toggle-pill {
  padding: 8px 4px;
  border-radius: 9px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: #737373;
  cursor: pointer;
  text-align: center;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.status-toggle-pill.active {
  background: #ffffff;
  color: #1c1b19;
  font-weight: 700;
  box-shadow: none;
}

.details-delete-btn {
  background: none;
  border: none;
  color: #a2a2a2;
  font-size: 12px;
  font-weight: 600;
  padding: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-top: 2px;
  transition: color 0.15s ease;
  touch-action: manipulation;
}

.details-delete-btn:active {
  color: #d96856;
}

.details-delete-btn ion-icon {
  font-size: 14px;
}

/* BUTTONS */
.dn-button-primary {
  background: #1c1b19;
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
  box-shadow: none;
}

.dn-button-primary:active {
  transform: scale(0.97);
  background: #1c1b19;
}

/* SERIES EPISODE BADGE (IN STATUS ROW) */
.series-ep-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--dn-soft);
  border: none;
  color: #404040;
  font-size: 10.5px;
  font-weight: 500;
  padding: 2.5px 7.5px;
  border-radius: 999px;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.series-ep-pill:active {
  background: #f2f3f5;
  border-color: #d4d4d4;
}

.series-ep-pill ion-icon {
  font-size: 12px;
  color: #737373;
}

/* SERIES CARD TRACKER BOX */
.series-card-tracker {
  padding: 8px 12px;
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.series-tracker-left {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.series-tracker-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e6e8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #1c1b19;
  flex-shrink: 0;
}

.series-tracker-meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.series-tracker-label {
  font-size: 8.5px;
  font-weight: 700;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.series-tracker-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #1c1b19;
  white-space: nowrap;
}

.tracker-dot {
  color: #d4d4d4;
  font-size: 11px;
}

.series-tracker-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tracker-btn {
  height: 30px;
  min-width: 30px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid #e5e6e8;
  background: #ffffff;
  color: #404040;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.1s ease, background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.tracker-btn:active {
  transform: scale(0.94);
  background: #f2f3f5;
}

.tracker-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tracker-btn-edit {
  color: #737373;
  font-size: 13px;
}

.tracker-btn-plus {
  background: #1c1b19;
  border-color: #1c1b19;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  gap: 2px;
  padding: 0 9px;
}

.tracker-btn-plus:active {
  background: #1c1b19;
}

/* DETAILS MODAL SERIES TRACKER BOX */
.details-series-tracker-box {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.details-series-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.details-series-title-grp {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.details-series-title-grp ion-icon {
  font-size: 14px;
  color: #1c1b19;
}

.details-series-indicator {
  font-size: 11.5px;
  font-weight: 700;
  background: #1c1b19;
  color: #ffffff;
  padding: 2px 7px;
  border-radius: 6px;
}

.details-series-steppers-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.series-stepper-cell {
  background: #ffffff;
  border: 1px solid #e5e6e8;
  border-radius: 11px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stepper-sublabel {
  font-size: 10.5px;
  font-weight: 700;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.stepper-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.step-circle-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #e5e6e8;
  background: #f8f9fb;
  color: #1c1b19;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.1s ease;
}

.step-circle-btn:active {
  transform: scale(0.92);
}

.step-circle-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.step-circle-plus {
  background: #1c1b19;
  border-color: #1c1b19;
  color: #ffffff;
}

.step-num-val {
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
}

.ep-custom-change-btn {
  width: 100%;
  font-size: 12px;
  padding: 8px 12px;
}

/* MODAL 6: EPISODE PROGRESS MODAL */
ion-modal.dn-movies-episode-modal {
  --border-radius: 24px 24px 0 0;
}

.ep-modal-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.ep-modal-scroll {
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.ep-series-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 14px;
  padding: 10px 12px;
}

.ep-series-thumb {
  width: 44px;
  height: 62px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  background: #1c1b19;
}

.ep-series-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ep-series-meta h4 {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: #1c1b19;
  line-height: 1.25;
}

.ep-current-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: #545454;
}

.ep-selectors-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ep-stepper-card {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ep-card-title {
  font-size: 10.5px;
  font-weight: 700;
  color: #737373;
  letter-spacing: 0.6px;
}

.ep-stepper-action-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.ep-circle-stepper-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e5e6e8;
  color: #1c1b19;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.1s ease;
}

.ep-circle-stepper-btn:active {
  transform: scale(0.92);
}

.ep-circle-stepper-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ep-circle-stepper-btn.ep-circle-primary {
  background: #1c1b19;
  border-color: #1c1b19;
  color: #ffffff;
}

.ep-number-display {
  min-width: 32px;
  text-align: center;
}

.ep-big-num {
  font-size: 24px;
  font-weight: 700;
  color: #1c1b19;
}

.ep-manual-input-box {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ep-input-label {
  font-size: 11px;
  font-weight: 700;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.ep-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #d4d4d4;
  border-radius: 11px;
  padding: 6px 12px;
}

.ep-input-prefix {
  font-size: 13px;
  font-weight: 600;
  color: #737373;
  white-space: nowrap;
}

.ep-manual-number-input {
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
  width: 100%;
  outline: none;
}

.ep-presets-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.ep-preset-chip {
  padding: 6px 10px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e6e8;
  color: #404040;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.ep-preset-chip:active {
  transform: scale(0.96);
  background: #f2f3f5;
}

.ep-save-btn {
  margin-top: 6px;
}

.pill-emoji,
.genre-emoji {
  display: none;
}

/* ===== Beige accent: empty states ===== */
.empty-icon-wrap {
  background: var(--dn-cream) !important;
  color: var(--dn-cream-ink) !important;
  border: none !important;
}

/* =========================================================
   MOVIE LIST – compact rows (mv-*)
   ========================================================= */
.movies-grid {
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  margin: 4px 0 0 !important;
  padding: 0 !important;
}

.mv-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--dn-line);
}

.mv-row:last-child {
  border-bottom: none;
}

.mv-poster {
  width: 64px;
  height: 92px;
  padding: 0;
  border: none;
  border-radius: 12px;
  overflow: hidden;
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  cursor: pointer;
}

.mv-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mv-row.is-watched .mv-poster {
  opacity: 0.72;
}

.mv-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding-top: 2px;
}

.mv-title {
  max-width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--dn-ink);
  text-align: left;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}

.mv-meta {
  max-width: 100%;
  font-size: 13px;
  color: var(--dn-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mv-status-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.mv-status {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--dn-soft);
  font-size: 12px;
  font-weight: 500;
  color: var(--dn-muted);
}

.mv-status.is-watching {
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
}

.mv-status.is-watched {
  background: var(--dn-ink);
  color: #ffffff;
}

.mv-score,
.mv-date {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12.5px;
  color: var(--dn-muted);
}

.mv-score ion-icon {
  font-size: 12px;
  color: var(--dn-cream-ink);
}

.mv-episode {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.mv-ep-label {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: var(--dn-cream);
  color: var(--dn-ink);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.mv-ep-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
}

.mv-ep-btn.is-plus {
  background: var(--dn-ink);
  color: #ffffff;
}

.mv-ep-btn:disabled {
  opacity: 0.4;
}

.mv-ratings {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
}

.mv-rate {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px 0 3px;
  border-radius: 999px;
  background: var(--dn-soft);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dn-ink);
}

.mv-rate-av {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.mv-rate-avg {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
  font-size: 12.5px;
  font-weight: 600;
}

.mv-quote {
  margin: 4px 0 0;
  font-family: var(--dn-serif);
  font-size: 14px;
  font-style: italic;
  line-height: 1.4;
  color: var(--dn-muted);
}

.mv-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mv-check {
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
  cursor: pointer;
}

.mv-check.done {
  background: var(--dn-ink);
  border-color: var(--dn-ink);
  color: #ffffff;
}

.mv-more {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--dn-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
}
</style>
