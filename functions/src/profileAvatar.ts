import { randomUUID } from 'node:crypto'
import { getStorage } from 'firebase-admin/storage'
import type { Firestore, Transaction } from 'firebase-admin/firestore'
import { documentId, DuoDataError, requirePartnership } from './partnershipAccess'

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const jpegPath = /^avatars\/[^/]+\/[\w-]+\.jpe?g$/i

export function avatarBucket(storage = getStorage()) {
  const project = storage.app.options.projectId || process.env.GCLOUD_PROJECT
  const bucket = process.env.DUO_AVATAR_BUCKET || storage.app.options.storageBucket ||
    (project && (process.env.FIREBASE_STORAGE_EMULATOR_HOST && project.startsWith('demo-')
      ? `${project}.appspot.com`
      : `${project}.firebasestorage.app`))
  return storage.bucket(bucket)
}

export function avatarObjectPath(value: unknown, uid: string, bucket: string): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null
  let path = value
  if (!jpegPath.test(path)) {
    try {
      const url = new URL(value)
      if (url.protocol === 'gs:' && url.host === bucket) {
        path = decodeURIComponent(url.pathname.slice(1))
      } else if (url.protocol === 'https:' && url.hostname === 'firebasestorage.googleapis.com') {
        const match = /^\/v1\/b\/([^/]+)\/o\/([^/]+)$/.exec(url.pathname)
        if (!match || decodeURIComponent(match[1]) !== bucket) return null
        path = decodeURIComponent(match[2])
      } else {
        return null
      }
    } catch {
      return null
    }
  }
  return jpegPath.test(path) && path.startsWith(`avatars/${uid}/`) ? path : null
}

async function ownedProfile(db: Firestore, tx: Transaction, uid: string) {
  const id = (await tx.get(db.collection('members').doc(uid))).get('profile_id')
  if (typeof id !== 'string') throw new DuoDataError(404, 'Profil jest niedostępny.')
  const profile = await tx.get(db.collection('profiles').doc(id))
  if (profile.get('auth_user_id') !== uid) throw new DuoDataError(404, 'Profil jest niedostępny.')
  return profile
}

export async function readProfileAvatar(db: Firestore, uid: string, rawId: unknown, bucket = avatarBucket()) {
  const id = documentId(rawId)
  const path = await db.runTransaction(async tx => {
    const profile = await tx.get(db.collection('profiles').doc(id))
    const owner = profile.get('auth_user_id')
    if (typeof owner !== 'string') return null
    if (owner !== uid) {
      const access = await requirePartnership(tx, db, uid)
      if (profile.get('partnership_id') !== access.partnershipId ||
          ![access.partnership.partner1_id, access.partnership.partner2_id].includes(id)) return null
    }
    return avatarObjectPath(profile.get('avatar_url'), owner, bucket.name)
  }, { readOnly: true })
  if (!path) throw new DuoDataError(404, 'Zdjęcie profilowe jest niedostępne.')
  try {
    const [metadata] = await bucket.file(path).getMetadata()
    if (metadata.contentType !== 'image/jpeg' || Number(metadata.size) > MAX_AVATAR_BYTES) {
      throw new DuoDataError(404, 'Zdjęcie profilowe jest niedostępne.')
    }
    const [bytes] = await bucket.file(path, { generation: metadata.generation }).download()
    return bytes
  } catch (error) {
    if ((error as { code?: unknown })?.code === 404) throw new DuoDataError(404, 'Zdjęcie profilowe jest niedostępne.')
    throw error
  }
}

export async function writeProfileAvatar(db: Firestore, uid: string, bytes: Buffer | null, bucket = avatarBucket()) {
  if (bytes && (!Buffer.isBuffer(bytes) || bytes.length < 3 || bytes.length > MAX_AVATAR_BYTES ||
      bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)) {
    throw new DuoDataError(400, 'Zdjęcie musi być plikiem JPG o rozmiarze do 5 MB.')
  }
  const path = bytes ? `avatars/${uid}/${randomUUID()}.jpg` : null
  if (bytes && path) {
    await bucket.file(path).save(bytes, {
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { contentType: 'image/jpeg', cacheControl: 'private, no-store' }
    })
  }
  const avatar_updated_at = new Date().toISOString()
  const oldPath = await db.runTransaction(async tx => {
    const profile = await ownedProfile(db, tx, uid)
    tx.update(profile.ref, { avatar_url: path, avatar_updated_at })
    return avatarObjectPath(profile.get('avatar_url'), uid, bucket.name)
  }).catch(async error => {
    // A lost commit response can leave the new object referenced. Keep it if that is possible.
    if (path && error instanceof DuoDataError) await bucket.file(path).delete({ ignoreNotFound: true }).catch(() => {})
    throw error
  })
  if (oldPath) {
    await bucket.file(oldPath).delete({ ignoreNotFound: true })
      .catch(error => console.warn('[avatar] Superseded file could not be deleted', error?.code))
  }
  return { avatar_url: path, avatar_updated_at }
}
