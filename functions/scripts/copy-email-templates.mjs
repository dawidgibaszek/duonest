import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const functionsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.resolve(functionsDir, '..', 'email-templates')
const targetDir = path.join(functionsDir, 'lib', 'email-templates')

mkdirSync(targetDir, { recursive: true })
for (const name of ['verify-email.html', 'reset-password.html']) {
  copyFileSync(path.join(sourceDir, name), path.join(targetDir, name))
}
