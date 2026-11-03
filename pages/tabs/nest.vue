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

      <div style="height: 30px;"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState } from '~/composables/useDuoState'
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
  getUserAccentColor
} = useDuoState()

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
</style>
