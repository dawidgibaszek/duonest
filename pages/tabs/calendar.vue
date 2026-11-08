<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div>
              <div class="dn-header-title">
                <span>Wspólny Terminarz</span>
              </div>
              <div class="header-status-line" v-if="isPartnerOnline">
                <span class="partner-online-pill">
                  <span class="pulsing-dot"></span>
                  <span>{{ partnerUser?.name || 'Partner' }} w aplikacji</span>
                </span>
              </div>
            </div>

            <div class="header-buttons-group">
              <button
                type="button"
                class="header-sync-btn"
                @click="showSyncModal = true"
                title="Synchronizuj z kalendarzem w telefonie, Google, Apple i Outlook"
                aria-label="Synchronizacja kalendarza"
              >
                <ion-icon :icon="ioniconsSyncOutline" />
                <span>Synchronizuj</span>
              </button>
              <button class="new-event-btn" @click="openAddModalForDate(selectedDateStr)">
                <ion-icon :icon="ioniconsAddOutline" />
                <span>Dodaj plan</span>
              </button>
            </div>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="calendar-page-content">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- FEATURED HERO WIDGET: NEXT UPCOMING BIG EVENT -->
      <div v-if="featuredUpcomingEvent" class="featured-hero-card" @click="selectDate(getDateOnly(featuredUpcomingEvent.start_time))">
        <div class="hero-glow-bg"></div>
        <div class="featured-header">
          <span class="featured-tag">
            <DuoIcon name="calendar-heart" :size="13" />
            <span>NAJBLIŻSZE WYDARZENIE</span>
          </span>
          <span class="featured-countdown">{{ getCountdownLabel(featuredUpcomingEvent.start_time) }}</span>
        </div>

        <h3 class="featured-title">{{ featuredUpcomingEvent.title }}</h3>

        <div class="featured-meta-row">
          <span class="featured-badge" :class="'cat-' + featuredUpcomingEvent.category">
            <DuoIcon :name="'cat-' + featuredUpcomingEvent.category" :size="13" />
            <span>{{ getCategoryLabel(featuredUpcomingEvent.category) }}</span>
          </span>
          <span class="featured-time">
            <ion-icon :icon="ioniconsTimeOutline" />
            {{ formatTimeOnly(featuredUpcomingEvent.start_time) }}
          </span>
          <span class="featured-loc" v-if="featuredUpcomingEvent.location">
            <ion-icon :icon="ioniconsLocationOutline" />
            {{ featuredUpcomingEvent.location }}
          </span>
        </div>
      </div>

      <!-- VIEW MODE SEGMENT SWITCHER -->
      <div class="view-mode-bar">
        <div class="mode-pills-container">
          <button
            class="mode-pill-btn"
            :class="{ active: activeViewMode === 'month' }"
            @click="activeViewMode = 'month'"
          >
            <ion-icon :icon="ioniconsGridOutline" />
            <span>Miesiąc</span>
          </button>
          <button
            class="mode-pill-btn"
            :class="{ active: activeViewMode === 'week' }"
            @click="activeViewMode = 'week'"
          >
            <ion-icon :icon="ioniconsCalendarOutline" />
            <span>Tydzień</span>
          </button>
          <button
            class="mode-pill-btn"
            :class="{ active: activeViewMode === 'agenda' }"
            @click="activeViewMode = 'agenda'"
          >
            <ion-icon :icon="ioniconsListOutline" />
            <span>Agenda ({{ filteredUpcomingEvents.length }})</span>
          </button>
        </div>
      </div>

      <!-- CATEGORY FILTER PILLS -->
      <div class="category-filter-scroll">
        <button
          class="cat-filter-chip"
          :class="{ active: selectedCategoryFilter === 'all' }"
          @click="selectedCategoryFilter = 'all'"
        >
          <DuoIcon name="cat-all" :size="13" />
          <span>Wszystkie</span>
          <span class="chip-count">{{ eventsList.length }}</span>
        </button>
        <button
          v-for="cat in eventCategories"
          :key="cat.value"
          class="cat-filter-chip"
          :class="[
            'filter-' + cat.value,
            { active: selectedCategoryFilter === cat.value }
          ]"
          @click="selectedCategoryFilter = cat.value"
        >
          <DuoIcon :name="'cat-' + cat.value" :size="13" />
          <span>{{ cat.label }}</span>
          <span class="chip-count">{{ getCategoryCount(cat.value) }}</span>
        </button>
      </div>

      <!-- ============================================== -->
      <!-- VIEW 1: INTERACTIVE MONTH CALENDAR GRID       -->
      <!-- ============================================== -->
      <div v-show="activeViewMode === 'month'" class="month-view-container">
        <div
          class="dn-card calendar-card"
          data-no-swipe
          @touchstart.stop="onCalendarTouchStart"
          @touchend.stop="onCalendarTouchEnd"
        >
          <!-- Month Navigation Bar -->
          <div class="month-nav-bar">
            <button class="nav-arrow-btn" @click="prevMonth" title="Poprzedni miesiąc">
              <ion-icon :icon="ioniconsChevronBackOutline" />
            </button>
            
            <div class="month-label-group">
              <span class="month-label">{{ currentMonthName }} {{ currentYear }}</span>
              <button class="today-chip-btn" v-if="!isCurrentMonthViewed" @click="jumpToToday">
                Dzisiaj
              </button>
            </div>

            <button class="nav-arrow-btn" @click="nextMonth" title="Następny miesiąc">
              <ion-icon :icon="ioniconsChevronForwardOutline" />
            </button>
          </div>

          <!-- Weekdays Header (Pon - Nie) -->
          <div class="weekdays-grid">
            <span v-for="day in weekDaysShort" :key="day" class="weekday-name">
              {{ day }}
            </span>
          </div>

          <!-- Month Days Grid -->
          <div class="days-grid">
            <button
              type="button"
              v-for="cell in calendarCells"
              :key="cell.dateStr"
              class="day-cell"
              :class="{
                'is-today': cell.isToday,
                'is-selected': cell.dateStr === selectedDateStr,
                'not-current-month': !cell.isCurrentMonth,
                'has-events': cell.events.length > 0
              }"
              @click="selectDate(cell.dateStr)"
            >
              <span class="day-number">{{ cell.dayNumber }}</span>

              <!-- Category event dots on this day -->
              <div class="day-dots-container" v-if="cell.events.length > 0">
                <span
                  v-for="(evt, idx) in cell.events.slice(0, 3)"
                  :key="idx"
                  class="category-dot"
                  :class="'dot-' + evt.category"
                ></span>
                <span v-if="cell.events.length > 3" class="more-dots-badge">+{{ cell.events.length - 3 }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- VIEW 2: WEEK HORIZONTAL STRIP VIEW             -->
      <!-- ============================================== -->
      <div v-show="activeViewMode === 'week'" class="week-view-container">
        <div
          class="dn-card week-strip-card"
          data-no-swipe
          @touchstart.stop="onWeekTouchStart"
          @touchend.stop="onWeekTouchEnd"
        >
          <div class="week-strip-header">
            <button class="nav-arrow-btn mini" @click="prevWeek">
              <ion-icon :icon="ioniconsChevronBackOutline" />
            </button>
            <span class="week-strip-title">Tydzień: {{ formatWeekRangeLabel }}</span>
            <button class="nav-arrow-btn mini" @click="nextWeek">
              <ion-icon :icon="ioniconsChevronForwardOutline" />
            </button>
          </div>

          <div class="week-strip-grid">
            <button
              v-for="wDay in currentWeekDays"
              :key="wDay.dateStr"
              class="week-day-pill"
              :class="{
                'is-selected': wDay.dateStr === selectedDateStr,
                'is-today': wDay.isToday
              }"
              @click="selectDate(wDay.dateStr)"
            >
              <span class="w-name">{{ wDay.dayNameShort }}</span>
              <span class="w-num">{{ wDay.dayNumber }}</span>
              <div class="w-dot-line">
                <span
                  v-for="(ev, idx) in wDay.events.slice(0, 2)"
                  :key="idx"
                  class="category-dot mini"
                  :class="'dot-' + ev.category"
                ></span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- SELECTED DAY DETAILS & TIMELINE (for Month/Week)-->
      <!-- ============================================== -->
      <div v-show="activeViewMode !== 'agenda'" class="dn-card selected-day-card">
        <div class="day-card-header">
          <div class="day-header-left">
            <span class="day-section-tag">HARMONOGRAM DNIA</span>
            <h3>{{ formattedSelectedDate }}</h3>
          </div>
          <button class="day-quick-add-btn" @click="openAddModalForDate(selectedDateStr)">
            <ion-icon :icon="ioniconsAddOutline" />
            <span>Zaplanuj</span>
          </button>
        </div>


        <!-- Events List on Selected Day (Unified Agenda Card Design) -->
        <TransitionGroup
          name="dn-list"
          tag="div"
          class="agenda-cards-list day-events-cards-list"
          v-if="filteredSelectedDayEvents.length > 0"
        >
          <div
            v-for="evt in filteredSelectedDayEvents"
            :key="evt.id"
            class="dn-card agenda-card"
            :class="[
              'border-' + evt.category,
              {
                'is-event-done': evt.is_completed,
                'dn-completing': completingEventIds.has(evt.id),
                'dn-item-deleting': deletingEventIds.has(evt.id)
              }
            ]"
            @click="openEditModal(evt)"
          >
            <div class="agenda-card-top">
              <div class="top-left-badges">
                <span class="upcoming-cat-badge" :class="'cat-' + evt.category">
                  <DuoIcon :name="'cat-' + evt.category" :size="12" />
                  <span>{{ getCategoryLabel(evt.category) }}</span>
                </span>
                <span v-if="evt.is_surprise" class="surprise-tag">
                  <DuoIcon name="gift" :size="11" />
                  <span>Niespodzianka</span>
                </span>
              </div>
              <span class="countdown-badge">{{ getCountdownLabel(evt.start_time) }}</span>
            </div>

            <h4
              class="agenda-title"
              :class="{
                strike: evt.is_completed,
                'dn-strike-animated': completingEventIds.has(evt.id)
              }"
            >
              {{ evt.title }}
            </h4>

            <div class="agenda-meta-row" v-if="evt.start_time || evt.location">
              <span class="meta-date" v-if="evt.start_time">
                <ion-icon :icon="ioniconsTimeOutline" />
                {{ formatTimeOnly(evt.start_time) }}<template v-if="evt.end_time"> - {{ formatTimeOnly(evt.end_time) }}</template>
              </span>
              <a
                v-if="evt.location"
                :href="getMapsUrl(evt.location)"
                target="_blank"
                class="meta-loc"
                @click.stop
              >
                <ion-icon :icon="ioniconsLocationOutline" />
                <span>{{ evt.location }}</span>
                <ion-icon :icon="ioniconsOpenOutline" class="open-icon-mini" />
              </a>
            </div>

            <div class="agenda-desc" v-if="evt.description">
              {{ evt.description }}
            </div>

            <div class="agenda-footer-row">
              <span
                class="planner-text"
                :style="{
                  color: getUserAccentColor(evt.created_by),
                  backgroundColor: hexToRgba(getUserAccentColor(evt.created_by), 0.1),
                  borderColor: hexToRgba(getUserAccentColor(evt.created_by), 0.25)
                }"
              >
                Inicjatywa: {{ evt.planner_name || (evt.created_by === currentUser?.id ? 'Ty' : (partnerUser?.name || 'Partner')) }}
              </span>
              <div class="agenda-card-actions" @click.stop>
                <button
                  class="icon-action-btn"
                  :class="{
                    'done-btn': evt.is_completed,
                    'dn-check-pop': completingEventIds.has(evt.id)
                  }"
                  @click="animatedToggleEvent(evt.id)"
                  :title="evt.is_completed ? 'Oznacz jako niezrealizowane' : 'Oznacz jako zrealizowane'"
                >
                  <ion-icon :icon="evt.is_completed ? ioniconsCheckmarkCircle : ioniconsCheckmarkCircleOutline" />
                </button>
                <button
                  class="icon-action-btn sync-action-btn"
                  @click="handleQuickExportEvent(evt)"
                  title="Dodaj do kalendarza w telefonie / Google / Apple"
                  aria-label="Dodaj do zewnętrznego kalendarza"
                >
                  <ion-icon :icon="ioniconsCalendarOutline" />
                </button>
                <button class="icon-action-btn" @click="openEditModal(evt)" title="Edytuj">
                  <ion-icon :icon="ioniconsPencilOutline" />
                </button>
                <button class="icon-action-btn delete" @click="confirmDeleteEvent(evt.id, evt.title)" title="Usuń">
                  <ion-icon :icon="ioniconsTrashOutline" />
                </button>
              </div>
            </div>
          </div>
        </TransitionGroup>

        <!-- Empty Day State with Quick Ideas -->
        <div class="empty-day-state" v-else>
          <div class="empty-day-icon">
            <DuoIcon name="empty-calendar" :size="34" />
          </div>
          <h4>Brak zaplanowanych wydarzeń na ten dzień</h4>
          <p>Idealna okazja, aby zaplanować wspólną randkę, spacer lub domowy relaks!</p>
          
          <!-- QUICK INSPIRATION BUTTONS -->
          <div class="quick-ideas-box">
            <span class="ideas-header">
              <DuoIcon name="idea" :size="13" />
              <span>Szybkie pomysły we dwoje:</span>
            </span>
            <div class="ideas-grid">
              <button
                v-for="idea in coupleIdeas"
                :key="idea.title"
                class="idea-chip"
                @click="openAddModalWithIdea(idea)"
              >
                <DuoIcon :name="'cat-' + idea.category" :size="13" />
                <span>{{ idea.title }}</span>
              </button>
            </div>
          </div>

          <button class="dn-button-sea plan-btn" @click="openAddModalForDate(selectedDateStr)">
            <ion-icon :icon="ioniconsAddOutline" />
            <span>Zaplanuj coś we dwoje</span>
          </button>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- VIEW 3: FULL AGENDA / TIMELINE VIEW            -->
      <!-- ============================================== -->
      <div v-show="activeViewMode === 'agenda'" class="agenda-view-container">
        <!-- UPCOMING LIST -->
        <div class="agenda-section" v-if="groupedAgenda.upcoming.length > 0">
          <div class="agenda-section-title">
            <ion-icon :icon="ioniconsFlameOutline" />
            <span>NADCHODZĄCE PLANY ({{ groupedAgenda.upcoming.length }})</span>
          </div>

          <TransitionGroup name="dn-list" tag="div" class="agenda-cards-list">
            <div
              v-for="evt in groupedAgenda.upcoming"
              :key="evt.id"
              class="dn-card agenda-card"
              :class="[
                'border-' + evt.category,
                {
                  'is-event-done': evt.is_completed,
                  'dn-completing': completingEventIds.has(evt.id),
                  'dn-item-deleting': deletingEventIds.has(evt.id)
                }
              ]"
              @click="selectDate(getDateOnly(evt.start_time)); activeViewMode = 'month'"
            >
              <div class="agenda-card-top">
                <div class="top-left-badges">
                  <span class="upcoming-cat-badge" :class="'cat-' + evt.category">
                    <DuoIcon :name="'cat-' + evt.category" :size="12" />
                    <span>{{ getCategoryLabel(evt.category) }}</span>
                  </span>
                  <span v-if="evt.is_surprise" class="surprise-tag">
                    <DuoIcon name="gift" :size="11" />
                    <span>Niespodzianka</span>
                  </span>
                </div>
                <span class="countdown-badge">{{ getCountdownLabel(evt.start_time) }}</span>
              </div>

              <h4
                class="agenda-title"
                :class="{
                  strike: evt.is_completed,
                  'dn-strike-animated': completingEventIds.has(evt.id)
                }"
              >
                {{ evt.title }}
              </h4>

              <div class="agenda-meta-row">
                <span class="meta-date">
                  <ion-icon :icon="ioniconsCalendarOutline" />
                  {{ formatFullDate(evt.start_time) }}
                </span>
                <span class="meta-time" v-if="evt.end_time">
                  <ion-icon :icon="ioniconsTimeOutline" />
                  do {{ formatTimeOnly(evt.end_time) }}
                </span>
                <a
                  v-if="evt.location"
                  :href="getMapsUrl(evt.location)"
                  target="_blank"
                  class="meta-loc"
                  @click.stop
                >
                  <ion-icon :icon="ioniconsLocationOutline" />
                  <span>{{ evt.location }}</span>
                  <ion-icon :icon="ioniconsOpenOutline" class="open-icon-mini" />
                </a>
              </div>

              <div class="agenda-desc" v-if="evt.description">
                {{ evt.description }}
              </div>

              <div class="agenda-footer-row">
                <span
                  class="planner-text"
                  :style="{
                    color: getUserAccentColor(evt.created_by),
                    backgroundColor: hexToRgba(getUserAccentColor(evt.created_by), 0.1),
                    borderColor: hexToRgba(getUserAccentColor(evt.created_by), 0.25)
                  }"
                >
                  Inicjatywa: {{ evt.planner_name || (evt.created_by === currentUser?.id ? 'Ty' : (partnerUser?.name || 'Partner')) }}
                </span>
                <div class="agenda-card-actions" @click.stop>
                  <button
                    class="icon-action-btn"
                    :class="{
                      'done-btn': evt.is_completed,
                      'dn-check-pop': completingEventIds.has(evt.id)
                    }"
                    @click="animatedToggleEvent(evt.id)"
                    :title="evt.is_completed ? 'Oznacz jako niezrealizowane' : 'Oznacz jako zrealizowane'"
                  >
                    <ion-icon :icon="evt.is_completed ? ioniconsCheckmarkCircle : ioniconsCheckmarkCircleOutline" />
                  </button>
                  <button
                    class="icon-action-btn sync-action-btn"
                    @click="handleQuickExportEvent(evt)"
                    title="Dodaj do kalendarza w telefonie / Google / Apple"
                    aria-label="Dodaj do zewnętrznego kalendarza"
                  >
                    <ion-icon :icon="ioniconsCalendarOutline" />
                  </button>
                  <button class="icon-action-btn" @click="openEditModal(evt)" title="Edytuj">
                    <ion-icon :icon="ioniconsPencilOutline" />
                  </button>
                  <button class="icon-action-btn delete" @click="confirmDeleteEvent(evt.id, evt.title)" title="Usuń">
                    <ion-icon :icon="ioniconsTrashOutline" />
                  </button>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- COMPLETED EVENTS SECTION -->
        <div class="agenda-section" v-if="groupedAgenda.completed.length > 0">
          <div class="agenda-section-title completed-title">
            <ion-icon :icon="ioniconsCheckmarkDoneCircleOutline" />
            <span>ZREALIZOWANE WSPÓLNE CHWILE ({{ groupedAgenda.completed.length }})</span>
          </div>

          <TransitionGroup name="dn-list" tag="div" class="agenda-cards-list">
            <div
              v-for="evt in groupedAgenda.completed"
              :key="evt.id"
              class="dn-card agenda-card completed-agenda-card"
              :class="{
                'dn-item-deleting': deletingEventIds.has(evt.id)
              }"
            >
              <div class="agenda-card-top">
                <span class="upcoming-cat-badge completed-badge">
                  <DuoIcon name="check-circle" :size="12" />
                  <span>Zrealizowano</span>
                </span>
                <span class="meta-date">{{ formatFullDate(evt.start_time) }}</span>
              </div>
              <h4 class="agenda-title strike">{{ evt.title }}</h4>
              <div class="agenda-footer-row" @click.stop>
                <span class="planner-text">Wspomnienie we dwoje</span>
                <button class="icon-action-btn delete" @click="confirmDeleteEvent(evt.id, evt.title)">
                  <ion-icon :icon="ioniconsTrashOutline" />
                </button>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <!-- EMPTY AGENDA STATE -->
        <div class="dn-card empty-agenda-card" v-if="groupedAgenda.upcoming.length === 0 && groupedAgenda.completed.length === 0">
          <DuoIcon name="calendar-heart" :size="40" />
          <h3>Wasz kalendarz czeka na pierwsze plany</h3>
          <p>Zaplanujcie randkę, wspólny wyjazd lub domowy wieczór!</p>
          <button class="dn-button-sea" @click="openAddModalForDate(selectedDateStr)">
            <ion-icon :icon="ioniconsAddOutline" />
            <span>Dodaj pierwszy plan</span>
          </button>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- MODAL DODAWANIA I EDYCJI PLANU DLA PAR         -->
      <!-- ============================================== -->
      <ion-modal
        :is-open="showEventModal"
        @didDismiss="closeEventModal"
        class="dn-form-sheet-modal"
        :breakpoints="[0, 0.92, 1]"
        :initial-breakpoint="0.92"
        :handle="true"
        data-no-swipe="true"
      >
        <ion-header class="dn-form-sheet-header ion-no-border">
          <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
          <ion-toolbar>
            <div class="dn-form-sheet-heading">
              <div class="dn-form-sheet-title-row">
                <div class="dn-form-sheet-icon">
                  <ion-icon :icon="ioniconsCalendarOutline" />
                </div>
                <div class="dn-form-sheet-title-text">
                  <h3 class="dn-form-sheet-title">{{ isEditingMode ? 'Edytuj wspólny plan' : 'Nowy wspólny plan' }}</h3>
                  <span class="dn-form-sheet-subtitle">Zaplanujcie coś razem</span>
                </div>
              </div>
              <button type="button" class="dn-form-sheet-close" @click="closeEventModal" aria-label="Zamknij">
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding modal-content-box">
          <form @submit.prevent="handleSaveEvent" class="modal-form">
            <!-- QUICK IDEAS ROW (only when creating new) -->
            <div class="modal-ideas-row" v-if="!isEditingMode">
              <span class="modal-ideas-label">Szybki pomysł:</span>
              <div class="modal-ideas-chips">
                <button
                  type="button"
                  v-for="idea in coupleIdeas"
                  :key="idea.title"
                  class="idea-pill-btn"
                  @click="applyIdeaToForm(idea)"
                >
                  <DuoIcon :name="'cat-' + idea.category" :size="12" />
                  <span>{{ idea.title }}</span>
                </button>
              </div>
            </div>

            <!-- TITLE -->
            <div class="form-group">
              <label class="form-label">Tytuł planu *</label>
              <ion-input
                v-model="modalForm.title"
                maxlength="100"
                placeholder="np. Kolacja we włoskiej restauracji Marcello, Wyjazd w góry..."
                class="modal-input"
                :clear-input="true"
              />
            </div>

            <!-- CATEGORY SELECTOR -->
            <div class="form-group">
              <label class="form-label">Kategoria</label>
              <div class="category-grid">
                <button
                  type="button"
                  v-for="cat in eventCategories"
                  :key="cat.value"
                  class="cat-select-btn"
                  :class="{ active: modalForm.category === cat.value }"
                  @click="modalForm.category = cat.value"
                >
                  <DuoIcon :name="'cat-' + cat.value" :size="20" />
                  <span class="cat-text">{{ cat.label }}</span>
                </button>
              </div>
            </div>

            <!-- DATE & START TIME -->
            <div class="form-group">
              <label class="form-label">Data i godzina rozpoczęcia</label>
              <ion-datetime
                v-model="modalForm.startTime"
                presentation="date-time"
                locale="pl-PL"
                hour-cycle="h23"
                class="custom-datetime"
              />
            </div>

            <!-- END TIME (OPTIONAL) -->
            <div class="form-group">
              <label class="form-label">Godzina zakończenia (opcjonalnie)</label>
              <ion-datetime
                v-model="modalForm.endTime"
                presentation="time"
                locale="pl-PL"
                hour-cycle="h23"
                class="custom-datetime time-only"
              />
            </div>

            <!-- WHO IS PLANNING / SURPRISE -->
            <div class="form-group">
              <label class="form-label">Inicjator / Kto organizuje</label>
              <div class="planner-options-row">
                <button
                  type="button"
                  class="planner-chip"
                  :class="{ active: modalForm.plannerName === 'Wspólnie' }"
                  @click="modalForm.plannerName = 'Wspólnie'; modalForm.isSurprise = false"
                >
                  Wspólny plan
                </button>
                <button
                  type="button"
                  class="planner-chip"
                  :class="{ active: modalForm.plannerName === currentUser?.name }"
                  :style="modalForm.plannerName === currentUser?.name ? { backgroundColor: currentUserAccentColor, borderColor: currentUserAccentColor, color: '#fff' } : {}"
                  @click="modalForm.plannerName = currentUser?.name || ''"
                >
                  {{ currentUser?.name || 'Ja' }}
                </button>
                <button
                  type="button"
                  class="planner-chip"
                  :class="{ active: modalForm.plannerName === (partnerUser?.name || 'Partner') }"
                  :style="modalForm.plannerName === (partnerUser?.name || 'Partner') ? { backgroundColor: partnerUserAccentColor, borderColor: partnerUserAccentColor, color: '#fff' } : {}"
                  @click="modalForm.plannerName = partnerUser?.name || 'Partner'"
                >
                  {{ partnerUser?.name || 'Partner' }}
                </button>
              </div>

              <!-- SURPRISE TOGGLE -->
              <div class="surprise-toggle-card" :class="{ active: modalForm.isSurprise }" @click="modalForm.isSurprise = !modalForm.isSurprise">
                <div class="surprise-left">
                  <div class="gift-icon-box">
                    <DuoIcon name="gift" :size="18" />
                  </div>
                  <div>
                    <span class="surprise-title">Oznacz jako Niespodziankę</span>
                    <span class="surprise-sub">Dla uśmiechu partnera!</span>
                  </div>
                </div>
                <ion-checkbox :checked="modalForm.isSurprise" @click.stop="modalForm.isSurprise = !modalForm.isSurprise" />
              </div>
            </div>

            <!-- LOCATION -->
            <div class="form-group">
              <label class="form-label">Lokalizacja / Miejsce (opcjonalnie)</label>
              <ion-input
                v-model="modalForm.location"
                maxlength="100"
                placeholder="np. Restauracja Marcello, Kino Muranów, Park Oliwski..."
                class="modal-input"
                :clear-input="true"
              />
            </div>

            <!-- NOTES / WHAT TO BRING -->
            <div class="form-group">
              <label class="form-label">Notatki lub co zabrać</label>
              <ion-textarea
                v-model="modalForm.description"
                maxlength="500"
                placeholder="np. Stolik zarezerwowany na 19:30, zabrać ciepły sweter..."
                class="modal-input modal-textarea"
                :rows="2"
              />
            </div>

            <!-- QUICK SYNC TO EXTERNAL CALENDAR (when editing) -->
            <div class="modal-sync-box" v-if="isEditingMode && editingEventId">
              <span class="modal-sync-label">Synchronizacja z kalendarzem w telefonie:</span>
              <div class="modal-sync-buttons-row">
                <button
                  type="button"
                  class="modal-sync-chip google"
                  @click="addCurrentEditingEventToGoogle"
                >
                  <ion-icon :icon="ioniconsLogoGoogle" />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  class="modal-sync-chip apple"
                  @click="downloadCurrentEditingEventIcs"
                >
                  <ion-icon :icon="ioniconsLogoApple" />
                  <span>Apple / .ics</span>
                </button>
                <button
                  type="button"
                  class="modal-sync-chip outlook"
                  @click="addCurrentEditingEventToOutlook"
                >
                  <ion-icon :icon="ioniconsLogoWindows" />
                  <span>Outlook</span>
                </button>
              </div>
            </div>

            <!-- SUBMIT BUTTON -->
            <button type="submit" class="dn-button-sea submit-btn" :disabled="isSubmitting">
              <ion-spinner v-if="isSubmitting" name="crescent" style="width: 18px; height: 18px;" />
              <ion-icon v-else :icon="ioniconsCheckmarkOutline" />
              <span>{{ isEditingMode ? 'Zapisz zmiany w Planie' : 'Zapisz w Kalendarzu' }}</span>
            </button>
          </form>
        </ion-content>
      </ion-modal>

      <!-- CALENDAR SYNC MODAL (APPLE, GOOGLE, OUTLOOK, WEBCAL, IMPORT/EXPORT) -->
      <DuoCalendarSyncModal
        :is-open="showSyncModal"
        @close="showSyncModal = false"
      />

      <!-- QUICK SINGLE EVENT SYNC ACTION SHEET -->
      <DuoActionSheet
        :is-open="showEventSyncActionSheet"
        title="Dodaj do kalendarza"
        :subtitle="selectedSyncEvent?.title || 'Wybierz aplikację kalendarza'"
        :buttons="eventSyncActionSheetButtons"
        @dismiss="showEventSyncActionSheet = false"
      />

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useDuoState, type EventItem } from '~/composables/useDuoState'
import { useConfirm } from '~/composables/useConfirm'
import DuoIcon from '~/components/DuoIcon.vue'
import DuoCalendarSyncModal from '~/components/DuoCalendarSyncModal.vue'
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateSingleEventIcs,
  downloadIcsFile
} from '~/utils/calendarSync'
import {
  logoGoogle as ioniconsLogoGoogle,
  logoApple as ioniconsLogoApple,
  logoWindows as ioniconsLogoWindows
} from 'ionicons/icons'

const {
  eventsList,
  currentUser,
  partnerUser,
  isPartnerOnline,
  addEvent,
  updateEvent,
  deleteEvent,
  toggleEventCompleted,
  triggerToast,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor,
  hexToRgba,
  initSupabaseSync
} = useDuoState()

const completingEventIds = ref<Set<string>>(new Set())
const deletingEventIds = ref<Set<string>>(new Set())

const animatedToggleEvent = async (id: string) => {
  const evt = eventsList.value.find(e => e.id === id)
  const willBeCompleted = evt ? !evt.is_completed : false
  if (willBeCompleted) {
    completingEventIds.value.add(id)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25)
    }
    await new Promise(r => setTimeout(r, 240))
    completingEventIds.value.delete(id)
  }
  await toggleEventCompleted(id)
}

const { confirm } = useConfirm()

// View modes: 'month' | 'week' | 'agenda'
const activeViewMode = ref<'month' | 'week' | 'agenda'>('month')

// Category Filter
const selectedCategoryFilter = ref<string>('all')

// Calendar Synchronization State
const showSyncModal = ref(false)
const selectedSyncEvent = ref<EventItem | null>(null)
const showEventSyncActionSheet = ref(false)

const handleQuickExportEvent = (event: EventItem) => {
  selectedSyncEvent.value = event
  showEventSyncActionSheet.value = true
}

const addSelectedEventToGoogle = () => {
  if (!selectedSyncEvent.value) return
  const url = generateGoogleCalendarUrl(selectedSyncEvent.value)
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
  showEventSyncActionSheet.value = false
}

const addSelectedEventToOutlook = () => {
  if (!selectedSyncEvent.value) return
  const url = generateOutlookCalendarUrl(selectedSyncEvent.value)
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
  showEventSyncActionSheet.value = false
}

const downloadSelectedEventIcs = () => {
  if (!selectedSyncEvent.value) return
  const icsContent = generateSingleEventIcs(selectedSyncEvent.value)
  const filename = `${selectedSyncEvent.value.title.replace(/[^a-zA-Z0-9żźćńółęąśŻŹĆŃÓŁĘĄŚ_-]/g, '_')}.ics`
  downloadIcsFile(filename, icsContent)
  triggerToast('Pobrano plik planu (.ics)')
  showEventSyncActionSheet.value = false
}

const eventSyncActionSheetButtons = computed(() => [
  {
    text: 'Kalendarz Google',
    description: 'Otwórz w aplikacji Google lub przeglądarce',
    icon: ioniconsLogoGoogle,
    handler: () => {
      addSelectedEventToGoogle()
    }
  },
  {
    text: 'Kalendarz Apple / Telefon (.ics)',
    description: 'Pobierz plik do otwarcia na iPhone, iPad lub Mac',
    icon: ioniconsLogoApple,
    handler: () => {
      downloadSelectedEventIcs()
    }
  },
  {
    text: 'Microsoft Outlook',
    description: 'Dodaj do kalendarza Outlook online',
    icon: ioniconsLogoWindows,
    handler: () => {
      addSelectedEventToOutlook()
    }
  },
  {
    text: 'Anuluj',
    role: 'cancel',
    handler: () => {
      showEventSyncActionSheet.value = false
    }
  }
])

const addCurrentEditingEventToGoogle = () => {
  if (!editingEventId.value) return
  const ev = eventsList.value.find(e => e.id === editingEventId.value)
  if (!ev) return
  const url = generateGoogleCalendarUrl(ev)
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
}

const downloadCurrentEditingEventIcs = () => {
  if (!editingEventId.value) return
  const ev = eventsList.value.find(e => e.id === editingEventId.value)
  if (!ev) return
  const icsContent = generateSingleEventIcs(ev)
  const filename = `${ev.title.replace(/[^a-zA-Z0-9żźćńółęąśŻŹĆŃÓŁĘĄŚ_-]/g, '_')}.ics`
  downloadIcsFile(filename, icsContent)
  triggerToast('Pobrano plik planu (.ics)')
}

const addCurrentEditingEventToOutlook = () => {
  if (!editingEventId.value) return
  const ev = eventsList.value.find(e => e.id === editingEventId.value)
  if (!ev) return
  const url = generateOutlookCalendarUrl(ev)
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
}

onMounted(async () => {
  try {
    await initSupabaseSync()
  } catch (_) {}
})

// Local date formatting helpers
const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const toLocalIsoString = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`
}

const toDbTimestamp = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString()
  const d = new Date(dateStr)
  return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString()
}

const toDbEndTimestamp = (endTimeStr: string, startDateStr: string): string | null => {
  if (!endTimeStr || !endTimeStr.trim()) return null
  const trimmed = endTimeStr.trim()
  let endD: Date | null = null

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const datePart = startDateStr ? startDateStr.split('T')[0] : formatLocalDate(new Date())
    const fullLocal = `${datePart}T${trimmed.substring(0, 5)}:00`
    const d = new Date(fullLocal)
    if (!isNaN(d.getTime())) endD = d
  } else {
    const timeMatch = trimmed.match(/T(\d{2}:\d{2}(:\d{2})?)/)
    if (timeMatch && startDateStr) {
      const datePart = startDateStr.split('T')[0]
      const fullLocal = `${datePart}T${timeMatch[1].substring(0, 5)}:00`
      const d = new Date(fullLocal)
      if (!isNaN(d.getTime())) endD = d
    } else {
      const d = new Date(trimmed)
      if (!isNaN(d.getTime())) endD = d
    }
  }

  if (!endD) return null

  // Ensure end time is strictly after start time
  const startD = new Date(toDbTimestamp(startDateStr))
  if (endD.getTime() <= startD.getTime()) {
    // If within 12 hours earlier, assume it extends past midnight into the next day
    if (startD.getTime() - endD.getTime() < 12 * 60 * 60 * 1000) {
      endD = new Date(endD.getTime() + 24 * 60 * 60 * 1000)
    }
  }

  return endD.toISOString()
}

// Calendar Navigation State
const viewDate = ref(new Date())
const selectedDateStr = ref(formatLocalDate(new Date()))

// Modal State
const showEventModal = ref(false)
const isEditingMode = ref(false)
const editingEventId = ref<string | null>(null)

const modalForm = reactive({
  title: '',
  category: 'date' as EventItem['category'],
  startTime: toLocalIsoString(new Date()),
  endTime: '',
  location: '',
  description: '',
  plannerName: 'Wspólnie',
  isSurprise: false
})

const weekDaysShort = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
const monthNamesPl = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
]

const eventCategories: Array<{ value: EventItem['category']; label: string }> = [
  { value: 'date', label: 'Randka' },
  { value: 'trip', label: 'Wyjazd' },
  { value: 'home', label: 'Dom' },
  { value: 'anniversary', label: 'Rocznica' },
  { value: 'work', label: 'Wizyty / Praca' },
  { value: 'other', label: 'Inne' }
]

// Quick inspirations for couples
const coupleIdeas: Array<{ title: string; category: EventItem['category']; location?: string; desc?: string }> = [
  { title: 'Romantyczna kolacja', category: 'date', location: 'Ulubiona restauracja', desc: 'Wieczór tylko we dwoje' },
  { title: 'Wieczór filmowy & popcorn', category: 'home', desc: 'Kocyk, film i pyszne przekąski' },
  { title: 'Spacer i wspólna kawa', category: 'date', location: 'Park / kawiarnia', desc: 'Dobre rozmowy i relaks' },
  { title: 'Weekendowy wyjazd', category: 'trip', desc: 'Mała ucieczka za miasto' },
  { title: 'Wspólne gotowanie nowego dania', category: 'home', desc: 'Odkrywanie nowych smaków razem' }
]

// Month View Computed
const currentYear = computed(() => viewDate.value.getFullYear())
const currentMonthIndex = computed(() => viewDate.value.getMonth())
const currentMonthName = computed(() => monthNamesPl[currentMonthIndex.value])

const isCurrentMonthViewed = computed(() => {
  const now = new Date()
  return now.getFullYear() === currentYear.value && now.getMonth() === currentMonthIndex.value
})

const prevMonth = () => {
  viewDate.value = new Date(currentYear.value, currentMonthIndex.value - 1, 1)
}

const nextMonth = () => {
  viewDate.value = new Date(currentYear.value, currentMonthIndex.value + 1, 1)
}

// Touch swipe gestures for Month & Week navigation
let calTouchStartX = 0
let calTouchStartY = 0

const onCalendarTouchStart = (e: TouchEvent) => {
  e.stopPropagation()
  calTouchStartX = e.changedTouches[0].screenX
  calTouchStartY = e.changedTouches[0].screenY
}

const onCalendarTouchEnd = (e: TouchEvent) => {
  e.stopPropagation()
  if (!calTouchStartX) return
  const deltaX = e.changedTouches[0].screenX - calTouchStartX
  const deltaY = e.changedTouches[0].screenY - calTouchStartY
  calTouchStartX = 0

  if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }
    if (deltaX < 0) {
      nextMonth()
    } else {
      prevMonth()
    }
  }
}

const onWeekTouchStart = (e: TouchEvent) => {
  e.stopPropagation()
  calTouchStartX = e.changedTouches[0].screenX
  calTouchStartY = e.changedTouches[0].screenY
}

const onWeekTouchEnd = (e: TouchEvent) => {
  e.stopPropagation()
  if (!calTouchStartX) return
  const deltaX = e.changedTouches[0].screenX - calTouchStartX
  const deltaY = e.changedTouches[0].screenY - calTouchStartY
  calTouchStartX = 0

  if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }
    if (deltaX < 0) {
      nextWeek()
    } else {
      prevWeek()
    }
  }
}

const handleSwipeCompleteEvent = (evt: EventItem) => {
  animatedToggleEvent(evt.id)
}

const jumpToToday = () => {
  const now = new Date()
  viewDate.value = new Date(now.getFullYear(), now.getMonth(), 1)
  selectedDateStr.value = formatLocalDate(now)
}

const selectDate = (dateStr: string) => {
  selectedDateStr.value = dateStr
}

// Helpers
const getDateOnly = (isoString: string) => {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (!isNaN(d.getTime())) {
      return formatLocalDate(d)
    }
  } catch (_) {}
  return isoString.split('T')[0] || ''
}

const formatTimeOnly = (isoString: string) => {
  try {
    if (!isoString) return ''
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(isoString)) {
      return isoString.substring(0, 5)
    }
    const d = new Date(isoString)
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${hh}:${mm}`
    }
    const match = isoString.match(/T(\d{2}:\d{2})/)
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

const getMapsUrl = (location: string) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

// Category Helpers
const getCategoryLabel = (category: string) => {
  const c = eventCategories.find(cat => cat.value === category)
  return c ? c.label : 'Plan'
}

const getCategoryCount = (category: string) => {
  return eventsList.value.filter(e => e.category === category).length
}

// Filtered events
const filteredEventsList = computed(() => {
  if (selectedCategoryFilter.value === 'all') return eventsList.value
  return eventsList.value.filter(e => e.category === selectedCategoryFilter.value)
})

// Next Big Event for Hero Banner
const featuredUpcomingEvent = computed(() => {
  const now = Date.now() - 3600000 // 1 hour grace
  const upcoming = eventsList.value
    .filter(e => !e.is_completed && new Date(e.start_time).getTime() >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  return upcoming[0] || null
})

// Grid Cells for Month View
interface CalendarCell {
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  events: EventItem[]
}

const calendarCells = computed<CalendarCell[]>(() => {
  const year = currentYear.value
  const month = currentMonthIndex.value
  const todayStr = formatLocalDate(new Date())

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  let startDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startDayOfWeek === -1) startDayOfWeek = 6

  const totalDays = lastDayOfMonth.getDate()
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  const cells: CalendarCell[] = []

  // 1. Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const d = new Date(year, month - 1, day)
    const dateStr = formatLocalDate(d)
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: filteredEventsList.value.filter(e => getDateOnly(e.start_time) === dateStr)
    })
  }

  // 2. Current month days
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day)
    const dateStr = formatLocalDate(d)
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      events: filteredEventsList.value.filter(e => getDateOnly(e.start_time) === dateStr)
    })
  }

  // 3. Next month leading days
  const remaining = (7 - (cells.length % 7)) % 7
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, month + 1, day)
    const dateStr = formatLocalDate(d)
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      events: filteredEventsList.value.filter(e => getDateOnly(e.start_time) === dateStr)
    })
  }

  return cells
})

// Current Week Days (Week View Strip)
const currentWeekDays = computed(() => {
  const base = new Date(selectedDateStr.value)
  let dayOfWeek = base.getDay() - 1
  if (dayOfWeek === -1) dayOfWeek = 6

  const monday = new Date(base)
  monday.setDate(base.getDate() - dayOfWeek)

  const todayStr = formatLocalDate(new Date())
  const weekDays = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = formatLocalDate(d)
    weekDays.push({
      dateStr,
      dayNumber: d.getDate(),
      dayNameShort: weekDaysShort[i],
      isToday: dateStr === todayStr,
      events: filteredEventsList.value.filter(e => getDateOnly(e.start_time) === dateStr)
    })
  }
  return weekDays
})

const formatWeekRangeLabel = computed(() => {
  if (currentWeekDays.value.length === 0) return ''
  const first = currentWeekDays.value[0].dayNumber
  const last = currentWeekDays.value[6].dayNumber
  return `${first} - ${last} ${currentMonthName.value}`
})

const prevWeek = () => {
  const cur = new Date(selectedDateStr.value)
  cur.setDate(cur.getDate() - 7)
  selectedDateStr.value = formatLocalDate(cur)
  viewDate.value = new Date(cur.getFullYear(), cur.getMonth(), 1)
}

const nextWeek = () => {
  const cur = new Date(selectedDateStr.value)
  cur.setDate(cur.getDate() + 7)
  selectedDateStr.value = formatLocalDate(cur)
  viewDate.value = new Date(cur.getFullYear(), cur.getMonth(), 1)
}

// Selected day events
const filteredSelectedDayEvents = computed(() => {
  return filteredEventsList.value.filter(e => getDateOnly(e.start_time) === selectedDateStr.value)
})

// Formatted label for selected day
const formattedSelectedDate = computed(() => {
  try {
    const parts = selectedDateStr.value.split('-')
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return selectedDateStr.value
  }
})

// Agenda / Upcoming Events
const filteredUpcomingEvents = computed(() => {
  const now = Date.now() - 86400000
  return filteredEventsList.value.filter(e => !e.is_completed && new Date(e.start_time).getTime() >= now)
})

const groupedAgenda = computed(() => {
  const upcoming = filteredUpcomingEvents.value
  const completed = filteredEventsList.value
    .filter(e => e.is_completed)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
  return { upcoming, completed }
})

const formatFullDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pl-PL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return dateStr
  }
}

const getCountdownLabel = (dateStr: string) => {
  try {
    const target = new Date(dateStr)
    const now = new Date()
    const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const diffDays = Math.round((targetDate - nowDate) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Dzisiaj'
    if (diffDays === 1) return 'Jutro'
    if (diffDays === 2) return 'Pojutrze'
    if (diffDays > 2) return `Za ${diffDays} dni`
    if (diffDays === -1) return 'Wczoraj'
    return `${Math.abs(diffDays)} dni temu`
  } catch {
    return ''
  }
}

// Modal Handlers
const openAddModalForDate = (dateStr: string) => {
  isEditingMode.value = false
  editingEventId.value = null
  modalForm.title = ''
  modalForm.category = 'date'
  modalForm.startTime = `${dateStr}T19:00:00`
  modalForm.endTime = ''
  modalForm.location = ''
  modalForm.description = ''
  modalForm.plannerName = 'Wspólnie'
  modalForm.isSurprise = false
  showEventModal.value = true
}

const openAddModalWithIdea = (idea: { title: string; category: EventItem['category']; location?: string; desc?: string }) => {
  openAddModalForDate(selectedDateStr.value)
  modalForm.title = idea.title
  modalForm.category = idea.category
  if (idea.location) modalForm.location = idea.location
  if (idea.desc) modalForm.description = idea.desc
}

const applyIdeaToForm = (idea: { title: string; category: EventItem['category']; location?: string; desc?: string }) => {
  modalForm.title = idea.title
  modalForm.category = idea.category
  if (idea.location) modalForm.location = idea.location
  if (idea.desc) modalForm.description = idea.desc
}

const openEditModal = (evt: EventItem) => {
  isEditingMode.value = true
  editingEventId.value = evt.id
  modalForm.title = evt.title
  modalForm.category = evt.category
  const startD = new Date(evt.start_time)
  modalForm.startTime = !isNaN(startD.getTime()) ? toLocalIsoString(startD) : evt.start_time
  if (evt.end_time) {
    const endD = new Date(evt.end_time)
    modalForm.endTime = !isNaN(endD.getTime()) ? toLocalIsoString(endD) : evt.end_time
  } else {
    modalForm.endTime = ''
  }
  modalForm.location = evt.location || ''
  modalForm.description = evt.description || ''
  modalForm.plannerName = evt.planner_name || 'Wspólnie'
  modalForm.isSurprise = !!evt.is_surprise
  showEventModal.value = true
}

const closeEventModal = () => {
  showEventModal.value = false
  isEditingMode.value = false
  editingEventId.value = null
}

const isSubmitting = ref(false)

const handleSaveEvent = async () => {
  if (isSubmitting.value) return
  const cleanTitle = modalForm.title.trim().slice(0, 100)
  if (!cleanTitle) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40)
    }
    triggerToast('Wpisz nazwę wydarzenia przed zapisaniem', { type: 'warning' })
    return
  }

  isSubmitting.value = true
  try {
    const startTimestamp = toDbTimestamp(modalForm.startTime)
    const endTimestamp = toDbEndTimestamp(modalForm.endTime, modalForm.startTime)
    const cleanLocation = modalForm.location.trim().slice(0, 100) || null
    const cleanDesc = modalForm.description.trim().slice(0, 500) || null

    if (isEditingMode.value && editingEventId.value) {
      await updateEvent(editingEventId.value, {
        title: cleanTitle,
        category: modalForm.category,
        start_time: startTimestamp,
        end_time: endTimestamp,
        location: cleanLocation,
        description: cleanDesc,
        planner_name: modalForm.plannerName,
        is_surprise: modalForm.isSurprise
      })
    } else {
      await addEvent(
        cleanTitle,
        modalForm.category,
        startTimestamp,
        cleanDesc || '',
        cleanLocation || '',
        endTimestamp || '',
        modalForm.isSurprise,
        modalForm.plannerName
      )
    }

    closeEventModal()
  } finally {
    isSubmitting.value = false
  }
}

const confirmDeleteEvent = async (id: string, title: string) => {
  const confirmed = await confirm({
    title: 'Usuń plan',
    message: `Czy na pewno chcesz usunąć plan "${title}"?`,
    itemHighlight: title,
    confirmText: 'Usuń',
    cancelText: 'Anuluj',
    type: 'danger',
    icon: 'trash'
  })
  if (confirmed) {
    if (deletingEventIds.value.has(id)) return
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 30, 10])
    }
    deletingEventIds.value.add(id)
    setTimeout(async () => {
      try {
        await deleteEvent(id)
      } finally {
        deletingEventIds.value.delete(id)
      }
    }, 240)
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
.calendar-page-content {
  --background: #f8fafc;
}

.header-action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-status-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.pulsing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulseDot 1.8s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.3); }
}

.partner-online-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 2px 8px;
  border-radius: 999px;
}

.header-buttons-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.header-sync-btn {
  height: 34px;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0 11px;
  font-size: 12.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: all 0.15s ease;
  white-space: nowrap;
}

.header-sync-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.header-sync-btn:active {
  transform: scale(0.96);
  background: #f1f5f9;
}

.header-sync-btn ion-icon {
  font-size: 16px;
  color: #0284c7;
}

@media (max-width: 400px) {
  .header-sync-btn span {
    display: none;
  }
  .header-sync-btn {
    padding: 0 9px;
  }
}

.new-event-btn {
  height: 34px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
  transition: transform 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.new-event-btn:active {
  transform: scale(0.96);
}

/* FEATURED HERO CARD */
.featured-hero-card {
  margin: 12px 16px;
  padding: 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.15);
  cursor: pointer;
  transition: transform 0.2s ease;
  min-width: 0;
}

.featured-hero-card:active {
  transform: scale(0.98);
}

.hero-glow-bg {
  position: absolute;
  top: -30px;
  right: -30px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%);
}

.featured-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.featured-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  background: rgba(255, 255, 255, 0.15);
  padding: 3px 8px;
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

.featured-countdown {
  font-size: 11px;
  font-weight: 800;
  background: #ffffff;
  color: #0f172a;
  padding: 3px 10px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.featured-title {
  font-size: 17px;
  font-weight: 800;
  margin: 0 0 10px 0;
  line-height: 1.3;
  color: #fff;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.featured-meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.featured-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.featured-time, .featured-loc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

/* VIEW MODE BAR */
.view-mode-bar {
  padding: 0 16px;
  margin-bottom: 8px;
}

.mode-pills-container {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
}

.mode-pill-btn {
  flex: 1;
  background: transparent;
  border: none;
  border-radius: 10px;
  padding: 7px 4px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-pill-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* CATEGORY FILTER SCROLL */
.category-filter-scroll {
  display: flex;
  overflow-x: auto;
  gap: 8px;
  padding: 4px 16px 12px 16px;
  scrollbar-width: none;
}

.category-filter-scroll::-webkit-scrollbar {
  display: none;
}

.cat-filter-chip {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.cat-filter-chip.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.chip-count {
  font-size: 10px;
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 6px;
  border-radius: 999px;
}

.cat-filter-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* CALENDAR CARD & MONTH GRID */
.calendar-card {
  margin: 4px 16px 12px 16px;
  padding: 16px;
}

.month-nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.month-label-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-label {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.today-chip-btn {
  background: #f1f5f9;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.nav-arrow-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-arrow-btn.mini {
  width: 28px;
  height: 28px;
  font-size: 14px;
}

.nav-arrow-btn:active {
  background: #f1f5f9;
  color: #0f172a;
}

/* WEEKDAYS HEADER */
.weekdays-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 6px;
}

.weekday-name {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  padding: 4px 0;
}

/* DAYS GRID */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.day-cell {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
  padding: 2px;
}

.day-cell:active {
  transform: scale(0.93);
}

.day-number {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.day-cell.not-current-month .day-number {
  color: #cbd5e1;
}

.day-cell.is-today {
  border-color: #0f172a;
  background: #f8fafc;
}

.day-cell.is-today .day-number {
  color: #0f172a;
  font-weight: 800;
}

.day-cell.is-selected {
  background: #0f172a !important;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
}

.day-cell.is-selected .day-number {
  color: #ffffff !important;
}

/* Dots inside day cell */
.day-dots-container {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  height: 5px;
  align-items: center;
}

.category-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.category-dot.mini {
  width: 4px;
  height: 4px;
}

.day-cell.is-selected .category-dot {
  background: #ffffff !important;
}

.more-dots-badge {
  font-size: 8px;
  font-weight: 800;
  color: #64748b;
  margin-left: 1px;
}

.day-cell.is-selected .more-dots-badge {
  color: #ffffff;
}

.dot-date { background: #0f172a; }
.dot-trip { background: #1e293b; }
.dot-home { background: #334155; }
.dot-anniversary { background: #18181b; }
.dot-work { background: #64748b; }
.dot-other { background: #475569; }

/* WEEK STRIP VIEW */
.week-strip-card {
  margin: 4px 16px 12px 16px;
  padding: 14px;
}

.week-strip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.week-strip-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.week-strip-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.week-day-pill {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.week-day-pill.is-today {
  border-color: #0f172a;
  background: #f8fafc;
}

.week-day-pill.is-selected {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
}

.w-name {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
}

.w-num {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.week-day-pill.is-selected .w-name,
.week-day-pill.is-selected .w-num {
  color: #ffffff;
}

.w-dot-line {
  display: flex;
  gap: 2px;
  height: 5px;
  align-items: center;
}

/* SELECTED DAY CARD */
.selected-day-card {
  margin: 4px 16px 12px 16px;
  padding: 18px;
}

.day-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.day-section-tag {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #0f172a;
  display: block;
  margin-bottom: 2px;
}

.day-card-header h3 {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  text-transform: capitalize;
}

.day-quick-add-btn {
  background: #f8fafc;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-quick-add-btn:active {
  background: #f1f5f9;
}

/* DAY EVENTS LIST */
.calendar-swipe-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 6px 12px;
  margin-bottom: 12px;
}

.day-events-sliding-list {
  background: transparent;
  padding: 0;
  margin: 0;
}

.calendar-event-item {
  --background: #ffffff;
  --padding-start: 14px;
  --inner-padding-end: 14px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  border-radius: 16px;
  margin-bottom: 12px;
  border: 1px solid #e2e8f0;
  border-left-width: 4px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.calendar-event-item ion-label {
  white-space: normal !important;
  min-width: 0;
  width: 100%;
}

.calendar-event-item.is-event-done {
  opacity: 0.65;
  --background: #f8fafc;
}

.border-date { border-left-color: #0f172a; }
.border-trip { border-left-color: #1e293b; }
.border-home { border-left-color: #334155; }
.border-anniversary { border-left-color: #18181b; }
.border-work { border-left-color: #64748b; }
.border-other { border-left-color: #475569; }

.event-done-toggle {
  background: none;
  border: none;
  font-size: 24px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s ease, color 0.15s ease;
}

.event-done-toggle:active {
  transform: scale(0.88);
}

.event-done-toggle.done {
  color: #16a34a;
}

.event-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.event-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.event-tags-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  min-width: 0;
}

.category-tag-mini {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.cat-date { background: #f1f5f9; color: #0f172a; border: 1px solid #e2e8f0; }
.cat-trip { background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; }
.cat-home { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
.cat-anniversary { background: #f8fafc; color: #18181b; border: 1px solid #e2e8f0; }
.cat-work { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
.cat-other { background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; }

.event-time-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 8px;
  letter-spacing: -0.2px;
  flex-shrink: 0;
}

.event-time-chip ion-icon {
  font-size: 12px;
  color: #64748b;
}

.time-chip-end {
  color: #64748b;
  font-weight: 600;
}

.surprise-tag {
  font-size: 11px;
  font-weight: 800;
  background: #fdf2f8;
  color: #db2777;
  border: 1px solid #fbcfe8;
  padding: 2px 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.event-actions-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  margin-left: auto;
}

.edit-btn, .delete-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.edit-btn:hover {
  color: #0f172a;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.delete-btn:hover {
  color: #ef4444;
  border-color: #fecaca;
  background: #fef2f2;
}

.event-title-wrap {
  min-width: 0;
  width: 100%;
}

.item-event-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: break-word;
}

.item-event-title.strike {
  text-decoration: line-through;
  color: #94a3b8;
}

.event-extra-details {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-location-link {
  font-size: 12px;
  color: #475569;
  font-weight: 600;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  word-break: break-word;
  max-width: 100%;
  padding: 3px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.detail-location-link:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.location-icon {
  font-size: 13px;
  color: #64748b;
  flex-shrink: 0;
}

.location-name {
  min-width: 0;
  word-break: break-word;
}

.open-icon {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: 2px;
}

.event-desc-box {
  min-width: 0;
  width: 100%;
  max-width: 100%;
  background: #f8fafc;
  border-left: 2.5px solid #cbd5e1;
  border-radius: 4px 6px 6px 4px;
  padding: 6px 10px;
  box-sizing: border-box;
  overflow: hidden;
  margin-top: 2px;
}

.event-description-text {
  margin: 0;
  font-size: 12px;
  color: #475569;
  line-height: 1.45;
  white-space: pre-line;
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0;
  width: 100%;
}

.event-creator-row {
  margin-top: 2px;
  display: flex;
  align-items: center;
}

.creator-tag {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
}

/* EMPTY DAY STATE */
.empty-day-state {
  text-align: center;
  padding: 18px 8px;
}

.empty-day-icon {
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: #f1f5f9;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.empty-day-state h4 {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.empty-day-state p {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0 14px 0;
}

/* QUICK IDEAS */
.quick-ideas-box {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 14px;
  text-align: left;
}

.ideas-header {
  font-size: 11px;
  font-weight: 800;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
}

.ideas-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.idea-chip {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.idea-chip:active {
  background: #f1f5f9;
  border-color: #0f172a;
}

.plan-btn {
  font-size: 13px;
  padding: 10px 18px;
}

/* AGENDA VIEW */
.agenda-view-container {
  padding: 0 16px;
}

.agenda-section {
  margin-bottom: 18px;
}

.agenda-section-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding-left: 4px;
}

.agenda-section-title.completed-title {
  color: #16a34a;
}

.agenda-cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-events-cards-list {
  margin-top: 4px;
}

.agenda-card {
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left-width: 4px;
  cursor: pointer;
  border-radius: 18px;
  box-shadow: var(--dn-card-shadow);
  min-width: 0;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.agenda-card:active {
  transform: scale(0.99);
}

.agenda-card.is-event-done {
  opacity: 0.72;
  background: #f8fafc;
}

.agenda-card.completed-agenda-card {
  opacity: 0.75;
  border-left-color: #16a34a;
}

.agenda-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.top-left-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.upcoming-cat-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.upcoming-cat-badge.completed-badge {
  background: #f0fdf4;
  color: #16a34a;
}

.countdown-badge {
  font-size: 10px;
  font-weight: 800;
  background: #f1f5f9;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  padding: 2px 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.agenda-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px 0;
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0;
  line-height: 1.35;
}

.agenda-title.strike {
  text-decoration: line-through;
  color: #94a3b8;
}

.agenda-meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: #64748b;
  margin-bottom: 8px;
  min-width: 0;
}

.meta-date, .meta-time, .meta-loc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.meta-loc {
  color: #0f172a;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s ease;
}

.meta-loc:hover {
  text-decoration: underline;
  color: #1e293b;
}

.open-icon-mini {
  font-size: 11px;
  opacity: 0.75;
  margin-left: 1px;
}

.agenda-desc {
  font-size: 12px;
  color: #475569;
  margin: 2px 0 10px 0;
  line-height: 1.45;
  white-space: pre-line;
  word-break: break-word;
  overflow-wrap: anywhere;
  min-width: 0;
  max-width: 100%;
  max-height: 180px;
  overflow-y: auto;
  background: #f8fafc;
  border-left: 2.5px solid #cbd5e1;
  border-radius: 4px 8px 8px 4px;
  padding: 7px 10px;
  box-sizing: border-box;
}

.agenda-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f1f5f9;
  gap: 8px;
}

.planner-text {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2.5px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agenda-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.icon-action-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-action-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.icon-action-btn.done-btn {
  color: #16a34a;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.icon-action-btn.delete:hover {
  color: #ef4444;
  border-color: #fecaca;
  background: #fef2f2;
}

.empty-agenda-card {
  text-align: center;
  padding: 30px 16px;
  color: #64748b;
}

.empty-agenda-card h3 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 10px 0 4px 0;
}

.empty-agenda-card p {
  font-size: 13px;
  margin-bottom: 16px;
}

/* MODAL FORM */
.modal-content-box {
  --background: #ffffff;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

.modal-ideas-row {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 12px;
}

.modal-ideas-label {
  font-size: 11px;
  font-weight: 800;
  color: #0f172a;
  display: block;
  margin-bottom: 6px;
}

.modal-ideas-chips {
  display: flex;
  overflow-x: auto;
  gap: 6px;
  scrollbar-width: none;
}

.idea-pill-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  cursor: pointer;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.modal-input {
  --background: #f8fafc;
  --padding-start: 14px;
  --border-radius: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.modal-input:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.cat-select-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s ease;
}

.cat-select-btn.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.cat-text {
  font-size: 11px;
  font-weight: 700;
}

.custom-datetime {
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  max-width: 100%;
}

.planner-options-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.planner-chip {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 8px 6px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  text-align: center;
}

.planner-chip.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.surprise-toggle-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fdf2f8;
  border: 1px solid #fbcfe8;
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
}

.surprise-toggle-card.active {
  background: #fce7f3;
  border-color: #ec4899;
}

.surprise-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gift-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f472b6;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.surprise-title {
  font-size: 13px;
  font-weight: 700;
  color: #be185d;
  display: block;
}

.surprise-sub {
  font-size: 11px;
  color: #db2777;
}

.submit-btn {
  width: 100%;
  margin-top: 10px;
  padding: 14px;
}

.event-creator-row {
  margin-top: 4px;
}

.creator-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
}

.planner-text {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
}

.icon-action-btn.sync-action-btn {
  color: #0284c7;
}

.icon-action-btn.sync-action-btn:hover {
  background: #e0f2fe;
  border-color: #bae6fd;
}

/* Modal sync box in event edit modal */
.modal-sync-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

.modal-sync-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.modal-sync-buttons-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.modal-sync-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-sync-chip:active {
  transform: scale(0.96);
}

.modal-sync-chip.google {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.modal-sync-chip.apple {
  color: #0f172a;
}

.modal-sync-chip.outlook {
  color: #0284c7;
  background: #f0fdf4;
  border-color: #bbf7d0;
}
</style>
