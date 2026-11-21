<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div class="nx-brand" aria-label="DuoNest">
              <img src="/logo.svg" alt="DuoNest" class="nx-brand-logo" />
            </div>
            <div class="nest-header-actions">
              <button
                v-if="partnerUser?.id"
                type="button"
                class="nest-partner-btn"
                @click="navigateTo('/tabs/relationship')"
                :aria-label="isPartnerOnline ? `${partnerUser?.name || 'Partner'} jest teraz online` : `${partnerUser?.name || 'Partner'} – ostatnia aktywność: ${partnerLastActiveText}`"
              >
                <span class="nest-partner-avatar" :style="{ backgroundColor: partnerUserAccentColor }">
                  <img
                    v-if="partnerUser?.avatar_url"
                    :src="partnerUser.avatar_url"
                    :alt="partnerUser.name || 'Partner'"
                  />
                  <span v-else>{{ (partnerUser?.name || 'P').charAt(0).toUpperCase() }}</span>
                </span>
                <span class="nest-partner-pip" :class="{ 'is-online': isPartnerOnline }"></span>
              </button>
              <button
                v-else
                type="button"
                class="dn-header-btn dn-header-btn--icon dn-header-btn--soft"
                @click="navigateTo('/pairing')"
                aria-label="Połącz konto z partnerem"
              >
                <ion-icon :icon="ioniconsPersonAddOutline" />
              </button>
              <button
                type="button"
                class="dn-header-btn dn-header-btn--icon dn-header-btn--soft"
                @click="navigateTo('/tabs/relationship?category=nest_settings')"
                aria-label="Ustawienia Gniazdka"
              >
                <ion-icon :icon="ioniconsSettingsOutline" />
              </button>
            </div>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <div class="nx-page">
        <!-- ===== 1. COUPLE SUMMARY ===== -->
        <section class="nx-summary">
          <!-- Who: avatars + names + level badge -->
          <div class="nx-summary-top">
            <button type="button" class="nx-couple" @click="navigateTo('/tabs/relationship')" aria-label="Profil relacji">
              <span class="nx-duo-avatars">
                <span class="nx-avatar" :style="{ backgroundColor: currentUserAccentColor }">
                  {{ (currentUser.name || 'T').charAt(0).toUpperCase() }}
                </span>
                <span class="nx-avatar nx-avatar--second" :style="{ backgroundColor: partnerUserAccentColor }">
                  {{ partnerUser ? (partnerUser.name || 'P').charAt(0).toUpperCase() : '?' }}
                </span>
                <span class="nx-avatar-heart"><ion-icon :icon="ioniconsHeart" /></span>
              </span>
              <span class="nx-couple-text">
                <span class="nx-couple-names">{{ currentUser.name || 'Ty' }} & {{ partnerUser?.name || 'Partner' }}</span>
                <span class="nx-couple-nest">{{ partnership?.nest_name || 'Nasze Ciepłe Gniazdko' }}</span>
              </span>
            </button>
          </div>

          <!-- How long: big number + playful tile cluster -->
          <div class="nx-days-row">
            <div class="nx-days">
              <span class="nx-days-num">{{ daysTogether }}</span>
              <span class="nx-days-label">dni razem</span>
            </div>
            <div class="nx-tiles" aria-hidden="true">
              <span class="nx-tile nx-tile--a"><ion-icon :icon="getStageIcon(nestLevel)" /></span>
              <span class="nx-tile nx-tile--b"><ion-icon :icon="ioniconsHeart" /></span>
              <span class="nx-tile nx-tile--c"><ion-icon :icon="ioniconsSparkles" /></span>
            </div>
          </div>

          <!-- Progress: white inset panel -->
          <div class="nx-level">
            <div class="nx-level-row">
              <span class="nx-level-badge">Poziom {{ nestLevel }}</span>
              <span class="nx-level-name">{{ currentStageName }}</span>
            </div>
            <div class="nx-bar"><div class="nx-bar-fill" :style="{ width: Math.max(levelProgress, 2) + '%' }"></div></div>
            <div class="nx-level-row nx-level-row--meta">
              <span>{{ nestPoints }} pkt</span>
              <span>jeszcze {{ pointsToNextLevel }} pkt do poziomu {{ nestLevel + 1 }}</span>
            </div>
          </div>
        </section>

        <!-- ===== 7. POINTS ===== -->
        <section class="nx-section">
          <div class="nx-section-head">
            <h3 class="nx-section-title">Punkty</h3>
            <span class="nx-section-meta">Razem {{ nestPoints }}</span>
          </div>
          <div class="nx-points">
            <div class="nx-points-col">
              <span class="nx-points-num">{{ userPoints }}</span>
              <span class="nx-row-sub">Ty · {{ userCompletedTasksCount }} zadań</span>
            </div>
            <div class="nx-points-col nx-points-col--right">
              <span class="nx-points-num">{{ partnerPoints }}</span>
              <span class="nx-row-sub">{{ partnerUser?.name || 'Partner' }} · {{ partnerCompletedTasksCount }} zadań</span>
            </div>
          </div>
          <div class="nx-split">
            <div class="nx-split-a" :style="{ width: userPointsPct + '%' }"></div>
            <div class="nx-split-b" :style="{ width: partnerPointsPct + '%' }"></div>
          </div>
          <p class="nx-note">{{ duoHarmonyMessage }}</p>
        </section>

        <!-- ===== 8. GOALS & REWARDS ===== -->
        <section class="nx-section">
          <div class="nx-section-head">
            <h3 class="nx-section-title">Cele i nagrody</h3>
            <button type="button" class="nx-round-btn" @click="openCreateMilestoneModal" aria-label="Dodaj cel">
              <ion-icon :icon="ioniconsAddOutline" />
            </button>
          </div>

          <div class="nx-chips" data-no-swipe>
            <button type="button" class="dn-filter-chip" :class="{ active: activeMilestoneFilter === 'all' }" @click="activeMilestoneFilter = 'all'">
              Wszystkie <span class="nx-chip-count">{{ milestonesList.length }}</span>
            </button>
            <button type="button" class="dn-filter-chip" :class="{ active: activeMilestoneFilter === 'shared' }" @click="activeMilestoneFilter = 'shared'">
              Wspólne <span class="nx-chip-count">{{ sharedCount }}</span>
            </button>
            <button type="button" class="dn-filter-chip" :class="{ active: activeMilestoneFilter === 'mine' }" @click="activeMilestoneFilter = 'mine'">
              Dla Ciebie <span class="nx-chip-count">{{ mineCount }}</span>
            </button>
            <button v-if="partnerUser" type="button" class="dn-filter-chip" :class="{ active: activeMilestoneFilter === 'theirs' }" @click="activeMilestoneFilter = 'theirs'">
              Dla {{ partnerUser.name || 'Partnera' }} <span class="nx-chip-count">{{ theirsCount }}</span>
            </button>
          </div>

          <div v-if="filteredMilestones.length > 0" class="nx-goals">
            <div
              v-for="goal in filteredMilestones"
              :key="goal.id"
              class="nx-goal"
              :class="{ 'is-ready': isGoalReady(goal), 'is-claimed': goal.is_completed }"
            >
              <div class="nx-goal-top">
                <div class="nx-row-body">
                  <span class="nx-row-title">{{ goal.title }}</span>
                  <span class="nx-row-sub">{{ getGoalScopeInfo(goal).label }}<template v-if="goal.description"> · {{ goal.description }}</template></span>
                </div>
                <button type="button" class="nx-icon-btn" @click.stop="openEditMilestoneModal(goal)" aria-label="Edytuj cel">
                  <ion-icon :icon="ioniconsCreateOutline" />
                </button>
              </div>
              <div class="nx-bar"><div class="nx-bar-fill" :style="{ width: getGoalProgressPct(goal) + '%' }"></div></div>
              <div class="nx-level-row nx-level-row--meta">
                <span>{{ goal.is_completed ? 'Zrealizowano' : `${Math.min(getGoalCurrentPoints(goal), goal.target_points)} / ${goal.target_points} pkt` }}</span>
                <span v-if="!goal.is_completed">{{ isGoalReady(goal) ? 'Gotowe' : `${getGoalProgressPct(goal)}%` }}</span>
                <button v-else type="button" class="nx-text-btn" @click="handleReactivateMilestone(goal)">Ustaw ponownie</button>
              </div>
              <button v-if="isGoalReady(goal)" type="button" class="dn-button-primary nx-claim" @click="handleClaimMilestone(goal)">
                <ion-icon :icon="ioniconsGiftOutline" />
                <span>Odbierzcie nagrodę</span>
              </button>
            </div>
          </div>
          <div v-else class="nx-empty-box">
            <p class="nx-empty">Brak celów w tej kategorii.</p>
            <button type="button" class="dn-button-secondary nx-empty-btn" @click="openCreateMilestoneModal">Dodaj cel</button>
          </div>
        </section>
        <!-- ===== 2. PARTNER MOOD ===== -->
        <section class="nx-section" v-if="partnerUser">
          <div class="nx-section-head">
            <h3 class="nx-section-title">Nastrój</h3>
            <span class="nx-section-meta">{{ formattedMoodTime }}</span>
          </div>
          <div class="nx-row">
            <div class="nx-row-icon">
              <DuoIcon :name="'mood-' + (partnerUser.current_mood || 'happy')" :size="22" />
            </div>
            <div class="nx-row-body">
              <span class="nx-row-title">{{ partnerUser.name }} · {{ getMoodLabel(partnerUser.current_mood) }}</span>
              <span class="nx-row-sub">{{ partnerUser.mood_note ? `„${partnerUser.mood_note}”` : 'Bez notatki na dziś' }}</span>
            </div>
          </div>
        </section>

        <!-- ===== 3. PARTNER MUSIC ===== -->
        <DuoMusicCard
          v-if="partnerPlayback"
          :playback="partnerPlayback"
          :user-name="partnerUser?.name || 'Partner'"
        />

        <!-- ===== 4. GESTURES ===== -->
        <section class="nx-section">
          <div class="nx-section-head">
            <h3 class="nx-section-title">Drobny gest</h3>
            <span class="nx-section-meta">{{ hasSentDailyNudge ? 'Wysłano dziś' : '+5 pkt' }}</span>
          </div>

          <div v-if="hasSentDailyNudge" class="nx-row">
            <div class="nx-row-icon nx-row-icon--ink">
              <ion-icon :icon="ioniconsCheckmarkOutline" />
            </div>
            <div class="nx-row-body">
              <span class="nx-row-title">{{ partnerUser?.name || 'Partner' }} dostał(a) Twój gest</span>
              <span class="nx-row-sub">Kolejny za {{ formattedNextNudgeTime }}</span>
            </div>
          </div>

          <div v-else class="nx-gestures" data-no-swipe>
            <button
              v-for="n in nudgePresets"
              :key="n.id"
              type="button"
              class="nx-gesture"
              @click="sendQuickNudge(n.id, n.defaultMsg)"
            >
              <span class="nx-gesture-icon"><DuoIcon :name="'nudge-' + n.id" :size="22" /></span>
              <span class="nx-gesture-label">{{ n.title }}</span>
            </button>
          </div>
        </section>

        <!-- ===== 5. TODAY ===== -->
        <section class="nx-section">
          <div class="nx-section-head">
            <h3 class="nx-section-title">Na dziś</h3>
            <NuxtLink to="/tabs/tasks" class="nx-link">Wszystkie</NuxtLink>
          </div>

          <div v-if="pendingChores.length > 0" class="nx-list">
            <button
              v-for="task in pendingChores.slice(0, 3)"
              :key="task.id"
              type="button"
              class="nx-list-row"
              @click="toggleTask(task.id)"
            >
              <span class="nx-check" :class="{ checked: task.is_completed }">
                <ion-icon v-if="task.is_completed" :icon="ioniconsCheckmarkOutline" />
              </span>
              <span class="nx-row-body">
                <span class="nx-row-title">{{ task.title }}</span>
                <span class="nx-row-sub">
                  {{ task.assigned_to ? (task.assigned_to === currentUser?.id ? 'Dla Ciebie' : ('Dla ' + (partnerUser?.name || 'partnera'))) : 'Wspólne' }}
                </span>
              </span>
              <span class="nx-row-trail">+{{ task.points }}</span>
            </button>
          </div>
          <p v-else class="nx-empty">Wszystko zrobione. Czas na relaks.</p>

          <NuxtLink v-if="upcomingEvent" to="/tabs/calendar" class="nx-event">
            <span class="nx-event-date">
              <span class="nx-event-day">{{ new Date(upcomingEvent.start_time).getDate() }}</span>
              <span class="nx-event-month">{{ new Date(upcomingEvent.start_time).toLocaleDateString('pl-PL', { month: 'short' }).replace('.', '') }}</span>
            </span>
            <span class="nx-row-body">
              <span class="nx-row-title">{{ upcomingEvent.title }}</span>
              <span class="nx-row-sub">{{ formatEventDate(upcomingEvent.start_time) }}</span>
            </span>
            <ion-icon :icon="ioniconsChevronForwardOutline" class="nx-chevron" />
          </NuxtLink>
        </section>

        <!-- ===== 6. SHARED DOODLE ===== -->
        <section class="nx-section">
          <div class="nx-section-head">
            <h3 class="nx-section-title">Wspólny rysunek</h3>
            <span v-if="isPartnerDrawing" class="nx-live">
              <span class="nx-live-dot"></span>{{ partnerUser?.name || 'Partner' }} rysuje
            </span>
            <span v-else-if="hasDoodleContent" class="nx-section-meta">{{ currentDoodle?.author_name }}</span>
          </div>
          <button type="button" class="nx-doodle" @click="isDoodleModalOpen = true">
            <canvas v-show="hasDoodleContent" ref="previewCanvasRef" class="nx-doodle-canvas"></canvas>
            <span v-show="!hasDoodleContent" class="nx-doodle-empty">
              <ion-icon :icon="ioniconsBrushOutline" />
              <span>Narysuj coś dla {{ partnerUser?.name || 'partnera' }}</span>
            </span>
          </button>
        </section>

      </div>

      <!-- MODAL: ADD / EDIT MILESTONE GOAL (NO EMOJI - CLEAN SCOPE SELECTOR) -->
      <ion-modal
        :is-open="isMilestoneModalOpen"
        @didDismiss="closeMilestoneModal"
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
                <div class="dn-form-sheet-title-text">
                  <h3 class="dn-form-sheet-title">{{ editingMilestoneId ? 'Edytuj cel' : 'Nowy cel' }}</h3>
                  <span class="dn-form-sheet-subtitle">Nagroda za wspólnie zebrane punkty</span>
                </div>
              </div>
              <button type="button" class="dn-form-sheet-close" @click="closeMilestoneModal" aria-label="Zamknij">
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
        <div class="modal-wrapper-inner">

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
              <ion-input aria-label="Nazwa nagrody"
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
                <ion-input aria-label="Wymagane punkty"
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
              <ion-textarea aria-label="Dodatkowe ustalenia"
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
                :disabled="isSavingMilestone"
              >
                <ion-icon :icon="ioniconsTrashOutline" />
                <span>Usuń cel</span>
              </button>
              <button
                type="button"
                class="save-milestone-btn dn-button-sea"
                @click="saveMilestone"
                :disabled="isSavingMilestone || !milestoneForm.title.trim() || !milestoneForm.target_points || Number(milestoneForm.target_points) < 10"
              >
                <ion-icon :icon="ioniconsCheckmarkDoneOutline" />
                <span>{{ editingMilestoneId ? 'Zapisz zmiany' : 'Utwórz cel' }}</span>
              </button>
            </div>
          </div>
        </div>
        </ion-content>
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
import { useMusic } from '~/composables/useMusic'
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
const {
  partnerPlayback,
  startMusicPolling,
  stopMusicPolling
} = useMusic()

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

  const dpr = Math.max(window.devicePixelRatio || 1, 2)
  const targetW = Math.round(rect.width * dpr)
  const targetH = Math.round(rect.height * dpr)

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
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

// The preview must be redrawn whenever the canvas gets a real size or loses its
// pixels: it is 0×0 while hidden (v-show) or during the Ionic page transition,
// resizing clears it, and iOS drops canvas backing stores of backgrounded apps.
let previewResizeObserver: ResizeObserver | null = null
let previewRaf = 0
const schedulePreviewRender = () => {
  if (typeof window === 'undefined') return
  cancelAnimationFrame(previewRaf)
  previewRaf = requestAnimationFrame(() => renderPreviewCanvas())
}
const onPreviewVisibility = () => {
  if (!document.hidden) schedulePreviewRender()
}

watch(previewCanvasRef, (canvas, prev) => {
  if (!previewResizeObserver && typeof ResizeObserver !== 'undefined') {
    previewResizeObserver = new ResizeObserver(() => schedulePreviewRender())
  }
  if (prev) previewResizeObserver?.unobserve(prev)
  if (canvas) {
    previewResizeObserver?.observe(canvas)
    canvas.addEventListener('contextrestored', schedulePreviewRender)
  }
}, { immediate: true, flush: 'post' })

onIonViewDidEnter(() => schedulePreviewRender())

const liveNowMs = ref(Date.now())
let activityTimer: any = null

onMounted(async () => {
  if (typeof window !== 'undefined') {
    document.addEventListener('visibilitychange', onPreviewVisibility)
    window.addEventListener('pageshow', schedulePreviewRender)
    activityTimer = setInterval(() => {
      liveNowMs.value = Date.now()
    }, 20000)
  }

  startMusicPolling()

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
  previewResizeObserver?.disconnect()
  previewResizeObserver = null
  cancelAnimationFrame(previewRaf)
  document.removeEventListener('visibilitychange', onPreviewVisibility)
  window.removeEventListener('pageshow', schedulePreviewRender)
  stopMusicPolling()
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
const isSavingMilestone = ref(false)
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

const saveMilestone = async () => {
  const { title, target_points, assigned_to, description } = milestoneForm.value
  const points = Number(target_points)
  if (isSavingMilestone.value || !title.trim() || !Number.isFinite(points) || points < 10) return
  const id = editingMilestoneId.value
  isSavingMilestone.value = true
  try {
    const saved = id
      ? await updateMilestone(id, { title: title.trim(), target_points: points, assigned_to, description: description.trim() })
      : await addMilestone(title, points, assigned_to, description)
    if (saved) closeMilestoneModal()
  } finally {
    isSavingMilestone.value = false
  }
}

const removeCurrentMilestone = async () => {
  const id = editingMilestoneId.value
  if (id && !isSavingMilestone.value) {
    const confirmed = await confirm({
      title: 'Usuń wspólny cel',
      message: 'Czy na pewno chcesz usunąć ten cel z Waszego Gniazdka?',
      itemHighlight: milestoneForm.value.title || '',
      confirmText: 'Usuń cel',
      cancelText: 'Anuluj',
      type: 'danger',
      icon: 'trash'
    })
    if (confirmed && !isSavingMilestone.value && editingMilestoneId.value === id) {
      isSavingMilestone.value = true
      try {
        if (await deleteMilestone(id)) closeMilestoneModal()
      } finally {
        isSavingMilestone.value = false
      }
    }
  }
}

const handleClaimMilestone = async (goal: any) => {
  if (!(await claimMilestone(goal.id))) return
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
  border-bottom: 1px solid rgba(229, 230, 232, 0.8);
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
  object-fit: contain;
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
  font-weight: 700;
  color: #1c1b19;
  letter-spacing: -0.025em;
  display: block;
  line-height: 1.1;
}

.brand-sub {
  font-size: 11px;
  color: #737373;
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
  background: var(--dn-soft);
  border: none;
  border-radius: 999px;
  padding: 4px 12px 4px 4px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: none;
  max-width: 185px;
}

.couple-indicator-badge:hover {
  background: #f8f9fb;
  border-color: rgba(28, 27, 25, 0.16);
  box-shadow: none;
}

.couple-indicator-badge:active {
  transform: scale(0.96);
}

.couple-indicator-badge.is-online {
  border-color: rgba(142, 142, 142, 0.25);
  box-shadow: none;
}

.couple-indicator-badge.is-online:hover {
  background: #f8f9fb;
  border-color: rgba(142, 142, 142, 0.4);
}

.couple-indicator-badge.not-paired {
  border-style: dashed;
  border-color: #d4d4d4;
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
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25), 0 1px 3px rgba(28, 27, 25, 0.12);
  overflow: hidden;
}

.partner-avatar-mini.unpaired-avatar {
  background: #1c1b19;
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
  font-weight: 700;
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
  background: #a2a2a2;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 2px rgba(28, 27, 25, 0.15);
  transition: all 0.25s ease;
}

.status-pip.is-online {
  background: #8e8e8e;
  box-shadow: none;
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
  line-height: 1.3;
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
  color: #1c1b19;
  letter-spacing: -0.015em;
  line-height: 1.35;
  padding-bottom: 2px;
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
  color: #6f6f6f;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.3;
  padding-bottom: 1px;
}

.status-pulse-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #8e8e8e;
  display: inline-block;
  box-shadow: none;
}

.status-time-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  font-weight: 600;
  color: #737373;
  line-height: 1.3;
  padding-bottom: 1px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-clock-icon {
  font-size: 10.5px;
  color: #a2a2a2;
  flex-shrink: 0;
}

.partner-time-sub {
  font-size: 9.5px;
  font-weight: 500;
  color: #a2a2a2;
  line-height: 1.3;
  padding-bottom: 1px;
}

/* QUICK SETTINGS BUTTON */
.quick-gear-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--dn-soft);
  color: #1c1b19;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 0;
  box-shadow: none;
  flex-shrink: 0;
}

.quick-gear-btn:hover {
  background: #f8f9fb;
  color: #1c1b19;
  border-color: rgba(28, 27, 25, 0.16);
  transform: rotate(25deg);
  box-shadow: none;
}

.quick-gear-btn:active {
  transform: scale(0.92);
}

/* ========================================================== */
/* ENRICHED NEST HERO CARD (ATMOSPHERIC, WARM & INTERACTIVE)  */
/* ========================================================== */
.nest-hero-card {
  background: linear-gradient(135deg, #1c1b19 0%, #1c1b19 45%, #1c1b19 100%);
  color: #ffffff;
  border-radius: 24px;
  padding: 20px 20px 18px 20px;
  position: relative;
  overflow: hidden;
  box-shadow: none;
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
  background: radial-gradient(circle, rgba(217, 104, 86, 0.22) 0%, transparent 70%);
}

.glow-bottom-left {
  bottom: -30px;
  left: -20px;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(163, 163, 163, 0.18) 0%, transparent 70%);
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
  filter: drop-shadow(0 0 3px rgba(236, 237, 239, 0.45));
}

.star-1 {
  top: 9%;
  left: 42%;
  font-size: 11px;
  color: #ecedef;
  animation: starBlinkFast 3.4s ease-in-out infinite 0.2s;
}

.star-2 {
  top: 18%;
  left: 69%;
  font-size: 8px;
  color: #e0e0e0;
  animation: starFlickerShimmer 4.1s ease-in-out infinite 1.5s;
}

.star-3 {
  top: 42%;
  left: 86%;
  font-size: 10px;
  color: #ecedef;
  animation: starGlowSlow 5.2s ease-in-out infinite 0.8s;
}

.star-4 {
  top: 50%;
  left: 12%;
  font-size: 8px;
  color: #e5e6e8;
  animation: starBlinkFast 2.8s ease-in-out infinite 2.1s;
}

.star-5 {
  top: 76%;
  left: 64%;
  font-size: 9px;
  color: #ecedef;
  animation: starFlickerShimmer 3.9s ease-in-out infinite 0.6s;
}

.star-6 {
  top: 86%;
  left: 26%;
  font-size: 8px;
  color: #e0e0e0;
  animation: starGlowSlow 4.7s ease-in-out infinite 2.8s;
}

/* Micro Star Dust Dots */
.decor-star-dot {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 4px rgba(236, 237, 239, 0.85);
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
  font-weight: 700;
  font-size: 17px;
  box-shadow: none;
}

.avatar-mine {
  background: #1c1b19;
  color: #ffffff;
  z-index: 2;
}

.avatar-theirs {
  background: #bebebe;
  color: #ffffff;
  margin-left: -12px;
  z-index: 1;
}

.avatar-heart-pill {
  position: absolute;
  top: -5px;
  left: 31px;
  z-index: 3;
  color: #d96856;
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(28, 27, 25, 0.4));
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
  background: linear-gradient(135deg, rgba(217, 104, 86, 0.25) 0%, rgba(217, 104, 86, 0.12) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

.anniversary-flame-icon {
  color: #d96856;
  font-size: 16px;
}

.anniversary-text-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.anniversary-days {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.anniversary-sub {
  font-size: 8.5px;
  font-weight: 700;
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
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 0;
  text-shadow: 0 2px 6px rgba(28, 27, 25, 0.25);
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
  color: #bbbbbb;
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
  border-left: 3px solid #bbbbbb;
  border-radius: 0 12px 12px 0;
  padding: 8px 12px;
  margin-top: 10px;
}

.hero-stage-desc {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(229, 230, 232, 0.88);
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
  font-weight: 700;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
}

.metric-val {
  font-size: 13.5px;
  font-weight: 700;
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
  box-shadow: inset 0 1px 2px rgba(28, 27, 25, 0.2);
}

.hero-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ffffff 0%, #d4d4d4 70%, #a2a2a2 100%);
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: none;
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
  color: #f2f3f5;
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #737373;
  text-transform: uppercase;
  display: block;
  line-height: 1.35;
  margin-bottom: 3px;
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
  color: #1c1b19;
}

/* MOOD WIDGET */
.partner-mood-body {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #f8f9fb;
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid #e5e6e8;
}

.mood-icon-bubble {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: #f2f3f5;
  color: #1c1b19;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: none;
}

.mood-details {
  flex: 1;
}

.mood-label-pill {
  font-size: 12px;
  font-weight: 700;
  color: #1c1b19;
  display: inline-block;
  line-height: 1.35;
  padding-bottom: 1px;
  margin-bottom: 2px;
}

.mood-note-quote {
  font-size: 13px;
  color: #404040;
  font-style: italic;
  margin: 0;
  line-height: 1.3;
}

.mood-note-empty {
  font-size: 12px;
  color: #a2a2a2;
  margin: 0;
}

.mood-time {
  font-size: 11px;
  color: #a2a2a2;
  font-weight: 600;
}

/* NUDGE CARD */
.nudge-sub {
  font-size: 12px;
  color: #737373;
  margin: -4px 0 12px 0;
}

.nudge-points-tag {
  font-size: 11px;
  font-weight: 500;
  color: var(--dn-ink);
  background: var(--dn-soft);
  padding: 2px 8px;
  border-radius: 999px;
  border: none;
}

.nudge-points-tag.points-done {
  background: #f2f3f5;
  color: #6f6f6f;
  border-color: #dadada;
}

.nudge-already-sent-box {
  background: linear-gradient(135deg, #f8f9fb 0%, #f7f8fa 100%);
  border: 1px solid #e7e8ea;
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
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: none;
}

.sent-status-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sent-title {
  font-size: 13px;
  font-weight: 700;
  color: #6f6f6f;
}

.sent-subtitle {
  font-size: 12px;
  color: #585858;
}

.nudge-timer-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--dn-soft);
  border: none;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  color: #585858;
  box-shadow: none;
  width: fit-content;
}

.timer-clock-icon {
  font-size: 15px;
  color: #8e8e8e;
}

.nudge-actions-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.nudge-btn {
  background: #ffffff;
  border: 1px solid var(--dn-line);
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
  background: #f2f3f5;
  border-color: #1c1b19;
}

.nudge-icon-circle {
  color: #d96856;
}

.nudge-text {
  font-size: 10px;
  font-weight: 700;
  color: #545454;
  white-space: nowrap;
}

/* MINI TASKS LIST */
.view-all-link {
  font-size: 12px;
  font-weight: 700;
  color: #1c1b19;
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
  background: #f8f9fb;
  border-radius: 12px;
  border: 1px solid #e5e6e8;
  cursor: pointer;
}

.checkbox-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #a2a2a2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #ffffff;
  transition: all 0.2s ease;
}

.checkbox-circle.checked {
  background: #8e8e8e;
  border-color: #8e8e8e;
}

.mini-task-details {
  flex: 1;
  min-width: 0;
}

.mini-task-title {
  font-size: 13px;
  font-weight: 600;
  color: #1c1b19;
  display: block;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
  line-height: 1.35;
}

.mini-task-assignee {
  font-size: 11px;
  color: #737373;
}

.mini-task-pts {
  font-size: 11px;
  font-weight: 700;
  color: #1c1b19;
  flex-shrink: 0;
  white-space: nowrap;
}

.empty-mini-card {
  padding: 14px;
  text-align: center;
  font-size: 12px;
  color: #737373;
  background: #f8f9fb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.check-icon {
  font-size: 18px;
  color: #8e8e8e;
}

/* EVENT SUMMARY */
.event-desc {
  font-size: 13px;
  color: #545454;
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
  font-weight: 500;
  color: var(--dn-ink);
  background: var(--dn-soft);
  border: none;
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

.add-goal-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #1c1b19;
  border: 1px solid #1c1b19;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.add-goal-btn:hover {
  background: #1c1b19;
  transform: translateY(-1px);
  box-shadow: none;
}

.add-goal-btn:active {
  transform: scale(0.96);
}

/* 1. DUO BALANCE & POINTS SECTION */
.duo-balance-section {
  background: linear-gradient(180deg, #f8f9fb 0%, #f2f3f5 100%);
  border: 1px solid #e5e6e8;
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
  border: 1px solid var(--dn-line);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  min-width: 0;
}

.player-stat-card:hover {
  transform: translateY(-1px);
  box-shadow: none;
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
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
  box-shadow: none;
}

.player-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.player-label-tag {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a2a2a2;
}

.player-full-name {
  font-size: 13px;
  font-weight: 700;
  color: #1c1b19;
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
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
}

.player-points-unit {
  font-size: 11.5px;
  font-weight: 700;
  color: #737373;
}

.player-tasks-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 500;
  color: #545454;
  background: var(--dn-soft);
  border: none;
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
  background: var(--dn-soft);
  border: none;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  color: #404040;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: none;
}

.center-sparkle {
  color: #b1b1b1;
  font-size: 12px;
}

.duo-modern-bar-track {
  height: 8px;
  background: #e5e6e8;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  box-shadow: inset 0 1px 2px rgba(28, 27, 25, 0.06);
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
  background: linear-gradient(135deg, #f9fafc 0%, #f1f2f4 100%);
  border: 1px solid #e4e5e7;
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
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  box-shadow: none;
}

.harmony-message-text {
  font-size: 11.5px;
  font-weight: 600;
  color: #585858;
  margin: 0;
  line-height: 1.4;
}

/* 2. MILESTONES & REWARDS SECTION */
.milestones-unified-section {
  margin-top: 20px;
  border-top: 1px solid #f2f3f5;
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
  font-weight: 700;
  color: #1c1b19;
  margin: 0;
}

.milestones-count-pill {
  font-size: 11px;
  font-weight: 500;
  color: #1c1b19;
  background: var(--dn-soft);
  border: none;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.milestones-sub-desc {
  font-size: 12px;
  color: #737373;
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
  background: var(--dn-soft);
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dn-ink);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
  flex-shrink: 0;
}

.filter-chip:hover {
  background: #f2f3f5;
  color: #1c1b19;
}

.filter-chip.active {
  background: #1c1b19;
  border-color: #1c1b19;
  color: #ffffff;
  box-shadow: none;
}

.chip-icon {
  font-size: 13px;
}

.chip-count {
  font-size: 10px;
  font-weight: 700;
  background: rgba(28, 27, 25, 0.06);
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
  border: 1px solid var(--dn-line);
  border-radius: 16px;
  padding: 14px;
  transition: all 0.2s ease;
  min-width: 0;
  overflow: hidden;
  box-shadow: none;
}

.milestone-card-item:hover {
  border-color: #d4d4d4;
  box-shadow: none;
}

.milestone-card-item.is-ready {
  border-color: #a3a3a3;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fb 100%);
  box-shadow: none;
}

.milestone-card-item.is-claimed {
  border-color: #e5e6e8;
  background: #f8f9fb;
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
  font-weight: 500;
  color: #1c1b19;
  background: var(--dn-soft);
  border: none;
  padding: 2px 8px;
  border-radius: 999px;
}

.trophy-icon {
  font-size: 13px;
  color: #b1b1b1;
}

.goal-edit-btn {
  background: var(--dn-soft);
  border: none;
  color: var(--dn-ink);
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
  background: #f2f3f5;
  color: #1c1b19;
  border-color: #d4d4d4;
}

.milestone-text-block {
  margin-bottom: 10px;
  min-width: 0;
}

.milestone-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #1c1b19;
  margin: 0;
  line-height: 1.35;
  word-break: break-word;
  overflow-wrap: break-word;
  min-width: 0;
}

.milestone-desc {
  font-size: 12px;
  color: #737373;
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
  background: var(--dn-soft);
  border: none;
  border-radius: 999px;
  overflow: hidden;
}

.milestone-progress-bar-fill {
  height: 100%;
  background: #1c1b19;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.milestone-progress-bar-fill.fill-ready {
  background: linear-gradient(90deg, #a3a3a3 0%, #838383 100%) !important;
}

.milestone-progress-bar-fill.fill-claimed {
  background: #a3a3a3 !important;
}

.milestone-progress-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 11px;
}

.milestone-current-pts {
  color: #545454;
  font-weight: 600;
}

.milestone-pct-badge {
  font-weight: 700;
  color: #1c1b19;
}

.milestone-card-item.is-ready .milestone-pct-badge {
  color: #838383;
  font-weight: 700;
}

.milestone-claimed-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8e8e8e;
  font-weight: 700;
}

/* Claim Button */
.milestone-claim-action {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e5e6e8;
}

.claim-reward-btn {
  width: 100%;
  background: linear-gradient(135deg, #1c1b19 0%, #1c1b19 100%);
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
  box-shadow: none;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.claim-reward-btn:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow: none;
}

.claim-reward-btn:active {
  transform: scale(0.98);
}

/* Claimed State Footer */
.milestone-claimed-action {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e5e6e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.claimed-note {
  font-size: 11.5px;
  color: #8e8e8e;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.heart-mini {
  color: #d96856;
  font-size: 12px;
}

.reactivate-goal-link {
  background: transparent;
  border: none;
  color: #1c1b19;
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
  color: #404040;
}

/* Empty Milestones State */
.empty-milestones-box {
  text-align: center;
  padding: 26px 16px;
  background: #f8f9fb;
  border: 1.5px dashed #d4d4d4;
  border-radius: 16px;
  margin-top: 6px;
}

.empty-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--dn-soft);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px auto;
  color: #1c1b19;
  font-size: 20px;
  box-shadow: none;
}

.empty-milestones-box h6 {
  font-size: 14px;
  font-weight: 700;
  color: #1c1b19;
  margin: 0 0 4px 0;
}

.empty-milestones-box p {
  font-size: 12px;
  color: #737373;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.add-first-goal-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1c1b19;
  color: #ffffff;
  padding: 7px 16px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.2s ease;
}

.add-first-goal-btn:hover {
  background: #1c1b19;
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
  padding: 4px 0 calc(24px + env(safe-area-inset-bottom));
}

.modal-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-header-bar h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1c1b19;
  margin: 0;
}

.modal-close-icon-btn {
  background: var(--dn-soft);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dn-ink);
  cursor: pointer;
  font-size: 18px;
}

.modal-form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  background: #f8f9fb;
  border: 1.5px solid #e5e6e8;
  border-radius: 14px;
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.scope-choice-btn:hover {
  background: #f2f3f5;
}

.scope-choice-btn.active {
  background: #f8f9fb;
  border-color: #1c1b19;
  box-shadow: none;
}

.scope-btn-icon {
  font-size: 22px;
  color: #737373;
  flex-shrink: 0;
}

.scope-choice-btn.active .scope-btn-icon {
  color: #1c1b19;
}

.scope-btn-texts {
  display: flex;
  flex-direction: column;
}

.scope-btn-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #1c1b19;
}

.scope-btn-sub {
  font-size: 11px;
  color: #737373;
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
  background: #f8f9fb;
  border: 1px solid #e5e6e8;
  border-radius: 12px;
  padding: 7px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.text-preset-chip:hover {
  background: #f2f3f5;
}

.text-preset-chip.active {
  background: #f2f3f5;
  border-color: #1c1b19;
}

.preset-name {
  font-size: 12px;
  font-weight: 600;
  color: #1c1b19;
}

.preset-pts {
  font-size: 10.5px;
  font-weight: 700;
  color: #1c1b19;
  background: rgba(28, 27, 25, 0.08);
  padding: 2px 6px;
  border-radius: 999px;
}

/* Modal Inputs */
.modal-styled-input {
  width: 100%;
  --padding-start: 14px;
  --padding-end: 14px;
  --background: var(--dn-field);
  --border-radius: 14px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--dn-field-line);
  font-size: 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-height: 52px;
}

.modal-styled-input:focus-within {
  border-color: var(--dn-ink);
  box-shadow: 0 0 0 3px rgba(28, 27, 25, 0.06);
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
  font-weight: 500;
  color: #1c1b19;
  background: var(--dn-soft);
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
  color: #737373;
  pointer-events: none;
  z-index: 3;
}

.quick-pts-label {
  font-size: 11px;
  font-weight: 600;
  color: #737373;
  margin-top: 4px;
}

.quick-pts-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pts-option-pill {
  background: var(--dn-soft);
  border: none;
  color: #545454;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pts-option-pill.active {
  background: #1c1b19;
  border-color: #1c1b19;
  color: #ffffff;
}

/* Modal Actions Footer */
.modal-actions-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #f2f3f5;
}

.delete-milestone-btn {
  background: #f3f4f6;
  border: 1px solid #fcefec;
  color: #c2412d;
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
  background: #e6e7e9;
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
  background: rgba(217, 104, 86, 0.12);
  border: 1px solid rgba(217, 104, 86, 0.35);
  color: #c2412d;
  animation: doodlePillPulse 1.6s infinite ease-in-out;
}

.doodle-status-pill.author {
  background: #f2f3f5;
  color: #545454;
  border: 1px solid #e5e6e8;
}

.doodle-status-pill.empty {
  background: #f8f9fb;
  color: #a2a2a2;
  border: 1px dashed #d4d4d4;
}

.live-dot-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #d96856;
  box-shadow: none;
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
  background-image: radial-gradient(#e5e6e8 1.2px, transparent 1.2px);
  background-size: 20px 20px;
  border-radius: 18px;
  border: 1px solid #e5e6e8;
  box-shadow: inset 0 1px 3px rgba(28, 27, 25, 0.03), 0 2px 10px rgba(28, 27, 25, 0.04);
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
  color: #737373;
  font-size: 11px;
  pointer-events: none;
}

.meta-author {
  font-weight: 500;
  color: #404040;
}

.meta-author strong {
  color: #1c1b19;
  font-weight: 700;
}

.meta-action-hint {
  font-size: 10.5px;
  color: #a2a2a2;
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
  background-color: #f9fafc;
}

.empty-doodle-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.empty-brush-icon {
  font-size: 32px;
  color: #a2a2a2;
}

.empty-doodle-title {
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #1c1b19;
  margin: 0 0 4px;
}

.empty-doodle-sub {
  font-size: 12px;
  color: #737373;
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
  background: #1c1b19;
  color: #ffffff;
  border: none;
  box-shadow: none;
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease;
}

.doodle-start-btn:active {
  transform: scale(0.96);
  background: #1c1b19;
}

/* ---------- Header (Minimal) ---------- */
.header-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-action-row .dn-header-title {
  min-width: 0;
}

.header-action-row .dn-header-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nest-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.nest-partner-btn {
  position: relative;
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}

.nest-partner-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.nest-partner-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nest-partner-pip {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  background: #c3c6cc;
}

.nest-partner-pip.is-online {
  background: #2fa36b;
}

/* Minimal: no ambient glows or floating sparkles on the hero card */
.hero-ambient-glow,
.hero-decor-stars {
  display: none !important;
}

/* =========================================================
   GNIAZDKO – Minimal layout (nx-*)
   ========================================================= */
.nx-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.nx-brand-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
}

.nx-brand-name {
  font-family: var(--dn-serif);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--dn-ink);
}

.nx-page {
  padding: 4px 0 24px;
}

/* --- Summary --- */
.nx-summary {
  position: relative;
  margin: 4px 20px 8px;
  padding: 18px 18px 14px;
  border-radius: 28px;
  background: var(--dn-cream);
  overflow: hidden;
}

.nx-summary-top {
  display: flex;
  align-items: center;
}

.nx-couple {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dn-ink);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.nx-duo-avatars {
  position: relative;
  display: flex;
  flex-shrink: 0;
}

.nx-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--dn-cream);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
}

.nx-avatar--second {
  margin-left: -10px;
}

.nx-avatar-heart {
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 20px;
  height: 20px;
  margin-left: -10px;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dn-danger);
  font-size: 11px;
  box-shadow: 0 1px 3px rgba(28, 27, 25, 0.12);
}

.nx-couple-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.nx-couple-names {
  font-size: 15px;
  font-weight: 600;
  color: var(--dn-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nx-couple-nest {
  font-size: 13px;
  color: var(--dn-cream-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nx-days-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin: 18px 0 16px;
}

.nx-days {
  display: flex;
  flex-direction: column;
}

.nx-days-num {
  font-family: var(--dn-serif);
  font-size: 60px;
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.03em;
  color: var(--dn-ink);
}

.nx-days-label {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--dn-cream-ink);
}

/* Small "artistic mess" of tiles – echoes the welcome screen */
.nx-tiles {
  position: relative;
  width: 116px;
  height: 84px;
  flex-shrink: 0;
}

.nx-tile {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 30%;
  background: #ffffff;
  color: var(--dn-ink);
  box-shadow: 0 8px 18px -12px rgba(28, 27, 25, 0.35);
}

.nx-tile--a {
  left: 18px;
  top: 14px;
  width: 58px;
  height: 58px;
  font-size: 26px;
  transform: rotate(-8deg);
  z-index: 2;
}

.nx-tile--b {
  right: 0;
  top: 0;
  width: 40px;
  height: 40px;
  font-size: 18px;
  color: var(--dn-danger);
  transform: rotate(12deg);
  z-index: 1;
}

.nx-tile--c {
  left: 0;
  bottom: 0;
  width: 32px;
  height: 32px;
  font-size: 14px;
  color: var(--dn-cream-ink);
  transform: rotate(-16deg);
  z-index: 3;
}

.nx-level {
  padding: 14px 14px 12px;
  border-radius: 20px;
  background: #ffffff;
}

.nx-level-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--dn-ink);
}

.nx-level-row--meta {
  margin-top: 8px;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--dn-muted);
}

.nx-level-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--dn-ink);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
}

.nx-level-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
}

.nx-level-row + .nx-bar {
  margin-top: 12px;
}

.nx-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(28, 27, 25, 0.08);
  overflow: hidden;
}

.nx-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--dn-ink);
  transition: width 0.4s ease;
}

/* --- Sections --- */
.nx-section {
  margin: 0 20px;
  padding: 22px 0;
  border-bottom: 1px solid var(--dn-line);
}

.nx-section:last-child {
  border-bottom: none;
}

.nx-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.nx-section-title {
  margin: 0;
  font-family: var(--dn-serif);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dn-ink);
}

.nx-section-meta {
  font-size: 13px;
  color: var(--dn-muted);
}

.nx-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--dn-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* --- Rows --- */
.nx-row,
.nx-list-row,
.nx-event {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  text-align: left;
}

.nx-row-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
}

.nx-row-icon--ink {
  background: var(--dn-ink);
  color: #ffffff;
}

.nx-row-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.nx-row-title {
  font-size: 15.5px;
  font-weight: 500;
  color: var(--dn-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nx-row-sub {
  font-size: 13px;
  color: var(--dn-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nx-row-trail {
  font-size: 13px;
  font-weight: 500;
  color: var(--dn-muted);
}

.nx-list {
  display: flex;
  flex-direction: column;
}

.nx-list-row {
  min-height: 56px;
  padding: 6px 0;
  border: none;
  border-bottom: 1px solid var(--dn-line);
  background: transparent;
  font-family: inherit;
  cursor: pointer;
}

.nx-list-row:last-child {
  border-bottom: none;
}

.nx-check {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid #c9ccd2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #ffffff;
  font-size: 14px;
}

.nx-check.checked {
  background: var(--dn-ink);
  border-color: var(--dn-ink);
}

.nx-empty {
  margin: 0;
  font-size: 14px;
  color: var(--dn-muted);
}

.nx-event {
  margin-top: 14px;
  padding: 12px 14px 12px 12px;
  border-radius: 20px;
  background: var(--dn-cream);
  text-decoration: none;
}

.nx-event-date {
  width: 48px;
  height: 52px;
  border-radius: 14px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nx-event-day {
  font-family: var(--dn-serif);
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  color: var(--dn-ink);
}

.nx-event-month {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--dn-muted);
}

.nx-chevron {
  font-size: 18px;
  color: var(--dn-faint);
}

/* --- Gestures --- */
.nx-gestures {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.nx-gesture {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
}

.nx-gesture-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--dn-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, background 0.15s ease;
}

.nx-gesture:active .nx-gesture-icon {
  transform: scale(0.94);
  background: var(--dn-soft-press);
}

.nx-gesture-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dn-ink);
  text-align: center;
}

/* --- Doodle --- */
.nx-doodle {
  width: 100%;
  height: 180px;
  padding: 0;
  border: none;
  border-radius: 24px;
  background: var(--dn-soft);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-family: inherit;
}

.nx-doodle-canvas {
  width: 100%;
  height: 100%;
  display: block;
  background: #ffffff;
  border: 1px solid var(--dn-line);
  border-radius: 24px;
}

.nx-doodle-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--dn-muted);
  font-size: 14px;
}

.nx-doodle-empty ion-icon {
  font-size: 26px;
  color: var(--dn-ink);
}

.nx-live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--dn-ink);
}

.nx-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2fa36b;
  animation: nxPulse 1.4s ease-in-out infinite;
}

@keyframes nxPulse {
  50% { opacity: 0.35; }
}

/* --- Points --- */
.nx-points {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.nx-points-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.nx-points-col--right {
  align-items: flex-end;
  text-align: right;
}

.nx-points-num {
  font-family: var(--dn-serif);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--dn-ink);
}

.nx-split {
  display: flex;
  gap: 3px;
  height: 6px;
  margin-top: 14px;
}

.nx-split-a,
.nx-split-b {
  height: 100%;
  min-width: 6px;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.nx-split-a {
  background: var(--dn-ink);
}

.nx-split-b {
  background: var(--dn-cream-deep);
}

.nx-note {
  margin: 12px 0 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--dn-muted);
}

/* --- Goals --- */
.nx-round-btn,
.nx-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.nx-icon-btn {
  background: transparent;
  color: var(--dn-muted);
}

.nx-chips {
  display: flex;
  gap: 8px;
  margin: 0 -20px 14px;
  padding: 0 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.nx-chips::-webkit-scrollbar {
  display: none;
}

.nx-chip-count {
  opacity: 0.55;
  margin-left: 2px;
}

.nx-goals {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nx-goal {
  padding: 16px;
  border-radius: 20px;
  border: 1px solid var(--dn-line);
  background: #ffffff;
}

.nx-goal.is-claimed {
  background: var(--dn-soft);
  border-color: transparent;
}

.nx-goal-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.nx-text-btn {
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--dn-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.nx-claim {
  width: 100%;
  margin-top: 14px;
}

.nx-empty-box {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.nx-empty-btn {
  min-height: 44px;
  padding: 0 18px;
}

/* Always dark icons/text in nx buttons – never inherit the system (dark-mode) button colour */
.nx-gesture,
.nx-gesture-icon,
.nx-list-row,
.nx-duo-avatars,
.nx-doodle,
.nx-round-btn,
.nx-text-btn {
  color: var(--dn-ink);
}

.nx-gesture-icon .duo-icon,
.nx-gesture-icon svg {
  color: var(--dn-ink);
  stroke: var(--dn-ink);
}

.nx-icon-btn {
  color: var(--dn-muted);
}
</style>
