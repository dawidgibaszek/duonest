# Lokalny test bezpieczeństwa DuoNest — 26 listopada 2026

## Zakres i wynik

Cel: lokalny build DuoNest z projektem Firebase `demo-duonest-security` oraz emulatorami Hosting, Functions, Auth, Firestore i Realtime Database. Użyto dwóch utworzonych na potrzeby testu kont. Nie użyto danych produkcyjnych.

ARTEX działał z lokalną bramką subskrypcji ChatGPT i wykonał zadanie nr 1. Model odmówił zaplanowania automatycznego testu penetracyjnego. Zadanie zakończyło się statusem `timeout` po wyczerpaniu limitu tokenów, z 0 potwierdzonych ustaleń. ARTEX zdążył sprawdzić tylko dostępność strony i nagłówki odpowiedzi `HEAD /`; nie wykonał zaplanowanych prób logowania i kontroli dostępu. Tego zadania nie można traktować jako ukończonego audytu.

Uzupełniający, powtarzalny test `node security/artex/check-local-access.mjs` dał następujące wyniki:

| Próba | Wynik |
| --- | --- |
| Logowanie dwóch kont testowych i synchronizacja profilu | `200` dla każdego konta |
| Firestore: własny dokument `members/{uid}` | `200` |
| Firestore: dokument drugiego konta i żądanie bez logowania | `403` |
| Realtime Database: własny `members/{uid}` | `200` |
| Realtime Database: dokument drugiego konta i żądanie bez logowania | `401` |
| Functions: `/api/account/sync`, `/api/admin/settings`, `/api/location/session`, `/api/pairing/pair` bez logowania | `401` |
| Functions: `/api/account/sync` z błędnym tokenem | `401` |

## Naprawione podczas testu

Odpowiedź API na błędny token zawierała pole `message` z treścią wewnętrznego wyjątku Firebase. W `functions/src/index.ts` usunięto to pole. Po przebudowaniu Functions endpoint nadal zwraca `401`, ale odpowiedź zawiera tylko ogólny kod błędu. Komunikaty na ekranie logowania i rejestracji są mapowane na zrozumiałe teksty w `pages/login.vue`; surowy wyjątek nie jest tam wyświetlany.

## Otwarte kwestie przed wydaniem

- ARTEX zgłosił brak `X-Frame-Options`, `X-Content-Type-Options` i `Content-Security-Policy` w odpowiedzi lokalnego emulatora Hosting. Pierwsze dwa nagłówki są skonfigurowane w `firebase.json` i `nuxt.config.ts`, ale emulator nie zwrócił ich także dla `GET /index.html`. Nie ma tu dowodu, jak zachowa się wdrożony Hosting. CSP nie jest obecnie skonfigurowane; jego dodanie wymaga sprawdzenia wszystkich źródeł skryptów i połączeń używanych przez aplikację.
- Nie przetestowano pełnego przepływu rejestracji, resetu hasła, wszystkich tras API, uprawnień między sparowanymi kontami, aplikacji mobilnej ani konfiguracji wdrożonego Firebase. Test lokalny nie pozwala potwierdzić pełnego bezpieczeństwa przed wydaniem.

Test dotyczy stanu kodu po lokalnej poprawce odpowiedzi na błędny token. Przed wydaniem trzeba sprawdzić wdrożony build i wykonać dalszy przegląd niezależnie od wyniku ARTEX.
