<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div>
              <div class="dn-header-title">
                <span>{{ activeMainTab === 'tasks' ? 'Zadania Domowe' : (hasPet ? 'Wspólny Pupil' : 'Przygarnij Zwierzaka') }}</span>
                <span class="count-chip" v-if="activeMainTab === 'tasks'">{{ uncompletedTasksCount }}</span>
                <span class="count-chip pet-header-lvl" v-else-if="hasPet">lvl {{ petLevel }}</span>
              </div>
              <p class="dn-header-subtitle">
                {{ activeMainTab === 'tasks' ? 'Wspólne dbanie o czysty i ciepły dom' : (hasPet ? 'Twój wirtualny towarzysz domowych obowiązków' : 'Wybierzcie pupila do Waszego Gniazdka') }}
              </p>
            </div>
            <button v-if="activeMainTab === 'tasks'" class="new-chore-btn" @click="showAddModal = true">
              <ion-icon :icon="ioniconsAddOutline" />
              <span>Nowe</span>
            </button>
            <button
              v-else-if="hasPet"
              class="pet-header-gear-btn"
              @click="openPetSettingsModal"
              aria-label="Ustawienia zwierzaka"
            >
              <ion-icon :icon="ioniconsSettingsOutline" />
            </button>
          </div>
        </div>
      </ion-toolbar>

      <!-- MAIN TABS: Zakupy vs Zadania vs Obiady vs Zwierzak -->
      <ion-toolbar class="main-tabs-toolbar" data-no-swipe>
        <div class="main-tabs-pill-row">
          <button
            type="button"
            class="main-tab-pill"
            @click="handleSwitchToShopping"
          >
            <ion-icon :icon="ioniconsCartOutline" />
            <span>Zakupy</span>
            <span class="pill-count-chip" v-if="uncompletedShoppingCount > 0">{{ uncompletedShoppingCount }}</span>
          </button>

          <button
            type="button"
            class="main-tab-pill"
            :class="{ active: activeDailySubTab === 'tasks' && activeMainTab === 'tasks' }"
            @click="handleSwitchToTasks"
          >
            <ion-icon :icon="ioniconsCheckboxOutline" />
            <span>Zadania</span>
            <span class="pill-count-chip" v-if="uncompletedTasksCount > 0">{{ uncompletedTasksCount }}</span>
          </button>

          <button
            type="button"
            class="main-tab-pill"
            @click="handleSwitchToMeals"
          >
            <ion-icon :icon="ioniconsRestaurantOutline" />
            <span>Obiady</span>
          </button>

          <button
            type="button"
            class="main-tab-pill"
            @click="handleSwitchToSavings"
          >
            <ion-icon :icon="ioniconsWalletOutline" />
            <span>Skarbonki</span>
          </button>

          <button
            type="button"
            class="main-tab-pill pet-tab-pill"
            :class="{ active: activeDailySubTab === 'tasks' && activeMainTab === 'pet' }"
            @click="handleSwitchToPet"
          >
            <ion-icon :icon="ioniconsPawOutline" />
            <span>Zwierzak</span>
            <span class="tab-pet-lvl" v-if="hasPet">lvl {{ petLevel }}</span>
          </button>
        </div>
      </ion-toolbar>

      <!-- SEGMENTS: Podział obowiązków (Wszystkie, Moje, Partnera, Wspólne) - tylko w widoku Zadań -->
      <ion-toolbar class="segment-toolbar" v-if="activeMainTab === 'tasks'">
        <ion-segment v-model="selectedSegment" :scrollable="true" mode="ios">
          <ion-segment-button value="all">
            <ion-label>Wszystkie</ion-label>
          </ion-segment-button>
          <ion-segment-button
            value="mine"
            :style="selectedSegment === 'mine' ? { '--color-checked': currentUserAccentColor, '--indicator-color': hexToRgba(currentUserAccentColor, 0.18) } : {}"
          >
            <ion-label :style="selectedSegment === 'mine' ? { color: currentUserAccentColor, fontWeight: '700' } : {}">
              Moje
            </ion-label>
          </ion-segment-button>
          <ion-segment-button
            value="partner"
            :style="selectedSegment === 'partner' ? { '--color-checked': partnerUserAccentColor, '--indicator-color': hexToRgba(partnerUserAccentColor, 0.18) } : {}"
          >
            <ion-label :style="selectedSegment === 'partner' ? { color: partnerUserAccentColor, fontWeight: '700' } : {}">
              {{ partnerUser?.name || 'Partnera' }}
            </ion-label>
          </ion-segment-button>
          <ion-segment-button value="shared">
            <ion-label>Wspólne</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- ============================================== -->
      <!-- TAB 1: LISTA ZADAŃ DOMOWYCH                    -->
      <!-- ============================================== -->
      <div v-if="activeMainTab === 'tasks'" class="tasks-tab-content">
        <!-- Companion Pet Mini-Bar in Tasks -->
        <div class="tasks-pet-status-bar" @click="handleSwitchToPet">
          <div class="pet-status-left" v-if="hasPet">
            <PetSprite
              :pet="petId"
              :animation="currentAnimation"
              :scale="1.6"
              :interactive="false"
            />
            <div class="pet-status-texts">
              <span class="pet-status-name">{{ petName }} • Poziom {{ petLevel }}</span>
              <span class="pet-status-sub">
                {{ uncompletedTasksCount === 0 ? 'Wszystko zrobione! Śpi smacznie 💤' : `${uncompletedTasksCount} zadań do zrobienia • ${happinessLabel}` }}
              </span>
            </div>
          </div>
          <div class="pet-status-left" v-else>
            <div class="pet-status-adopt-icon">🐾</div>
            <div class="pet-status-texts">
              <span class="pet-status-name">Przygarnijcie pupila!</span>
              <span class="pet-status-sub">Wybierzcie zwierzaka, który zamieszka w Waszym Gniazdku ✨</span>
            </div>
          </div>
          <div class="pet-status-right">
            <span class="pet-open-pill">{{ hasPet ? 'Odwiedź pupila →' : 'Wybierz zwierzaka →' }}</span>
          </div>
        </div>

        <!-- ACTIVE TASKS LIST -->
        <div class="tasks-section-header" v-if="filteredActiveTasks.length > 0">
          <span>DO ZROBIENIA ({{ filteredActiveTasks.length }})</span>
        </div>

        <div class="tasks-list-wrapper" v-if="filteredActiveTasks.length > 0">
          <TransitionGroup name="dn-list" tag="div" class="tasks-transition-container">
            <ion-item-sliding
              v-for="task in filteredActiveTasks"
              :key="task.id"
              :class="{
                'dn-completing': completingTaskIds.has(task.id),
                'dn-item-deleting': deletingTaskIds.has(task.id)
              }"
            >
              <!-- Swipe RIGHT gesture (side="start"): Complete task (+XP) -->
              <ion-item-options side="start" @ionSwipe="handleSwipeCompleteTask(task)">
                <ion-item-option color="success" :expandable="true" @click="handleSwipeCompleteTask(task)">
                  <ion-icon slot="icon-only" :icon="ioniconsCheckmarkDoneOutline" />
                </ion-item-option>
              </ion-item-options>

              <ion-item
                class="task-item"
                :style="{
                  borderLeft: `4.5px solid ${getUserAccentColor(task.assigned_to)}`,
                  backgroundColor: task.assigned_to ? hexToRgba(getUserAccentColor(task.assigned_to), 0.03) : '#ffffff'
                }"
                lines="full"
              >
                <ion-checkbox
                  slot="start"
                  :checked="task.is_completed || completingTaskIds.has(task.id)"
                  :class="{ 'dn-check-pop': completingTaskIds.has(task.id) }"
                  @ionChange="handleToggleTask(task)"
                  :style="{
                    '--checkbox-background-checked': getUserAccentColor(task.assigned_to),
                    '--border-color-checked': getUserAccentColor(task.assigned_to)
                  }"
                />
                <ion-label>
                  <div class="task-title-row">
                    <span
                      class="task-title"
                      :class="{ 'dn-strike-animated': completingTaskIds.has(task.id) }"
                    >
                      {{ task.title }}
                    </span>
                    <span class="points-badge">+{{ task.points }} pkt</span>
                  </div>

                  <p class="task-desc" v-if="task.description">{{ task.description }}</p>

                  <div class="task-tags-row">
                    <!-- Assignee badge with dynamic accent color styling -->
                    <span
                      class="tag-pill"
                      :style="{
                        backgroundColor: hexToRgba(getUserAccentColor(task.assigned_to), 0.13),
                        color: getUserAccentColor(task.assigned_to),
                        border: `1px solid ${hexToRgba(getUserAccentColor(task.assigned_to), 0.28)}`
                      }"
                    >
                      <ion-icon :icon="getAssigneeIonicon(task.assigned_to)" />
                      <span>{{ getAssigneeLabel(task.assigned_to) }}</span>
                    </span>

                    <!-- Recurring chore badge -->
                    <span class="tag-pill recurring-pill" v-if="task.is_recurring">
                      <ion-icon :icon="ioniconsRepeatOutline" />
                      <span>{{ getRecurrenceLabel(task.recurrence_interval) }}</span>
                    </span>
                  </div>
                </ion-label>
              </ion-item>

              <!-- Swipe LEFT gesture (side="end"): Delete -->
              <ion-item-options side="end" @ionSwipe="handleSwipeDeleteTask(task.id)">
                <ion-item-option color="danger" :expandable="true" @click="handleSwipeDeleteTask(task.id)">
                  <ion-icon slot="icon-only" :icon="ioniconsTrashOutline" />
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          </TransitionGroup>
        </div>

        <div class="empty-state" v-else-if="filteredCompletedTasks.length === 0">
          <div class="empty-icon-circle">
            <DuoIcon name="empty-tasks" :size="42" />
          </div>
          <h3>Brak zadań w tej kategorii!</h3>
          <p>Możecie odpocząć lub dodać nowe wspólne obowiązki.</p>
        </div>

        <!-- COMPLETED TASKS -->
        <div class="completed-tasks-wrapper" v-if="filteredCompletedTasks.length > 0">
          <div class="tasks-section-header">
            <span>UKOŃCZONE ({{ filteredCompletedTasks.length }})</span>
          </div>

          <div class="tasks-list-wrapper completed-list-wrapper">
            <TransitionGroup name="dn-list" tag="div" class="tasks-transition-container">
              <ion-item-sliding
                v-for="task in filteredCompletedTasks"
                :key="task.id"
                :class="{
                  'dn-item-deleting': deletingTaskIds.has(task.id)
                }"
              >
                <!-- Swipe RIGHT gesture (side="start"): Restore task -->
                <ion-item-options side="start" @ionSwipe="handleSwipeRestoreTask(task)">
                  <ion-item-option color="primary" :expandable="true" @click="handleSwipeRestoreTask(task)">
                    <ion-icon slot="icon-only" :icon="ioniconsArrowUndoOutline" />
                  </ion-item-option>
                </ion-item-options>

                <ion-item
                  class="task-item completed"
                  :style="{
                    borderLeft: `4.5px solid ${hexToRgba(getUserAccentColor(task.assigned_to), 0.35)}`
                  }"
                  lines="full"
                >
                  <ion-checkbox
                    slot="start"
                    :checked="true"
                    @ionChange="handleToggleTask(task)"
                    color="success"
                  />
                  <ion-label>
                    <div class="task-title-row">
                      <span class="task-title strike">{{ task.title }}</span>
                      <span class="points-badge completed-badge">+{{ task.points }} pkt</span>
                    </div>
                  </ion-label>
                </ion-item>

                <!-- Swipe LEFT gesture (side="end"): Delete -->
                <ion-item-options side="end" @ionSwipe="handleSwipeDeleteTask(task.id)">
                  <ion-item-option color="danger" :expandable="true" @click="handleSwipeDeleteTask(task.id)">
                    <ion-icon slot="icon-only" :icon="ioniconsTrashOutline" />
                  </ion-item-option>
                </ion-item-options>
              </ion-item-sliding>
            </TransitionGroup>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TAB 2: WIDOK ZWIERZAKA (PET COMPANION VIEW)    -->
      <!-- ============================================== -->
      <div v-else-if="activeMainTab === 'pet'" class="pet-tab-content">
        <!-- 1. KREATOR ZWIERZAKA (Gdy para jeszcze nie wybrała pupila) -->
        <div v-if="!hasPet" class="pet-creator-container">
          <!-- Hero Stage Showcase -->
          <div class="dn-card pet-creator-showcase">
            <div class="creator-sparkle-pill">
              <ion-icon :icon="ioniconsSparkles" />
              <span>NOWY TOWARZYSZ GNIAZDKA</span>
            </div>

            <h3 class="creator-title">Przygarnijcie Pupila</h3>
            <p class="creator-subtitle">
              Wybierzcie swojego towarzysza do wspólnego dbania o Gniazdko!
            </p>

            <!-- Dynamic dialogue bubble -->
            <div class="creator-speech-bubble">
              <span class="dialogue-tail" />
              <span class="dialogue-text">{{ creatorSpeechText }}</span>
            </div>

            <!-- Pet Stage -->
            <div class="creator-stage-center">
              <div class="stage-pedestal" />
              <PetSprite
                :pet="creatorSelectedPetId"
                animation="happy"
                :scale="3.8"
                :interactive="true"
              />
            </div>

            <div class="creator-species-badge">
              <span class="creator-species-name">{{ creatorSelectedDef.polishName }}</span>
              <span class="creator-species-dot">•</span>
              <span class="creator-species-theme">{{ creatorSelectedDef.theme }}</span>
            </div>
          </div>

          <!-- Section: Wybór gatunku (3-kolumnowa symetryczna siatka kafelków) -->
          <div class="dn-card creator-selection-card">
            <div class="section-label-row">
              <ion-icon :icon="ioniconsPawOutline" class="section-badge-icon" />
              <span class="section-title-text">WYBIERZCIE GATUNEK (12 ZWIERZAKÓW)</span>
            </div>

            <div class="creator-tiles-grid">
              <button
                type="button"
                v-for="p in PET_CATALOG"
                :key="p.id"
                class="creator-pet-tile"
                :class="{ 'is-selected': creatorSelectedPetId.toLowerCase() === p.id.toLowerCase() }"
                @click="creatorSelectedPetId = p.id"
              >
                <div class="tile-sprite-wrap">
                  <PetSprite :pet="p.id" animation="idle" :scale="1.5" :interactive="false" />
                </div>
                <span class="tile-name">{{ p.polishName }}</span>
                <div class="tile-check-badge" v-if="creatorSelectedPetId.toLowerCase() === p.id.toLowerCase()">
                  <ion-icon :icon="ioniconsCheckmarkCircle" />
                </div>
              </button>
            </div>
          </div>

          <!-- Section: Imię Pupila -->
          <div class="dn-card creator-name-card">
            <div class="section-label-row">
              <ion-icon :icon="ioniconsPricetagOutline" class="section-badge-icon" />
              <span class="section-title-text">JAK MA SIĘ WABIĆ?</span>
            </div>

            <div class="creator-input-wrapper">
              <ion-input
                v-model="creatorPetName"
                placeholder="Wpisz imię pupila..."
                class="creator-pretty-input"
                :clear-input="true"
              />
            </div>

            <!-- Suggested names tags -->
            <div class="cute-names-shelf">
              <span class="shelf-hint">Szybkie propozycje:</span>
              <div class="shelf-pills">
                <button
                  type="button"
                  v-for="sug in suggestedNames"
                  :key="sug"
                  class="cute-sug-pill"
                  :class="{ active: creatorPetName === sug }"
                  @click="creatorPetName = sug"
                >
                  {{ sug }}
                </button>
              </div>
            </div>
          </div>

          <!-- CTA Button -->
          <div class="creator-cta-wrap">
            <button
              type="button"
              class="creator-adopt-action-btn"
              :disabled="!creatorPetName.trim()"
              @click="handleAdoptPet"
            >
              <ion-icon :icon="ioniconsHeart" />
              <span>Przygarnij {{ creatorSelectedDef.polishName }} ({{ creatorPetName.trim() || 'Wpisz imię' }})</span>
            </button>
          </div>
        </div>

        <!-- 2. AKTYWNY PUPIL (Gdy zwierzak został już przygarnięty) -->
        <div v-else class="pet-active-container">
          <!-- Hero Stage Card -->
          <div class="dn-card pet-stage-card">
            <!-- Floating Dialogue Bubble -->
            <div class="pet-dialogue-bubble" aria-live="polite">
              <span class="dialogue-tail" />
              <span class="dialogue-text">{{ petSpeechText }}</span>
            </div>

            <!-- Pet Stage Canvas Area -->
            <div class="stage-sprite-wrap" @click="handlePetClick">
              <div class="stage-ambient-light" />
              <div class="stage-pedestal" />
              <PetSprite
                :pet="petId"
                :animation="currentAnimation"
                :scale="3.8"
              />
            </div>

            <!-- Pet Info & Settings Gear Action Row -->
            <div class="pet-name-badge-row">
              <div class="pet-title-box">
                <span class="pet-display-name">{{ petName }}</span>
                <span class="pet-species-pill">
                  {{ currentPetDef.emoji }} {{ currentPetDef.polishName }} • {{ currentPetDef.theme }}
                </span>
              </div>

              <!-- Przycisk z ikonką zębatki do otwierania modalu ustawień i kreacji -->
              <button
                type="button"
                class="pet-gear-action-btn"
                @click="openPetSettingsModal"
                aria-label="Ustawienia zwierzaka"
              >
                <ion-icon :icon="ioniconsSettingsOutline" />
                <span>Ustawienia</span>
              </button>
            </div>
          </div>

          <!-- Stats & Mood Column (Full-Width, Vertical Column, SVG Icons, Flat Clean No Glow) -->
          <div class="pet-stats-column">
            <!-- 1. DOŚWIADCZENIE I POZIOM -->
            <div class="dn-card pet-stat-card stat-card-xp">
              <!-- Header Row -->
              <div class="stat-card-header-row">
                <div class="stat-header-left">
                  <div class="stat-svg-badge badge-green">
                    <ion-icon :icon="ioniconsStar" />
                  </div>
                  <div class="stat-title-wrap">
                    <span class="stat-title">Doświadczenie i Poziom</span>
                    <span class="stat-subtitle">Wspólny rozwój Waszego pupila</span>
                  </div>
                </div>
                <div class="stat-pill-tag tag-green">
                  <ion-icon :icon="ioniconsSparkles" />
                  <span>Poziom {{ petLevel }}</span>
                </div>
              </div>

              <!-- Metrics Row -->
              <div class="stat-metrics-row">
                <div class="stat-main-figure">
                  <span class="figure-num">{{ petXp }}</span>
                  <span class="figure-unit">XP</span>
                </div>
                <div class="stat-progress-sub">
                  <span>{{ petXpInCurrentLevel }} z 50 XP na tym poziomie</span>
                  <span class="progress-pct-chip chip-green">{{ petLevelProgressPct }}%</span>
                </div>
              </div>

              <!-- Clean Track (No Glow) -->
              <div class="stat-clean-track track-green">
                <div class="stat-clean-fill fill-green" :style="{ width: `${petLevelProgressPct}%` }" />
              </div>

              <!-- Meta Footer Row -->
              <div class="stat-card-meta-row">
                <span class="meta-desc">Do Poziomu {{ petLevel + 1 }} brakuje: <strong>{{ petXpToNextLevel }} XP</strong></span>
                <span class="meta-action-hint">+15 XP za każde zadanie</span>
              </div>
            </div>

            <!-- 2. ZADOWOLENIE I NASTRÓJ -->
            <div class="dn-card pet-stat-card stat-card-mood">
              <!-- Header Row -->
              <div class="stat-card-header-row">
                <div class="stat-header-left">
                  <div class="stat-svg-badge badge-rose">
                    <ion-icon :icon="ioniconsHeart" />
                  </div>
                  <div class="stat-title-wrap">
                    <span class="stat-title">Zadowolenie pupila</span>
                    <span class="stat-subtitle">Wskaźnik dbania o czyste Gniazdko</span>
                  </div>
                </div>
                <div class="stat-pill-tag tag-rose">
                  <ion-icon :icon="ioniconsHeart" />
                  <span>{{ petHappiness }}%</span>
                </div>
              </div>

              <!-- Metrics Row -->
              <div class="stat-metrics-row">
                <div class="stat-main-figure">
                  <span class="figure-status-text">{{ cleanHappinessLabel }}</span>
                </div>
              </div>

              <!-- Clean Track (No Glow) -->
              <div class="stat-clean-track track-rose">
                <div class="stat-clean-fill fill-rose" :style="{ width: `${petHappiness}%` }" />
              </div>

              <!-- Meta Footer Row -->
              <div class="stat-card-meta-row">
                <span class="meta-desc">Aktualny nastrój: <strong>{{ cleanHappinessLabel }}</strong></span>
                <span class="meta-action-hint">Rośnie z każdym ukończonym zadaniem</span>
              </div>
            </div>
          </div>

          <!-- Pet Daily Chores Quest Card (Housework Integration) -->
          <div class="dn-card pet-quests-card">
            <div class="quests-header-row">
              <div class="quests-title-box">
                <div class="quests-badge-row">
                  <span class="quests-badge">MISJE DOMOWE</span>
                  <span class="quests-xp-tag">+15 XP KAŻDE</span>
                </div>
                <h4 class="quests-heading">Zrób zadanie, nakarm pupila XP!</h4>
              </div>
              <button type="button" class="quests-see-all-btn" @click="handleSwitchToTasks">
                Wszystkie zadania →
              </button>
            </div>

            <!-- Quest Items List -->
            <div v-if="petPriorityTasks.length > 0" class="pet-quests-list">
              <div
                v-for="task in petPriorityTasks"
                :key="task.id"
                class="pet-quest-item"
                @click="handleQuickCompletePetTask(task)"
              >
                <div class="quest-checkbox-mock">
                  <ion-icon :icon="ioniconsCheckmark" class="quest-check-icon" />
                </div>
                <div class="quest-info-box">
                  <span class="quest-item-title">{{ task.title }}</span>
                  <span class="quest-item-meta">{{ getAssigneeLabel(task.assigned_to) }}</span>
                </div>
                <span class="quest-xp-chip">+15 XP</span>
              </div>
            </div>

            <!-- All Completed State -->
            <div v-else class="pet-quests-empty">
              <div class="empty-quest-icon-wrap">
                <ion-icon :icon="ioniconsCheckmarkDoneCircleOutline" />
              </div>
              <div class="empty-quest-texts">
                <span class="empty-quest-title">Wszystkie zadania zrobione!</span>
                <span class="empty-quest-sub">Wasze Gniazdko lśni, a {{ petName }} odpoczywa zadowolony.</span>
              </div>
              <button type="button" class="add-chore-mini-btn" @click="showAddModal = true">
                + Dodaj zadanie
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL DLA NOWEGO ZADANIA -->
      <ion-modal
        :is-open="showAddModal"
        @didDismiss="showAddModal = false"
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
                  <ion-icon :icon="ioniconsCheckboxOutline" />
                </div>
                <div class="dn-form-sheet-title-text">
                  <h3 class="dn-form-sheet-title">Nowe zadanie domowe</h3>
                  <span class="dn-form-sheet-subtitle">Podzielcie się obowiązkami</span>
                </div>
              </div>
              <button type="button" class="dn-form-sheet-close" @click="showAddModal = false" aria-label="Zamknij">
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <form @submit.prevent="handleCreateTask" class="modal-form">
            <div class="form-group">
              <label class="form-label">Nazwa zadania *</label>
              <ion-input
                v-model="newTaskTitle"
                maxlength="100"
                placeholder="np. Podlanie kwiatów, Mycie okien..."
                class="modal-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Opis lub dodatkowe uwagi</label>
              <ion-textarea
                v-model="newTaskDesc"
                maxlength="500"
                placeholder="np. Płyn do szyb jest pod zlewem w kuchni"
                class="modal-input modal-textarea"
                :rows="2"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Dla kogo jest to zadanie?</label>
              <div class="assignee-select-row">
                <button
                  type="button"
                  class="assignee-btn"
                  :class="{ active: newTaskAssignee === currentUser.id }"
                  :style="newTaskAssignee === currentUser.id ? {
                    backgroundColor: hexToRgba(currentUserAccentColor, 0.15),
                    borderColor: currentUserAccentColor,
                    color: currentUserAccentColor,
                    boxShadow: `0 0 0 1px ${currentUserAccentColor}`
                  } : {}"
                  @click="newTaskAssignee = currentUser.id"
                >
                  <ion-icon :icon="ioniconsPersonOutline" />
                  <span>Dla Mnie</span>
                </button>
                <button
                  type="button"
                  class="assignee-btn"
                  :class="{ active: newTaskAssignee === (partnerUser?.id || 'partner') }"
                  :style="newTaskAssignee === (partnerUser?.id || 'partner') ? {
                    backgroundColor: hexToRgba(partnerUserAccentColor, 0.15),
                    borderColor: partnerUserAccentColor,
                    color: partnerUserAccentColor,
                    boxShadow: `0 0 0 1px ${partnerUserAccentColor}`
                  } : {}"
                  @click="newTaskAssignee = partnerUser?.id || 'partner'"
                >
                  <ion-icon :icon="ioniconsHeartOutline" />
                  <span>{{ partnerUser?.name || 'Partner' }}</span>
                </button>
                <button
                  type="button"
                  class="assignee-btn"
                  :class="{ active: newTaskAssignee === null }"
                  @click="newTaskAssignee = null"
                >
                  <ion-icon :icon="ioniconsPeopleOutline" />
                  <span>Wspólne</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <div class="toggle-row">
                <div>
                  <label class="form-label">Zadanie cykliczne?</label>
                  <span class="sub-label">Automatyczne odnawianie w harmonogramie</span>
                </div>
                <ion-toggle v-model="newTaskIsRecurring" color="primary" />
              </div>

              <div class="recurrence-options" v-if="newTaskIsRecurring">
                <button
                  type="button"
                  v-for="rec in recurrenceOptions"
                  :key="rec.value"
                  class="rec-pill"
                  :class="{ active: newTaskInterval === rec.value }"
                  @click="newTaskInterval = rec.value"
                >
                  {{ rec.label }}
                </button>
              </div>

              <div v-if="newTaskIsRecurring && newTaskInterval === 'custom'" class="custom-interval-fields">
                <label class="custom-interval-field">
                  <span>Dni</span>
                  <ion-input v-model.number="customIntervalDays" type="number" min="0" max="3650" inputmode="numeric" class="modal-input" />
                </label>
                <label class="custom-interval-field">
                  <span>Godziny</span>
                  <ion-input v-model.number="customIntervalHours" type="number" min="0" max="23" inputmode="numeric" class="modal-input" />
                </label>
                <label class="custom-interval-field">
                  <span>Minuty</span>
                  <ion-input v-model.number="customIntervalMinutes" type="number" min="0" max="59" inputmode="numeric" class="modal-input" />
                </label>
                <span class="sub-label" :class="{ 'interval-error': !isCustomIntervalValid }">
                  {{ isCustomIntervalValid ? `Powtarzaj co ${formatCustomInterval(customIntervalTotalMinutes)}` : 'Ustaw przedział większy niż 0 minut.' }}
                </span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nagroda do Waszego Gniazdka</label>
              <div class="points-selector-row">
                <button
                  type="button"
                  v-for="pts in [10, 15, 25, 40]"
                  :key="pts"
                  class="pts-choice-btn"
                  :class="{ active: newTaskPoints === pts }"
                  @click="newTaskPoints = pts"
                >
                  +{{ pts }} pkt
                </button>
              </div>
            </div>

            <button type="submit" class="dn-button-sea submit-task-btn" :disabled="isSubmitting">
              <ion-spinner v-if="isSubmitting" name="crescent" style="width: 18px; height: 18px;" />
              <ion-icon v-else :icon="ioniconsCheckmarkOutline" />
              <span>Dodaj Zadanie</span>
            </button>
          </form>
        </ion-content>
      </ion-modal>

      <!-- PET SETTINGS & CREATOR MODAL (BOTTOM SHEET) -->
      <ion-modal
        :is-open="showPetSettingsModal"
        @didDismiss="showPetSettingsModal = false"
        class="dn-pet-settings-modal"
        :breakpoints="[0, 0.94, 1]"
        :initial-breakpoint="0.94"
        :handle="true"
      >
        <ion-header class="modal-custom-header">
          <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
          <ion-toolbar>
            <div class="modal-header-inner">
              <div class="modal-title-wrap">
                <ion-icon :icon="ioniconsSettingsOutline" class="modal-title-icon" />
                <ion-title>Ustawienia i Kreacja Pupila</ion-title>
              </div>
              <ion-buttons slot="end">
                <button
                  type="button"
                  class="modal-close-icon-btn"
                  @click="showPetSettingsModal = false"
                  aria-label="Zamknij"
                >
                  <ion-icon :icon="ioniconsCloseCircle" />
                </button>
              </ion-buttons>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding pet-settings-modal-content">
          <div class="pet-settings-body">
            <!-- Centered Pet Hero Showcase Stage -->
            <div class="settings-showcase-card">
              <div class="settings-stage-ambient" />
              <div class="settings-stage-pedestal" />
              <div class="settings-stage-sprite" @click="handleSettingsPetClick">
                <PetSprite
                  :pet="settingsPetId"
                  :animation="settingsAnimation"
                  :scale="3.3"
                  :interactive="true"
                />
              </div>
              <div class="settings-stage-badge">
                <span class="settings-stage-name">{{ settingsPetDef.emoji }} {{ settingsPetDef.polishName }}</span>
                <span class="settings-stage-dot">•</span>
                <span class="settings-stage-theme">{{ settingsPetDef.theme }}</span>
              </div>
              <p class="settings-stage-desc">{{ settingsPetDef.description }}</p>
            </div>

            <!-- Section 1: Gatunek zwierzaka (Siatka 3 kolumny) -->
            <div class="settings-group-card">
              <div class="section-label-row">
                <ion-icon :icon="ioniconsPawOutline" class="section-badge-icon" />
                <span class="section-title-text">GATUNEK PUPILA (12 DO WYBORU)</span>
              </div>

              <div class="creator-tiles-grid">
                <button
                  type="button"
                  v-for="p in PET_CATALOG"
                  :key="p.id"
                  class="creator-pet-tile"
                  :class="{ 'is-selected': settingsPetId.toLowerCase() === p.id.toLowerCase() }"
                  @click="selectSettingsSpecies(p.id)"
                >
                  <div class="tile-sprite-wrap">
                    <PetSprite :pet="p.id" animation="idle" :scale="1.4" :interactive="false" />
                  </div>
                  <span class="tile-name">{{ p.polishName }}</span>
                  <div class="tile-check-badge" v-if="settingsPetId.toLowerCase() === p.id.toLowerCase()">
                    <ion-icon :icon="ioniconsCheckmarkCircle" />
                  </div>
                </button>
              </div>
            </div>

            <!-- Section 2: Imię zwierzaka -->
            <div class="settings-group-card">
              <div class="section-label-row">
                <ion-icon :icon="ioniconsPricetagOutline" class="section-badge-icon" />
                <span class="section-title-text">IMIĘ WASZEGO PUPILA</span>
              </div>

              <div class="creator-input-wrapper">
                <ion-input
                  v-model="settingsPetName"
                  placeholder="Wpisz nowe imię..."
                  class="creator-pretty-input"
                  :clear-input="true"
                />
              </div>

              <!-- Szybkie propozycje imion dla wybranego gatunku -->
              <div class="cute-names-shelf">
                <span class="shelf-hint">Propozycje dla {{ settingsPetDef.polishName }}:</span>
                <div class="shelf-pills">
                  <button
                    type="button"
                    v-for="sug in settingsSuggestedNames"
                    :key="sug"
                    class="cute-sug-pill"
                    :class="{ active: settingsPetName === sug }"
                    @click="settingsPetName = sug"
                  >
                    {{ sug }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Save CTA -->
            <div class="settings-save-wrap">
              <button
                type="button"
                class="save-pet-settings-btn"
                :disabled="!settingsPetName.trim()"
                @click="handleSavePetSettings"
              >
                <ion-icon :icon="ioniconsCheckmarkOutline" />
                <span>Zapisz zmiany</span>
              </button>
            </div>

            <div style="height: 36px;"></div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState, type TaskItem } from '~/composables/useDuoState'
import { usePetState } from '~/composables/usePetState'
import DuoIcon from '~/components/DuoIcon.vue'
import PetSprite from '~/components/PetSprite.vue'

const {
  tasksList,
  shoppingItems,
  activeDailySubTab,
  activeTasksMainTab,
  currentUser,
  partnerUser,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor,
  hexToRgba,
  addTask,
  toggleTask,
  deleteTask,
  initSupabaseSync,
  triggerToast
} = useDuoState()

const completingTaskIds = ref<Set<string>>(new Set())
const deletingTaskIds = ref<Set<string>>(new Set())

const {
  hasPet,
  PET_CATALOG,
  getPetDefinition,
  currentAnimation,
  petId,
  petName,
  currentPetDef,
  petXp,
  petLevel,
  petXpInCurrentLevel,
  petXpToNextLevel,
  petLevelProgressPct,
  petHappiness,
  happinessLabel,
  happinessEmoji,
  triggerPetAnimation,
  onEnterPetView,
  selectPet,
  renamePet
} = usePetState()

// Main Tab Navigation: 'tasks' | 'pet' (synced with global activeTasksMainTab)
const activeMainTab = activeTasksMainTab

const uncompletedShoppingCount = computed(() => {
  return shoppingItems.value.filter(i => !i.is_completed).length
})

const handleSwitchToShopping = () => {
  activeDailySubTab.value = 'shopping'
}

const handleSwitchToMeals = () => {
  activeDailySubTab.value = 'meals'
}

const handleSwitchToSavings = () => {
  activeDailySubTab.value = 'savings'
}

onMounted(async () => {
  try {
    await initSupabaseSync()
  } catch (_) {}
})

const handleSwitchToTasks = () => {
  activeDailySubTab.value = 'tasks'
  activeTasksMainTab.value = 'tasks'
}

const handleSwitchToPet = () => {
  activeDailySubTab.value = 'tasks'
  activeTasksMainTab.value = 'pet'
  onEnterPetView()
}

// Custom speech bubble feedback override
const customPetSpeech = ref<string | null>(null)
let customSpeechTimer: any = null

const setCustomSpeech = (text: string, durationMs = 3500) => {
  if (customSpeechTimer) clearTimeout(customSpeechTimer)
  customPetSpeech.value = text
  customSpeechTimer = setTimeout(() => {
    customPetSpeech.value = null
  }, durationMs)
}

// Pet Speech Bubble Dynamic Text
const petSpeechText = computed(() => {
  if (customPetSpeech.value) return customPetSpeech.value
  if (currentAnimation.value === 'sleep') {
    if (uncompletedTasksCount.value === 0) {
      return `Chrrr... Zzz... Wszystkie zadania wykonane! Czas na słodką drzemkę... 💤`
    }
    return `Brak zadań w domu, relaksuję się i ucinam drzemkę... Zzz... 💤`
  }
  if (currentAnimation.value === 'jump') {
    return `Jupi!`
  }
  if (currentAnimation.value === 'happy') {
    return `Cześć! Super Cię widzieć! Zróbmy dzisiaj porządek! 🐾`
  }
  // idle
  if (uncompletedTasksCount.value > 0) {
    return `Mamy dzisiaj ${uncompletedTasksCount.value} ${uncompletedTasksCount.value === 1 ? 'zadanie' : 'zadań'} do zrobienia. Damy radę! 💖`
  }
  return `Wszystko lśni czystością! Pogłaszcz mnie lub odpocznijcie! 💕`
})

// Pet Interactions
const handlePetClick = () => {
  triggerPetAnimation('jump', 1400)
  confetti({
    particleCount: 25,
    spread: 45,
    origin: { y: 0.4 },
    colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b']
  })
}

// Clean happiness text without emojis
const cleanHappinessLabel = computed(() => {
  const h = petHappiness.value
  if (h >= 90) return 'Przeszczęśliwy'
  if (h >= 70) return 'Zadowolony'
  if (h >= 40) return 'Czeka na zadania'
  return 'Potrzebuje uwagi'
})

// Pet Daily Tasks / Quests
const petPriorityTasks = computed(() => {
  return tasksList.value.filter(t => !t.is_completed).slice(0, 3)
})

const handleQuickCompletePetTask = async (task: TaskItem) => {
  await toggleTask(task.id)
  triggerPetAnimation('jump', 2200)
  confetti({
    particleCount: 70,
    spread: 75,
    origin: { y: 0.45 },
    colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b']
  })
  setCustomSpeech(`Brawo! Kolejne zadanie zrobione! +15 XP dla mnie! ⭐🎉`)
}

// Pet Creator State (when !hasPet)
const creatorSelectedPetId = ref<string>('Cat')
const creatorPetName = ref<string>('Kotek')
const creatorSelectedDef = computed(() => getPetDefinition(creatorSelectedPetId.value))

// Speech text inside the creator adoption showcase
const creatorSpeechText = computed(() => {
  const map: Record<string, string> = {
    Cat: 'Miau! Będę pilnować porządku i mruczeć przy każdym zrobionym zadaniu! 🐱',
    Dog: 'Hau hau! Pomogę Wam w każdym zadaniu, byle szybko i razem! 🐶',
    Bunny: 'Kic kic! Posprzątamy całe Gniazdko w mgnieniu oka! 🐰',
    Fox: 'Chytry plan na czysty dom? Zostawcie to mnie! 🦊',
    Panda: 'Spokojnie i bez pośpiechu, wspólnie ogarniemy każde zadanie! 🐼',
    Bear: 'Mocny i pracowity! Żaden domowy obowiązek mi niestraszny! 🐻',
    Chick: 'Ćwir ćwir! Każdy mały krok przybliża Was do lśniącego gniazdka! 🐥',
    Dragon: 'Spalę wszystkie zaległe obowiązki! Gotowi na wyzwania? 🐲',
    Frog: 'Kum kum! Skaczemy do zadań z wielkim uśmiechem! 🐸',
    Ghost: 'Booo! Sprawię, że bałagan zniknie jak za dotknięciem czarów! 👻',
    Penguin: 'Elegancko i z klasą! Wasze gniazdko będzie lśnić jak lód! 🐧',
    Slime: 'Bulgotek! Wchłonę każdy problem i przyniosę masę radości! 🫧'
  }
  return map[creatorSelectedPetId.value] || 'Cześć! Wybierz mnie, a będziemy razem dbać o Wasze Gniazdko! ✨'
})

watch(creatorSelectedPetId, (newId) => {
  const def = getPetDefinition(newId)
  creatorPetName.value = def.polishName
})

const suggestedNames = computed(() => {
  const map: Record<string, string[]> = {
    Cat: ['Teodor', 'Puszek', 'Luna', 'Karmel', 'Chmurka'],
    Dog: ['Milo', 'Badi', 'Tofik', 'Fafik', 'Piorun'],
    Bunny: ['Nita', 'Puchatek', 'Kiki', 'Śnieżka'],
    Fox: ['Rudy', 'Kitsune', 'Błysk', 'Iskierka', 'Foxy'],
    Panda: ['Bambus', 'Pandi', 'Mochi', 'Oreo', 'Pao'],
    Bear: ['Misio', 'Baryła', 'Grizli', 'Baloo', 'Cynamon'],
    Chick: ['Żółtek', 'Pik-Pik', 'Bąbel', 'Puszek', 'Pestka'],
    Dragon: ['Drago', 'Iskra', 'Smok', 'Fafnir', 'Płomyk'],
    Frog: ['Kumka', 'Żabolek', 'Kermit', 'Skoczek', 'Glutek'],
    Ghost: ['Kacperek', 'Bubu', 'Duszek', 'Cień', 'Zjawa'],
    Penguin: ['Pingu', 'Lodzik', 'Skipper', 'Frak', 'Pingwinek'],
    Slime: ['Glucik', 'Żelka', 'Bąbel', 'Jelly', 'Pianka']
  }
  return map[creatorSelectedPetId.value] || ['Milo', 'Puszek', 'Luna', 'Bąbel', 'Karmel']
})

const handleAdoptPet = async () => {
  const clean = creatorPetName.value.trim()
  if (!clean) return
  await selectPet(creatorSelectedPetId.value, clean)
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 }
  })
}

// Pet Settings Modal (Gear Icon)
const showPetSettingsModal = ref(false)
const settingsPetId = ref<string>('Cat')
const settingsPetName = ref<string>('')
const settingsAnimation = ref<'idle' | 'happy' | 'jump' | 'sleep'>('happy')
const settingsPetDef = computed(() => getPetDefinition(settingsPetId.value))

const settingsSuggestedNames = computed(() => {
  const map: Record<string, string[]> = {
    Cat: ['Teodor', 'Puszek', 'Luna', 'Karmel', 'Chmurka'],
    Dog: ['Milo', 'Badi', 'Tofik', 'Fafik', 'Piorun'],
    Bunny: ['Nita', 'Kropek', 'Puchatek', 'Kiki', 'Śnieżka'],
    Fox: ['Rudy', 'Kitsune', 'Błysk', 'Iskierka', 'Foxy'],
    Panda: ['Bambus', 'Pandi', 'Mochi', 'Oreo', 'Pao'],
    Bear: ['Misio', 'Baryła', 'Grizli', 'Baloo', 'Cynamon'],
    Chick: ['Żółtek', 'Pik-Pik', 'Bąbel', 'Puszek', 'Pestka'],
    Dragon: ['Drago', 'Iskra', 'Smok', 'Fafnir', 'Płomyk'],
    Frog: ['Kumka', 'Żabolek', 'Kermit', 'Skoczek', 'Glutek'],
    Ghost: ['Kacperek', 'Bubu', 'Duszek', 'Cień', 'Zjawa'],
    Penguin: ['Pingu', 'Lodzik', 'Skipper', 'Frak', 'Pingwinek'],
    Slime: ['Glucik', 'Żelka', 'Bąbel', 'Jelly', 'Pianka']
  }
  return map[settingsPetId.value] || ['Milo', 'Puszek', 'Luna', 'Bąbel', 'Karmel']
})

const openPetSettingsModal = () => {
  settingsPetId.value = petId.value
  settingsPetName.value = petName.value
  settingsAnimation.value = 'happy'
  showPetSettingsModal.value = true
}

const selectSettingsSpecies = (id: string) => {
  settingsPetId.value = id
  settingsAnimation.value = 'jump'
  setTimeout(() => {
    settingsAnimation.value = 'happy'
  }, 800)
}

const handleSettingsPetClick = () => {
  settingsAnimation.value = 'jump'
  confetti({
    particleCount: 20,
    spread: 45,
    origin: { y: 0.5 },
    colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b']
  })
  setTimeout(() => {
    settingsAnimation.value = 'happy'
  }, 900)
}

const handleSavePetSettings = async () => {
  const clean = settingsPetName.value.trim()
  if (!clean) return
  await selectPet(settingsPetId.value, clean)
  showPetSettingsModal.value = false
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.5 }
  })
}

const selectedSegment = ref('all')
const showAddModal = ref(false)

const newTaskTitle = ref('')
const newTaskDesc = ref('')
const newTaskAssignee = ref<string | null>(null)
const newTaskIsRecurring = ref(false)
const newTaskInterval = ref('weekly')
const customIntervalDays = ref(0)
const customIntervalHours = ref(0)
const customIntervalMinutes = ref(0)
const newTaskPoints = ref(15)
const isSubmitting = ref(false)

const recurrenceOptions = [
  { value: 'daily', label: 'Codziennie' },
  { value: 'weekly', label: 'Co tydzień' },
  { value: 'biweekly', label: 'Co 2 tygodnie' },
  { value: 'monthly', label: 'Raz w miesiącu' },
  { value: 'custom', label: 'Własny' }
]

const customIntervalTotalMinutes = computed(() => {
  return Math.max(0, Number(customIntervalDays.value) || 0) * 1440
    + Math.max(0, Number(customIntervalHours.value) || 0) * 60
    + Math.max(0, Number(customIntervalMinutes.value) || 0)
})

const isCustomIntervalValid = computed(() => {
  return customIntervalTotalMinutes.value > 0
    && Number(customIntervalDays.value) >= 0
    && Number(customIntervalDays.value) <= 3650
    && Number(customIntervalHours.value) >= 0
    && Number(customIntervalHours.value) <= 23
    && Number(customIntervalMinutes.value) >= 0
    && Number(customIntervalMinutes.value) <= 59
})

const formatPolishIntervalUnit = (value: number, singular: string, plural: string, genitivePlural: string) => {
  const lastTwoDigits = value % 100
  if (value === 1) return `${value} ${singular}`
  if (lastTwoDigits >= 12 && lastTwoDigits <= 14) return `${value} ${genitivePlural}`
  const lastDigit = value % 10
  return `${value} ${lastDigit >= 2 && lastDigit <= 4 ? plural : genitivePlural}`
}

const formatCustomInterval = (totalMinutes: number) => {
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []

  if (days) parts.push(formatPolishIntervalUnit(days, 'dzień', 'dni', 'dni'))
  if (hours) parts.push(formatPolishIntervalUnit(hours, 'godzina', 'godziny', 'godzin'))
  if (minutes) parts.push(formatPolishIntervalUnit(minutes, 'minuta', 'minuty', 'minut'))

  return parts.join(' i ')
}

const uncompletedTasksCount = computed(() => {
  return tasksList.value.filter(t => !t.is_completed).length
})

const filteredActiveTasks = computed(() => {
  return tasksList.value.filter(task => {
    if (task.is_completed) return false
    return filterBySegment(task)
  })
})

const filteredCompletedTasks = computed(() => {
  return tasksList.value.filter(task => {
    if (!task.is_completed) return false
    return filterBySegment(task)
  })
})

const filterBySegment = (task: TaskItem) => {
  if (selectedSegment.value === 'all') return true
  if (selectedSegment.value === 'mine') return task.assigned_to === currentUser.value.id
  if (selectedSegment.value === 'partner') return task.assigned_to && task.assigned_to !== currentUser.value.id
  if (selectedSegment.value === 'shared') return task.assigned_to === null
  return true
}

const getAssigneeLabel = (assignedTo?: string | null) => {
  if (!assignedTo) return 'Wspólne'
  if (assignedTo === currentUser.value.id) return 'Moje'
  return partnerUser.value?.name || 'Partnera'
}

const getAssigneeIonicon = (assignedTo?: string | null) => {
  if (!assignedTo) return ioniconsPeopleOutline
  if (assignedTo === currentUser.value.id) return ioniconsPersonOutline
  return ioniconsHeartOutline
}

const getAssigneeClass = (assignedTo?: string | null) => {
  if (!assignedTo) return 'tag-shared'
  if (assignedTo === currentUser.value.id) return 'tag-mine'
  return 'tag-partner'
}

const getRecurrenceLabel = (interval?: string | null) => {
  if (interval?.startsWith('custom:')) {
    const totalMinutes = Number(interval.slice('custom:'.length))
    return Number.isFinite(totalMinutes) && totalMinutes > 0
      ? `Co ${formatCustomInterval(totalMinutes)}`
      : 'Własny przedział'
  }

  switch (interval) {
    case 'daily': return 'Codziennie'
    case 'weekly': return 'Co tydzień'
    case 'biweekly': return 'Co 2 tyg.'
    case 'monthly': return 'Co miesiąc'
    default: return 'Cykliczne'
  }
}

const handleToggleTask = async (task: TaskItem) => {
  const willBeCompleted = !task.is_completed
  if (willBeCompleted) {
    completingTaskIds.value.add(task.id)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25)
    }
    await new Promise(resolve => setTimeout(resolve, 240))
    completingTaskIds.value.delete(task.id)
  }
  await toggleTask(task.id)

  if (willBeCompleted) {
    const remainingActive = tasksList.value.filter(t => !t.is_completed).length
    if (remainingActive === 0) {
      // User completed the very last task! Pet jumps with joy, then sleeps!
      triggerPetAnimation('jump', 2200, () => {
        currentAnimation.value = 'sleep'
      })
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#cbd5e1']
      })
    } else {
      triggerPetAnimation('happy', 1400)
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b']
      })
    }
  } else {
    // If a task is unmarked (restored) and pet was sleeping because all tasks were done, wake it up to idle
    if (currentAnimation.value === 'sleep') {
      currentAnimation.value = 'idle'
    }
  }
}

const handleCreateTask = async () => {
  if (isSubmitting.value) return
  const cleanTitle = newTaskTitle.value.trim().slice(0, 100)
  if (!cleanTitle) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40)
    }
    triggerToast('Wpisz nazwę zadania przed zapisaniem', { type: 'warning' })
    return
  }

  if (newTaskIsRecurring.value && newTaskInterval.value === 'custom' && !isCustomIntervalValid.value) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40)
    }
    triggerToast('Podaj poprawny czas dla niestandardowego powtarzania', { type: 'warning' })
    return
  }

  isSubmitting.value = true
  try {
    const cleanDesc = newTaskDesc.value.trim().slice(0, 500)
    const cleanPoints = Math.max(1, Math.min(100, Number(newTaskPoints.value) || 15))
    const recurrenceInterval = newTaskInterval.value === 'custom'
      ? `custom:${customIntervalTotalMinutes.value}`
      : newTaskInterval.value

    await addTask(
      cleanTitle,
      cleanDesc,
      newTaskAssignee.value,
      newTaskIsRecurring.value,
      recurrenceInterval,
      cleanPoints
    )
    showAddModal.value = false
    newTaskTitle.value = ''
    newTaskDesc.value = ''
    newTaskAssignee.value = null
    newTaskIsRecurring.value = false
    newTaskInterval.value = 'weekly'
    customIntervalDays.value = 0
    customIntervalHours.value = 0
    customIntervalMinutes.value = 0
    newTaskPoints.value = 15
  } finally {
    isSubmitting.value = false
  }
}

const handleSwipeCompleteTask = async (task: TaskItem) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(15)
  }
  await handleToggleTask(task)
}

const handleSwipeRestoreTask = async (task: TaskItem) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10)
  }
  await handleToggleTask(task)
}

const handleSwipeDeleteTask = async (id: string) => {
  if (deletingTaskIds.value.has(id)) return
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([10, 30, 10])
  }
  deletingTaskIds.value.add(id)
  setTimeout(async () => {
    try {
      await deleteTask(id)
    } finally {
      deletingTaskIds.value.delete(id)
    }
  }, 240)
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
.gesture-hint-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 6px 12px;
  margin: 6px 16px 10px 16px;
}

.header-action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.count-chip {
  font-size: 11px;
  font-weight: 700;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  padding: 2px 8px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.new-chore-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  background: #0f172a;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
  transition: transform 0.15s ease, background 0.15s ease;
}

.new-chore-btn:active {
  transform: scale(0.96);
  background: #1e293b;
}

.segment-toolbar {
  --background: #f8fafc;
  padding: 4px 16px 8px 16px;
}

/* TASKS LIST */
.tasks-section-header {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #64748b;
  padding: 8px 20px 4px 20px;
}

.tasks-ion-list {
  background: transparent;
  margin: 4px 16px 16px 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03), 0 4px 12px rgba(15, 23, 42, 0.04);
}

.task-item {
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --min-height: 64px;
  min-width: 0;
  overflow: hidden;
}

.task-item ion-label {
  white-space: normal !important;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.task-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  width: 100%;
}

.task-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
  min-width: 0;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: break-word;
}

.task-title.strike {
  text-decoration: line-through;
  color: #94a3b8;
}

.points-badge {
  font-size: 11px;
  font-weight: 800;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  padding: 2px 7px;
  border-radius: 999px;
  flex-shrink: 0;
  white-space: nowrap;
}

.points-badge.completed-badge {
  background: #f1f5f9;
  color: #64748b;
  border-color: #e2e8f0;
}

.task-desc {
  font-size: 12.5px;
  color: #64748b;
  margin: 4px 0 6px 0;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.task-tags-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.tag-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tag-shared {
  background: #f1f5f9;
  color: #0f172a;
}

.tag-mine {
  background: #f1f5f9;
  color: #0f172a;
}

.tag-partner {
  background: #f8fafc;
  color: #1e293b;
}

.recurring-pill {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* MODAL FORM */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.sub-label {
  font-size: 11px;
  color: #64748b;
  display: block;
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

.modal-textarea {
  --padding-top: 10px;
}

.assignee-select-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.assignee-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 4px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s ease;
}

.assignee-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recurrence-options {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  overflow-x: auto;
}

.rec-pill {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
}

.rec-pill.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.custom-interval-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.custom-interval-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.custom-interval-field .modal-input {
  width: 100%;
  min-width: 0;
  --padding-start: 10px;
  --padding-end: 10px;
}

.interval-error {
  grid-column: 1 / -1;
  color: #b91c1c;
}

.points-selector-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.pts-choice-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #16a34a;
  cursor: pointer;
}

.pts-choice-btn.active {
  background: #16a34a;
  color: #ffffff;
  border-color: #16a34a;
}

.submit-task-btn {
  width: 100%;
  margin-top: 10px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: #f0fdf4;
  color: #16a34a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
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

/* ============================================= */
/* PET & COMPANION STYLES                        */
/* ============================================= */

/* PET HEADER CONTROLS */
.pet-header-lvl {
  background: #fdf2f8;
  color: #db2777;
}

.pet-header-new {
  background: #f1f5f9;
  color: #0f172a;
}

.pet-header-gear-btn {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.pet-header-gear-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.pet-header-gear-btn:active {
  transform: scale(0.92);
  background: #e2e8f0;
}

/* MAIN TABS SWITCHER (Zadania vs Zwierzak) */
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
  font-size: 10.5px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}

.tab-pet-emoji {
  font-size: 15px;
}

.tab-pet-lvl {
  font-size: 10.5px;
  font-weight: 800;
  background: #fdf2f8;
  color: #db2777;
  padding: 1px 6px;
  border-radius: 999px;
}

/* TASKS VIEW: PET COMPANION STATUS BAR */
.tasks-pet-status-bar {
  margin: 10px 16px 14px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tasks-pet-status-bar:hover {
  border-color: #cbd5e1;
}

.tasks-pet-status-bar:active {
  transform: scale(0.98);
}

.pet-status-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.pet-status-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pet-status-name {
  font-size: 13.5px;
  font-weight: 800;
  color: #0f172a;
}

.pet-status-sub {
  font-size: 11.5px;
  color: #64748b;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pet-status-adopt-icon {
  font-size: 26px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdf2f8;
  border-radius: 50%;
}

.tab-pet-lvl.new-pill {
  background: #f1f5f9;
  color: #0f172a;
}

.pet-open-pill {
  font-size: 11.5px;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

/* ============================================= */
/* PET COMPANION VIEW STYLES                     */
/* ============================================= */
.pet-tab-content {
  padding-bottom: 30px;
}

/* Hero Stage Card */
.pet-stage-card {
  margin: 12px 16px 16px;
  padding: 20px 18px 18px;
  background: linear-gradient(155deg, #fff8fb 0%, #ffffff 58%, #f5fbfa 100%);
  border: 1px solid #f1dce7;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8px 24px rgba(236, 72, 153, 0.06);
  position: relative;
  overflow: hidden;
}

/* Speech Bubble */
.pet-dialogue-bubble {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #fbcfe8;
  border-radius: 16px;
  width: min(100%, 310px);
  height: 88px;
  flex: 0 0 88px;
  padding: 10px 16px;
  text-align: center;
  margin-bottom: 16px;
  box-shadow: 0 4px 14px rgba(219, 39, 119, 0.08);
  animation: float-bubble 3.2s ease-in-out infinite;
}

@keyframes float-bubble {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.dialogue-tail {
  position: absolute;
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 12px;
  height: 12px;
  background: #ffffff;
  border-right: 1px solid #fbcfe8;
  border-bottom: 1px solid #fbcfe8;
}

.dialogue-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

/* Stage Area with Pedestal */
.stage-sprite-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 196px;
  padding: 16px 0 10px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(253, 242, 248, 0.72));
  cursor: pointer;
  user-select: none;
}

.stage-ambient-light {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.22) 0%, rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
}

.stage-pedestal {
  position: absolute;
  bottom: 6px;
  width: 130px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(236, 72, 153, 0.16) 0%, rgba(236, 72, 153, 0.02) 80%);
  pointer-events: none;
}

/* Pet Identity Bar */
.pet-name-badge-row {
  width: 100%;
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed rgba(244, 114, 182, 0.25);
}

.pet-title-box {
  display: flex;
  flex-direction: column;
}

.pet-display-name {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0;
  overflow-wrap: break-word;
  word-break: break-word;
}

.pet-species-pill {
  font-size: 11.5px;
  color: #db2777;
  font-weight: 700;
  margin-top: 2px;
}

.pet-gear-action-btn {
  background: #f8fafc;
  color: #334155;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pet-gear-action-btn ion-icon {
  font-size: 16px;
  color: #0f172a;
}

.pet-gear-action-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.pet-gear-action-btn:active {
  transform: scale(0.95);
}

/* ============================================= */
/* FULL-WIDTH STATS COLUMN (NO GLOW, SVG ICONS)  */
/* ============================================= */
.pet-stats-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0 16px 18px;
}

.pet-stat-card {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 18px 20px;
  border-radius: 22px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
  user-select: none;
}

.stat-card-xp {
  border-color: #bbf7d0;
  border-left-width: 5px;
  border-left-color: #10b981;
}

.stat-card-mood {
  border-color: #fecdd3;
  border-left-width: 5px;
  border-left-color: #f43f5e;
}

/* Card Header: SVG Icon + Title + Pill Tag */
.stat-card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-svg-badge {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex-shrink: 0;
}

.badge-green {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.badge-rose {
  background: #fff1f2;
  color: #e11d48;
  border: 1px solid #fecdd3;
}

.stat-title-wrap {
  display: flex;
  flex-direction: column;
}

.stat-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.2px;
}

.stat-subtitle {
  font-size: 11.5px;
  color: #64748b;
  font-weight: 600;
}

.stat-pill-tag {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 800;
  text-wrap: nowrap;
}

.tag-green {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.tag-rose {
  background: #ffe4e6;
  color: #be123c;
  border: 1px solid #fecdd3;
}

.tag-rose ion-icon,
.tag-green ion-icon {
  font-size: 13px;
}

/* Metrics Middle Row */
.stat-metrics-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.stat-main-figure {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.figure-num {
  font-size: 28px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1;
  letter-spacing: -0.5px;
}

.figure-unit {
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
}

.figure-status-text {
  font-size: 20px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: -0.3px;
}

.stat-progress-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

.progress-pct-chip {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
}

.chip-green {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

/* Progress Track: Clean, Crisp, Flat, No Glow */
.stat-clean-track {
  width: 100%;
  height: 9px;
  border-radius: 999px;
  background: #f1f5f9;
  overflow: hidden;
}

.stat-clean-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.fill-green {
  background: #10b981;
}

.fill-rose {
  background: #f43f5e;
}

/* Card Meta Footer */
.stat-card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  line-height: 1.3;
}

.meta-desc {
  color: #475569;
  font-weight: 600;
}

.meta-desc strong {
  color: #0f172a;
  font-weight: 800;
}

.meta-action-hint {
  color: #64748b;
  font-weight: 700;
}

/* ============================================= */
/* PET QUICK CARE ACTIONS CARD                   */
/* ============================================= */
/* ============================================= */
/* PET DAILY HOUSEWORK QUESTS CARD               */
/* ============================================= */
.pet-quests-card {
  margin: 0 16px 22px;
  padding: 18px 20px;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.quests-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.quests-title-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quests-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  text-wrap: nowrap;
}

.quests-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #0f172a;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 999px;
}

.quests-xp-tag {
  font-size: 10px;
  font-weight: 800;
  color: #16a34a;
  background: #dcfce7;
  padding: 2px 7px;
  border-radius: 999px;
}

.quests-heading {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  margin-top: 0.5rem;
  letter-spacing: -0.2px;
}

.quests-see-all-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
  cursor: pointer;
  padding: 4px 6px;
  white-space: nowrap;
}

.quests-see-all-btn:hover {
  text-decoration: underline;
}

.pet-quests-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pet-quest-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 11px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.pet-quest-item:hover {
  background: #f0fdf4;
  border-color: #86efac;
  transform: translateX(2px);
}

.quest-checkbox-mock {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 2px solid #cbd5e1;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.quest-check-icon {
  font-size: 15px;
  color: #ffffff;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.pet-quest-item:hover .quest-checkbox-mock {
  border-color: #10b981;
  background: #10b981;
}

.pet-quest-item:hover .quest-check-icon {
  opacity: 1;
}

.quest-info-box {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.quest-item-title {
  font-size: 13.5px;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quest-item-meta {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.quest-xp-chip {
  font-size: 11.5px;
  font-weight: 800;
  color: #059669;
  background: #dcfce7;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}

.pet-quests-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 12px;
  background: #f8fafc;
  border-radius: 18px;
  gap: 8px;
}

.empty-quest-icon-wrap {
  font-size: 32px;
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-quest-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.empty-quest-title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.empty-quest-sub {
  font-size: 12px;
  color: #64748b;
  max-width: 280px;
}

.add-chore-mini-btn {
  margin-top: 6px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-chore-mini-btn:hover {
  background: #1e293b;
}

/* ============================================= */
/* PET CREATOR & ADOPTION VIEW STYLES            */
/* ============================================= */
.pet-creator-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 16px 40px;
}

.pet-creator-showcase {
  padding: 24px 18px 20px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
  position: relative;
}

.creator-sparkle-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 4px 14px;
  border-radius: 999px;
  margin-bottom: 10px;
}

.creator-sparkle-pill ion-icon {
  font-size: 13px;
}

.creator-title {
  font-size: 21px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}

.creator-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px;
  max-width: 300px;
  line-height: 1.45;
}

.creator-speech-bubble {
  position: relative;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 10px 16px;
  max-width: 300px;
  text-align: center;
  margin-bottom: 14px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  animation: float-bubble 3.2s ease-in-out infinite;
}

.creator-speech-bubble .dialogue-tail {
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.creator-stage-center {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0 8px;
  user-select: none;
}

.creator-stage-center .stage-pedestal {
  position: absolute;
  bottom: 4px;
  width: 120px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.09) 0%, rgba(15, 23, 42, 0) 75%);
  pointer-events: none;
}

.creator-species-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 5px 14px;
  border-radius: 999px;
}

.creator-species-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.creator-species-dot {
  color: #94a3b8;
  font-size: 12px;
}

.creator-species-theme {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
}

/* Reusable Section Cards in Creator & Settings */
.creator-selection-card,
.creator-name-card,
.settings-group-card {
  padding: 18px 16px;
  background: #ffffff;
  border-radius: 22px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
}

.section-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.section-badge-icon {
  font-size: 16px;
  color: #0f172a;
}

.section-title-text {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #64748b;
}

/* 3-COLUMN BEAUTIFUL MOBILE SPECIES TILES GRID */
.creator-tiles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.creator-pet-tile {
  position: relative;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 18px;
  padding: 12px 6px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.16s ease;
  user-select: none;
}

.creator-pet-tile:hover {
  border-color: #cbd5e1;
  background: #ffffff;
}

.creator-pet-tile.is-selected {
  background: #f8fafc;
  border-color: #0f172a;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
}

.creator-pet-tile.is-selected .tile-name {
  color: #0f172a;
}

.tile-sprite-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.tile-name {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tile-check-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  color: #0f172a;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Pretty Input and Suggestions Shelf */
.creator-input-wrapper {
  margin-bottom: 10px;
}

.creator-pretty-input {
  --background: #f8fafc;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
  --padding-start: 16px;
  --padding-end: 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  height: 50px;
  transition: all 0.15s ease;
}

.creator-pretty-input:focus-within {
  border-color: #0f172a;
  --background: #ffffff;
}

.cute-names-shelf {
  margin-top: 10px;
}

.shelf-hint {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 8px;
  display: block;
}

.shelf-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cute-sug-pill {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 700;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cute-sug-pill:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.cute-sug-pill.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

/* Action CTA Buttons */
.creator-cta-wrap,
.settings-save-wrap {
  margin-top: 8px;
}

.creator-adopt-action-btn,
.save-pet-settings-btn {
  width: 100%;
  height: 52px;
  padding: 0 20px;
  font-size: 15px;
  font-weight: 800;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: all 0.16s ease;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
}

.creator-adopt-action-btn:hover:not(:disabled),
.save-pet-settings-btn:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-1px);
}

.creator-adopt-action-btn:active:not(:disabled),
.save-pet-settings-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.creator-adopt-action-btn:disabled,
.save-pet-settings-btn:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  opacity: 0.8;
  cursor: not-allowed;
  box-shadow: none;
}

/* ============================================= */
/* PET SETTINGS MODAL STYLES                     */
/* ============================================= */
ion-modal.dn-pet-settings-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
}

.dn-pet-settings-modal .modal-custom-header ion-toolbar {
  --background: #ffffff;
  --border-width: 0;
  padding: 6px 12px;
}

.dn-pet-settings-modal .modal-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 4px;
}

.dn-pet-settings-modal .modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dn-pet-settings-modal .modal-title-icon {
  font-size: 20px;
  color: #0f172a;
}

.dn-pet-settings-modal .modal-title-wrap ion-title {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  padding: 0;
}

.dn-pet-settings-modal .modal-close-icon-btn {
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
  font-size: 26px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
}

.dn-pet-settings-modal .modal-close-icon-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.dn-pet-settings-modal .modal-close-icon-btn:active {
  transform: scale(0.92);
}

.pet-settings-modal-content {
  --background: #ffffff;
}

.pet-settings-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 24px;
}

.settings-showcase-card {
  padding: 22px 16px 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
  position: relative;
}

.settings-stage-ambient {
  display: none;
}

.settings-stage-pedestal {
  position: absolute;
  bottom: 58px;
  width: 120px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.09) 0%, rgba(15, 23, 42, 0) 75%);
  pointer-events: none;
}

.settings-stage-sprite {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0 8px;
  cursor: pointer;
  user-select: none;
}

.settings-stage-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 5px 14px;
  border-radius: 999px;
}

.settings-stage-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
}

.settings-stage-dot {
  color: #94a3b8;
  font-size: 12px;
}

.settings-stage-theme {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
}

.settings-stage-desc {
  font-size: 12px;
  color: #64748b;
  margin: 8px 0 0;
  line-height: 1.4;
  max-width: 280px;
}
</style>
