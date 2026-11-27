# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Minimalna wersja na iOS

W projekcie Firebase DuoNest otwórz [Remote Config](https://console.firebase.google.com/project/duonest-38dc2/config) i opublikuj parametry typu **String** z domyślną wartością dla wszystkich klientów.

| Parametr | Wartość |
| --- | --- |
| `ios_minimum_version` | Najstarsza obsługiwana wersja, np. `1.0`. Pusta wartość wyłącza blokadę. |
| `ios_minimum_build` | Opcjonalny numer najstarszego buildu dla tej wersji, np. `5`. Buildy nowszych wersji przechodzą bez tego porównania. |
| `ios_update_url` | Opcjonalny link HTTPS do App Store, TestFlight lub `https://duonestapp.pl`. Bez linku przycisk prowadzi do TestFlight w App Store. |

Przykładowo wersja `1.0` i build `5` blokują instalację `1.0 (4)` oraz starsze wersje. Podnieś próg dopiero, gdy wskazany build będzie dostępny dla wszystkich objętych nim użytkowników. Zmiana progu działa przy uruchomieniu lub po powrocie aplikacji na ekran, przy ponownym pobraniu konfiguracji.

### Wdrożenie zmian dostępu do Firebase

1. Przygotuj konto `duonest-api` skryptem `scripts/provision-firebase-api-identity.ps1 -Apply`. Funkcja `api` korzysta domyślnie z tego konta. Konto wdrażające potrzebuje na nim uprawnienia `iam.serviceAccounts.actAs`. Jeśli panel pobiera dane z GA4, przyznaj nowemu kontu odczyt w odpowiedniej usłudze GA4 przed przełączeniem.
2. Sprawdź nowy backend, reguły i podpisane buildy iOS oraz Androida w środowisku testowym. Klient musi korzystać z `partner_profiles`, nowego API awatarów i serwerowego usuwania zadań. Wdrożenie bardziej restrykcyjnych reguł wymaga udostępnienia tej wersji.
3. Funkcje i reguły RTDB można wdrożyć wcześniej. W okresie przejściowym dodaj regułę odczytu `partner_profiles` do aktywnych reguł Firestore, żeby obsłużyć nowego klienta. Pełne reguły Firestore i Storage wdróż po udostępnieniu podpisanych klientów. Zachowaj ustawienia środowiskowe używane przez istniejącą funkcję, w tym konfigurację dostawców zewnętrznych. Jeżeli wdrażasz indeksy osobno, zachowaj aktywne indeksy i polityki TTL.
4. Uruchom `npx tsx scripts/migrate-firebase-access.ts`, aby sprawdzić zakres migracji. Po przełączeniu klientów i reguł powtórz z `--apply`, aby uzupełnić profile par, naprawić zaległe wpisy RTDB i unieważnić stare linki do awatarów. Zweryfikuj wynik kolejnym uruchomieniem bez flagi. Unieważnienie linku nie usuwa kopii zdjęcia, które wcześniej pobrano.

### Włączenie App Check

1. W [Firebase App Check](https://console.firebase.google.com/project/duonest-38dc2/appcheck) sprawdź konfigurację App Attest dla iOS, Play Integrity dla Androida i reCAPTCHA Enterprise dla weba. Porównaj odciski SHA-256 Androida z podpisem dystrybuowanego buildu oraz ustawienia Play Integrity z kanałem dystrybucji. `duonestapp.pl` ma domyślny publiczny klucz witryny. Dla innego środowiska podaj jego klucz w `NUXT_PUBLIC_APP_CHECK_RECAPTCHA_SITE_KEY` podczas builda.
2. Włącz `DUO_APP_CHECK_MONITOR=true` w funkcji `api`. Sprawdź metryki Firebase i logi `[app-check]` dla podpisanych klientów. Zweryfikuj logowanie, dostęp pary do danych, wysyłanie lokalizacji w tle i odczyt widżetów.
3. Po potwierdzeniu poprawnych żądań włącz `DUO_APP_CHECK_ENFORCE=true` dla funkcji `api`, a następnie egzekwowanie w Firestore i Realtime Database. Panel administratora ma osobną sesję. Subskrypcje iCal, odczyty widżetów i wysyłka lokalizacji w tle używają poświadczeń ograniczonych do danej funkcji.

App Check potwierdza tożsamość aplikacji. Wersję i numer buildu klient podaje w nagłówkach, więc ich porównanie służy zgodności klientów. Reguły Firebase nadal decydują, do których danych użytkownik ma dostęp.

Ochrona bazy przed usunięciem działa niezależnie od odzyskiwania do punktu w czasie. Przed włączeniem PITR ustal koszty i okres przechowywania historii dokumentów, w tym wygasłych odczytów lokalizacji.

## Diagnostyka iOS

W zamkniętej becie raportowanie MetricKit jest domyślnie włączone. Tester może je wyłączyć w DuoNest w **Relacja → Ustawienia → Diagnostyka**. Wyłączenie usuwa niewysłane raporty z urządzenia. Włączone raportowanie odkłada ograniczoną liczbę raportów na urządzeniu i przesyła je przy połączeniu po zalogowaniu.

Raporty są dostępne w [Firestore → ios_diagnostics](https://console.firebase.google.com/project/duonest-38dc2/firestore/databases/-default-/data/~2Fios_diagnostics). Dokument zawiera dzień, wersję, numer buildu i wybrane metryki lub liczniki diagnostyczne. Zapis nie zawiera identyfikatora konta lub urządzenia, treści aplikacji ani stosu wywołań. Dostęp do danych mają osoby z odpowiednimi uprawnieniami w projekcie Firebase. Polityka TTL w Firestore wygasza dokumenty po 30 dniach.

Apple dostarcza raporty wydajności zasadniczo raz dziennie. Do sprawdzenia rzeczywistych raportów potrzebny jest build zainstalowany na iPhonie. Raporty awarii w Xcode Organizer pozostają osobnym źródłem.

## Panel administratora

[Panel DuoNest](https://duonestapp.pl/admin) obsługuje logowanie hasłem, Google i Apple. Wymaga zweryfikowanego adresu e-mail oraz claimu `duoAdmin: true` na tym samym koncie Firebase. Panel pokazuje zbiorcze statystyki aplikacji i do 100 najnowszych raportów MetricKit. Pozwala publikować domyślne progi aktualizacji iOS w Remote Config. Konto wykonawcze funkcji `api` musi mieć uprawnienia do odczytu i zapisu Remote Config oraz tworzenia sesji Firebase Auth.

Aby wybrać administratora, odczytaj UID wskazanego konta z **Firebase Authentication → Users**. Z konta serwisowego z uprawnieniami Firebase Auth uruchom polecenie, wpisując prawdziwe UID. Do odebrania dostępu użyj `revoke` zamiast `grant`.

```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json node scripts/manage-admin.mjs grant FIREBASE_UID
```

Panel używa osobnej, piętnastominutowej sesji, której serwer sprawdza przy każdym żądaniu. Odebranie claimu odcina kolejne żądania panelu. Zmiany progu iOS zapisują się w prywatnej kolekcji `admin_audit`.

Publiczna domena w przeglądarce udostępnia stronę pobrania, panel administratora i linki akcji Firebase Auth. Lokalny `npm run dev` nadal udostępnia aplikację do podglądu w przeglądarce.
