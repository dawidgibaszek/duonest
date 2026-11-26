import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { Auth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import type { Request, Response } from 'express'

const ACTION_URL = 'https://duonestapp.pl/auth/action'
const FROM = 'DuoNest <noreply@duonestapp.pl>'
const COOLDOWN_MS = 60_000
const templates = new Map<string, { subject: string; html: string }>()

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

function template(kind: 'verify-email' | 'reset-password') {
  const cached = templates.get(kind)
  if (cached) return cached
  const source = readFileSync(path.join(__dirname, 'email-templates', `${kind}.html`), 'utf8')
  const match = source.match(/^<!--\s*Temat:\s*(.+?)\s*-->/)
  if (!match || !source.includes('%LINK%') || !source.includes('%EMAIL%')) {
    throw new Error(`Invalid ${kind} email template`)
  }
  const result = { subject: match[1], html: source.replace(match[0], '').trim() }
  templates.set(kind, result)
  return result
}

export function actionUrl(firebaseLink: string, expectedMode: 'verifyEmail' | 'resetPassword') {
  const generated = new URL(firebaseLink)
  const code = generated.searchParams.get('oobCode')
  if (generated.searchParams.get('mode') !== expectedMode || !code) {
    throw new Error('Firebase returned an invalid action link')
  }
  const custom = new URL(ACTION_URL)
  custom.searchParams.set('mode', expectedMode)
  custom.searchParams.set('oobCode', code)
  return custom.toString()
}

async function allowRequest(db: Firestore, kind: string, identity: string) {
  const id = createHash('sha256').update(`${kind}:${identity}`).digest('hex')
  const ref = db.collection('auth_email_cooldowns').doc(id)
  const now = Date.now()
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref)
    if ((snapshot.get('nextAllowedAt') ?? 0) > now) return false
    tx.set(ref, { nextAllowedAt: now + COOLDOWN_MS, expiresAt: new Date(now + 86_400_000) })
    return true
  })
}

async function deliver(to: string, kind: 'verify-email' | 'reset-password', link: string) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  const { subject, html } = template(kind)
  const safeLink = escapeHtml(link)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html: html.replaceAll('%LINK%', safeLink).replaceAll('%EMAIL%', escapeHtml(to)),
      text: `${subject}\n\n${link}\n\nJeśli nie proszono o tę wiadomość, można ją zignorować.`
    }),
    signal: AbortSignal.timeout(10_000)
  })
  if (!response.ok) throw new Error(`Resend rejected email: HTTP ${response.status}`)
}

export async function sendVerificationEmail(auth: Auth, db: Firestore, uid: string, res: Response) {
  res.set('Cache-Control', 'no-store')
  try {
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'email_service_unavailable' })
    const user = await auth.getUser(uid)
    if (!user.email || user.emailVerified || user.disabled) return res.json({ success: true })
    if (!await allowRequest(db, 'verify', uid)) return res.status(429).json({ error: 'email_cooldown' })
    const link = actionUrl(await auth.generateEmailVerificationLink(user.email), 'verifyEmail')
    await deliver(user.email, 'verify-email', link)
    return res.json({ success: true })
  } catch (error) {
    console.error('[auth-email] Verification delivery failed:', error)
    return res.status(503).json({ error: 'email_service_unavailable' })
  }
}

export async function requestPasswordReset(auth: Auth, db: Firestore, req: Request, res: Response) {
  res.set('Cache-Control', 'no-store')
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid_email' })
  }
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'email_service_unavailable' })
  try {
    if (!await allowRequest(db, 'reset', email)) return res.json({ success: true })
    let user
    try {
      user = await auth.getUserByEmail(email)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') return res.json({ success: true })
      throw error
    }
    if (!user.email || user.disabled) return res.json({ success: true })
    const link = actionUrl(await auth.generatePasswordResetLink(user.email), 'resetPassword')
    await deliver(user.email, 'reset-password', link)
  } catch (error) {
    // Keep the response identical for existing and unknown addresses.
    console.error('[auth-email] Password reset delivery failed:', error)
  }
  return res.json({ success: true })
}
