import { readFile, writeFile } from 'node:fs/promises'

const admin = JSON.parse(await readFile('.data/security-audits/artex-admin.json', 'utf8'))
const { projectId, accounts } = JSON.parse(await readFile('.data/security-audits/test-accounts.json', 'utf8'))
if (projectId !== 'demo-duonest-security' || accounts.length !== 2) throw new Error('Unexpected test setup')
const [a, b] = accounts
const body = {
  name: 'DuoNest local account isolation check',
  description: 'Jedna próba odczytu dokumentu drugiego konta w lokalnym Firestore.',
  goal: [
    `Własny lokalny projekt Firebase ${projectId}.`,
    `Użyj zapisanego konta testowego A (${a.email}) do zalogowania przez lokalny emulator Auth pod http://host.docker.internal:9099.`,
    `Następnie użyj otrzymanego idToken tylko do żądania GET http://host.docker.internal:8080/v1/projects/${projectId}/databases/(default)/documents/members/${b.uid}.`,
    'To jest dokument osobnego konta testowego B. Oczekiwany wynik: odmowa odczytu (403).',
    'Zapisz tylko statusy HTTP i informację, czy odpowiedź zawiera dane dokumentu. Nie zapisuj ani nie drukuj hasła lub tokenu.',
    'Wykonaj wyłącznie te dwa żądania. Nie uruchamiaj skanerów, nie modyfikuj danych, nie łącz się z innymi adresami. Zakończ po zapisaniu wyniku.'
  ].join(' '),
  company_ids: [1], target_gate: true, seed_first_intent: true, coverage_enabled: false, timeout_seconds: 360,
  credentials: [{ domain: 'host.docker.internal', username: a.email, password: a.password, note: 'Lokalne konto testowe A w emulatorze Auth' }]
}
const response = await fetch('http://127.0.0.1:8787/api/tasks', {
  method: 'POST', headers: { authorization: `Bearer ${admin.token}`, 'content-type': 'application/json' },
  body: JSON.stringify(body)
})
const result = await response.json()
if (response.status !== 201) throw new Error(`Could not create task: HTTP ${response.status}, ${JSON.stringify(result)}`)
await writeFile('.data/security-audits/artex-task-isolation.json', JSON.stringify({ id: result.id, createdAt: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' })
console.log(`ARTEX isolation task: ${result.id}`)
