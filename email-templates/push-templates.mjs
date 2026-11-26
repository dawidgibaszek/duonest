#!/usr/bin/env node
/**
 * Legacy utility for Firebase-managed email. The app now sends these templates
 * through the api Cloud Function and Resend directly; do not run this script
 * to update the current email flow.
 *
 * Wgrywa szablony maili z tego katalogu do Firebase Auth (Identity Toolkit Admin API).
 *
 *   node email-templates/push-templates.mjs           # dry-run: pokazuje, co zostanie zmienione
 *   node email-templates/push-templates.mjs --apply   # zapisuje konfigurację w Firebase
 *
 * Wymaga klucza konta serwisowego: ./serviceAccountKey.json albo GOOGLE_APPLICATION_CREDENTIALS.
 * Link akcji (do którego prowadzi %LINK%): EMAIL_ACTION_URL, domyślnie https://duonestapp.pl/auth/action
 *
 * Temat maila jest brany z pierwszej linii pliku: <!-- Temat: ... -->
 *
 * Firebase blokuje edycję szablonów przy domyślnym nadawcy (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED),
 * więc wysyłka idzie przez SMTP Resend. Klucz API podaj tylko w swoim terminalu:
 *   RESEND_API_KEY=re_… node email-templates/push-templates.mjs           # podgląd
 *   RESEND_API_KEY=re_… node email-templates/push-templates.mjs --apply   # zapis
 *   (opcjonalnie EMAIL_FROM, domyślnie noreply@duonestapp.pl)
 * Inny serwer SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (+ EMAIL_FROM).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cert } from 'firebase-admin/app'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(DIR, '..')
const APPLY = process.argv.includes('--apply')
const SENDER_DISPLAY_NAME = 'DuoNest'
const ACTION_URL = process.env.EMAIL_ACTION_URL || 'https://duonestapp.pl/auth/action'

const TEMPLATES = {
  resetPasswordTemplate: 'reset-password.html',
  verifyEmailTemplate: 'verify-email.html'
}

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(ROOT, 'serviceAccountKey.json')
if (!fs.existsSync(keyPath)) {
  console.error(`❌ Brak klucza konta serwisowego: ${keyPath}`)
  process.exit(1)
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
const projectId = serviceAccount.project_id
const { access_token: accessToken } = await cert(serviceAccount).getAccessToken()

const API = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`
const call = async (url, init = {}) => {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${json?.error?.message || res.statusText}`)
  return json
}

const readTemplate = (file) => {
  const raw = fs.readFileSync(path.join(DIR, file), 'utf8')
  const subject = raw.match(/^<!--\s*Temat:\s*(.+?)\s*-->/)?.[1]
  if (!subject) throw new Error(`${file}: brak linii "<!-- Temat: ... -->"`)
  if (!raw.includes('%LINK%')) throw new Error(`${file}: brak placeholdera %LINK%`)
  return { subject, body: raw.replace(/^<!--.*?-->\s*/, '').trim() }
}

const current = await call(API)
const currentEmail = current?.notification?.sendEmail || {}

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const SMTP_HOST = process.env.SMTP_HOST || (RESEND_API_KEY ? 'smtp.resend.com' : '')
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const SMTP_USER = process.env.SMTP_USER || (RESEND_API_KEY ? 'resend' : '')
const SMTP_PASS = process.env.SMTP_PASS || RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@duonestapp.pl'
const USE_SMTP = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

const sendEmail = { callbackUri: ACTION_URL }
if (USE_SMTP) {
  sendEmail.method = 'CUSTOM_SMTP'
  sendEmail.smtp = {
    senderEmail: EMAIL_FROM,
    host: SMTP_HOST,
    port: SMTP_PORT,
    username: SMTP_USER,
    password: SMTP_PASS,
    securityMode: SMTP_PORT === 465 ? 'SSL' : 'START_TLS'
  }
}
for (const [key, file] of Object.entries(TEMPLATES)) {
  const { subject, body } = readTemplate(file)
  const existing = currentEmail[key] || {}
  sendEmail[key] = {
    senderLocalPart: existing.senderLocalPart || 'noreply',
    senderDisplayName: SENDER_DISPLAY_NAME,
    replyTo: existing.replyTo || '',
    subject,
    body,
    bodyFormat: 'HTML'
  }
}

console.log(`Projekt: ${projectId}`)
console.log(`Metoda wysyłki: ${currentEmail.method || 'DEFAULT'}${currentEmail.smtp?.host ? ` (SMTP ${currentEmail.smtp.host})` : ''}`)
console.log(`Nowa metoda: ${USE_SMTP ? `CUSTOM_SMTP (${SMTP_HOST}:${SMTP_PORT}, nadawca ${EMAIL_FROM})` : 'bez zmian (brak RESEND_API_KEY)'}`)
console.log(`Link akcji: ${currentEmail.callbackUri || '(domyślny Firebase)'} → ${ACTION_URL}`)
for (const key of Object.keys(TEMPLATES)) {
  const before = currentEmail[key] || {}
  const after = sendEmail[key]
  console.log(`\n${key}`)
  console.log(`  nadawca: ${before.senderDisplayName || '-'} → ${after.senderDisplayName} <${after.senderLocalPart}@…>`)
  console.log(`  temat:   ${before.subject || '-'} → ${after.subject}`)
  console.log(`  treść:   ${before.bodyFormat || '-'}, ${(before.body || '').length} znaków → HTML, ${after.body.length} znaków`)
}

if (!APPLY) {
  console.log('\nDry-run – nic nie zapisano. Uruchom z --apply, aby wgrać szablony.')
  process.exit(0)
}

const mask = ['callbackUri', ...(USE_SMTP ? ['method', 'smtp'] : []), ...Object.keys(TEMPLATES)].map(k => `notification.sendEmail.${k}`).join(',')
await call(`${API}?updateMask=${encodeURIComponent(mask)}`, {
  method: 'PATCH',
  body: JSON.stringify({ notification: { sendEmail } })
})
console.log('\n✅ Szablony wgrane do Firebase Auth.')
