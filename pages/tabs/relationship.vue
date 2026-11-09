<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="dn-header-title">
            <span>{{ currentCategory === 'relationship' ? 'Strefa Relacji' : 'Ustawienia Gniazdka' }}</span>
          </div>
          <p class="dn-header-subtitle">
            {{ currentCategory === 'relationship' ? 'Nastroje, drobne gesty i Wasza bliskość' : 'Personalizacja Waszego domu, kolory i konto' }}
          </p>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- CATEGORY SEGMENTED SELECTOR -->
      <div class="category-toggle-container">
        <div class="category-toggle-pill">
          <button
            type="button"
            class="cat-toggle-btn"
            :class="{ active: currentCategory === 'relationship' }"
            @click="currentCategory = 'relationship'"
          >
            <ion-icon :icon="ioniconsHeart" />
            <span>Strefa Relacji</span>
          </button>
          <button
            type="button"
            class="cat-toggle-btn"
            :class="{ active: currentCategory === 'nest_settings' }"
            @click="currentCategory = 'nest_settings'"
          >
            <ion-icon :icon="ioniconsSettingsOutline" />
            <span>Ustawienia Gniazdka</span>
          </button>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- KATEGORIA 1: STREFA RELACJI                   -->
      <!-- ============================================== -->
      <div v-show="currentCategory === 'relationship'" class="category-content-wrap">
        
        <!-- 1. KARTA NASZEJ RELACJI (THE COUPLE HUB) -->
        <div class="dn-card couple-hub-card">
          <div class="card-title-row">
            <span class="section-tag couple-tag">
              <ion-icon :icon="ioniconsHeart" />
              NASZA RELACJA
            </span>
            <button class="edit-profile-pill-btn" @click="openEditProfileModal" title="Edytuj swój profil">
              <DuoIcon name="edit" :size="13" />
              <span>Edytuj profil</span>
            </button>
          </div>

          <!-- COUPLE HERO BANNER (AVATARS & HEART BRIDGE) -->
          <div class="couple-hero-banner">
            <!-- Left: Current User -->
            <div class="couple-member-col">
              <div class="avatar-ring" :style="{ backgroundColor: currentUserAccentColor }">
                <span class="avatar-initial">{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="member-info">
                <span class="member-name">{{ currentUser.name || 'Ty' }}</span>
                <span class="member-badge me-badge">Ty</span>
              </div>
            </div>

            <!-- Center: Love Bridge & Days Together -->
            <div class="couple-bridge-col">
              <div class="heart-pulse-node">
                <ion-icon :icon="ioniconsHeart" class="heart-node-icon" />
              </div>
              <span class="days-together-pill">
                <ion-icon :icon="ioniconsSparkles" class="sparkle-mini" />
                {{ daysTogether }} dni razem
              </span>
            </div>

            <!-- Right: Partner User -->
            <div class="couple-member-col" v-if="partnerUser">
              <div class="avatar-ring partner-ring" :style="{ backgroundColor: partnerUserAccentColor }">
                <span class="avatar-initial">{{ (partnerUser.name || 'P').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="member-info">
                <span class="member-name">{{ partnerUser.name || 'Partner' }}</span>
                <span class="partner-status-pill" :class="{ 'is-online': isPartnerOnline }">
                  <span class="live-dot" :class="{ 'is-online': isPartnerOnline }"></span>
                  {{ isPartnerOnline ? 'W aplikacji' : 'Offline' }}
                </span>
              </div>
            </div>
            <!-- Unpaired Placeholder -->
            <div class="couple-member-col unpaired-col" v-else @click="currentCategory = 'nest_settings'">
              <div class="avatar-ring unpaired-ring">
                <ion-icon :icon="ioniconsPersonOutline" />
              </div>
              <div class="member-info">
                <span class="member-name">Brak pary</span>
                <span class="pair-now-badge">Połącz teraz</span>
              </div>
            </div>
          </div>

          <!-- LOVE NOTES BUBBLES TRAY -->
          <div class="couple-notes-tray" v-if="(currentUser.love_note && currentUser.love_note.trim()) || (partnerUser?.love_note && partnerUser.love_note.trim())">
            <!-- User Note -->
            <div class="love-bubble user-bubble" v-if="currentUser.love_note && currentUser.love_note.trim()">
              <div class="bubble-initial" :style="{ backgroundColor: currentUserAccentColor }">
                {{ (currentUser.name || 'T').charAt(0).toUpperCase() }}
              </div>
              <div class="bubble-text-wrap">
                <span class="bubble-author">{{ currentUser.name || 'Ty' }}:</span>
                <p class="bubble-quote">"{{ currentUser.love_note }}"</p>
              </div>
            </div>

            <!-- Partner Note -->
            <div class="love-bubble partner-bubble" v-if="partnerUser?.love_note && partnerUser.love_note.trim()">
              <div class="bubble-initial" :style="{ backgroundColor: partnerUserAccentColor }">
                {{ (partnerUser.name || 'P').charAt(0).toUpperCase() }}
              </div>
              <div class="bubble-text-wrap">
                <span class="bubble-author">{{ partnerUser.name || 'Partner' }}:</span>
                <p class="bubble-quote">"{{ partnerUser.love_note }}"</p>
              </div>
            </div>
          </div>

          <!-- Empty Note Invite -->
          <div
            class="empty-notes-invite"
            v-else
            @click="openEditProfileModal"
          >
            <ion-icon :icon="ioniconsSparkles" class="invite-sparkle" />
            <div class="invite-text">
              <span class="invite-title">Napisz coś czułego dla partnera!</span>
              <span class="invite-sub">Kliknij tutaj, aby dodać motto lub ciepłą myśl widoczną w Waszym profilu.</span>
            </div>
            <ion-icon :icon="ioniconsChevronForwardOutline" class="invite-arrow" />
          </div>

          <!-- ŚCIĄGAWKA DLA WAS (ULUBIONE NAPOJE I SMAKOŁYKI) -->
          <div class="couple-cheatsheet-section">
            <div class="cheatsheet-header">
              <div class="cs-header-left">
                <ion-icon :icon="ioniconsSparkles" class="cs-sparkle-icon" />
                <span class="cs-title">Ściągawka małych przyjemności</span>
              </div>
              <span class="cs-sub">Wiesz, co sprawi uśmiech!</span>
            </div>

            <div class="cheatsheet-grid">
              <!-- Ulubiony napój -->
              <div class="cheatsheet-card">
                <div class="cs-card-top">
                  <DuoIcon name="drink" :size="16" />
                  <span class="cs-card-label">Ulubiony napój</span>
                </div>
                <div class="cs-item-row">
                  <span class="cs-who" :style="{ color: currentUserAccentColor }">Ty:</span>
                  <span class="cs-val">{{ currentUser.favorite_drink || 'Nie podano' }}</span>
                </div>
                <div class="cs-item-row" v-if="partnerUser">
                  <span class="cs-who" :style="{ color: partnerUserAccentColor }">{{ partnerUser.name || 'Partner' }}:</span>
                  <span class="cs-val">{{ partnerUser.favorite_drink || 'Nie podano' }}</span>
                </div>
              </div>

              <!-- Ulubiona przekąska -->
              <div class="cheatsheet-card">
                <div class="cs-card-top">
                  <DuoIcon name="treat" :size="16" />
                  <span class="cs-card-label">Ulubiona przekąska</span>
                </div>
                <div class="cs-item-row">
                  <span class="cs-who" :style="{ color: currentUserAccentColor }">Ty:</span>
                  <span class="cs-val">{{ currentUser.favorite_treat || 'Nie podano' }}</span>
                </div>
                <div class="cs-item-row" v-if="partnerUser">
                  <span class="cs-who" :style="{ color: partnerUserAccentColor }">{{ partnerUser.name || 'Partner' }}:</span>
                  <span class="cs-val">{{ partnerUser.favorite_treat || 'Nie podano' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. CENTRUM SAMOPOCZUCIA I NASTROJU (MOOD HUB) -->
        <div class="dn-card mood-hub-card">
          <div class="card-title-row">
            <span class="section-tag mood-tag">
              <ion-icon :icon="ioniconsHappyOutline" />
              SAMOPOCZUCIE
            </span>
            <span class="active-mood-badge">
              <DuoIcon :name="'mood-' + (currentUser.current_mood || 'happy')" :size="14" />
              <span>Twój nastrój: {{ getMoodLabel(currentUser.current_mood) }}</span>
            </span>
          </div>

          <!-- A. STAN PARTNERA (WIDOCZNY NA PIERWSZYM MIEJSCU) -->
          <div class="partner-mood-spotlight" v-if="partnerUser">
            <div class="spotlight-header-row">
              <div class="spotlight-title-group">
                <span class="spotlight-mini-tag">STAN PARTNERA</span>
                <h4>Aktualne samopoczucie: {{ partnerUser.name }}</h4>
              </div>
              <span class="spotlight-sync-time">{{ formattedPartnerMoodTime }}</span>
            </div>

            <div class="spotlight-content-box">
              <div class="spotlight-icon-wrap" :style="{ backgroundColor: partnerUserAccentColor }">
                <DuoIcon :name="'mood-' + (partnerUser.current_mood || 'happy')" :size="28" />
              </div>
              <div class="spotlight-texts">
                <span class="spotlight-mood-name">{{ getMoodLabel(partnerUser.current_mood) }}</span>
                <p class="spotlight-note" v-if="partnerUser.mood_note">
                  "{{ partnerUser.mood_note }}"
                </p>
                <p class="spotlight-note-empty" v-else>
                  Partner nie dodał jeszcze dzisiaj notatki.
                </p>
              </div>
            </div>
          </div>

          <!-- B. JAK SIĘ DZIŚ CZUJESZ? (TWOJA AKTUALIZACJA) -->
          <div class="my-mood-section">
            <div class="my-mood-header">
              <h4>Jak się dziś czujesz?</h4>
              <p class="section-desc">Twój aktualny nastrój i samopoczucie na dziś.</p>
            </div>

            <!-- Mood Buttons Grid -->
            <div class="mood-chips-grid">
              <button
                type="button"
                v-for="m in moodChoices"
                :key="m.id"
                class="mood-chip-btn"
                :class="{ active: selectedMood === m.id }"
                @click="selectedMood = m.id"
              >
                <div class="mood-chip-icon">
                  <DuoIcon :name="'mood-' + m.id" :size="20" />
                </div>
                <span class="mood-chip-label">{{ m.label }}</span>
              </button>
            </div>

            <!-- Mood Note & Save Button -->
            <div class="mood-action-box">
              <div class="input-with-icon-wrap">
                <ion-icon :icon="ioniconsHeartOutline" class="input-leading-icon" />
                <ion-input
                  v-model="moodNote"
                  placeholder="Krótka notatka dla partnera (np. Chwila relaksu, zmęczenie pracą...)"
                  class="dn-styled-input"
                  :clear-input="true"
                />
              </div>
              <button class="dn-button-sea save-mood-btn" @click="handleSaveMood">
                <ion-icon :icon="ioniconsCheckmarkOutline" />
                <span>Zapisz mój nastrój</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 3. CODZIENNE PUKNIĘCIE (NUDGE / DROBNE GESTY) -->
        <div class="dn-card daily-nudge-card">
          <div class="card-title-row">
            <span class="section-tag love-tag">
              <ion-icon :icon="ioniconsHeartOutline" />
              DROBNE GESTY
            </span>
            <span class="limit-badge" :class="{ 'points-done': hasSentDailyNudge }">
              {{ hasSentDailyNudge ? 'Wysłano dzisiaj • +5 pkt' : '1 raz na dobę • +5 pkt' }}
            </span>
          </div>
          <h4>Codzienne puknięcie (Nudge)</h4>

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
              <span>Kolejne puknięcie możesz wysłać za: <strong>{{ formattedNextNudgeTime }}</strong></span>
            </div>
          </div>

          <!-- STATE B: AVAILABLE TO SEND -->
          <template v-else>
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
              <div class="input-with-icon-wrap">
                <ion-icon :icon="ioniconsHeartOutline" class="input-leading-icon" />
                <ion-input
                  v-model="customNudgeMessage"
                  placeholder="Opcjonalna czuła wiadomość do gestu..."
                  class="dn-styled-input"
                  :clear-input="true"
                />
              </div>
              <button class="dn-button-sea send-nudge-btn" @click="handleSendNudge">
                <ion-icon :icon="ioniconsHeartOutline" />
                <span>Wyślij puknięcie (+5 pkt)</span>
              </button>
            </div>
          </template>

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
                    {{ ndg.sender_id === currentUser?.id ? 'Ty' : (partnerUser?.name || 'Partner') }}:
                  </span>
                  <span class="history-msg">{{ ndg.message || getNudgeTitle(ndg.nudge_type) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ============================================== -->
      <!-- KATEGORIA 2: USTAWIENIA GNIAZDKA (DEDYKOWANE)  -->
      <!-- ============================================== -->
      <div v-show="currentCategory === 'nest_settings'" class="category-content-wrap">
        <!-- 1. WASZE GNIAZDKO & DATA ROCZNICY -->
        <div class="dn-card nest-config-card">
          <!-- Card Header & Status -->
          <div class="card-title-row">
            <span class="section-tag nest-section-tag">
              <ion-icon :icon="ioniconsHeart" />
              WASZE GNIAZDKO
            </span>
            <span class="days-together-badge">
              <ion-icon :icon="ioniconsHeart" />
              {{ daysTogether }} dni razem
            </span>
          </div>

          <!-- Hero Intro Box -->
          <div class="nest-hero-banner">
            <div class="nest-hero-icon-wrap">
              <ion-icon :icon="ioniconsHeart" />
            </div>
            <div class="nest-hero-text">
              <h4>{{ nestNameInput || 'Wasze Ciepłe Gniazdko' }}</h4>
              <p>Tworzycie własną przestrzeń i wspólną historię dzień po dniu.</p>
            </div>
          </div>

          <!-- Field 1: Nazwa Gniazdka -->
          <div class="settings-form-group">
            <div class="label-with-hint">
              <label class="form-label">Nazwa Waszego Gniazdka</label>
              <span class="field-hint">Widoczna w nagłówku i na ekranie głównym</span>
            </div>
            <div class="input-with-icon-wrap">
              <ion-icon :icon="ioniconsSparkles" class="input-leading-icon" />
              <ion-input
                v-model="nestNameInput"
                placeholder="np. Nasze Ciepłe Gniazdko"
                class="dn-styled-input"
                :clear-input="true"
              />
            </div>
            <!-- Quick Name Suggestions -->
            <div class="quick-chips-row">
              <span class="chips-mini-label">Propozycje:</span>
              <button
                type="button"
                v-for="sugg in nestNameSuggestions"
                :key="sugg"
                class="chip-btn"
                :class="{ active: nestNameInput === sugg }"
                @click="nestNameInput = sugg"
              >
                {{ sugg }}
              </button>
            </div>
          </div>

          <!-- Field 2: Data Rocznicy -->
          <div class="settings-form-group">
            <div class="label-with-hint">
              <label class="form-label">Data rocznicy / początku relacji</label>
              <span class="field-hint">DuoNest liczy dzięki niej Wasze wspólne dni</span>
            </div>
            <div class="input-with-icon-wrap">
              <ion-icon :icon="ioniconsCalendarOutline" class="input-leading-icon" />
              <ion-input
                type="date"
                v-model="anniversaryInput"
                class="dn-styled-input date-styled-input"
              />
            </div>

            <!-- Milestone preview badge -->
            <div class="anniversary-milestone-box" v-if="anniversaryInput">
              <div class="milestone-icon-wrap">
                <ion-icon :icon="ioniconsHeart" />
              </div>
              <div class="milestone-content">
                <span class="milestone-title">Świętujecie od: <strong>{{ formattedAnniversaryDisplay }}</strong></span>
                <span class="milestone-subtitle">To już ponad <strong>{{ daysTogether }}</strong> wspaniałych dni razem! 🎉</span>
              </div>
            </div>
            <div class="anniversary-empty-hint" v-else>
              <ion-icon :icon="ioniconsSparkles" />
              <span>Wybierzcie datę pierwszej randki lub ślubu, aby odliczać Wasze wspólne dni!</span>
            </div>
          </div>

          <!-- Save Button -->
          <button class="dn-button-sea save-settings-btn" @click="handleSaveNestSettings">
            <ion-icon :icon="ioniconsCheckmarkDoneOutline" />
            <span>Zapisz dane Gniazdka</span>
          </button>
        </div>

        <!-- 2. TWÓJ KOLOR AKCENTU W GNIAZDKU -->
        <div class="dn-card accent-color-card">
          <div class="card-title-row">
            <span class="section-tag" :style="{ color: selectedCustomColor }">
              <ion-icon :icon="ioniconsColorPaletteOutline" />
              <span>TWÓJ KOLOR AKCENTU</span>
            </span>
            <span
              class="active-color-badge"
              :style="{
                backgroundColor: hexToRgba(selectedCustomColor, 0.15),
                color: selectedCustomColor,
                borderColor: hexToRgba(selectedCustomColor, 0.3)
              }"
            >
              {{ selectedCustomColor.toUpperCase() }}
            </span>
          </div>
          <h4>Wybierz swój kolor z pełnej palety</h4>
          <p class="section-desc">
            Przesuwaj suwaki, aby stworzyć własny odcień z całej palety barw. Twój kolor wyróżnia Twoje zadania, zakupy, awatar i wszystkie elementy przypisane do Ciebie!
          </p>

          <!-- INTERACTIVE RGB COLOR PICKER WITH SLIDERS -->
          <div class="rgb-picker-container">
            <!-- Top Bar: Preview swatch, HEX code, RGB label & Apply Button -->
            <div class="picker-top-row">
              <div
                class="color-swatch-disc"
                :style="{ backgroundColor: selectedCustomColor }"
                @click="openNativeColorPicker"
                title="Dotknij, aby otworzyć koło kolorów"
              >
                <ion-icon :icon="ioniconsColorPaletteOutline" class="swatch-pipette-icon" />
                <input
                  type="color"
                  ref="nativeColorInputRef"
                  class="native-color-hidden-input"
                  :value="selectedCustomColor"
                  @input="onNativeColorChange"
                />
              </div>

              <div class="color-meta-info">
                <div class="hex-input-wrap">
                  <span class="hash-label">#</span>
                  <input
                    type="text"
                    class="hex-text-input"
                    :value="selectedCustomColor.replace('#', '').toUpperCase()"
                    @input="handleHexInput"
                    placeholder="HEX"
                    maxlength="6"
                  />
                </div>
                <span class="rgb-label">{{ hexToRgbString(selectedCustomColor) }}</span>
              </div>

              <button
                type="button"
                class="apply-accent-btn"
                :style="{
                  backgroundColor: selectedCustomColor,
                  color: isLightColor(selectedCustomColor) ? '#0f172a' : '#ffffff'
                }"
                :disabled="isSavingColor"
                @click="handleSaveCustomColor"
              >
                <ion-spinner name="crescent" v-if="isSavingColor" class="save-color-spinner" />
                <template v-else>
                  <ion-icon :icon="ioniconsCheckmark" />
                  <span>Zapisz</span>
                </template>
              </button>
            </div>

            <!-- SLIDER 1: ODCIEN (HUE 0-360) -->
            <div class="slider-control-group">
              <div class="slider-header-row">
                <span class="slider-title">Odcień barwy (RGB)</span>
                <span class="slider-value-pill">{{ pickerHue }}°</span>
              </div>
              <div class="slider-track-wrap">
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  v-model.number="pickerHue"
                  class="duo-color-range hue-range"
                />
              </div>
            </div>

            <!-- SLIDER 2: NASYCENIE (SATURATION 5-100) -->
            <div class="slider-control-group">
              <div class="slider-header-row">
                <span class="slider-title">Nasycenie (Intensywność)</span>
                <span class="slider-value-pill">{{ pickerSaturation }}%</span>
              </div>
              <div class="slider-track-wrap">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  v-model.number="pickerSaturation"
                  class="duo-color-range saturation-range"
                  :style="{
                    background: `linear-gradient(to right, hsl(${pickerHue}, 5%, ${pickerLightness}%), hsl(${pickerHue}, 100%, ${pickerLightness}%))`
                  }"
                />
              </div>
            </div>

            <!-- SLIDER 3: JASNOSC (LIGHTNESS 10-90) -->
            <div class="slider-control-group">
              <div class="slider-header-row">
                <span class="slider-title">Jasność / Cień</span>
                <span class="slider-value-pill">{{ pickerLightness }}%</span>
              </div>
              <div class="slider-track-wrap">
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="1"
                  v-model.number="pickerLightness"
                  class="duo-color-range lightness-range"
                  :style="{
                    background: `linear-gradient(to right, #000000 0%, hsl(${pickerHue}, ${pickerSaturation}%, 50%) 50%, #ffffff 100%)`
                  }"
                />
              </div>
            </div>

            <!-- SZYBKIE INSPIRACJE KOLORYSTYCZNE -->
            <div class="inspirations-section">
              <span class="inspirations-label">Szybkie inspiracje:</span>
              <div class="inspirations-chips-scroll">
                <button
                  type="button"
                  v-for="c in quickColorInspirations"
                  :key="c.hex"
                  class="inspiration-swatch-btn"
                  :class="{ active: selectedCustomColor.toLowerCase() === c.hex.toLowerCase() }"
                  :style="{ backgroundColor: c.hex }"
                  @click="handleSelectInspiration(c.hex)"
                  :title="c.label"
                >
                  <ion-icon
                    v-if="selectedCustomColor.toLowerCase() === c.hex.toLowerCase()"
                    :icon="ioniconsCheckmark"
                    class="swatch-check"
                  />
                </button>
              </div>
            </div>
          </div>

          <!-- LIVE PREVIEW BOX -->
          <div class="live-preview-box" :style="{ borderColor: hexToRgba(selectedCustomColor, 0.35) }">
            <div class="preview-header">
              <ion-icon :icon="ioniconsSparkles" class="preview-sparkle" :style="{ color: selectedCustomColor }" />
              <span>Podgląd na żywo Twojego stylu:</span>
            </div>

            <!-- Sample Task Preview -->
            <div
              class="sample-task-card"
              :style="{
                borderLeft: `4px solid ${selectedCustomColor}`,
                backgroundColor: hexToRgba(selectedCustomColor, 0.05)
              }"
            >
              <div
                class="sample-checkbox"
                :style="{
                  backgroundColor: selectedCustomColor,
                  borderColor: selectedCustomColor
                }"
              >
                <ion-icon :icon="ioniconsCheckmark" />
              </div>
              <div class="sample-task-info">
                <span class="sample-task-title">Przykładowe zadanie domowe</span>
                <div class="sample-tags-row">
                  <span
                    class="sample-pill"
                    :style="{
                      backgroundColor: hexToRgba(selectedCustomColor, 0.14),
                      color: selectedCustomColor,
                      borderColor: hexToRgba(selectedCustomColor, 0.3)
                    }"
                  >
                    <ion-icon :icon="ioniconsPersonOutline" />
                    <span>Moje zadanie</span>
                  </span>
                  <span class="sample-pts-badge">+15 pkt</span>
                </div>
              </div>
            </div>

            <!-- Sample Avatar Preview -->
            <div class="sample-avatar-row">
              <div class="sample-avatar-circle" :style="{ backgroundColor: selectedCustomColor }">
                <span>{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="sample-avatar-text-col">
                <span class="sample-avatar-desc">
                  Twój awatar: <strong>{{ currentUser.name || 'Ty' }}</strong>
                </span>
                <span class="sample-avatar-sub">
                  {{ currentUserAccentColor.toLowerCase() === selectedCustomColor.toLowerCase() ? 'Ten kolor jest aktualnie zapisany' : 'Przesuń suwaki i kliknij Zapisz' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. SPOTIFY & AKTYWNOŚĆ MUZYCZNA -->
        <div class="dn-card spotify-settings-card">
          <div class="card-title-row">
            <span class="section-tag spotify-section-tag">
              <span class="spotify-mark" aria-hidden="true">
                <DuoSpotifyLogo size="small" />
              </span>
              SPOTIFY
            </span>
            <span class="spotify-status-pill" :class="{ 'is-connected': spotifyConnection.connected }">
              <span class="status-indicator-dot"></span>
              {{ spotifyConnection.connected ? 'Połączone' : 'Niepołączone' }}
            </span>
          </div>

          <h4>Muzyka, której słuchacie</h4>
          <p class="section-desc">
            Pokaż partnerowi, czego aktualnie słuchasz. Budujcie wspólną atmosferę i dzielcie się ulubioną muzyką w czasie rzeczywistym.
          </p>

          <div v-if="spotifyErrorMessage" class="spotify-error-box">
            <ion-icon :icon="ioniconsAlertCircleOutline" class="error-icon" />
            <span>{{ spotifyErrorMessage }}</span>
          </div>

          <!-- STATE A: Disconnected Hero Banner -->
          <div v-if="!spotifyConnection.connected" class="spotify-connect-card">
            <div class="spotify-connect-icon-circle">
              <DuoSpotifyLogo size="large" />
            </div>
            <h5 class="connect-card-title">Połącz ze Spotify</h5>
            <p class="connect-card-desc">
              Gdy słuchasz muzyki w Spotify, partner zobaczy okładkę, tytuł i postęp utworu w Gniazdku.
            </p>
            <div class="spotify-features-chips">
              <span class="spotify-chip">
                <ion-icon :icon="ioniconsMusicalNotesOutline" />
                <span>Aktualnie odtwarzany utwór</span>
              </span>
              <span class="spotify-chip">
                <ion-icon :icon="ioniconsShieldCheckmarkOutline" />
                <span>Pełna kontrola prywatności</span>
              </span>
            </div>
            <button
              type="button"
              class="spotify-connect-btn"
              @click="connectSpotify"
              :disabled="spotifyLoading"
            >
              <ion-spinner v-if="spotifyLoading" name="crescent" />
              <template v-else>
                <DuoSpotifyLogo size="small" />
                <span>Połącz konto Spotify</span>
              </template>
            </button>
          </div>

          <!-- STATE B: Connected Settings -->
          <template v-else>
            <div class="spotify-account-panel">
              <div class="account-left">
                <div class="spotify-avatar-wrap">
                  <DuoSpotifyLogo size="medium" />
                  <span class="online-dot" title="Połączone"></span>
                </div>
                <div class="account-info">
                  <strong class="account-name">{{ spotifyConnection.display_name || 'Twoje konto Spotify' }}</strong>
                  <span class="account-status">
                    <ion-icon :icon="ioniconsCheckmarkCircle" class="check-icon" />
                    Konto aktywne i połączone
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="spotify-disconnect-btn"
                @click="disconnectSpotify"
                :disabled="spotifyLoading"
                title="Odłącz konto Spotify"
              >
                <ion-spinner v-if="spotifyLoading" name="crescent" />
                <span v-else>Odłącz</span>
              </button>
            </div>

            <div class="spotify-visibility-panel">
              <div class="visibility-left">
                <div class="visibility-icon-bubble">
                  <ion-icon :icon="ioniconsEyeOutline" />
                </div>
                <div class="visibility-info">
                  <strong>Pokazuj partnerowi, czego słucham</strong>
                  <span>Gdy wyłączone, Twoja aktywność nie pojawi się w Gniazdku partnera.</span>
                </div>
              </div>
              <ion-toggle
                :checked="spotifyConnection.visible_to_partner"
                @ionChange="setSpotifyVisibility($event.detail.checked)"
                class="spotify-toggle"
              />
            </div>

            <!-- Live Preview Container -->
            <div class="spotify-preview-section">
              <div class="spotify-preview-heading">
                <div class="preview-heading-text">
                  <strong>Podgląd dla partnera</strong>
                  <span>Tak Twoja aktywność wygląda na ekranie Gniazdka partnera.</span>
                </div>
                <span class="spotify-preview-label">PODGLĄD</span>
              </div>

              <!-- When playing and visible: render DuoSpotifyCard -->
              <div
                v-if="spotifyConnection.visible_to_partner && mySpotifyPlayback"
                class="spotify-preview-card-wrap"
              >
                <DuoSpotifyCard
                  :playback="mySpotifyPlayback"
                  user-name="Ty"
                  :is-preview="true"
                />
              </div>

              <!-- Empty preview state -->
              <div v-else class="spotify-preview-empty-card">
                <div class="empty-icon-wrap">
                  <DuoSpotifyLogo size="medium" />
                </div>
                <div class="empty-text-wrap">
                  <strong>{{ !spotifyConnection.visible_to_partner ? 'Podgląd jest ukryty' : 'Oczekiwanie na muzykę' }}</strong>
                  <p v-if="!spotifyConnection.visible_to_partner">
                    Udostępnianie partnerowi jest wyłączone. Włącz przełącznik powyżej, aby aktywować podgląd i dzielić się muzyką.
                  </p>
                  <p v-else>
                    Włącz dowolny utwór w aplikacji Spotify — pojawi się tutaj w czasie rzeczywistym z okładką albumu i paskiem postępu!
                  </p>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 4. POWIADOMIENIA PUSH & ALERTY GNIAZDKA -->
        <div class="dn-card push-settings-card">
          <div class="card-title-row">
            <span class="section-tag push-section-tag">POWIADOMIENIA PUSH</span>
            <span
              class="push-status-pill"
              :class="{
                'is-active': pushPermission === 'granted' && isPushEnabled,
                'is-waiting': pushPermission === 'default',
                'is-denied': pushPermission === 'denied',
                'is-disabled': pushPermission === 'granted' && !isPushEnabled
              }"
            >
              <ion-icon
                :icon="
                  pushPermission === 'granted' && isPushEnabled
                    ? ioniconsCheckmarkCircle
                    : (pushPermission === 'denied' ? ioniconsCloseCircle : ioniconsAlertCircle)
                "
              />
              <span v-if="pushPermission === 'granted' && isPushEnabled">Aktywne</span>
              <span v-else-if="pushPermission === 'granted' && !isPushEnabled">Wyłączone</span>
              <span v-else-if="pushPermission === 'denied'">Zablokowane</span>
              <span v-else>Wymaga zgody</span>
            </span>
          </div>

          <h4>Powiadomienia w telefonie</h4>
          <p class="section-desc">
            Bądźcie zawsze blisko - otrzymuj natychmiastowe alerty o gestach, nastroju, planach, zakupach i marzeniach od partnera.
          </p>

          <!-- Master Toggle Box -->
          <div class="push-master-toggle-box">
            <div class="master-toggle-left">
              <div class="master-toggle-icon">
                <ion-icon :icon="ioniconsNotificationsOutline" />
              </div>
              <div class="master-toggle-text">
                <span class="master-toggle-title">Główne powiadomienia na tym urządzeniu</span>
                <span class="master-toggle-subtitle">
                  {{ isPushEnabled ? 'Powiadomienia są włączone dla tego telefonu/przeglądarki' : 'Włącz, aby nie przegapić wiadomości od partnera' }}
                </span>
              </div>
            </div>
            <ion-toggle
              :checked="isPushEnabled && pushPermission === 'granted'"
              @ionChange="toggleMasterPush()"
              class="dn-push-toggle"
            />
          </div>

          <!-- Alert for Denied Permission -->
          <div v-if="pushPermission === 'denied'" class="push-denied-box">
            <ion-icon :icon="ioniconsAlertCircle" class="denied-icon" />
            <div class="denied-content">
              <strong>Powiadomienia są zablokowane w przeglądarce</strong>
              <p>
                Aby je odblokować na telefonie: kliknij ikonę kłódki 🔒 (lub suwaków) obok adresu strony w przeglądarce, wybierz <em>Uprawnienia → Powiadomienia → Zezwól</em>, a następnie odśwież stronę.
              </p>
            </div>
          </div>

          <!-- Prompt button if Default Permission -->
          <div v-if="pushPermission === 'default' && isPushSupported" class="push-prompt-box">
            <button type="button" class="dn-button-sea request-perm-btn" @click="requestPushPermission">
              <ion-icon :icon="ioniconsNotificationsOutline" />
              <span>Zezwól na powiadomienia w przeglądarce</span>
            </button>
          </div>

          <!-- Granular Category Settings List -->
          <div class="push-granularity-section">
            <span class="group-title-label">SZCZEGÓŁOWE KATEGORIE POWIADOMIEŃ</span>
            <p class="group-sub-desc">Wybierz, o czym chcesz być natychmiast powiadamiany:</p>

            <div class="push-toggles-list">
              <!-- 1. NUDGES & LOVE -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap love-icon-bg">
                    <ion-icon :icon="ioniconsHeartOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Puknięcia i gesty miłości</span>
                    <span class="toggle-desc">Buziaki, uściski, herbatka i gesty czułości od partnera</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.nudges"
                  @ionChange="togglePushCategory('nudges', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 2. MOOD -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap mood-icon-bg">
                    <ion-icon :icon="ioniconsHappyOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Nastrój partnera</span>
                    <span class="toggle-desc">Zmiana samopoczucia i notatki o nastroju</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.mood"
                  @ionChange="togglePushCategory('mood', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 3. CALENDAR -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap calendar-icon-bg">
                    <ion-icon :icon="ioniconsCalendarOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Wspólny terminarz & randki</span>
                    <span class="toggle-desc">Nowe plany, przypomnienia i zrealizowane wydarzenia</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.calendar"
                  @ionChange="togglePushCategory('calendar', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 4. SHOPPING -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap shopping-icon-bg">
                    <ion-icon :icon="ioniconsCartOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Wspólna lista zakupów</span>
                    <span class="toggle-desc">Gdy partner doda nowe produkty do koszyka</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.shopping"
                  @ionChange="togglePushCategory('shopping', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 5. TASKS -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap tasks-icon-bg">
                    <ion-icon :icon="ioniconsCheckboxOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Zadania domowe i punkty</span>
                    <span class="toggle-desc">Ukończone obowiązki i zdobyte punkty do Gniazdka</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.tasks"
                  @ionChange="togglePushCategory('tasks', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 6. MEALS & DINNERS -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap meals-icon-bg">
                    <ion-icon :icon="ioniconsRestaurantOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Planer obiadów i posiłków</span>
                    <span class="toggle-desc">Wspólne menu, nowe propozycje dań i ugotowane obiady</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.meals"
                  @ionChange="togglePushCategory('meals', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 7. WISHLIST & GIFTS -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap wishlist-icon-bg">
                    <ion-icon :icon="ioniconsGiftOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Wishlista i marzenia</span>
                    <span class="toggle-desc">Nowe marzenia partnera oraz spełnione prezenty (niespodzianki pozostają tajne)</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.wishlist"
                  @ionChange="togglePushCategory('wishlist', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 8. SAVINGS & GOALS -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap savings-icon-bg">
                    <ion-icon :icon="ioniconsWalletOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Skarbonki i cele finansowe</span>
                    <span class="toggle-desc">Wpłaty, wypłaty, nowe cele i zrealizowane skarbonki</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.savings"
                  @ionChange="togglePushCategory('savings', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 9. PARTNER ONLINE -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap online-icon-bg">
                    <ion-icon :icon="ioniconsPersonOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Wejście partnera do aplikacji</span>
                    <span class="toggle-desc">Dyskretny sygnał, gdy partner otwiera DuoNest</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.partnerOnline"
                  @ionChange="togglePushCategory('partnerOnline', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>
            </div>

            <span class="group-title-label mt-label">SYGNALIZACJA I DŹWIĘK</span>
            <p class="group-sub-desc">Ustawienia te sterują dźwiękiem i haptyką alertów w aplikacji oraz wyciszaniem powiadomień telefonu.</p>
            <div class="push-toggles-list">
              <!-- 7. SOUND -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap sound-icon-bg">
                    <ion-icon :icon="ioniconsVolumeMediumOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Dźwięk powiadomienia</span>
                    <span class="toggle-desc">Sygnał dźwiękowy przy alertach i powiadomieniach</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.sound"
                  @ionChange="togglePushCategory('sound', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>

              <!-- 8. VIBRATION -->
              <div class="push-toggle-item">
                <div class="toggle-item-left">
                  <div class="toggle-icon-wrap vibrate-icon-bg">
                    <ion-icon :icon="ioniconsPhonePortraitOutline" />
                  </div>
                  <div class="toggle-item-info">
                    <span class="toggle-name">Wibracja telefonu</span>
                    <span class="toggle-desc">Impuls haptyczny przy nadejściu powiadomień</span>
                  </div>
                </div>
                <ion-toggle
                  :checked="pushSettings.vibrate"
                  @ionChange="togglePushCategory('vibrate', $event.detail?.checked)"
                  class="dn-push-toggle"
                />
              </div>
            </div>
          </div>

          <!-- Test Button -->
          <div class="push-test-action-wrap">
            <button
              type="button"
              class="push-test-btn"
              @click="sendTestNotification()"
            >
              <ion-icon :icon="ioniconsSendOutline" />
              <span>Wyślij testowe powiadomienie push</span>
            </button>
            <span class="test-hint">Sprawdź, jak powiadomienie wyświetla się w pasku powiadomień telefonu</span>
          </div>
        </div>

        <!-- 4. POŁĄCZENIE PARY & KOD PAROWANIA -->
        <div class="dn-card pairing-card" v-if="partnership">
          <div class="card-title-row">
            <span class="section-tag pairing-tag">POŁĄCZENIE PARY</span>
            <span class="connected-pill">
              <ion-icon :icon="ioniconsCheckmarkCircle" />
              Połączono
            </span>
          </div>
          <h4>Wasze połączenie</h4>
          <p class="section-desc" v-if="partnerUser">
            Jesteście sparowani z: <strong>{{ partnerUser.name || 'Partner' }}</strong>
          </p>

          <div class="my-code-box">
            <span class="code-label">TWÓJ KOD PAROWANIA</span>
            <div class="code-display-row">
              <span class="code-text">{{ currentUser.pairing_code }}</span>
              <button class="copy-btn" @click="copyPairingCode" title="Kopiuj kod">
                <ion-icon :icon="ioniconsCopyOutline" />
                <span>{{ copyStatus }}</span>
              </button>
            </div>
          </div>

          <div class="partnership-buttons-row">
            <button class="disconnect-pair-btn" @click="handleDisconnect">
              <ion-icon :icon="ioniconsLogOutOutline" />
              <span>Rozłącz konto pary</span>
            </button>
          </div>
        </div>

        <!-- Jeśli niepołączony -->
        <div class="dn-card pairing-card" v-else>
          <div class="card-title-row">
            <span class="section-tag pairing-tag">POŁĄCZENIE PARY</span>
          </div>
          <h4>Połącz się z partnerem</h4>
          <p class="section-desc">Wpisz kod partnera lub przekaż mu swój kod, aby połączyć Wasze konta.</p>

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
                :maxlength="10"
              />
              <button class="join-submit-btn" @click="handlePairWithCode" :disabled="!inputPartnerCode.trim()">
                Połącz
              </button>
            </div>
            <span class="error-text" v-if="pairingError">{{ pairingError }}</span>
          </div>
        </div>

        <!-- 5. KONTO I BEZPIECZEŃSTWO -->
        <div class="dn-card account-card">
          <div class="card-title-row">
            <span class="section-tag">KONTO</span>
          </div>
          <h4>Zarządzanie kontem</h4>
          <p class="section-desc">
            Zalogowano jako: <strong>{{ currentUser.email || currentUser.name || 'Użytkownik' }}</strong>
          </p>

          <div class="account-actions-box">
            <!-- PRZYCISK ROZWIJAJĄCY FORMULARZ ZMIANY HASŁA -->
            <button
              type="button"
              class="change-password-toggle-btn"
              :class="{ 'is-open': isPasswordChangeOpen }"
              @click="togglePasswordChangeForm"
            >
              <div class="toggle-btn-left">
                <ion-icon :icon="ioniconsLockClosedOutline" class="btn-icon" />
                <span>Zmień hasło do konta</span>
              </div>
              <ion-icon
                :icon="isPasswordChangeOpen ? ioniconsChevronUpOutline : ioniconsChevronDownOutline"
                class="chevron-icon"
              />
            </button>

            <!-- ROZWIJANY FORMULARZ ZMIANY HASŁA -->
            <transition name="expand">
              <div class="password-change-container" v-if="isPasswordChangeOpen">
                <form @submit.prevent="handleChangePassword" class="password-change-form">
                  <!-- OBECNE HASŁO -->
                  <div class="pwd-field">
                    <label class="pwd-label">Obecne hasło</label>
                    <div class="pwd-input-wrap">
                      <ion-icon :icon="ioniconsLockClosedOutline" class="pwd-input-icon" />
                      <input
                        v-model="currentPasswordInput"
                        :type="showCurrentPassword ? 'text' : 'password'"
                        placeholder="Wpisz dotychczasowe hasło"
                        class="pwd-native-input"
                        autocomplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        class="pwd-eye-btn"
                        @click="showCurrentPassword = !showCurrentPassword"
                        tabindex="-1"
                      >
                        <ion-icon :icon="showCurrentPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                      </button>
                    </div>
                  </div>

                  <!-- NOWE HASŁO -->
                  <div class="pwd-field">
                    <div class="pwd-label-row">
                      <label class="pwd-label">Nowe hasło</label>
                      <span class="pwd-hint">min. 6 znaków</span>
                    </div>
                    <div class="pwd-input-wrap">
                      <ion-icon :icon="ioniconsKeyOutline" class="pwd-input-icon" />
                      <input
                        v-model="newPasswordInput"
                        :type="showNewPassword ? 'text' : 'password'"
                        placeholder="Wpisz nowe hasło (min. 6 znaków)"
                        class="pwd-native-input"
                        autocomplete="new-password"
                        minlength="6"
                        required
                      />
                      <button
                        type="button"
                        class="pwd-eye-btn"
                        @click="showNewPassword = !showNewPassword"
                        tabindex="-1"
                      >
                        <ion-icon :icon="showNewPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                      </button>
                    </div>
                  </div>

                  <!-- POWTÓRZ NOWE HASŁO -->
                  <div class="pwd-field">
                    <label class="pwd-label">Powtórz nowe hasło</label>
                    <div class="pwd-input-wrap">
                      <ion-icon :icon="ioniconsKeyOutline" class="pwd-input-icon" />
                      <input
                        v-model="confirmNewPasswordInput"
                        :type="showConfirmNewPassword ? 'text' : 'password'"
                        placeholder="Powtórz nowe hasło"
                        class="pwd-native-input"
                        autocomplete="new-password"
                        minlength="6"
                        required
                      />
                      <button
                        type="button"
                        class="pwd-eye-btn"
                        @click="showConfirmNewPassword = !showConfirmNewPassword"
                        tabindex="-1"
                      >
                        <ion-icon :icon="showConfirmNewPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                      </button>
                    </div>
                  </div>

                  <!-- BŁĄD -->
                  <div class="pwd-banner error" v-if="changePasswordError">
                    <ion-icon :icon="ioniconsAlertCircleOutline" class="banner-icon" />
                    <span>{{ changePasswordError }}</span>
                  </div>

                  <!-- SUKCES -->
                  <div class="pwd-banner success" v-if="changePasswordSuccess">
                    <ion-icon :icon="ioniconsCheckmarkCircleOutline" class="banner-icon" />
                    <span>{{ changePasswordSuccess }}</span>
                  </div>

                  <!-- PRZYCISKI AKCJI -->
                  <div class="pwd-buttons-row">
                    <button
                      type="submit"
                      class="save-pwd-btn"
                      :disabled="isChangingPassword || !isPasswordFormValid"
                    >
                      <ion-spinner name="crescent" v-if="isChangingPassword" class="pwd-spinner" />
                      <span v-else>Zapisz nowe hasło</span>
                    </button>
                    <button
                      type="button"
                      class="cancel-pwd-btn"
                      @click="cancelPasswordChange"
                      :disabled="isChangingPassword"
                    >
                      Anuluj
                    </button>
                  </div>
                </form>
              </div>
            </transition>

            <div class="partnership-buttons-row">
              <button class="signout-app-btn" @click="handleSignOut">
                <ion-icon :icon="ioniconsPowerOutline" />
                <span>Wyloguj się z DuoNest</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. EDIT PROFILE MODAL -->
      <ion-modal
        :is-open="isEditProfileModalOpen"
        @didDismiss="closeEditProfileModal"
        class="dn-edit-profile-modal"
        :breakpoints="[0, 0.95, 1]"
        :initial-breakpoint="0.95"
        :handle="true"
      >
        <ion-header class="modal-custom-header">
          <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
          <ion-toolbar>
            <div class="modal-header-inner">
              <div class="modal-title-wrap">
                <ion-icon :icon="ioniconsPersonOutline" class="modal-title-icon" />
                <ion-title>Edycja Twojego Profilu</ion-title>
              </div>
              <ion-buttons slot="end">
                <button type="button" class="modal-close-icon-btn" @click="closeEditProfileModal" aria-label="Zamknij">
                  <ion-icon :icon="ioniconsCloseOutline" />
                </button>
              </ion-buttons>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding edit-modal-content">
          <div class="modal-form-wrapper">
            <!-- LIVE AVATAR & IDENTITY BANNER -->
            <div class="profile-modal-hero">
              <div
                class="profile-modal-avatar"
                :style="{
                  backgroundColor: currentUserAccentColor,
                  boxShadow: `0 8px 24px ${hexToRgba(currentUserAccentColor, 0.4)}`
                }"
              >
                <span>{{ (editProfileForm.name || currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
                <div class="avatar-star-badge">
                  <ion-icon :icon="ioniconsSparkles" />
                </div>
              </div>
              <div class="profile-modal-hero-text">
                <h3>{{ editProfileForm.name || 'Twój Profil' }}</h3>
                <span class="live-sync-pill">
                  <span class="live-dot"></span>
                  Twój profil w Gniazdku
                </span>
              </div>
            </div>

            <!-- GROUP 1: TWOJE IMIĘ -->
            <div class="modal-section-card">
              <div class="section-card-header">
                <span class="mini-section-tag">TOŻSAMOŚĆ</span>
                <label class="form-label">Twoje imię lub pseudonim</label>
              </div>
              <div class="input-with-icon-wrap">
                <ion-icon :icon="ioniconsPersonOutline" class="input-leading-icon" />
                <ion-input
                  v-model="editProfileForm.name"
                  placeholder="np. Dawid, Kasia..."
                  class="dn-styled-input"
                  :clear-input="true"
                />
              </div>
            </div>

            <!-- GROUP 2: KĄCIK UCZUĆ / LOVE NOTE -->
            <div class="modal-section-card">
              <div class="section-card-header">
                <span class="mini-section-tag tag-love">CZUŁOŚĆ</span>
                <label class="form-label">Czuła wiadomość / Twoje motto</label>
              </div>
              <p class="section-micro-desc">Wiadomość wyświetlana w nagłówku Twojego profilu.</p>

              <div class="textarea-with-icon-wrap">
                <DuoIcon name="quote" :size="16" class="textarea-leading-icon" />
                <ion-textarea
                  v-model="editProfileForm.love_note"
                  placeholder="np. Zawsze przy Tobie! / Dziękuję, że jesteś..."
                  class="dn-styled-textarea"
                  :rows="2"
                  :auto-grow="true"
                />
              </div>

              <!-- Quick Love Note Suggestions -->
              <div class="quick-chips-row mt-chips">
                <span class="chips-mini-label">Inspiracje:</span>
                <button
                  type="button"
                  v-for="note in quickLoveNoteSuggestions"
                  :key="note"
                  class="chip-btn love-chip"
                  :class="{ active: editProfileForm.love_note === note }"
                  @click="editProfileForm.love_note = note"
                >
                  {{ note }}
                </button>
              </div>
            </div>

            <!-- GROUP 3: ŚCIĄGAWKA DLA PARTNERA (PREFERENCJE) -->
            <div class="modal-section-card">
              <div class="section-card-header">
                <span class="mini-section-tag tag-prefs">ŚCIĄGAWKA DLA PARTNERA</span>
                <label class="form-label">Co najbardziej lubisz?</label>
              </div>
              <p class="section-micro-desc">
                Partner od razu wie, jaką kawę kupić lub czym osłodzić Ci trudniejszy dzień!
              </p>

              <!-- Ulubiony napój -->
              <div class="pref-subfield">
                <span class="subfield-title">
                  <DuoIcon name="drink" :size="15" />
                  <span>Ulubiony napój</span>
                </span>
                <div class="input-with-icon-wrap">
                  <ion-input
                    v-model="editProfileForm.favorite_drink"
                    placeholder="np. Kawa z mlekiem owsianym, Matcha..."
                    class="dn-styled-input"
                    :clear-input="true"
                  />
                </div>
                <div class="quick-chips-row">
                  <button
                    type="button"
                    v-for="drink in quickDrinkSuggestions"
                    :key="drink"
                    class="chip-btn"
                    :class="{ active: editProfileForm.favorite_drink === drink }"
                    @click="editProfileForm.favorite_drink = drink"
                  >
                    {{ drink }}
                  </button>
                </div>
              </div>

              <!-- Ulubiony smakołyk -->
              <div class="pref-subfield mt-subfield">
                <span class="subfield-title">
                  <DuoIcon name="treat" :size="15" />
                  <span>Ulubiony smakołyk / przekąska</span>
                </span>
                <div class="input-with-icon-wrap">
                  <ion-input
                    v-model="editProfileForm.favorite_treat"
                    placeholder="np. Pistacje, Czekolada z solą morską..."
                    class="dn-styled-input"
                    :clear-input="true"
                  />
                </div>
                <div class="quick-chips-row">
                  <button
                    type="button"
                    v-for="treat in quickTreatSuggestions"
                    :key="treat"
                    class="chip-btn"
                    :class="{ active: editProfileForm.favorite_treat === treat }"
                    @click="editProfileForm.favorite_treat = treat"
                  >
                    {{ treat }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Save Action Button -->
            <div class="modal-actions-row">
              <button
                class="dn-button-sea save-all-profile-btn"
                @click="handleSaveProfile"
                :disabled="!editProfileForm.name.trim()"
              >
                <ion-icon :icon="ioniconsCheckmarkDoneOutline" />
                <span>Zapisz zmiany w profilu</span>
              </button>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Floating bottom tab bar spacer so content never gets obscured -->
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState } from '~/composables/useDuoState'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { useSpotify } from '~/composables/useSpotify'
import { useConfirm } from '~/composables/useConfirm'
import DuoIcon from '~/components/DuoIcon.vue'

const route = useRoute()

onMounted(async () => {
  try {
    await initSupabaseSync()
    startSpotifyPolling()
  } catch (_) {}
})

onUnmounted(() => {
  stopSpotifyPolling()
})

const {
  currentUser,
  partnerUser,
  partnership,
  daysTogether,
  nudgesList,
  isPartnerOnline,
  currentUserAccentColor,
  partnerUserAccentColor,
  getUserAccentColor,
  hexToRgba,
  updateMood,
  sendNudge,
  hasSentDailyNudge,
  formattedNextNudgeTime,
  updateMyProfile,
  updatePartnershipSettings,
  pairWithCode,
  disconnectPartnership,
  signOutUser,
  changeUserPassword,
  triggerToast,
  initSupabaseSync
} = useDuoState()

const {
  isSupported: isPushSupported,
  permission: pushPermission,
  isPushEnabled,
  pushSettings,
  requestPermission: requestPushPermission,
  toggleMasterPush,
  toggleCategory: togglePushCategory,
  sendTestNotification
} = usePushNotifications()

const {
  connection: spotifyConnection,
  myPlayback: mySpotifyPlayback,
  isLoading: spotifyLoading,
  errorMessage: spotifyErrorMessage,
  connectSpotify,
  disconnectSpotify,
  setSpotifyVisibility,
  startSpotifyPolling,
  stopSpotifyPolling
} = useSpotify()

const { confirm } = useConfirm()

const currentCategory = ref<'relationship' | 'nest_settings'>(
  route?.query?.category === 'nest_settings' ? 'nest_settings' : 'relationship'
)

watch(() => route?.query?.category, (newCat) => {
  if (newCat === 'nest_settings' || newCat === 'relationship') {
    currentCategory.value = newCat
  }
})

// Nest Settings Inputs
const nestNameInput = ref(partnership.value?.nest_name || 'Nasze Ciepłe Gniazdko')
const anniversaryInput = ref(partnership.value?.anniversary_date || '')

watch(() => partnership.value?.nest_name, (newName) => {
  if (newName) nestNameInput.value = newName
})
watch(() => partnership.value?.anniversary_date, (newDate) => {
  if (newDate) anniversaryInput.value = newDate
})

// Nest name suggestions
const nestNameSuggestions = [
  'Nasze Ciepłe Gniazdko',
  'Zamek Miłości',
  'Oaza Spokoju',
  'Bezpieczny Port',
  'Przystań Marzeń'
]

const formattedAnniversaryDisplay = computed(() => {
  if (!anniversaryInput.value) return ''
  try {
    const parts = anniversaryInput.value.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
    }
    return anniversaryInput.value
  } catch (_) {
    return anniversaryInput.value
  }
})

const handleSaveNestSettings = async () => {
  await updatePartnershipSettings(nestNameInput.value, anniversaryInput.value)
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.6 }
  })
}

// ==========================================================
// CUSTOM RGB COLOR PICKER & HSL SLIDERS
// ==========================================================
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  const r = parseInt(c.substring(0, 2), 16) / 255 || 0
  const g = parseInt(c.substring(2, 4), 16) / 255 || 0
  const b = parseInt(c.substring(4, 6), 16) / 255 || 0

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

const hslToHex = (h: number, s: number, l: number): string => {
  const sat = s / 100
  const lit = l / 100
  const a = sat * Math.min(lit, 1 - lit)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = lit - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const isLightColor = (hex: string): boolean => {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  const r = parseInt(c.substring(0, 2), 16) || 0
  const g = parseInt(c.substring(2, 4), 16) || 0
  const b = parseInt(c.substring(4, 6), 16) || 0
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 150
}

const hexToRgbString = (hex: string): string => {
  let c = hex.replace('#', '').trim()
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  const r = parseInt(c.substring(0, 2), 16) || 0
  const g = parseInt(c.substring(2, 4), 16) || 0
  const b = parseInt(c.substring(4, 6), 16) || 0
  return `RGB: ${r}, ${g}, ${b}`
}

const initialHsl = hexToHsl(currentUserAccentColor.value || '#0f172a')
const pickerHue = ref(initialHsl.h)
const pickerSaturation = ref(initialHsl.s)
const pickerLightness = ref(initialHsl.l)
const isSavingColor = ref(false)
const nativeColorInputRef = ref<HTMLInputElement | null>(null)

const selectedCustomColor = computed(() => {
  return hslToHex(pickerHue.value, pickerSaturation.value, pickerLightness.value)
})

const quickColorInspirations = [
  { hex: '#f43f5e', label: 'Różana Miłość' },
  { hex: '#e11d48', label: 'Głęboki Karmin' },
  { hex: '#fb7185', label: 'Ciepły Koral' },
  { hex: '#f59e0b', label: 'Złoty Bursztyn' },
  { hex: '#10b981', label: 'Szmaragdowy Gaj' },
  { hex: '#14b8a6', label: 'Morska Bryza' },
  { hex: '#0284c7', label: 'Błękit Oceanu' },
  { hex: '#6366f1', label: 'Indygo Zmierzchu' },
  { hex: '#8b5cf6', label: 'Fiolet Lawendy' },
  { hex: '#ec4899', label: 'Słodka Fuksja' },
  { hex: '#0f172a', label: 'Głęboki Obsydian' },
  { hex: '#1e293b', label: 'Ciemny Grafit' }
]

const syncPickerFromHex = (hex: string) => {
  if (!hex || !hex.startsWith('#')) return
  const cleanHex = hex.trim()
  if (cleanHex.length !== 7 && cleanHex.length !== 4) return
  const { h, s, l } = hexToHsl(cleanHex)
  pickerHue.value = h
  pickerSaturation.value = s
  pickerLightness.value = l
}

const handleHexInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let val = target.value.trim()
  if (!val.startsWith('#')) val = '#' + val
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    syncPickerFromHex(val)
  }
}

const handleSelectInspiration = (hex: string) => {
  syncPickerFromHex(hex)
}

const openNativeColorPicker = () => {
  nativeColorInputRef.value?.click()
}

const onNativeColorChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.value) {
    syncPickerFromHex(target.value)
  }
}

const handleSaveCustomColor = async () => {
  if (isSavingColor.value) return
  const colorToSave = selectedCustomColor.value
  isSavingColor.value = true

  try {
    await updateMyProfile({ avatar_color: colorToSave })
    triggerToast('Zapisano kolor')
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: [colorToSave, '#ffffff', '#94a3b8', '#0f172a']
    })
  } catch (err: any) {
    triggerToast('Błąd zapisu koloru', { type: 'warning' })
  } finally {
    isSavingColor.value = false
  }
}

watch(currentUserAccentColor, (newColor) => {
  if (newColor && newColor.toLowerCase() !== selectedCustomColor.value.toLowerCase()) {
    syncPickerFromHex(newColor)
  }
})

// Personal Profile Modal
const isEditProfileModalOpen = ref(false)
const editProfileForm = ref({
  name: '',
  love_note: '',
  favorite_drink: '',
  favorite_treat: ''
})

const quickLoveNoteSuggestions = [
  'Zawsze przy Tobie ❤️',
  'Mój ulubiony człowiek! 🥰',
  'Dziękuję, że jesteś ✨',
  'Tęsknię za Tobą! 💌',
  'Najlepsze chwile to te z Tobą 💫'
]

const quickDrinkSuggestions = [
  '☕ Kawa z mlekiem',
  '🥛 Kawa owsiana',
  '🍵 Matcha latte',
  '🍋 Woda z cytryną',
  '🥤 Świeży sok'
]

const quickTreatSuggestions = [
  '🍫 Czekolada pistacjowa',
  '🥜 Solone pistacje',
  '🥐 Ciepły rogalik',
  '🍰 Kremowy sernik',
  '🍓 Świeże truskawki',
  '🍬 Malinowe żelki'
]

const openEditProfileModal = () => {
  editProfileForm.value = {
    name: currentUser.value?.name || '',
    love_note: currentUser.value?.love_note || '',
    favorite_drink: currentUser.value?.favorite_drink || '',
    favorite_treat: currentUser.value?.favorite_treat || ''
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
    colors: [currentUserAccentColor.value, '#1e293b', '#475569', '#94a3b8']
  })
}

const selectedMood = ref(currentUser.value?.current_mood || 'happy')
const moodNote = ref(currentUser.value?.mood_note || '')
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
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
})

const getMoodLabel = (mood?: string | null) => {
  const choice = moodChoices.find(c => c.id === mood)
  return choice ? choice.label : 'Dobry'
}

const getNudgeTitle = (type: string) => {
  const found = nudgePresets.find(p => p.id === type)
  return found ? found.title : type
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
      colors: [currentUserAccentColor.value, '#1e293b', '#475569', '#94a3b8']
    })
  }
}

const copyPairingCode = async () => {
  try {
    await navigator.clipboard.writeText(currentUser.value?.pairing_code || '')
    copyStatus.value = 'Skopiowano!'
    setTimeout(() => {
      copyStatus.value = 'Kopiuj'
    }, 2500)
    triggerToast('Skopiowano kod')
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

const handleDisconnect = async () => {
  const confirmed = await confirm({
    title: 'Rozłącz konto pary',
    message: 'Czy na pewno chcesz rozłączyć połączenie z partnerem? Wspólne dane przestaną być synchronizowane.',
    confirmText: 'Rozłącz parę',
    cancelText: 'Anuluj',
    type: 'danger',
    icon: 'unlink'
  })
  if (confirmed) {
    disconnectPartnership()
    navigateTo('/pairing', { replace: true })
  }
}

// Password Change inside Account Card
const isPasswordChangeOpen = ref(false)
const currentPasswordInput = ref('')
const newPasswordInput = ref('')
const confirmNewPasswordInput = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmNewPassword = ref(false)
const isChangingPassword = ref(false)
const changePasswordError = ref('')
const changePasswordSuccess = ref('')

const isPasswordFormValid = computed(() => {
  return (
    Boolean(currentPasswordInput.value) &&
    newPasswordInput.value.length >= 6 &&
    newPasswordInput.value === confirmNewPasswordInput.value
  )
})

const togglePasswordChangeForm = () => {
  isPasswordChangeOpen.value = !isPasswordChangeOpen.value
  changePasswordError.value = ''
  changePasswordSuccess.value = ''
}

const cancelPasswordChange = () => {
  isPasswordChangeOpen.value = false
  currentPasswordInput.value = ''
  newPasswordInput.value = ''
  confirmNewPasswordInput.value = ''
  changePasswordError.value = ''
  changePasswordSuccess.value = ''
}

const handleChangePassword = async () => {
  if (!isPasswordFormValid.value || isChangingPassword.value) return

  if (newPasswordInput.value !== confirmNewPasswordInput.value) {
    changePasswordError.value = 'Nowe hasła nie są identyczne.'
    return
  }

  isChangingPassword.value = true
  changePasswordError.value = ''
  changePasswordSuccess.value = ''

  try {
    const res = await changeUserPassword(currentPasswordInput.value, newPasswordInput.value)
    if (!res.success) {
      changePasswordError.value = res.error || 'Nie udało się zmienić hasła.'
      return
    }

    changePasswordSuccess.value = 'Twoje hasło zostało pomyślnie zmienione!'
    currentPasswordInput.value = ''
    newPasswordInput.value = ''
    confirmNewPasswordInput.value = ''
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 }
    })
    setTimeout(() => {
      isPasswordChangeOpen.value = false
      changePasswordSuccess.value = ''
    }, 2500)
  } catch (err: any) {
    changePasswordError.value = err?.message || 'Błąd podczas zmiany hasła.'
  } finally {
    isChangingPassword.value = false
  }
}

const handleSignOut = async () => {
  const confirmed = await confirm({
    title: 'Wyloguj się',
    message: 'Czy na pewno chcesz wylogować się z aplikacji DuoNest?',
    confirmText: 'Wyloguj',
    cancelText: 'Zostań',
    type: 'primary',
    icon: 'logout'
  })
  if (confirmed) {
    await signOutUser()
  }
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
/* GENERAL CARD & HEADER STRUCTURE                            */
/* ========================================================== */
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  color: #0f172a;
  text-transform: uppercase;
}

.section-tag.couple-tag {
  color: #f43f5e;
}

.section-tag.mood-tag {
  color: #0f172a;
}

.section-tag.love-tag {
  color: #e11d48;
}

.section-tag.nest-section-tag {
  color: #f43f5e;
}

.section-tag.push-section-tag {
  color: #0f172a;
}

.section-tag.pairing-tag {
  color: #0f172a;
}

.section-desc {
  font-size: 13px;
  color: #64748b;
  margin: 4px 0 12px 0;
  line-height: 1.4;
}

/* ========================================================== */
/* CATEGORY SEGMENTED SELECTOR                                */
/* ========================================================== */
.category-toggle-container {
  display: flex;
  justify-content: center;
  padding: 12px 16px 8px 16px;
}

.category-toggle-pill {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  width: 100%;
  max-width: 420px;
}

.cat-toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 14px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cat-toggle-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.category-content-wrap {
  display: flex;
  flex-direction: column;
}

/* ========================================================== */
/* KARTA NASZEJ RELACJI (COUPLE HUB CARD)                    */
/* ========================================================== */
.couple-hub-card {
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  position: relative;
  overflow: hidden;
}

.edit-profile-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  font-size: 11.5px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.edit-profile-pill-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.edit-profile-pill-btn:active {
  transform: scale(0.96);
}

.couple-hero-banner {
  background: linear-gradient(135deg, #fff5f5 0%, #f0fdfa 100%);
  border: 1px solid #ffe4e6;
  border-radius: 18px;
  padding: 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 8px;
  margin-bottom: 14px;
}

.couple-member-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  text-align: center;
}

.avatar-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border: 3px solid #ffffff;
}

.avatar-initial {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.member-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
}

.member-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 105px;
}

.member-badge.me-badge {
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  background: #ffffff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  padding: 1px 7px;
  border-radius: 999px;
}

.partner-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  font-weight: 700;
  color: #64748b;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 1px 7px;
  border-radius: 999px;
}

.partner-status-pill.is-online {
  color: #16a34a;
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}

.live-dot.is-online {
  background: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.25);
  animation: pulseLiveDot 1.6s infinite ease-in-out;
}

@keyframes pulseLiveDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.6; }
}

.couple-bridge-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
}

.heart-pulse-node {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 3px 10px rgba(244, 63, 94, 0.35);
  animation: pulseHeartNode 2s infinite ease-in-out;
}

@keyframes pulseHeartNode {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.days-together-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 800;
  color: #9f1239;
  background: #ffe4e6;
  border: 1px solid #fecdd3;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.sparkle-mini {
  font-size: 11px;
  color: #f43f5e;
}

.unpaired-ring {
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 22px;
}

.pair-now-badge {
  font-size: 9.5px;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 1px 7px;
  border-radius: 999px;
  cursor: pointer;
}

/* Love Notes Tray */
.couple-notes-tray {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.love-bubble {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.love-bubble.partner-bubble {
  background: #f0fdfa;
  border-color: #ccfbf1;
}

.bubble-initial {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
  margin-top: 1px;
}

.bubble-text-wrap {
  flex: 1;
  min-width: 0;
}

.bubble-author {
  font-size: 10.5px;
  font-weight: 700;
  color: #64748b;
  display: block;
  margin-bottom: 2px;
}

.bubble-quote {
  font-size: 12.5px;
  font-style: italic;
  color: #1e293b;
  line-height: 1.4;
  margin: 0;
  word-break: break-word;
}

.empty-notes-invite {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 14px;
  background: #fffbeb;
  border: 1px dashed #fcd34d;
  cursor: pointer;
  margin-bottom: 14px;
  transition: all 0.18s ease;
}

.empty-notes-invite:hover {
  background: #fef3c7;
}

.invite-sparkle {
  font-size: 20px;
  color: #f59e0b;
  flex-shrink: 0;
}

.invite-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.invite-title {
  font-size: 12px;
  font-weight: 700;
  color: #92400e;
}

.invite-sub {
  font-size: 11px;
  color: #b45309;
  line-height: 1.3;
}

.invite-arrow {
  font-size: 16px;
  color: #d97706;
  flex-shrink: 0;
}

/* Cheatsheet section */
.couple-cheatsheet-section {
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

.cheatsheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cs-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cs-sparkle-icon {
  font-size: 15px;
  color: #f59e0b;
}

.cs-title {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.cs-sub {
  font-size: 11px;
  color: #94a3b8;
}

.cheatsheet-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.cheatsheet-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cs-card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  margin-bottom: 2px;
}

.cs-card-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: #475569;
  letter-spacing: 0.04em;
}

.cs-item-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 11.5px;
  min-width: 0;
}

.cs-who {
  font-weight: 800;
  font-size: 10.5px;
  flex-shrink: 0;
}

.cs-val {
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========================================================== */
/* CENTRUM SAMOPOCZUCIA I NASTROJU (MOOD HUB)                 */
/* ========================================================== */
.mood-hub-card {
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
}

.active-mood-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px 9px;
  border-radius: 999px;
}

.partner-mood-spotlight {
  background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%);
  border: 1px solid #ccfbf1;
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 16px;
}

.spotlight-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.spotlight-mini-tag {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  color: #0d9488;
  text-transform: uppercase;
  display: block;
}

.spotlight-title-group h4 {
  margin: 2px 0 0 0;
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
}

.spotlight-sync-time {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.spotlight-content-box {
  display: flex;
  gap: 12px;
  align-items: center;
}

.spotlight-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
}

.spotlight-texts {
  flex: 1;
  min-width: 0;
}

.spotlight-mood-name {
  font-size: 13.5px;
  font-weight: 800;
  color: #0d9488;
  display: block;
}

.spotlight-note {
  font-size: 12.5px;
  font-style: italic;
  color: #334155;
  margin: 3px 0 0 0;
  line-height: 1.35;
  word-break: break-word;
}

.spotlight-note-empty {
  font-size: 11.5px;
  color: #94a3b8;
  margin: 3px 0 0 0;
}

.my-mood-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.mood-chips-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 12px 0 14px 0;
}

.mood-chip-btn {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.mood-chip-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.mood-chip-btn.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
}

.mood-chip-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  transition: all 0.2s ease;
}

.mood-chip-btn.active .mood-chip-icon {
  background: rgba(255, 255, 255, 0.15);
  border-color: transparent;
  color: #ffffff;
}

.mood-chip-label {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}

.mood-chip-btn.active .mood-chip-label {
  color: #ffffff;
}

.mood-action-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.save-mood-btn {
  width: 100%;
  padding: 13px;
  font-size: 13.5px;
  font-weight: 800;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* ========================================================== */
/* CODZIENNE PUKNIĘCIE (DAILY NUDGE)                          */
/* ========================================================== */
.daily-nudge-card {
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
}

.daily-nudge-card h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.limit-badge {
  font-size: 10px;
  font-weight: 700;
  color: #f43f5e;
  background: #fff1f2;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #ffe4e6;
}

.limit-badge.points-done {
  background: #dcfce7;
  color: var(--dn-activity-accent);
  border-color: #86efac;
}

.nudge-already-sent-box {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  padding: 14px;
  margin-top: 10px;
  margin-bottom: 12px;
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
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #16a34a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.sent-status-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sent-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--dn-activity-accent);
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
  padding: 6px 12px;
  font-size: 12px;
  color: #166534;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  width: fit-content;
}

.timer-clock-icon {
  font-size: 15px;
  color: #16a34a;
}

.nudge-types-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin: 10px 0 12px 0;
}

.nudge-preset-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
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
  width: 100%;
  padding: 13px;
  font-size: 13.5px;
  font-weight: 800;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.recent-nudges-section {
  margin-top: 14px;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}

.sub-heading {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  display: block;
  margin-bottom: 6px;
}

.nudges-history-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
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
  overflow-wrap: break-word;
  word-break: break-word;
}

/* ========================================================== */
/* SEKCJA INFORMACJI O GNIAZDKU (NEST CONFIG CARD)           */
/* ========================================================== */
.nest-config-card {
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  position: relative;
  overflow: hidden;
}

.days-together-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #f43f5e;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  padding: 2px 8px;
  border-radius: 999px;
}

.nest-hero-banner {
  background: linear-gradient(135deg, #fff1f2 0%, #f0fdfa 100%);
  border: 1px solid #ffe4e6;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 10px 0 16px 0;
}

.nest-hero-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(244, 63, 94, 0.35);
}

.nest-hero-text h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.nest-hero-text p {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.35;
}

.settings-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.label-with-hint {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
}

.form-label {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
}

.field-hint {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.input-with-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-leading-icon {
  position: absolute;
  left: 12px;
  font-size: 18px;
  color: #0f172a;
  pointer-events: none;
  z-index: 2;
}

.input-with-icon-wrap .dn-styled-input {
  width: 100%;
  --padding-start: 38px;
  --padding-end: 14px;
  --background: #ffffff;
  --border-radius: 14px;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px solid #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  transition: all 0.2s ease;
}

.input-with-icon-wrap .dn-styled-input:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.date-styled-input {
  cursor: pointer;
}

.quick-chips-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.chips-mini-label {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  margin-right: 2px;
}

.chip-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  padding: 5px 11px;
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.chip-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.chip-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
  font-weight: 700;
}

.anniversary-milestone-box {
  margin-top: 8px;
  background: linear-gradient(135deg, #fff1f2 0%, #fffbeb 100%);
  border: 1px solid #fed7aa;
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: fadeInMilestone 0.25s ease;
}

@keyframes fadeInMilestone {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.milestone-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #f43f5e;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(244, 63, 94, 0.3);
}

.milestone-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.milestone-title {
  font-size: 12.5px;
  color: #9a3412;
  overflow-wrap: break-word;
  word-break: break-word;
}

.milestone-subtitle {
  font-size: 12px;
  color: #7c2d12;
}

.anniversary-empty-hint {
  margin-top: 6px;
  font-size: 11.5px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
}

.anniversary-empty-hint ion-icon {
  color: #f59e0b;
}

.save-settings-btn {
  width: 100%;
  padding: 13px;
  font-size: 13.5px;
  font-weight: 800;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
}

/* ========================================================== */
/* TWÓJ KOLOR AKCENTU (ACCENT COLOR CARD)                    */
/* ========================================================== */
.accent-color-card {
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
}

.accent-color-card h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.active-color-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid currentColor;
}

/* ========================================================== */
/* RGB COLOR PICKER SLIDERS & CONTROLS                        */
/* ========================================================== */
.rgb-picker-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  margin: 14px 0 16px 0;
}

.picker-top-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-swatch-disc {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  transition: transform 0.18s ease;
}

.color-swatch-disc:hover {
  transform: scale(1.05);
}

.swatch-pipette-icon {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.9);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  pointer-events: none;
}

.native-color-hidden-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
}

.color-meta-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.hex-input-wrap {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  padding: 4px 10px;
  max-width: 130px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
}

.hash-label {
  font-size: 13px;
  font-weight: 800;
  color: #94a3b8;
  margin-right: 2px;
}

.hex-text-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 800;
  font-family: monospace;
  color: #0f172a;
  outline: none;
  letter-spacing: 0.05em;
}

.rgb-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  font-family: monospace;
  padding-left: 2px;
}

.apply-accent-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  flex-shrink: 0;
}

.apply-accent-btn:active {
  transform: scale(0.96);
}

.save-color-spinner {
  width: 18px;
  height: 18px;
}

.slider-control-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.slider-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #475569;
}

.slider-value-pill {
  font-size: 10.5px;
  font-weight: 800;
  color: #0f172a;
  background: #ffffff;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  font-family: monospace;
}

.slider-track-wrap {
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
}

.duo-color-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 14px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.6);
}

.hue-range {
  background: linear-gradient(
    to right,
    #ff0000 0%,
    #ffff00 17%,
    #00ff00 33%,
    #00ffff 50%,
    #0000ff 67%,
    #ff00ff 83%,
    #ff0000 100%
  );
}

/* Custom thumb styling across webkit and moz */
.duo-color-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  border: 2.5px solid #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.duo-color-range::-webkit-slider-thumb:active {
  transform: scale(1.18);
}

.duo-color-range::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  border: 2.5px solid #0f172a;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

/* Inspirations swatches */
.inspirations-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.inspirations-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.inspirations-chips-scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 2px 6px 2px;
  -webkit-overflow-scrolling: touch;
}

.inspiration-swatch-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2.5px solid #ffffff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 16px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.inspiration-swatch-btn:active {
  transform: scale(0.92);
}

.inspiration-swatch-btn.active {
  transform: scale(1.15);
  box-shadow: 0 0 0 2px #0f172a, 0 3px 8px rgba(0, 0, 0, 0.25);
}

.swatch-check {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
}

.sample-avatar-text-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sample-avatar-sub {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.live-preview-box {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.25s ease;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sample-task-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.sample-checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 14px;
  flex-shrink: 0;
}

.sample-task-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sample-task-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.sample-tags-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sample-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid;
}

.sample-pts-badge {
  font-size: 10px;
  font-weight: 800;
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
  padding: 1px 6px;
  border-radius: 999px;
}

.sample-avatar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
}

.sample-avatar-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 800;
  font-size: 13px;
  flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.sample-avatar-desc {
  font-size: 12px;
  color: #64748b;
}

/* ========================================================== */
/* SPOTIFY SETTINGS & ACTIVITY CARD                           */
/* ========================================================== */
.spotify-settings-card {
  margin-bottom: 16px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: var(--dn-card-shadow);
  position: relative;
  overflow: hidden;
}

.spotify-section-tag {
  color: #15803d;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-size: 11px;
  letter-spacing: 0.06em;
}

.spotify-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  transition: all 0.15s ease;
}

.status-indicator-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  display: inline-block;
}

.spotify-status-pill.is-connected {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.spotify-status-pill.is-connected .status-indicator-dot {
  background: #16a34a;
}

.spotify-error-box {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #9f1239;
  font-size: 12.5px;
  line-height: 1.4;
}

.spotify-error-box .error-icon {
  font-size: 18px;
  flex-shrink: 0;
  color: #e11d48;
}

/* STATE A: Disconnected Hero Banner */
.spotify-connect-card {
  position: relative;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 22px 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
}

.spotify-connect-icon-circle {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.connect-card-title {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.connect-card-desc {
  margin: 0 0 14px 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.45;
  max-width: 360px;
}

.spotify-features-chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
}

.spotify-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: 11.5px;
  font-weight: 600;
  color: #334155;
}

.spotify-chip ion-icon {
  font-size: 13px;
  color: #0f172a;
}

.spotify-connect-btn {
  background: #1db954;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 11px 22px;
  font-size: 13.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
  transition: transform 0.15s ease, background 0.15s ease;
  touch-action: manipulation;
}

.spotify-connect-btn:active {
  transform: scale(0.97);
  background: #1aa34a;
}

.spotify-connect-btn:disabled {
  opacity: 0.6;
  pointer-events: none;
}

/* STATE B: Connected Settings */
.spotify-account-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  margin-bottom: 12px;
}

.account-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.spotify-avatar-wrap {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.online-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #16a34a;
  border: 2px solid #ffffff;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.account-name {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #15803d;
  font-size: 11.5px;
  font-weight: 600;
}

.account-status .check-icon {
  font-size: 13px;
  color: #16a34a;
}

.spotify-disconnect-btn {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  border-radius: 10px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
  touch-action: manipulation;
}

.spotify-disconnect-btn:active {
  color: #ef4444;
  border-color: #fecaca;
  background: #fef2f2;
}

.spotify-disconnect-btn:disabled {
  opacity: 0.6;
  pointer-events: none;
}

.spotify-visibility-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  margin-bottom: 14px;
}

.visibility-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.visibility-icon-bubble {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.visibility-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.visibility-info strong {
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 700;
}

.visibility-info span {
  color: #64748b;
  font-size: 11.5px;
  line-height: 1.35;
}

.spotify-toggle {
  --color-checked: #0f172a;
  --handle-color-checked: #ffffff;
  flex-shrink: 0;
}

/* Preview Section */
.spotify-preview-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
}

.spotify-preview-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.preview-heading-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preview-heading-text strong {
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 700;
}

.preview-heading-text span {
  color: #64748b;
  font-size: 11.5px;
  line-height: 1.35;
}

.spotify-preview-label {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 9999px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #475569;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.spotify-preview-card-wrap :deep(.spotify-activity-card) {
  margin: 0;
  box-shadow: none;
}

.spotify-preview-empty-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
}

.empty-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.empty-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.empty-text-wrap strong {
  color: #0f172a;
  font-size: 12.5px;
  font-weight: 700;
}

.empty-text-wrap p {
  margin: 0;
  color: #64748b;
  font-size: 11.5px;
  line-height: 1.35;
}

.push-settings-card {
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
}

.push-settings-card h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.push-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid transparent;
}

.push-status-pill.is-active {
  background: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
}

.push-status-pill.is-waiting {
  background: #fefce8;
  color: #ca8a04;
  border-color: #fef08a;
}

.push-status-pill.is-denied {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
}

.push-status-pill.is-disabled {
  background: #f1f5f9;
  color: #64748b;
  border-color: #e2e8f0;
}

.push-master-toggle-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 14px 0;
}

.master-toggle-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.master-toggle-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
}

.master-toggle-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.master-toggle-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.master-toggle-subtitle {
  font-size: 12px;
  color: #64748b;
  line-height: 1.35;
}

.dn-push-toggle {
  --track-background-checked: #0f172a;
  --handle-background-checked: #ffffff;
}

.push-denied-box {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.denied-icon {
  font-size: 20px;
  color: #ea580c;
  flex-shrink: 0;
  margin-top: 2px;
}

.denied-content strong {
  display: block;
  font-size: 13px;
  color: #9a3412;
  margin-bottom: 2px;
}

.denied-content p {
  margin: 0;
  font-size: 12px;
  color: #7c2d12;
  line-height: 1.4;
}

.push-prompt-box {
  margin-bottom: 16px;
}

.request-perm-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 13.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.push-granularity-section {
  margin-top: 18px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 16px;
}

.group-title-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: #0f172a;
  margin-bottom: 2px;
}

.group-title-label.mt-label {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
}

.group-sub-desc {
  font-size: 12.5px;
  color: #64748b;
  margin: 0 0 12px 0;
}

.push-toggles-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.push-toggle-item {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition: all 0.15s ease;
}

.push-toggle-item:hover {
  background: #f8fafc;
  border-color: #e2e8f0;
}

.toggle-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.toggle-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.love-icon-bg { background: #f1f5f9; color: #0f172a; }
.mood-icon-bg { background: #f8fafc; color: #1e293b; }
.calendar-icon-bg { background: #f1f5f9; color: #334155; }
.shopping-icon-bg { background: #f8fafc; color: #18181b; }
.tasks-icon-bg { background: #f1f5f9; color: #0f172a; }
.meals-icon-bg { background: #f8fafc; color: #0f172a; }
.wishlist-icon-bg { background: #f8fafc; color: #1e293b; }
.savings-icon-bg { background: #f1f5f9; color: #0f172a; }
.online-icon-bg { background: #f1f5f9; color: #334155; }
.sound-icon-bg { background: #f8fafc; color: #475569; }
.vibrate-icon-bg { background: #f1f5f9; color: #64748b; }

.toggle-item-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.toggle-name {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.toggle-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.3;
}

.push-test-action-wrap {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed #e2e8f0;
  text-align: center;
}

.push-test-btn {
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  font-size: 13.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.push-test-btn:hover {
  background: #1e293b;
}

.push-test-btn:active {
  transform: scale(0.98);
}

.test-hint {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
}

/* ========================================================== */
/* POŁĄCZENIE PARY (PAIRING CARD)                             */
/* ========================================================== */
.pairing-card {
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
}

.pairing-card h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

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
  background: #f8fafc;
  border: 1.5px dashed #cbd5e1;
  border-radius: 16px;
  padding: 14px;
  text-align: center;
  margin: 12px 0 16px 0;
}

.code-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #64748b;
  display: block;
}

.code-display-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 8px 0;
}

.code-text {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: 0.15em;
  color: #0f172a;
  font-family: monospace;
}

.copy-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.copy-btn:hover {
  background: #f1f5f9;
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
  --border-radius: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.partner-code-input:focus-within {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.join-submit-btn {
  background: #0f172a;
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

.partnership-buttons-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.disconnect-pair-btn {
  width: 100%;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 12px;
  padding: 11px;
  font-size: 12.5px;
  font-weight: 700;
  color: #e11d48;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.disconnect-pair-btn:active {
  background: #ffe4e6;
}

/* ========================================================== */
/* KONTO I BEZPIECZEŃSTWO (ACCOUNT CARD)                      */
/* ========================================================== */
.account-card {
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
}

.account-card h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.account-actions-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.change-password-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #1e293b;
  font-size: 14px;
  font-weight: 600;
}

.change-password-toggle-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.change-password-toggle-btn.is-open {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.toggle-btn-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-btn-left .btn-icon {
  font-size: 18px;
  color: #0f172a;
}

.chevron-icon {
  font-size: 16px;
  color: #64748b;
  transition: transform 0.2s ease;
}

.password-change-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.password-change-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pwd-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pwd-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pwd-label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.pwd-hint {
  font-size: 11px;
  color: #94a3b8;
}

.pwd-input-wrap {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 12px;
  transition: all 0.2s ease;
}

.pwd-input-wrap:focus-within {
  background: #ffffff;
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
}

.pwd-input-icon {
  font-size: 17px;
  color: #64748b;
  margin-right: 8px;
  flex-shrink: 0;
}

.pwd-native-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-size: 14px;
  color: #0f172a;
  outline: none;
  font-family: inherit;
}

.pwd-native-input::placeholder {
  color: #94a3b8;
  font-size: 13px;
}

.pwd-eye-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.pwd-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.4;
}

.pwd-banner.error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.pwd-banner.success {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #16a34a;
}

.banner-icon {
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.pwd-buttons-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.save-pwd-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: #0f172a;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25);
  transition: background 0.15s ease;
}

.save-pwd-btn:hover:not(:disabled) {
  background: #1e293b;
}

.save-pwd-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-pwd-btn {
  padding: 10px 14px;
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cancel-pwd-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.pwd-spinner {
  font-size: 18px;
  color: #ffffff;
}

.signout-app-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #f8fafc;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;
}

.signout-app-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* ========================================================== */
/* MODAL EDYCJI PROFILU (EDIT PROFILE MODAL)                  */
/* ========================================================== */
ion-modal.dn-edit-profile-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
}

.modal-custom-header ion-toolbar {
  --background: #ffffff;
  --border-width: 0;
  padding: 4px 8px;
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
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close-icon-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.edit-modal-content {
  --background: #f8fafc;
}

.modal-form-wrapper {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 24px;
}

.profile-modal-hero {
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.profile-modal-avatar {
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
  flex-shrink: 0;
}

.avatar-star-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 22px;
  height: 22px;
  background: #ffffff;
  color: #0f172a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.profile-modal-hero-text h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.live-sync-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #0d9488;
  background: #ccfbf1;
  border: 1px solid #99f6e4;
  padding: 2px 8px;
  border-radius: 9999px;
  margin-top: 4px;
}

.modal-section-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.section-card-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
}

.mini-section-tag {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #0f172a;
}

.mini-section-tag.tag-love {
  color: #f43f5e;
}

.mini-section-tag.tag-prefs {
  color: #0d9488;
}

.section-micro-desc {
  margin: 0 0 10px 0;
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.35;
}

.textarea-with-icon-wrap {
  position: relative;
  display: flex;
  align-items: flex-start;
}

.textarea-leading-icon {
  position: absolute;
  left: 12px;
  top: 14px;
  color: #f43f5e;
  pointer-events: none;
  z-index: 2;
}

.textarea-with-icon-wrap .dn-styled-textarea {
  width: 100%;
  --padding-start: 38px;
  --padding-end: 14px;
  --background: #ffffff;
  --border-radius: 14px;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px solid #e2e8f0;
  font-size: 13.5px;
  color: #0f172a;
  line-height: 1.45;
  transition: all 0.2s ease;
}

.textarea-with-icon-wrap .dn-styled-textarea:focus-within {
  border-color: #f43f5e;
  box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.14);
}

.mt-chips {
  margin-top: 10px;
}

.chip-btn.love-chip:hover {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #e11d48;
}

.chip-btn.love-chip.active {
  background: #ffe4e6;
  color: #e11d48;
  border-color: #fda4af;
}

.pref-subfield {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pref-subfield.mt-subfield {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed #e2e8f0;
}

.subfield-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: #1e293b;
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
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.15);
}

.save-all-profile-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
