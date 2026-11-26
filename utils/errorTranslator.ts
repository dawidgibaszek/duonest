/**
 * Centralny moduł tłumaczenia błędów w aplikacji DuoNest.
 * Konwertuje techniczne kody i wyjątki (Firebase Auth, Firestore, Network, RPC)
 * na czytelne, bezpieczne i zrozumiałe dla użytkownika komunikaty w języku polskim.
 */

const GENERIC_FALLBACK = 'Wystąpił problem podczas przetwarzania żądania. Spróbuj ponownie lub odśwież aplikację.'

export function translateAppError(err: any): string {
  if (!err) return 'Wystąpił nieoczekiwany problem. Spróbuj ponownie za chwilę.'

  // Jeśli błąd jest już czytelnym ciągiem po polsku (nie zawiera kodów technicznych)
  if (typeof err === 'string') {
    // Technical codes returned as plain strings (e.g. 'partner_unavailable') go
    // through the same rules as Error objects; free text keeps the old handling.
    const viaCodes = translateAppError({ message: err })
    return viaCodes === GENERIC_FALLBACK ? translateErrorMessage(err) : viaCodes
  }

  const code: string = (err?.code || '').toLowerCase()
  const msg: string = (err?.message || err?.error_description || String(err)).toLowerCase()

  // 1. Firebase Authentication kody
  if (code.includes('auth/invalid-credential') || code.includes('invalid-login-credentials') || msg.includes('invalid login credentials')) {
    return 'Nieprawidłowy adres e-mail lub hasło. Upewnij się, że wpisujesz poprawne dane lub skorzystaj z opcji „Nie pamiętasz hasła?”.'
  }

  if (code.includes('auth/user-not-found') || msg.includes('user not found') || msg.includes('nie znaleziono konta')) {
    return 'Nie znaleziono konta powiązanego z tym adresem e-mail. Sprawdź poprawność wpisanego adresu lub zarejestruj się.'
  }

  if (code.includes('auth/wrong-password') || msg.includes('wrong password')) {
    return 'Wprowadzone hasło jest niepoprawne. Spróbuj ponownie lub zresetuj hasło.'
  }

  if (code.includes('auth/email-already-in-use') || msg.includes('already in use') || msg.includes('user already registered') || msg.includes('już istnieje')) {
    return 'Konto z tym adresem e-mail już istnieje. Zaloguj się powyżej swoim hasłem lub skorzystaj z opcji resetu hasła.'
  }

  if (code.includes('auth/weak-password') || msg.includes('weak password') || msg.includes('co najmniej 6')) {
    return 'Hasło jest zbyt słabe. Hasło musi zawierać co najmniej 6 znaków.'
  }

  if (code.includes('auth/invalid-email') || msg.includes('invalid email')) {
    return 'Wprowadzony adres e-mail ma nieprawidłowy format. Sprawdź poprawność adresu.'
  }

  if (code.includes('auth/popup-closed-by-user') || msg.includes('popup-closed-by-user') || msg.includes('closed by user')) {
    return 'Logowanie zostało przerwane przed ukończeniem. Spróbuj ponownie.'
  }

  if (code.includes('auth/cancelled-popup-request') || msg.includes('cancelled-popup-request')) {
    return 'Okno logowania jest już otwarte. Dokończ logowanie w nim lub zamknij je i spróbuj ponownie.'
  }

  if (code.includes('auth/account-exists-with-different-credential') || msg.includes('account-exists-with-different-credential')) {
    return 'Konto z tym adresem e-mail już istnieje. Zaloguj się tak jak wcześniej (hasłem lub przez Google).'
  }

  if (code.includes('auth/operation-not-allowed') || msg.includes('operation-not-allowed')) {
    return 'Ta metoda logowania jest chwilowo niedostępna. Wybierz inną.'
  }

  if (code.includes('auth/popup-blocked') || msg.includes('popup-blocked')) {
    return 'Wyskakujące okno logowania zostało zablokowane przez Twoją przeglądarkę. Zezwól na wyskakujące okna dla tej witryny.'
  }

  if (code.includes('auth/too-many-requests') || msg.includes('too-many-requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Zbyt wiele prób w krótkim czasie. Ze względów bezpieczeństwa odczekaj chwilę przed kolejną próbą.'
  }

  if (code.includes('auth/user-disabled') || msg.includes('user disabled')) {
    return 'Twoje konto zostało tymczasowo zablokowane. Skontaktuj się ze wsparciem DuoNest.'
  }

  if (code.includes('auth/requires-recent-login') || msg.includes('requires-recent-login')) {
    return 'Ta operacja wymaga ponownego zalogowania się do konta. Zaloguj się ponownie.'
  }

  if (code.includes('auth/network-request-failed') || msg.includes('network error') || msg.includes('failed to fetch')) {
    return 'Problem z połączeniem sieciowym. Sprawdź swoje połączenie z internetem i spróbuj ponownie.'
  }

  // 2. Cloud Firestore & Realtime Database kody
  if (code.includes('permission-denied') || msg.includes('permission-denied') || msg.includes('missing or insufficient permissions')) {
    return 'Brak uprawnień do wykonania tej operacji lub Twoja sesja wygasła. Odśwież stronę lub zaloguj się ponownie.'
  }

  if (code.includes('unavailable') || msg.includes('service unavailable')) {
    return 'Usługa synchronizacji danych jest chwilowo niedostępna. Twoje zmiany zostaną zapisane, gdy połączenie powróci.'
  }

  if (code.includes('resource-exhausted') || msg.includes('quota exceeded')) {
    return 'Serwer jest obecnie mocno obciążony. Odczekaj chwilę i spróbuj ponownie.'
  }

  if (code.includes('deadline-exceeded') || msg.includes('timeout')) {
    return 'Upłynął limit czasu oczekiwania na odpowiedź serwera. Spróbuj ponownie.'
  }

  // 2b. Firebase Storage i walidacja avataru
  if (code.startsWith('avatar/') && typeof err?.message === 'string' && err.message) {
    return err.message
  }

  if (code.includes('storage/unauthorized') || code.includes('storage/unauthenticated')) {
    return 'Brak uprawnień do zapisu pliku lub Twoja sesja wygasła. Zaloguj się ponownie.'
  }

  if (code.includes('storage/quota-exceeded')) {
    return 'Przekroczono limit miejsca w chmurze. Spróbuj ponownie później.'
  }

  if (code.includes('storage/retry-limit-exceeded')) {
    return 'Przesyłanie pliku trwało zbyt długo. Sprawdź połączenie z internetem i spróbuj ponownie.'
  }

  if (code.includes('storage/canceled')) {
    return 'Przesyłanie pliku zostało anulowane.'
  }

  if (code.includes('storage/invalid-argument')) {
    return 'Nieprawidłowy plik lub format obrazu.'
  }

  // 3. Logika parowania i związków
  if (msg.includes('email_not_verified')) {
    return 'Najpierw potwierdź swój adres e-mail – kliknij link aktywacyjny, który wysłaliśmy na Twoją skrzynkę.'
  }
  if (msg.includes('auth/invalid-action-code') || msg.includes('auth/expired-action-code')) {
    return 'Link jest nieprawidłowy, został już użyty albo wygasł. Poproś o nowy.'
  }
  if (msg.includes('pairing_code_required')) {
    return 'Wpisz kod widoczny na ekranie parowania na drugim koncie (np. 8K4P2QZ).'
  }

  if (msg.includes('partner_unavailable') || msg.includes('partner not found') || msg.includes('nie znaleziono partnera')) {
    return 'Nie znaleziono konta o podanym kodzie. Sprawdź, czy wpisujesz aktualny kod z drugiego konta.'
  }

  if (msg.includes('already paired') || msg.includes('w innym gniazdku')) {
    return 'Jedno z kont jest już połączone w innym Gniazdku. Przed połączeniem należy najpierw rozłączyć poprzedni związek.'
  }

  if (msg.includes('swój własny') || msg.includes('ze swoim własnym')) {
    return 'Nie możesz sparować konta ze swoim własnym kodem lub adresem e-mail.'
  }

  if (msg.includes('invalid_pairing_input') || msg.includes('invalid pairing code')) {
    return 'Wprowadzony kod parowania ma nieprawidłowy format. Prawidłowy kod to np. DN-8K4P2Q.'
  }

  if (msg.includes('pairing_rate_limited') || msg.includes('zbyt wiele nieudanych prób parowania')) {
    return 'Zbyt wiele prób parowania w krótkim czasie. Ze względów bezpieczeństwa odczekaj kilka minut przed kolejną próbą.'
  }

  if (msg.includes('verified_authentication_required') || msg.includes('potwierdź adres e-mail')) {
    return 'Przed sparowaniem konta musisz potwierdzić swój adres e-mail.'
  }

  if (msg.includes('profile_not_linked') || msg.includes('nie znaleziono profilu')) {
    return 'Trwa synchronizacja Twojego profilu. Odśwież stronę i spróbuj ponownie za moment.'
  }

  if (msg.includes('email_cooldown')) {
    return 'Odczekaj minutę przed ponownym wysłaniem linku.'
  }

  if (msg.includes('email_service_unavailable')) {
    return 'Wysyłka wiadomości jest chwilowo niedostępna. Spróbuj ponownie później.'
  }

  // 4. Bezpieczny fallback – nigdy nie pokazuj surowego JSON-a ani stack trace'a
  return GENERIC_FALLBACK
}

function translateErrorMessage(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Brak połączenia z siecią. Sprawdź połączenie internetowe.'
  }
  if (lower.includes('invalid') && (lower.includes('email') || lower.includes('hasło') || lower.includes('password'))) {
    return 'Nieprawidłowy adres e-mail lub hasło.'
  }
  if (lower.includes('nie znaleziono')) {
    return msg
  }
  if (lower.includes('zbyt wiele')) {
    return msg
  }
  if (lower.includes('firebase') || lower.includes('error') || lower.includes('exception') || lower.includes('[object')) {
    return 'Wystąpił nieoczekiwany problem techniczny. Spróbuj ponownie za chwilę.'
  }
  return msg
}
