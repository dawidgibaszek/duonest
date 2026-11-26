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
                <img
                  v-if="currentUser.avatar_url && !myAvatarImgError"
                  :src="currentUser.avatar_url"
                  alt=""
                  class="rl-avatar-img"
                  @error="myAvatarImgError = true"
                />
                <span v-else>{{ (currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
              </span>
              <span class="rl-person-name">{{ currentUser.name || 'Ty' }}</span>
              <span class="rl-person-meta">Ty</span>
            </div>

            <div class="rl-couple-days">
              <span class="rl-days-heart" aria-hidden="true"><ion-icon :icon="ioniconsHeart" /></span>
              <template v-if="partnership?.anniversary_date">
                <span class="rl-days-num">{{ daysTogether }}</span>
                <span class="rl-days-label">{{ daysTogether === 1 ? 'dzień razem' : 'dni razem' }}</span>
              </template>
            </div>

            <div v-if="partnerUser" class="rl-person">
              <span class="rl-avatar" :style="{ backgroundColor: partnerUserAccentColor }">
                <img
                  v-if="partnerUser.avatar_url && !partnerAvatarImgError"
                  :src="partnerUser.avatar_url"
                  alt=""
                  class="rl-avatar-img"
                  @error="partnerAvatarImgError = true"
                />
                <span v-else>{{ partnerDisplayName.charAt(0).toUpperCase() }}</span>
              </span>
              <span class="rl-person-name">{{ partnerDisplayName }}</span>
              <span class="rl-person-meta">
                <span class="rl-online-pip" :class="{ 'is-online': isPartnerOnline }" aria-hidden="true"></span>
                {{ isPartnerOnline ? 'Online' : 'Offline' }}
              </span>
            </div>
            <button v-else type="button" class="rl-person rl-person--empty" @click="currentCategory = 'nest_settings'">
              <span class="rl-avatar rl-avatar--empty"><ion-icon :icon="ioniconsPersonAddOutline" /></span>
              <span class="rl-person-name">Brak pary</span>
              <span class="rl-person-meta">Połącz teraz</span>
            </button>
          </div>

          <!-- Love notes -->
          <div
            v-if="(currentUser.love_note && currentUser.love_note.trim()) || (partnerUser?.love_note && partnerUser.love_note.trim())"
            class="rl-notes"
          >
            <div v-if="currentUser.love_note && currentUser.love_note.trim()" class="rl-note">
              <span class="rl-note-author">{{ currentUser.name || 'Ty' }}</span>
              <blockquote class="rl-note-text">„{{ currentUser.love_note }}”</blockquote>
            </div>
            <div v-if="partnerUser?.love_note && partnerUser.love_note.trim()" class="rl-note">
              <span class="rl-note-author">{{ partnerDisplayName }}</span>
              <blockquote class="rl-note-text">„{{ partnerUser.love_note }}”</blockquote>
            </div>
          </div>
          <button v-else type="button" class="rl-note rl-note--invite" @click="openEditProfileModal">
            <span class="rl-note-author">Dodaj czułą myśl</span>
            <span class="rl-note-hint">Będzie widoczna w Waszym profilu</span>
            <ion-icon :icon="ioniconsChevronForwardOutline" class="rl-note-chevron" />
          </button>
        </section>

        <DuoLocationCard v-if="partnership" :partner-name="partnerDisplayName" />

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
              <span class="rl-row-title">{{ partnerDisplayName }} · {{ getMoodLabel(partnerUser.current_mood) }}</span>
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
              placeholder="Dodaj krótką notatkę (opcjonalnie)"
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
            <span v-if="isNudgeRateLimited" class="rl-section-meta">Kolejny za {{ formattedNextNudgeTime }}</span>
          </div>

          <div class="rl-gestures" data-no-swipe>
            <button
              v-for="n in nudgePresets"
              :key="n.id"
              type="button"
              class="rl-gesture"
              :class="{ active: selectedNudgeType === n.id }"
              :disabled="isNudgeRateLimited"
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
          <button type="button" class="dn-button-primary rl-full-btn" :disabled="isNudgeRateLimited" @click="handleSendNudge">
            {{ isNudgeRateLimited ? `Limit 5/min · za ${formattedNextNudgeTime}` : 'Wyślij gest' }}
          </button>

          <div v-if="nudgesList.length > 0" class="rl-history">
            <p class="rl-label">Ostatnie</p>
            <div v-for="ndg in nudgesList.slice(0, 4)" :key="ndg.id" class="rl-row rl-row--list">
              <span class="rl-row-icon rl-row-icon--sm"><DuoIcon :name="'nudge-' + ndg.nudge_type" :size="16" /></span>
              <span class="rl-row-body">
                <span class="rl-row-title">{{ ndg.message || getNudgeTitle(ndg.nudge_type) }}</span>
                <span class="rl-row-sub">
                  {{ ndg.sender_id === currentUser?.id ? 'Od Ciebie' : ('Od ' + partnerDopelniaczName) }}<template v-if="formatNudgeDateTime(ndg.created_at)"> · {{ formatNudgeDateTime(ndg.created_at) }}</template>
                </span>
              </span>
            </div>
          </div>
        </section>

      </div>

      <!-- ============================================== -->
      <!-- USTAWIENIA                                      -->
      <!-- ============================================== -->
      <div v-show="currentCategory === 'nest_settings'" class="rl-page">
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Personalizacja</h3>
          </div>
          <button type="button" class="dn-button-secondary rl-full-btn" @click="isFeatureSettingsOpen = true">
            <ion-icon :icon="ioniconsAppsOutline" aria-hidden="true" /> Twoje zakładki
          </button>
        </section>
        <section v-if="partnership" class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Lokalizacja</h3>
            <span class="rl-status" :class="{ 'is-on': isLocationStatusOn }">{{ locationStatusLabel }}</span>
          </div>
          <p class="rl-desc">Udostępnij swoją pozycję {{ partnerCelownik.toLowerCase() }}.</p>
          <p v-if="locationSharingError" class="rl-banner rl-banner--error" role="status">{{ locationSharingError }}</p>

          <div class="rl-row rl-row--card rl-loc-card" :class="{ 'rl-loc-card--cream': isLocationAttentionNeeded }">
            <span class="rl-row-icon" :class="isLocationAttentionNeeded ? 'rl-row-icon--plain' : 'rl-row-icon--cream'">
              <ion-icon :icon="isLocationAttentionNeeded ? ioniconsAlertCircleOutline : ioniconsCheckmarkCircleOutline" aria-hidden="true" />
            </span>
            <span class="rl-loc-copy">
              <span class="rl-loc-title">{{ locationModeInfo.title }}</span>
              <span class="rl-loc-sub">{{ locationModeInfo.sub }}</span>
            </span>
          </div>

          <div class="rl-loc-actions">
            <button v-if="canStopLocationSharing" type="button" class="dn-button-secondary rl-full-btn"
              :disabled="locationSharingStopping || locationSharingStarting" @click="stopLocationFromSettings">
              {{ locationSharingStopping ? 'Zatrzymywanie…' : 'Zatrzymaj udostępnianie lokalizacji' }}
            </button>
            <button v-else type="button" class="dn-button-primary rl-full-btn"
              :disabled="locationSharingStarting" @click="startSharing">
              <ion-icon :icon="ioniconsLocationOutline" aria-hidden="true" />
              {{ locationSharingStarting ? 'Włączanie…' : 'Udostępnij moją pozycję' }}
            </button>

            <button v-if="isLocationNativeApp" type="button" class="dn-button-secondary rl-full-btn"
              @click="openSystemLocationSettings">
              <ion-icon :icon="ioniconsSettingsOutline" aria-hidden="true" />
              {{ locationSettingsButtonLabel }}
            </button>
          </div>
        </section>
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
                <span class="rl-row-sub">Wiadomości i aktywność {{ partnerDopelniacz.toLowerCase() }}</span>
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
                { key: 'mood', icon: ioniconsHappyOutline, title: `Nastroju ${partnerDopelniacz.toLowerCase()}`, desc: 'Zmiana samopoczucia i notatki' },
                { key: 'calendar', icon: ioniconsCalendarOutline, title: 'Terminarzu', desc: 'Nowe plany i przypomnienia' },
                { key: 'shopping', icon: ioniconsCartOutline, title: 'Zakupach', desc: 'Nowe produkty na liście' },
                { key: 'tasks', icon: ioniconsCheckboxOutline, title: 'Zadaniach', desc: 'Ukończone obowiązki i punkty' },
                { key: 'meals', icon: ioniconsRestaurantOutline, title: 'Obiadach', desc: 'Menu i nowe propozycje dań' },
                { key: 'wishlist', icon: ioniconsGiftOutline, title: 'Liście życzeń', desc: 'Nowe marzenia (niespodzianki zostają tajne)' },
                { key: 'savings', icon: ioniconsWalletOutline, title: 'Skarbonkach', desc: 'Wpłaty, wypłaty i nowe cele' },
                { key: 'partnerOnline', icon: ioniconsPersonOutline, title: `Wejściu ${partnerDopelniacz.toLowerCase()}`, desc: `Gdy ${partnerTitle.toLowerCase()} otwiera DuoNest` },
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

        <section v-if="diagnostics.available" class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Diagnostyka</h3>
          </div>
          <div class="rl-list">
            <div class="rl-toggle-row">
              <span class="rl-row-body">
                <span class="rl-row-title">Wysyłaj raporty diagnostyczne</span>
                <span class="rl-row-sub">Pomóż nam poprawiać wydajność DuoNest. Raporty nie zawierają treści z aplikacji ani danych konta.</span>
              </span>
              <ion-toggle
                aria-label="Wysyłaj raporty diagnostyczne"
                :checked="diagnostics.enabled.value"
                :disabled="diagnosticsSaving"
                @ionChange="handleDiagnosticsToggle"
              />
            </div>
          </div>
          <p v-if="diagnosticsError" class="rl-error">{{ diagnosticsError }}</p>
        </section>

        <section v-if="usageAnalytics.available" class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Analityka użycia</h3>
          </div>
          <div class="rl-list">
            <div class="rl-toggle-row">
              <span class="rl-row-body">
                <span class="rl-row-title">Udostępniaj statystyki użycia</span>
                <span class="rl-row-sub">Pomóż nam rozwijać najczęściej używane funkcje. Treści i dane konta nie są przesyłane.</span>
              </span>
              <ion-toggle
                aria-label="Udostępniaj statystyki użycia"
                :checked="usageAnalytics.enabled.value"
                :disabled="usageAnalytics.saving.value"
                @ionChange="handleAnalyticsToggle"
              />
            </div>
          </div>
          <p v-if="analyticsError" class="rl-error" role="alert">{{ analyticsError }}</p>
        </section>

        <!-- PAIR -->
        <section class="rl-section">
          <div class="rl-section-head">
            <h3 class="rl-section-title">Para</h3>
            <span v-if="partnership" class="rl-status is-on">Połączono</span>
          </div>
          <p v-if="partnership && partnerUser" class="rl-desc">Połączone konto · <strong>{{ partnerDisplayName }}</strong></p>
          <p v-else-if="!partnership" class="rl-desc">Udostępnij swój kod lub wpisz kod z drugiego konta.</p>

          <div class="rl-code">
            <span class="rl-code-label">Twój kod</span>
            <span class="rl-code-text">{{ currentUser.pairing_code }}</span>
            <button type="button" class="rl-code-copy" @click="copyPairingCode">
              <ion-icon :icon="ioniconsCopyOutline" />
              <span>{{ copyStatus }}</span>
            </button>
          </div>

          <template v-if="!partnership">
            <label class="rl-label">Kod parowania</label>
            <div class="rl-inline-form">
              <ion-input aria-label="Kod parowania" v-model="inputPartnerCode" placeholder="np. 8K4P2QZ" class="rl-input" :maxlength="15" />
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
        :expand-to-scroll="false"
        :breakpoints="[0, 0.92, 1]"
        :initial-breakpoint="0.92"
        :handle="true"
        data-no-swipe="true"
      >
        <div class="rl-profile-modal-layout">
        <ion-header class="dn-form-sheet-header ion-no-border">
          <div class="dn-form-sheet-handle-spacer" aria-hidden="true"></div>
          <ion-toolbar>
            <div class="dn-form-sheet-heading">
              <div class="dn-form-sheet-title-row">
                <div class="dn-form-sheet-title-text">
                  <h3 class="dn-form-sheet-title">Twój profil</h3>
                  <span class="dn-form-sheet-subtitle">Widoczny we wspólnym Gniazdku</span>
                </div>
              </div>
              <button type="button" class="dn-form-sheet-close" @click="closeEditProfileModal" aria-label="Zamknij">
                <ion-icon :icon="ioniconsCloseOutline" />
              </button>
            </div>
          </ion-toolbar>
        </ion-header>

        <div class="ion-content-scroll-host rl-profile-scroll">
          <div class="rl-sheet">
            <!-- AVATAR -->
            <section class="rl-section rl-section--sheet-first">
              <div class="rl-section-head">
                <h3 class="rl-section-title">Zdjęcie profilowe</h3>
                <span class="rl-section-meta">JPG / JPEG · maks. {{ AVATAR_MAX_FILE_MB }} MB</span>
              </div>
              <div class="rl-avatar-editor">
                <span class="rl-avatar-preview" :style="{ backgroundColor: selectedCustomColor }">
                  <img
                    v-if="currentUser.avatar_url && !myAvatarImgError"
                    :src="currentUser.avatar_url"
                    alt=""
                    class="rl-avatar-img"
                    @error="myAvatarImgError = true"
                  />
                  <span v-else>{{ (editProfileForm.name || currentUser.name || 'T').charAt(0).toUpperCase() }}</span>
                </span>
                <div class="rl-avatar-actions">
                  <input
                    ref="avatarFileInputRef"
                    type="file"
                    accept=".jpg,.jpeg,image/jpeg"
                    class="rl-avatar-file-input"
                    @change="handleAvatarFileChange"
                  />
                  <div class="rl-avatar-btns">
                    <button
                      type="button"
                      class="dn-button-secondary rl-avatar-btn"
                      :disabled="isUploadingAvatar || isRemovingAvatar"
                      @click="triggerAvatarPicker"
                    >
                      <ion-spinner v-if="isUploadingAvatar" name="crescent" />
                      <template v-else>
                        <ion-icon :icon="ioniconsCameraOutline" aria-hidden="true" />
                        <span>{{ currentUser.avatar_url ? 'Zmień zdjęcie' : 'Dodaj zdjęcie' }}</span>
                      </template>
                    </button>
                    <button
                      v-if="currentUser.avatar_url"
                      type="button"
                      class="dn-button-secondary rl-avatar-btn rl-avatar-btn--danger"
                      :disabled="isUploadingAvatar || isRemovingAvatar"
                      @click="handleRemoveAvatar"
                    >
                      <ion-spinner v-if="isRemovingAvatar" name="crescent" />
                      <template v-else>
                        <ion-icon :icon="ioniconsTrashOutline" aria-hidden="true" />
                        <span>Usuń</span>
                      </template>
                    </button>
                  </div>
                  <p class="rl-avatar-hint">Widoczne we wspólnym Gniazdku i na mapie.</p>
                </div>
              </div>
              <p v-if="avatarError" class="rl-error" role="alert">{{ avatarError }}</p>
            </section>

            <label class="rl-label">Imię lub pseudonim</label>
            <div class="rl-field">
              <ion-input aria-label="Imię lub pseudonim" v-model="editProfileForm.name" placeholder="np. Dawid, Kasia..." class="rl-input" :clear-input="true" />
            </div>

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

            <details class="rl-language">
              <summary class="rl-language-summary">
                <span class="rl-language-tile"><ion-icon :icon="ioniconsPersonOutline" aria-hidden="true" /></span>
                <span class="rl-language-labels">
                  <strong>Płeć i forma językowa</strong>
                  <span>{{ selectedGenderOption?.label || 'Płeć niepodana' }} · {{ selectedProfileGrammarLabel }}</span>
                </span>
                <ion-icon :icon="ioniconsChevronDownOutline" class="rl-language-chevron" aria-hidden="true" />
              </summary>
              <div class="rl-language-body" data-no-swipe>
                <fieldset class="rl-language-group">
                  <legend>Płeć <span>(opcjonalnie)</span></legend>
                  <div class="rl-gender-grid">
                    <button
                      v-for="option in GENDER_OPTIONS"
                      :key="option.value"
                      type="button"
                      class="rl-language-option rl-gender-btn"
                      :aria-pressed="editProfileForm.gender === option.value"
                      @click="editProfileForm.gender = editProfileForm.gender === option.value ? '' : option.value"
                    >
                      <ion-icon :icon="option.icon" class="rl-gender-icon" aria-hidden="true" />
                      <span>{{ option.label }}</span>
                    </button>
                  </div>
                </fieldset>

                <fieldset class="rl-language-group">
                  <legend>Forma językowa</legend>
                  <div class="rl-grammar-grid">
                    <button
                      type="button"
                      class="rl-language-option rl-grammar-btn"
                      :aria-pressed="!editProfileForm.grammatical_gender"
                      @click="editProfileForm.grammatical_gender = ''"
                    >
                      <span class="rl-language-labels">
                        <strong>Automatyczna</strong>
                        <span>Dopasowana do wybranej płci</span>
                      </span>
                      <ion-icon v-if="!editProfileForm.grammatical_gender" :icon="ioniconsCheckmarkCircle" aria-hidden="true" />
                    </button>
                    <button
                      v-for="option in GRAMMAR_OPTIONS"
                      :key="option.value"
                      type="button"
                      class="rl-language-option rl-grammar-btn"
                      :aria-pressed="editProfileForm.grammatical_gender === option.value"
                      @click="editProfileForm.grammatical_gender = option.value"
                    >
                      <span class="rl-language-labels">
                        <strong>{{ option.label }}</strong>
                        <span>{{ option.example }}</span>
                      </span>
                      <ion-icon v-if="editProfileForm.grammatical_gender === option.value" :icon="ioniconsCheckmarkCircle" aria-hidden="true" />
                    </button>
                  </div>
                </fieldset>
              </div>
            </details>

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
                <ion-icon :icon="ioniconsHeartOutline" aria-hidden="true" />
                {{ note }}
              </button>
            </div>

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
                <p class="rl-desc">Przez Last.fm możesz udostępniać na żywo to, czego słuchasz w innych aplikacjach.</p>
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
                      <span class="rl-row-title">Pokazuj {{ partnerCelownik.toLowerCase() }}</span>
                      <span class="rl-row-sub">Twoja muzyka we wspólnym Gniazdku</span>
                    </span>
                    <ion-toggle :aria-label="'Udostępniaj muzykę ' + partnerCelownik.toLowerCase()"
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

            <p v-if="profileSaveError" class="rl-profile-error" role="alert">{{ profileSaveError }}</p>
            <button
              type="button"
              class="dn-button-primary rl-full-btn rl-sheet-save"
              :disabled="isSavingProfile || !editProfileForm.name.trim()"
              :aria-busy="isSavingProfile"
              @click="handleSaveProfile"
            >
              {{ isSavingProfile ? 'Zapisywanie…' : 'Zapisz profil' }}
            </button>
          </div>
        </div>
        </div>
      </ion-modal>

      <DuoFeatureSettings :is-open="isFeatureSettingsOpen" @close="isFeatureSettingsOpen = false" />
      <div class="tab-bottom-spacer" style="height: 105px;" aria-hidden="true"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDuoState } from '~/composables/useDuoState'
import { useDuoDiagnostics } from '~/composables/useDuoDiagnostics'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { useDuoLocation } from '~/composables/useDuoLocation'
import { useMusic } from '~/composables/useMusic'
import { useConfirm } from '~/composables/useConfirm'
import { normalizeGenderIdentity } from '~/functions/src/duoGrammar'
import { translateAppError } from '~/utils/errorTranslator'
import { AVATAR_MAX_FILE_MB } from '~/utils/avatarStorage'
import { DUO_GESTURE_PRESETS, formatNudgeDateTime, getDuoGestureMeta } from '~/utils/duoGestures'
import DuoIcon from '~/components/DuoIcon.vue'
import DuoMusicCard from '~/components/DuoMusicCard.vue'

/**
 * ion-toggle with a one-way `:checked` flips itself on tap. If the action fails or is
 * refused (e.g. notification permission denied), Vue does not re-render because the
 * bound value did not change – so we put the toggle back to the real state.
 */
const diagnostics = useDuoDiagnostics()
const usageAnalytics = useDuoAnalytics()
const analyticsError = ref('')

async function handleAnalyticsToggle(event: CustomEvent<{ checked: boolean }>) {
  analyticsError.value = ''
  try {
    await usageAnalytics.setEnabled(event.detail.checked)
  } catch {
    analyticsError.value = 'Nie udało się zapisać ustawienia.'
    if (event.target instanceof HTMLElement) {
      (event.target as HTMLIonToggleElement).checked = usageAnalytics.enabled.value
    }
  }
}
const diagnosticsSaving = ref(false)
const diagnosticsError = ref('')

async function handleDiagnosticsToggle(event: CustomEvent<{ checked: boolean }>) {
  diagnosticsSaving.value = true
  diagnosticsError.value = ''
  try {
    await diagnostics.setEnabled(event.detail.checked)
  } catch {
    diagnosticsError.value = 'Nie udało się zapisać ustawienia. Spróbuj ponownie.'
    if (event.target instanceof HTMLElement) {
      (event.target as HTMLIonToggleElement).checked = diagnostics.enabled.value
    }
  } finally {
    diagnosticsSaving.value = false
  }
}

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
  isNudgeRateLimited,
  formattedNextNudgeTime,
  updateMyProfile,
  uploadMyAvatar,
  removeMyAvatar,
  updatePartnershipSettings,
  pairWithCode,
  disconnectPartnership,
  signOutUser,
  changeUserPassword,
  triggerToast,
  initSupabaseSync,
  partnerTitle,
  partnerDopelniacz,
  partnerCelownik,
  partnerBiernik,
  partnerNarzednik,
  partnerDopelniaczName,
  partnerDisplayName,
  GENDER_OPTIONS,
  GRAMMAR_OPTIONS
} = useDuoState()

const locationSharingStopping = ref(false)
const {
  sharing: isLocationSharing, ownShared: hasSharedPosition, updatingSharing: locationSharingStarting,
  sharingError: locationSharingError, isLocationNativeApp,
  isLocationStatusOn, isLocationAttentionNeeded, locationStatusLabel, locationModeInfo, locationSettingsButtonLabel,
  refreshLocationStatus, openLocationSettings, startSharing, stopSharing
} = useDuoLocation()
const canStopLocationSharing = computed(() => isLocationSharing.value || hasSharedPosition.value
  || locationSharingError.value.startsWith('Telefon przestał'))

async function openSystemLocationSettings() {
  try {
    await openLocationSettings()
  } catch (err) {
    triggerToast(translateAppError(err), { type: 'warning' })
  }
}

async function stopLocationFromSettings() {
  locationSharingStopping.value = true
  try {
    await stopSharing()
    triggerToast('Udostępnianie lokalizacji zatrzymane.', { type: 'success' })
  } catch {
    triggerToast(locationSharingError.value, { type: 'warning' })
  } finally {
    locationSharingStopping.value = false
  }
}

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
      openEditProfileModal()
      await refreshMusicStatus(true)
      setTimeout(() => {
        musicSuccessMessage.value = ''
      }, 5000)
    } else if (musicStatus === 'failed') {
      musicErrorMessage.value = 'Nie udało się połączyć konta. Możesz połączyć konto wpisując swój login Last.fm ręcznie.'
      openEditProfileModal()
    }
  },
  { immediate: true }
)

watch(() => route?.query?.category, (newCat) => {
  if (newCat === 'nest_settings' || newCat === 'relationship') {
    currentCategory.value = newCat
  }
})

watch(currentCategory, (newCat) => {
  if (newCat === 'nest_settings') void refreshLocationStatus()
}, { immediate: true })

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
    const saved = await updatePartnershipSettings({
      nest_name: nestName,
      anniversary_date: anniversaryInput.value || null
    })
    if (!saved) return
    nestNameInput.value = nestName
    triggerToast('Zapisano ustawienia gniazdka')
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
    if (!(await updateMyProfile({ avatar_color: colorToSave }))) return
    triggerToast('Zapisano kolor')
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

// Personal Profile Modal & Avatar
const isEditProfileModalOpen = ref(false)
const isFeatureSettingsOpen = ref(false)
const isSavingProfile = ref(false)
const profileSaveError = ref('')
const avatarFileInputRef = ref<HTMLInputElement | null>(null)
const isUploadingAvatar = ref(false)
const isRemovingAvatar = ref(false)
const avatarError = ref('')
const myAvatarImgError = ref(false)
const partnerAvatarImgError = ref(false)

watch(() => currentUser.value?.avatar_url, () => {
  myAvatarImgError.value = false
})
watch(() => partnerUser.value?.avatar_url, () => {
  partnerAvatarImgError.value = false
})

const triggerAvatarPicker = () => {
  avatarError.value = ''
  avatarFileInputRef.value?.click()
}

const handleAvatarFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (input) input.value = ''
  if (!file || isUploadingAvatar.value || isRemovingAvatar.value) return

  avatarError.value = ''
  isUploadingAvatar.value = true
  try {
    await uploadMyAvatar(file)
    myAvatarImgError.value = false
    triggerToast('Zaktualizowano zdjęcie profilowe')
  } catch (error) {
    avatarError.value = translateAppError(error)
  } finally {
    isUploadingAvatar.value = false
  }
}

const handleRemoveAvatar = async () => {
  if (!currentUser.value?.avatar_url || isUploadingAvatar.value || isRemovingAvatar.value) return

  avatarError.value = ''
  isRemovingAvatar.value = true
  try {
    await removeMyAvatar()
    myAvatarImgError.value = false
    triggerToast('Usunięto zdjęcie profilowe')
  } catch (error) {
    avatarError.value = translateAppError(error)
  } finally {
    isRemovingAvatar.value = false
  }
}

const editProfileForm = ref({
  name: '',
  gender: '',
  grammatical_gender: '',
  love_note: ''
})
const selectedGenderOption = computed(() => GENDER_OPTIONS.find(option => option.value === editProfileForm.value.gender))
const selectedProfileGrammarLabel = computed(() =>
  GRAMMAR_OPTIONS.find(option => option.value === editProfileForm.value.grammatical_gender)?.label || 'Forma automatyczna'
)

const quickLoveNoteSuggestions = [
  'Zawsze przy Tobie',
  'Mój ulubiony człowiek!',
  'Dziękuję, że jesteś',
  'Tęsknię za Tobą!',
  'Najlepsze chwile to te z Tobą'
]

const openEditProfileModal = () => {
  profileSaveError.value = ''
  avatarError.value = ''
  syncPickerFromHex(currentUserAccentColor.value)
  editProfileForm.value = {
    name: currentUser.value?.name || '',
    gender: normalizeGenderIdentity(currentUser.value?.gender) || '',
    grammatical_gender: currentUser.value?.grammatical_gender || '',
    love_note: currentUser.value?.love_note || ''
  }
  isEditProfileModalOpen.value = true
}

const closeEditProfileModal = () => {
  avatarError.value = ''
  syncPickerFromHex(currentUserAccentColor.value)
  isEditProfileModalOpen.value = false
}

const handleSaveProfile = async () => {
  const name = editProfileForm.value.name.trim()
  if (isSavingProfile.value || !name) return
  isSavingProfile.value = true
  profileSaveError.value = ''
  try {
    const { gender, grammatical_gender, ...fields } = editProfileForm.value
    const desired = {
      ...fields,
      name,
      avatar_color: selectedCustomColor.value,
      gender: gender || null,
      grammatical_gender: grammatical_gender || null
    }
    const existing = currentUser.value
    const updates = Object.fromEntries(
      Object.entries(desired).filter(([key, value]) => {
        const previous = key === 'gender' ? normalizeGenderIdentity(existing.gender) : existing[key as keyof typeof desired]
        return (previous ?? (value === null ? null : '')) !== value
      })
    )
    if (Object.keys(updates).length > 0 && !await updateMyProfile(updates)) {
      profileSaveError.value = 'Sesja się zmieniła. Otwórz profil ponownie.'
      return
    }
    isEditProfileModalOpen.value = false
  } catch (error) {
    profileSaveError.value = translateAppError(error)
  } finally {
    isSavingProfile.value = false
  }
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

const nudgePresets = DUO_GESTURE_PRESETS

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

const getNudgeTitle = (type: string) => getDuoGestureMeta(type).title

const handleSaveMood = async () => {
  await updateMood(selectedMood.value, moodNote.value)
}

const handleSendNudge = async () => {
  const preset = nudgePresets.find(p => p.id === selectedNudgeType.value)
  const messageToSend = customNudgeMessage.value.trim() || preset?.defaultMsg || 'Puknięcie miłości!'

  const success = await sendNudge(selectedNudgeType.value, messageToSend)
  if (success) {
    customNudgeMessage.value = ''
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
    copyStatus.value = 'Skopiuj kod'
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
  }
}

const handleDisconnect = async () => {
  const confirmed = await confirm({
    title: 'Rozłącz konto pary',
    message: `Czy na pewno chcesz rozłączyć połączenie z ${partnerNarzednik.value}? Wspólne dane przestaną być synchronizowane.`,
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
  padding: 20px 16px 16px;
  border-radius: 28px;
  background: var(--dn-cream);
}

.rl-couple-people {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr) minmax(0, 1fr);
  align-items: start;
  gap: 8px;
}

.rl-person {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  text-align: center;
  color: var(--dn-ink);
}

.rl-person--empty {
  border-radius: 14px;
  cursor: pointer;
}

.rl-avatar {
  position: relative;
  width: min(64px, 100%);
  aspect-ratio: 1;
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

.rl-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.rl-avatar > .rl-avatar-img {
  position: absolute;
  inset: 0;
}

.rl-avatar--empty {
  background: #ffffff;
  color: var(--dn-cream-ink);
  font-size: 24px;
}

.rl-online-pip {
  flex: 0 0 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dn-faint);
}

.rl-online-pip.is-online {
  background: #2fa36b;
}

.rl-person-name {
  max-width: 100%;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.rl-person-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  font-size: 0.8125rem;
  color: var(--dn-cream-ink);
}

.rl-days-heart {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--dn-cream-deep);
  display: grid;
  place-items: center;
  color: var(--dn-cream-ink);
  font-size: 12px;
}

.rl-couple-days {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
  overflow-wrap: anywhere;
}

.rl-days-num {
  max-width: 100%;
  font-family: var(--dn-serif);
  font-size: clamp(2rem, 10vw, 2.75rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--dn-ink);
}

.rl-days-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--dn-cream-ink);
}

.rl-notes,
.rl-note--invite {
  margin-top: 16px;
  border-radius: 18px;
  background: var(--dn-bg);
}

.rl-notes {
  padding-inline: 14px;
}

.rl-note {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-block: 11px;
  overflow-wrap: anywhere;
}

.rl-note + .rl-note {
  border-top: 1px solid var(--dn-line);
}

.rl-note--invite {
  position: relative;
  width: 100%;
  padding-inline: 14px 40px;
  border: none;
  font-family: inherit;
  text-align: left;
  color: var(--dn-ink);
  cursor: pointer;
}

.rl-person--empty:focus-visible,
.rl-note--invite:focus-visible {
  outline: 2px solid var(--dn-ink);
  outline-offset: 3px;
}

.rl-note-author {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--dn-cream-ink);
}

.rl-note-text {
  margin: 0;
  font-family: var(--dn-serif);
  font-size: 1.0625rem;
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

.rl-gesture:disabled {
  opacity: 0.45;
  cursor: not-allowed;
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
.rl-profile-modal-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
}

.rl-profile-modal-layout > ion-header {
  flex: none;
}

.rl-profile-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  padding: 16px 20px 0;
}

.rl-profile-scroll > .rl-sheet {
  flex: none;
}

.rl-sheet {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.rl-sheet .rl-section {
  margin: 18px 0 0;
  padding: 20px 0;
}

.rl-sheet .rl-section--sheet-first {
  margin-top: 0;
  padding-top: 4px;
}

.rl-avatar-editor {
  display: flex;
  align-items: center;
  gap: 14px;
}

.rl-avatar-preview {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 2px solid var(--dn-line);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 24px;
  font-weight: 600;
  overflow: hidden;
}

.rl-avatar-actions {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rl-avatar-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.rl-avatar-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rl-avatar-btn {
  min-height: 40px;
  padding: 0 14px;
  font-size: 13.5px;
}

.rl-avatar-btn--danger {
  color: var(--dn-danger);
}

.rl-avatar-hint {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--dn-muted);
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

.rl-language {
  margin: 14px 0 20px;
  border: 1px solid var(--dn-line);
  border-radius: 16px;
}

.rl-language-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 12px;
  cursor: pointer;
  list-style: none;
}

.rl-language-summary::-webkit-details-marker {
  display: none;
}

.rl-language-tile {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  background: var(--dn-cream);
  color: var(--dn-ink);
  border-radius: 11px;
  font-size: 18px;
}

.rl-language-labels {
  display: grid;
  gap: 3px;
  flex: 1;
  min-width: 0;
  color: var(--dn-ink);
  font-size: 13px;
}

.rl-language-labels > span,
.rl-language-group legend span {
  color: var(--dn-muted);
  font-size: 12px;
  font-weight: 400;
}

.rl-language-chevron {
  flex-shrink: 0;
  color: var(--dn-muted);
}

.rl-language[open] .rl-language-chevron {
  transform: rotate(180deg);
}

.rl-language-body {
  display: grid;
  gap: 16px;
  padding: 12px;
  border-top: 1px solid var(--dn-line);
}

.rl-language-group {
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.rl-language-group legend {
  margin-bottom: 8px;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
}

.rl-gender-grid,
.rl-grammar-grid {
  display: grid;
  gap: 6px;
}

.rl-gender-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 142px), 1fr));
}

.rl-gender-btn:last-child {
  grid-column: 1 / -1;
}

.rl-language-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--dn-line);
  border-radius: 12px;
  background: var(--dn-field);
  color: var(--dn-ink);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}

.rl-language-option[aria-pressed="true"] {
  border-color: var(--dn-ink);
  background: var(--dn-cream);
}

.rl-language-option ion-icon {
  flex-shrink: 0;
  font-size: 17px;
}

.rl-profile-error {
  margin: 12px 0;
  color: var(--dn-danger);
  font-size: 13px;
}

.rl-loc-card {
  align-items: flex-start;
  margin-top: 2px;
}

.rl-loc-card--cream {
  background: var(--dn-cream);
}

.rl-loc-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rl-loc-title {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--dn-ink);
  line-height: 1.3;
}

.rl-loc-sub {
  font-size: 13px;
  line-height: 1.45;
  color: var(--dn-muted);
}

.rl-loc-card--cream .rl-loc-sub {
  color: var(--dn-cream-ink);
}

.rl-loc-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.rl-loc-actions .rl-full-btn {
  margin-top: 0;
}
</style>
