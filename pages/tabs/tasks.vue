<template>
  <ion-page>
    <ion-header :translucent="true">
      <DuoSectionBack />
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div class="dn-header-title">Zadania</div>
            <button
              type="button"
              class="dn-header-btn"
              aria-label="Nowe zadanie"
              @click="showAddModal = true"
            >
              <ion-icon :icon="ioniconsAddOutline" aria-hidden="true" />
              <span>Zadanie</span>
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

      <!-- ============================================== -->
      <!-- TAB 1: LISTA ZADAŃ DOMOWYCH                    -->
      <!-- ============================================== -->
      <div class="tasks-tab-content">
        <div class="dn-subtabs tasks-assignee-filter" role="group" aria-label="Filtruj zadania według osoby" data-no-swipe>
          <button
            v-for="seg in taskSegments"
            :key="seg.value"
            type="button"
            class="dn-subtab"
            :class="{ active: selectedSegment === seg.value }"
            :aria-pressed="selectedSegment === seg.value"
            @click="selectedSegment = seg.value"
          >
            {{ seg.label }}
          </button>
        </div>

        <!-- ACTIVE TASKS LIST -->
        <div class="tasks-section-header" v-if="filteredActiveTasks.length > 0">
          <span>Do zrobienia · {{ filteredActiveTasks.length }}</span>
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
              <!-- Swipe RIGHT gesture (side="start"): Complete task -->
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
          <span>Ukończone · {{ filteredCompletedTasks.length }}</span>
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
                  <span>{{ partnerUser?.name || partnerTitle }}</span>
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

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDuoState } from '~/composables/useDuoState'
import type { TaskItem } from '~/types/duo'
import DuoIcon from '~/components/DuoIcon.vue'
const {
  tasksList,
  currentUser,
  partnerUser,
  addTask,
  toggleTask,
  deleteTask,
  initSupabaseSync,
  triggerToast,
  partnerTitle,
  partnerDopelniacz
} = useDuoState()

const completingTaskIds = ref<Set<string>>(new Set())

onMounted(async () => {
  try {
    await initSupabaseSync()
  } catch (_) {}
})

const selectedSegment = ref('all')
const taskSegments = computed(() => [
  { value: 'all', label: 'Wszystkie' },
  { value: 'mine', label: 'Moje' },
  { value: 'partner', label: partnerUser.value?.name || partnerDopelniacz.value },
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
  return partnerUser.value?.name || partnerDopelniacz.value
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
.tasks-assignee-filter {
  flex-wrap: wrap;
  gap: 0 clamp(8px, 4vw, 22px);
}

.tasks-assignee-filter .dn-subtab {
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}

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
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
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
</style>
