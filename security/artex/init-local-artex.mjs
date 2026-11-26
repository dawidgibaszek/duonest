import { randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const artex = 'C:\\Users\\dawid\\AppData\\Local\\DuoNestSecurity\\ARTEX-3cb06383fd99ffe7686abe1d375de11da7cfad54'
const docker = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe'
const files = ['-f', 'docker-compose.yml', '-f', 'docker-compose.chatgpt.yml']
const origin = 'http://127.0.0.1:8787'
const out = resolve('.data/security-audits/artex-admin.json')
try {
  await access(out)
  throw new Error(`Local ARTEX credentials already exist: ${out}`)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const status = await fetch(`${origin}/api/auth/status`).then(r => r.json())
if (status.initialized) throw new Error('ARTEX administrator is already initialized')

const logs = execFileSync(docker, ['compose', ...files, 'logs', '--no-color', 'artex'],
  { cwd: artex, encoding: 'utf8', maxBuffer: 1024 * 1024 })
const tokens = [...logs.matchAll(/Setup token for the \/setup page:\s*([^\s]+)/g)]
const setupToken = tokens.at(-1)?.[1]
if (!setupToken) throw new Error('ARTEX setup token not found in container logs')

const password = randomBytes(36).toString('base64url')
const result = await fetch(`${origin}/api/auth/init`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ password, setup_token: setupToken })
})
if (!result.ok) throw new Error(`ARTEX setup failed: HTTP ${result.status}`)
const body = await result.json()
if (!body.token) throw new Error('ARTEX did not return an admin session')

await mkdir(resolve('.data/security-audits'), { recursive: true })
await writeFile(out, JSON.stringify({ username: 'ARTEX', password, token: body.token }, null, 2), { mode: 0o600, flag: 'wx' })
console.log(`ARTEX administrator initialized. Credentials stored locally: ${out}`)
