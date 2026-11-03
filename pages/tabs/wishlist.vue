<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <div class="dn-page-header">
          <div class="dn-header-title">
            <span>Wishlista & Prezenty</span>
            <span class="count-chip">{{ uncompletedCount }}</span>
          </div>
          <p class="dn-header-subtitle">Wspólne marzenia, inspiracje i pomysły na prezenty</p>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Native Pull-To-Refresh -->
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
        <ion-refresher-content pulling-text="Przeciągnij, aby odświeżyć..." refreshing-spinner="crescent" />
      </ion-refresher>

      <!-- LINK SCRAPER & QUICK ADD CARD -->
      <div class="dn-card add-wish-card">
        <div class="scraper-header">
          <div class="scraper-icon-wrap">
            <ion-icon :icon="ioniconsLinkOutline" />
          </div>
          <div class="scraper-text">
            <span class="scraper-title">Automatyczne pobieranie z linku</span>
            <span class="scraper-desc">Wklej link z Allegro, Amazon, Zalando, eBay, IKEA, Ceneo itp.</span>
          </div>
        </div>

        <form @submit.prevent="handleScrapeUrl" class="scraper-form">
          <div class="scraper-input-row">
            <ion-input
              v-model="urlInput"
              type="url"
              placeholder="https://..."
              class="scraper-ion-input"
              :clear-input="true"
              :disabled="isScraping"
              @keydown.enter.prevent="handleScrapeUrl"
            />
            <button
              type="submit"
              class="dn-button-primary scrape-action-btn"
              :disabled="!urlInput.trim() || isScraping"
            >
              <ion-spinner v-if="isScraping" name="crescent" class="btn-spinner" />
              <ion-icon v-else :icon="ioniconsFlashOutline" />
              <span>{{ isScraping ? 'Pobieram...' : 'Pobierz' }}</span>
            </button>
          </div>
        </form>

        <!-- Scraping status notice (error or info) -->
        <div v-if="scrapeError" class="scraper-error-banner">
          <ion-icon :icon="ioniconsAlertCircleOutline" />
          <span>{{ scrapeError }}</span>
        </div>

        <!-- Manual Add Button (Backup) -->
        <div class="manual-add-row">
          <button type="button" class="manual-add-btn" @click="openManualAddModal">
            <ion-icon :icon="ioniconsAddCircleOutline" />
            <span>Wpisz dane ręcznie (bez linku)</span>
          </button>
        </div>
      </div>

      <!-- FILTER TABS -->
      <div class="filter-scroll" data-no-swipe="true">
        <button
          v-for="filter in filters"
          :key="filter.id"
          type="button"
          class="filter-pill"
          :class="{ active: activeFilter === filter.id }"
          @click="activeFilter = filter.id"
        >
          <ion-icon :icon="filter.icon" />
          <span>{{ filter.label }}</span>
          <span class="filter-badge" v-if="getFilterCount(filter.id) > 0">
            {{ getFilterCount(filter.id) }}
          </span>
        </button>
      </div>

      <!-- WISHLIST ITEMS LIST -->
      <div class="wishlist-section-header" v-if="filteredItems.length > 0">
        <span>{{ getSectionTitle() }} ({{ filteredItems.length }})</span>
      </div>

      <!-- EMPTY STATE -->
      <div v-if="filteredItems.length === 0" class="wishlist-empty-state dn-card">
        <div class="empty-icon-wrap">
          <ion-icon :icon="ioniconsGiftOutline" />
        </div>
        <h3 class="empty-title">{{ getEmptyTitle() }}</h3>
        <p class="empty-desc">{{ getEmptyDescription() }}</p>
        <button type="button" class="dn-button-primary empty-action-btn" @click="openManualAddModal">
          <ion-icon :icon="ioniconsAddOutline" />
          <span>Dodaj pierwsze marzenie</span>
        </button>
      </div>

      <!-- LIST OF CARDS -->
      <div class="wishlist-grid" v-else>
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="wishlist-card dn-card"
          :class="{ 'is-completed': item.is_completed, 'is-surprise': !item.is_visible_to_partner }"
        >
          <!-- CARD HEADER: TARGET BADGE, SURPRISE BADGE, STORE NAME -->
          <div class="card-meta-row">
            <div class="badges-group">
              <!-- Target badge -->
              <span
                class="meta-badge target-badge"
                :style="getTargetBadgeStyle(item)"
              >
                <ion-icon :icon="getTargetIcon(item)" />
                <span>{{ getTargetLabel(item) }}</span>
              </span>

              <!-- Secret surprise badge -->
              <span v-if="!item.is_visible_to_partner" class="meta-badge surprise-badge">
                <ion-icon :icon="ioniconsEyeOffOutline" />
                <span>Niespodzianka</span>
              </span>

              <!-- Completed badge -->
              <span v-if="item.is_completed" class="meta-badge completed-badge">
                <ion-icon :icon="ioniconsCheckmarkCircleOutline" />
                <span>Spełnione!</span>
              </span>
            </div>

            <!-- Shop / Store badge -->
            <span v-if="item.site_name" class="meta-badge store-badge">
              <ion-icon :icon="ioniconsStorefrontOutline" />
              <span>{{ item.site_name }}</span>
            </span>
          </div>

          <!-- CARD BODY -->
          <div class="card-main-content">
            <!-- Thumbnail Image -->
            <div class="card-thumb-wrap" v-if="item.image_url">
              <img
                :src="item.image_url"
                :alt="item.title"
                class="card-thumb-img"
                loading="lazy"
                @error="onImageError($event)"
              />
            </div>
            <div class="card-thumb-wrap placeholder" v-else>
              <ion-icon :icon="ioniconsGiftOutline" />
            </div>

            <!-- Info (Title, Price, Note) -->
            <div class="card-info-col">
              <h4 class="card-item-title" :class="{ 'strike-title': item.is_completed }">
                {{ item.title }}
              </h4>

              <div class="card-price-row" v-if="item.price">
                <span class="price-val">{{ item.price }}</span>
                <span class="currency-val">{{ item.currency || 'PLN' }}</span>
              </div>

              <p class="card-note-text" v-if="item.note">
                <ion-icon :icon="ioniconsChatboxEllipsesOutline" />
                <span>{{ item.note }}</span>
              </p>

              <!-- Secret surprise note reminder -->
              <p v-if="!item.is_visible_to_partner" class="surprise-explainer-note">
                🔒 Partner nie widzi tej propozycji — idealna na prezent!
              </p>
            </div>
          </div>

          <!-- CARD FOOTER ACTIONS -->
          <div class="card-actions-bar">
            <!-- Open external store URL button -->
            <button
              v-if="item.url"
              type="button"
              class="card-btn link-btn"
              @click="openExternalUrl(item.url)"
            >
              <ion-icon :icon="ioniconsOpenOutline" />
              <span>Sklep</span>
            </button>

            <!-- Toggle Completed button -->
            <button
              type="button"
              class="card-btn complete-btn"
              :class="{ 'is-completed': item.is_completed }"
              @click="handleToggleCompleted(item.id)"
            >
              <ion-icon :icon="item.is_completed ? ioniconsCheckmarkCircle : ioniconsCheckmarkCircleOutline" />
              <span>{{ item.is_completed ? 'Kupione' : 'Kupione?' }}</span>
            </button>

            <!-- Edit button -->
            <button
              type="button"
              class="card-btn edit-btn"
              @click="openEditModal(item)"
              aria-label="Edytuj"
            >
              <ion-icon :icon="ioniconsPencilOutline" />
            </button>

            <!-- Delete button -->
            <button
              type="button"
              class="card-btn delete-btn"
              @click="handleDeleteItem(item.id)"
              aria-label="Usuń"
            >
              <ion-icon :icon="ioniconsTrashOutline" />
            </button>
          </div>
        </div>
      </div>

      <!-- ADD / EDIT MODAL (BOTTOM SHEET) -->
      <ion-modal
        :is-open="isModalOpen"
        @didDismiss="closeModal"
        class="dn-wishlist-modal"
        :breakpoints="[0, 0.92, 1]"
        :initial-breakpoint="0.92"
        :handle="true"
      >
        <ion-header class="modal-custom-header">
          <ion-toolbar>
            <div class="modal-header-inner">
              <div class="modal-title-wrap">
                <ion-icon :icon="ioniconsGiftOutline" class="modal-title-icon" />
                <ion-title>{{ editingItemId ? 'Edytuj marzenie' : 'Dodaj do wishlisty' }}</ion-title>
              </div>
              <ion-buttons slot="end">
                <button
                  type="button"
                  class="modal-close-icon-btn"
                  @click="closeModal"
                  aria-label="Zamknij"
                >
                  <ion-icon :icon="ioniconsCloseOutline" />
                </button>
              </ion-buttons>
            </div>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding wishlist-modal-content">
          <div class="modal-form-body">
            <!-- PREVIEW CARD INSIDE MODAL IF SCRAPED -->
            <div v-if="formData.image_url || formData.site_name" class="modal-scraped-preview">
              <div class="preview-thumb-box" v-if="formData.image_url">
                <img :src="formData.image_url" alt="Podgląd" @error="onPreviewImageError" />
              </div>
              <div class="preview-info-box">
                <span class="preview-store-pill" v-if="formData.site_name">
                  <ion-icon :icon="ioniconsStorefrontOutline" /> {{ formData.site_name }}
                </span>
                <span class="preview-price-tag" v-if="formData.price">
                  {{ formData.price }} {{ formData.currency || 'PLN' }}
                </span>
              </div>
            </div>

            <!-- 1. DLA KOGO JEST TO MARZENIE? -->
            <div class="form-group">
              <label class="form-label">Dla kogo jest to marzenie? *</label>
              <div class="target-choice-grid">
                <!-- Dla mnie -->
                <button
                  type="button"
                  class="target-choice-btn"
                  :class="{ active: formTarget === 'me' }"
                  @click="setFormTarget('me')"
                >
                  <ion-icon :icon="ioniconsPersonOutline" class="target-btn-icon" />
                  <div class="target-btn-texts">
                    <span class="target-btn-title">Dla mnie</span>
                    <span class="target-btn-sub">Moja osobista wishlista</span>
                  </div>
                </button>

                <!-- Dla Partnera -->
                <button
                  type="button"
                  class="target-choice-btn"
                  :class="{ active: formTarget === 'partner' }"
                  @click="setFormTarget('partner')"
                >
                  <ion-icon :icon="ioniconsGiftOutline" class="target-btn-icon" />
                  <div class="target-btn-texts">
                    <span class="target-btn-title">Dla Partnera</span>
                    <span class="target-btn-sub">Pomysł na prezent</span>
                  </div>
                </button>

                <!-- Wspólne -->
                <button
                  type="button"
                  class="target-choice-btn"
                  :class="{ active: formTarget === 'together' }"
                  @click="setFormTarget('together')"
                >
                  <ion-icon :icon="ioniconsPeopleOutline" class="target-btn-icon" />
                  <div class="target-btn-texts">
                    <span class="target-btn-title">Wspólne</span>
                    <span class="target-btn-sub">Do naszego gniazdka</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- 2. WIDOCZNOŚĆ PREZENTU DLA PARTNERA (TYLKO JEŚLI DLA PARTNERA) -->
            <div class="form-group visibility-box-group" v-if="formTarget === 'partner'">
              <label class="form-label">Widoczność propozycji prezentu</label>
              <div class="visibility-toggle-grid">
                <button
                  type="button"
                  class="vis-choice-btn"
                  :class="{ active: formData.is_visible_to_partner }"
                  @click="formData.is_visible_to_partner = true"
                >
                  <ion-icon :icon="ioniconsEyeOutline" class="vis-icon" />
                  <div class="vis-texts">
                    <span class="vis-title">Widoczne dla partnera</span>
                    <span class="vis-sub">Partner zobaczy to w liście marzeń</span>
                  </div>
                </button>

                <button
                  type="button"
                  class="vis-choice-btn surprise"
                  :class="{ active: !formData.is_visible_to_partner }"
                  @click="formData.is_visible_to_partner = false"
                >
                  <ion-icon :icon="ioniconsEyeOffOutline" class="vis-icon" />
                  <div class="vis-texts">
                    <span class="vis-title">Prezent niespodzianka</span>
                    <span class="vis-sub">Ukryte przed partnerem (tylko Ty to widzisz!)</span>
                  </div>
                </button>
              </div>

              <p class="visibility-hint" v-if="!formData.is_visible_to_partner">
                🎁 <strong>Idealne na urodziny, święta i rocznice!</strong> Partner nie dostanie powiadomienia i nie zobaczy tego przedmiotu w swojej aplikacji.
              </p>
            </div>

            <!-- 3. NAZWA PRZEDMIOTU (TITLE) -->
            <div class="form-group">
              <label class="form-label">Nazwa przedmiotu *</label>
              <ion-input
                v-model="formData.title"
                placeholder="np. Słuchawki bezprzewodowe, Ulubione perfumy..."
                class="modal-styled-input"
              />
            </div>

            <!-- 4. CENA I WALUTA -->
            <div class="form-group">
              <label class="form-label">Cena i waluta (opcjonalnie)</label>
              <div class="price-input-row">
                <ion-input
                  v-model="formData.price"
                  type="text"
                  placeholder="np. 149.99"
                  class="modal-styled-input price-input-field"
                />
                <select v-model="formData.currency" class="modal-styled-select">
                  <option value="PLN">PLN zł</option>
                  <option value="EUR">EUR €</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </select>
              </div>
            </div>

            <!-- 5. SKLEP / MARKA -->
            <div class="form-group">
              <label class="form-label">Sklep lub marka (opcjonalnie)</label>
              <ion-input
                v-model="formData.site_name"
                placeholder="np. Allegro, Amazon, Zalando, IKEA..."
                class="modal-styled-input"
              />
            </div>

            <!-- 6. LINK DO PRZEDMIOTU -->
            <div class="form-group">
              <label class="form-label">Link do przedmiotu (opcjonalnie)</label>
              <ion-input
                v-model="formData.url"
                type="url"
                placeholder="https://..."
                class="modal-styled-input"
              />
            </div>

            <!-- 7. LINK DO ZDJĘCIA -->
            <div class="form-group">
              <label class="form-label">Link do zdjęcia przedmiotu (opcjonalnie)</label>
              <ion-input
                v-model="formData.image_url"
                type="url"
                placeholder="https://... (adres obrazka)"
                class="modal-styled-input"
              />
            </div>

            <!-- 8. NOTATKA / ROZMIAR / WSKAZÓWKI -->
            <div class="form-group">
              <label class="form-label">Notatka (rozmiar, kolor, wersja itp.)</label>
              <ion-textarea
                v-model="formData.note"
                placeholder="np. Rozmiar M, kolor czarny, wersja 128GB..."
                :rows="2"
                class="modal-styled-input modal-textarea-styled"
              />
            </div>

            <!-- MODAL ACTIONS -->
            <div class="modal-actions-footer">
              <button
                v-if="editingItemId"
                type="button"
                class="delete-item-btn"
                @click="handleDeleteItem(editingItemId)"
              >
                <ion-icon :icon="ioniconsTrashOutline" />
                <span>Usuń</span>
              </button>

              <button
                type="button"
                class="dn-button-primary save-item-btn"
                :disabled="!formData.title.trim()"
                @click="handleSaveFormData"
              >
                <ion-icon :icon="ioniconsCheckmarkOutline" />
                <span>{{ editingItemId ? 'Zapisz zmiany' : 'Dodaj do wishlisty' }}</span>
              </button>
            </div>

            <!-- Extra bottom spacing for smooth mobile scrolling and keyboard -->
            <div style="height: 36px;"></div>
          </div>
        </ion-content>
      </ion-modal>

      <div style="height: 40px;"></div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDuoState, type WishlistItem } from '~/composables/useDuoState'
import { formatSiteName, extractTitleFromUrl } from '~/utils/wishlistParser'

const {
  wishlistItems,
  currentUser,
  partnerUser,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  toggleWishlistCompleted,
  refreshWishlist,
  getUserAccentColor,
  hexToRgba,
  triggerToast
} = useDuoState()

// Scraper state
const urlInput = ref('')
const isScraping = ref(false)
const scrapeError = ref<string | null>(null)

// Filters
const activeFilter = ref<'all' | 'me' | 'partner' | 'surprise' | 'together' | 'completed'>('all')

const filters = [
  { id: 'all', label: 'Wszystkie', icon: ioniconsSparklesOutline },
  { id: 'me', label: 'Moje', icon: ioniconsPersonOutline },
  { id: 'partner', label: 'Dla Partnera', icon: ioniconsGiftOutline },
  { id: 'surprise', label: 'Niespodzianki', icon: ioniconsEyeOffOutline },
  { id: 'together', label: 'Wspólne', icon: ioniconsPeopleOutline },
  { id: 'completed', label: 'Kupione', icon: ioniconsCheckmarkDoneOutline }
] as const

// Form & Modal state
const isModalOpen = ref(false)
const editingItemId = ref<string | null>(null)
const formTarget = ref<'me' | 'partner' | 'together'>('me')

const resolveDefaultTarget = (): 'me' | 'partner' | 'together' => {
  if (activeFilter.value === 'partner') return 'partner'
  if (activeFilter.value === 'together') return 'together'
  return 'me'
}

onMounted(async () => {
  await refreshWishlist()
})

const formData = ref({
  title: '',
  price: '',
  currency: 'PLN',
  site_name: '',
  url: '',
  image_url: '',
  note: '',
  is_visible_to_partner: true
})

// Counts
const uncompletedCount = computed(() => {
  return wishlistItems.value.filter(i => !i.is_completed).length
})

// Filtered items logic
const filteredItems = computed(() => {
  const currentUserId = currentUser.value?.id
  const partnerId = partnerUser.value?.id

  return wishlistItems.value.filter(item => {
    switch (activeFilter.value) {
      case 'me':
        return !item.is_completed && item.for_user_id === currentUserId
      case 'partner':
        return !item.is_completed && ((partnerId && item.for_user_id === partnerId) || (!item.for_user_id && item.created_by !== currentUserId))
      case 'surprise':
        return !item.is_completed && !item.is_visible_to_partner && item.created_by === currentUserId
      case 'together':
        return !item.is_completed && item.for_user_id === null
      case 'completed':
        return item.is_completed
      case 'all':
      default:
        return !item.is_completed
    }
  })
})

const getFilterCount = (filterId: string): number => {
  const currentUserId = currentUser.value?.id
  const partnerId = partnerUser.value?.id

  switch (filterId) {
    case 'me':
      return wishlistItems.value.filter(i => !i.is_completed && i.for_user_id === currentUserId).length
    case 'partner':
      return wishlistItems.value.filter(i => !i.is_completed && ((partnerId && i.for_user_id === partnerId) || (!i.for_user_id && i.created_by !== currentUserId))).length
    case 'surprise':
      return wishlistItems.value.filter(i => !i.is_completed && !i.is_visible_to_partner && i.created_by === currentUserId).length
    case 'together':
      return wishlistItems.value.filter(i => !i.is_completed && i.for_user_id === null).length
    case 'completed':
      return wishlistItems.value.filter(i => i.is_completed).length
    case 'all':
    default:
      return wishlistItems.value.filter(i => !i.is_completed).length
  }
}

const getSectionTitle = (): string => {
  switch (activeFilter.value) {
    case 'me': return 'MOJE MARZENIA'
    case 'partner': return 'DLA PARTNERA'
    case 'surprise': return 'NIESPODZIANKI (UKRYTE PRZED PARTNEREM)'
    case 'together': return 'WSPÓLNE DO DOMU'
    case 'completed': return 'SPEŁNIONE MARZENIA'
    case 'all':
    default:
      return 'DO ZREALIZOWANIA'
  }
}

const getEmptyTitle = (): string => {
  switch (activeFilter.value) {
    case 'me': return 'Brak Twoich osobistych marzeń'
    case 'partner': return 'Brak propozycji prezentów dla partnera'
    case 'surprise': return 'Brak prezentów niespodzianek'
    case 'together': return 'Brak wspólnych marzeń do domu'
    case 'completed': return 'Jeszcze żadne marzenie nie zostało kupione'
    case 'all':
    default:
      return 'Twoja Wishlista jest pusta'
  }
}

const getEmptyDescription = (): string => {
  switch (activeFilter.value) {
    case 'surprise':
      return 'Możesz dodać pomysł na prezent dla partnera i ukryć go, by nie widział go w aplikacji!'
    case 'completed':
      return 'Kiedy kupisz marzenie ze swojej listy, zaznacz je jako spełnione!'
    default:
      return 'Wklej powyżej link z dowolnego sklepu internetowego lub wpisz przedmiot ręcznie.'
  }
}

// Scrape URL Action
const handleScrapeUrl = async () => {
  let url = urlInput.value.trim()
  if (!url) return
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }

  isScraping.value = true
  scrapeError.value = null

  let resData: any = null
  let resNotice = ''

  // 1. Try server endpoints (Nitro endpoint or Netlify Function)
  const endpoints = ['/api/wishlist/preview', '/.netlify/functions/wishlist-preview']
  for (const ep of endpoints) {
    try {
      const response = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const contentType = response.headers.get('content-type') || ''
      if (response.ok && contentType.includes('application/json')) {
        const json = await response.json()
        if (json.success && json.data) {
          resData = json.data
          resNotice = json.notice || ''
          break
        } else if (json.fallback) {
          resData = json.fallback
          break
        }
      }
    } catch (_) {
      // Continue to next endpoint or fallback
    }
  }

  // 2. Resilient Client-Side Parser Fallback
  // If server endpoints failed, timed out, or got blocked by bot protections on cloud IPs
  if (!resData || !resData.title) {
    try {
      const parsedUrl = new URL(url)
      const siteName = formatSiteName(parsedUrl.hostname)
      const slugTitle = extractTitleFromUrl(parsedUrl)
      if (slugTitle) {
        resData = {
          title: slugTitle,
          price: resData?.price || '',
          currency: resData?.currency || 'PLN',
          site_name: resData?.site_name || siteName,
          url: url,
          image_url: resData?.image_url || ''
        }
        resNotice = `Rozpoznano przedmiot z ${siteName || 'linku'}! Uzupełnij cenę i sprawdź szczegóły ✨`
      }
    } catch (_) {}
  }

  // 3. Pre-fill form & open modal
  if (resData && (resData.title || resData.site_name)) {
    formData.value = {
      title: resData.title || '',
      price: resData.price || '',
      currency: resData.currency || 'PLN',
      site_name: resData.site_name || '',
      url: resData.url || url,
      image_url: resData.image_url || '',
      note: '',
      is_visible_to_partner: true
    }
    editingItemId.value = null
    formTarget.value = resolveDefaultTarget()
    isModalOpen.value = true
    urlInput.value = ''
    triggerToast(resNotice || 'Pobrano dane ze sklepu! Sprawdź i dostosuj szczegóły ✨')
  } else {
    // Pure manual fallback
    let fallbackSite = ''
    try {
      fallbackSite = formatSiteName(new URL(url).hostname)
    } catch (_) {}

    formData.value = {
      title: '',
      price: '',
      currency: 'PLN',
      site_name: fallbackSite,
      url: url,
      image_url: '',
      note: '',
      is_visible_to_partner: true
    }
    editingItemId.value = null
    formTarget.value = resolveDefaultTarget()
    isModalOpen.value = true
    urlInput.value = ''
    scrapeError.value = 'Wpisz szczegóły przedmiotu ręcznie.'
    triggerToast('Wpisz szczegóły marzenia ręcznie ✨')
  }

  isScraping.value = false
}

// Open manual add modal (backup when no link)
const openManualAddModal = () => {
  editingItemId.value = null
  formTarget.value = resolveDefaultTarget()
  formData.value = {
    title: '',
    price: '',
    currency: 'PLN',
    site_name: '',
    url: '',
    image_url: '',
    note: '',
    is_visible_to_partner: true
  }
  scrapeError.value = null
  isModalOpen.value = true
}

// Open edit modal for existing item
const openEditModal = (item: WishlistItem) => {
  editingItemId.value = item.id
  const currentUserId = currentUser.value?.id
  const partnerId = partnerUser.value?.id

  if (item.for_user_id === currentUserId) {
    formTarget.value = 'me'
  } else if (item.for_user_id === partnerId || (!item.for_user_id && item.created_by !== currentUserId)) {
    formTarget.value = 'partner'
  } else {
    formTarget.value = 'together'
  }

  formData.value = {
    title: item.title,
    price: item.price || '',
    currency: item.currency || 'PLN',
    site_name: item.site_name || '',
    url: item.url || '',
    image_url: item.image_url || '',
    note: item.note || '',
    is_visible_to_partner: item.is_visible_to_partner !== false
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  editingItemId.value = null
}

const setFormTarget = (target: 'me' | 'partner' | 'together') => {
  formTarget.value = target
  if (target !== 'partner') {
    formData.value.is_visible_to_partner = true
  }
}

// Save form data (Add or Update)
const handleSaveFormData = async () => {
  if (!formData.value.title.trim()) return

  const currentUserId = currentUser.value?.id || 'user_1'
  const partnerId = partnerUser.value?.id || null

  let forUserId: string | null = null
  if (formTarget.value === 'me') {
    forUserId = currentUserId
  } else if (formTarget.value === 'partner') {
    forUserId = partnerId
  } else {
    forUserId = null
  }

  const isVisible = formTarget.value === 'partner' ? formData.value.is_visible_to_partner : true

  if (editingItemId.value) {
    // Update existing item
    await updateWishlistItem(editingItemId.value, {
      title: formData.value.title.trim(),
      price: formData.value.price ? formData.value.price.trim() : null,
      currency: formData.value.currency || 'PLN',
      site_name: formData.value.site_name ? formData.value.site_name.trim() : null,
      url: formData.value.url ? formData.value.url.trim() : null,
      image_url: formData.value.image_url ? formData.value.image_url.trim() : null,
      note: formData.value.note ? formData.value.note.trim() : null,
      for_user_id: forUserId,
      is_visible_to_partner: isVisible
    })
  } else {
    // Add new item
    await addWishlistItem({
      title: formData.value.title.trim(),
      price: formData.value.price ? formData.value.price.trim() : null,
      currency: formData.value.currency || 'PLN',
      site_name: formData.value.site_name ? formData.value.site_name.trim() : null,
      url: formData.value.url ? formData.value.url.trim() : null,
      image_url: formData.value.image_url ? formData.value.image_url.trim() : null,
      note: formData.value.note ? formData.value.note.trim() : null,
      for_user_id: forUserId,
      is_visible_to_partner: isVisible
    })
  }

  closeModal()
}

// Toggle completed / bought
const handleToggleCompleted = async (id: string) => {
  await toggleWishlistCompleted(id)
}

// Delete item
const handleDeleteItem = async (id: string) => {
  await deleteWishlistItem(id)
  if (isModalOpen.value && editingItemId.value === id) {
    closeModal()
  }
}

// Open external URL in browser
const openExternalUrl = (url: string) => {
  if (!url) return
  let finalUrl = url.trim()
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl
  }
  if (typeof window !== 'undefined') {
    window.open(finalUrl, '_blank', 'noopener,noreferrer')
  }
}

// Image fallback handler
const onImageError = (e: Event) => {
  const target = e.target as HTMLElement
  if (target) {
    target.style.display = 'none'
  }
}

const onPreviewImageError = (e: Event) => {
  const target = e.target as HTMLElement
  if (target) {
    target.style.display = 'none'
  }
}

// Pull to refresh handler
const handleRefresh = async (event: any) => {
  try {
    await refreshWishlist()
  } finally {
    event?.target?.complete()
  }
}

// Target badge helpers
const getTargetLabel = (item: WishlistItem): string => {
  const currentUserId = currentUser.value?.id
  const partnerId = partnerUser.value?.id
  if (item.for_user_id === currentUserId) return 'Dla mnie'
  if (partnerId && item.for_user_id === partnerId) return `Dla ${partnerUser.value?.name || 'Partnera'}`
  if (!item.for_user_id && item.created_by !== currentUserId) return `Dla ${partnerUser.value?.name || 'Partnera'}`
  return 'Wspólne'
}

const getTargetIcon = (item: WishlistItem) => {
  const currentUserId = currentUser.value?.id
  if (item.for_user_id === currentUserId) return ioniconsPersonOutline
  if (item.for_user_id === null) return ioniconsPeopleOutline
  return ioniconsGiftOutline
}

const getTargetBadgeStyle = (item: WishlistItem) => {
  const currentUserId = currentUser.value?.id
  if (item.for_user_id === currentUserId) {
    const col = getUserAccentColor(currentUserId)
    return {
      backgroundColor: hexToRgba(col, 0.12),
      color: col,
      border: `1px solid ${hexToRgba(col, 0.28)}`
    }
  }
  if (item.for_user_id === null) {
    return {
      backgroundColor: 'rgba(99, 102, 241, 0.12)',
      color: '#4f46e5',
      border: '1px solid rgba(99, 102, 241, 0.28)'
    }
  }
  const partnerCol = getUserAccentColor(partnerUser.value?.id || null)
  return {
    backgroundColor: hexToRgba(partnerCol, 0.12),
    color: partnerCol,
    border: `1px solid ${hexToRgba(partnerCol, 0.28)}`
  }
}
</script>

<style scoped>
/* PAGE HEADER */
.dn-page-header {
  padding: 12px 16px 8px;
}

.dn-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.count-chip {
  font-size: 11px;
  font-weight: 700;
  background: #f43f5e;
  color: #ffffff;
  padding: 2px 7px;
  border-radius: 999px;
}

.dn-header-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 2px 0 0;
  font-weight: 500;
}

/* ADD WISH / SCRAPER CARD */
.add-wish-card {
  margin: 12px 16px;
  padding: 14px 16px;
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

.scraper-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.scraper-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #e0f2fe;
  color: #0284c7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.scraper-text {
  display: flex;
  flex-direction: column;
}

.scraper-title {
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
}

.scraper-desc {
  font-size: 11.5px;
  color: #64748b;
}

.scraper-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.scraper-ion-input {
  flex: 1;
  background: #f8fafc;
  --background: #f8fafc;
  --padding-start: 12px;
  --padding-end: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 13.5px;
  color: #0f172a;
  min-height: 42px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.scraper-ion-input:focus-within {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
}

.scrape-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 16px;
  height: 42px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
  background: #0284c7;
  color: #ffffff;
  border: none;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(2, 132, 199, 0.25);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.scrape-action-btn:active {
  transform: scale(0.96);
}

.scrape-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
}

.scraper-error-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #fff1f2;
  border: 1px solid #ffe4e6;
  border-radius: 10px;
  color: #e11d48;
  font-size: 12px;
  font-weight: 600;
}

.manual-add-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #f1f5f9;
  display: flex;
  justify-content: flex-end;
}

.manual-add-btn {
  background: none;
  border: none;
  color: #0284c7;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.manual-add-btn:hover {
  background: #f0f9ff;
}

/* FILTER CHIPS */
.filter-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 16px 10px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.filter-pill.active {
  background: #0284c7;
  color: #ffffff;
  border-color: #0284c7;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
}

.filter-badge {
  background: rgba(0, 0, 0, 0.08);
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.filter-pill.active .filter-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

/* SECTION HEADER */
.wishlist-section-header {
  padding: 6px 18px 4px;
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

/* EMPTY STATE */
.wishlist-empty-state {
  margin: 20px 16px;
  padding: 36px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #ffffff;
  border-radius: 20px;
  border: 1px dashed #cbd5e1;
}

.empty-icon-wrap {
  width: 58px;
  height: 58px;
  border-radius: 20px;
  background: #fdf2f8;
  color: #f43f5e;
  font-size: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
}

.empty-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 16px;
  max-width: 290px;
  line-height: 1.4;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 700;
  background: #0284c7;
  color: #ffffff;
  border: none;
  cursor: pointer;
}

/* WISHLIST GRID & CARDS */
.wishlist-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px;
}

.wishlist-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 14px 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.03);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;
  position: relative;
}

.wishlist-card.is-completed {
  opacity: 0.65;
  background: #f8fafc;
  border-color: #e2e8f0;
}

.wishlist-card.is-surprise {
  border-left: 4px solid #f43f5e;
  background: linear-gradient(to right, #fff1f2 0%, #ffffff 15%);
}

/* CARD META ROW */
.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 6px;
}

.badges-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.surprise-badge {
  background: #ffe4e6;
  color: #e11d48;
  border: 1px solid #fecdd3;
}

.completed-badge {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.store-badge {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

/* CARD MAIN CONTENT */
.card-main-content {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.card-thumb-wrap {
  width: 76px;
  height: 76px;
  border-radius: 12px;
  background: #f1f5f9;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
}

.card-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-thumb-wrap.placeholder {
  color: #cbd5e1;
  font-size: 32px;
}

.card-info-col {
  flex: 1;
  min-width: 0;
}

.card-item-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
  line-height: 1.3;
  word-break: break-word;
}

.strike-title {
  text-decoration: line-through;
  color: #94a3b8;
}

.card-price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}

.price-val {
  font-size: 16px;
  font-weight: 800;
  color: #0284c7;
}

.currency-val {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.card-note-text {
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 8px;
  margin: 4px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  word-break: break-word;
}

.surprise-explainer-note {
  font-size: 11px;
  color: #e11d48;
  margin: 6px 0 0;
  font-weight: 600;
}

/* CARD ACTIONS BAR */
.card-actions-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}

.card-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.card-btn:active {
  transform: scale(0.95);
}

.link-btn {
  color: #0284c7;
  background: #f0f9ff;
  border-color: #bae6fd;
}

.complete-btn {
  color: #166534;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.complete-btn.is-completed {
  background: #dcfce7;
  color: #15803d;
}

.edit-btn, .delete-btn {
  padding: 6px 8px;
  font-size: 14px;
}

.edit-btn:hover {
  background: #f8fafc;
  color: #0284c7;
}

.delete-btn {
  color: #dc2626;
}

.delete-btn:hover {
  background: #fef2f2;
}

/* WISHLIST SHEET MODAL */
ion-modal.dn-wishlist-modal {
  --border-radius: 28px 28px 0 0;
  --background: #ffffff;
  --box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
}

.dn-wishlist-modal .modal-custom-header ion-toolbar {
  --background: #ffffff;
  --border-width: 0;
  padding: 6px 10px;
}

.dn-wishlist-modal .modal-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 4px;
}

.dn-wishlist-modal .modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dn-wishlist-modal .modal-title-icon {
  font-size: 20px;
  color: #0284c7;
}

.dn-wishlist-modal .modal-title-wrap ion-title {
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

.modal-close-icon-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.modal-close-icon-btn:active {
  transform: scale(0.92);
}

.wishlist-modal-content {
  --background: #ffffff;
  --padding-top: 8px;
  --padding-bottom: 24px;
  --padding-start: 18px;
  --padding-end: 18px;
}

.modal-form-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-scraped-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 14px;
}

.preview-thumb-box {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e0f2fe;
}

.preview-thumb-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-info-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-store-pill {
  font-size: 11px;
  font-weight: 700;
  color: #0369a1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.preview-price-tag {
  font-size: 13.5px;
  font-weight: 800;
  color: #0284c7;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}

/* TARGET CHOICE GRID */
.target-choice-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.target-choice-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
  color: #000;
}

.target-btn-icon {
  font-size: 20px;
  margin-bottom: 4px;
  color: #64748b;
}

.target-btn-title {
  font-size: 12px;
  font-weight: 700;
  display: block;
}

.target-choice-btn.active {
  background: #e0f2fe;
  border-color: #0284c7;
  color: #0369a1;
}

.target-choice-btn.active .target-btn-icon {
  color: #0284c7;
}

.target-btn-sub {
  font-size: 9.5px;
  color: #94a3b8;
  display: block;
  margin-top: 2px;
}

/* VISIBILITY CHOICE TOGGLE */
.visibility-box-group {
  background: #fff1f2;
  border: 1px solid #ffe4e6;
  border-radius: 14px;
  padding: 12px;
}

.visibility-toggle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}

.vis-choice-btn {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.vis-choice-btn.active {
  border-color: #0284c7;
  background: #f0f9ff;
}

.vis-choice-btn.surprise.active {
  border-color: #f43f5e;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(244, 63, 94, 0.18);
}

.vis-icon {
  font-size: 18px;
  color: #64748b;
  flex-shrink: 0;
  margin-top: 2px;
}

.vis-choice-btn.surprise.active .vis-icon {
  color: #f43f5e;
}

.vis-texts {
  display: flex;
  flex-direction: column;
}

.vis-title {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
}

.vis-sub {
  font-size: 10px;
  color: #64748b;
  margin-top: 2px;
  line-height: 1.2;
}

.visibility-hint {
  font-size: 11px;
  color: #be123c;
  margin: 8px 0 0;
  line-height: 1.3;
}

/* INPUT STYLES */
.modal-styled-input {
  background: #f8fafc;
  --background: #f8fafc;
  --padding-start: 12px;
  --padding-end: 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 13.5px;
  color: #0f172a;
}

.modal-styled-input:focus-within {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
}

.modal-textarea-styled {
  --padding-top: 10px;
  border-radius: 12px;
}

.price-input-row {
  display: flex;
  gap: 8px;
}

.price-input-field {
  flex: 1;
}

.modal-styled-select {
  width: 90px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  padding: 0 8px;
  outline: none;
}

.modal-styled-select:focus {
  border-color: #0284c7;
}

/* MODAL ACTIONS */
.modal-actions-footer {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.delete-item-btn {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  font-size: 13px;
  font-weight: 700;
  padding: 10px 14px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.save-item-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  background: #0284c7;
  color: #ffffff;
  border: none;
  cursor: pointer;
}

.save-item-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
