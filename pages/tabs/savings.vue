<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div>
              <div class="dn-header-title">
                <span>Skarbonki & Cele</span>
                <span class="count-chip" v-if="activeGoalsCount > 0">{{ activeGoalsCount }}</span>
              </div>
              <p class="dn-header-subtitle">Wspólne cele, wyjazdy i oszczędności</p>
            </div>
            <button
              type="button"
              class="new-chore-btn"
              @click="openAddModal"
              aria-label="Dodaj nową skarbonkę"
            >
              <ion-icon :icon="ioniconsAddOutline" />
              <span>Nowy cel</span>
            </button>
          </div>
        </div>
      </ion-toolbar>

      <!-- MAIN TABS: Zakupy vs Zadania vs Obiady vs Skarbonki vs Zwierzak -->
      <ion-toolbar class="main-tabs-toolbar" data-no-swipe>
        <div ref="pillRowRef" class="main-tabs-pill-row" @scroll.passive="onTabsScroll">
          <button
            type="button"
            class="main-tab-pill"
            @click="switchToShopping"
          >
            <ion-icon :icon="ioniconsCartOutline" />
            <span>Zakupy</span>
            <span class="pill-count-chip" v-if="uncompletedShoppingCount > 0">{{ uncompletedShoppingCount }}</span>
          </button>

          <button
            type="button"
            class="main-tab-pill"
            @click="switchToTasks"
          >
            <ion-icon :icon="ioniconsCheckboxOutline" />
            <span>Zadania</span>
            <span class="pill-count-chip" v-if="uncompletedTasksCount > 0">{{ uncompletedTasksCount }}</span>
          </button>

          <button
            type="button"
            class="main-tab-pill"
            @click="switchToMeals"
          >
            <ion-icon :icon="ioniconsRestaurantOutline" />
            <span>Obiady</span>
          </button>

          <button
            type="button"
            class="main-tab-pill active"
          >
            <ion-icon :icon="ioniconsWalletOutline" />
            <span>Skarbonki</span>
          </button>

          <button
            type="button"
            class="main-tab-pill pet-tab-pill"
            @click="switchToPet"
          >
            <ion-icon :icon="ioniconsPawOutline" />
            <span>Zwierzak</span>
            <span class="tab-pet-lvl" v-if="hasPet">lvl {{ petLevel }}</span>
          </button>
        </div>
      </ion-toolbar>

      <!-- SUB-VIEW SEGMENT: W trakcie vs Zrealizowane vs Wszystkie -->
      <ion-toolbar class="subview-toolbar" data-no-swipe>
        <div class="subview-segmented-wrap">
          <button
            type="button"
            class="subview-pill"
            :class="{ active: statusFilter === 'active' }"
            @click="statusFilter = 'active'"
          >
            <ion-icon :icon="ioniconsTrendingUpOutline" />
            <span>W trakcie</span>
            <span class="subview-count-badge" v-if="activeGoalsCount > 0">{{ activeGoalsCount }}</span>
          </button>

          <button
            type="button"
            class="subview-pill"
            :class="{ active: statusFilter === 'completed' }"
            @click="statusFilter = 'completed'"
          >
            <ion-icon :icon="ioniconsCheckmarkDoneOutline" />
            <span>Zrealizowane</span>
            <span class="subview-count-badge" v-if="completedGoalsCount > 0">{{ completedGoalsCount }}</span>
          </button>

          <button
            type="button"
            class="subview-pill"
            :class="{ active: statusFilter === 'all' }"
            @click="statusFilter = 'all'"
          >
            <ion-icon :icon="ioniconsLayersOutline" />
            <span>Wszystkie</span>
            <span class="subview-count-badge" v-if="savingsGoals.length > 0">{{ savingsGoals.length }}</span>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <div class="savings-container">
        <!-- TOTAL SAVINGS HERO DASHBOARD CARD (Deep Slate DuoNest Aesthetic) -->
        <div class="dn-card savings-summary-hero">
          <div class="hero-top-row">
            <div>
              <span class="hero-section-tag">WSPÓLNY PORTFEL</span>
              <h2 class="hero-balance-val">{{ formatMoney(totalCurrentSaved) }} <small>PLN</small></h2>
              <p class="hero-balance-sub">Łącznie odłożone w skarbonkach</p>
            </div>
            <div class="hero-icon-circle">
              <ion-icon :icon="ioniconsWalletOutline" />
            </div>
          </div>

          <!-- Total Progress Bar -->
          <div class="hero-progress-section">
            <div class="hero-progress-header">
              <span>Wspólny cel: <strong>{{ formatMoney(totalTargetAmount) }} PLN</strong></span>
              <span class="hero-pct-pill">{{ overallProgressPct }}%</span>
            </div>
            <div class="hero-progress-track">
              <div
                class="hero-progress-fill"
                :style="{ width: `${overallProgressPct}%` }"
              ></div>
            </div>
          </div>

          <div class="hero-stats-footer">
            <div class="hero-stat-pill">
              <ion-icon :icon="ioniconsTrendingUpOutline" />
              <span><strong>{{ activeGoalsCount }}</strong> w trakcie</span>
            </div>
            <div class="hero-stat-pill" v-if="completedGoalsCount > 0">
              <ion-icon :icon="ioniconsCheckmarkCircle" class="text-emerald" />
              <span><strong>{{ completedGoalsCount }}</strong> zrealizowanych</span>
            </div>
          </div>
        </div>

        <!-- CATEGORY FILTER CHIPS -->
        <div class="filter-scroll" data-no-swipe>
          <button
            type="button"
            v-for="cat in categoryFilters"
            :key="cat.key"
            class="filter-pill"
            :class="{ active: selectedCategoryFilter === cat.key }"
            @click="selectedCategoryFilter = cat.key"
          >
            <ion-icon :icon="cat.icon" />
            <span>{{ cat.label }}</span>
            <span class="filter-badge" v-if="getCategoryGoalCount(cat.key) > 0">
              {{ getCategoryGoalCount(cat.key) }}
            </span>
          </button>
        </div>

        <!-- EMPTY STATE -->
        <div v-if="filteredGoals.length === 0" class="dn-card empty-state-card">
          <div class="empty-icon-wrap">
            <ion-icon :icon="ioniconsWalletOutline" />
          </div>
          <h3 class="empty-title">
            {{ statusFilter === 'completed' ? 'Brak zrealizowanych celów' : 'Brak skarbonek' }}
          </h3>
          <p class="empty-desc">
            {{
              statusFilter === 'completed'
                ? 'Gdy uzbieracie 100% na któryś cel, pojawi się on w tym miejscu jako trofeum!'
                : 'Załóżcie pierwszą skarbonkę na wspólne wakacje, prezent lub wyposażenie domu!'
            }}
          </p>
          <button
            v-if="statusFilter !== 'completed'"
            type="button"
            class="dn-button-primary empty-action-btn"
            @click="openAddModal"
          >
            <ion-icon :icon="ioniconsAddOutline" />
            <span>Utwórz cel</span>
          </button>
        </div>

        <!-- GOALS LIST -->
        <TransitionGroup
          name="dn-list"
          tag="div"
          v-else
          class="goals-grid"
        >
          <div
            v-for="goal in filteredGoals"
            :key="goal.id"
            class="dn-card goal-card"
            :class="{
              'is-completed': goal.is_completed,
              'dn-item-deleting': deletingGoalIds.has(goal.id)
            }"
          >
            <!-- Goal Header -->
            <div class="goal-header">
              <div class="goal-icon-box" :style="{ background: hexToRgba(goal.color || '#0f172a', 0.1), color: goal.color || '#0f172a' }">
                <ion-icon :icon="getIconComponent(goal.icon || 'airplane')" />
              </div>
              <div class="goal-info">
                <div class="goal-title-row">
                  <h4 class="goal-title">{{ goal.title }}</h4>
                  <span v-if="goal.is_completed" class="badge-completed">
                    <ion-icon :icon="ioniconsCheckmarkCircle" />
                    Zrealizowany
                  </span>
                </div>
                <div class="goal-meta-row">
                  <span class="meta-tag category-tag">{{ getCategoryLabel(goal.category) }}</span>
                  <span v-if="goal.target_date" class="meta-tag date-tag">
                    <ion-icon :icon="ioniconsTimeOutline" />
                    {{ formatDaysLeft(goal.target_date) }}
                  </span>
                </div>
              </div>

              <!-- Options Dropdown/Menu Button -->
              <button
                type="button"
                class="goal-menu-btn"
                @click="openGoalActions(goal)"
                aria-label="Więcej opcji"
              >
                <ion-icon :icon="ioniconsEllipsisHorizontalOutline" />
              </button>
            </div>

            <!-- Amounts & Progress -->
            <div class="goal-progress-wrap">
              <div class="goal-amounts-row">
                <div>
                  <span class="current-amt-label">Uzbierano</span>
                  <div class="current-amt-value">
                    <span>{{ formatMoney(goal.current_amount) }}</span>
                    <small>{{ goal.currency || 'PLN' }}</small>
                  </div>
                </div>
                <div class="text-right">
                  <span class="target-amt-label">Cel</span>
                  <div class="target-amt-value">
                    <span>{{ formatMoney(goal.target_amount) }}</span>
                    <small>{{ goal.currency || 'PLN' }}</small>
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="goal-track">
                <div
                  class="goal-fill"
                  :style="{
                    width: `${calculateGoalPct(goal)}%`,
                    background: goal.is_completed
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : (goal.color ? goal.color : '#0f172a')
                  }"
                ></div>
              </div>

              <div class="goal-progress-sub">
                <span class="pct-text">{{ calculateGoalPct(goal) }}% osiągnięto</span>
                <span v-if="!goal.is_completed" class="missing-text">
                  Brakuje {{ formatMoney(Math.max(0, goal.target_amount - goal.current_amount)) }} {{ goal.currency || 'PLN' }}
                </span>
                <span v-else class="success-text">
                  Cel zrealizowany!
                </span>
              </div>
            </div>

            <!-- Recent Contribution Snapshot -->
            <div class="goal-recent-contrib" v-if="getGoalLatestContribution(goal.id)">
              <div class="contrib-user-dot" :style="{ background: getUserColor(getGoalLatestContribution(goal.id)!.user_id) }"></div>
              <span class="contrib-snapshot-text">
                Ostatnia wpłata:
                <strong>+{{ formatMoney(getGoalLatestContribution(goal.id)!.amount) }} zł</strong>
                od {{ getUserName(getGoalLatestContribution(goal.id)!.user_id) }}
                <span v-if="getGoalLatestContribution(goal.id)!.note"> • {{ getGoalLatestContribution(goal.id)!.note }}</span>
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="goal-actions-row">
              <button
                type="button"
                class="dn-button-primary goal-action-primary"
                @click="openDepositModal(goal)"
              >
                <ion-icon :icon="ioniconsAddOutline" />
                <span>Wpłać</span>
              </button>

              <button
                type="button"
                class="dn-button-secondary goal-action-secondary"
                @click="openHistoryModal(goal)"
              >
                <ion-icon :icon="ioniconsTimeOutline" />
                <span>Historia ({{ getGoalContributionsCount(goal.id) }})</span>
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <!-- Floating bottom tab bar spacer -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>

    <!-- 1. MODAL: NOWY CEL / EDYTUJ CEL -->
    <ion-modal
      :is-open="isGoalModalOpen"
      @didDismiss="closeGoalModal"
      class="dn-savings-modal"
      :breakpoints="[0, 0.88, 1]"
      :initial-breakpoint="0.88"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header">
        <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
        <ion-toolbar>
          <div class="modal-header-inner">
            <div class="modal-title-wrap">
              <ion-icon :icon="isEditingGoal ? ioniconsCreateOutline : ioniconsWalletOutline" class="modal-title-icon" />
              <ion-title>{{ isEditingGoal ? 'Edytuj skarbonkę' : 'Nowa skarbonka' }}</ion-title>
            </div>
            <ion-buttons slot="end">
              <button
                type="button"
                class="modal-close-icon-btn"
                @click="closeGoalModal"
                aria-label="Zamknij"
              >
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </ion-buttons>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding modal-form-content">
        <form @submit.prevent="handleSaveGoal" class="goal-form">
          <div class="form-group">
            <label class="form-label" for="goal-title">Nazwa celu / skarbonki *</label>
            <ion-input
              id="goal-title"
              v-model="goalFormTitle"
              maxlength="100"
              placeholder="np. Wyjazd do Rzymu, Nowy narożnik, Poduszka..."
              class="custom-ion-input"
              :clear-input="true"
              required
            />
          </div>

          <div class="form-row-2">
            <div class="form-group flex-1">
              <label class="form-label" for="goal-target-amount">Kwota docelowa (PLN) *</label>
              <ion-input
                id="goal-target-amount"
                v-model="goalFormTargetAmount"
                type="number"
                step="0.01"
                min="1"
                max="999999999"
                placeholder="np. 3500"
                class="custom-ion-input"
                required
              />
            </div>

            <div class="form-group flex-1" v-if="!isEditingGoal">
              <label class="form-label" for="goal-initial-deposit">Wpłata na start</label>
              <ion-input
                id="goal-initial-deposit"
                v-model="goalFormInitialDeposit"
                type="number"
                step="0.01"
                min="0"
                placeholder="np. 200 (opcjonalnie)"
                class="custom-ion-input"
              />
            </div>
          </div>

          <!-- Category Selection -->
          <div class="form-group">
            <span class="form-label">Kategoria</span>
            <div class="category-select-scroll">
              <button
                v-for="cat in categoryFilters.slice(1)"
                :key="cat.key"
                type="button"
                class="cat-chip"
                :class="{ active: goalFormCategory === cat.key }"
                @click="handleSelectCategory(cat.key)"
              >
                <ion-icon :icon="cat.icon" />
                <span>{{ cat.label }}</span>
              </button>
            </div>
          </div>

          <!-- Icon Selection -->
          <div class="form-group">
            <span class="form-label">Ikona</span>
            <div class="icon-selector-grid">
              <button
                v-for="ico in availableIcons"
                :key="ico.key"
                type="button"
                class="icon-pick-btn"
                :class="{ active: goalFormIcon === ico.key }"
                @click="goalFormIcon = ico.key"
              >
                <ion-icon :icon="ico.component" />
              </button>
            </div>
          </div>

          <!-- Color Preset -->
          <div class="form-group">
            <span class="form-label">Kolor skarbonki</span>
            <div class="color-picker-row">
              <button
                v-for="col in availableColors"
                :key="col"
                type="button"
                class="color-circle"
                :style="{ background: col }"
                :class="{ active: goalFormColor === col }"
                @click="goalFormColor = col"
              >
                <ion-icon v-if="goalFormColor === col" :icon="ioniconsCheckmarkOutline" />
              </button>
            </div>
          </div>

          <!-- Target Date (Optional) -->
          <div class="form-group">
            <label class="form-label" for="goal-target-date">Termin realizacji (opcjonalnie)</label>
            <ion-input
              id="goal-target-date"
              v-model="goalFormTargetDate"
              type="date"
              class="custom-ion-input"
            />
          </div>

          <button
            type="submit"
            class="dn-button-primary submit-btn"
            :disabled="isSavingGoal"
          >
            <ion-spinner v-if="isSavingGoal" name="crescent" style="width: 18px; height: 18px;" />
            <ion-icon v-else :icon="ioniconsCheckmarkOutline" />
            <span>{{ isEditingGoal ? 'Zapisz zmiany' : 'Utwórz skarbonkę' }}</span>
          </button>
        </form>
      </ion-content>
    </ion-modal>

    <!-- 2. MODAL: WPŁATA / WYPŁATA (DEPOSIT) -->
    <ion-modal
      :is-open="isDepositModalOpen"
      @didDismiss="closeDepositModal"
      class="dn-savings-modal"
      :breakpoints="[0, 0.78, 1]"
      :initial-breakpoint="0.78"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header">
        <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
        <ion-toolbar>
          <div class="modal-header-inner">
            <div class="modal-title-wrap">
              <ion-icon :icon="ioniconsCashOutline" class="modal-title-icon" />
              <ion-title>Wpłata do skarbonki</ion-title>
            </div>
            <ion-buttons slot="end">
              <button
                type="button"
                class="modal-close-icon-btn"
                @click="closeDepositModal"
                aria-label="Zamknij"
              >
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </ion-buttons>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding modal-form-content">
        <form @submit.prevent="handleSaveDeposit" class="deposit-form" v-if="activeGoalForAction">
          <div class="deposit-goal-name-badge">
            <span>{{ activeGoalForAction.title }}</span>
          </div>

          <!-- Current Status Snapshot -->
          <div class="deposit-status-box">
            <div class="deposit-status-item">
              <span class="box-label">Obecny stan</span>
              <span class="box-val">{{ formatMoney(activeGoalForAction.current_amount) }} zł</span>
            </div>
            <div class="deposit-status-arrow">
              <ion-icon :icon="isWithdrawal ? ioniconsArrowDownOutline : ioniconsArrowUpOutline" :style="{ color: isWithdrawal ? '#f59e0b' : '#10b981' }" />
            </div>
            <div class="deposit-status-item text-right">
              <span class="box-label">Po operacji</span>
              <span class="box-val highlighted" :style="{ color: isWithdrawal ? '#f59e0b' : '#10b981' }">
                {{ formatMoney(projectedAmount) }} zł
              </span>
            </div>
          </div>

          <!-- Quick presets pills -->
          <div class="deposit-quick-row">
            <span class="quick-title">Szybkie kwoty:</span>
            <div class="quick-chips">
              <button
                type="button"
                v-for="preset in [20, 50, 100, 200, 500]"
                :key="preset"
                class="quick-preset-btn"
                :class="{ active: depositAmount === preset.toString() }"
                @click="depositAmount = preset.toString()"
              >
                +{{ preset }} zł
              </button>
            </div>
          </div>

          <!-- Amount Input -->
          <div class="form-group">
            <label class="form-label" for="deposit-amount">
              {{ isWithdrawal ? 'Kwota wypłaty (PLN) *' : 'Kwota wpłaty (PLN) *' }}
            </label>
            <ion-input
              id="deposit-amount"
              v-model="depositAmount"
              type="number"
              step="0.01"
              min="0.01"
              max="999999999"
              placeholder="np. 100"
              class="custom-ion-input large-amount-input"
              required
            />
          </div>

          <!-- Note Input -->
          <div class="form-group">
            <label class="form-label" for="deposit-note">Krótka notatka (opcjonalnie)</label>
            <ion-input
              id="deposit-note"
              v-model="depositNote"
              maxlength="150"
              placeholder="np. Ze sprzedaży na Vinted, Premia, Zaoszczędzone na kawie..."
              class="custom-ion-input"
              :clear-input="true"
            />
          </div>

          <!-- Toggle Withdrawal Option -->
          <div class="withdraw-toggle-row">
            <button
              type="button"
              class="toggle-link-btn"
              @click="isWithdrawal = !isWithdrawal"
            >
              <ion-icon :icon="isWithdrawal ? ioniconsCashOutline : ioniconsArrowUndoOutline" />
              <span>{{ isWithdrawal ? 'Zmień na wpłatę' : 'Chcę wypłacić środki z tej skarbonki' }}</span>
            </button>
          </div>

          <button
            type="submit"
            class="dn-button-primary submit-btn"
            :class="{ 'is-withdraw': isWithdrawal }"
            :disabled="isSavingDeposit"
          >
            <ion-spinner v-if="isSavingDeposit" name="crescent" style="width: 18px; height: 18px;" />
            <ion-icon v-else :icon="isWithdrawal ? ioniconsArrowDownOutline : ioniconsCashOutline" />
            <span>{{ isWithdrawal ? 'Zatwierdź wypłatę' : 'Wpłać środki' }}</span>
          </button>
        </form>
      </ion-content>
    </ion-modal>

    <!-- 3. MODAL: HISTORIA WPŁAT -->
    <ion-modal
      :is-open="isHistoryModalOpen"
      @didDismiss="closeHistoryModal"
      class="dn-savings-modal"
      :breakpoints="[0, 0.82, 1]"
      :initial-breakpoint="0.82"
      :handle="true"
      data-no-swipe="true"
    >
      <ion-header class="modal-custom-header">
        <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
        <ion-toolbar>
          <div class="modal-header-inner">
            <div class="modal-title-wrap">
              <ion-icon :icon="ioniconsTimeOutline" class="modal-title-icon" />
              <ion-title>Historia skarbonki</ion-title>
            </div>
            <ion-buttons slot="end">
              <button
                type="button"
                class="modal-close-icon-btn"
                @click="closeHistoryModal"
                aria-label="Zamknij"
              >
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </ion-buttons>
          </div>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding history-content">
        <div class="history-goal-header" v-if="activeGoalForAction">
          <span class="history-goal-badge">{{ activeGoalForAction.title }}</span>
          <span class="history-total-sub">Wszystkie operacje w tej skarbonce</span>
        </div>

        <div v-if="activeGoalContributions.length === 0" class="empty-history">
          <p>Brak wpisów w historii tej skarbonki.</p>
        </div>
        <div v-else class="history-list">
          <div
            v-for="contrib in activeGoalContributions"
            :key="contrib.id"
            class="history-item"
          >
            <div class="history-item-left">
              <div class="user-avatar-dot" :style="{ background: getUserColor(contrib.user_id) }">
                <ion-icon :icon="ioniconsPersonOutline" />
              </div>
              <div class="history-details">
                <div class="history-author-row">
                  <span class="author-name">{{ getUserName(contrib.user_id) }}</span>
                  <span class="history-date">{{ formatDate(contrib.created_at) }}</span>
                </div>
                <p class="history-note" v-if="contrib.note">{{ contrib.note }}</p>
              </div>
            </div>

            <div class="history-item-right">
              <span
                class="history-amount"
                :class="{ positive: contrib.amount > 0, negative: contrib.amount < 0 }"
              >
                {{ contrib.amount > 0 ? '+' : '' }}{{ formatMoney(contrib.amount) }} zł
              </span>
              <button
                type="button"
                class="delete-contrib-btn"
                @click="handleDeleteContribution(contrib)"
                title="Usuń wpis"
                aria-label="Usuń wpis"
              >
                <ion-icon :icon="ioniconsTrashOutline" />
              </button>
            </div>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- 4. ACTION SHEET: OPCJE CELU -->
    <DuoActionSheet
      :is-open="isActionSheetOpen"
      :title="activeGoalForAction?.title || 'Opcje skarbonki'"
      subtitle="Zarządzaj tą skarbonką lub zmień jej stan"
      :buttons="goalActionButtons"
      @dismiss="isActionSheetOpen = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import confetti from 'canvas-confetti'
import {
  useDuoState,
  type SavingsGoal,
  type SavingsContribution
} from '~/composables/useDuoState'
import { usePetState } from '~/composables/usePetState'
import { useConfirm } from '~/composables/useConfirm'
import { playNotificationChime } from '~/composables/usePushNotifications'

// Icons from ionicons/icons
import {
  addOutline as ioniconsAddOutline,
  cartOutline as ioniconsCartOutline,
  checkboxOutline as ioniconsCheckboxOutline,
  restaurantOutline as ioniconsRestaurantOutline,
  walletOutline as ioniconsWalletOutline,
  pawOutline as ioniconsPawOutline,
  trendingUpOutline as ioniconsTrendingUpOutline,
  checkmarkCircle as ioniconsCheckmarkCircle,
  checkmarkDoneOutline as ioniconsCheckmarkDoneOutline,
  layersOutline as ioniconsLayersOutline,
  timeOutline as ioniconsTimeOutline,
  ellipsisHorizontalOutline as ioniconsEllipsisHorizontalOutline,
  createOutline as ioniconsCreateOutline,
  closeOutline as ioniconsCloseOutline,
  checkmarkOutline as ioniconsCheckmarkOutline,
  cashOutline as ioniconsCashOutline,
  arrowDownOutline as ioniconsArrowDownOutline,
  arrowUpOutline as ioniconsArrowUpOutline,
  arrowUndoOutline as ioniconsArrowUndoOutline,
  personOutline as ioniconsPersonOutline,
  trashOutline as ioniconsTrashOutline,
  airplaneOutline as ioniconsAirplaneOutline,
  homeOutline as ioniconsHomeOutline,
  laptopOutline as ioniconsLaptopOutline,
  heartOutline as ioniconsHeartOutline,
  shieldCheckmarkOutline as ioniconsShieldCheckmarkOutline,
  sparklesOutline as ioniconsSparklesOutline,
  carOutline as ioniconsCarOutline,
  giftOutline as ioniconsGiftOutline
} from 'ionicons/icons'

const {
  savingsGoals,
  savingsContributions,
  shoppingItems,
  tasksList,
  activeDailySubTab,
  activeTasksMainTab,
  currentUser,
  partnerUser,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addSavingsContribution,
  deleteSavingsContribution,
  getUserAccentColor,
  hexToRgba,
  triggerToast
} = useDuoState()

const deletingGoalIds = ref<Set<string>>(new Set())

const { confirm } = useConfirm()
const { pillRowRef, onTabsScroll } = useOrgTabsSync('savings')
const { hasPet, petLevel, onEnterPetView } = usePetState()

// Subtab navigation helpers
const switchToShopping = () => {
  activeDailySubTab.value = 'shopping'
}
const switchToTasks = () => {
  activeDailySubTab.value = 'tasks'
  activeTasksMainTab.value = 'tasks'
}
const switchToMeals = () => {
  activeDailySubTab.value = 'meals'
}
const switchToPet = () => {
  activeDailySubTab.value = 'tasks'
  activeTasksMainTab.value = 'pet'
  try {
    onEnterPetView()
  } catch (_) {}
}

const uncompletedShoppingCount = computed(() => {
  return shoppingItems.value.filter(i => !i.is_completed).length
})

const uncompletedTasksCount = computed(() => {
  return tasksList.value.filter(t => !t.is_completed).length
})

// Categories definition
const categoryFilters = [
  { key: 'all', label: 'Wszystkie', icon: ioniconsWalletOutline },
  { key: 'travel', label: 'Podróże', icon: ioniconsAirplaneOutline },
  { key: 'home', label: 'Dom', icon: ioniconsHomeOutline },
  { key: 'gadget', label: 'Sprzęt', icon: ioniconsLaptopOutline },
  { key: 'date', label: 'Randki', icon: ioniconsHeartOutline },
  { key: 'emergency', label: 'Poduszka', icon: ioniconsShieldCheckmarkOutline },
  { key: 'other', label: 'Inne', icon: ioniconsSparklesOutline }
]

const availableIcons = [
  { key: 'airplane', component: ioniconsAirplaneOutline },
  { key: 'home', component: ioniconsHomeOutline },
  { key: 'gadget', component: ioniconsLaptopOutline },
  { key: 'date', component: ioniconsHeartOutline },
  { key: 'shield', component: ioniconsShieldCheckmarkOutline },
  { key: 'sparkles', component: ioniconsSparklesOutline },
  { key: 'car', component: ioniconsCarOutline },
  { key: 'gift', component: ioniconsGiftOutline }
]

const availableColors = [
  '#0f172a', // Slate-900 Signature Black
  '#334155', // Slate-700
  '#0d9488', // Teal
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#e11d48'  // Rose
]

// State filters
const selectedCategoryFilter = ref('all')
const statusFilter = ref<'active' | 'completed' | 'all'>('active')

const activeGoalsCount = computed(() => {
  return savingsGoals.value.filter(g => !g.is_completed).length
})

const completedGoalsCount = computed(() => {
  return savingsGoals.value.filter(g => g.is_completed).length
})

const totalCurrentSaved = computed(() => {
  return savingsGoals.value.reduce((sum, g) => sum + (Number(g.current_amount) || 0), 0)
})

const totalTargetAmount = computed(() => {
  return savingsGoals.value.reduce((sum, g) => sum + (Number(g.target_amount) || 0), 0)
})

const overallProgressPct = computed(() => {
  if (totalTargetAmount.value <= 0) return 0
  const pct = Math.round((totalCurrentSaved.value / totalTargetAmount.value) * 100)
  return Math.min(100, Math.max(0, pct))
})

const getCategoryGoalCount = (catKey: string) => {
  if (catKey === 'all') return savingsGoals.value.length
  return savingsGoals.value.filter(g => g.category === catKey).length
}

const filteredGoals = computed(() => {
  return savingsGoals.value.filter(goal => {
    // Category check
    if (selectedCategoryFilter.value !== 'all' && goal.category !== selectedCategoryFilter.value) {
      return false
    }
    // Status check
    if (statusFilter.value === 'active' && goal.is_completed) return false
    if (statusFilter.value === 'completed' && !goal.is_completed) return false
    return true
  })
})

// Helpers
const formatMoney = (val: number | string | undefined | null) => {
  const num = Number(val) || 0
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(num)
}

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('pl-PL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d)
  } catch (_) {
    return dateStr
  }
}

const formatDaysLeft = (targetDateStr: string) => {
  try {
    const target = new Date(targetDateStr).getTime()
    const now = new Date().setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'Termin minął'
    if (diffDays === 0) return 'Dziś termin'
    if (diffDays === 1) return 'Jutro'
    if (diffDays <= 30) return `za ${diffDays} dni`
    const months = Math.round(diffDays / 30)
    return `za ~${months} mies.`
  } catch (_) {
    return targetDateStr
  }
}

const calculateGoalPct = (goal: SavingsGoal) => {
  if (!goal.target_amount || goal.target_amount <= 0) return 0
  const pct = Math.round((goal.current_amount / goal.target_amount) * 100)
  return Math.min(100, Math.max(0, pct))
}

const getCategoryLabel = (catKey: string) => {
  const found = categoryFilters.find(c => c.key === catKey)
  return found ? found.label : 'Inne'
}

const getIconComponent = (iconKey: string) => {
  const found = availableIcons.find(i => i.key === iconKey)
  return found ? found.component : ioniconsAirplaneOutline
}

const getUserName = (userId: string | null | undefined) => {
  if (!userId) return 'DuoNest'
  if (userId === currentUser.value?.id) return currentUser.value.name || 'Ty'
  if (userId === partnerUser.value?.id) return partnerUser.value?.name || 'Partner'
  return 'Partner'
}

const getUserColor = (userId: string | null | undefined) => {
  return getUserAccentColor(userId)
}

const getGoalContributionsCount = (goalId: string) => {
  return savingsContributions.value.filter(c => c.goal_id === goalId).length
}

const getGoalLatestContribution = (goalId: string) => {
  const contribs = savingsContributions.value.filter(c => c.goal_id === goalId)
  return contribs.length > 0 ? contribs[0] : null
}

// --------------------------------------------------------------------------
// MODAL STATE: CREATE / EDIT GOAL
// --------------------------------------------------------------------------
const isGoalModalOpen = ref(false)
const isEditingGoal = ref(false)
const editingGoalId = ref<string | null>(null)
const goalFormTitle = ref('')
const goalFormTargetAmount = ref('')
const goalFormInitialDeposit = ref('')
const goalFormCategory = ref<SavingsGoal['category']>('travel')
const goalFormIcon = ref('airplane')
const goalFormColor = ref('#0f172a')
const goalFormTargetDate = ref('')
const isSavingGoal = ref(false)

const openAddModal = () => {
  isEditingGoal.value = false
  editingGoalId.value = null
  goalFormTitle.value = ''
  goalFormTargetAmount.value = ''
  goalFormInitialDeposit.value = ''
  goalFormCategory.value = 'travel'
  goalFormIcon.value = 'airplane'
  goalFormColor.value = '#0f172a'
  goalFormTargetDate.value = ''
  isGoalModalOpen.value = true
}

const openEditModal = (goal: SavingsGoal) => {
  isEditingGoal.value = true
  editingGoalId.value = goal.id
  goalFormTitle.value = goal.title
  goalFormTargetAmount.value = goal.target_amount.toString()
  goalFormInitialDeposit.value = ''
  goalFormCategory.value = goal.category
  goalFormIcon.value = goal.icon || 'airplane'
  goalFormColor.value = goal.color || '#0f172a'
  goalFormTargetDate.value = goal.target_date || ''
  isGoalModalOpen.value = true
}

const closeGoalModal = () => {
  isGoalModalOpen.value = false
}

const handleSelectCategory = (catKey: string) => {
  goalFormCategory.value = catKey as any
  if (catKey === 'travel') goalFormIcon.value = 'airplane'
  else if (catKey === 'home') goalFormIcon.value = 'home'
  else if (catKey === 'gadget') goalFormIcon.value = 'gadget'
  else if (catKey === 'date') goalFormIcon.value = 'date'
  else if (catKey === 'emergency') goalFormIcon.value = 'shield'
  else goalFormIcon.value = 'sparkles'
}

const handleSaveGoal = async () => {
  if (isSavingGoal.value) return
  const cleanTitle = goalFormTitle.value.trim().slice(0, 100)
  if (!cleanTitle) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40)
    triggerToast('Wpisz nazwę celu lub skarbonki', { type: 'warning' })
    return
  }
  const targetNum = parseFloat(goalFormTargetAmount.value)
  if (isNaN(targetNum) || targetNum <= 0) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40)
    triggerToast('Wpisz kwotę docelową większą niż 0 zł', { type: 'warning' })
    return
  }

  isSavingGoal.value = true
  try {
    if (isEditingGoal.value && editingGoalId.value) {
      await updateSavingsGoal(editingGoalId.value, {
        title: cleanTitle,
        target_amount: targetNum,
        category: goalFormCategory.value,
        icon: goalFormIcon.value,
        color: goalFormColor.value,
        target_date: goalFormTargetDate.value || null
      })
    } else {
      const initialDep = parseFloat(goalFormInitialDeposit.value) || 0
      await addSavingsGoal({
        title: cleanTitle,
        target_amount: targetNum,
        initial_deposit: initialDep,
        category: goalFormCategory.value,
        icon: goalFormIcon.value,
        color: goalFormColor.value,
        target_date: goalFormTargetDate.value || null
      })
    }
    closeGoalModal()
  } finally {
    isSavingGoal.value = false
  }
}

// --------------------------------------------------------------------------
// MODAL STATE: DEPOSIT / WITHDRAW
// --------------------------------------------------------------------------
const isDepositModalOpen = ref(false)
const activeGoalForAction = ref<SavingsGoal | null>(null)
const depositAmount = ref('')
const depositNote = ref('')
const isWithdrawal = ref(false)
const isSavingDeposit = ref(false)

const openDepositModal = (goal: SavingsGoal) => {
  activeGoalForAction.value = goal
  depositAmount.value = ''
  depositNote.value = ''
  isWithdrawal.value = false
  isDepositModalOpen.value = true
}

const closeDepositModal = () => {
  isDepositModalOpen.value = false
}

const projectedAmount = computed(() => {
  if (!activeGoalForAction.value) return 0
  const cur = activeGoalForAction.value.current_amount || 0
  const inputAmt = parseFloat(depositAmount.value) || 0
  if (isWithdrawal.value) {
    return Math.max(0, cur - inputAmt)
  }
  return cur + inputAmt
})

const handleSaveDeposit = async () => {
  if (isSavingDeposit.value || !activeGoalForAction.value) return
  const amt = parseFloat(depositAmount.value)
  if (isNaN(amt) || amt <= 0) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40)
    triggerToast('Wpisz kwotę większą niż 0 zł', { type: 'warning' })
    return
  }
  if (isWithdrawal.value && amt > (activeGoalForAction.value.current_amount || 0)) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40)
    triggerToast('Kwota wypłaty przekracza aktualny stan skarbonki', { type: 'warning' })
    return
  }

  const effectiveAmt = isWithdrawal.value ? -amt : amt
  const goalBefore = activeGoalForAction.value
  const willComplete = !isWithdrawal.value && (goalBefore.current_amount + amt >= goalBefore.target_amount)

  isSavingDeposit.value = true
  try {
    const success = await addSavingsContribution(goalBefore.id, effectiveAmt, depositNote.value)
    if (success) {
      if (willComplete) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        })
        playNotificationChime()
      }
      closeDepositModal()
    }
  } finally {
    isSavingDeposit.value = false
  }
}

// --------------------------------------------------------------------------
// MODAL STATE: HISTORY
// --------------------------------------------------------------------------
const isHistoryModalOpen = ref(false)

const openHistoryModal = (goal: SavingsGoal) => {
  activeGoalForAction.value = goal
  isHistoryModalOpen.value = true
}

const closeHistoryModal = () => {
  isHistoryModalOpen.value = false
}

const activeGoalContributions = computed(() => {
  if (!activeGoalForAction.value) return []
  return savingsContributions.value.filter(c => c.goal_id === activeGoalForAction.value!.id)
})

const handleDeleteContribution = async (contrib: SavingsContribution) => {
  const confirmed = await confirm({
    title: 'Usuń wpis z historii',
    message: `Czy na pewno chcesz usunąć wpis na kwotę ${formatMoney(contrib.amount)} zł? Stan skarbonki zostanie odpowiednio skorygowany.`,
    confirmText: 'Usuń wpis',
    cancelText: 'Anuluj',
    type: 'danger'
  })
  if (!confirmed) return
  await deleteSavingsContribution(contrib.id)
}

// --------------------------------------------------------------------------
// ACTION SHEET: MORE GOAL OPTIONS
// --------------------------------------------------------------------------
const isActionSheetOpen = ref(false)

const openGoalActions = (goal: SavingsGoal) => {
  activeGoalForAction.value = goal
  isActionSheetOpen.value = true
}

const goalActionButtons = computed(() => [
  {
    text: 'Wpłać lub wypłać środki',
    description: 'Zmień aktualną kwotę oszczędności w tej skarbonce',
    icon: ioniconsAddOutline,
    handler: () => {
      if (activeGoalForAction.value) openDepositModal(activeGoalForAction.value)
    }
  },
  {
    text: 'Zobacz historię operacji',
    description: 'Przeglądaj wszystkie wpłaty i wypłaty w tej skarbonce',
    icon: ioniconsTimeOutline,
    handler: () => {
      if (activeGoalForAction.value) openHistoryModal(activeGoalForAction.value)
    }
  },
  {
    text: 'Edytuj skarbonkę',
    description: 'Zmień kwotę docelową, nazwę, kategorię lub termin',
    icon: ioniconsCreateOutline,
    handler: () => {
      if (activeGoalForAction.value) openEditModal(activeGoalForAction.value)
    }
  },
  {
    text: 'Usuń skarbonkę',
    description: 'Bezpowrotnie skasuj ten cel wraz z historią',
    role: 'destructive',
    danger: true,
    icon: ioniconsTrashOutline,
    handler: async () => {
      if (!activeGoalForAction.value) return
      const target = activeGoalForAction.value
      const confirmed = await confirm({
        title: 'Usuń skarbonkę',
        message: `Czy na pewno chcesz bezpowrotnie usunąć skarbonkę "${target.title}" oraz całą jej historię wpłat?`,
        confirmText: 'Usuń cel',
        cancelText: 'Anuluj',
        type: 'danger'
      })
      if (confirmed) {
        if (deletingGoalIds.value.has(target.id)) return
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([10, 30, 10])
        }
        deletingGoalIds.value.add(target.id)
        setTimeout(async () => {
          try {
            await deleteSavingsGoal(target.id)
          } finally {
            deletingGoalIds.value.delete(target.id)
          }
        }, 240)
      }
    }
  },
  {
    text: 'Anuluj',
    role: 'cancel',
    icon: ioniconsCloseOutline
  }
])

const handleRefresh = async (event: any) => {
  try {
    const { initSupabaseSync } = useDuoState()
    await initSupabaseSync(true)
  } catch (_) {
  } finally {
    event.target.complete()
  }
}
</script>

<style scoped>
.savings-container {
  padding: 12px 16px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Header Action Button (Exact DuoNest Style) */
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

/* Main tabs toolbar styling */
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
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 999px;
}

.tab-pet-lvl {
  font-size: 10px;
  font-weight: 800;
  background: #fdf2f8;
  color: #db2777;
  padding: 1px 5px;
  border-radius: 999px;
}

/* SUBVIEW TOOLBAR (Identical to meals.vue / tasks.vue) */
.subview-toolbar {
  --background: #ffffff;
  padding: 0 16px 8px;
}

.subview-segmented-wrap {
  display: flex;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 3px;
  border-radius: 12px;
  gap: 3px;
}

.subview-pill {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 7px 6px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}

.subview-pill ion-icon {
  font-size: 14px;
}

.subview-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.subview-count-badge {
  font-size: 10px;
  font-weight: 700;
  background: #e2e8f0;
  color: #334155;
  padding: 1px 6px;
  border-radius: 8px;
}

.subview-pill.active .subview-count-badge {
  background: #0f172a;
  color: #ffffff;
}

/* TOTAL SAVINGS HERO DASHBOARD CARD (Signature DuoNest Dark Slate) */
.savings-summary-hero {
  background: linear-gradient(135deg, #090e1a 0%, #0f172a 45%, #1e293b 100%);
  color: #ffffff;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 10px 30px -4px rgba(15, 23, 42, 0.35);
  margin: 0;
}

.hero-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.hero-section-tag {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #94a3b8;
  display: block;
  margin-bottom: 4px;
}

.hero-balance-val {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0;
  line-height: 1.15;
}

.hero-balance-val small {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-left: 2px;
}

.hero-balance-sub {
  font-size: 12.5px;
  color: #cbd5e1;
  margin: 4px 0 0 0;
  font-weight: 500;
}

.hero-icon-circle {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #ffffff;
  flex-shrink: 0;
}

.hero-progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #94a3b8;
}

.hero-progress-header strong {
  color: #ffffff;
}

.hero-pct-pill {
  font-size: 11px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hero-progress-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.hero-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%);
  transition: width 0.4s ease;
}

.hero-stats-footer {
  display: flex;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.hero-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 4px 10px;
  border-radius: 999px;
}

.hero-stat-pill ion-icon {
  font-size: 13px;
}

.text-emerald {
  color: #34d399 !important;
}

/* FILTER PILLS (Matching shopping.vue) */
.filter-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  transition: all 0.15s ease;
}

.filter-pill:active {
  transform: scale(0.96);
}

.filter-pill.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.filter-badge {
  background: #f1f5f9;
  color: #475569;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
}

.filter-pill.active .filter-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* EMPTY STATE */
.empty-state-card {
  padding: 36px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  margin: 0;
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.empty-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  max-width: 280px;
  line-height: 1.45;
}

.empty-action-btn {
  margin-top: 6px;
}

/* GOALS GRID & CARDS */
.goals-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.goal-card {
  padding: 18px;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: var(--dn-card-shadow);
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid #e2e8f0;
  margin: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.goal-card.is-completed {
  border-color: #a7f3d0;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
}

.goal-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.goal-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.goal-info {
  flex: 1;
  min-width: 0;
}

.goal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.goal-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.3;
}

.badge-completed {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  background: #d1fae5;
  padding: 2px 7px;
  border-radius: 8px;
}

.goal-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.goal-menu-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
}

.goal-menu-btn:active {
  background: #e2e8f0;
}

/* PROGRESS BAR IN GOAL */
.goal-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goal-amounts-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.current-amt-label,
.target-amt-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.current-amt-value {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.current-amt-value small,
.target-amt-value small {
  font-size: 11.5px;
  font-weight: 700;
  color: #64748b;
  margin-left: 2px;
}

.target-amt-value {
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  line-height: 1.1;
}

.goal-track {
  width: 100%;
  height: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.goal-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.goal-progress-sub {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
}

.pct-text {
  font-weight: 700;
  color: #0f172a;
}

.missing-text {
  font-weight: 500;
  color: #64748b;
}

.success-text {
  font-weight: 700;
  color: #059669;
}

/* RECENT CONTRIBUTION SNAPSHOT */
.goal-recent-contrib {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  font-size: 11.5px;
  color: #475569;
}

.contrib-user-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.contrib-snapshot-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  padding-bottom: 1px;
}

/* GOAL ACTIONS ROW */
.goal-actions-row {
  display: flex;
  gap: 8px;
}

.goal-action-primary {
  flex: 1;
  padding: 10px 14px;
  font-size: 13px;
}

.goal-action-secondary {
  padding: 10px 14px;
  font-size: 13px;
}

/* ========================================================================== */
/* MODAL STYLES (Matching wishlist.vue / meals.vue)                           */
/* ========================================================================== */
ion-modal.dn-savings-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
}

.modal-custom-header ion-toolbar {
  --background: #ffffff;
  --border-width: 0;
  padding: 6px 12px;
}

.dn-form-sheet-handle-spacer {
  height: 8px;
}

.modal-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 4px;
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-title-icon {
  font-size: 20px;
  color: #0f172a;
}

.modal-title-wrap ion-title {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  padding: 0;
}

.modal-close-icon-btn {
  background: #f1f5f9;
  border: none;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
  font-size: 22px;
  touch-action: manipulation;
  transition: all 0.15s ease;
}

.modal-close-icon-btn:active {
  transform: scale(0.92);
  background: #e2e8f0;
}

.modal-form-content,
.history-content {
  --background: #ffffff;
}

.goal-form,
.deposit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row-2 {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.form-label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.custom-ion-input {
  --background: #f8fafc;
  --border-color: #e2e8f0;
  --border-width: 1px;
  --border-style: solid;
  --border-radius: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
  --color: #0f172a;
  font-size: 14px;
}

.large-amount-input {
  font-size: 18px;
  font-weight: 700;
}

.category-select-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 2px 0;
}

.category-select-scroll::-webkit-scrollbar {
  display: none;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cat-chip.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.icon-selector-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.icon-pick-btn {
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #475569;
  cursor: pointer;
}

.icon-pick-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.color-picker-row {
  display: flex;
  gap: 10px;
}

.color-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 16px;
  cursor: pointer;
}

.color-circle.active {
  box-shadow: 0 0 0 2px #0f172a;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
  padding: 14px 18px;
  font-size: 14px;
}

.submit-btn.is-withdraw {
  background: #d97706;
}

/* DEPOSIT MODAL SPECIFICS */
.deposit-goal-name-badge {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
}

.deposit-status-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.deposit-status-item {
  display: flex;
  flex-direction: column;
}

.box-label {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.04em;
}

.box-val {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin-top: 2px;
}

.box-val.highlighted {
  font-size: 19px;
}

.deposit-status-arrow {
  font-size: 20px;
}

.deposit-quick-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-title {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.quick-chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.quick-chips::-webkit-scrollbar {
  display: none;
}

.quick-preset-btn {
  padding: 7px 13px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 12.5px;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.quick-preset-btn:active {
  transform: scale(0.96);
}

.quick-preset-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.withdraw-toggle-row {
  display: flex;
  justify-content: center;
}

.toggle-link-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 4px;
}

.toggle-link-btn ion-icon {
  font-size: 14px;
}

/* HISTORY MODAL SPECIFICS */
.history-goal-header {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-goal-badge {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.history-total-sub {
  font-size: 12px;
  color: #64748b;
}

.empty-history {
  padding: 30px 10px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.history-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-avatar-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.history-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.history-author-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.history-date {
  font-size: 11px;
  color: #94a3b8;
}

.history-note {
  font-size: 11.5px;
  color: #64748b;
  margin: 2px 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.35;
  padding-bottom: 1px;
}

.history-item-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.history-amount {
  font-size: 14.5px;
  font-weight: 800;
}

.history-amount.positive {
  color: #059669;
}

.history-amount.negative {
  color: #d97706;
}

.delete-contrib-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  padding: 4px;
  cursor: pointer;
  border-radius: 6px;
}

.delete-contrib-btn:hover {
  color: #ef4444;
}
</style>
