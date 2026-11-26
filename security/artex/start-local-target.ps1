$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location -LiteralPath $repo

$jre = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -ErrorAction SilentlyContinue |
  Where-Object { Test-Path (Join-Path $_.FullName 'bin\java.exe') } |
  Sort-Object Name -Descending | Select-Object -First 1
if (-not $jre) { throw 'Java 21 is required for the Firebase emulators.' }
$env:JAVA_HOME = $jre.FullName
$env:PATH = (Join-Path $jre.FullName 'bin') + ';' + $env:PATH

$project = 'demo-duonest-security'
$env:FIREBASE_PROJECT_ID = $project
$env:FIREBASE_API_KEY = 'fake-emulator-key'
$env:FIREBASE_AUTH_DOMAIN = "$project.firebaseapp.com"
$env:FIREBASE_STORAGE_BUCKET = "$project.appspot.com"
$env:FIREBASE_MESSAGING_SENDER_ID = '000000000000'
$env:FIREBASE_APP_ID = '1:000000000000:web:securitytest'
$env:FIREBASE_DATABASE_URL = "https://${project}-default-rtdb.firebaseio.com"
$env:FIREBASE_USE_EMULATORS = '1'
$env:FIREBASE_EMULATOR_HOST = 'host.docker.internal'
$env:GOOGLE_APPLICATION_CREDENTIALS = ''

& (Get-Command npm.cmd -ErrorAction Stop).Source --prefix functions run build
if ($LASTEXITCODE -ne 0) { throw 'Functions build failed.' }
& (Get-Command npm.cmd -ErrorAction Stop).Source run generate
if ($LASTEXITCODE -ne 0) { throw 'DuoNest build failed.' }

$config = Get-Content -LiteralPath (Join-Path $repo 'firebase.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$config | Add-Member -NotePropertyName emulators -NotePropertyValue @{
  auth = @{ host = '0.0.0.0'; port = 9099 }
  firestore = @{ host = '0.0.0.0'; port = 8080 }
  database = @{ host = '0.0.0.0'; port = 9000 }
  functions = @{ host = '0.0.0.0'; port = 5001 }
  hosting = @{ host = '0.0.0.0'; port = 5000 }
  ui = @{ enabled = $false }
} -Force
$localConfig = Join-Path $repo 'firebase.security.local.json'
[System.IO.File]::WriteAllText($localConfig, ($config | ConvertTo-Json -Depth 100), (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Local test target: http://host.docker.internal:5000 (project $project)"
$secrets = Join-Path $repo 'functions/.env'
$backupDir = Join-Path $repo '.data/security-audits'
$backup = Join-Path $backupDir 'functions.env.backup'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
if (Test-Path -LiteralPath $backup) {
  if (Test-Path -LiteralPath $secrets) { throw 'Both the Functions environment and its backup exist. Resolve this before starting.' }
  Move-Item -LiteralPath $backup -Destination $secrets
}
$moved = Test-Path -LiteralPath $secrets
if ($moved) { Move-Item -LiteralPath $secrets -Destination $backup }
try {
  & (Get-Command firebase.cmd -ErrorAction Stop).Source emulators:start --config $localConfig --project $project --only auth,firestore,database,functions,hosting
  if ($LASTEXITCODE -ne 0) { throw 'Firebase emulators stopped with an error.' }
} finally {
  if ($moved -and (Test-Path -LiteralPath $backup)) { Move-Item -LiteralPath $backup -Destination $secrets }
}
