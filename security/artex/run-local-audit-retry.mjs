import { readFile, writeFile } from 'node:fs/promises'

const admin = JSON.parse(await readFile('.data/security-audits/artex-admin.json', 'utf8'))
const body = {
  name: 'DuoNest local API regression checks',
  description: 'Powtarzalny test trzech odpowiedzi lokalnego środowiska DuoNest.',
  goal: [
    'To jest własny projekt DuoNest uruchomiony wyłącznie w lokalnych emulatorach Firebase.',
    'Wykonaj dokładnie trzy żądania HTTP do http://host.docker.internal:5000:',
    'HEAD /, POST /api/account/sync bez Authorization z pustym JSON oraz POST /api/account/sync z Authorization: Bearer invalid-test-token i pustym JSON.',
    'Dla każdego zapisz status i nazwy nagłówków odpowiedzi. Dla dwóch odpowiedzi API zapisz tylko nazwy pól JSON, bez wartości.',
    'Oczekiwane statusy to 200, 401, 401. Odpowiedź na błędny token nie powinna zawierać pola message.',
    'Nie wykonuj innych żądań, nie uruchamiaj narzędzi skanujących, nie modyfikuj danych i nie łącz się z żadnym innym adresem.',
    'Zakończ raportem z wynikiem każdego z trzech sprawdzeń i zaznacz, że ten wąski test nie jest pełnym audytem.'
  ].join(' '),
  company_ids: [1],
  target_gate: true,
  seed_first_intent: true,
  coverage_enabled: false,
  timeout_seconds: 600
}
const response = await fetch('http://127.0.0.1:8787/api/tasks', {
  method: 'POST', headers: { authorization: `Bearer ${admin.token}`, 'content-type': 'application/json' },
  body: JSON.stringify(body)
})
const result = await response.json()
if (response.status !== 201) throw new Error(`Could not create task: HTTP ${response.status}, ${JSON.stringify(result)}`)
const output = '.data/security-audits/artex-task-retry.json'
await writeFile(output, JSON.stringify({ id: result.id, name: body.name, createdAt: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' })
console.log(`ARTEX retry task: ${result.id}`)
