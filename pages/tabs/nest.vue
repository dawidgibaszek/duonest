<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="header-content">
          <div class="brand-badge" @click="navigateTo('/tabs/nest')">
            <img src="/favicon.png" alt="DuoNest" class="brand-logo" />
            <div class="brand-text-col">
              <span class="brand-name">DuoNest</span>
              <span class="brand-sub">Wspólna przestrzeń</span>
            </div>
          </div>
          <div class="header-actions-group">
            <div
              v-if="partnerUser?.id"
              class="couple-indicator-badge"
              :class="{ 'is-online': isPartnerOnline }"
              @click="navigateTo('/tabs/relationship')"
              :title="isPartnerOnline ? `${partnerUser?.name || 'Partner'} jest teraz online` : `Ostatnia aktywność: ${partnerLastActiveText}`"
            >
              <div class="partner-avatar-wrap">
                <div class="partner-avatar-mini" :style="{ backgroundColor: partnerUserAccentColor }">
                  <img
                    v-if="partnerUser?.avatar_url"
                    :src="partnerUser.avatar_url"
                    :alt="partnerUser.name || 'Partner'"
                    class="partner-avatar-img"
                  />
                  <span v-else class="avatar-initial">{{ (partnerUser?.name || 'P').charAt(0).toUpperCase() }}</span>
                </div>
                <span class="status-pip" :class="{ 'is-online': isPartnerOnline }"></span>
              </div>
              <div class="partner-info-col">
                <div class="partner-name-row">
                  <span class="partner-name-tag">{{ partnerUser?.name || 'Partner' }}</span>
                </div>
                <div class="partner-status-row">
                  <span v-if="isPartnerOnline" class="status-live-badge">
                    <span class="status-pulse-dot"></span>
                    online
                  </span>
                  <span v-else class="status-time-badge">
                    <ion-icon :icon="ioniconsTimeOutline" class="status-clock-icon" />
                    {{ partnerLastActiveText }}
                  </span>
                </div>
              </div>
            </div>
            <div
              v-else
              class="couple-indicator-badge not-paired"
              @click="navigateTo('/pairing')"
              title="Połącz konto z partnerem"
            >
              <div class="partner-avatar-wrap">
                <div class="partner-avatar-mini unpaired-avatar">
                  <ion-icon :icon="ioniconsPersonAddOutline" class="unpaired-icon" />
                </div>
              </div>
              <div class="partner-info-col">
                <span class="partner-name-tag">Połącz konto</span>
                <span class="partner-time-sub">Kod parowania</span>
              </div>
            </div>

            <button
              class="quick-gear-btn"
              @click="navigateTo('/tabs/relationship?category=nest_settings')"
              title="Ustawienia Gniazdka"
              aria-label="Ustawienia Gniazdka"
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

      <!-- 1. ENRICHED COUPLE & NEST HERO CARD -->
      <div class="dn-card nest-hero-card">
        <!-- BACKGROUND AMBIENT GLOWS & FLOATING SPARKLES -->
        <div class="hero-ambient-glow glow-top-right"></div>
        <div class="hero-ambient-glow glow-bottom-left"></div>
        <div class="hero-decor-stars" aria-hidden="true">
          <!-- Sparkle Glyphs -->
          <ion-icon :icon="ioniconsSparkles" class="decor-star star-1" />
          <ion-icon :icon="ioniconsSparkles" class="decor-star star-2" />
          <ion-icon :icon="ioniconsSparkles" class="decor-star star-3" />
          <ion-icon :icon="ioniconsSparkles" class="decor-star star-4" />
          <ion-icon :icon="ioniconsSparkles" class="decor-star star-5" />
          <ion-icon :icon="ioniconsSparkles" class="decor-star star-6" />

          <!-- Realistic Night Sky Micro Star Dots -->
          <span class="decor-star-dot dot-1"></span>
          <span class="decor-star-dot dot-2"></span>
          <span class="decor-star-dot dot-3"></span>
          <span class="decor-star-dot dot-4"></span>
          <span class="decor-star-dot dot-5"></span>
          <span class="decor-star-dot dot-6"></span>
          <span class="decor-star-dot dot-7"></span>
        </div>

        <!-- TOP: AVATARS & ANNIVERSARY BADGE -->
        <div class="hero-top-row">
          <div class="hero-avatar-duo" @click="navigateTo('/tabs/relationship')" title="Profil relacji">
            <div class="avatar-ring avatar-mine" :style="{ backgroundColor: currentUserAccentColor }">
              <span class="avatar-letter">{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
            </div>
            <div class="avatar-heart-pill">
              <ion-icon :icon="ioniconsHeart" class="heart-pulse-icon" />
            </div>
            <div class="avatar-ring avatar-theirs" :style="{ backgroundColor: partnerUserAccentColor }">
              <span class="avatar-letter">{{ partnerUser ? (partnerUser.name || 'P').charAt(0).toUpperCase() : '?' }}</span>
            </div>
          </div>

          <div class="anniversary-badge" @click="celebrateWithConfetti" title="Świętujcie rocznicę!">
            <div class="anniversary-icon-wrap">
              <ion-icon :icon="ioniconsFlame" class="anniversary-flame-icon" />
            </div>
            <div class="anniversary-text-col">
              <span class="anniversary-days">{{ daysTogether }}</span>
              <span class="anniversary-sub">DNI RAZEM</span>
            </div>
          </div>
        </div>

        <!-- NEST TITLE & STAGE BADGES -->
        <div class="hero-body">
          <div class="hero-header-line">
            <h2 class="hero-nest-name">{{ partnership?.nest_name || 'Nasze Ciepłe Gniazdko' }}</h2>
            <button class="hero-celebrate-btn" @click="celebrateWithConfetti" title="Świętuj">
              <ion-icon :icon="ioniconsSparklesOutline" />
              <span>Świętuj</span>
            </button>
          </div>

          <div class="hero-stage-badge-wrap">
            <span class="hero-stage-pill">
              <ion-icon :icon="getStageIcon(nestLevel)" class="stage-icon-svg" />
              <span>Poziom {{ nestLevel }} • {{ currentStageName }}</span>
            </span>
          </div>

          <div class="hero-stage-quote" v-if="currentStageDescription">
            <p class="hero-stage-desc">{{ currentStageDescription }}</p>
          </div>
        </div>

        <!-- 3-METRIC QUICK STATS STRIP -->
        <div class="hero-metrics-strip">
          <div class="hero-metric-item">
            <span class="metric-label">ETAP</span>
            <span class="metric-val">Poz. {{ nestLevel }}</span>
          </div>
          <div class="metric-divider"></div>
          <div class="hero-metric-item">
            <span class="metric-label">POSTĘP XP</span>
            <span class="metric-val">{{ levelProgress }}%</span>
          </div>
          <div class="metric-divider"></div>
          <div class="hero-metric-item">
            <span class="metric-label">DO KOLEJNEGO</span>
            <span class="metric-val">{{ pointsToNextLevel }} pkt</span>
          </div>
        </div>

        <!-- XP PROGRESS BAR -->
        <div class="hero-progress-box">
          <div class="hero-progress-track">
            <div class="hero-progress-bar" :style="{ width: levelProgress + '%' }"></div>
          </div>
          <div class="hero-progress-labels">
            <span class="xp-current">
              <ion-icon :icon="ioniconsSparkles" class="xp-icon" />
              {{ nestPoints }} pkt doświadczenia
            </span>
            <span class="xp-next">
              Cel: Poz. {{ nestLevel + 1 }}
            </span>
          </div>
        </div>
      </div>

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

      <!-- 3. DAILY NUDGE / QUICK AFFECTION BAR -->
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
              <span class="sent-title">Wysłano dzisiejsze puknięcie!</span>
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
            <button
              type="button"
              v-for="n in nudgePresets"
              :key="n.id"
              class="nudge-btn"
              @click="sendQuickNudge(n.id, n.defaultMsg)"
            >
              <div class="nudge-icon-circle">
                <DuoIcon :name="'nudge-' + n.id" :size="20" />
              </div>
              <span class="nudge-text">{{ n.title }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4. LIVE SHARED DOODLE / KARTECZKA NA LODÓWCE -->
      <div class="dn-card nest-doodle-card" @click="isDoodleModalOpen = true">
        <div class="card-header-row">
          <div class="header-left">
            <span class="section-badge love-badge">
              <ion-icon :icon="ioniconsColorPaletteOutline" class="badge-mini-icon" />
              KARTECZKA NA LODÓWCE
            </span>
            <h4>Wspólna Tablica</h4>
          </div>

          <div class="doodle-header-status">
            <span v-if="isPartnerDrawing" class="doodle-status-pill drawing">
              <span class="live-dot-pulse"></span>
              {{ partnerUser?.name || 'Partner' }} teraz rysuje!
            </span>
            <span v-else-if="hasDoodleContent" class="doodle-status-pill author">
              📌 {{ currentDoodle?.author_name }}
            </span>
            <span v-else class="doodle-status-pill empty">
              Kliknij, aby narysować
            </span>
          </div>
        </div>

        <!-- DOODLE PREVIEW CANVAS CONTAINER -->
        <div class="nest-doodle-preview-box">
          <!-- If there is a doodle -->
          <div v-show="hasDoodleContent" class="preview-canvas-wrap">
            <canvas ref="previewCanvasRef" class="preview-mini-canvas"></canvas>
            <div class="preview-meta-bar">
              <span class="meta-author">Od: <strong>{{ currentDoodle?.author_name }}</strong></span>
              <span class="meta-action-hint">Dotknij, aby otworzyć tablicę ✨</span>
            </div>
          </div>

          <!-- Empty state placeholder -->
          <div v-show="!hasDoodleContent" class="doodle-empty-canvas">
            <div class="empty-doodle-illustration">
              <ion-icon :icon="ioniconsBrushOutline" class="empty-brush-icon" />
              <ion-icon :icon="ioniconsHeart" class="empty-heart-icon" />
            </div>
            <p class="empty-doodle-title">Czysta karteczka na lodówce!</p>
            <p class="empty-doodle-sub">Zostaw miłą wiadomość lub narysuj coś słodkiego dla {{ partnerUser?.name || 'partnera' }}.</p>
            <button class="dn-button-primary doodle-start-btn" @click.stop="isDoodleModalOpen = true">
              <ion-icon :icon="ioniconsColorPaletteOutline" />
              <span>Narysuj coś 🎨</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 5. TODAY'S PENDING CHORES SUMMARY -->
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
                {{ task.assigned_to ? (task.assigned_to === currentUser?.id ? 'Dla Ciebie' : ('Dla ' + (partnerUser?.name || 'partnera'))) : 'Wspólne' }}
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

      <!-- 5. UPCOMING CALENDAR HIGHLIGHT -->
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

      <!-- 6. DUO POINTS BREAKDOWN & SHARED / PER-PERSON MILESTONES -->
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

        <!-- 1. PODZIAŁ PUNKTÓW I HARMONIA DUETU -->
        <div class="duo-balance-section">
          <!-- 2-COLUMNS CARDS: TY vs PARTNER -->
          <div class="duo-players-grid">
            <!-- GRACZ 1: TY -->
            <div class="player-stat-card mine-stat-card">
              <div class="player-card-header">
                <div class="player-avatar-circle" :style="{ backgroundColor: currentUserAccentColor }">
                  <span>{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
                </div>
                <div class="player-identity">
                  <span class="player-label-tag">Ty</span>
                  <span class="player-full-name">{{ currentUser.name || 'Ty' }}</span>
                </div>
              </div>
              <div class="player-points-display">
                <span class="player-points-num" :style="{ color: currentUserAccentColor }">{{ userPoints }}</span>
                <span class="player-points-unit">pkt</span>
              </div>
              <div class="player-tasks-pill">
                <ion-icon :icon="ioniconsCheckmarkOutline" />
                <span>{{ userCompletedTasksCount }} zadań</span>
              </div>
            </div>

            <!-- GRACZ 2: PARTNER -->
            <div class="player-stat-card theirs-stat-card">
              <div class="player-card-header">
                <div class="player-avatar-circle" :style="{ backgroundColor: partnerUserAccentColor }">
                  <span>{{ partnerUser ? (partnerUser.name || 'P').charAt(0).toUpperCase() : '?' }}</span>
                </div>
                <div class="player-identity">
                  <span class="player-label-tag">Partner</span>
                  <span class="player-full-name">{{ partnerUser?.name || 'Partner' }}</span>
                </div>
              </div>
              <div class="player-points-display">
                <span class="player-points-num" :style="{ color: partnerUserAccentColor }">{{ partnerPoints }}</span>
                <span class="player-points-unit">pkt</span>
              </div>
              <div class="player-tasks-pill">
                <ion-icon :icon="ioniconsCheckmarkOutline" />
                <span>{{ partnerCompletedTasksCount }} zadań</span>
              </div>
            </div>
          </div>

          <!-- HARMONY BALANCE BAR & METRICS -->
          <div class="duo-ratio-container">
            <div class="duo-ratio-meta-row">
              <div class="ratio-user-side" :style="{ color: currentUserAccentColor }">
                <span class="ratio-dot" :style="{ backgroundColor: currentUserAccentColor }"></span>
                <span class="ratio-text">{{ userPointsPct }}% wkładu</span>
              </div>
              <div class="ratio-total-center-badge">
                <ion-icon :icon="ioniconsSparkles" class="center-sparkle" />
                <span>Razem: <strong>{{ nestPoints }}</strong> pkt</span>
              </div>
              <div class="ratio-partner-side" :style="{ color: partnerUserAccentColor }">
                <span class="ratio-text">{{ partnerPointsPct }}% wkładu</span>
                <span class="ratio-dot" :style="{ backgroundColor: partnerUserAccentColor }"></span>
              </div>
            </div>

            <!-- THE MODERN SPLIT PROGRESS BAR -->
            <div class="duo-modern-bar-track">
              <div
                class="duo-modern-bar-fill left-fill"
                :style="{
                  width: userPointsPct + '%',
                  backgroundColor: currentUserAccentColor
                }"
              ></div>
              <div
                class="duo-modern-bar-fill right-fill"
                :style="{
                  width: partnerPointsPct + '%',
                  backgroundColor: partnerUserAccentColor
                }"
              ></div>
            </div>
          </div>

          <!-- HARMONY CALLOUT MESSAGE -->
          <div class="duo-harmony-card">
            <div class="harmony-icon-bubble">
              <ion-icon :icon="ioniconsSparkles" />
            </div>
            <p class="harmony-message-text">{{ duoHarmonyMessage }}</p>
          </div>
        </div>

        <!-- 2. KAMIENIE MILOWE & CELE -->
        <div class="milestones-unified-section">
          <div class="milestones-section-header">
            <div class="milestones-title-group">
              <h5 class="milestones-heading">Wspólne cele & nagrody</h5>
              <span class="milestones-count-pill">{{ completedMilestonesCount }} / {{ milestonesList.length }} zrealizowane</span>
            </div>
            <p class="milestones-sub-desc">Zdobywajcie punkty, by odbierać zaplanowane nagrody i cele.</p>
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
              <ion-icon :icon="ioniconsPeopleOutline" class="chip-icon" />
              <span>Wspólne</span>
              <span class="chip-count">{{ sharedCount }}</span>
            </button>
            <button
              type="button"
              class="filter-chip"
              :class="{ active: activeMilestoneFilter === 'mine' }"
              @click="activeMilestoneFilter = 'mine'"
            >
              <ion-icon :icon="ioniconsPersonOutline" class="chip-icon" />
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
              <ion-icon :icon="ioniconsHeartOutline" class="chip-icon" />
              <span>Dla {{ partnerUser.name || 'Partnera' }}</span>
              <span class="chip-count">{{ theirsCount }}</span>
            </button>
          </div>

          <!-- MILESTONES LIST -->
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
              <!-- TOP: SCOPE BADGE & POINTS TAG & ACTIONS -->
              <div class="milestone-card-top">
                <span
                  class="goal-scope-pill"
                  :style="{
                    color: getGoalScopeInfo(goal).color,
                    backgroundColor: getGoalScopeInfo(goal).bg,
                    borderColor: getGoalScopeInfo(goal).border
                  }"
                >
                  <ion-icon
                    :icon="!goal.assigned_to ? ioniconsPeopleOutline : (goal.assigned_to === currentUser?.id ? ioniconsPersonOutline : ioniconsHeartOutline)"
                    class="scope-mini-icon"
                  />
                  <span>{{ getGoalScopeInfo(goal).label }}</span>
                </span>

                <div class="milestone-top-right">
                  <span class="goal-pts-pill">
                    <ion-icon :icon="ioniconsTrophyOutline" class="trophy-icon" />
                    <span>{{ goal.target_points }} pkt</span>
                  </span>
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

              <!-- PROGRESS BAR -->
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
                    {{ goal.is_completed ? 'Cel zrealizowany' : `${Math.min(getGoalCurrentPoints(goal), goal.target_points)} / ${goal.target_points} pkt` }}
                  </span>
                  <span class="milestone-pct-badge" v-if="!goal.is_completed">
                    {{ isGoalReady(goal) ? 'Gotowe do odebrania!' : `${getGoalProgressPct(goal)}%` }}
                  </span>
                  <span class="milestone-claimed-badge" v-else>
                    <ion-icon :icon="ioniconsCheckmarkCircle" />
                    <span>Odebrano</span>
                  </span>
                </div>
              </div>

              <!-- CELEBRATE & CLAIM CTA -->
              <div class="milestone-claim-action" v-if="isGoalReady(goal)">
                <button class="claim-reward-btn" @click="handleClaimMilestone(goal)">
                  <ion-icon :icon="ioniconsGiftOutline" />
                  <span>Świętujcie i odbierzcie nagrodę!</span>
                </button>
              </div>

              <!-- CLAIMED COMPLETED FOOTER -->
              <div class="milestone-claimed-action" v-if="goal.is_completed">
                <span class="claimed-note">
                  <ion-icon :icon="ioniconsHeart" class="heart-mini" />
                  <span>Nagroda zrealizowana!</span>
                </span>
                <button class="reactivate-goal-link" @click="handleReactivateMilestone(goal)">
                  <ion-icon :icon="ioniconsRefreshOutline" class="reactivate-icon" />
                  <span>Ustaw cel ponownie</span>
                </button>
              </div>
            </div>
          </div>

          <!-- EMPTY STATE -->
          <div class="empty-milestones-box" v-else>
            <div class="empty-icon-circle">
              <ion-icon :icon="ioniconsSparklesOutline" />
            </div>
            <h6>Brak celów w tej kategorii</h6>
            <p>Wyznaczcie wspólny cel lub nagrodę za punkty dla siebie nawzajem.</p>
            <button class="add-first-goal-btn" @click="openCreateMilestoneModal">
              <ion-icon :icon="ioniconsAddOutline" />
              <span>Dodaj cel</span>
            </button>
          </div>
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
                  :class="{ active: milestoneForm.assigned_to === currentUser?.id }"
                  @click="milestoneForm.assigned_to = currentUser?.id || ''"
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

      <!-- SHARED DOODLE / LIVE DRAWING STUDIO MODAL -->
      <DuoDoodleModal :is-open="isDoodleModalOpen" @close="isDoodleModalOpen = false" />

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState } from '~/composables/useDuoState'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { useConfirm } from '~/composables/useConfirm'
import DuoIcon from '~/components/DuoIcon.vue'
import DuoDoodleModal from '~/components/DuoDoodleModal.vue'

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
  partnerLastSeenAt,
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
  reactivateMilestone,
  initSupabaseSync,
  currentDoodle,
  isPartnerDrawing,
  partnerLiveStroke
} = useDuoState()

const { confirm } = useConfirm()

const { askPermissionAfterPairing } = usePushNotifications()

const isDoodleModalOpen = ref(false)
const previewCanvasRef = ref<HTMLCanvasElement | null>(null)

const hasDoodleContent = computed(() => {
  return Boolean(currentDoodle.value && currentDoodle.value.strokes && currentDoodle.value.strokes.length > 0)
})

const renderPreviewCanvas = () => {
  const canvas = previewCanvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const doodleStrokes = currentDoodle.value?.strokes || []
  for (const stroke of doodleStrokes) {
    const pts = stroke.points
    if (!pts || pts.length < 2) continue

    ctx.save()
    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      let strokeColor = stroke.color || '#e11d48'
      if (strokeColor.toLowerCase() === '#ffffff') {
        strokeColor = '#0f172a'
      }
      ctx.strokeStyle = strokeColor
    }

    const scaleFactor = Math.min(canvas.width, canvas.height) / 400
    ctx.lineWidth = Math.max(1.5, stroke.width * scaleFactor)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (pts.length === 2) {
      ctx.beginPath()
      ctx.arc(pts[0] * canvas.width, pts[1] * canvas.height, ctx.lineWidth / 2, 0, Math.PI * 2)
      ctx.fillStyle = ctx.strokeStyle
      ctx.fill()
      ctx.restore()
      continue
    }

    ctx.beginPath()
    ctx.moveTo(pts[0] * canvas.width, pts[1] * canvas.height)
    for (let i = 2; i < pts.length; i += 2) {
      const prevX = pts[i - 2] * canvas.width
      const prevY = pts[i - 1] * canvas.height
      const currX = pts[i] * canvas.width
      const currY = pts[i + 1] * canvas.height
      const midX = (prevX + currX) / 2
      const midY = (prevY + currY) / 2
      ctx.quadraticCurveTo(prevX, prevY, midX, midY)
    }
    ctx.lineTo(pts[pts.length - 2] * canvas.width, pts[pts.length - 1] * canvas.height)
    ctx.stroke()
    ctx.restore()
  }
}

watch([() => currentDoodle.value, () => partnerLiveStroke.value], () => {
  nextTick(() => {
    renderPreviewCanvas()
  })
}, { deep: true })

const liveNowMs = ref(Date.now())
let activityTimer: any = null

onMounted(async () => {
  if (typeof window !== 'undefined') {
    activityTimer = setInterval(() => {
      liveNowMs.value = Date.now()
    }, 20000)
  }

  try {
    await initSupabaseSync()
  } catch (_) {}

  if (partnership.value) {
    askPermissionAfterPairing(partnerUser.value?.name || 'Partner')
  }

  nextTick(() => {
    renderPreviewCanvas()
  })
})

onUnmounted(() => {
  if (activityTimer) {
    clearInterval(activityTimer)
    activityTimer = null
  }
})

const partnerLastActiveText = computed(() => {
  const _ = liveNowMs.value
  if (isPartnerOnline.value) return 'online'
  if (!partnerLastSeenAt.value) return 'offline'

  try {
    const date = new Date(partnerLastSeenAt.value)
    const timeMs = date.getTime()
    if (isNaN(timeMs)) return 'offline'
    const now = Date.now()
    const diffSec = Math.floor((now - timeMs) / 1000)

    if (diffSec < 60) return 'przed chwilą'

    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) {
      return `${diffMin} min temu`
    }

    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) {
      const nowDay = new Date(now).getDate()
      const dateDay = date.getDate()
      if (nowDay === dateDay) {
        if (diffHours === 1) return '1 godz. temu'
        if (diffHours >= 2 && diffHours <= 4) return `${diffHours} godz. temu`
        return `${diffHours} godz. temu`
      }
    }

    const nowZero = new Date(now)
    nowZero.setHours(0, 0, 0, 0)
    const dateZero = new Date(date)
    dateZero.setHours(0, 0, 0, 0)
    const diffCalendarDays = Math.round((nowZero.getTime() - dateZero.getTime()) / (24 * 60 * 60 * 1000))

    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')

    if (diffCalendarDays === 1) {
      return `wczoraj ${hh}:${mm}`
    }

    if (diffCalendarDays > 1 && diffCalendarDays < 7) {
      return `${diffCalendarDays} dni temu`
    }

    const dd = String(date.getDate()).padStart(2, '0')
    const mo = String(date.getMonth() + 1).padStart(2, '0')
    return `${dd}.${mo}`
  } catch (_) {
    return 'offline'
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

const getStageIcon = (level: number) => {
  const icons: Record<number, any> = {
    1: ioniconsLeafOutline,
    2: ioniconsSparklesOutline,
    3: ioniconsHomeOutline,
    4: ioniconsStarOutline,
    5: ioniconsHeartOutline
  }
  const lvl = Math.min(Math.max(level, 1), 5)
  return icons[lvl] || ioniconsLeafOutline
}

const pendingChores = computed(() => {
  return tasksList.value.filter(t => !t.is_completed)
})

const upcomingEvent = computed(() => {
  return eventsList.value[0] || null
})

const formattedMoodTime = computed(() => {
  if (!partnerUser.value?.mood_updated_at) return 'Dzisiaj'
  const date = new Date(partnerUser.value.mood_updated_at)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
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
    return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch (e) {
    return dateStr
  }
}

const celebrateWithConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#cbd5e1']
  })
}

const nudgePresets = [
  { id: 'hug', title: 'Uścisk', defaultMsg: 'Ciepły uścisk w trakcie dnia!' },
  { id: 'kiss', title: 'Buziak', defaultMsg: 'Słodki buziak dla Ciebie!' },
  { id: 'tea', title: 'Herbatka', defaultMsg: 'Zrobiłem dla Ciebie herbatkę!' },
  { id: 'love', title: 'Kocham Cię', defaultMsg: 'Pamiętaj, że bardzo Cię kocham!' },
  { id: 'massage', title: 'Masaż', defaultMsg: 'Wieczorny relaksujący masaż czeka na Ciebie!' }
]

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
      color: '#0f172a',
      bg: 'rgba(15, 23, 42, 0.08)',
      border: 'rgba(15, 23, 42, 0.2)'
    }
  }
  if (goal.assigned_to === currentUser.value.id) {
    const color = currentUserAccentColor.value || '#0f172a'
    return {
      label: 'Dla Ciebie',
      color: color,
      bg: hexToRgba(color, 0.12),
      border: hexToRgba(color, 0.3)
    }
  }
  const color = partnerUserAccentColor.value || '#1e293b'
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

const removeCurrentMilestone = async () => {
  if (editingMilestoneId.value) {
    const confirmed = await confirm({
      title: 'Usuń wspólny cel',
      message: 'Czy na pewno chcesz usunąć ten cel z Waszego Gniazdka?',
      itemHighlight: milestoneForm.title || '',
      confirmText: 'Usuń cel',
      cancelText: 'Anuluj',
      type: 'danger',
      icon: 'trash'
    })
    if (confirmed) {
      deleteMilestone(editingMilestoneId.value)
      closeMilestoneModal()
    }
  }
}

const handleClaimMilestone = (goal: any) => {
  claimMilestone(goal.id)
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.6 },
    colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#cbd5e1']
  })
}

const handleReactivateMilestone = (goal: any) => {
  reactivateMilestone(goal.id)
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
/* ========================================================== */
/* TOP NAVIGATION BAR / HEADER (GNIAZDKO)                     */
/* ========================================================== */
ion-header {
  box-shadow: none;
}

ion-toolbar {
  --background: rgba(255, 255, 255, 0.88);
  --border-width: 0;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  gap: 12px;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
}

.brand-logo {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.12);
  object-fit: cover;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.brand-badge:active .brand-logo {
  transform: scale(0.94);
}

.brand-text-col {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-family: var(--ion-heading-font-family, 'Outfit', sans-serif);
  font-size: 19px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.025em;
  display: block;
  line-height: 1.1;
}

.brand-sub {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
  letter-spacing: -0.01em;
  display: block;
}

.header-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* COUPLE / PARTNER INDICATOR CAPSULE */
.couple-indicator-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  padding: 4px 12px 4px 4px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.02);
  max-width: 185px;
}

.couple-indicator-badge:hover {
  background: #f8fafc;
  border-color: rgba(15, 23, 42, 0.16);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.07);
}

.couple-indicator-badge:active {
  transform: scale(0.96);
}

.couple-indicator-badge.is-online {
  border-color: rgba(22, 163, 74, 0.25);
  box-shadow: 0 1px 4px rgba(22, 163, 74, 0.1), 0 2px 8px rgba(15, 23, 42, 0.03);
}

.couple-indicator-badge.is-online:hover {
  background: #f0fdf4;
  border-color: rgba(22, 163, 74, 0.4);
}

.couple-indicator-badge.not-paired {
  border-style: dashed;
  border-color: #cbd5e1;
}

.partner-avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
}

.partner-avatar-mini {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25), 0 1px 3px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.partner-avatar-mini.unpaired-avatar {
  background: #0f172a;
}

.unpaired-icon {
  font-size: 15px;
  color: #ffffff;
}

.partner-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initial {
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.status-pip {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 9.5px;
  height: 9.5px;
  border-radius: 50%;
  background: #94a3b8;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  transition: all 0.25s ease;
}

.status-pip.is-online {
  background: #16a34a;
  box-shadow: 0 0 7px rgba(22, 163, 74, 0.75);
  animation: pulsePip 2s infinite ease-in-out;
}

@keyframes pulsePip {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.18); opacity: 0.8; }
}

.partner-info-col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  line-height: 1.15;
}

.partner-name-row {
  display: flex;
  align-items: center;
}

.partner-name-tag {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.015em;
}

.partner-status-row {
  display: flex;
  align-items: center;
  margin-top: 1.5px;
}

.status-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 3.5px;
  font-size: 9.5px;
  font-weight: 700;
  color: #15803d;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1;
}

.status-pulse-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #16a34a;
  display: inline-block;
  box-shadow: 0 0 4px rgba(22, 163, 74, 0.6);
}

.status-time-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  font-weight: 600;
  color: #64748b;
  line-height: 1;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-clock-icon {
  font-size: 10.5px;
  color: #94a3b8;
  flex-shrink: 0;
}

.partner-time-sub {
  font-size: 9.5px;
  font-weight: 500;
  color: #94a3b8;
  line-height: 1;
}

/* QUICK SETTINGS BUTTON */
.quick-gear-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.02);
  flex-shrink: 0;
}

.quick-gear-btn:hover {
  background: #f8fafc;
  color: #020617;
  border-color: rgba(15, 23, 42, 0.16);
  transform: rotate(25deg);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.07);
}

.quick-gear-btn:active {
  transform: scale(0.92);
}

/* ========================================================== */
/* ENRICHED NEST HERO CARD (ATMOSPHERIC, WARM & INTERACTIVE)  */
/* ========================================================== */
.nest-hero-card {
  background: linear-gradient(135deg, #090e1a 0%, #0f172a 45%, #1e293b 100%);
  color: #ffffff;
  border-radius: 24px;
  padding: 20px 20px 18px 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 12px 36px -6px rgba(11, 17, 32, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* Atmospheric Ambient Glows */
.hero-ambient-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(40px);
  z-index: 0;
}

.glow-top-right {
  top: -20px;
  right: -20px;
  width: 130px;
  height: 130px;
  background: radial-gradient(circle, rgba(244, 63, 94, 0.22) 0%, transparent 70%);
}

.glow-bottom-left {
  bottom: -30px;
  left: -20px;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%);
}

/* Ambient Constellation Stars (Night Sky Effect) */
.hero-decor-stars {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.decor-star {
  position: absolute;
  filter: drop-shadow(0 0 3px rgba(254, 240, 138, 0.45));
}

.star-1 {
  top: 9%;
  left: 42%;
  font-size: 11px;
  color: #fef08a;
  animation: starBlinkFast 3.4s ease-in-out infinite 0.2s;
}

.star-2 {
  top: 18%;
  left: 69%;
  font-size: 8px;
  color: #fde047;
  animation: starFlickerShimmer 4.1s ease-in-out infinite 1.5s;
}

.star-3 {
  top: 42%;
  left: 86%;
  font-size: 10px;
  color: #fef08a;
  animation: starGlowSlow 5.2s ease-in-out infinite 0.8s;
}

.star-4 {
  top: 50%;
  left: 12%;
  font-size: 8px;
  color: #e2e8f0;
  animation: starBlinkFast 2.8s ease-in-out infinite 2.1s;
}

.star-5 {
  top: 76%;
  left: 64%;
  font-size: 9px;
  color: #fef08a;
  animation: starFlickerShimmer 3.9s ease-in-out infinite 0.6s;
}

.star-6 {
  top: 86%;
  left: 26%;
  font-size: 8px;
  color: #fde047;
  animation: starGlowSlow 4.7s ease-in-out infinite 2.8s;
}

/* Micro Star Dust Dots */
.decor-star-dot {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 4px rgba(254, 240, 138, 0.85);
}

.dot-1 {
  top: 7%;
  left: 18%;
  width: 2.5px;
  height: 2.5px;
  animation: starBlinkFast 3.1s ease-in-out infinite 1.1s;
}

.dot-2 {
  top: 14%;
  left: 84%;
  width: 3px;
  height: 3px;
  animation: starGlowSlow 4.4s ease-in-out infinite 0.4s;
}

.dot-3 {
  top: 34%;
  left: 36%;
  width: 2px;
  height: 2px;
  animation: starFlickerShimmer 3.6s ease-in-out infinite 2.3s;
}

.dot-4 {
  top: 62%;
  left: 49%;
  width: 2.5px;
  height: 2.5px;
  animation: starBlinkFast 4.8s ease-in-out infinite 1.7s;
}

.dot-5 {
  top: 70%;
  left: 91%;
  width: 3px;
  height: 3px;
  animation: starGlowSlow 3.2s ease-in-out infinite 0.9s;
}

.dot-6 {
  top: 82%;
  left: 7%;
  width: 2px;
  height: 2px;
  animation: starFlickerShimmer 4.3s ease-in-out infinite 3.1s;
}

.dot-7 {
  top: 91%;
  left: 76%;
  width: 2.5px;
  height: 2.5px;
  animation: starBlinkFast 2.6s ease-in-out infinite 0.5s;
}

/* Top Row: Avatars & Days Together */
.hero-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.hero-avatar-duo {
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  padding: 2px;
}

.hero-avatar-duo:active {
  transform: scale(0.95);
}

.avatar-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2.5px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 17px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.avatar-mine {
  background: #0f172a;
  color: #ffffff;
  z-index: 2;
}

.avatar-theirs {
  background: #2dd4bf;
  color: #ffffff;
  margin-left: -12px;
  z-index: 1;
}

.avatar-heart-pill {
  position: absolute;
  top: -5px;
  left: 31px;
  z-index: 3;
  color: #f43f5e;
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
}

.heart-pulse-icon {
  animation: heartbeat 2.2s infinite ease-in-out;
}

/* Glassmorphic Anniversary Badge */
.anniversary-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 5px 12px 5px 8px;
  border-radius: 16px;
  backdrop-filter: blur(12px);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.anniversary-badge:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}

.anniversary-badge:active {
  transform: scale(0.95);
}

.anniversary-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(251, 113, 133, 0.12) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(244, 63, 94, 0.2);
}

.anniversary-flame-icon {
  color: #fb7185;
  font-size: 16px;
}

.anniversary-text-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.anniversary-days {
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.anniversary-sub {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 2px;
}

.hero-body {
  margin-top: 14px;
  position: relative;
  z-index: 2;
}

.hero-header-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.hero-nest-name {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 0;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  word-break: break-word;
  overflow-wrap: break-word;
}

.hero-stage-badge-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.hero-stage-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 4px 12px;
  border-radius: 999px;
  backdrop-filter: blur(8px);
  color: #ffffff;
}

.stage-icon-svg {
  font-size: 14px;
  color: #34d399;
  flex-shrink: 0;
}

.hero-celebrate-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: #ffffff;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}

.hero-celebrate-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.hero-celebrate-btn:active {
  transform: scale(0.93);
}

.hero-stage-quote {
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #34d399;
  border-radius: 0 12px 12px 0;
  padding: 8px 12px;
  margin-top: 10px;
}

.hero-stage-desc {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.88);
  margin: 0;
}

/* 3-Metric Quick Stats Strip */
.hero-metrics-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 8px 14px;
  margin-top: 14px;
  position: relative;
  z-index: 2;
}

.hero-metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  text-align: center;
}

.metric-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
}

.metric-val {
  font-size: 13.5px;
  font-weight: 800;
  color: #ffffff;
  margin-top: 2px;
  letter-spacing: -0.01em;
}

.metric-divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.12);
}

/* XP Progress Bar */
.hero-progress-box {
  margin-top: 14px;
  position: relative;
  z-index: 2;
}

.hero-progress-track {
  height: 7.5px;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.hero-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ffffff 0%, #cbd5e1 70%, #94a3b8 100%);
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
}

.hero-progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  margin-top: 6px;
  font-weight: 600;
}

.xp-current {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #f1f5f9;
  font-weight: 700;
}

.xp-icon {
  font-size: 12px;
  color: #ffffff;
}

.xp-next {
  color: rgba(255, 255, 255, 0.7);
}

.xp-next strong {
  color: #ffffff;
}

/* Keyframe Animations */
@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.22);
  }
}

@keyframes floatUp {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

@keyframes auraPulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.1);
  }
}

@keyframes starBlinkFast {
  0%, 100% {
    opacity: 0.12;
    transform: scale(0.65);
  }
  30% {
    opacity: 0.18;
    transform: scale(0.7);
  }
  36% {
    opacity: 0.95;
    transform: scale(1.25);
  }
  44% {
    opacity: 0.25;
    transform: scale(0.75);
  }
  75% {
    opacity: 0.65;
    transform: scale(1.05);
  }
}

@keyframes starFlickerShimmer {
  0%, 100% {
    opacity: 0.15;
    transform: scale(0.75);
  }
  18% {
    opacity: 0.85;
    transform: scale(1.15);
  }
  26% {
    opacity: 0.22;
    transform: scale(0.8);
  }
  38% {
    opacity: 0.92;
    transform: scale(1.2);
  }
  65% {
    opacity: 0.15;
    transform: scale(0.7);
  }
}

@keyframes starGlowSlow {
  0%, 100% {
    opacity: 0.15;
    transform: scale(0.75);
  }
  50% {
    opacity: 0.78;
    transform: scale(1.12);
  }
}

/* SECTION BADGES */
.section-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #0f172a;
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
  background: #f1f5f9;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}

.mood-details {
  flex: 1;
}

.mood-label-pill {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
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
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.nudge-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nudge-btn:active {
  transform: scale(0.92);
  background: #f1f5f9;
  border-color: #0f172a;
}

.nudge-icon-circle {
  color: #f43f5e;
}

.nudge-text {
  font-size: 10px;
  font-weight: 700;
  color: #475569;
  white-space: nowrap;
}

/* MINI TASKS LIST */
.view-all-link {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
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
  min-width: 0;
}

.mini-task-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  display: block;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
  line-height: 1.35;
}

.mini-task-assignee {
  font-size: 11px;
  color: #64748b;
}

.mini-task-pts {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  flex-shrink: 0;
  white-space: nowrap;
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
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
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
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 22px;
  padding: 18px;
}

.points-badge {
  color: #0f172a;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 10px;
  background: #f1f5f9;
  padding: 3px 9px;
  border-radius: 999px;
}

.add-goal-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #0f172a;
  border: 1px solid #0f172a;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.add-goal-btn:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
}

.add-goal-btn:active {
  transform: scale(0.96);
}

/* 1. DUO BALANCE & POINTS SECTION */
.duo-balance-section {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 14px;
  margin-top: 14px;
}

.duo-players-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.player-stat-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 0;
}

.player-stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
}

.player-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.player-avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.player-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.player-label-tag {
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.player-full-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-points-display {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin-top: -2px;
}

.player-points-num {
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
}

.player-points-unit {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
}

.player-tasks-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 3px 8px;
  border-radius: 999px;
  width: fit-content;
}

/* Duo Ratio & Balance Bar */
.duo-ratio-container {
  margin-top: 14px;
  padding: 0 2px;
}

.duo-ratio-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 7px;
}

.ratio-user-side,
.ratio-partner-side {
  display: flex;
  align-items: center;
  gap: 5px;
}

.ratio-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.ratio-text {
  letter-spacing: -0.01em;
}

.ratio-total-center-badge {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  color: #334155;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.center-sparkle {
  color: #f59e0b;
  font-size: 12px;
}

.duo-modern-bar-track {
  height: 8px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
  gap: 2px;
}

.duo-modern-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Harmony Callout Card */
.duo-harmony-card {
  margin-top: 12px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #fde68a;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.harmony-icon-bubble {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(217, 119, 6, 0.15);
}

.harmony-message-text {
  font-size: 11.5px;
  font-weight: 600;
  color: #92400e;
  margin: 0;
  line-height: 1.4;
}

/* 2. MILESTONES & REWARDS SECTION */
.milestones-unified-section {
  margin-top: 20px;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
}

.milestones-section-header {
  margin-bottom: 12px;
}

.milestones-title-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.milestones-heading {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.milestones-count-pill {
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.milestones-sub-desc {
  font-size: 12px;
  color: #64748b;
  margin: 3px 0 0 0;
  line-height: 1.4;
}

/* Filter Chips Scroll */
.milestones-filter-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 4px 2px 10px 2px;
  scrollbar-width: none;
}

.milestones-filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
  flex-shrink: 0;
}

.filter-chip:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.filter-chip.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.15);
}

.chip-icon {
  font-size: 13px;
}

.chip-count {
  font-size: 10px;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 6px;
  border-radius: 999px;
}

.filter-chip.active .chip-count {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* Milestones Grid */
.milestones-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.milestone-card-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px;
  transition: all 0.2s ease;
  min-width: 0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.milestone-card-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
}

.milestone-card-item.is-ready {
  border-color: #10b981;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);
}

.milestone-card-item.is-claimed {
  border-color: #e2e8f0;
  background: #f8fafc;
  opacity: 0.95;
}

.milestone-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.goal-scope-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  border-width: 1px;
  border-style: solid;
  letter-spacing: -0.01em;
  flex-shrink: 0;
}

.scope-mini-icon {
  font-size: 13px;
}

.milestone-top-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.goal-pts-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 800;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 2px 8px;
  border-radius: 999px;
}

.trophy-icon {
  font-size: 13px;
  color: #f59e0b;
}

.goal-edit-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.15s ease;
  padding: 0;
}

.goal-edit-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.milestone-text-block {
  margin-bottom: 10px;
  min-width: 0;
}

.milestone-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.milestone-desc {
  font-size: 12px;
  color: #64748b;
  margin: 3px 0 0 0;
  line-height: 1.4;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

/* Progress Wrap */
.milestone-progress-wrap {
  margin-top: 10px;
}

.milestone-progress-bar-bg {
  height: 6.5px;
  background: #f1f5f9;
  border: 1px solid #edf2f7;
  border-radius: 999px;
  overflow: hidden;
}

.milestone-progress-bar-fill {
  height: 100%;
  background: #0f172a;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.milestone-progress-bar-fill.fill-ready {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%) !important;
}

.milestone-progress-bar-fill.fill-claimed {
  background: #10b981 !important;
}

.milestone-progress-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 11px;
}

.milestone-current-pts {
  color: #475569;
  font-weight: 600;
}

.milestone-pct-badge {
  font-weight: 700;
  color: #0f172a;
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
  border-top: 1px dashed #e2e8f0;
}

.claim-reward-btn {
  width: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
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
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.claim-reward-btn:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.claim-reward-btn:active {
  transform: scale(0.98);
}

/* Claimed State Footer */
.milestone-claimed-action {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.claimed-note {
  font-size: 11.5px;
  color: #16a34a;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.heart-mini {
  color: #f43f5e;
  font-size: 12px;
}

.reactivate-goal-link {
  background: transparent;
  border: none;
  color: #0f172a;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  text-decoration: underline;
  transition: color 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.reactivate-icon {
  font-size: 13px;
}

.reactivate-goal-link:hover {
  color: #334155;
}

/* Empty Milestones State */
.empty-milestones-box {
  text-align: center;
  padding: 26px 16px;
  background: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  border-radius: 16px;
  margin-top: 6px;
}

.empty-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px auto;
  color: #0f172a;
  font-size: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #0f172a;
  color: #ffffff;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
  transition: all 0.2s ease;
}

.add-first-goal-btn:hover {
  background: #1e293b;
  transform: translateY(-1px);
}

.add-first-goal-btn:active {
  transform: scale(0.96);
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
  background: #f8fafc;
  border-color: #0f172a;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.scope-btn-icon {
  font-size: 22px;
  color: #64748b;
  flex-shrink: 0;
}

.scope-choice-btn.active .scope-btn-icon {
  color: #0f172a;
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
  background: #f1f5f9;
  border-color: #0f172a;
}

.preset-name {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.preset-pts {
  font-size: 10.5px;
  font-weight: 700;
  color: #0f172a;
  background: rgba(15, 23, 42, 0.08);
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
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
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
  color: #0f172a;
  background: #f1f5f9;
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
  background: #0f172a;
  border-color: #0f172a;
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

/* ========================================================== */
/* 4. LIVE SHARED DOODLE / KARTECZKA NA LODÓWCE CARD           */
/* ========================================================== */
.nest-doodle-card {
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.nest-doodle-card:active {
  transform: scale(0.99);
}

.doodle-header-status {
  display: flex;
  align-items: center;
}

.doodle-status-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.doodle-status-pill.drawing {
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: #e11d48;
  animation: doodlePillPulse 1.6s infinite ease-in-out;
}

.doodle-status-pill.author {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.doodle-status-pill.empty {
  background: #f8fafc;
  color: #94a3b8;
  border: 1px dashed #cbd5e1;
}

.live-dot-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #f43f5e;
  box-shadow: 0 0 6px #f43f5e;
}

@keyframes doodlePillPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.03); }
}

.nest-doodle-preview-box {
  position: relative;
  margin-top: 14px;
  min-height: 200px;
  background-color: #ffffff;
  background-image: radial-gradient(#e2e8f0 1.2px, transparent 1.2px);
  background-size: 20px 20px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.03), 0 2px 10px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-canvas-wrap {
  position: relative;
  width: 100%;
  height: 220px;
  display: flex;
  flex-direction: column;
}

.preview-mini-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-meta-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px 10px;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.75) 60%, transparent 100%);
  color: #64748b;
  font-size: 11px;
  pointer-events: none;
}

.meta-author {
  font-weight: 500;
  color: #334155;
}

.meta-author strong {
  color: #0f172a;
  font-weight: 700;
}

.meta-action-hint {
  font-size: 10.5px;
  color: #94a3b8;
  font-weight: 600;
}

/* EMPTY DOODLE STATE */
.doodle-empty-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  text-align: center;
  min-height: 200px;
  background-color: #fafbfc;
}

.empty-doodle-illustration {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.empty-brush-icon {
  font-size: 36px;
  color: #cbd5e1;
  transform: rotate(-15deg);
}

.empty-heart-icon {
  position: absolute;
  top: -4px;
  right: -8px;
  font-size: 17px;
  color: #fb7185;
  filter: drop-shadow(0 2px 6px rgba(251, 113, 133, 0.4));
}

.empty-doodle-title {
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}

.empty-doodle-sub {
  font-size: 12px;
  color: #64748b;
  max-width: 280px;
  margin: 0 0 16px;
  line-height: 1.45;
}

.doodle-start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 9999px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.16);
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease;
}

.doodle-start-btn:active {
  transform: scale(0.96);
  background: #1e293b;
}
</style>
