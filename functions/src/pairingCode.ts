export const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const PAIRING_CODE_LENGTH = 7

const currentCode = new RegExp(`^[${PAIRING_CODE_ALPHABET}]{${PAIRING_CODE_LENGTH}}$`)
const legacyCode = /^DN-[A-Z0-9]{4,12}$/

export const isPairingCode = (value: string): boolean => currentCode.test(value) || legacyCode.test(value)

export const isCurrentPairingCode = (value: unknown): boolean =>
  typeof value === 'string' && currentCode.test(value)

export function normalizePairingCode(raw?: string | null): string {
  const value = raw?.toUpperCase().replace(/\s+/g, '') ?? ''
  if (isPairingCode(value)) return value
  if (!/^[A-Z0-9]{4,14}$/.test(value)) return ''
  const legacy = value.startsWith('DN') ? `DN-${value.slice(2)}` : `DN-${value}`
  return legacyCode.test(legacy) ? legacy : ''
}
