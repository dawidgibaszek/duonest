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
                <span class="count-chip pet-header-new" v-else>Nowy ✨</span>
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

      <!-- MAIN TABS: Zadania vs Zwierzak -->
      <ion-toolbar class="main-tabs-toolbar">
        <div class="main-tabs-pill-row">
          <button
            type="button"
            class="main-tab-pill"
            :class="{ active: activeMainTab === 'tasks' }"
            @click="handleSwitchToTasks"
          >
            <ion-icon :icon="ioniconsCheckboxOutline" />
            <span>Zadania</span>
            <span class="pill-count-chip" v-if="uncompletedTasksCount > 0">{{ uncompletedTasksCount }}</span>
          </button>

          <button
            type="button"
            class="main-tab-pill pet-tab-pill"
            :class="{ active: activeMainTab === 'pet' }"
            @click="handleSwitchToPet"
          >
            <span class="tab-pet-emoji">{{ hasPet ? currentPetDef.emoji : '🐾' }}</span>
            <span>Zwierzak</span>
            <span class="tab-pet-lvl" v-if="hasPet">lvl {{ petLevel }}</span>
            <span class="tab-pet-lvl new-pill" v-else>Nowy ✨</span>
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
              <span class="pet-status-name">Przygarnijcie wspólnego pupila!</span>
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

        <ion-list class="tasks-ion-list" :inset="true" v-if="filteredActiveTasks.length > 0">
          <ion-item-sliding v-for="task in filteredActiveTasks" :key="task.id">
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
                :checked="task.is_completed"
                @ionChange="handleToggleTask(task)"
                :style="{
                  '--checkbox-background-checked': getUserAccentColor(task.assigned_to),
                  '--border-color-checked': getUserAccentColor(task.assigned_to)
                }"
              />
              <ion-label>
                <div class="task-title-row">
                  <span class="task-title">{{ task.title }}</span>
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
        </ion-list>

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

          <ion-list class="tasks-ion-list completed-list" :inset="true">
            <ion-item-sliding v-for="task in filteredCompletedTasks" :key="task.id">
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
          </ion-list>
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
              <span>NOWY CZŁONEK RODZINY</span>
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
              <div class="stage-ambient-light" />
              <div class="stage-pedestal" />
              <PetSprite
                :pet="creatorSelectedPetId"
                animation="happy"
                :scale="3.8"
                :interactive="true"
              />
            </div>

            <div class="creator-species-badge">
              <span class="creator-species-name">{{ creatorSelectedDef.emoji }} {{ creatorSelectedDef.polishName }}</span>
              <span class="creator-species-dot">•</span>
              <span class="creator-species-theme">{{ creatorSelectedDef.theme }}</span>
            </div>
          </div>

          <!-- Section: Wybór gatunku (4-kolumnowa estetyczna siatka kafelków) -->
          <div class="dn-card creator-selection-card">
            <div class="section-label-row">
              <span class="section-badge-icon">🐾</span>
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
              <span class="section-badge-icon">🏷️</span>
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
              class="dn-button-primary creator-adopt-action-btn"
              :disabled="!creatorPetName.trim()"
              @click="handleAdoptPet"
            >
              <ion-icon :icon="ioniconsHeart" />
              <span>Przygarnij {{ creatorSelectedDef.polishName }} ({{ creatorPetName.trim() || 'Wpisz imię' }}) ✨</span>
            </button>
          </div>
        </div>

        <!-- 2. AKTYWNY PUPIL (Gdy zwierzak został już przygarnięty) -->
        <div v-else class="pet-active-container">
          <!-- Hero Stage Card -->
          <div class="dn-card pet-stage-card">
            <!-- Floating Dialogue Bubble -->
            <div class="pet-dialogue-bubble">
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

          <!-- Stats & Mood Grid (Spacious, Prominent & Gamified) -->
          <div class="pet-stats-grid">
            <!-- 1. Level & XP Card -->
            <div class="dn-card pet-stat-card stat-card-xp">
              <!-- Top Row: Icon badge + Level Pill -->
              <div class="stat-top-row">
                <div class="stat-icon-wrap icon-xp">
                  <ion-icon :icon="ioniconsSparkles" />
                </div>
                <div class="stat-pill-chip pill-xp">
                  <span class="chip-star">⭐</span>
                  <span>POZIOM {{ petLevel }}</span>
                </div>
              </div>

              <!-- Category Tag & Subtitle -->
              <div class="stat-heading-group">
                <span class="stat-category-label label-xp">DOŚWIADCZENIE</span>
                <span class="stat-category-sub">Wspólne postępy</span>
              </div>

              <!-- Big Value & Unit -->
              <div class="stat-main-row">
                <span class="stat-big-val">{{ petXp }}</span>
                <span class="stat-unit-text">XP</span>
                <span class="stat-pct-badge badge-xp">{{ petLevelProgressPct }}%</span>
              </div>

              <!-- Candy Progress Bar (Chunky & Glossy) -->
              <div class="stat-bar-track track-xp">
                <div class="stat-bar-fill fill-xp" :style="{ width: `${petLevelProgressPct}%` }">
                  <span class="bar-gloss-line" />
                </div>
              </div>

              <!-- Micro Info Footer -->
              <div class="stat-card-footer">
                <span class="footer-meta-left">{{ petXpInCurrentLevel }} / 50 XP</span>
                <span class="footer-meta-right">+{{ petXpToNextLevel }} do nast.</span>
              </div>
            </div>

            <!-- 2. Happiness Card -->
            <div class="dn-card pet-stat-card stat-card-mood">
              <!-- Top Row: Icon badge + Percentage Pill -->
              <div class="stat-top-row">
                <div class="stat-icon-wrap icon-mood">
                  <span class="mood-top-emoji">{{ happinessEmoji }}</span>
                </div>
                <div class="stat-pill-chip pill-mood">
                  <ion-icon :icon="ioniconsHeart" />
                  <span>{{ petHappiness }}%</span>
                </div>
              </div>

              <!-- Category Tag & Subtitle -->
              <div class="stat-heading-group">
                <span class="stat-category-label label-mood">ZADOWOLENIE</span>
                <span class="stat-category-sub">Nastrój pupila</span>
              </div>

              <!-- Big Value & Mood Status -->
              <div class="stat-main-row">
                <span class="stat-mood-text">{{ happinessLabel }}</span>
              </div>

              <!-- Candy Progress Bar (Chunky & Glossy) -->
              <div class="stat-bar-track track-mood">
                <div class="stat-bar-fill fill-mood" :style="{ width: `${petHappiness}%` }">
                  <span class="bar-gloss-line" />
                </div>
              </div>

              <!-- Micro Info Footer -->
              <div class="stat-card-footer">
                <span class="footer-meta-left">Samopoczucie</span>
                <span class="footer-meta-right">{{ petHappiness >= 75 ? 'Duma z Was 💖' : 'Czeka na zadania' }}</span>
              </div>
            </div>
          </div>

          <!-- Interactive Quick Care Actions for Pet -->
          <div class="dn-card pet-care-card">
            <div class="care-header-row">
              <span class="care-section-label">OKAZANIE CZUŁOŚCI DLA {{ petName.toUpperCase() }}</span>
              <span class="care-section-hint">Interakcja z pupilem</span>
            </div>
            <div class="pet-care-actions-row">
              <button type="button" class="care-action-btn care-btn-treat" @click="handleFeedPet">
                <span class="care-action-emoji">🍎</span>
                <span class="care-action-title">Przysmak</span>
              </button>
              <button type="button" class="care-action-btn care-btn-play" @click="handlePlayPet">
                <span class="care-action-emoji">🎾</span>
                <span class="care-action-title">Zabawa</span>
              </button>
              <button type="button" class="care-action-btn care-btn-pet" @click="handleCaressPet">
                <span class="care-action-emoji">💆</span>
                <span class="care-action-title">Pogłaszcz</span>
              </button>
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
                <h4 class="quests-heading">Zrób zadanie, nakarm pupila XP! ⭐</h4>
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
                <span class="quest-xp-chip">+15 XP ✨</span>
              </div>
            </div>

            <!-- All Completed State -->
            <div v-else class="pet-quests-empty">
              <span class="empty-quest-emoji">🎉</span>
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
      <ion-modal :is-open="showAddModal" @didDismiss="showAddModal = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Nowe Zadanie Domowe</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="showAddModal = false">Anuluj</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <form @submit.prevent="handleCreateTask" class="modal-form">
            <div class="form-group">
              <label class="form-label">Nazwa zadania *</label>
              <ion-input
                v-model="newTaskTitle"
                placeholder="np. Podlanie kwiatów, Mycie okien..."
                class="modal-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Opis lub dodatkowe uwagi</label>
              <ion-textarea
                v-model="newTaskDesc"
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

            <button type="submit" class="dn-button-sea submit-task-btn" :disabled="!newTaskTitle.trim()">
              <ion-icon :icon="ioniconsCheckmarkOutline" />
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

            <!-- Section 1: Gatunek zwierzaka (Siatka 4 kolumny) -->
            <div class="settings-group-card">
              <div class="section-label-row">
                <span class="section-badge-icon">🐾</span>
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
                <span class="section-badge-icon">🏷️</span>
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
                class="dn-button-primary save-pet-settings-btn"
                :disabled="!settingsPetName.trim()"
                @click="handleSavePetSettings"
              >
                <ion-icon :icon="ioniconsCheckmarkOutline" />
                <span>Zapisz zmiany ✨</span>
              </button>
            </div>

            <div style="height: 36px;"></div>
          </div>
        </ion-content>
      </ion-modal>

      <div style="height: 30px;"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState, type TaskItem } from '~/composables/useDuoState'
import { usePetState } from '~/composables/usePetState'
import DuoIcon from '~/components/DuoIcon.vue'
import PetSprite from '~/components/PetSprite.vue'

const {
  tasksList,
  currentUser,
  partnerUser,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor,
  hexToRgba,
  addTask,
  toggleTask,
  deleteTask
} = useDuoState()

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

// Main Tab Navigation: 'tasks' | 'pet'
const activeMainTab = ref<'tasks' | 'pet'>('tasks')

const handleSwitchToTasks = () => {
  activeMainTab.value = 'tasks'
}

const handleSwitchToPet = () => {
  activeMainTab.value = 'pet'
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
    return `Jupi! Wszystkie zadania zrobione! Jesteście niesamowici! 🎉✨`
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
    colors: ['#ec4899', '#f43f5e', '#a855f7']
  })
}

// Pet Quick Interactions (Treat, Play, Pet)
const handleFeedPet = () => {
  triggerPetAnimation('happy', 2200)
  confetti({
    particleCount: 35,
    spread: 55,
    origin: { y: 0.4 },
    colors: ['#ef4444', '#f87171', '#ec4899']
  })
  setCustomSpeech(`Mniam! Pyszna przekąska! Uwielbiam takie smakołyki! 🍎😋`)
}

const handlePlayPet = () => {
  triggerPetAnimation('jump', 2200)
  confetti({
    particleCount: 45,
    spread: 65,
    origin: { y: 0.4 },
    colors: ['#06b6d4', '#3b82f6', '#10b981']
  })
  setCustomSpeech(`Jupi! Ale super zabawa! Aż chce się skakać ze szczęścia! 🎾✨`)
}

const handleCaressPet = () => {
  triggerPetAnimation('happy', 2200)
  confetti({
    particleCount: 30,
    spread: 45,
    origin: { y: 0.4 },
    colors: ['#ec4899', '#f43f5e', '#fb7185']
  })
  setCustomSpeech(`Mruuu... Ciepło i miękko! Najlepiej w Waszym Gniazdku! 🥰💖`)
}

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
    colors: ['#10b981', '#06b6d4', '#f59e0b', '#ec4899']
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
    colors: ['#ec4899', '#f43f5e', '#a855f7']
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
const newTaskPoints = ref(15)

const recurrenceOptions = [
  { value: 'daily', label: 'Codziennie' },
  { value: 'weekly', label: 'Co tydzień' },
  { value: 'biweekly', label: 'Co 2 tygodnie' },
  { value: 'monthly', label: 'Raz w miesiącu' }
]

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
        colors: ['#0284c7', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
      })
    } else {
      triggerPetAnimation('happy', 1400)
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#0284c7', '#0ea5e9', '#10b981', '#f59e0b']
      })
    }
  }
}

const handleCreateTask = async () => {
  if (!newTaskTitle.value.trim()) return
  await addTask(
    newTaskTitle.value,
    newTaskDesc.value,
    newTaskAssignee.value,
    newTaskIsRecurring.value,
    newTaskInterval.value,
    newTaskPoints.value
  )
  showAddModal.value = false
  newTaskTitle.value = ''
  newTaskDesc.value = ''
  newTaskAssignee.value = null
  newTaskIsRecurring.value = false
  newTaskPoints.value = 15
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
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([10, 30, 10])
  }
  await deleteTask(id)
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
  color: #0d9488;
  background: #f0fdfa;
  border: 1px dashed #99f6e4;
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
  background: #f0fdfa;
  color: #0d9488;
  font-size: 13px;
  font-weight: 800;
  padding: 2px 9px;
  border-radius: 999px;
}

.new-chore-btn {
  background: var(--dn-sea-gradient);
  color: #ffffff;
  border: none;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(2, 132, 199, 0.3);
}

.new-chore-btn:active {
  transform: scale(0.95);
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
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--dn-card-shadow);
}

.task-item {
  --padding-start: 12px;
  --inner-padding-end: 12px;
  --min-height: 64px;
}

.task-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.task-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
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
}

.points-badge.completed-badge {
  background: #f1f5f9;
  color: #64748b;
  border-color: #e2e8f0;
}

.task-desc {
  font-size: 12px;
  color: #64748b;
  margin: 3px 0 6px 0;
  line-height: 1.3;
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
  background: #e0f2fe;
  color: #0369a1;
}

.tag-mine {
  background: #f0fdfa;
  color: #0d9488;
}

.tag-partner {
  background: #fef2f2;
  color: #e11d48;
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
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.14);
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
  background: #0284c7;
  color: #ffffff;
  border-color: #0284c7;
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
  background: #0d9488;
  color: #ffffff;
  border-color: #0d9488;
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
  background: #eff6ff;
  color: #0284c7;
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
}

.main-tab-pill {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
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
  background: #0284c7;
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
  background: #eff6ff;
  color: #0284c7;
}

.pet-open-pill {
  font-size: 11.5px;
  font-weight: 700;
  color: #0284c7;
  background: #f0f9ff;
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
  padding: 24px 20px 18px;
  background: radial-gradient(circle at 50% 35%, #fff5f7 0%, #ffffff 80%);
  border: 1px solid rgba(251, 207, 232, 0.6);
  border-radius: 24px;
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
  background: #ffffff;
  border: 1px solid #fbcfe8;
  border-radius: 16px;
  padding: 10px 16px;
  max-width: 280px;
  text-align: center;
  margin-bottom: 18px;
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
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  line-height: 1.4;
}

/* Stage Area with Pedestal */
.stage-sprite-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0 10px;
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
  align-items: center;
  justify-content: space-between;
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
  letter-spacing: -0.3px;
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
  color: #0284c7;
}

.pet-gear-action-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.pet-gear-action-btn:active {
  transform: scale(0.95);
}

/* ============================================= */
/* GAMIFIED PET STATS GRID & TILES (SPACIOUS)    */
/* ============================================= */
.pet-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 0 16px 16px;
}

.pet-stat-card {
  padding: 20px 16px 18px;
  min-height: 195px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  user-select: none;
}

.pet-stat-card:hover {
  transform: translateY(-2px);
}

.stat-card-xp {
  background: linear-gradient(155deg, #f0fdf4 0%, #ffffff 55%, #f7fee7 100%);
  border: 1.5px solid rgba(187, 247, 208, 0.9);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.09);
}

.stat-card-mood {
  background: linear-gradient(155deg, #fff1f2 0%, #ffffff 55%, #fdf2f8 100%);
  border: 1.5px solid rgba(254, 205, 211, 0.9);
  box-shadow: 0 8px 24px rgba(244, 63, 94, 0.09);
}

/* Card Header: Icon + Pill */
.stat-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.icon-xp {
  background: #dcfce7;
  color: #16a34a;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.15);
}

.icon-mood {
  background: #ffe4e6;
  color: #e11d48;
  box-shadow: 0 2px 8px rgba(225, 29, 72, 0.15);
}

.mood-top-emoji {
  font-size: 20px;
  line-height: 1;
}

.stat-pill-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.pill-xp {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.pill-mood {
  background: #ffe4e6;
  color: #be123c;
  border: 1px solid #fecdd3;
}

.pill-mood ion-icon {
  font-size: 12px;
  color: #e11d48;
}

.chip-star {
  font-size: 12px;
}

/* Category Label & Subtitle */
.stat-heading-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 4px;
}

.stat-category-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.label-xp {
  color: #059669;
}

.label-mood {
  color: #e11d48;
}

.stat-category-sub {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

/* Big Value Body */
.stat-main-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 8px;
  min-height: 32px;
}

.stat-big-val {
  font-size: 30px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1;
  letter-spacing: -0.5px;
}

.stat-unit-text {
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
}

.stat-pct-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 8px;
}

.badge-xp {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.stat-mood-text {
  font-size: 15px;
  font-weight: 900;
  color: #0f172a;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Candy Progress Bars */
.stat-bar-track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  margin: 4px 0 8px;
  position: relative;
}

.track-xp {
  background: #e2e8f0;
}

.track-mood {
  background: #fee2e2;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 999px;
  position: relative;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fill-xp {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.35);
}

.fill-mood {
  background: linear-gradient(90deg, #fb7185 0%, #f43f5e 100%);
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.35);
}

.bar-gloss-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%);
  border-radius: 999px;
}

/* Card Footer */
.stat-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.footer-meta-left {
  color: #334155;
  font-weight: 800;
}

.footer-meta-right {
  color: #64748b;
  font-weight: 600;
  text-align: right;
}

/* ============================================= */
/* PET QUICK CARE ACTIONS CARD                   */
/* ============================================= */
.pet-care-card {
  margin: 0 16px 16px;
  padding: 16px 18px 18px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
}

.care-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.care-section-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #64748b;
}

.care-section-hint {
  font-size: 11px;
  font-weight: 700;
  color: #db2777;
}

.pet-care-actions-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.care-action-btn {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 18px;
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.care-action-btn:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
}

.care-action-btn:active {
  transform: scale(0.95);
}

.care-btn-treat:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

.care-btn-play:hover {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.care-btn-pet:hover {
  background: #fdf2f8;
  border-color: #fbcfe8;
}

.care-action-emoji {
  font-size: 24px;
  line-height: 1;
}

.care-action-title {
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
}

/* ============================================= */
/* PET DAILY HOUSEWORK QUESTS CARD               */
/* ============================================= */
.pet-quests-card {
  margin: 0 16px 22px;
  padding: 18px;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.03);
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
}

.quests-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #0284c7;
  background: #e0f2fe;
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
  letter-spacing: -0.2px;
}

.quests-see-all-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 800;
  color: #0284c7;
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
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  padding: 10px 14px;
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
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 2px solid #cbd5e1;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.quest-check-icon {
  font-size: 16px;
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

.empty-quest-emoji {
  font-size: 28px;
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
  background: #0284c7;
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
  background: #0369a1;
}

/* ============================================= */
/* PET CREATOR & ADOPTION VIEW STYLES            */
/* ============================================= */
.pet-creator-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 12px 16px 36px;
}

.pet-creator-showcase {
  padding: 22px 18px 20px;
  background: radial-gradient(circle at 50% 30%, #fff0f6 0%, #ffffff 85%);
  border: 1.5px solid rgba(251, 207, 232, 0.7);
  border-radius: 26px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 10px 30px rgba(236, 72, 153, 0.08);
  position: relative;
}

.creator-sparkle-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #db2777;
  background: #fdf2f8;
  border: 1px solid #fbcfe8;
  padding: 4px 14px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.creator-sparkle-pill ion-icon {
  font-size: 13px;
}

.creator-title {
  font-size: 22px;
  font-weight: 900;
  color: #0f172a;
  margin: 0 0 4px;
  letter-spacing: -0.4px;
}

.creator-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 14px;
  max-width: 300px;
  line-height: 1.4;
}

.creator-speech-bubble {
  position: relative;
  background: #ffffff;
  border: 1px solid #fbcfe8;
  border-radius: 16px;
  padding: 10px 16px;
  max-width: 300px;
  text-align: center;
  margin-bottom: 12px;
  box-shadow: 0 4px 14px rgba(219, 39, 119, 0.08);
  animation: float-bubble 3.2s ease-in-out infinite;
}

.creator-stage-center {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 0 10px;
  cursor: pointer;
  user-select: none;
}

.creator-species-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  background: #ffffff;
  border: 1px solid #fbcfe8;
  padding: 5px 14px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(219, 39, 119, 0.08);
}

.creator-species-name {
  font-size: 13px;
  font-weight: 800;
  color: #db2777;
}

.creator-species-dot {
  color: #f472b6;
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
  padding: 16px;
  background: #ffffff;
  border-radius: 22px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.02);
}

.section-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-badge-icon {
  font-size: 16px;
}

.section-title-text {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #64748b;
}

/* 4-COLUMN COMPACT SPECIES TILES GRID */
.creator-tiles-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.creator-pet-tile {
  position: relative;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  padding: 10px 4px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.creator-pet-tile:hover {
  border-color: #cbd5e1;
  transform: translateY(-2px);
}

.creator-pet-tile.is-selected {
  background: #fdf2f8;
  border-color: #db2777;
  box-shadow: 0 4px 14px rgba(219, 39, 119, 0.16);
  transform: translateY(-2px) scale(1.02);
}

.tile-sprite-wrap {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 3px;
}

.tile-name {
  font-size: 11.5px;
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
  top: -5px;
  right: -5px;
  color: #db2777;
  font-size: 17px;
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  box-shadow: 0 2px 6px rgba(219, 39, 119, 0.2);
}

/* Pretty Input and Suggestions Shelf */
.creator-input-wrapper {
  margin-bottom: 8px;
}

.creator-pretty-input {
  --background: #f8fafc;
  --color: #0f172a;
  --placeholder-color: #94a3b8;
  --padding-start: 14px;
  --padding-end: 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  height: 48px;
}

.cute-names-shelf {
  margin-top: 8px;
}

.shelf-hint {
  font-size: 11.5px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 6px;
  display: block;
}

.shelf-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cute-sug-pill {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cute-sug-pill:hover {
  background: #e2e8f0;
}

.cute-sug-pill.active {
  background: #db2777;
  border-color: #db2777;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(219, 39, 119, 0.25);
}

/* Action CTA Buttons */
.creator-cta-wrap,
.settings-save-wrap {
  margin-top: 6px;
}

.creator-adopt-action-btn,
.save-pet-settings-btn {
  width: 100%;
  padding: 15px;
  font-size: 15px;
  font-weight: 800;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 8px 24px rgba(219, 39, 119, 0.25);
}

.creator-adopt-action-btn:disabled,
.save-pet-settings-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  color: #0284c7;
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
  padding: 20px 16px 18px;
  background: radial-gradient(circle at 50% 30%, #fff0f6 0%, #ffffff 85%);
  border: 1.5px solid rgba(251, 207, 232, 0.7);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.08);
  position: relative;
}

.settings-stage-ambient {
  position: absolute;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.25) 0%, rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
}

.settings-stage-pedestal {
  position: absolute;
  bottom: 58px;
  width: 120px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.02) 80%);
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
  margin-top: 6px;
  background: #ffffff;
  border: 1px solid #fbcfe8;
  padding: 4px 12px;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(219, 39, 119, 0.08);
}

.settings-stage-name {
  font-size: 13px;
  font-weight: 800;
  color: #db2777;
}

.settings-stage-dot {
  color: #f472b6;
  font-size: 11px;
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
