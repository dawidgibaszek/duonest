<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="header-content">
          <div class="brand-badge">
            <img src="/favicon.png" alt="DuoNest" class="brand-logo" />
            <div>
              <span class="brand-name">DuoNest</span>
              <span class="brand-sub">Wspólna przestrzeń</span>
            </div>
          </div>
          <div class="header-actions-group">
            <div class="couple-indicator-badge" @click="navigateTo('/tabs/relationship')">
              <span class="online-indicator-dot" :class="{ 'is-live': isPartnerOnline }"></span>
              <span class="partner-name-tag">{{ partnerUser?.name || 'Partner' }}</span>
              <span class="online-tag-pill" v-if="isPartnerOnline">online</span>
            </div>
            <button
              class="quick-gear-btn"
              @click="navigateTo('/tabs/relationship?category=nest_settings')"
              title="Ustawienia Gniazdka"
            >
              <ion-icon :icon="ioniconsSettingsOutline" />
            </button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- COUPLE HERO BANNER & DAYS TOGETHER -->
      <div class="dn-card hero-card">
        <div class="hero-top">
          <div class="avatar-duo" @click="navigateTo('/tabs/relationship')" title="Kliknij, aby przejść do profilu">
            <div class="avatar-ring avatar-mine" :style="{ backgroundColor: currentUserAccentColor }">
              <span class="avatar-letter">{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
            </div>
            <div class="avatar-heart">
              <ion-icon :icon="ioniconsHeart" />
            </div>
            <div class="avatar-ring avatar-theirs" :style="{ backgroundColor: partnerUserAccentColor }">
              <span class="avatar-letter">{{ partnerUser ? (partnerUser.name || 'P').charAt(0).toUpperCase() : '?' }}</span>
            </div>
          </div>

          <div class="anniversary-stats">
            <div class="days-num">{{ daysTogether }}</div>
            <div class="days-label">DNI RAZEM</div>
          </div>
        </div>

        <div class="hero-nest-title">
          <h2>{{ partnership?.nest_name || 'Nasze Ciepłe Gniazdko' }}</h2>
          <span class="nest-level-tag">Poziom {{ nestLevel }} • {{ currentStageName }}</span>
        </div>

        <!-- PROGRESS BAR -->
        <div class="nest-progress-bar-container">
          <div class="nest-progress-bar" :style="{ width: levelProgress + '%' }"></div>
        </div>
        <div class="progress-info">
          <span>{{ nestPoints }} pkt doświadczenia</span>
          <span>Do kolejnego poziomu: {{ pointsToNextLevel }} pkt</span>
        </div>
      </div>

      <!-- VISUAL NEST GAMIFICATION ILLUSTRATION -->
      <div class="dn-card nest-stage-card">
        <div class="nest-visual-stage" :class="'stage-' + Math.min(nestLevel, 5)">
          <div class="nest-illustration-wrapper">
            <img src="/icon.png" alt="Wasze Gniazdko" class="nest-main-img" />
            <div class="floating-badge badge-1">
              <ion-icon :icon="ioniconsHeart" class="accent-heart" />
            </div>
            <div class="floating-badge badge-2">
              <ion-icon :icon="ioniconsSparkles" class="accent-sparkle" />
            </div>
            <div class="floating-badge badge-3">
              <ion-icon :icon="ioniconsLeafOutline" class="accent-leaf" />
            </div>
          </div>
        </div>

        <div class="stage-description">
          <h3>{{ currentStageName }}</h3>
          <p>{{ currentStageDescription }}</p>
          <div class="stage-footer">
            <button class="celebrate-btn" @click="celebrateWithConfetti">
              <ion-icon :icon="ioniconsSparklesOutline" />
              <span>Oklaski dla Gniazdka!</span>
            </button>
          </div>
        </div>
      </div>

      <!-- DUO POINTS BREAKDOWN & SHARED / PER-PERSON MILESTONES -->
      <div class="dn-card points-milestones-card">
        <div class="card-header-row">
          <div class="header-left">
            <span class="section-badge points-badge">PUNKTY & CELE</span>
            <h4>Wkład w Gniazdko & Nagrody</h4>
          </div>
          <button class="add-goal-btn" @click="openCreateMilestoneModal" title="Dodaj nowy cel">
            <ion-icon :icon="ioniconsAddOutline" />
            <span>Nowy cel</span>
          </button>
        </div>

        <!-- 1. PODZIAŁ PUNKTÓW PER OSOBA -->
        <div class="duo-points-box">
          <div class="duo-points-header">
            <!-- USER 1 (TY) -->
            <div class="user-score-col score-mine">
              <div class="score-avatar-ring" :style="{ backgroundColor: currentUserAccentColor }">
                <span>{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="score-user-meta">
                <span class="score-user-name">{{ currentUser.name || 'Ty' }}</span>
                <span class="score-user-pts" :style="{ color: currentUserAccentColor }">{{ userPoints }} pkt</span>
                <span class="score-user-tasks">{{ userCompletedTasksCount }} zrobionych zadań</span>
              </div>
            </div>

            <!-- VS / DUET BADGE -->
            <div class="score-vs-badge">
              <span class="vs-label">DUET</span>
              <span class="score-total-val">{{ nestPoints }}</span>
              <span class="score-total-sub">pkt razem</span>
            </div>

            <!-- USER 2 (PARTNER) -->
            <div class="user-score-col score-theirs">
              <div class="score-avatar-ring" :style="{ backgroundColor: partnerUserAccentColor }">
                <span>{{ partnerUser ? (partnerUser.name || 'P').charAt(0).toUpperCase() : '?' }}</span>
              </div>
              <div class="score-user-meta score-meta-right">
                <span class="score-user-name">{{ partnerUser?.name || 'Partner' }}</span>
                <span class="score-user-pts" :style="{ color: partnerUserAccentColor }">{{ partnerPoints }} pkt</span>
                <span class="score-user-tasks">{{ partnerCompletedTasksCount }} zrobionych zadań</span>
              </div>
            </div>
          </div>

          <!-- VISUAL TWO-COLOR RATIO BAR -->
          <div class="duo-split-bar-track">
            <div
              class="duo-split-segment left-segment"
              :style="{
                width: userPointsPct + '%',
                backgroundColor: currentUserAccentColor
              }"
            >
              <span class="split-pct-label" v-if="userPointsPct >= 16">{{ userPointsPct }}%</span>
            </div>
            <div
              class="duo-split-segment right-segment"
              :style="{
                width: partnerPointsPct + '%',
                backgroundColor: partnerUserAccentColor
              }"
            >
              <span class="split-pct-label" v-if="partnerPointsPct >= 16">{{ partnerPointsPct }}%</span>
            </div>
          </div>

          <!-- HARMONY INSIGHT COMMENT -->
          <div class="duo-harmony-hint">
            <ion-icon :icon="ioniconsSparkles" class="harmony-icon" />
            <span>{{ duoHarmonyMessage }}</span>
          </div>
        </div>

        <!-- 2. KAMIENIE MILOWE (WSPÓLNE & INDYWIDUALNE) -->
        <div class="milestones-section-header">
          <div class="milestones-title-group">
            <span class="milestones-section-title">Kamienie milowe & nagrody</span>
            <span class="milestones-count-pill">{{ completedMilestonesCount }} / {{ milestonesList.length }} zrealizowanych</span>
          </div>
          <span class="milestones-hint-text">Wyznaczajcie cele wspólne lub nagrody dla każdego z Was!</span>
        </div>

        <!-- SCOPE FILTER CHIPS -->
        <div class="milestones-filter-scroll">
          <button
            type="button"
            class="filter-chip"
            :class="{ active: activeMilestoneFilter === 'all' }"
            @click="activeMilestoneFilter = 'all'"
          >
            <span>Wszystkie</span>
            <span class="chip-count">{{ milestonesList.length }}</span>
          </button>
          <button
            type="button"
            class="filter-chip"
            :class="{ active: activeMilestoneFilter === 'shared' }"
            @click="activeMilestoneFilter = 'shared'"
          >
            <span>Wspólne</span>
            <span class="chip-count">{{ sharedCount }}</span>
          </button>
          <button
            type="button"
            class="filter-chip"
            :class="{ active: activeMilestoneFilter === 'mine' }"
            @click="activeMilestoneFilter = 'mine'"
          >
            <span>Dla Ciebie</span>
            <span class="chip-count">{{ mineCount }}</span>
          </button>
          <button
            type="button"
            class="filter-chip"
            :class="{ active: activeMilestoneFilter === 'theirs' }"
            @click="activeMilestoneFilter = 'theirs'"
            v-if="partnerUser"
          >
            <span>Dla {{ partnerUser.name || 'Partnera' }}</span>
            <span class="chip-count">{{ theirsCount }}</span>
          </button>
        </div>

        <!-- MILESTONES CARDS (CLEAN & MINIMALIST - NO EMOJIS) -->
        <div class="milestones-grid" v-if="filteredMilestones.length > 0">
          <div
            v-for="goal in filteredMilestones"
            :key="goal.id"
            class="milestone-card-item"
            :class="{
              'is-ready': isGoalReady(goal),
              'is-claimed': goal.is_completed
            }"
          >
            <!-- TOP BADGES & ACTIONS -->
            <div class="milestone-header-row">
              <span
                class="goal-scope-pill"
                :style="{
                  color: getGoalScopeInfo(goal).color,
                  backgroundColor: getGoalScopeInfo(goal).bg,
                  borderColor: getGoalScopeInfo(goal).border
                }"
              >
                {{ getGoalScopeInfo(goal).label }}
              </span>

              <div class="milestone-top-right">
                <span class="goal-pts-tag">{{ goal.target_points }} pkt</span>
                <button class="goal-edit-btn" @click.stop="openEditMilestoneModal(goal)" title="Edytuj cel">
                  <ion-icon :icon="ioniconsCreateOutline" />
                </button>
              </div>
            </div>

            <!-- TITLE & DESCRIPTION -->
            <div class="milestone-text-block">
              <h5 class="milestone-title">{{ goal.title }}</h5>
              <p class="milestone-desc" v-if="goal.description">{{ goal.description }}</p>
            </div>

            <!-- PROGRESS & STATUS -->
            <div class="milestone-progress-wrap">
              <div class="milestone-progress-bar-bg">
                <div
                  class="milestone-progress-bar-fill"
                  :class="{ 'fill-ready': isGoalReady(goal), 'fill-claimed': goal.is_completed }"
                  :style="{
                    width: getGoalProgressPct(goal) + '%',
                    backgroundColor: isGoalReady(goal) ? undefined : getGoalScopeInfo(goal).color
                  }"
                ></div>
              </div>
              <div class="milestone-progress-labels">
                <span class="milestone-current-pts">
                  {{ goal.is_completed ? 'Zrealizowany cel ✨' : `${Math.min(getGoalCurrentPoints(goal), goal.target_points)} / ${goal.target_points} pkt` }}
                </span>
                <span class="milestone-pct-badge" v-if="!goal.is_completed">
                  {{ isGoalReady(goal) ? 'Gotowe do odebrania! 🎉' : `${getGoalProgressPct(goal)}%` }}
                </span>
                <span class="milestone-claimed-badge" v-else>
                  <ion-icon :icon="ioniconsCheckmarkCircle" />
                  Odebrano
                </span>
              </div>
            </div>

            <!-- CLAIM REWARD ACTION (WHEN READY) -->
            <div class="milestone-claim-action" v-if="isGoalReady(goal)">
              <button class="claim-reward-btn" @click="handleClaimMilestone(goal)">
                <ion-icon :icon="ioniconsGiftOutline" />
                <span>Świętujcie & Odbierzcie nagrodę! 🎁</span>
              </button>
            </div>

            <!-- REACTIVATE OPTION (WHEN CLAIMED) -->
            <div class="milestone-claimed-action" v-if="goal.is_completed">
              <span class="claimed-note">Nagroda zrealizowana! ❤️</span>
              <button class="reactivate-goal-link" @click="handleReactivateMilestone(goal)">
                Ustaw ten cel ponownie
              </button>
            </div>
          </div>
        </div>

        <!-- EMPTY STATE -->
        <div class="empty-milestones-box" v-else>
          <ion-icon :icon="ioniconsSparklesOutline" class="empty-sparkle-icon" />
          <h6>Brak celów w tej kategorii</h6>
          <p>Dodajcie wspólny cel lub wyznaczcie nagrodę za punkty dla siebie nawzajem.</p>
          <button class="add-first-goal-btn dn-button-sea" @click="openCreateMilestoneModal">
            <ion-icon :icon="ioniconsAddOutline" />
            <span>Dodaj cel</span>
          </button>
        </div>
      </div>

      <!-- PARTNER'S MOOD WIDGET (USING SVG ICONS) -->
      <div class="dn-card mood-widget-card" v-if="partnerUser">
        <div class="card-header-row">
          <div class="header-left">
            <span class="section-badge">NASTRÓJ PARTNERA</span>
            <h4>Jak się czuje {{ partnerUser.name }}?</h4>
          </div>
          <span class="mood-time">{{ formattedMoodTime }}</span>
        </div>

        <div class="partner-mood-body">
          <div class="mood-icon-bubble">
            <DuoIcon :name="'mood-' + (partnerUser.current_mood || 'happy')" :size="26" />
          </div>
          <div class="mood-details">
            <span class="mood-label-pill">{{ getMoodLabel(partnerUser.current_mood) }}</span>
            <p class="mood-note-quote" v-if="partnerUser.mood_note">
              "{{ partnerUser.mood_note }}"
            </p>
            <p class="mood-note-empty" v-else>
              Brak dodatkowej notatki na dziś.
            </p>
          </div>
        </div>
      </div>

      <!-- DAILY NUDGE / QUICK AFFECTION BAR (USING SVG ICONS) -->
      <div class="dn-card nudge-card">
        <div class="card-header-row">
          <div class="header-left">
            <span class="section-badge love-badge">DROBNE GESTY</span>
            <h4>Codzienne puknięcie (Nudge)</h4>
          </div>
          <span class="nudge-points-tag" :class="{ 'points-done': hasSentDailyNudge }">
            {{ hasSentDailyNudge ? 'Wysłano dzisiaj' : '+5 pkt' }}
          </span>
        </div>

        <!-- STATE A: ALREADY SENT TODAY -->
        <div v-if="hasSentDailyNudge" class="nudge-already-sent-box">
          <div class="sent-status-icon-row">
            <div class="sent-sparkle-badge">
              <ion-icon :icon="ioniconsCheckmarkCircle" />
            </div>
            <div class="sent-status-texts">
              <span class="sent-title">Wysłano dzisiejsze puknięcie! 💕</span>
              <span class="sent-subtitle">{{ partnerUser?.name || 'Partner' }} otrzymał Twój ciepły gest.</span>
            </div>
          </div>

          <div class="nudge-timer-pill">
            <ion-icon :icon="ioniconsTimeOutline" class="timer-clock-icon" />
            <span>Kolejne możesz wysłać za: <strong>{{ formattedNextNudgeTime }}</strong></span>
          </div>
        </div>

        <!-- STATE B: AVAILABLE TO SEND -->
        <div v-else>
          <p class="nudge-sub">Wyślij szybką reakcję, by wywołać uśmiech u {{ partnerUser?.name || 'partnera' }}:</p>

          <div class="nudge-actions-grid">
            <button class="nudge-btn" @click="sendQuickNudge('hug', 'Ciepły uścisk!')">
              <div class="nudge-icon-circle">
                <DuoIcon name="nudge-hug" :size="20" />
              </div>
              <span class="nudge-text">Uścisk</span>
            </button>
            <button class="nudge-btn" @click="sendQuickNudge('kiss', 'Słodki buziak!')">
              <div class="nudge-icon-circle">
                <DuoIcon name="nudge-kiss" :size="20" />
              </div>
              <span class="nudge-text">Buziak</span>
            </button>
            <button class="nudge-btn" @click="sendQuickNudge('tea', 'Ciepła herbatka!')">
              <div class="nudge-icon-circle">
                <DuoIcon name="nudge-tea" :size="20" />
              </div>
              <span class="nudge-text">Herbatka</span>
            </button>
            <button class="nudge-btn" @click="sendQuickNudge('love', 'Bardzo Cię kocham!')">
              <div class="nudge-icon-circle">
                <DuoIcon name="nudge-love" :size="20" />
              </div>
              <span class="nudge-text">Kocham Cię</span>
            </button>
          </div>
        </div>
      </div>

      <!-- TODAY'S PENDING CHORES SUMMARY -->
      <div class="dn-card tasks-summary-card">
        <div class="card-header-row">
          <div class="header-left">
            <span class="section-badge">OBOWIĄZKI DOMOWE</span>
            <h4>Do zrobienia dzisiaj</h4>
          </div>
          <NuxtLink to="/tabs/tasks" class="view-all-link">Zobacz wszystkie →</NuxtLink>
        </div>

        <div class="mini-tasks-list" v-if="pendingChores.length > 0">
          <div
            v-for="task in pendingChores.slice(0, 3)"
            :key="task.id"
            class="mini-task-item"
            :style="{ borderLeft: `3.5px solid ${getUserAccentColor(task.assigned_to)}` }"
            @click="toggleTask(task.id)"
          >
            <div
              class="checkbox-circle"
              :class="{ checked: task.is_completed }"
              :style="task.is_completed ? {
                backgroundColor: getUserAccentColor(task.assigned_to),
                borderColor: getUserAccentColor(task.assigned_to)
              } : {}"
            >
              <ion-icon v-if="task.is_completed" :icon="ioniconsCheckmarkOutline" />
            </div>
            <div class="mini-task-details">
              <span class="mini-task-title">{{ task.title }}</span>
              <span
                class="mini-task-assignee"
                :style="{ color: getUserAccentColor(task.assigned_to), fontWeight: '700' }"
              >
                {{ task.assigned_to ? (task.assigned_to === currentUser.id ? 'Dla Ciebie' : ('Dla ' + (partnerUser?.name || 'partnera'))) : 'Wspólne' }}
              </span>
            </div>
            <span class="mini-task-pts">+{{ task.points }} pkt</span>
          </div>
        </div>
        <div v-else class="empty-mini-card">
          <ion-icon :icon="ioniconsCheckmarkCircleOutline" class="check-icon" />
          <span>Wszystkie dzisiejsze zadania zrobione! Czas na relaks.</span>
        </div>
      </div>

      <!-- UPCOMING CALENDAR HIGHLIGHT -->
      <div class="dn-card event-summary-card" v-if="upcomingEvent">
        <div class="card-header-row">
          <div class="header-left">
            <span class="section-badge calendar-badge">NAJBLIŻSZE PLANY</span>
            <h4>{{ upcomingEvent.title }}</h4>
          </div>
          <NuxtLink to="/tabs/calendar" class="view-all-link">Kalendarz →</NuxtLink>
        </div>
        <p class="event-desc">{{ upcomingEvent.description || 'Wspólne plany w Waszym terminarzu.' }}</p>
        <div class="event-date-pill">
          <ion-icon :icon="ioniconsTimeOutline" />
          <span>{{ formatEventDate(upcomingEvent.start_time) }}</span>
        </div>
      </div>

      <!-- MODAL: ADD / EDIT MILESTONE GOAL (NO EMOJI - CLEAN SCOPE SELECTOR) -->
      <ion-modal :is-open="isMilestoneModalOpen" @didDismiss="closeMilestoneModal" class="dn-custom-modal">
        <div class="modal-wrapper-inner">
          <div class="modal-header-bar">
            <h3>{{ editingMilestoneId ? 'Edytuj cel & nagrodę' : 'Nowy cel & nagroda' }}</h3>
            <button class="modal-close-icon-btn" @click="closeMilestoneModal">
              <ion-icon :icon="ioniconsCloseOutline" />
            </button>
          </div>

          <div class="modal-form-body">
            <!-- 1. DLA KOGO JEST TEN CEL? (WSPÓLNY / TY / PARTNER) -->
            <div class="form-group">
              <label class="form-label">Dla kogo jest ten cel / nagroda? *</label>
              <div class="scope-choice-grid">
                <button
                  type="button"
                  class="scope-choice-btn"
                  :class="{ active: milestoneForm.assigned_to === null }"
                  @click="milestoneForm.assigned_to = null"
                >
                  <ion-icon :icon="ioniconsPeopleOutline" class="scope-btn-icon" />
                  <div class="scope-btn-texts">
                    <span class="scope-btn-title">Wspólny cel</span>
                    <span class="scope-btn-sub">Dla Was obojga (punkty Gniazdka)</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="scope-choice-btn"
                  :class="{ active: milestoneForm.assigned_to === currentUser.id }"
                  @click="milestoneForm.assigned_to = currentUser.id"
                >
                  <ion-icon :icon="ioniconsPersonOutline" class="scope-btn-icon" />
                  <div class="scope-btn-texts">
                    <span class="scope-btn-title">Dla Ciebie</span>
                    <span class="scope-btn-sub">Za Twoje zadania i gesty</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="scope-choice-btn"
                  :class="{ active: milestoneForm.assigned_to === partnerUser?.id }"
                  @click="milestoneForm.assigned_to = partnerUser?.id || 'partner'"
                  v-if="partnerUser"
                >
                  <ion-icon :icon="ioniconsHeartOutline" class="scope-btn-icon" />
                  <div class="scope-btn-texts">
                    <span class="scope-btn-title">Dla {{ partnerUser.name }}</span>
                    <span class="scope-btn-sub">Nagroda za punkty partnera</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- 2. QUICK TEXT SUGGESTIONS -->
            <div class="form-group">
              <label class="form-label">Szybkie propozycje nagród dla par</label>
              <div class="presets-scroll-row">
                <button
                  type="button"
                  v-for="sugg in textRewardSuggestions"
                  :key="sugg.title"
                  class="text-preset-chip"
                  :class="{ active: milestoneForm.title === sugg.title }"
                  @click="applyTextSuggestion(sugg)"
                >
                  <span class="preset-name">{{ sugg.title }}</span>
                  <span class="preset-pts">{{ sugg.pts }} pkt</span>
                </button>
              </div>
            </div>

            <!-- 3. TITLE (CLEAN INPUT - NO EMOJI) -->
            <div class="form-group">
              <label class="form-label">Nazwa nagrody / celu *</label>
              <ion-input
                v-model="milestoneForm.title"
                placeholder="np. Wspólny seans filmowy z pizzą, Masaż pleców..."
                class="modal-styled-input"
                :clear-input="true"
              />
            </div>

            <!-- 4. TARGET POINTS -->
            <div class="form-group">
              <div class="label-with-pts-val">
                <label class="form-label">Wymagane punkty *</label>
                <span class="pts-target-badge">{{ milestoneForm.target_points || 0 }} pkt</span>
              </div>

              <!-- Custom points input -->
              <div class="custom-pts-input-wrap">
                <ion-input
                  :value="milestoneForm.target_points"
                  @ionInput="handleMilestonePtsInput"
                  @keydown="filterDigitsKeydown"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="5"
                  placeholder="Wpisz liczbę punktów..."
                  class="modal-styled-input custom-pts-input"
                />
                <span class="pts-suffix-label">pkt</span>
              </div>

              <!-- Quick selection presets -->
              <div class="quick-pts-label">Szybki wybór:</div>
              <div class="quick-pts-row">
                <button
                  type="button"
                  v-for="pts in quickPointOptions"
                  :key="pts"
                  class="pts-option-pill"
                  :class="{ active: Number(milestoneForm.target_points) === pts }"
                  @click="milestoneForm.target_points = pts"
                >
                  {{ pts }} pkt
                </button>
              </div>
            </div>

            <!-- 5. DESCRIPTION -->
            <div class="form-group">
              <label class="form-label">Dodatkowe ustalenia / opis (opcjonalnie)</label>
              <ion-textarea
                v-model="milestoneForm.description"
                placeholder="np. Kto przegrał w sprzątaniu robi kolację i deser..."
                class="modal-styled-input modal-textarea-styled"
                :rows="2"
              />
            </div>

            <!-- ACTION BUTTONS -->
            <div class="modal-actions-footer">
              <button
                v-if="editingMilestoneId"
                type="button"
                class="delete-milestone-btn"
                @click="removeCurrentMilestone"
              >
                <ion-icon :icon="ioniconsTrashOutline" />
                <span>Usuń cel</span>
              </button>
              <button
                type="button"
                class="save-milestone-btn dn-button-sea"
                @click="saveMilestone"
                :disabled="!milestoneForm.title.trim() || !milestoneForm.target_points || Number(milestoneForm.target_points) <= 0"
              >
                <ion-icon :icon="ioniconsCheckmarkDoneOutline" />
                <span>{{ editingMilestoneId ? 'Zapisz zmiany' : 'Utwórz cel' }}</span>
              </button>
            </div>
          </div>
        </div>
      </ion-modal>

      <div style="height: 30px;"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState } from '~/composables/useDuoState'
import { usePushNotifications } from '~/composables/usePushNotifications'
import DuoIcon from '~/components/DuoIcon.vue'

const {
  currentUser,
  partnerUser,
  partnership,
  nestLevel,
  nestPoints,
  pointsToNextLevel,
  levelProgress,
  daysTogether,
  tasksList,
  eventsList,
  isPartnerOnline,
  sendNudge,
  hasSentDailyNudge,
  formattedNextNudgeTime,
  toggleTask,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor,
  hexToRgba,
  userPoints,
  partnerPoints,
  userPointsPct,
  partnerPointsPct,
  userCompletedTasksCount,
  partnerCompletedTasksCount,
  milestonesList,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  claimMilestone,
  reactivateMilestone
} = useDuoState()

const { askPermissionAfterPairing } = usePushNotifications()

onMounted(() => {
  if (partnership.value) {
    askPermissionAfterPairing(partnerUser.value?.name || 'Partner')
  }
})

const stageNames: Record<number, { name: string; desc: string }> = {
  1: { name: 'Przytulne Gałązki', desc: 'Fundament Waszego wspólnego domu. Każde drobne zadanie splata nowe gałązki.' },
  2: { name: 'Ciepły Puch i Mech', desc: 'Gniazdko staje się wyjątkowo miękkie i przytulne. Znakomicie współpracujecie!' },
  3: { name: 'Wygodny Szałas Marzeń', desc: 'Solidna kryjówka pełna miłości, harmonii i wspólnych rytuałów.' },
  4: { name: 'Mistrzowskie Gniazdo', desc: 'Prawdziwe arcydzieło domowego ładu i partnerstwa. Jesteście zgranym duetem!' },
  5: { name: 'Magiczny Zamek Miłości', desc: 'Najwyższy stopień zaufania i wspólnego szczęścia. Legendarne gniazdo!' }
}

const currentStageName = computed(() => {
  const lvl = Math.min(Math.max(nestLevel.value, 1), 5)
  return stageNames[lvl]?.name || 'Przytulne Gniazdko'
})

const currentStageDescription = computed(() => {
  const lvl = Math.min(Math.max(nestLevel.value, 1), 5)
  return stageNames[lvl]?.desc || ''
})

const pendingChores = computed(() => {
  return tasksList.value.filter(t => !t.is_completed)
})

const upcomingEvent = computed(() => {
  return eventsList.value[0] || null
})

const formattedMoodTime = computed(() => {
  if (!partnerUser.value?.mood_updated_at) return 'Dzisiaj'
  const date = new Date(partnerUser.value.mood_updated_at)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const getMoodLabel = (mood?: string | null) => {
  switch (mood) {
    case 'happy': return 'Radosny / Spokojny'
    case 'loved': return 'Zakochany / Doceniony'
    case 'romantic': return 'Romantyczny nastrój'
    case 'cozy': return 'Przytulnie / Chill'
    case 'tired': return 'Zmęczony po całym dniu'
    case 'stressed': return 'Potrzebuje wsparcia'
    case 'excited': return 'Pełen energii i ekscytacji'
    default: return 'Dobry nastrój'
  }
}

const formatEventDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return dateStr
  }
}

const celebrateWithConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#0284c7', '#0ea5e9', '#0d9488', '#38bdf8', '#f43f5e']
  })
}

const sendQuickNudge = async (type: string, msg: string) => {
  const sent = await sendNudge(type, msg)
  if (sent) {
    celebrateWithConfetti()
  }
}

// --- DUO POINTS & MILESTONES STATE ---
const duoHarmonyMessage = computed(() => {
  const diff = Math.abs(userPointsPct.value - partnerPointsPct.value)
  if (nestPoints.value === 0) {
    return 'Czas zacząć zbierać punkty! Ukończcie pierwsze wspólne zadanie.'
  }
  if (diff <= 15) {
    return 'Idealny balans w związku! Dzielicie się obowiązkami ramię w ramię.'
  }
  if (userPointsPct.value > partnerPointsPct.value) {
    return `Prowadzisz z wynikiem ${userPoints.value} pkt! ${partnerUser.value?.name || 'Partner'} na pewno to docenia.`
  }
  return `${partnerUser.value?.name || 'Partner'} ma dziś małą przewagę (${partnerPoints.value} pkt)! Czas wyrównać szanse.`
})

const completedMilestonesCount = computed(() => {
  return milestonesList.value.filter(m => m.is_completed).length
})

// Scope filtering for Milestones
const activeMilestoneFilter = ref<'all' | 'shared' | 'mine' | 'theirs'>('all')

const sharedCount = computed(() => {
  return milestonesList.value.filter(m => !m.assigned_to).length
})

const mineCount = computed(() => {
  return milestonesList.value.filter(m => m.assigned_to === currentUser.value.id).length
})

const theirsCount = computed(() => {
  if (!partnerUser.value) return 0
  return milestonesList.value.filter(m => m.assigned_to === partnerUser.value?.id).length
})

const filteredMilestones = computed(() => {
  if (activeMilestoneFilter.value === 'shared') {
    return milestonesList.value.filter(m => !m.assigned_to)
  }
  if (activeMilestoneFilter.value === 'mine') {
    return milestonesList.value.filter(m => m.assigned_to === currentUser.value.id)
  }
  if (activeMilestoneFilter.value === 'theirs') {
    return milestonesList.value.filter(m => partnerUser.value && m.assigned_to === partnerUser.value.id)
  }
  return milestonesList.value
})

const getGoalScopeInfo = (goal: any) => {
  if (!goal.assigned_to) {
    return {
      label: 'Wspólny cel',
      color: '#0284c7',
      bg: 'rgba(2, 132, 199, 0.1)',
      border: 'rgba(2, 132, 199, 0.25)'
    }
  }
  if (goal.assigned_to === currentUser.value.id) {
    const color = currentUserAccentColor.value || '#0284c7'
    return {
      label: 'Dla Ciebie',
      color: color,
      bg: hexToRgba(color, 0.12),
      border: hexToRgba(color, 0.3)
    }
  }
  const color = partnerUserAccentColor.value || '#0d9488'
  return {
    label: `Dla ${partnerUser.value?.name || 'Partnera'}`,
    color: color,
    bg: hexToRgba(color, 0.12),
    border: hexToRgba(color, 0.3)
  }
}

const getGoalCurrentPoints = (goal: any): number => {
  if (!goal.assigned_to) {
    return nestPoints.value
  }
  if (goal.assigned_to === currentUser.value.id) {
    return userPoints.value
  }
  if (partnerUser.value && goal.assigned_to === partnerUser.value.id) {
    return partnerPoints.value
  }
  return userPoints.value
}

const isGoalReady = (goal: any): boolean => {
  if (goal.is_completed) return false
  const current = getGoalCurrentPoints(goal)
  return current >= (goal.target_points || 0)
}

const getGoalProgressPct = (goal: any): number => {
  if (goal.is_completed) return 100
  if (!goal.target_points || goal.target_points <= 0) return 100
  const current = getGoalCurrentPoints(goal)
  return Math.min(100, Math.round((current / goal.target_points) * 100))
}

const isMilestoneModalOpen = ref(false)
const editingMilestoneId = ref<string | null>(null)
const milestoneForm = ref({
  title: '',
  target_points: 80 as number | string,
  assigned_to: null as string | null,
  description: ''
})

const textRewardSuggestions = [
  { title: 'Wieczorny seans z ulubioną pizzą', pts: 60 },
  { title: 'Relaksujący masaż od partnera', pts: 100 },
  { title: 'Śniadanie do łóżka w weekend', pts: 80 },
  { title: 'Romantyczna kolacja na mieście', pts: 150 },
  { title: 'Dzień relaksu bez domowych obowiązków', pts: 120 },
  { title: 'Wyjście do kina z popcornem', pts: 75 },
  { title: 'Kawa i ciacho w ulubionej kawiarni', pts: 50 },
  { title: 'Weekendowy wyjazd za miasto', pts: 300 }
]

const quickPointOptions = [40, 60, 80, 100, 150, 200, 300, 500]

const handleMilestonePtsInput = (event: any) => {
  const inputEl = event?.target
  const raw = event?.detail?.value ?? inputEl?.value ?? ''
  const sanitized = String(raw).replace(/\D/g, '')
  milestoneForm.value.target_points = sanitized ? parseInt(sanitized, 10) : ''
  if (inputEl && inputEl.value !== String(milestoneForm.value.target_points)) {
    inputEl.value = milestoneForm.value.target_points
  }
}

const filterDigitsKeydown = (event: KeyboardEvent) => {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End'
  ]
  if (allowedKeys.includes(event.key)) {
    return
  }
  if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x', 'z', 'A', 'C', 'V', 'X', 'Z'].includes(event.key)) {
    return
  }
  if (!/^[0-9]$/.test(event.key)) {
    event.preventDefault()
  }
}

const openCreateMilestoneModal = () => {
  editingMilestoneId.value = null
  milestoneForm.value = {
    title: '',
    target_points: 80,
    assigned_to: null,
    description: ''
  }
  isMilestoneModalOpen.value = true
}

const openEditMilestoneModal = (goal: any) => {
  editingMilestoneId.value = goal.id
  milestoneForm.value = {
    title: goal.title,
    target_points: goal.target_points,
    assigned_to: goal.assigned_to ?? null,
    description: goal.description || ''
  }
  isMilestoneModalOpen.value = true
}

const closeMilestoneModal = () => {
  isMilestoneModalOpen.value = false
  editingMilestoneId.value = null
}

const applyTextSuggestion = (sugg: { title: string; pts: number }) => {
  milestoneForm.value.title = sugg.title
  if (!editingMilestoneId.value) {
    milestoneForm.value.target_points = sugg.pts
  }
}

const saveMilestone = () => {
  if (!milestoneForm.value.title.trim()) return
  const finalPts = Math.max(1, Number(milestoneForm.value.target_points) || 50)
  if (editingMilestoneId.value) {
    updateMilestone(editingMilestoneId.value, {
      title: milestoneForm.value.title.trim(),
      target_points: finalPts,
      assigned_to: milestoneForm.value.assigned_to,
      description: milestoneForm.value.description.trim()
    })
  } else {
    addMilestone(
      milestoneForm.value.title.trim(),
      finalPts,
      milestoneForm.value.assigned_to,
      milestoneForm.value.description.trim()
    )
  }
  closeMilestoneModal()
}

const removeCurrentMilestone = () => {
  if (editingMilestoneId.value) {
    deleteMilestone(editingMilestoneId.value)
    closeMilestoneModal()
  }
}

const handleClaimMilestone = (goal: any) => {
  claimMilestone(goal.id)
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.6 },
    colors: ['#0284c7', '#0d9488', '#f43f5e', '#f59e0b', '#10b981']
  })
}

const handleReactivateMilestone = (goal: any) => {
  reactivateMilestone(goal.id)
}

const handleRefresh = (event: any) => {
  setTimeout(() => {
    event.target.complete()
  }, 700)
}
</script>

<style scoped>
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
}

.brand-name {
  font-size: 19px;
  font-weight: 800;
  color: #0284c7;
  letter-spacing: -0.02em;
  display: block;
  line-height: 1.1;
}

.brand-sub {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.header-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-gear-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.quick-gear-btn:hover {
  background: #f1f5f9;
  color: #0284c7;
  transform: rotate(25deg);
}

.quick-gear-btn:active {
  transform: scale(0.92);
}

.couple-indicator-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  color: #16a34a;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.couple-indicator-badge:active {
  transform: scale(0.96);
}

.online-indicator-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
  transition: all 0.2s ease;
}

.online-indicator-dot.is-live {
  background: #16a34a;
  box-shadow: 0 0 6px rgba(22, 163, 74, 0.6);
  animation: pulseDot 2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.5; }
}

.online-tag-pill {
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  background: #16a34a;
  color: #ffffff;
  padding: 1px 5px;
  border-radius: 999px;
}

/* HERO CARD */
.hero-card {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 60%, #0d9488 100%);
  color: #ffffff;
  border-radius: 24px;
  padding: 22px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 30px -5px rgba(2, 132, 199, 0.4);
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.avatar-duo {
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.avatar-duo:active {
  transform: scale(0.96);
}

.avatar-ring {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.avatar-mine {
  background: #38bdf8;
  color: #0c4a6e;
  z-index: 2;
}

.avatar-theirs {
  background: #2dd4bf;
  color: #134e4a;
  margin-left: -12px;
  z-index: 1;
}

.avatar-heart {
  position: absolute;
  top: -4px;
  left: 26px;
  z-index: 3;
  color: #f43f5e;
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.anniversary-stats {
  text-align: right;
}

.days-num {
  font-size: 32px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #ffffff;
}

.days-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  opacity: 0.85;
}

.hero-nest-title {
  margin-top: 18px;
}

.hero-nest-title h2 {
  font-size: 21px;
  font-weight: 800;
  color: #ffffff;
}

.nest-level-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 3px 10px;
  border-radius: 999px;
  margin-top: 4px;
  backdrop-filter: blur(8px);
}

.nest-progress-bar-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  margin-top: 16px;
  overflow: hidden;
}

.nest-progress-bar {
  height: 100%;
  background: #34d399;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  opacity: 0.9;
  margin-top: 6px;
  font-weight: 500;
}

/* NEST STAGE CARD */
.nest-stage-card {
  text-align: center;
  padding: 20px;
}

.nest-visual-stage {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
}

.nest-illustration-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nest-main-img {
  width: 120px;
  height: 120px;
  border-radius: 28px;
  box-shadow: 0 10px 25px -4px rgba(2, 132, 199, 0.3);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.nest-main-img:active {
  transform: scale(1.08);
}

.floating-badge {
  position: absolute;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  animation: floatUp 3s infinite ease-in-out;
}

.badge-1 { top: 0; left: 6px; animation-delay: 0s; }
.badge-2 { top: 12px; right: 4px; animation-delay: 1s; }
.badge-3 { bottom: 6px; left: 4px; animation-delay: 2s; }

.accent-heart { color: #f43f5e; font-size: 16px; }
.accent-sparkle { color: #0284c7; font-size: 16px; }
.accent-leaf { color: #10b981; font-size: 16px; }

@keyframes floatUp {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.stage-description h3 {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.stage-description p {
  font-size: 13px;
  color: #64748b;
  margin: 6px 0 14px 0;
  line-height: 1.4;
}

.celebrate-btn {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.celebrate-btn:active {
  transform: scale(0.96);
  background: #dcfce7;
}

/* SECTION BADGES */
.section-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #0284c7;
  display: block;
  margin-bottom: 2px;
}

.love-badge {
  color: #f43f5e;
}

.calendar-badge {
  color: #0d9488;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-header-row h4 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

/* MOOD WIDGET */
.partner-mood-body {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #f8fafc;
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
}

.mood-icon-bubble {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #e0f2fe;
  color: #0284c7;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.1);
}

.mood-details {
  flex: 1;
}

.mood-label-pill {
  font-size: 12px;
  font-weight: 700;
  color: #0284c7;
  display: inline-block;
  margin-bottom: 2px;
}

.mood-note-quote {
  font-size: 13px;
  color: #334155;
  font-style: italic;
  margin: 0;
  line-height: 1.3;
}

.mood-note-empty {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
}

.mood-time {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

/* NUDGE CARD */
.nudge-sub {
  font-size: 12px;
  color: #64748b;
  margin: -4px 0 12px 0;
}

.nudge-points-tag {
  font-size: 11px;
  font-weight: 700;
  color: #16a34a;
  background: #f0fdf4;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #bbf7d0;
}

.nudge-points-tag.points-done {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.nudge-already-sent-box {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  padding: 14px 16px;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sent-status-icon-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sent-sparkle-badge {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #dcfce7;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.15);
}

.sent-status-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sent-title {
  font-size: 13px;
  font-weight: 700;
  color: #15803d;
}

.sent-subtitle {
  font-size: 12px;
  color: #166534;
}

.nudge-timer-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #ffffff;
  border: 1px solid #86efac;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  color: #166534;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  width: fit-content;
}

.timer-clock-icon {
  font-size: 15px;
  color: #16a34a;
}

.nudge-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.nudge-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nudge-btn:active {
  transform: scale(0.92);
  background: #f0f9ff;
  border-color: #0284c7;
}

.nudge-icon-circle {
  color: #f43f5e;
}

.nudge-text {
  font-size: 10px;
  font-weight: 700;
  color: #475569;
}

/* MINI TASKS LIST */
.view-all-link {
  font-size: 12px;
  font-weight: 700;
  color: #0284c7;
  text-decoration: none;
}

.mini-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
}

.checkbox-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #ffffff;
  transition: all 0.2s ease;
}

.checkbox-circle.checked {
  background: #16a34a;
  border-color: #16a34a;
}

.mini-task-details {
  flex: 1;
}

.mini-task-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  display: block;
}

.mini-task-assignee {
  font-size: 11px;
  color: #64748b;
}

.mini-task-pts {
  font-size: 11px;
  font-weight: 700;
  color: #0284c7;
}

.empty-mini-card {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
  background: #f8fafc;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.check-icon {
  font-size: 18px;
  color: #16a34a;
}

/* EVENT SUMMARY */
.event-desc {
  font-size: 13px;
  color: #475569;
  margin: 0 0 10px 0;
}

.event-date-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #0d9488;
  background: #f0fdfa;
  border: 1px solid #ccfbf1;
  padding: 4px 10px;
  border-radius: 999px;
}

/* ========================================================== */
/* DUO POINTS BREAKDOWN & SHARED MILESTONES / REWARDS SECTION */
/* ========================================================== */
.points-milestones-card {
  position: relative;
  overflow: hidden;
}

.points-badge {
  color: #0284c7;
  font-weight: 900;
}

.add-goal-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #0284c7;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-goal-btn:hover {
  background: #e0f2fe;
}

.add-goal-btn:active {
  transform: scale(0.96);
}

/* Duo Points Box */
.duo-points-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 16px;
}

.duo-points-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.user-score-col {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.score-mine {
  justify-content: flex-start;
}

.score-theirs {
  justify-content: flex-end;
  text-align: right;
  flex-direction: row-reverse;
}

.score-avatar-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.score-user-meta {
  display: flex;
  flex-direction: column;
}

.score-user-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.score-user-pts {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.score-user-tasks {
  font-size: 10.5px;
  color: #64748b;
  font-weight: 500;
}

.score-vs-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
  min-width: 60px;
}

.vs-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.score-total-val {
  font-size: 15px;
  font-weight: 800;
  color: #0284c7;
  line-height: 1.1;
}

.score-total-sub {
  font-size: 9px;
  color: #64748b;
  font-weight: 600;
}

/* Split Ratio Bar */
.duo-split-bar-track {
  height: 12px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  margin: 12px 0 8px 0;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
}

.duo-split-segment {
  height: 100%;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.split-pct-label {
  font-size: 9px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.duo-harmony-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #475569;
  font-weight: 500;
  margin-top: 4px;
}

.harmony-icon {
  color: #f59e0b;
  font-size: 14px;
  flex-shrink: 0;
}

/* Milestones Subheader */
.milestones-section-header {
  margin: 16px 0 10px 0;
}

.milestones-title-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.milestones-section-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.milestones-count-pill {
  font-size: 11px;
  font-weight: 700;
  color: #0284c7;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  padding: 2px 8px;
  border-radius: 999px;
}

.milestones-hint-text {
  font-size: 11.5px;
  color: #64748b;
  display: block;
}

/* Milestones Filter Scroll */
.milestones-filter-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 12px 2px;
  scrollbar-width: none;
}

.milestones-filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.filter-chip.active {
  background: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
}

.chip-count {
  font-size: 10.5px;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 6px;
  border-radius: 999px;
}

.filter-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Milestones Grid & Clean Cards */
.milestones-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.milestone-card-item {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  transition: all 0.2s ease;
}

.milestone-card-item.is-ready {
  border-color: #0284c7;
  background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.12);
}

.milestone-card-item.is-claimed {
  border-color: #86efac;
  background: #f0fdf4;
}

.milestone-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.goal-scope-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  border-width: 1px;
  border-style: solid;
  letter-spacing: -0.01em;
}

.milestone-top-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.goal-pts-tag {
  font-size: 12px;
  font-weight: 800;
  color: #0284c7;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  padding: 2px 8px;
  border-radius: 999px;
}

.goal-edit-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s ease;
  padding: 0;
}

.goal-edit-btn:hover {
  background: #f1f5f9;
  color: #0284c7;
  border-color: #cbd5e1;
}

.milestone-text-block {
  margin-bottom: 10px;
}

.milestone-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.35;
}

.milestone-desc {
  font-size: 12px;
  color: #64748b;
  margin: 4px 0 0 0;
  line-height: 1.4;
}

/* Progress Wrap */
.milestone-progress-wrap {
  margin-top: 10px;
}

.milestone-progress-bar-bg {
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.milestone-progress-bar-fill {
  height: 100%;
  background: #0284c7;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.milestone-progress-bar-fill.fill-ready {
  background: linear-gradient(90deg, #0284c7, #10b981) !important;
}

.milestone-progress-bar-fill.fill-claimed {
  background: #10b981 !important;
}

.milestone-progress-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
}

.milestone-current-pts {
  color: #475569;
  font-weight: 600;
}

.milestone-pct-badge {
  font-weight: 700;
  color: #0284c7;
}

.milestone-card-item.is-ready .milestone-pct-badge {
  color: #059669;
  font-weight: 800;
}

.milestone-claimed-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #16a34a;
  font-weight: 700;
}

/* Claim Button */
.milestone-claim-action {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #bae6fd;
}

.claim-reward-btn {
  width: 100%;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28);
  transition: all 0.2s ease;
}

.claim-reward-btn:hover {
  filter: brightness(1.05);
}

.claim-reward-btn:active {
  transform: scale(0.98);
}

.milestone-claimed-action {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #bbf7d0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.claimed-note {
  font-size: 11.5px;
  color: #16a34a;
  font-weight: 600;
}

.reactivate-goal-link {
  background: transparent;
  border: none;
  color: #0284c7;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}

.reactivate-goal-link:hover {
  text-decoration: underline;
}

/* Empty Milestones State */
.empty-milestones-box {
  text-align: center;
  padding: 28px 16px;
  background: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  border-radius: 16px;
}

.empty-sparkle-icon {
  font-size: 32px;
  color: #0284c7;
  margin-bottom: 8px;
}

.empty-milestones-box h6 {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.empty-milestones-box p {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.add-first-goal-btn {
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 10px;
}

/* ========================================================== */
/* MODAL STYLING (ADD / EDIT MILESTONE)                        */
/* ========================================================== */
.dn-custom-modal {
  --height: auto;
  --max-height: 90vh;
  --border-radius: 20px;
}

.modal-wrapper-inner {
  padding: 20px;
  background: #ffffff;
  border-radius: 20px 20px 0 0;
}

.modal-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-header-bar h3 {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.modal-close-icon-btn {
  background: #f1f5f9;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
}

.modal-form-body {
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
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

/* Scope choice grid */
.scope-choice-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.scope-choice-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.scope-choice-btn:hover {
  background: #f1f5f9;
}

.scope-choice-btn.active {
  background: #f0f9ff;
  border-color: #0284c7;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.12);
}

.scope-btn-icon {
  font-size: 22px;
  color: #64748b;
  flex-shrink: 0;
}

.scope-choice-btn.active .scope-btn-icon {
  color: #0284c7;
}

.scope-btn-texts {
  display: flex;
  flex-direction: column;
}

.scope-btn-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.scope-btn-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}

/* Text Presets Scroll */
.presets-scroll-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none;
}

.presets-scroll-row::-webkit-scrollbar {
  display: none;
}

.text-preset-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 7px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.text-preset-chip:hover {
  background: #f1f5f9;
}

.text-preset-chip.active {
  background: #e0f2fe;
  border-color: #0284c7;
}

.preset-name {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.preset-pts {
  font-size: 10.5px;
  font-weight: 700;
  color: #0284c7;
  background: rgba(2, 132, 199, 0.1);
  padding: 2px 6px;
  border-radius: 999px;
}

/* Modal Inputs */
.modal-styled-input {
  width: 100%;
  --padding-start: 14px;
  --padding-end: 14px;
  --background: #f8fafc;
  --border-radius: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.modal-styled-input:focus-within {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.14);
}

.modal-textarea-styled {
  --padding-start: 14px;
  --padding-top: 10px;
}

/* Target Points Selection */
.label-with-pts-val {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pts-target-badge {
  font-size: 13px;
  font-weight: 800;
  color: #0284c7;
  background: #e0f2fe;
  padding: 2px 8px;
  border-radius: 999px;
}

.custom-pts-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 4px;
  margin-bottom: 4px;
}

.custom-pts-input {
  --padding-end: 46px;
}

.pts-suffix-label {
  position: absolute;
  right: 14px;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  pointer-events: none;
  z-index: 3;
}

.quick-pts-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-top: 4px;
}

.quick-pts-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pts-option-pill {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #475569;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pts-option-pill.active {
  background: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
}

/* Modal Actions Footer */
.modal-actions-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.delete-milestone-btn {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  font-size: 13px;
  font-weight: 700;
  padding: 12px 16px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-milestone-btn:hover {
  background: #fee2e2;
}

.save-milestone-btn {
  flex: 1;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
}
</style>
