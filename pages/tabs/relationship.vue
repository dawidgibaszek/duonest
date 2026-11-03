<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="dn-header-title">
            <span>Strefa Relacji</span>
          </div>
          <p class="dn-header-subtitle">Nastroje, drobne gesty i bliskość</p>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- 0A. TWÓJ PROFIL & DANE OSOBOWE -->
      <div class="dn-card my-profile-card">
        <div class="card-title-row">
          <span class="section-tag">TWÓJ PROFIL</span>
          <span class="active-profile-pill">
            <span class="pulsing-green-dot"></span>
            Twój profil
          </span>
        </div>

        <div class="profile-hero-row">
          <div class="profile-avatar-circle" :style="{ backgroundColor: currentUser.avatar_color || '#0284c7' }">
            <span>{{ currentUser.name.charAt(0) }}</span>
          </div>
          <div class="profile-name-info">
            <div class="profile-name-row">
              <h3>{{ currentUser.name }}</h3>
              <span class="me-pill">Ty</span>
            </div>
          </div>
          <button class="edit-profile-btn" @click="openEditProfileModal" title="Edytuj profil">
            <DuoIcon name="edit" :size="16" />
            <span>Edytuj profil</span>
          </button>
        </div>

        <!-- Love Note / Motto -->
        <div class="profile-note-box" v-if="currentUser.love_note">
          <DuoIcon name="quote" :size="14" class="quote-icon" />
          <span class="quote-text">"{{ currentUser.love_note }}"</span>
        </div>

        <!-- Quick Preferences (Drink & Treat) -->
        <div class="profile-prefs-grid">
          <div class="pref-badge">
            <DuoIcon name="drink" :size="16" />
            <div class="pref-texts">
              <span class="pref-label">Ulubiony napój:</span>
              <span class="pref-value">{{ currentUser.favorite_drink || 'Kawa z mlekiem' }}</span>
            </div>
          </div>
          <div class="pref-badge">
            <DuoIcon name="treat" :size="16" />
            <div class="pref-texts">
              <span class="pref-label">Ulubiona przekąska:</span>
              <span class="pref-value">{{ currentUser.favorite_treat || 'Czekolada' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 0B. PROFIL PARTNERA -->
      <div class="dn-card partner-profile-card" v-if="partnerUser">
        <div class="card-title-row">
          <span class="section-tag partner-tag">PROFIL PARTNERA</span>
          <span class="partner-online-pill" :class="{ 'is-live': isPartnerOnline }">
            <span class="online-dot" :class="{ 'is-live': isPartnerOnline }"></span>
            {{ isPartnerOnline ? 'W aplikacji' : 'Offline' }}
          </span>
        </div>

        <div class="profile-hero-row">
          <div class="profile-avatar-circle partner-avatar" :style="{ backgroundColor: partnerUser.avatar_color || '#0d9488' }">
            <span>{{ partnerUser.name.charAt(0) }}</span>
          </div>
          <div class="profile-name-info">
            <div class="profile-name-row">
              <h3>{{ partnerUser.name }}</h3>
              <span class="partner-pill">Partner</span>
            </div>
          </div>
        </div>

        <!-- Partner's Love Note -->
        <div class="profile-note-box partner-note-box" v-if="partnerUser.love_note">
          <DuoIcon name="quote" :size="14" class="quote-icon" />
          <span class="quote-text">"{{ partnerUser.love_note }}"</span>
        </div>

        <!-- Partner's Favorite drink & treat -->
        <div class="profile-prefs-grid">
          <div class="pref-badge partner-pref">
            <DuoIcon name="drink" :size="16" />
            <div class="pref-texts">
              <span class="pref-label">Ulubiony napój partnera:</span>
              <span class="pref-value">{{ partnerUser.favorite_drink || 'Herbata / Kawa' }}</span>
            </div>
          </div>
          <div class="pref-badge partner-pref">
            <DuoIcon name="treat" :size="16" />
            <div class="pref-texts">
              <span class="pref-label">Ulubiona przekąska partnera:</span>
              <span class="pref-value">{{ partnerUser.favorite_treat || 'Słodycze' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 1. JAK SIĘ DZIŚ CZUJESZ? (UPDATE MY MOOD) -->
      <div class="dn-card mood-selector-card">
        <div class="card-title-row">
          <span class="section-tag">TWÓJ NASTRÓJ</span>
          <span class="active-mood-badge">
            <DuoIcon :name="'mood-' + (currentUser.current_mood || 'happy')" :size="16" />
            <span>{{ getMoodLabel(currentUser.current_mood) }}</span>
          </span>
        </div>
        <h4>Jak się dziś czujesz?</h4>
        <p class="section-desc">Twój partner natychmiast zobaczy ten stan na swoim pulpicie.</p>

        <div class="moods-grid">
          <button
            type="button"
            v-for="m in moodChoices"
            :key="m.id"
            class="mood-btn"
            :class="{ active: selectedMood === m.id }"
            @click="selectedMood = m.id"
          >
            <div class="mood-icon-circle">
              <DuoIcon :name="'mood-' + m.id" :size="22" />
            </div>
            <span class="mood-title">{{ m.label }}</span>
          </button>
        </div>

        <div class="mood-note-input-box">
          <ion-input
            v-model="moodNote"
            placeholder="Dodaj krótką notatkę (np. Potrzebuję dziś chwili ciszy...)"
            class="custom-note-input"
            :clear-input="true"
          />
          <button class="dn-button-sea save-mood-btn" @click="handleSaveMood">
            <ion-icon :icon="ioniconsCheckmarkOutline" />
            <span>Zapisz nastrój</span>
          </button>
        </div>
      </div>

      <!-- 2. PARTNER STATUS & LAST NUDGE -->
      <div class="dn-card partner-status-card" v-if="partnerUser">
        <div class="card-title-row">
          <span class="section-tag partner-tag">STAN PARTNERA</span>
          <span class="sync-time">{{ formattedPartnerMoodTime }}</span>
        </div>
        <h4>Aktualny nastrój: {{ partnerUser.name }}</h4>

        <div class="partner-mood-view">
          <div class="partner-icon-wrapper">
            <DuoIcon :name="'mood-' + (partnerUser.current_mood || 'happy')" :size="28" />
          </div>
          <div class="partner-text-wrapper">
            <span class="partner-mood-name">{{ getMoodLabel(partnerUser.current_mood) }}</span>
            <p class="partner-note-text" v-if="partnerUser.mood_note">
              "{{ partnerUser.mood_note }}"
            </p>
            <p class="partner-empty-note" v-else>
              Partner nie dodał jeszcze dzisiaj notatki.
            </p>
          </div>
        </div>
      </div>

      <!-- 3. CODZIENNE PUKNIĘCIE (NUDGE / DROBNE GESTY) -->
      <div class="dn-card daily-nudge-card">
        <div class="card-title-row">
          <span class="section-tag love-tag">DROBNE GESTY</span>
          <span class="limit-badge">1 raz dziennie • +5 pkt</span>
        </div>
        <h4>Codzienne puknięcie (Nudge)</h4>
        <p class="section-desc">Wyślij ciepły gest, aby przypomnieć o sobie w ciągu dnia.</p>

        <div class="nudge-types-grid">
          <button
            type="button"
            v-for="n in nudgePresets"
            :key="n.id"
            class="nudge-preset-btn"
            :class="{ active: selectedNudgeType === n.id }"
            @click="selectedNudgeType = n.id"
          >
            <div class="nudge-icon-circle">
              <DuoIcon :name="'nudge-' + n.id" :size="22" />
            </div>
            <span class="nudge-name">{{ n.title }}</span>
          </button>
        </div>

        <div class="nudge-send-box">
          <ion-input
            v-model="customNudgeMessage"
            placeholder="Opcjonalna czuła wiadomość do gestu..."
            class="custom-note-input"
          />
          <button class="dn-button-sea send-nudge-btn" @click="handleSendNudge">
            <ion-icon :icon="ioniconsHeartOutline" />
            <span>Wyślij puknięcie</span>
          </button>
        </div>

        <!-- RECENT NUDGES LOG -->
        <div class="recent-nudges-section" v-if="nudgesList.length > 0">
          <span class="sub-heading">Ostatnie gesty:</span>
          <div class="nudges-history-list">
            <div v-for="ndg in nudgesList.slice(0, 3)" :key="ndg.id" class="history-item">
              <div class="history-icon-bubble">
                <DuoIcon :name="'nudge-' + ndg.nudge_type" :size="16" />
              </div>
              <div class="history-text">
                <span class="history-author">
                  {{ ndg.sender_id === currentUser.id ? 'Ty' : (partnerUser?.name || 'Partner') }}:
                </span>
                <span class="history-msg">{{ ndg.message || ndg.nudge_type }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. WASZE POŁĄCZENIE I USTAWIENIA PARSTWA -->
      <div class="dn-card pairing-card" v-if="partnership">
        <div class="card-title-row">
          <span class="section-tag pairing-tag">WASZE GNIAZDKO</span>
          <span class="connected-pill">
            <ion-icon :icon="ioniconsCheckmarkCircle" />
            Połączono
          </span>
        </div>
        <h4>{{ partnership.nest_name || 'Nasze Ciepłe Gniazdko' }}</h4>
        <p class="section-desc">Budujecie wspólne gniazdko od {{ daysTogether }} dni.</p>

        <div class="partnership-actions-box">
          <div class="partnership-meta-info" v-if="partnerUser">
            <span class="partner-meta-label">Twój Partner:</span>
            <span class="partner-meta-name">{{ partnerUser.name }}</span>
          </div>
          <div class="partnership-buttons-row">
            <button class="disconnect-pair-btn" @click="handleDisconnect">
              <ion-icon :icon="ioniconsLogOutOutline" />
              <span>Rozłącz konto</span>
            </button>
            <button class="signout-app-btn" @click="handleSignOut">
              <ion-icon :icon="ioniconsPowerOutline" />
              <span>Wyloguj się</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Jeśli jeszcze nie połączony -->
      <div class="dn-card pairing-card" v-else>
        <div class="card-title-row">
          <span class="section-tag pairing-tag">POŁĄCZENIE PARY</span>
        </div>
        <h4>Połącz się z partnerem</h4>
        <p class="section-desc">Wpisz kod partnera lub przekaż mu swój, aby wspólnie korzystać z aplikacji.</p>

        <div class="my-code-box">
          <span class="code-label">TWÓJ KOD</span>
          <div class="code-display-row">
            <span class="code-text">{{ currentUser.pairing_code }}</span>
            <button class="copy-btn" @click="copyPairingCode" title="Kopiuj kod">
              <ion-icon :icon="ioniconsCopyOutline" />
              <span>{{ copyStatus }}</span>
            </button>
          </div>
        </div>

        <div class="join-box">
          <label class="input-label">Kod partnera:</label>
          <div class="join-input-row">
            <ion-input
              v-model="inputPartnerCode"
              placeholder="np. DN-LOVE"
              class="partner-code-input"
              maxlength="10"
            />
            <button class="join-submit-btn" @click="handlePairWithCode" :disabled="!inputPartnerCode.trim()">
              Połącz
            </button>
          </div>
          <span class="error-text" v-if="pairingError">{{ pairingError }}</span>
        </div>
      </div>

      <!-- 6. EDIT PROFILE MODAL -->
      <ion-modal :is-open="isEditProfileModalOpen" @didDismiss="closeEditProfileModal" class="dn-edit-profile-modal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Edycja Twojego Profilu</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="closeEditProfileModal">Zamknij</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding edit-modal-content">
          <div class="modal-form-wrapper">
            <div class="edit-intro-banner">
              <ion-icon :icon="ioniconsSparkles" class="intro-sparkle" />
              <p>Zmień swoje dane. Twój partner <strong>od razu zobaczy zmiany na żywo</strong> na swoim telefonie!</p>
            </div>

            <!-- Imię / Pseudonim -->
            <div class="form-group">
              <label class="form-label">Twoje imię lub pseudonim</label>
              <ion-input
                v-model="editProfileForm.name"
                placeholder="np. Dawid, Kasia..."
                class="dn-styled-input"
                :clear-input="true"
              />
            </div>

            <!-- Wybór koloru avatara -->
            <div class="form-group">
              <label class="form-label">Wybierz kolor swojego awatara</label>
              <div class="avatar-palette-grid">
                <button
                  type="button"
                  v-for="c in avatarColorPresets"
                  :key="c.hex"
                  class="color-pick-circle"
                  :style="{ backgroundColor: c.hex }"
                  :class="{ active: editProfileForm.avatar_color === c.hex }"
                  @click="editProfileForm.avatar_color = c.hex"
                  :title="c.label"
                >
                  <ion-icon v-if="editProfileForm.avatar_color === c.hex" :icon="ioniconsCheckmark" class="color-check-icon" />
                </button>
              </div>
            </div>

            <!-- Czuła wiadomość / motto dla partnera -->
            <div class="form-group">
              <label class="form-label">Czuła wiadomość / motto dla partnera</label>
              <ion-textarea
                v-model="editProfileForm.love_note"
                placeholder="np. Zawsze przy Tobie! / Najlepszy dzień to ten spędzony z Tobą..."
                class="dn-styled-textarea"
                :rows="2"
                :auto-grow="true"
              />
            </div>

            <!-- Ulubiony napój -->
            <div class="form-group">
              <label class="form-label">Ulubiony napój (by partner wiedział co przynieść)</label>
              <ion-input
                v-model="editProfileForm.favorite_drink"
                placeholder="np. Kawa z mlekiem owsianym, Matcha latte..."
                class="dn-styled-input"
                :clear-input="true"
              />
              <div class="quick-chips-row">
                <button
                  type="button"
                  v-for="drink in quickDrinkSuggestions"
                  :key="drink"
                  class="chip-btn"
                  @click="editProfileForm.favorite_drink = drink"
                >
                  {{ drink }}
                </button>
              </div>
            </div>

            <!-- Ulubiona przekąska / słodycz -->
            <div class="form-group">
              <label class="form-label">Ulubiona przekąska / słodycz</label>
              <ion-input
                v-model="editProfileForm.favorite_treat"
                placeholder="np. Pistacje, Czekolada z solą morską, Sernik..."
                class="dn-styled-input"
                :clear-input="true"
              />
              <div class="quick-chips-row">
                <button
                  type="button"
                  v-for="treat in quickTreatSuggestions"
                  :key="treat"
                  class="chip-btn"
                  @click="editProfileForm.favorite_treat = treat"
                >
                  {{ treat }}
                </button>
              </div>
            </div>

            <!-- Nazwa Gniazdka & Rocznica -->
            <div class="nest-subform-box" v-if="partnership">
              <div class="subform-header">
                <DuoIcon name="calendar-heart" :size="18" />
                <span>Wasze Gniazdko & Data Rocznicy</span>
              </div>

              <div class="form-group">
                <label class="form-label">Nazwa Waszego Gniazdka</label>
                <ion-input
                  v-model="editProfileForm.nest_name"
                  placeholder="np. Nasze Ciepłe Gniazdko"
                  class="dn-styled-input"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Data rocznicy / początku relacji</label>
                <ion-input
                  type="date"
                  v-model="editProfileForm.anniversary_date"
                  class="dn-styled-input"
                />
              </div>
            </div>

            <!-- Save Button -->
            <div class="modal-actions-row">
              <button class="dn-button-sea save-all-profile-btn" @click="handleSaveProfile" :disabled="!editProfileForm.name.trim()">
                <ion-icon :icon="ioniconsCheckmarkDoneOutline" />
                <span>Zapisz zmiany (partner widzi natychmiast)</span>
              </button>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <div style="height: 30px;"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState } from '~/composables/useDuoState'
import DuoIcon from '~/components/DuoIcon.vue'

const {
  currentUser,
  partnerUser,
  partnership,
  daysTogether,
  nudgesList,
  isPartnerOnline,
  updateMood,
  sendNudge,
  updateMyProfile,
  pairWithCode,
  disconnectPartnership,
  signOutUser,
  triggerToast
} = useDuoState()

const isEditProfileModalOpen = ref(false)
const editProfileForm = ref({
  name: '',
  avatar_color: '#0284c7',
  love_note: '',
  favorite_drink: '',
  favorite_treat: '',
  nest_name: '',
  anniversary_date: ''
})

const avatarColorPresets = [
  { hex: '#0284c7', label: 'Błękit Oceanu' },
  { hex: '#0d9488', label: 'Morski Szmaragd' },
  { hex: '#f43f5e', label: 'Różana Czerwień' },
  { hex: '#8b5cf6', label: 'Fiolet Lawendowy' },
  { hex: '#f59e0b', label: 'Ciepły Bursztyn' },
  { hex: '#6366f1', label: 'Głębokie Indygo' }
]

const quickDrinkSuggestions = ['Kawa z mlekiem', 'Kawa owsiana', 'Matcha latte', 'Herbata Earl Grey', 'Woda z cytryną']
const quickTreatSuggestions = ['Czekolada pistacjowa', 'Pistacje', 'Żelki malinowe', 'Sernik', 'Truskawki']

const openEditProfileModal = () => {
  editProfileForm.value = {
    name: currentUser.value.name || '',
    avatar_color: currentUser.value.avatar_color || '#0284c7',
    love_note: currentUser.value.love_note || '',
    favorite_drink: currentUser.value.favorite_drink || '',
    favorite_treat: currentUser.value.favorite_treat || '',
    nest_name: partnership.value?.nest_name || 'Nasze Ciepłe Gniazdko',
    anniversary_date: partnership.value?.anniversary_date || ''
  }
  isEditProfileModalOpen.value = true
}

const closeEditProfileModal = () => {
  isEditProfileModalOpen.value = false
}

const handleSaveProfile = async () => {
  if (!editProfileForm.value.name.trim()) return
  await updateMyProfile(editProfileForm.value)
  isEditProfileModalOpen.value = false
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#0284c7', '#0d9488', '#38bdf8', '#f43f5e']
  })
}

const selectedMood = ref(currentUser.value.current_mood || 'happy')
const moodNote = ref(currentUser.value.mood_note || '')
const selectedNudgeType = ref('hug')
const customNudgeMessage = ref('')
const inputPartnerCode = ref('')
const pairingError = ref('')
const copyStatus = ref('Kopiuj')

const moodChoices = [
  { id: 'happy', label: 'Radość' },
  { id: 'loved', label: 'Zakochany' },
  { id: 'romantic', label: 'Romantycznie' },
  { id: 'cozy', label: 'Przytulnie' },
  { id: 'tired', label: 'Zmęczenie' },
  { id: 'stressed', label: 'Wsparcie' },
  { id: 'excited', label: 'Ekscytacja' }
]

const nudgePresets = [
  { id: 'hug', title: 'Uścisk', defaultMsg: 'Ciepły uścisk w trakcie dnia!' },
  { id: 'kiss', title: 'Buziak', defaultMsg: 'Słodki buziak dla Ciebie!' },
  { id: 'tea', title: 'Herbatka', defaultMsg: 'Zrobiłem dla Ciebie herbatkę!' },
  { id: 'love', title: 'Kocham Cię', defaultMsg: 'Pamiętaj, że bardzo Cię kocham!' },
  { id: 'massage', title: 'Masaż', defaultMsg: 'Wieczorny relaksujący masaż czeka na Ciebie!' }
]

const formattedPartnerMoodTime = computed(() => {
  if (!partnerUser.value?.mood_updated_at) return 'Dzisiaj'
  const date = new Date(partnerUser.value.mood_updated_at)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
})

const getMoodLabel = (mood?: string | null) => {
  const choice = moodChoices.find(c => c.id === mood)
  return choice ? choice.label : 'Dobry'
}

const handleSaveMood = async () => {
  await updateMood(selectedMood.value, moodNote.value)
}

const handleSendNudge = async () => {
  const preset = nudgePresets.find(p => p.id === selectedNudgeType.value)
  const messageToSend = customNudgeMessage.value.trim() || preset?.defaultMsg || 'Puknięcie miłości!'

  const success = await sendNudge(selectedNudgeType.value, messageToSend)
  if (success) {
    customNudgeMessage.value = ''
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#0284c7', '#0ea5e9', '#0d9488', '#f43f5e']
    })
  }
}

const copyPairingCode = async () => {
  try {
    await navigator.clipboard.writeText(currentUser.value.pairing_code)
    copyStatus.value = 'Skopiowano!'
    setTimeout(() => {
      copyStatus.value = 'Kopiuj'
    }, 2500)
    triggerToast('Kod skopiowany do schowka!')
  } catch (e) {
    copyStatus.value = 'DN-CODE'
  }
}

const handlePairWithCode = async () => {
  pairingError.value = ''
  if (!inputPartnerCode.value.trim()) return

  const res = await pairWithCode(inputPartnerCode.value.trim())
  if (!res.success) {
    pairingError.value = res.error || 'Błąd parowania'
  } else {
    inputPartnerCode.value = ''
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
  }
}

const handleDisconnect = () => {
  disconnectPartnership()
  navigateTo('/pairing', { replace: true })
}

const handleSignOut = async () => {
  await signOutUser()
}

const handleRefresh = (event: any) => {
  setTimeout(() => {
    event.target.complete()
  }, 600)
}
</script>

<style scoped>
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.section-tag {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #0284c7;
}

.partner-tag {
  color: #0d9488;
}

.love-tag {
  color: #f43f5e;
}

.pairing-tag {
  color: #0284c7;
}

.active-mood-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #0284c7;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  padding: 2px 8px;
  border-radius: 999px;
}

.section-desc {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 14px 0;
  line-height: 1.4;
}

/* MOOD SELECTOR */
.moods-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.mood-btn {
  background: #f8fafc;
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

.mood-btn.active {
  background: #f0f9ff;
  border-color: #0284c7;
  color: #0284c7;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.15);
}

.mood-icon-circle {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  color: #0284c7;
}

.mood-btn.active .mood-icon-circle {
  border-color: #0284c7;
  background: #0284c7;
  color: #ffffff;
}

.mood-title {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}

.mood-note-input-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.custom-note-input {
  --background: #f8fafc;
  --padding-start: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
}

.save-mood-btn {
  width: 100%;
}

/* PARTNER MOOD VIEW */
.partner-mood-view {
  display: flex;
  gap: 14px;
  align-items: center;
  background: #f8fafc;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.partner-icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: #0d9488;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
}

.partner-text-wrapper {
  flex: 1;
}

.partner-mood-name {
  font-size: 13px;
  font-weight: 700;
  color: #0d9488;
  display: block;
}

.partner-note-text {
  font-size: 13px;
  color: #334155;
  font-style: italic;
  margin: 2px 0 0 0;
}

.partner-empty-note {
  font-size: 12px;
  color: #94a3b8;
  margin: 2px 0 0 0;
}

.sync-time {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

/* DAILY NUDGE */
.limit-badge {
  font-size: 10px;
  font-weight: 700;
  color: #f43f5e;
  background: #fff1f2;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #ffe4e6;
}

.nudge-types-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.nudge-preset-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nudge-preset-btn.active {
  background: #fff1f2;
  border-color: #f43f5e;
  color: #f43f5e;
}

.nudge-icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f43f5e;
  border: 1px solid #fecdd3;
}

.nudge-name {
  font-size: 10px;
  font-weight: 700;
  color: #475569;
}

.nudge-send-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.send-nudge-btn {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  box-shadow: 0 4px 14px rgba(244, 63, 94, 0.35);
}

.recent-nudges-section {
  margin-top: 16px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.sub-heading {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  display: block;
  margin-bottom: 8px;
}

.nudges-history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: #f8fafc;
  border-radius: 10px;
}

.history-icon-bubble {
  color: #f43f5e;
}

.history-text {
  font-size: 12px;
}

.history-author {
  font-weight: 700;
  color: #0f172a;
}

.history-msg {
  color: #475569;
  margin-left: 4px;
}

/* PAIRING SECTION */
.connected-pill {
  font-size: 11px;
  font-weight: 700;
  color: #16a34a;
  background: #f0fdf4;
  padding: 2px 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.my-code-box {
  background: #f0f9ff;
  border: 1px dashed #0284c7;
  border-radius: 16px;
  padding: 14px;
  text-align: center;
  margin-bottom: 16px;
}

.code-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #0369a1;
  display: block;
}

.code-display-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 6px 0;
}

.code-text {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.15em;
  color: #0284c7;
  font-family: monospace;
}

.copy-btn {
  background: #ffffff;
  border: 1px solid #bae6fd;
  color: #0284c7;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.code-help {
  font-size: 11px;
  color: #64748b;
}

.join-box {
  margin-top: 14px;
}

.input-label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  display: block;
  margin-bottom: 6px;
}

.join-input-row {
  display: flex;
  gap: 8px;
}

.partner-code-input {
  flex: 1;
  --background: #f8fafc;
  --padding-start: 14px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.join-submit-btn {
  background: var(--dn-sea-gradient);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.error-text {
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  display: block;
}

.partnership-actions-box {
  margin-top: 14px;
  background: #f8fafc;
  border-radius: 14px;
  padding: 14px;
  border: 1px solid #e2e8f0;
}

.partnership-meta-info {
  margin-bottom: 10px;
}

.partner-meta-label {
  font-size: 11px;
  color: #64748b;
  display: block;
}

.partner-meta-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.disconnect-pair-btn {
  width: 100%;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 10px;
  padding: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #e11d48;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

.disconnect-pair-btn:active {
  background: #ffe4e6;
}

/* CLOUD STATUS */
.cloud-status-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.cloud-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.cloud-icon-box.online {
  background: #f0fdf4;
  color: #16a34a;
}

.cloud-status-text h5 {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.cloud-status-text p {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0 0;
  line-height: 1.3;
}

/* --- PROFILE CARDS & EDITING STYLES --- */
.my-profile-card {
  border-left: 4px solid #0284c7;
}

.partner-profile-card {
  border-left: 4px solid #0d9488;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%);
}

.active-profile-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #0284c7;
  background: #f0f9ff;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid #bae6fd;
}

.partner-online-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 3px 10px;
  border-radius: 999px;
}

.partner-online-pill.is-live {
  color: #16a34a;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
}

.online-dot.is-live {
  background: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.2);
}

.profile-hero-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  margin-bottom: 12px;
}

.profile-avatar-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.partner-avatar {
  border: 2px solid #ffffff;
}

.profile-name-info {
  flex: 1;
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-name-row h3 {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.me-pill {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  background: #e0f2fe;
  color: #0369a1;
  padding: 1px 7px;
  border-radius: 999px;
}

.partner-pill {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  background: #ccfbf1;
  color: #0f766e;
  padding: 1px 7px;
  border-radius: 999px;
}

.profile-code-sub {
  font-size: 11px;
  color: #64748b;
  margin: 2px 0 0 0;
  font-family: monospace;
  font-weight: 600;
}

.edit-profile-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  color: #0284c7;
  font-size: 12px;
  font-weight: 700;
  padding: 7px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.edit-profile-btn:active {
  background: #e0f2fe;
  transform: scale(0.97);
}

.live-synced-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #0d9488;
  background: #ccfbf1;
  padding: 5px 9px;
  border-radius: 10px;
  flex-shrink: 0;
}

.profile-note-box {
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  border: 1px solid #f1f5f9;
}

.partner-note-box {
  background: #ffffff;
  border-color: #e6fffa;
}

.quote-icon {
  color: #0284c7;
  flex-shrink: 0;
}

.partner-note-box .quote-icon {
  color: #0d9488;
}

.quote-text {
  font-size: 13px;
  font-style: italic;
  color: #334155;
  line-height: 1.4;
}

.profile-prefs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pref-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 8px 10px;
  border-radius: 12px;
}

.partner-pref {
  background: #ffffff;
  border-color: #ccfbf1;
}

.pref-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pref-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.pref-value {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-sync-footnote {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #0d9488;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

/* EDIT PROFILE MODAL */
.edit-modal-content {
  --background: #f8fafc;
}

.modal-form-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

.edit-intro-banner {
  background: linear-gradient(135deg, #f0f9ff 0%, #f0fdfa 100%);
  border: 1px solid #bae6fd;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.intro-sparkle {
  color: #0284c7;
  font-size: 20px;
  margin-top: 2px;
  flex-shrink: 0;
}

.edit-intro-banner p {
  font-size: 13px;
  color: #0369a1;
  margin: 0;
  line-height: 1.4;
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

.dn-styled-input {
  --background: #ffffff;
  --padding-start: 14px;
  --padding-end: 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.dn-styled-textarea {
  --background: #ffffff;
  --padding-start: 14px;
  --padding-end: 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 14px;
}

.avatar-palette-grid {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.color-pick-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.color-pick-circle.active {
  border-color: #0f172a;
  transform: scale(1.15);
}

.color-check-icon {
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
}

.quick-chips-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.chip-btn {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.chip-btn:active {
  background: #e2e8f0;
  color: #0f172a;
}

.nest-subform-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subform-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  color: #0284c7;
}

.modal-actions-row {
  margin-top: 10px;
}

.save-all-profile-btn {
  width: 100%;
  padding: 14px;
  font-size: 14px;
  font-weight: 800;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}





.partnership-buttons-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.signout-app-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.signout-app-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}
</style>
