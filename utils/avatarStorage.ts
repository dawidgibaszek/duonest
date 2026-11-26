import { deleteObject, getDownloadURL, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage'

export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024
export const AVATAR_MAX_FILE_MB = 5

const ALLOWED_EXTENSION_RE = /\.(jpe?g)$/i
const ALLOWED_MIME_TYPES = new Set(['', 'image/jpeg', 'image/jpg'])

async function hasJpegSignature(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 3).arrayBuffer()
  const bytes = new Uint8Array(buffer)
  return bytes.length === 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function avatarValidationError(message: string) {
  return Object.assign(new Error(message), { code: 'avatar/validation' })
}

export async function validateAvatarFile(file: File): Promise<'jpg' | 'jpeg'> {
  if (!file || typeof file.name !== 'string') {
    throw avatarValidationError('Nie wybrano pliku.')
  }

  const extMatch = file.name.trim().match(ALLOWED_EXTENSION_RE)
  const extRaw = extMatch?.[1]?.toLowerCase()
  if (!extRaw) {
    throw avatarValidationError('Obsługiwane są wyłącznie pliki JPG (.jpg, .jpeg).')
  }

  const mimeType = String(file.type || '').toLowerCase().trim()
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw avatarValidationError('Obsługiwane są wyłącznie pliki JPG (.jpg, .jpeg).')
  }

  if (file.size <= 0) {
    throw avatarValidationError('Wybrany plik jest pusty.')
  }

  if (file.size > AVATAR_MAX_FILE_BYTES) {
    throw avatarValidationError(`Plik jest za duży. Maksymalny rozmiar to ${AVATAR_MAX_FILE_MB} MB.`)
  }

  if (!(await hasJpegSignature(file))) {
    throw avatarValidationError('Wybrany plik nie jest prawidłowym obrazem JPG.')
  }

  return extRaw === 'jpeg' ? 'jpeg' : 'jpg'
}

function isAllowedStorageBucket(bucket: string, storage: FirebaseStorage): boolean {
  const configured = storage.app.options.storageBucket || ''
  const projectId = storage.app.options.projectId || ''
  const allowed = new Set(
    [
      configured,
      projectId ? `${projectId}.firebasestorage.app` : '',
      projectId ? `${projectId}.appspot.com` : ''
    ].filter(Boolean)
  )
  return allowed.size === 0 || allowed.has(bucket)
}

export function resolveOwnAvatarStoragePath(
  avatarUrl: string | null | undefined,
  storage: FirebaseStorage,
  uid: string
): string | null {
  if (!avatarUrl || typeof avatarUrl !== 'string' || !uid) return null
  const trimmed = avatarUrl.trim()
  if (!trimmed) return null

  const ownPrefix = `avatars/${uid}/`

  if (trimmed.startsWith('gs://')) {
    const withoutScheme = trimmed.slice(5)
    const slashIndex = withoutScheme.indexOf('/')
    if (slashIndex <= 0) return null
    const bucket = withoutScheme.slice(0, slashIndex)
    const objectPath = withoutScheme.slice(slashIndex + 1)
    if (!isAllowedStorageBucket(bucket, storage)) return null
    return objectPath.startsWith(ownPrefix) ? objectPath : null
  }

  try {
    const parsed = new URL(trimmed)
    const isFirebaseHost = parsed.hostname === 'firebasestorage.googleapis.com'
    const isLocalEmulatorHost =
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      ['127.0.0.1', 'localhost', 'host.docker.internal'].includes(parsed.hostname)
    if (!isFirebaseHost && !isLocalEmulatorHost) return null

    const match = parsed.pathname.match(/^\/v\d+\/b\/([^/]+)\/o\/(.+)$/)
    const rawBucket = match?.[1]
    const rawObjectPath = match?.[2]
    if (!rawBucket || !rawObjectPath) return null
    const bucket = decodeURIComponent(rawBucket)
    const objectPath = decodeURIComponent(rawObjectPath)
    if (!isAllowedStorageBucket(bucket, storage)) return null
    return objectPath.startsWith(ownPrefix) ? objectPath : null
  } catch {
    return null
  }
}

export async function deleteAvatarFromStorage(
  storage: FirebaseStorage,
  uid: string,
  avatarUrl: string | null | undefined
): Promise<boolean> {
  const objectPath = resolveOwnAvatarStoragePath(avatarUrl, storage, uid)
  if (!objectPath) return false

  try {
    await deleteObject(ref(storage, objectPath))
    return true
  } catch (err: any) {
    if (err?.code === 'storage/object-not-found') {
      return false
    }
    throw err
  }
}

export async function uploadProfileAvatar(options: {
  storage: FirebaseStorage
  uid: string
  file: File
  previousAvatarUrl?: string | null
  saveAvatarUrl: (avatarUrl: string) => Promise<boolean>
}): Promise<string> {
  const { storage, uid, file, previousAvatarUrl, saveAvatarUrl } = options
  const ext = await validateAvatarFile(file)
  const uniqueId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const objectPath = `avatars/${uid}/${uniqueId}.${ext}`
  const storageRef = ref(storage, objectPath)

  await uploadBytes(storageRef, file, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000'
  })

  const newUrl = await getDownloadURL(storageRef)
  let saved = false
  try {
    saved = await saveAvatarUrl(newUrl)
  } catch (err) {
    await deleteObject(storageRef).catch(() => {})
    throw err
  }

  if (!saved) {
    await deleteObject(storageRef).catch(() => {})
    throw new Error('Sesja się zmieniła. Otwórz profil ponownie.')
  }

  if (previousAvatarUrl && previousAvatarUrl !== newUrl) {
    try {
      await deleteAvatarFromStorage(storage, uid, previousAvatarUrl)
    } catch (err) {
      console.warn('[Avatar] Nie udało się usunąć poprzedniego pliku ze Storage:', err)
    }
  }

  return newUrl
}

export async function removeProfileAvatar(options: {
  storage: FirebaseStorage
  uid: string
  currentAvatarUrl?: string | null
  saveAvatarUrl: (avatarUrl: null) => Promise<boolean>
}): Promise<boolean> {
  const { storage, uid, currentAvatarUrl, saveAvatarUrl } = options

  if (currentAvatarUrl) {
    await deleteAvatarFromStorage(storage, uid, currentAvatarUrl)
  }

  return saveAvatarUrl(null)
}
