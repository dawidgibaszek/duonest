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
| `ios_update_url` | Opcjonalny link HTTPS z App Store lub TestFlight. Bez linku przycisk prowadzi do TestFlight w App Store. |

Przykładowo wersja `1.0` i build `5` blokują instalację `1.0 (4)` oraz starsze wersje. Podnieś próg dopiero, gdy wskazany build będzie dostępny dla wszystkich objętych nim użytkowników. Zmiana progu działa przy uruchomieniu lub po powrocie aplikacji na ekran, przy ponownym pobraniu konfiguracji.

### Włączenie App Check

1. W [Firebase App Check](https://console.firebase.google.com/project/duonest-38dc2/appcheck) zarejestruj aplikację iOS z dostawcą App Attest i Apple Team ID.
2. Udostępnij build iOS z App Check. Sprawdź poprawne żądania w metrykach Firebase.
3. Konto wykonawcze funkcji `api` potrzebuje odczytu Remote Config (`roles/cloudconfig.viewer`). Ustaw `DUO_APP_CHECK_ENFORCE=true` w środowisku Cloud Functions i wdróż funkcję. API aplikacji wymaga wtedy prawidłowego tokenu iOS. API zwraca HTTP 426, gdy deklarowana wersja jest niższa niż domyślne wartości opublikowane w Remote Config. Panel administratora używa osobnej sesji, a subskrypcje iCal używają własnego tokenu kanału.
4. W Firebase App Check włącz egzekwowanie dla Cloud Firestore i Realtime Database. Reguły członkostwa i uprawnień nadal obowiązują. Stare buildy bez App Check stracą dostęp do tych usług po włączeniu egzekwowania.

Standardowy token App Check potwierdza tożsamość aplikacji, ale nie poświadcza numeru buildu. Porównanie wersji w API służy zgodności klientów. Firestore i Realtime Database egzekwują App Check, bez osobnego porównania numerów wersji. Samo podniesienie progu Remote Config nie odcina bezpośredniego dostępu do bazy starszemu klientowi, który potrafi już przedstawić ważny token App Check.

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
