# ARTEX: test bezpieczeństwa DuoNest

Wyniki wykonanej próby i testów uzupełniających: [LOCAL-AUDIT.md](LOCAL-AUDIT.md). Lokalny test dostępu można powtórzyć poleceniem `node security/artex/check-local-access.mjs` po uruchomieniu emulatorów i utworzeniu dwóch kont testowych.

ARTEX testuje działającą aplikację. Konfiguracja poniżej jest punktem startowym do kontrolowanego testu **osobnego środowiska testowego** DuoNest. Samo uruchomienie ARTEX nie potwierdza, że aplikacja jest w pełni bezpieczna.

Lokalna kopia ARTEX w `C:\Users\dawid\AppData\Local\DuoNestSecurity\ARTEX-3cb06383fd99ffe7686abe1d375de11da7cfad54` zawiera dodatkową bramkę subskrypcji ChatGPT. Instrukcja w jej katalogu `chatgpt-gateway/README.md` opisuje logowanie przez przeglądarkę i uruchomienie Compose. To lokalna modyfikacja ARTEX; oryginalne repozytorium nie zawiera tej funkcji. [Przegląd kodu przez Codex CLI](../codex-audit.ps1) pozostaje osobną kontrolą.

## Uruchomienie

1. Uruchom [lokalny cel DuoNest](start-local-target.ps1) poleceniem `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\security\artex\start-local-target.ps1` w katalogu DuoNest. Skrypt buduje aplikację z projektem `demo-duonest-security`, uruchamia lokalne emulatory Hosting, Functions, Auth, Firestore i Realtime Database oraz na czas testu odkłada `functions/.env` poza katalog Functions. Zatrzymaj go po teście, aby przywrócić plik. Dwa konta testowe można utworzyć przez `node security/artex/seed-test-accounts.mjs` i sprawdzić przez `node security/artex/smoke-test-local.mjs`; dane logowania są zapisywane w ignorowanym przez Git `.data/security-audits/test-accounts.json`.
2. Użyj lokalnej kopii ARTEX wskazanej wyżej. Jej `.env` ma już losowe hasło PostgreSQL i klucz lokalnej bramki; nie umieszczaj haseł, tokenów ani przechwyconego ruchu w Git.
3. W katalogu ARTEX uruchom `docker compose -f docker-compose.yml -f docker-compose.chatgpt.yml up -d --build`. Otwórz `http://127.0.0.1:1455/auth/start`, zaloguj się do ChatGPT i zatwierdź korzystanie z subskrypcji. Następnie odczytaj token pierwszej konfiguracji z `docker compose logs artex`, otwórz `http://localhost:8787/setup` i ustaw konto administratora. Sprawdź `http://localhost:8787/api/health`.
4. W ARTEX dodaj firmę i dokładny adres `http://host.docker.internal:5000` jako zakres testu. Nie dodawaj innych adresów przez wildcard. Jeśli istnieje zapisany aktywny profil LLM, ustaw w nim format `openai-responses`, bazowy URL `http://chatgpt-gateway:7799/v1`, wybrany model oraz klucz lokalnej bramki z `.env`; taki profil ma pierwszeństwo przed konfiguracją z Compose. Ustaw zatwierdzanie narzędzi przez człowieka przed rozpoczęciem zadania.
5. Utwórz zadanie z opisem poniżej. Przejrzyj proponowane działania przed ich zatwierdzeniem. Zapisz raport, dowody i wersję badanego buildu; po poprawkach uruchom ponowny test ustaleń.

Nie kieruj autonomicznego testu do `duonestapp.pl` ani usług Firebase, Google, Apple czy innych dostawców bez osobno ustalonego zakresu. Nawet przy `ARTEX_NOISE_PROFILE=quiet` narzędzia uruchamiane przez agenta mogą ominąć ograniczanie ruchu.

## Zakres zadania do wklejenia w ARTEX

> Sprawdź wyłącznie wskazane środowisko testowe DuoNest i konta testowe. Zacznij od pasywnego rozpoznania i małej liczby żądań. Sprawdź logowanie, rejestrację, reset hasła, kontrolę dostępu do API `/api/**`, autoryzację dostępu do danych różnych kont i par, walidację danych wejściowych, obsługę sesji, nagłówki bezpieczeństwa i ujawnianie informacji w błędach. Dokumentuj każdy problem minimalnym, powtarzalnym dowodem i wpływem na użytkownika. Nie wykonuj odmowy usługi, masowego skanowania, zgadywania haseł, usuwania danych, wysyłki wiadomości ani testów poza zakresem. Nie odczytuj ani nie zapisuj danych prawdziwych użytkowników. Przerwij działanie, jeśli test wymaga szerszego zakresu lub może zmienić dane poza kontami testowymi.

## Po teście

- Zweryfikuj ustalenia ręcznie i usuń fałszywe alarmy. Zamknij krytyczne i wysokie problemy przed wydaniem, potem powtórz test.
- Sprawdź osobno reguły Firestore i Realtime Database, uprawnienia Functions, App Check, konfigurację iOS/Android, zależności i ochronę sekretów. Test HTTP w ARTEX nie obejmuje pełnego bezpieczeństwa aplikacji mobilnej ani konfiguracji chmury.
- ARTEX zapisuje przechwycony ruch, który może zawierać tokeny i dane testowe. Ogranicz dostęp do instancji i usuń dane testowe po zakończeniu oceny.

Instrukcja bazuje na [instalacji i konfiguracji ARTEX](https://github.com/BaaRai/ARTEX#installation) oraz [opisie ograniczeń ruchu](https://github.com/BaaRai/ARTEX#configuration).
