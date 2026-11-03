<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div>
              <div class="dn-header-title">
                <span>Zadania Domowe</span>
                <span class="count-chip">{{ uncompletedTasksCount }}</span>
              </div>
              <p class="dn-header-subtitle">Wspólne dbanie o czysty i ciepły dom</p>
            </div>
            <button class="new-chore-btn" @click="showAddModal = true">
              <ion-icon :icon="ioniconsAddOutline" />
              <span>Nowe</span>
            </button>
          </div>
        </div>
      </ion-toolbar>

      <!-- SEGMENTS: Podział obowiązków (Wszystkie, Moje, Partnera, Wspólne) -->
      <ion-toolbar class="segment-toolbar">
        <ion-segment v-model="selectedSegment" :scrollable="true" mode="ios">
          <ion-segment-button value="all">
            <ion-label>Wszystkie</ion-label>
          </ion-segment-button>
          <ion-segment-button value="mine">
            <ion-label>Moje</ion-label>
          </ion-segment-button>
          <ion-segment-button value="partner">
            <ion-label>{{ partnerUser?.name || 'Partnera' }}</ion-label>
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

          <ion-item class="task-item" lines="full">
            <ion-checkbox
              slot="start"
              :checked="task.is_completed"
              @ionChange="handleToggleTask(task)"
              color="primary"
            />
            <ion-label>
              <div class="task-title-row">
                <span class="task-title">{{ task.title }}</span>
                <span class="points-badge">+{{ task.points }} pkt</span>
              </div>

              <p class="task-desc" v-if="task.description">{{ task.description }}</p>

              <div class="task-tags-row">
                <!-- Assignee badge with SVG icons -->
                <span class="tag-pill" :class="getAssigneeClass(task.assigned_to)">
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

            <ion-item class="task-item completed" lines="full">
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
                  @click="newTaskAssignee = currentUser.id"
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

      <div style="height: 30px;"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState, type TaskItem } from '~/composables/useDuoState'
import DuoIcon from '~/components/DuoIcon.vue'

const {
  tasksList,
  currentUser,
  partnerUser,
  addTask,
  toggleTask,
  deleteTask
} = useDuoState()

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
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#0284c7', '#0ea5e9', '#10b981', '#f59e0b']
    })
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
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
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
</style>
