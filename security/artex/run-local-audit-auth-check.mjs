import { readFile, writeFile } from 'node:fs/promises'

const admin = JSON.parse(await readFile('.data/security-audits/artex-admin.json', 'utf8'))
const body = {
  name: 'DuoNest local unauthenticated API check',
  description: 'Jedno sprawdzenie odpowiedzi lokalnego API bez logowania.',
  goal: 'Własne lokalne środowisko DuoNest. Wykonaj jedno żądanie POST http://host.docker.internal:5000/api/account/sync z treścią {} i nagłówkiem Content-Type: application/json, bez nagłówka Authorization. Limit czasu żądania 20 sekund. Zapisz rzeczywisty status HTTP i nazwy pól odpowiedzi JSON. Oczekiwany status: 401. Nie wykonuj innych żądań, nie uruchamiaj skanerów i nie modyfikuj danych. Po zapisaniu wyniku zakończ zadanie.',
  company_ids: [1],
  target_gate: true,
  seed_first_intent: true,
  coverage_enabled: false,
  timeout_seconds: 300
}
const response = await fetch('http://127.0.0.1:8787/api/tasks', {
  method: 'POST', headers: { authorization: `Bearer ${admin.token}`, 'content-type': 'application/json' },
  body: JSON.stringify(body)
})
const result = await response.json()
if (response.status !== 201) throw new Error(`Could not create task: HTTP ${response.status}, ${JSON.stringify(result)}`)
await writeFile('.data/security-audits/artex-task-auth-check.json', JSON.stringify({ id: result.id, createdAt: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' })
console.log(`ARTEX auth check task: ${result.id}`)
