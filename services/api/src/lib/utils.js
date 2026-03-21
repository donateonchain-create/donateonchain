import { timingSafeEqual } from 'crypto'

export function normalizeAddress(address) {
  return String(address).toLowerCase()
}

export function timingSafeEqualString(input, expected) {
  if (!input || !expected) return false
  const inputBuf = Buffer.from(String(input))
  const expectedBuf = Buffer.from(String(expected))
  if (inputBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(inputBuf, expectedBuf)
}
