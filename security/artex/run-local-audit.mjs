import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const output = resolve('.data/security-audits/artex-task.json')
try {
  await access(output)
  throw new Error(`A local ARTEX task is already recorded: ${output}`)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const admin = JSON.parse(await readFile('.data/security-audits/artex-admin.json', 'utf8'))
const { projectId, accounts } = JSON.parse(await readFile('.data/security-audits/test-accounts.json', 'utf8'))
if (projectId !== 'demo-duonest-security' || accounts.length !== 2) throw new Error('Unexpected test accounts')

const body = {
  name: 'DuoNest local security pass',
  description: 'Ograniczony test bezpieczeństwa DuoNest w emulatorach Firebase.',
  goal: [
    'Testuj wyłącznie lokalny projekt Firebase demo-duonest-security. Punkt wejścia: http://host.docker.internal:5000.',
    'Dozwolone lokalne porty pomocnicze dla klienta Firebase: 9099 (Auth), 8080 (Firestore), 9000 (Realtime Database).',
    'Użyj wyłącznie przypisanych kont testowych A i B. Sprawdź logowanie, rejestrację, treści błędów, kontrolę dostępu do /api/**, odczyt danych drugiego konta, sesję i nagłówki bezpieczeństwa.',
    'Zacznij od pasywnego rozpoznania. Wykonuj tylko małą liczbę żądań potrzebnych do powtarzalnego dowodu. Zapisz ścieżkę, oczekiwany i rzeczywisty wynik oraz wpływ każdego potwierdzonego problemu.',
    'Nie uruchamiaj Nuclei, SQLMap, BBOT, masowego skanowania, zgadywania haseł, testu odmowy usługi ani żądań do serwisów zewnętrznych. Nie wysyłaj powiadomień i nie usuwaj danych. Przerwij, jeżeli wymagany jest inny adres lub dane spoza kont testowych.'
  ].join(' '),
  company_ids: [1],
  target_gate: true,
  seed_first_intent: true,
  coverage_enabled: false,
  timeout_seconds: 900,
  credentials: accounts.map(account => ({
    domain: 'host.docker.internal', username: account.email, password: account.password,
    note: `Konto ${account.label.toUpperCase()} w lokalnym emulatorze Auth`
  }))
}
const response = await fetch('http://127.0.0.1:8787/api/tasks', {
  method: 'POST', headers: { authorization: `Bearer ${admin.token}`, 'content-type': 'application/json' },
  body: JSON.stringify(body)
})
const result = await response.json()
if (response.status !== 201) throw new Error(`ARTEX did not create the task: HTTP ${response.status}, ${JSON.stringify(result)}`)
await mkdir(resolve('.data/security-audits'), { recursive: true })
await writeFile(output, JSON.stringify({ id: result.id, name: body.name, createdAt: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' })
console.log(`ARTEX task created: ${result.id}. Local record: ${output}`)
