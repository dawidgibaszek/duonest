<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="header-action-row">
            <div class="dn-header-title">
              <span>Relacja</span>
            </div>
            <button
              type="button"
              class="dn-header-btn dn-header-btn--icon dn-header-btn--soft"
              aria-label="Edytuj profil"
              @click="openEditProfileModal"
            >
              <ion-icon :icon="ioniconsCreateOutline" />
            </button>
          </div>
        </div>
      </ion-toolbar>
      <ion-toolbar class="dn-subtabs-toolbar" data-no-swipe>
        <div class="dn-subtabs">
          <button
            type="button"
            class="dn-subtab"
            :class="{ active: currentCategory === 'relationship' }"
            @click="currentCategory = 'relationship'"
          >
            <span>Na co dzień</span>
          </button>
          <button
            type="button"
            class="dn-subtab"
            :class="{ active: currentCategory === 'nest_settings' }"
            @click="currentCategory = 'nest_settings'"
          >
            <span>Ustawienia</span>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- ============================================== -->
      <!-- NA CO DZIEŃ                                     -->
      <!-- ============================================== -->
      <div v-show="currentCategory === 'relationship'" class="rl-page">
        <!-- COUPLE CARD (cream accent) -->
        <section class="rl-couple">
          <div class="rl-couple-people">
            <div class="rl-person">
              <span class="rl-avatar" :style="{ backgroundColor: currentUserAccentColor }">
                {{ (currentUser.name || 'T').charAt(0).toUpperCase() }}
              </span>
              <span class="rl-person-name">{{ currentUser.name || 'Ty' }}</span>
              <span class="rl-person-meta">Ty</span>
            </div>

            <div class="rl-couple-bridge">
              <span class="rl-bridge-line"></span>
              <span class="rl-bridge-heart"><ion-icon :icon="ioniconsHeart" /></span>
              <span class="rl-bridge-line"></span>
            </div>

            <div v-if="partnerUser" class="rl-person">
              <span class="rl-avatar" :style="{ backgroundColor: partnerUserAccentColor }">
                {{ (partnerUser.name || 'P').charAt(0).toUpperCase() }}
                <span class="rl-online-pip" :class="{ 'is-online': isPartnerOnline }"></span>
              </span>
              <span class="rl-person-name">{{ partnerUser.name || 'Partner' }}</span>
              <span class="rl-person-meta">{{ isPartnerOnline ? 'Online' : 'Offline' }}</span>
            </div>
            <button v-else type="button" class="rl-person rl-person--empty" @click="currentCategory = 'nest_settings'">
              <span class="rl-avatar rl-avatar--empty"><ion-icon :icon="ioniconsPersonAddOutline" /></span>
              <span class="rl-person-name">Brak pary</span>
              <span class="rl-person-meta">Połącz teraz</span>
            </button>
          </div>

          <div class="rl-couple-days">
            <span class="rl-days-num">{{ daysTogether }}</span>
            <span class="rl-days-label">dni razem</span>
          </div>

          <!-- Love notes -->
          <div
            v-if="(currentUser.love_note && currentUser.love_note.trim()) || (partnerUser?.love_note && partnerUser.love_note.trim())"
            class="rl-notes"
          >
            <div v-if="currentUser.love_note && currentUser.love_note.trim()" class="rl-note">
              <span class="rl-note-author">{{ currentUser.name || 'Ty' }}</span>
              <p class="rl-note-text">„{{ currentUser.love_note }}”</p>
            </div>
            <div v-if="partnerUser?.love_note && partnerUser.love_note.trim()" class="rl-note">
              <span class="rl-note-author">{{ partnerUser.name || 'Partner' }}</span>
              <p class="rl-note-text">„{{ partnerUser.love_note }}”</p>
            </div>
          </div>
          <button v-else type="button" class="rl-note rl-note--invite" @click="openEditProfileModal">
            <span class="rl-note-author">Dodaj czułą myśl</span>
            <span class="rl-note-hint">Będzie widoczna w Waszym profilu</span>
            <ion-icon :icon="ioniconsChevronForwardOutline" class="rl-note-chevron" />
          </button>
        </section>

        <!-- MOOD -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Samopoczucie</h3>
            <span class="rl-section-meta">{{ formattedPartnerMoodTime }}</span>
          </div>

          <div v-if="partnerUser" class="rl-row rl-row--card">
            <span class="rl-row-icon rl-row-icon--cream">
              <DuoIcon :name="'mood-' + (partnerUser.current_mood || 'happy')" :size="22" />
            </span>
            <span class="rl-row-body">
              <span class="rl-row-title">{{ partnerUser.name }} · {{ getMoodLabel(partnerUser.current_mood) }}</span>
              <span class="rl-row-sub">{{ partnerUser.mood_note ? `„${partnerUser.mood_note}”` : 'Bez notatki na dziś' }}</span>
            </span>
          </div>

          <p class="rl-label">Jak się dziś czujesz?</p>
          <div class="rl-chips" data-no-swipe>
            <button
              v-for="m in moodChoices"
              :key="m.id"
              type="button"
              class="rl-mood"
              :class="{ active: selectedMood === m.id }"
              @click="selectedMood = m.id"
            >
              <DuoIcon :name="'mood-' + m.id" :size="18" />
              <span>{{ m.label }}</span>
            </button>
          </div>

          <div class="rl-field">
            <ion-input aria-label="Notatka do nastroju"
              v-model="moodNote"
              placeholder="Krótka notatka dla partnera (opcjonalnie)"
              class="rl-input"
              :clear-input="true"
            />
          </div>
          <button type="button" class="dn-button-primary rl-full-btn" @click="handleSaveMood">
            Zapisz nastrój
          </button>
        </section>

        <!-- GESTURES -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Drobny gest</h3>
            <span class="rl-section-meta">{{ hasSentDailyNudge ? 'Wysłano dziś' : 'Raz dziennie · +5 pkt' }}</span>
          </div>

          <div v-if="hasSentDailyNudge" class="rl-row rl-row--card">
            <span class="rl-row-icon rl-row-icon--ink"><ion-icon :icon="ioniconsCheckmarkOutline" /></span>
            <span class="rl-row-body">
              <span class="rl-row-title">{{ partnerUser?.name || 'Partner' }} dostał(a) Twój gest</span>
              <span class="rl-row-sub">Kolejny za {{ formattedNextNudgeTime }}</span>
            </span>
          </div>

          <template v-else>
            <div class="rl-gestures" data-no-swipe>
              <button
                v-for="n in nudgePresets"
                :key="n.id"
                type="button"
                class="rl-gesture"
                :class="{ active: selectedNudgeType === n.id }"
                @click="selectedNudgeType = n.id"
              >
                <span class="rl-gesture-icon"><DuoIcon :name="'nudge-' + n.id" :size="22" /></span>
                <span class="rl-gesture-label">{{ n.title }}</span>
              </button>
            </div>
            <div class="rl-field">
              <ion-input aria-label="Czuła wiadomość"
                v-model="customNudgeMessage"
                placeholder="Czuła wiadomość (opcjonalnie)"
                class="rl-input"
                :clear-input="true"
              />
            </div>
            <button type="button" class="dn-button-primary rl-full-btn" @click="handleSendNudge">
              Wyślij gest
            </button>
          </template>

          <div v-if="nudgesList.length > 0" class="rl-history">
            <p class="rl-label">Ostatnie</p>
            <div v-for="ndg in nudgesList.slice(0, 3)" :key="ndg.id" class="rl-row rl-row--list">
              <span class="rl-row-icon rl-row-icon--sm"><DuoIcon :name="'nudge-' + ndg.nudge_type" :size="16" /></span>
              <span class="rl-row-body">
                <span class="rl-row-title">{{ ndg.message || getNudgeTitle(ndg.nudge_type) }}</span>
                <span class="rl-row-sub">{{ ndg.sender_id === currentUser?.id ? 'Od Ciebie' : ('Od ' + (partnerUser?.name || 'partnera')) }}</span>
              </span>
            </div>
          </div>
        </section>

        <!-- CHEATSHEET -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Ściągawka</h3>
            <button type="button" class="rl-link" @click="openEditProfileModal">Uzupełnij</button>
          </div>
          <div class="rl-cheats">
            <div class="rl-cheat">
              <span class="rl-cheat-head"><DuoIcon name="drink" :size="16" /> Ulubiony napój</span>
              <span class="rl-cheat-row"><span class="rl-cheat-who">Ty</span>{{ currentUser.favorite_drink || '—' }}</span>
              <span v-if="partnerUser" class="rl-cheat-row"><span class="rl-cheat-who">{{ partnerUser.name || 'Partner' }}</span>{{ partnerUser.favorite_drink || '—' }}</span>
            </div>
            <div class="rl-cheat">
              <span class="rl-cheat-head"><DuoIcon name="treat" :size="16" /> Ulubiona przekąska</span>
              <span class="rl-cheat-row"><span class="rl-cheat-who">Ty</span>{{ currentUser.favorite_treat || '—' }}</span>
              <span v-if="partnerUser" class="rl-cheat-row"><span class="rl-cheat-who">{{ partnerUser.name || 'Partner' }}</span>{{ partnerUser.favorite_treat || '—' }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- ============================================== -->
      <!-- USTAWIENIA                                      -->
      <!-- ============================================== -->
      <div v-show="currentCategory === 'nest_settings'" class="rl-page">
        <!-- NEST -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Gniazdko</h3>
          </div>

          <label class="rl-label">Nazwa</label>
          <div class="rl-field">
            <ion-input aria-label="Nazwa gniazdka"
              v-model="nestNameInput"
              placeholder="np. Nasze Ciepłe Gniazdko"
              class="rl-input"
              :clear-input="true"
            />
          </div>
          <div class="rl-chips rl-chips--wrap">
            <button
              v-for="sugg in nestNameSuggestions"
              :key="sugg"
              type="button"
              class="dn-filter-chip"
              :class="{ active: nestNameInput === sugg }"
              @click="nestNameInput = sugg"
            >
              {{ sugg }}
            </button>
          </div>

          <label class="rl-label">Data rocznicy</label>
          <div class="rl-field">
            <ion-input aria-label="Data rocznicy" type="date" v-model="anniversaryInput" class="rl-input rl-input--date" />
          </div>
          <p class="rl-hint">
            <template v-if="anniversaryInput">Razem od {{ formattedAnniversaryDisplay }} · {{ daysTogether }} dni</template>
            <template v-else>Data pierwszej randki lub ślubu – od niej liczymy Wasze dni</template>
          </p>

          <button type="button" class="dn-button-primary rl-full-btn" @click="handleSaveNestSettings">
            Zapisz
          </button>
        </section>

        <!-- ACCENT COLOUR -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Twój kolor</h3>
            <span class="rl-section-meta">{{ selectedCustomColor.toUpperCase() }}</span>
          </div>
          <p class="rl-desc">Wyróżnia Twój awatar i wszystko, co przypisane do Ciebie.</p>

          <div class="rl-color-top">
            <button
              type="button"
              class="rl-swatch"
              :style="{ backgroundColor: selectedCustomColor }"
              @click="openNativeColorPicker"
              aria-label="Otwórz koło kolorów"
            >
              <span>{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
              <input
                type="color"
                ref="nativeColorInputRef"
                class="native-color-hidden-input"
                :value="selectedCustomColor"
                @input="onNativeColorChange"
              />
            </button>
            <div class="rl-hex">
              <span class="rl-hex-hash">#</span>
              <input
                type="text"
                class="rl-hex-input"
                :value="selectedCustomColor.replace('#', '').toUpperCase()"
                @input="handleHexInput"
                placeholder="HEX"
                maxlength="6"
              />
            </div>
            <button
              type="button"
              class="rl-color-save"
              :disabled="isSavingColor"
              @click="handleSaveCustomColor"
            >
              <ion-spinner v-if="isSavingColor" name="crescent" />
              <span v-else>Zapisz</span>
            </button>
          </div>

          <div class="rl-swatches" data-no-swipe>
            <button
              v-for="c in quickColorInspirations"
              :key="c.hex"
              type="button"
              class="rl-swatch-dot"
              :class="{ active: selectedCustomColor.toLowerCase() === c.hex.toLowerCase() }"
              :style="{ backgroundColor: c.hex }"
              :aria-label="c.label"
              @click="handleSelectInspiration(c.hex)"
            ></button>
          </div>

          <div class="rl-slider">
            <div class="rl-slider-head"><span>Odcień</span><span>{{ pickerHue }}°</span></div>
            <input type="range" min="0" max="360" step="1" v-model.number="pickerHue" class="duo-color-range hue-range" />
          </div>
          <div class="rl-slider">
            <div class="rl-slider-head"><span>Nasycenie</span><span>{{ pickerSaturation }}%</span></div>
            <input
              type="range" min="5" max="100" step="1" v-model.number="pickerSaturation"
              class="duo-color-range"
              :style="{ background: `linear-gradient(to right, hsl(${pickerHue}, 5%, ${pickerLightness}%), hsl(${pickerHue}, 100%, ${pickerLightness}%))` }"
            />
          </div>
          <div class="rl-slider">
            <div class="rl-slider-head"><span>Jasność</span><span>{{ pickerLightness }}%</span></div>
            <input
              type="range" min="10" max="90" step="1" v-model.number="pickerLightness"
              class="duo-color-range"
              :style="{ background: `linear-gradient(to right, #000000 0%, hsl(${pickerHue}, ${pickerSaturation}%, 50%) 50%, #ffffff 100%)` }"
            />
          </div>
        </section>

        <!-- MUSIC -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Muzyka</h3>
            <span class="rl-status" :class="{ 'is-on': musicConnection.connected }">
              {{ musicConnection.connected ? 'Połączone' : 'Niepołączone' }}
            </span>
          </div>

          <div v-if="musicSuccessMessage" class="rl-banner">{{ musicSuccessMessage }}</div>
          <div v-if="musicErrorMessage" class="rl-banner rl-banner--error">{{ musicErrorMessage }}</div>

          <template v-if="!musicConnection.connected">
            <p class="rl-desc">Partner zobaczy na żywo, czego słuchasz – przez Last.fm, z każdej aplikacji.</p>
            <div class="rl-platforms">
              <span v-for="sv in ['spotify', 'apple_music', 'youtube_music', 'tidal', 'lastfm']" :key="sv" class="rl-platform">
                <DuoMusicLogo :service="sv" size="xs" />
              </span>
            </div>
            <ol class="rl-steps">
              <li>Włącz scrobblowanie w aplikacji muzycznej (Spotify: <a href="https://www.last.fm/settings/applications" target="_blank" rel="noopener noreferrer">last.fm/settings/applications</a> → <em>Connect</em>).</li>
              <li>Zaloguj konto Last.fm poniżej.</li>
            </ol>
            <button type="button" class="dn-button-primary rl-full-btn" :disabled="musicLoading" @click="connectMusic">
              <ion-spinner v-if="musicLoading" name="crescent" />
              <span v-else>Zaloguj przez Last.fm</span>
            </button>
            <button type="button" class="rl-link rl-link--center" @click="showManualNickInput = !showManualNickInput">
              {{ showManualNickInput ? 'Ukryj' : 'Albo wpisz login Last.fm' }}
            </button>
            <div v-if="showManualNickInput" class="rl-inline-form">
              <input
                v-model="lastFmUsernameInput"
                type="text"
                placeholder="Login Last.fm"
                class="rl-native-input"
                @keydown.enter="handleManualConnect"
              />
              <button
                type="button"
                class="rl-inline-btn"
                :disabled="!lastFmUsernameInput.trim() || musicLoading"
                @click="handleManualConnect"
              >
                Połącz
              </button>
            </div>
          </template>

          <template v-else>
            <div class="rl-row rl-row--card">
              <span class="rl-row-icon rl-row-icon--plain">
                <DuoMusicLogo :service="musicConnection.music_service || 'spotify'" size="small" />
              </span>
              <span class="rl-row-body">
                <span class="rl-row-title">{{ musicConnection.display_name || 'Last.fm' }}</span>
                <span class="rl-row-sub">{{ currentPlatformName }}</span>
              </span>
              <button type="button" class="rl-icon-btn" :disabled="musicLoading" aria-label="Odśwież" @click="refreshMusicStatus(true)">
                <ion-icon :icon="ioniconsRefreshOutline" :class="{ 'is-spinning': musicLoading }" />
              </button>
            </div>

            <p class="rl-label">Główna platforma</p>
            <div class="rl-chips" data-no-swipe>
              <button
                v-for="platform in availablePlatforms"
                :key="platform.id"
                type="button"
                class="dn-filter-chip rl-platform-chip"
                :class="{ active: (musicConnection.music_service || 'spotify') === platform.id }"
                @click="handleSelectService(platform.id)"
              >
                <DuoMusicLogo :service="platform.id" size="xs" />
                <span>{{ platform.name }}</span>
              </button>
            </div>

            <div class="rl-list">
              <div class="rl-toggle-row">
                <span class="rl-row-body">
                  <span class="rl-row-title">Pokazuj partnerowi</span>
                  <span class="rl-row-sub">Twoja muzyka w Gniazdku partnera</span>
                </span>
                <ion-toggle aria-label="Pokazuj muzykę partnerowi"
                  :checked="musicConnection.visible_to_partner"
                  @ionChange="runToggle($event, () => setMusicVisibility($event.detail.checked), () => musicConnection.visible_to_partner)"
                />
              </div>
            </div>

            <div v-if="musicConnection.visible_to_partner && myMusicPlayback" class="rl-music-preview">
              <DuoMusicCard
                :playback="myMusicPlayback"
                user-name="Ty"
                :is-preview="true"
                :service="musicConnection.music_service || 'spotify'"
              />
            </div>
            <p v-else class="rl-hint">
              {{ !musicConnection.visible_to_partner ? 'Udostępnianie jest wyłączone.' : 'Włącz utwór – pojawi się tu podgląd.' }}
              Utwór się nie zmienia?
              <a href="https://www.last.fm/settings/applications" target="_blank" rel="noopener noreferrer">Połącz ponownie Spotify w Last.fm</a>.
            </p>

            <button type="button" class="rl-danger-link" :disabled="musicLoading" @click="disconnectMusic">
              Odłącz konto muzyczne
            </button>
          </template>
        </section>

        <!-- NOTIFICATIONS -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Powiadomienia</h3>
            <span class="rl-status" :class="{ 'is-on': isMasterPushChecked && (!isPushNativeApp || nativeRegistered) }">
              <template v-if="pushPermission === 'denied'">Zablokowane</template>
              <template v-else-if="isPushSubscribing">Łączenie</template>
              <template v-else-if="isMasterPushChecked && isPushNativeApp && !nativeRegistered">Wymaga ponowienia</template>
              <template v-else-if="isMasterPushChecked">Aktywne</template>
              <template v-else-if="pushPermission === 'granted'">Wyłączone</template>
              <template v-else>Wymaga zgody</template>
            </span>
          </div>

          <div class="rl-list">
            <div class="rl-toggle-row rl-toggle-row--main">
              <span class="rl-row-body">
                <span class="rl-row-title">Na tym urządzeniu</span>
                <span class="rl-row-sub">Wiadomości i aktywność partnera</span>
              </span>
              <ion-toggle
                aria-label="Powiadomienia na tym urządzeniu"
                :checked="isMasterPushChecked"
                :disabled="!isPushSupported || isPushSubscribing || isTestingPush || isTogglingMasterPush"
                @ionChange="handleMasterPushToggle($event)"
              />
            </div>
          </div>

          <div v-if="pushPermission === 'denied'" class="rl-banner rl-banner--error">
            <template v-if="isPushNativeApp">Powiadomienia są wyłączone dla DuoNest. Otwórz Ustawienia iOS → Powiadomienia → DuoNest → Zezwalaj na powiadomienia.</template>
            <template v-else>Powiadomienia są zablokowane w przeglądarce. Kliknij ikonę kłódki obok adresu strony → Uprawnienia → Powiadomienia → Zezwól, a potem odśwież stronę.</template>
          </div>

          <button
            v-if="pushPermission !== 'denied' && isPushSupported && (!isMasterPushChecked || (isPushNativeApp && !nativeRegistered))"
            type="button"
            class="dn-button-primary rl-full-btn"
            :disabled="isPushSubscribing || isTestingPush"
            @click="requestPushPermission"
          >
            {{ isMasterPushChecked ? 'Ponów rejestrację' : 'Zezwól na powiadomienia' }}
          </button>

          <p class="rl-label">Powiadamiaj mnie o</p>
          <div class="rl-list">
            <div
              v-for="row in [
                { key: 'nudges', icon: ioniconsHeartOutline, title: 'Gestach', desc: 'Buziaki, uściski i czułości' },
                { key: 'mood', icon: ioniconsHappyOutline, title: 'Nastroju partnera', desc: 'Zmiana samopoczucia i notatki' },
                { key: 'calendar', icon: ioniconsCalendarOutline, title: 'Terminarzu', desc: 'Nowe plany i przypomnienia' },
                { key: 'shopping', icon: ioniconsCartOutline, title: 'Zakupach', desc: 'Nowe produkty na liście' },
                { key: 'tasks', icon: ioniconsCheckboxOutline, title: 'Zadaniach', desc: 'Ukończone obowiązki i punkty' },
                { key: 'meals', icon: ioniconsRestaurantOutline, title: 'Obiadach', desc: 'Menu i nowe propozycje dań' },
                { key: 'wishlist', icon: ioniconsGiftOutline, title: 'Liście życzeń', desc: 'Nowe marzenia (niespodzianki zostają tajne)' },
                { key: 'savings', icon: ioniconsWalletOutline, title: 'Skarbonkach', desc: 'Wpłaty, wypłaty i nowe cele' },
                { key: 'partnerOnline', icon: ioniconsPersonOutline, title: 'Wejściu partnera', desc: 'Gdy partner otwiera DuoNest' },
                { key: 'sound', icon: ioniconsVolumeMediumOutline, title: 'Dźwięk', desc: 'Sygnał przy powiadomieniu' },
                { key: 'vibrate', icon: ioniconsPhonePortraitOutline, title: 'Wibracja', desc: 'Impuls haptyczny' }
              ].filter(row => !isPushNativeApp || (row.key !== 'vibrate' && row.key !== 'partnerOnline'))"
              :key="row.key"
              class="rl-toggle-row"
            >
              <span class="rl-row-icon rl-row-icon--sm"><ion-icon :icon="row.icon" /></span>
              <span class="rl-row-body">
                <span class="rl-row-title">{{ row.title }}</span>
                <span class="rl-row-sub">{{ row.desc }}</span>
              </span>
              <ion-toggle :aria-label="`Powiadomienia: ${row.title}`"
                :checked="(pushSettings as any)[row.key]"
                @ionChange="runToggle($event, () => togglePushCategory(row.key as any, $event.detail?.checked), () => (pushSettings as any)[row.key])"
              />
            </div>
          </div>

          <button
            type="button"
            class="dn-button-secondary rl-full-btn"
            :disabled="!isMasterPushChecked || isPushSubscribing || isTestingPush || isTogglingMasterPush"
            @click="sendTestNotification()"
          >
            {{ isTestingPush ? 'Wysyłanie…' : 'Wyślij testowe powiadomienie' }}
          </button>
        </section>

        <!-- PAIR -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Para</h3>
            <span v-if="partnership" class="rl-status is-on">Połączono</span>
          </div>
          <p v-if="partnership && partnerUser" class="rl-desc">Jesteście połączeni z: <strong>{{ partnerUser.name || 'Partner' }}</strong></p>
          <p v-else-if="!partnership" class="rl-desc">Przekaż partnerowi swój kod albo wpisz jego.</p>

          <div class="rl-code">
            <span class="rl-code-label">Twój kod</span>
            <span class="rl-code-text">{{ currentUser.pairing_code }}</span>
            <button type="button" class="rl-code-copy" @click="copyPairingCode">
              <ion-icon :icon="ioniconsCopyOutline" />
              <span>{{ copyStatus }}</span>
            </button>
          </div>

          <template v-if="!partnership">
            <label class="rl-label">Kod partnera</label>
            <div class="rl-inline-form">
              <ion-input aria-label="Kod partnera" v-model="inputPartnerCode" placeholder="np. DN-LOVE" class="rl-input" :maxlength="10" />
              <button type="button" class="rl-inline-btn" :disabled="!inputPartnerCode.trim()" @click="handlePairWithCode">
                Połącz
              </button>
            </div>
            <p v-if="pairingError" class="rl-error">{{ pairingError }}</p>
          </template>
          <button v-else type="button" class="rl-danger-link" @click="handleDisconnect">
            Rozłącz konto pary
          </button>
        </section>

        <!-- ACCOUNT -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Konto</h3>
          </div>
          <p class="rl-desc">{{ currentUser.email || currentUser.name || 'Użytkownik' }}</p>

          <div class="rl-list">
            <button type="button" class="rl-toggle-row rl-nav-row" @click="togglePasswordChangeForm">
              <span class="rl-row-icon rl-row-icon--sm"><ion-icon :icon="ioniconsLockClosedOutline" /></span>
              <span class="rl-row-body"><span class="rl-row-title">Zmień hasło</span></span>
              <ion-icon :icon="isPasswordChangeOpen ? ioniconsChevronUpOutline : ioniconsChevronDownOutline" class="rl-chevron" />
            </button>
          </div>

          <transition name="expand">
            <form v-if="isPasswordChangeOpen" class="rl-pwd-form" @submit.prevent="handleChangePassword">
              <div class="rl-pwd-field">
                <input
                  v-model="currentPasswordInput"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  placeholder="Obecne hasło"
                  class="rl-native-input"
                  autocomplete="current-password"
                  required
                />
                <button type="button" class="rl-eye" tabindex="-1" @click="showCurrentPassword = !showCurrentPassword">
                  <ion-icon :icon="showCurrentPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                </button>
              </div>
              <div class="rl-pwd-field">
                <input
                  v-model="newPasswordInput"
                  :type="showNewPassword ? 'text' : 'password'"
                  placeholder="Nowe hasło (min. 6 znaków)"
                  class="rl-native-input"
                  autocomplete="new-password"
                  minlength="6"
                  required
                />
                <button type="button" class="rl-eye" tabindex="-1" @click="showNewPassword = !showNewPassword">
                  <ion-icon :icon="showNewPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                </button>
              </div>
              <div class="rl-pwd-field">
                <input
                  v-model="confirmNewPasswordInput"
                  :type="showConfirmNewPassword ? 'text' : 'password'"
                  placeholder="Powtórz nowe hasło"
                  class="rl-native-input"
                  autocomplete="new-password"
                  minlength="6"
                  required
                />
                <button type="button" class="rl-eye" tabindex="-1" @click="showConfirmNewPassword = !showConfirmNewPassword">
                  <ion-icon :icon="showConfirmNewPassword ? ioniconsEyeOffOutline : ioniconsEyeOutline" />
                </button>
              </div>

              <div v-if="changePasswordError" class="rl-banner rl-banner--error">{{ changePasswordError }}</div>
              <div v-if="changePasswordSuccess" class="rl-banner">{{ changePasswordSuccess }}</div>

              <div class="rl-btn-row">
                <button type="button" class="dn-button-secondary" :disabled="isChangingPassword" @click="cancelPasswordChange">Anuluj</button>
                <button type="submit" class="dn-button-primary" :disabled="isChangingPassword || !isPasswordFormValid">
                  <ion-spinner v-if="isChangingPassword" name="crescent" />
                  <span v-else>Zapisz hasło</span>
                </button>
              </div>
            </form>
          </transition>

          <button type="button" class="dn-button-secondary rl-full-btn rl-signout" @click="handleSignOut">
            <ion-icon :icon="ioniconsPowerOutline" />
            <span>Wyloguj się</span>
          </button>
        </section>
      </div>

      <!-- EDIT PROFILE SHEET -->
      <ion-modal
        :is-open="isEditProfileModalOpen"
        @didDismiss="closeEditProfileModal"
        class="dn-form-sheet-modal"
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
                  <h3 class="dn-form-sheet-title">Twój profil</h3>
                  <span class="dn-form-sheet-subtitle">Widoczny dla partnera w Gniazdku</span>
                </div>
              </div>
              <button type="button" class="dn-form-sheet-close" @click="closeEditProfileModal" aria-label="Zamknij">
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
          <div class="rl-sheet">
            <label class="rl-label">Imię lub pseudonim</label>
            <div class="rl-field">
              <ion-input aria-label="Imię lub pseudonim" v-model="editProfileForm.name" placeholder="np. Dawid, Kasia..." class="rl-input" :clear-input="true" />
            </div>

            <label class="rl-label">Czuła myśl</label>
            <div class="rl-field">
              <ion-textarea aria-label="Czuła myśl"
                v-model="editProfileForm.love_note"
                placeholder="np. Zawsze przy Tobie!"
                class="rl-input rl-textarea"
                :rows="2"
                :auto-grow="true"
              />
            </div>
            <div class="rl-chips" data-no-swipe>
              <button
                v-for="note in quickLoveNoteSuggestions"
                :key="note"
                type="button"
                class="dn-filter-chip"
                :class="{ active: editProfileForm.love_note === note }"
                @click="editProfileForm.love_note = note"
              >
                {{ note }}
              </button>
            </div>

            <label class="rl-label">Ulubiony napój</label>
            <div class="rl-field">
              <ion-input aria-label="Ulubiony napój" v-model="editProfileForm.favorite_drink" placeholder="np. Matcha latte" class="rl-input" :clear-input="true" />
            </div>
            <div class="rl-chips" data-no-swipe>
              <button
                v-for="drink in quickDrinkSuggestions"
                :key="drink"
                type="button"
                class="dn-filter-chip"
                :class="{ active: editProfileForm.favorite_drink === drink }"
                @click="editProfileForm.favorite_drink = drink"
              >
                {{ drink }}
              </button>
            </div>

            <label class="rl-label">Ulubiona przekąska</label>
            <div class="rl-field">
              <ion-input aria-label="Ulubiona przekąska" v-model="editProfileForm.favorite_treat" placeholder="np. Pistacje" class="rl-input" :clear-input="true" />
            </div>
            <div class="rl-chips" data-no-swipe>
              <button
                v-for="treat in quickTreatSuggestions"
                :key="treat"
                type="button"
                class="dn-filter-chip"
                :class="{ active: editProfileForm.favorite_treat === treat }"
                @click="editProfileForm.favorite_treat = treat"
              >
                {{ treat }}
              </button>
            </div>

            <button
              type="button"
              class="dn-button-primary rl-full-btn rl-sheet-save"
              :disabled="!editProfileForm.name.trim()"
              @click="handleSaveProfile"
            >
              Zapisz profil
            </button>
          </div>
        </ion-content>
      </ion-modal>

      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import confetti from 'canvas-confetti'
import { useDuoState } from '~/composables/useDuoState'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { useMusic } from '~/composables/useMusic'
import { useConfirm } from '~/composables/useConfirm'
import DuoIcon from '~/components/DuoIcon.vue'
import DuoMusicCard from '~/components/DuoMusicCard.vue'

/**
 * ion-toggle with a one-way `:checked` flips itself on tap. If the action fails or is
 * refused (e.g. notification permission denied), Vue does not re-render because the
 * bound value did not change – so we put the toggle back to the real state.
 */
const runToggle = async (event: any, action: () => unknown, actual: () => unknown) => {
  const el = event?.target as HTMLIonToggleElement | null
  try {
    await action()
  } finally {
    await nextTick()
    if (el) el.checked = Boolean(actual())
  }
}

const route = useRoute()

onMounted(async () => {
  startMusicPolling()
  try {
    await initSupabaseSync()
  } catch (_) {}
})

onUnmounted(() => {
  stopMusicPolling()
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
  isNativeApp: isPushNativeApp,
  isSupported: isPushSupported,
  permission: pushPermission,
  isPushEnabled,
  isSubscribing: isPushSubscribing,
  nativeRegistered,
  isTestingPush,
  pushSettings,
  requestPermission: requestPushPermission,
  toggleMasterPush,
  toggleCategory: togglePushCategory,
  sendTestNotification
} = usePushNotifications()

const isMasterPushChecked = computed(() => Boolean(isPushEnabled.value && pushPermission.value === 'granted'))
const isTogglingMasterPush = ref(false)
const handleMasterPushToggle = async (event: any) => {
  if (isTogglingMasterPush.value) return
  const el = event?.target as HTMLIonToggleElement | null
  const targetVal = Boolean(event?.detail?.checked)
  if (targetVal === isMasterPushChecked.value) return
  isTogglingMasterPush.value = true
  try {
    await toggleMasterPush(targetVal)
  } catch (err) {
    console.warn('[Push] Master toggle error:', err)
  } finally {
    await nextTick()
    if (el) el.checked = isMasterPushChecked.value
    isTogglingMasterPush.value = false
  }
}

const {
  connection: musicConnection,
  myPlayback: myMusicPlayback,
  isLoading: musicLoading,
  errorMessage: musicErrorMessage,
  refreshMusicStatus,
  connectMusic,
  connectMusicUsername,
  disconnectMusic,
  setMusicVisibility,
  setMusicService,
  startMusicPolling,
  stopMusicPolling
} = useMusic()

const showManualNickInput = ref(false)
const lastFmUsernameInput = ref('')

const availablePlatforms = [
  { id: 'spotify', name: 'Spotify' },
  { id: 'apple_music', name: 'Apple Music' },
  { id: 'youtube_music', name: 'YouTube Music' },
  { id: 'tidal', name: 'Tidal' },
  { id: 'lastfm', name: 'Last.fm' }
]

const currentPlatformName = computed(() => {
  const current = musicConnection.value?.music_service || 'spotify'
  const match = availablePlatforms.find(p => p.id === current)
  return match?.name || 'Spotify'
})

const handleSelectService = async (serviceId: string) => {
  await setMusicService(serviceId)
}

const handleManualConnect = async () => {
  if (!lastFmUsernameInput.value.trim()) return
  const ok = await connectMusicUsername(lastFmUsernameInput.value.trim())
  if (ok) {
    lastFmUsernameInput.value = ''
    showManualNickInput.value = false
  }
}

const { confirm } = useConfirm()

const currentCategory = ref<'relationship' | 'nest_settings'>(
  route?.query?.category === 'nest_settings' ? 'nest_settings' : 'relationship'
)

const musicSuccessMessage = ref('')

watch(
  () => route?.query?.music,
  async (musicStatus) => {
    if (musicStatus === 'connected') {
      musicSuccessMessage.value = 'Konto muzyczne zostało pomyślnie połączone!'
      await refreshMusicStatus(true)
      setTimeout(() => {
        musicSuccessMessage.value = ''
      }, 5000)
    } else if (musicStatus === 'failed') {
      musicErrorMessage.value = 'Nie udało się połączyć konta. Możesz połączyć konto wpisując swój login Last.fm ręcznie.'
    }
  },
  { immediate: true }
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
  const nestName = nestNameInput.value.trim()
  if (!nestName) {
    triggerToast('Podaj nazwę gniazdka', { type: 'warning' })
    return
  }

  try {
    await updatePartnershipSettings({
      nest_name: nestName,
      anniversary_date: anniversaryInput.value || null
    })
    nestNameInput.value = nestName
    triggerToast('Zapisano ustawienia gniazdka')
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    })
  } catch (_) {
    triggerToast('Nie udało się zapisać ustawień gniazdka', { type: 'warning' })
  }
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

/* =========================================================
   RELACJA – Minimal (rl-*) · beige accent from the welcome screen
   ========================================================= */
.header-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rl-page {
  padding: 8px 0 24px;
}

/* ---------- Couple card (cream) ---------- */
.rl-couple {
  margin: 4px 20px 6px;
  padding: 22px 18px 18px;
  border-radius: 28px;
  background: var(--dn-cream);
}

.rl-couple-people {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.rl-person {
  flex: 0 0 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--dn-ink);
}

.rl-avatar {
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 4px;
  border-radius: 50%;
  border: 3px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 22px;
  font-weight: 600;
}

.rl-avatar--empty {
  background: #ffffff;
  color: var(--dn-cream-ink);
  font-size: 24px;
}

.rl-online-pip {
  position: absolute;
  right: -2px;
  bottom: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2.5px solid var(--dn-cream);
  background: #c3c6cc;
}

.rl-online-pip.is-online {
  background: #2fa36b;
}

.rl-person-name {
  max-width: 100%;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rl-person-meta {
  font-size: 12.5px;
  color: var(--dn-cream-ink);
}

.rl-couple-bridge {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 24px;
}

.rl-bridge-line {
  flex: 1;
  height: 0;
  border-top: 1.5px dashed var(--dn-cream-deep);
  filter: brightness(0.9);
}

.rl-bridge-heart {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dn-danger);
  font-size: 14px;
  flex-shrink: 0;
}

.rl-couple-days {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  margin: 18px 0 16px;
}

.rl-days-num {
  font-family: var(--dn-serif);
  font-size: 40px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--dn-ink);
}

.rl-days-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--dn-cream-ink);
}

.rl-notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rl-note {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: none;
  border-radius: 18px;
  background: #ffffff;
  font-family: inherit;
  text-align: left;
  color: var(--dn-ink);
}

.rl-note--invite {
  padding-right: 40px;
  cursor: pointer;
}

.rl-note-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--dn-ink);
}

.rl-note-text {
  margin: 0;
  font-family: var(--dn-serif);
  font-size: 16px;
  line-height: 1.4;
  color: var(--dn-ink);
}

.rl-note-hint {
  font-size: 13px;
  color: var(--dn-muted);
}

.rl-note-chevron {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: var(--dn-faint);
}

/* ---------- Sections ---------- */
.rl-section {
  margin: 0 20px;
  padding: 24px 0;
  border-bottom: 1px solid var(--dn-line);
}

.rl-section:last-child {
  border-bottom: none;
}

.rl-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.rl-section-title {
  margin: 0;
  font-family: var(--dn-serif);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--dn-ink);
}

.rl-section-meta {
  font-size: 13px;
  color: var(--dn-muted);
}

.rl-desc {
  margin: -6px 0 14px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--dn-muted);
}

.rl-desc strong {
  color: var(--dn-ink);
  font-weight: 600;
}

.rl-label {
  display: block;
  margin: 18px 0 8px;
  padding-left: 2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--dn-muted);
}

.rl-section-head + .rl-label {
  margin-top: 0;
}

.rl-hint {
  margin: 8px 2px 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dn-muted);
}

.rl-hint a,
.rl-steps a {
  color: var(--dn-ink);
}

.rl-error {
  margin: 8px 2px 0;
  font-size: 13px;
  color: var(--dn-danger);
}

.rl-link {
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--dn-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.rl-link--center {
  display: block;
  margin: 14px auto 0;
}

.rl-danger-link {
  display: block;
  margin-top: 18px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--dn-danger);
  cursor: pointer;
}

.rl-status {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--dn-soft);
  font-size: 12px;
  font-weight: 500;
  color: var(--dn-muted);
}

.rl-status.is-on {
  background: var(--dn-cream);
  color: var(--dn-cream-ink);
}

.rl-banner {
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--dn-cream);
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--dn-ink);
}

.rl-banner--error {
  background: #fcefec;
  color: var(--dn-danger);
}

/* ---------- Rows ---------- */
.rl-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.rl-row--card {
  padding: 12px;
  border-radius: 20px;
  background: var(--dn-soft);
}

.rl-row--list {
  padding: 8px 0;
  border-bottom: 1px solid var(--dn-line);
}

.rl-row--list:last-child {
  border-bottom: none;
}

.rl-row-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: #ffffff;
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 19px;
}

.rl-row-icon--cream {
  background: var(--dn-cream);
}

.rl-row-icon--ink {
  background: var(--dn-ink);
  color: #ffffff;
}

.rl-row-icon--plain {
  background: #ffffff;
}

.rl-row-icon--sm {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--dn-soft);
  font-size: 17px;
}

.rl-row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.rl-row-title {
  font-size: 15.5px;
  font-weight: 500;
  color: var(--dn-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rl-row-sub {
  font-size: 13px;
  color: var(--dn-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rl-icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #ffffff;
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
}

.rl-list {
  display: flex;
  flex-direction: column;
}

.rl-toggle-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 60px;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid var(--dn-line);
  background: transparent;
  font-family: inherit;
  color: var(--dn-ink);
}

.rl-toggle-row:last-child {
  border-bottom: none;
}

.rl-toggle-row--main {
  padding: 10px 14px;
  border-radius: 20px;
  background: var(--dn-soft);
  border-bottom: none;
}

.rl-nav-row {
  width: 100%;
  cursor: pointer;
}

.rl-chevron {
  font-size: 18px;
  color: var(--dn-faint);
}

/* ---------- Inputs ---------- */
.rl-field {
  margin-bottom: 4px;
}

.rl-input {
  --background: var(--dn-field);
  --padding-start: 16px;
  --padding-end: 12px;
  --placeholder-color: var(--dn-faint);
  --placeholder-opacity: 1;
  min-height: 52px;
  border: 1px solid var(--dn-field-line);
  border-radius: 14px;
  font-size: 16px;
  color: var(--dn-ink);
  overflow: hidden;
}

.rl-input--date {
  text-align: left;
}

.rl-textarea {
  --padding-top: 14px;
  --padding-bottom: 14px;
}

.rl-native-input {
  flex: 1;
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid var(--dn-field-line);
  border-radius: 14px;
  background: var(--dn-field);
  font-family: inherit;
  font-size: 16px;
  color: var(--dn-ink);
  outline: none;
  box-sizing: border-box;
}

.rl-native-input:focus {
  border-color: var(--dn-ink);
}

.rl-inline-form {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.rl-inline-form .rl-input {
  flex: 1;
}

.rl-inline-btn {
  min-height: 52px;
  padding: 0 20px;
  border: none;
  border-radius: 999px;
  background: var(--dn-ink);
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.rl-inline-btn:disabled {
  opacity: 0.4;
}

.rl-full-btn {
  width: 100%;
  margin-top: 16px;
}

.rl-btn-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.rl-btn-row > * {
  flex: 1;
}

/* ---------- Chips ---------- */
.rl-chips {
  display: flex;
  gap: 8px;
  margin: 0 -20px;
  padding: 0 20px 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.rl-chips::-webkit-scrollbar {
  display: none;
}

.rl-chips--wrap {
  flex-wrap: wrap;
  margin: 10px 0 0;
  padding: 0;
}

.rl-section .rl-field + .rl-chips {
  margin-top: 10px;
}

.rl-mood {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: var(--dn-soft);
  color: var(--dn-ink);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.rl-mood.active {
  background: var(--dn-ink);
  color: #ffffff;
}

.rl-chips + .rl-field {
  margin-top: 12px;
}

.rl-platform-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* ---------- Gestures ---------- */
.rl-gestures {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 14px;
}

.rl-gesture {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  color: var(--dn-ink);
  cursor: pointer;
}

.rl-gesture-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--dn-soft);
  color: var(--dn-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease;
}

.rl-gesture.active .rl-gesture-icon {
  background: var(--dn-cream);
  box-shadow: inset 0 0 0 2px var(--dn-ink);
}

.rl-gesture:active .rl-gesture-icon {
  transform: scale(0.94);
}

.rl-gesture-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dn-ink);
  text-align: center;
}

.rl-history {
  margin-top: 6px;
}

/* ---------- Cheatsheet ---------- */
.rl-cheats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.rl-cheat {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 20px;
  background: var(--dn-cream);
  min-width: 0;
}

.rl-cheat-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--dn-cream-ink);
}

.rl-cheat-row {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  font-weight: 500;
  color: var(--dn-ink);
  overflow-wrap: anywhere;
}

.rl-cheat-who {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--dn-muted);
}

/* ---------- Colour ---------- */
.rl-color-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rl-swatch {
  position: relative;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-family: inherit;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;
  cursor: pointer;
}

.rl-hex {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 14px;
  border: 1px solid var(--dn-field-line);
  border-radius: 14px;
  background: var(--dn-field);
}

.rl-hex-hash {
  color: var(--dn-faint);
  font-size: 16px;
}

.rl-hex-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--dn-ink);
  outline: none;
}

.rl-color-save {
  min-height: 52px;
  padding: 0 18px;
  border: none;
  border-radius: 999px;
  background: var(--dn-ink);
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.rl-swatches {
  display: flex;
  gap: 10px;
  margin: 16px -20px 4px;
  padding: 2px 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.rl-swatches::-webkit-scrollbar {
  display: none;
}

.rl-swatch-dot {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 3px solid #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--dn-line);
  cursor: pointer;
}

.rl-swatch-dot.active {
  box-shadow: 0 0 0 2px var(--dn-ink);
}

.rl-slider {
  margin-top: 16px;
}

.rl-slider-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: var(--dn-muted);
}

/* ---------- Music ---------- */
.rl-platforms {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.rl-platform {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--dn-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rl-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--dn-muted);
}

.rl-steps li + li {
  margin-top: 6px;
}

.rl-music-preview {
  margin: 12px -20px 0;
}

/* ---------- Pair code (cream) ---------- */
.rl-code {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 14px 16px;
  border-radius: 20px;
  background: var(--dn-cream);
}

.rl-code-label {
  font-size: 12.5px;
  color: var(--dn-cream-ink);
}

.rl-code-text {
  flex: 1;
  font-family: var(--dn-serif);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--dn-ink);
}

.rl-code-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: #ffffff;
  color: var(--dn-ink);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
}

/* ---------- Password ---------- */
.rl-pwd-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.rl-pwd-field {
  position: relative;
}

.rl-pwd-field .rl-native-input {
  padding-right: 52px;
}

.rl-eye {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--dn-muted);
  font-size: 18px;
  cursor: pointer;
}

.rl-signout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* ---------- Profile sheet ---------- */
.rl-sheet {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.rl-sheet .rl-label:first-child {
  margin-top: 4px;
}

.rl-sheet .rl-chips {
  margin-top: 10px;
}

.rl-sheet-save {
  margin-top: 24px;
}

/* kept: colour picker internals */
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
.duo-color-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 14px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(28, 27, 25, 0.06);
}
.hue-range {
  background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
}
.duo-color-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #1c1b19;
  box-shadow: none;
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
  border: 2px solid #1c1b19;
  box-shadow: none;
  cursor: pointer;
}
</style>
