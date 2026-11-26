param(
  [string]$Model = 'gpt-6.2-astra'
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$codex = (Get-Command codex.exe -ErrorAction Stop).Source
$reports = Join-Path $repo '.data\security-audits'
New-Item -ItemType Directory -Path $reports -Force | Out-Null
$report = Join-Path $reports ("codex-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.md')
$diagnostics = [System.IO.Path]::ChangeExtension($report, '.log')

$prompt = @'
Przeprowadź przegląd bezpieczeństwa DuoNest przed wydaniem. Przeczytaj AGENTS.md.
Sprawdź publiczne punkty wejścia API, uwierzytelnianie, autoryzację,
reguły Firestore i Realtime Database oraz istotne ścieżki klienta.
Nie zmieniaj plików i nie wysyłaj żądań do produkcji.
Zgłoś tylko problemy potwierdzone kodem: ścieżka i numer linii,
scenariusz nadużycia, skutek i krótka naprawa. Oddziel hipotezy.
Odpowiedz po polsku. Na końcu wymień obszary, których nie sprawdziłeś.
'@

& $codex exec --skip-git-repo-check --sandbox read-only `
  -m $Model --config 'model_reasoning_effort="high"' `
  -C $repo --output-last-message $report $prompt 2> $diagnostics

$exitCode = $LASTEXITCODE
if (Test-Path -LiteralPath $report) {
  Write-Host "Raport: $report"
}
if ($exitCode -ne 0) {
  throw "Codex zakończył się kodem $exitCode. Sprawdź raport i diagnostykę: $diagnostics"
}
