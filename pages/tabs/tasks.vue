<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div>
              <div class="dn-header-title">
                <span>{{ activeMainTab === 'tasks' ? 'Zadania' : (hasPet ? 'Pupil' : 'Zwierzak') }}</span>
                <span class="count-chip" v-if="activeMainTab === 'tasks' && uncompletedTasksCount > 0">{{ uncompletedTasksCount }}</span>
                <span class="count-chip pet-header-lvl" v-else-if="hasPet">lvl {{ petLevel }}</span>
              </div>
              <p class="dn-header-subtitle">
                {{ activeMainTab === 'tasks' ? 'Wspólne dbanie o czysty i ciepły dom' : (hasPet ? 'Twój wirtualny towarzysz domowych obowiązków' : 'Wybierzcie pupila do Waszego Gniazdka') }}
              </p>
            </div>
            <button
              v-if="activeMainTab === 'tasks'"
              type="button"
              class="dn-header-btn dn-header-btn--icon"
              aria-label="Nowe zadanie"
              @click="showAddModal = true"
            >
              <ion-icon :icon="ioniconsAddOutline" />
            </button>
            <button
              v-else-if="hasPet"
              class="dn-header-btn dn-header-btn--icon dn-header-btn--soft"
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
        <div ref="pillRowRef" class="main-tabs-pill-row" @scroll.passive="onTabsScroll">
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
      <ion-toolbar class="dn-subtabs-toolbar" v-if="activeMainTab === 'tasks'">
        <div class="dn-subtabs">
          <button
            v-for="seg in taskSegments"
            :key="seg.value"
            type="button"
            class="dn-subtab"
            :class="{ active: selectedSegment === seg.value }"
            @click="selectedSegment = seg.value"
          >
            <span>{{ seg.label }}</span>
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
      <!-- TAB 1: LISTA ZADAŃ DOMOWYCH                    -->
      <!-- ============================================== -->
      <div v-if="activeMainTab === 'tasks'" class="tasks-tab-content">
        <!-- Companion pet mini-bar -->
        <button type="button" class="pt-mini" :class="{ 'pt-mini--invite': !hasPet }" @click="handleSwitchToPet">
          <span class="pt-mini-sprite">
            <PetSprite v-if="hasPet" :pet="petId" :animation="currentAnimation" :scale="1.3" :interactive="false" />
            <ion-icon v-else :icon="ioniconsPawOutline" />
          </span>
          <span class="pt-mini-text">
            <span class="pt-mini-title">{{ hasPet ? petName : 'Odbierzcie pupila' }}</span>
            <span class="pt-mini-sub">
              <template v-if="hasPet">Poziom {{ petLevel }} · {{ uncompletedTasksCount === 0 ? 'wszystko zrobione' : `${uncompletedTasksCount} do zrobienia` }}</template>
              <template v-else>Wybierzcie go w zakładce Zwierzak.</template>
            </span>
          </span>
          <span v-if="hasPet" class="pt-mini-bar"><span :style="{ width: Math.max(petLevelProgressPct, 4) + '%' }" /></span>
          <ion-icon :icon="ioniconsChevronForwardOutline" class="pt-mini-arrow" />
        </button>

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
                'dn-completing': completingTaskIds.has(task.id)
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
                lines="full"
              >
                <ion-checkbox :aria-label="`Oznacz jako zrobione: ${task.title}`"
                  slot="start"
                  :checked="task.is_completed || completingTaskIds.has(task.id)"
                  :class="{ 'dn-check-pop': completingTaskIds.has(task.id) }"
                  @ionChange="handleToggleTask(task)"
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
              >
                <!-- Swipe RIGHT gesture (side="start"): Restore task -->
                <ion-item-options side="start" @ionSwipe="handleSwipeRestoreTask(task)">
                  <ion-item-option color="primary" :expandable="true" @click="handleSwipeRestoreTask(task)">
                    <ion-icon slot="icon-only" :icon="ioniconsArrowUndoOutline" />
                  </ion-item-option>
                </ion-item-options>

                <ion-item
                  class="task-item completed"
                  lines="full"
                >
                  <ion-checkbox :aria-label="`Przywróć zadanie: ${task.title}`"
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
      <div v-else-if="activeMainTab === 'pet'" class="pt-page">
        <!-- 1. CREATOR (no pet yet) -->
        <template v-if="!hasPet">
          <div class="pt-stage">
            <div class="pt-bubble"><span class="pt-bubble-name">{{ creatorSelectedDef.polishName }}</span><span class="pt-bubble-text">{{ creatorSpeechText }}</span></div>
            <div class="pt-sprite">
              <PetSprite :pet="creatorSelectedPetId" animation="happy" :scale="3.4" :interactive="true" />
            </div>
            <div class="pt-stage-foot">
              <span class="pt-name">{{ creatorSelectedDef.polishName }}</span>
              <span class="pt-species">{{ creatorSelectedDef.theme }}</span>
            </div>
          </div>

          <section class="pt-section">
            <div class="pt-section-head">
              <h2 class="pt-section-title">Gatunek</h2>
              <span class="pt-section-meta">{{ PET_CATALOG.length }} do wyboru</span>
            </div>
            <div class="pt-grid">
              <button
                v-for="p in PET_CATALOG"
                :key="p.id"
                type="button"
                class="pt-tile"
                :class="{ active: creatorSelectedPetId.toLowerCase() === p.id.toLowerCase() }"
                @click="creatorSelectedPetId = p.id"
              >
                <span class="pt-tile-sprite">
                  <PetSprite :pet="p.id" animation="idle" :scale="1.4" :interactive="false" />
                </span>
                <span class="pt-tile-name">{{ p.polishName }}</span>
              </button>
            </div>
          </section>

          <section class="pt-section">
            <div class="pt-section-head">
              <h2 class="pt-section-title">Imię</h2>
            </div>
            <ion-input aria-label="Imię pupila" v-model="creatorPetName" maxlength="40" placeholder="Jak ma się wabić?" class="pt-input" :clear-input="true" />
            <div class="pt-chips">
              <button
                v-for="sug in suggestedNames"
                :key="sug"
                type="button"
                class="pt-chip"
                :class="{ active: creatorPetName === sug }"
                @click="creatorPetName = sug"
              >
                {{ sug }}
              </button>
            </div>
          </section>

          <button type="button" class="dn-button-primary pt-full-btn" :disabled="isSavingPet || !creatorPetName.trim()" @click="handleAdoptPet">
            <ion-icon :icon="ioniconsHeart" />
            <span>Przygarnij{{ creatorPetName.trim() ? ` ${creatorPetName.trim()}` : '' }}</span>
          </button>
        </template>

        <!-- 2. ACTIVE PET -->
        <template v-else>
          <div class="pt-stage">
            <div class="pt-bubble" aria-live="polite"><span class="pt-bubble-name">{{ petName }}</span><span class="pt-bubble-text">{{ petSpeechText }}</span></div>
            <div class="pt-sprite" @click="handlePetClick">
              <PetSprite :pet="petId" :animation="currentAnimation" :scale="3.4" />
            </div>
            <div class="pt-stage-foot">
              <span class="pt-name">{{ petName }}</span>
              <span class="pt-species">{{ currentPetDef.polishName }} · {{ currentPetDef.theme }}</span>
            </div>

            <div class="pt-panel">
              <div class="pt-panel-row">
                <span class="pt-level">Poziom {{ petLevel }}</span>
                <span class="pt-panel-value">{{ petXp }} XP</span>
              </div>
              <div class="pt-bar"><span :style="{ width: Math.max(petLevelProgressPct, 2) + '%' }" /></div>
              <div class="pt-panel-meta">
                <span>{{ petXpInCurrentLevel }} / 50 XP</span>
                <span>jeszcze {{ petXpToNextLevel }} XP do poziomu {{ petLevel + 1 }}</span>
              </div>

              <div class="pt-panel-divider" />

              <div class="pt-panel-row">
                <span class="pt-panel-label">
                  <ion-icon :icon="ioniconsHeart" />
                  Zadowolenie
                </span>
                <span class="pt-panel-value">{{ petHappiness }}%</span>
              </div>
              <div class="pt-bar is-cream"><span :style="{ width: Math.max(petHappiness, 2) + '%' }" /></div>
              <div class="pt-panel-meta">
                <span>{{ cleanHappinessLabel }}</span>
                <span>rośnie z każdym zadaniem</span>
              </div>
            </div>
          </div>

          <section class="pt-section">
            <div class="pt-section-head">
              <h2 class="pt-section-title">Misje domowe</h2>
              <button type="button" class="pt-link" @click="handleSwitchToTasks">Wszystkie</button>
            </div>
            <p class="pt-hint">Za ukończone zadania {{ petName }} zdobywa XP.</p>

            <div v-if="petPriorityTasks.length > 0" class="pt-quests">
              <div v-for="task in petPriorityTasks" :key="task.id" class="pt-quest">
                <button
                  type="button"
                  class="pt-check"
                  :aria-label="`Oznacz ${task.title} jako zrobione`"
                  @click="handleQuickCompletePetTask(task)"
                >
                  <ion-icon :icon="ioniconsCheckmark" />
                </button>
                <span class="pt-quest-text">
                  <span class="pt-quest-title">{{ task.title }}</span>
                  <span class="pt-quest-meta">{{ getAssigneeLabel(task.assigned_to) }}</span>
                </span>
                <span class="pt-xp">+{{ task.points }} XP</span>
              </div>
            </div>

            <div v-else class="pt-empty">
              <span class="pt-empty-icon"><ion-icon :icon="ioniconsCheckmarkDoneOutline" /></span>
              <span class="pt-empty-title">Wszystko zrobione</span>
              <span class="pt-empty-sub">Gniazdko lśni, a {{ petName }} odpoczywa.</span>
              <button type="button" class="pt-soft-btn" @click="showAddModal = true">
                <ion-icon :icon="ioniconsAddOutline" />
                <span>Dodaj zadanie</span>
              </button>
            </div>
          </section>
        </template>
      </div>

      <!-- MODAL DLA NOWEGO ZADANIA -->
      <ion-modal
        :is-open="showAddModal"
        @didDismiss="showAddModal = false"
        class="dn-form-sheet-modal"
        :expand-to-scroll="false"
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
              <ion-input aria-label="Nazwa zadania"
                v-model="newTaskTitle"
                maxlength="100"
                placeholder="np. Podlanie kwiatów, Mycie okien..."
                class="modal-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Opis lub dodatkowe uwagi</label>
              <ion-textarea aria-label="Opis zadania"
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
                  :class="{ active: newTaskAssignee === currentUser?.id }"
                  @click="newTaskAssignee = currentUser?.id || ''"
                >
                  <ion-icon :icon="ioniconsPersonOutline" />
                  <span>Dla Mnie</span>
                </button>
                <button
                  type="button"
                  class="assignee-btn"
                  :class="{ active: newTaskAssignee === (partnerUser?.id || 'partner') }"
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
                <ion-toggle aria-label="Automatyczne odnawianie" v-model="newTaskIsRecurring" color="primary" />
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
                  <ion-input aria-label="Dni" v-model.number="customIntervalDays" type="number" min="0" max="3650" inputmode="numeric" class="modal-input" />
                </label>
                <label class="custom-interval-field">
                  <span>Godziny</span>
                  <ion-input aria-label="Godziny" v-model.number="customIntervalHours" type="number" min="0" max="23" inputmode="numeric" class="modal-input" />
                </label>
                <label class="custom-interval-field">
                  <span>Minuty</span>
                  <ion-input aria-label="Minuty" v-model.number="customIntervalMinutes" type="number" min="0" max="59" inputmode="numeric" class="modal-input" />
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

      <!-- PET SETTINGS SHEET -->
      <ion-modal
        :is-open="showPetSettingsModal"
        @didDismiss="showPetSettingsModal = false"
        class="dn-form-sheet-modal"
        :expand-to-scroll="false"
        :breakpoints="[0, 0.92, 1]"
        :initial-breakpoint="0.92"
        :handle="true"
      >
        <ion-header class="dn-form-sheet-header ion-no-border">
          <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
          <ion-toolbar>
            <div class="dn-form-sheet-heading">
              <div class="dn-form-sheet-title-row">
                <div class="dn-form-sheet-title-text">
                  <h3 class="dn-form-sheet-title">Twój pupil</h3>
                </div>
              </div>
              <button type="button" class="dn-form-sheet-close" @click="showPetSettingsModal = false" aria-label="Zamknij">
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <div class="pt-stage is-compact">
            <div class="pt-sprite" @click="handleSettingsPetClick">
              <PetSprite :pet="settingsPetId" :animation="settingsAnimation" :scale="2.8" :interactive="true" />
            </div>
            <div class="pt-stage-foot">
              <span class="pt-name">{{ settingsPetDef.polishName }}</span>
              <span class="pt-species">{{ settingsPetDef.theme }}</span>
            </div>
            <p v-if="settingsPetDef.description" class="pt-desc">{{ settingsPetDef.description }}</p>
          </div>

          <section class="pt-section is-flush">
            <div class="pt-section-head">
              <h2 class="pt-section-title">Gatunek</h2>
            </div>
            <div class="pt-grid">
              <button
                v-for="p in PET_CATALOG"
                :key="p.id"
                type="button"
                class="pt-tile"
                :class="{ active: settingsPetId.toLowerCase() === p.id.toLowerCase() }"
                @click="selectSettingsSpecies(p.id)"
              >
                <span class="pt-tile-sprite">
                  <PetSprite :pet="p.id" animation="idle" :scale="1.4" :interactive="false" />
                </span>
                <span class="pt-tile-name">{{ p.polishName }}</span>
              </button>
            </div>
          </section>

          <section class="pt-section is-flush">
            <div class="pt-section-head">
              <h2 class="pt-section-title">Imię</h2>
            </div>
            <ion-input aria-label="Imię pupila" v-model="settingsPetName" maxlength="40" placeholder="Wpisz imię…" class="pt-input" :clear-input="true" />
            <div class="pt-chips">
              <button
                v-for="sug in settingsSuggestedNames"
                :key="sug"
                type="button"
                class="pt-chip"
                :class="{ active: settingsPetName === sug }"
                @click="settingsPetName = sug"
              >
                {{ sug }}
              </button>
            </div>
          </section>

          <button
            type="button"
            class="dn-button-primary pt-full-btn is-flush"
            :disabled="isSavingPet || !settingsPetName.trim()"
            @click="handleSavePetSettings"
          >
            Zapisz
          </button>
          <div style="height: 32px;"></div>
        </ion-content>
      </ion-modal>

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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

const { pillRowRef, onTabsScroll } = useOrgTabsSync('tasks')

const completingTaskIds = ref<Set<string>>(new Set())

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
const tasksWord = (n: number) => {
  if (n === 1) return 'zadanie'
  const d = n % 10
  const dd = n % 100
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'zadania' : 'zadań'
}

const petSpeechText = computed(() => {
  if (customPetSpeech.value) return customPetSpeech.value
  const left = uncompletedTasksCount.value
  if (currentAnimation.value === 'sleep') {
    return left === 0
      ? 'Wszystko zrobione, więc ucinam sobie drzemkę.'
      : 'Drzemię. Obudźcie mnie zrobionym zadaniem.'
  }
  if (currentAnimation.value === 'jump') {
    return 'Jeszcze raz!'
  }
  if (currentAnimation.value === 'happy') {
    return 'Dobrze Was widzieć. Ogarniemy dziś dom?'
  }
  if (left > 0) {
    return `Zostało ${left} ${tasksWord(left)}. Razem pójdzie szybko.`
  }
  return 'Wszystko zrobione. Gniazdko lśni.'
})

// Pet Interactions
const handlePetClick = () => {
  triggerPetAnimation('jump', 1400)
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
  if (!(await toggleTask(task.id))) return
  triggerPetAnimation('jump', 2200)
  setCustomSpeech(`Zrobione. +${tasksList.value.find(t => t.id === task.id)?.points_awarded ?? task.points} XP dla mnie, dziękuję!`)
}

// Pet Creator State (when !hasPet)
const isSavingPet = ref(false)
const creatorSelectedPetId = ref<string>('Cat')
const creatorPetName = ref<string>('Kotek')
const creatorSelectedDef = computed(() => getPetDefinition(creatorSelectedPetId.value))

// Speech text inside the creator adoption showcase
const creatorSpeechText = computed(() => {
  const map: Record<string, string> = {
    Cat: 'Miau. Będę mruczeć przy każdym zrobionym zadaniu.',
    Dog: 'Hau! Pomogę we wszystkim, byle razem.',
    Bunny: 'Kic, kic. Posprzątamy w mgnieniu oka.',
    Fox: 'Plan na czysty dom? Zostawcie to mnie.',
    Panda: 'Bez pośpiechu, krok po kroku.',
    Bear: 'Żaden obowiązek mi niestraszny.',
    Chick: 'Ćwir. Każdy mały krok się liczy.',
    Dragon: 'Spalę wszystkie zaległości.',
    Frog: 'Kum, kum. Skaczemy do zadań.',
    Ghost: 'Bu. Bałagan zniknie jak duch.',
    Penguin: 'Elegancko i z klasą. Dom będzie lśnić.',
    Slime: 'Bul, bul. Wchłonę każdy bałagan.'
  }
  return map[creatorSelectedPetId.value] || 'Wybierzcie mnie, a zadbamy razem o Gniazdko.'
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
  if (!clean || isSavingPet.value) return
  isSavingPet.value = true
  try {
    await selectPet(creatorSelectedPetId.value, clean)
  } finally {
    isSavingPet.value = false
  }
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
  setTimeout(() => {
    settingsAnimation.value = 'happy'
  }, 900)
}

const handleSavePetSettings = async () => {
  const clean = settingsPetName.value.trim()
  if (!clean || isSavingPet.value) return
  isSavingPet.value = true
  try {
    if (await selectPet(settingsPetId.value, clean)) {
      showPetSettingsModal.value = false
    }
  } finally {
    isSavingPet.value = false
  }
}

const selectedSegment = ref('all')
const taskSegments = computed(() => [
  { value: 'all', label: 'Wszystkie' },
  { value: 'mine', label: 'Moje' },
  { value: 'partner', label: partnerUser.value?.name || 'Partnera' },
  { value: 'shared', label: 'Wspólne' }
])
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
  if (!(await toggleTask(task.id)) || !hasPet.value) return

  if (willBeCompleted) {
    const remainingActive = tasksList.value.filter(t => !t.is_completed).length
    if (remainingActive === 0) {
      // User completed the very last task! Pet jumps with joy, then sleeps!
      triggerPetAnimation('jump', 2200, () => {
        currentAnimation.value = 'sleep'
      })
    } else {
      triggerPetAnimation('happy', 1400)
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

    const saved = await addTask(
      cleanTitle,
      cleanDesc,
      newTaskAssignee.value,
      newTaskIsRecurring.value,
      recurrenceInterval,
      cleanPoints
    )
    if (!saved) return
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
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([10, 30, 10])
  }
  await deleteTask(id)
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
  color: #1c1b19;
  background: #f8f9fb;
  border: 1px dashed #d4d4d4;
  border-radius: 8px;
  padding: 6px 12px;
  margin: 6px 16px 10px 16px;
}

.header-action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.new-chore-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 10px;
  background: #1c1b19;
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
  box-shadow: none;
  transition: transform 0.15s ease, background 0.15s ease;
}

.new-chore-btn:active {
  transform: scale(0.96);
  background: #1c1b19;
}

/* TASKS LIST */
.tasks-section-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #737373;
  padding: 8px 20px 4px 20px;
}

.tasks-ion-list {
  background: transparent;
  margin: 4px 16px 16px 16px;
  border-radius: 18px;
  border: 1px solid #e5e6e8;
  overflow: hidden;
  box-shadow: none;
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
  color: #1c1b19;
  flex: 1;
  min-width: 0;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: break-word;
}

.task-title.strike {
  text-decoration: line-through;
  color: #a2a2a2;
}

.points-badge {
  font-size: 11px;
  font-weight: 500;
  background: var(--dn-soft);
  color: var(--dn-ink);
  border: none;
  padding: 2px 7px;
  border-radius: 999px;
  flex-shrink: 0;
  white-space: nowrap;
}

.points-badge.completed-badge {
  background: #f2f3f5;
  color: #737373;
  border-color: #e5e6e8;
}

.task-desc {
  font-size: 12.5px;
  color: #737373;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--dn-soft);
  color: var(--dn-ink-soft);
  font-size: 12px;
  font-weight: 500;
}

.tag-shared {
  background: #f2f3f5;
  color: #1c1b19;
}

.tag-mine {
  background: #f2f3f5;
  color: #1c1b19;
}

.tag-partner {
  background: #f8f9fb;
  color: #1c1b19;
}

.recurring-pill {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  color: #737373;
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

.sub-label {
  font-size: 11px;
  color: #737373;
  display: block;
}

.modal-input {
  --background: var(--dn-field);
  --padding-start: 14px;
  --border-radius: 14px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--dn-field-line);
  font-size: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-height: 52px;
}

.modal-input:focus-within {
  border-color: var(--dn-ink);
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
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
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 10px;
  padding: 10px 4px;
  font-size: 12px;
  font-weight: 600;
  color: #545454;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s ease;
}

.assignee-btn.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
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
  font-weight: 500;
  background: var(--dn-soft);
  border: none;
  color: #545454;
  cursor: pointer;
  white-space: nowrap;
}

.rec-pill.active {
  background: #1c1b19;
  color: #ffffff;
  border-color: #1c1b19;
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
  color: #545454;
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
  color: #c2412d;
}

.points-selector-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.pts-choice-btn {
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 10px;
  padding: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #8e8e8e;
  cursor: pointer;
}

.pts-choice-btn.active {
  background: #8e8e8e;
  color: #ffffff;
  border-color: #8e8e8e;
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
  background: #f8f9fb;
  color: #8e8e8e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.empty-state h3 {
  font-size: 17px;
  font-weight: 700;
  color: #1c1b19;
}

.empty-state p {
  font-size: 13px;
  color: #737373;
  margin-top: 4px;
}

/* ============================================= */
/* PET & COMPANION STYLES                        */
/* ============================================= */

/* PET HEADER CONTROLS */
.pet-header-lvl {
  background: #f3f4f6;
  color: #757575;
}

.pet-header-new {
  background: #f2f3f5;
  color: #1c1b19;
}

.pet-header-gear-btn {
  background: var(--dn-soft);
  color: #545454;
  border: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: none;
}

.pet-header-gear-btn:hover {
  background: #f2f3f5;
  color: #1c1b19;
}

.pet-header-gear-btn:active {
  transform: scale(0.92);
  background: #e5e6e8;
}

/* MAIN TABS SWITCHER (Zadania vs Zwierzak) */

/* TASKS VIEW: PET COMPANION STATUS BAR */
.tasks-pet-status-bar {
  margin: 10px 16px 14px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid var(--dn-line);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tasks-pet-status-bar:hover {
  border-color: #d4d4d4;
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
  font-weight: 700;
  color: #1c1b19;
}

.pet-status-sub {
  font-size: 11.5px;
  color: #737373;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  padding-bottom: 1px;
}

.pet-status-adopt-icon {
  font-size: 26px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dn-soft);
  border-radius: 50%;
}

.pet-open-pill {
  font-size: 11.5px;
  font-weight: 500;
  color: #1c1b19;
  background: var(--dn-soft);
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
  background: linear-gradient(155deg, #f8f9fb 0%, #ffffff 58%, #f8f9fb 100%);
  border: 1px solid #dfe0e2;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: none;
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
  border: 1px solid var(--dn-line);
  border-radius: 16px;
  width: min(100%, 310px);
  height: 88px;
  flex: 0 0 88px;
  padding: 10px 16px;
  text-align: center;
  margin-bottom: 16px;
  box-shadow: none;
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
  border-right: 1px solid #dbdbdb;
  border-bottom: 1px solid #dbdbdb;
}

.dialogue-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  font-size: 13px;
  font-weight: 700;
  color: #545454;
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
  border: 1px solid rgba(229, 230, 232, 0.8);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(243, 244, 246, 0.72));
  cursor: pointer;
  user-select: none;
}

.stage-ambient-light {
  position: absolute;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(159, 159, 159, 0.22) 0%, rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
}

.stage-pedestal {
  position: absolute;
  bottom: 6px;
  width: 130px;
  height: 24px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(136, 136, 136, 0.16) 0%, rgba(136, 136, 136, 0.02) 80%);
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
  border-top: 1px dashed rgba(159, 159, 159, 0.25);
}

.pet-title-box {
  display: flex;
  flex-direction: column;
}

.pet-display-name {
  font-size: 20px;
  font-weight: 700;
  color: #1c1b19;
  letter-spacing: 0;
  overflow-wrap: break-word;
  word-break: break-word;
}

.pet-species-pill {
  font-size: 11.5px;
  color: #757575;
  font-weight: 700;
  margin-top: 2px;
}

.pet-gear-action-btn {
  background: var(--dn-soft);
  color: #404040;
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pet-gear-action-btn ion-icon {
  font-size: 16px;
  color: #1c1b19;
}

.pet-gear-action-btn:hover {
  background: #f2f3f5;
  border-color: #d4d4d4;
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
  border: 1px solid var(--dn-line);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  user-select: none;
}

.stat-card-xp {
  border-color: #e7e8ea;
  border-left-width: 5px;
  border-left-color: #a3a3a3;
}

.stat-card-mood {
  border-color: #fcefec;
  border-left-width: 5px;
  border-left-color: #d96856;
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
  background: #f7f8fa;
  color: #838383;
  border: 1px solid #e1e2e4;
}

.badge-rose {
  background: #f2f3f5;
  color: #c2412d;
  border: 1px solid #fcefec;
}

.stat-title-wrap {
  display: flex;
  flex-direction: column;
}

.stat-title {
  font-size: 14px;
  font-weight: 700;
  color: #1c1b19;
  letter-spacing: -0.2px;
}

.stat-subtitle {
  font-size: 11.5px;
  color: #737373;
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
  font-weight: 700;
  text-wrap: nowrap;
}

.tag-green {
  background: #f2f3f5;
  color: #6f6f6f;
  border: 1px solid #e7e8ea;
}

.tag-rose {
  background: #e8e9eb;
  color: #c2412d;
  border: 1px solid #fcefec;
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
  font-weight: 700;
  color: #1c1b19;
  line-height: 1;
  letter-spacing: -0.5px;
}

.figure-unit {
  font-size: 13px;
  font-weight: 700;
  color: #737373;
}

.figure-status-text {
  font-size: 20px;
  font-weight: 700;
  color: #1c1b19;
  letter-spacing: -0.3px;
}

.stat-progress-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #545454;
}

.progress-pct-chip {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
}

.chip-green {
  background: #f7f8fa;
  color: #838383;
  border: 1px solid #e1e2e4;
}

/* Progress Track: Clean, Crisp, Flat, No Glow */
.stat-clean-track {
  width: 100%;
  height: 9px;
  border-radius: 999px;
  background: var(--dn-soft);
  overflow: hidden;
}

.stat-clean-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.fill-green {
  background: #a3a3a3;
}

.fill-rose {
  background: #d96856;
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
  color: #545454;
  font-weight: 600;
}

.meta-desc strong {
  color: #1c1b19;
  font-weight: 700;
}

.meta-action-hint {
  color: #737373;
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
  border: 1px solid var(--dn-line);
  box-shadow: none;
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
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #1c1b19;
  background: var(--dn-soft);
  padding: 2px 8px;
  border-radius: 999px;
}

.quests-xp-tag {
  font-size: 10px;
  font-weight: 500;
  color: var(--dn-ink);
  background: var(--dn-soft);
  padding: 2px 7px;
  border-radius: 999px;
}

.quests-heading {
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
  margin: 0;
  margin-top: 0.5rem;
  letter-spacing: -0.2px;
}

.quests-see-all-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 700;
  color: #1c1b19;
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
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 16px;
  padding: 11px 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.pet-quest-item:hover {
  background: #f8f9fb;
  border-color: #dadada;
  transform: translateX(2px);
}

.quest-checkbox-mock {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 2px solid #d4d4d4;
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
  border-color: #a3a3a3;
  background: #a3a3a3;
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
  font-weight: 700;
  color: #1c1b19;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  padding-bottom: 1.5px;
}

.quest-item-meta {
  font-size: 11px;
  color: #737373;
  font-weight: 600;
}

.quest-xp-chip {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dn-ink);
  background: var(--dn-soft);
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
  background: #f8f9fb;
  border-radius: 18px;
  gap: 8px;
}

.empty-quest-icon-wrap {
  font-size: 32px;
  color: #a3a3a3;
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
  font-weight: 700;
  color: #1c1b19;
}

.empty-quest-sub {
  font-size: 12px;
  color: #737373;
  max-width: 280px;
}

.add-chore-mini-btn {
  margin-top: 6px;
  background: #1c1b19;
  color: #ffffff;
  border: none;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.add-chore-mini-btn:hover {
  background: #1c1b19;
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
  border: 1px solid var(--dn-line);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: none;
  position: relative;
}

.creator-sparkle-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #1c1b19;
  background: var(--dn-soft);
  border: none;
  padding: 4px 14px;
  border-radius: 999px;
  margin-bottom: 10px;
}

.creator-sparkle-pill ion-icon {
  font-size: 13px;
}

.creator-title {
  font-size: 21px;
  font-weight: 700;
  color: #1c1b19;
  margin: 0 0 4px;
  letter-spacing: -0.3px;
}

.creator-subtitle {
  font-size: 13px;
  color: #737373;
  margin: 0 0 16px;
  max-width: 300px;
  line-height: 1.45;
}

.creator-speech-bubble {
  position: relative;
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 16px;
  padding: 10px 16px;
  max-width: 300px;
  text-align: center;
  margin-bottom: 14px;
  box-shadow: none;
  animation: float-bubble 3.2s ease-in-out infinite;
}

.creator-speech-bubble .dialogue-tail {
  border-right: 1px solid #e5e6e8;
  border-bottom: 1px solid #e5e6e8;
  background: #f8f9fb;
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
  background: radial-gradient(ellipse at center, rgba(28, 27, 25, 0.09) 0%, rgba(28, 27, 25, 0) 75%);
  pointer-events: none;
}

.creator-species-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  background: var(--dn-soft);
  border: none;
  padding: 5px 14px;
  border-radius: 999px;
}

.creator-species-name {
  font-size: 13px;
  font-weight: 700;
  color: #1c1b19;
}

.creator-species-dot {
  color: #a2a2a2;
  font-size: 12px;
}

.creator-species-theme {
  font-size: 11.5px;
  font-weight: 700;
  color: #737373;
}

/* Reusable Section Cards in Creator & Settings */
.creator-selection-card,
.creator-name-card,
.settings-group-card {
  padding: 18px 16px;
  background: #ffffff;
  border-radius: 22px;
  border: 1px solid var(--dn-line);
  box-shadow: none;
}

.section-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.section-badge-icon {
  font-size: 16px;
  color: #1c1b19;
}

.section-title-text {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #737373;
}

/* 3-COLUMN BEAUTIFUL MOBILE SPECIES TILES GRID */
.creator-tiles-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.creator-pet-tile {
  position: relative;
  background: #f8f9fb;
  border: 1.5px solid #e5e6e8;
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
  border-color: #d4d4d4;
  background: #ffffff;
}

.creator-pet-tile.is-selected {
  background: #f8f9fb;
  border-color: #1c1b19;
  box-shadow: none;
}

.creator-pet-tile.is-selected .tile-name {
  color: #1c1b19;
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
  font-weight: 700;
  color: #1c1b19;
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
  color: #1c1b19;
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
  --background: var(--dn-field);
  --color: #1c1b19;
  --placeholder-color: #a2a2a2;
  --padding-start: 16px;
  --padding-end: 16px;
  border: 1px solid var(--dn-field-line);
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  height: 50px;
  transition: all 0.15s ease;
}

.creator-pretty-input:focus-within {
  border-color: #1c1b19;
  --background: #ffffff;
}

.cute-names-shelf {
  margin-top: 10px;
}

.shelf-hint {
  font-size: 11.5px;
  font-weight: 700;
  color: #737373;
  margin-bottom: 8px;
  display: block;
}

.shelf-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cute-sug-pill {
  background: var(--dn-soft);
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 500;
  color: #404040;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cute-sug-pill:hover {
  background: #f2f3f5;
  border-color: #d4d4d4;
}

.cute-sug-pill.active {
  background: #1c1b19;
  border-color: #1c1b19;
  color: #ffffff;
  font-weight: 700;
  box-shadow: none;
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
  font-weight: 700;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #1c1b19;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: all 0.16s ease;
  box-shadow: none;
}

.creator-adopt-action-btn:hover:not(:disabled),
.save-pet-settings-btn:hover:not(:disabled) {
  background: #1c1b19;
  transform: translateY(-1px);
}

.creator-adopt-action-btn:active:not(:disabled),
.save-pet-settings-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.creator-adopt-action-btn:disabled,
.save-pet-settings-btn:disabled {
  background: #d4d4d4;
  color: #a2a2a2;
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
  --box-shadow: 0 -10px 40px rgba(28, 27, 25, 0.15);
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
  color: #1c1b19;
}

.dn-pet-settings-modal .modal-title-wrap ion-title {
  font-size: 17px;
  font-weight: 700;
  color: #1c1b19;
  padding: 0;
}

.dn-pet-settings-modal .modal-close-icon-btn {
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
  font-size: 26px;
  transition: all 0.15s ease;
  touch-action: manipulation;
  padding: 0;
}

.dn-pet-settings-modal .modal-close-icon-btn:hover {
  background: #e5e6e8;
  color: #1c1b19;
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
  border: 1px solid var(--dn-line);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: none;
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
  background: radial-gradient(ellipse at center, rgba(28, 27, 25, 0.09) 0%, rgba(28, 27, 25, 0) 75%);
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
  background: var(--dn-soft);
  border: none;
  padding: 5px 14px;
  border-radius: 999px;
}

.settings-stage-name {
  font-size: 13px;
  font-weight: 700;
  color: #1c1b19;
}

.settings-stage-dot {
  color: #a2a2a2;
  font-size: 12px;
}

.settings-stage-theme {
  font-size: 11.5px;
  font-weight: 700;
  color: #737373;
}

.settings-stage-desc {
  font-size: 12px;
  color: #737373;
  margin: 8px 0 0;
  line-height: 1.4;
  max-width: 280px;
}

/* ===== Beige accent: pet companion bar ===== */
.tasks-pet-status-bar {
  background: var(--dn-cream) !important;
  border: none !important;
  box-shadow: none !important;
}

.tasks-pet-status-bar .pet-status-adopt-icon {
  background: #ffffff !important;
}

.tasks-pet-status-bar .pet-open-pill {
  background: #ffffff !important;
  border: none !important;
  color: var(--dn-ink) !important;
}

.tasks-pet-status-bar .pet-status-sub {
  color: var(--dn-cream-ink) !important;
}

.empty-icon-circle {
  background: var(--dn-cream) !important;
  color: var(--dn-cream-ink) !important;
}

/* =========================================================
   PET – mini bar in tasks + pet tab + settings sheet (pt-*)
   ========================================================= */
.tasks-pet-status-bar { display: none !important; }

.pt-mini {
  width: calc(100% - 40px);
  margin: 8px 20px 4px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 10px;
  border: none;
  border-radius: 20px;
  background: var(--dn-cream);
  font-family: inherit;
  text-align: left;
  color: var(--dn-ink);
  cursor: pointer;
}

.pt-mini-sprite {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: #ffffff;
  color: var(--dn-cream-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 22px;
  flex-shrink: 0;
}

.pt-mini-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pt-mini-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pt-mini-sub {
  font-size: 12.5px;
  color: var(--dn-cream-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pt-mini--invite .pt-mini-sub {
  white-space: normal;
}

.pt-mini-bar {
  width: 44px;
  height: 6px;
  border-radius: 999px;
  background: var(--dn-cream-deep);
  overflow: hidden;
  flex-shrink: 0;
}

.pt-mini-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--dn-ink);
}

.pt-mini-arrow {
  font-size: 16px;
  color: var(--dn-cream-ink);
  flex-shrink: 0;
}

/* ---- Pet page ---- */
.pt-page {
  padding: 8px 20px 0;
}

.pt-stage {
  position: relative;
  padding: 20px 16px 16px;
  border-radius: 28px;
  background: var(--dn-cream);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pt-stage.is-compact {
  padding: 16px 16px 18px;
}

.pt-bubble {
  position: relative;
  max-width: 86%;
  padding: 12px 18px 13px;
  border-radius: 20px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
}

.pt-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: #ffffff;
  transform: translateX(-50%) rotate(45deg);
}

.pt-bubble-name {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dn-cream-ink);
}

.pt-bubble-text {
  position: relative;
  z-index: 1;
  font-family: var(--dn-serif);
  font-size: 17px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--dn-ink);
}

.pt-sprite {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 6px 0 2px;
  cursor: pointer;
}

.pt-stage.is-compact .pt-sprite {
  min-height: 120px;
}

.pt-stage-foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.pt-name {
  font-family: var(--dn-serif);
  font-size: 28px;
  font-weight: 600;
  line-height: 1.15;
  color: var(--dn-ink);
}

.pt-species {
  font-size: 13.5px;
  color: var(--dn-cream-ink);
}

.pt-desc {
  margin: 10px 0 0;
  max-width: 90%;
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--dn-cream-ink);
  text-align: center;
}

.pt-panel {
  width: 100%;
  margin-top: 16px;
  padding: 16px;
  border-radius: 20px;
  background: #ffffff;
}

.pt-panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pt-level {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--dn-ink);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
}

.pt-panel-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14.5px;
  font-weight: 600;
  color: var(--dn-ink);
}

.pt-panel-label ion-icon {
  color: var(--dn-danger);
  font-size: 15px;
}

.pt-panel-value {
  font-family: var(--dn-serif);
  font-size: 19px;
  font-weight: 600;
  color: var(--dn-ink);
}

.pt-bar {
  height: 8px;
  margin-top: 12px;
  border-radius: 999px;
  background: var(--dn-soft);
  overflow: hidden;
}

.pt-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--dn-ink);
  transition: width 0.4s ease;
}

.pt-bar.is-cream {
  background: var(--dn-cream);
}

.pt-bar.is-cream span {
  background: var(--dn-cream-ink);
}

.pt-panel-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--dn-muted);
}

.pt-panel-divider {
  height: 1px;
  margin: 16px 0;
  background: var(--dn-line);
}

.pt-section {
  margin-top: 28px;
}

.pt-section.is-flush {
  margin-top: 24px;
}

.pt-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.pt-section-title {
  margin: 0;
  font-family: var(--dn-serif);
  font-size: 22px;
  font-weight: 600;
  color: var(--dn-ink);
}

.pt-section-meta {
  font-size: 13px;
  color: var(--dn-muted);
}

.pt-link {
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--dn-muted);
  cursor: pointer;
}

.pt-hint {
  margin: -6px 0 8px;
  font-size: 13.5px;
  color: var(--dn-muted);
}

.pt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pt-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px 10px;
  border: none;
  border-radius: 18px;
  background: var(--dn-soft);
  box-shadow: inset 0 0 0 1.5px transparent;
  font-family: inherit;
  color: var(--dn-ink);
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}

.pt-tile.active {
  background: var(--dn-cream);
  box-shadow: inset 0 0 0 1.5px var(--dn-ink);
}

.pt-tile-sprite {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pt-tile-name {
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.pt-input {
  --background: var(--dn-field);
  --padding-start: 16px;
  --padding-end: 12px;
  --placeholder-color: var(--dn-faint);
  --placeholder-opacity: 1;
  --color: var(--dn-ink);
  min-height: 52px;
  border: 1px solid var(--dn-field-line);
  border-radius: 16px;
  font-size: 15.5px;
}

.pt-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.pt-chip {
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: var(--dn-soft);
  color: var(--dn-ink);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
}

.pt-chip.active {
  background: var(--dn-ink);
  color: #ffffff;
}

.pt-full-btn {
  width: 100%;
  margin-top: 28px;
}

.pt-full-btn.is-flush {
  margin-top: 24px;
}

.pt-full-btn:disabled {
  opacity: 0.4;
}

.pt-quests {
  display: flex;
  flex-direction: column;
}

.pt-quest {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--dn-line);
}

.pt-quest:last-child {
  border-bottom: none;
}

.pt-check {
  width: 26px;
  height: 26px;
  border: 1.5px solid #c9ccd2;
  border-radius: 50%;
  background: transparent;
  color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  cursor: pointer;
}

.pt-check:active {
  background: var(--dn-ink);
  border-color: var(--dn-ink);
  color: #ffffff;
}

.pt-quest-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pt-quest-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--dn-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pt-quest-meta {
  font-size: 12.5px;
  color: var(--dn-muted);
}

.pt-xp {
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.pt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 16px;
  text-align: center;
}

.pt-empty-icon {
  width: 56px;
  height: 56px;
  margin-bottom: 8px;
  border-radius: 18px;
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.pt-empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dn-ink);
}

.pt-empty-sub {
  font-size: 13.5px;
  color: var(--dn-muted);
}

.pt-soft-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  margin-top: 12px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: var(--dn-soft);
  color: var(--dn-ink);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
</style>
