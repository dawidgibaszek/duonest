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

export async function requestProfileAvatar(
  account: { getIdToken(): Promise<string> },
  profileId: string | null,
  method: 'GET' | 'POST' | 'DELETE',
  file?: File,
  signal?: AbortSignal
): Promise<Response> {
  const token = await account.getIdToken()
  const headers = new Headers({ Authorization: `Bearer ${token}` })
  if (file) headers.set('Content-Type', 'image/jpeg')
  const path = profileId ? '/api/avatar/' + encodeURIComponent(profileId) : '/api/avatar'
  return fetch(path, { method, headers, body: file, signal, cache: 'no-store' })
}
