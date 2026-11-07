import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { Agent, fetch as undiciFetch } from 'undici'

const blockedAddresses = new BlockList()
const globalIpv6Addresses = new BlockList()
globalIpv6Addresses.addSubnet('2000::', 3, 'ipv6')

for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4]
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv4')
}

for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8]
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv6')
}

interface SafeFetchOptions {
  headers?: HeadersInit
  timeoutMs?: number
  maxBytes?: number
}

interface SafeFetchResponse {
  status: number
  ok: boolean
  headers: Headers
  text: () => Promise<string>
}

const isBlockedAddress = (address: string, family: number) => {
  if (family === 4) return blockedAddresses.check(address, 'ipv4')
  if (family !== 6) return true
  return !globalIpv6Addresses.check(address, 'ipv6') || blockedAddresses.check(address, 'ipv6')
}

const resolvePublicAddress = async (hostname: string) => {
  const normalizedHost = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!normalizedHost || normalizedHost.includes('%')) {
    throw new Error('Nieprawidłowy host docelowy.')
  }

  const literalFamily = isIP(normalizedHost)
  const addresses = literalFamily
    ? [{ address: normalizedHost, family: literalFamily }]
    : await lookup(normalizedHost, { all: true, verbatim: true })

  if (addresses.length === 0 || addresses.some(entry => isBlockedAddress(entry.address, entry.family))) {
    throw new Error('Adres URL wskazuje na niedozwolony lub nieroutowalny adres IP.')
  }

  return { normalizedHost, address: addresses[0] }
}

export async function fetchPublicUrl(urlInput: string | URL, options: SafeFetchOptions = {}): Promise<SafeFetchResponse> {
  const url = new URL(urlInput)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Dozwolone są wyłącznie publiczne adresy HTTP/HTTPS bez danych logowania.')
  }

  const { normalizedHost, address } = await resolvePublicAddress(url.hostname)
  const maxBytes = Math.max(1, options.maxBytes || 1_500_000)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, options.timeoutMs || 8000))
  const dispatcher = new Agent({
    connect: {
      lookup: (requestedHost: string, lookupOptions: any, callback: (...args: any[]) => void) => {
        if (requestedHost.toLowerCase() !== normalizedHost) {
          callback(new Error('Host połączenia różni się od zweryfikowanego hosta.'))
          return
        }

        if (lookupOptions?.all) {
          callback(null, [address])
        } else {
          callback(null, address.address, address.family)
        }
      }
    }
  } as any)

  try {
    const response = await undiciFetch(url, {
      method: 'GET',
      headers: options.headers,
      signal: controller.signal,
      redirect: 'manual',
      dispatcher
    } as any)

    const contentLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      await response.body?.cancel()
      throw new Error('Odpowiedź strony przekracza dozwolony rozmiar.')
    }

    const reader = response.body?.getReader()
    const chunks: Uint8Array[] = []
    let byteLength = 0

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        byteLength += value.byteLength
        if (byteLength > maxBytes) {
          await reader.cancel()
          throw new Error('Odpowiedź strony przekracza dozwolony rozmiar.')
        }
        chunks.push(value)
      }
    }

    const body = new Uint8Array(byteLength)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    const text = new TextDecoder().decode(body)

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      text: async () => text
    }
  } finally {
    clearTimeout(timeout)
    await dispatcher.close().catch(() => {})
  }
}