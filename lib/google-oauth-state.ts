import 'server-only'
import crypto from 'node:crypto'

export const ADMIN_SESSION_COOKIE = 'minimical_drop_admin_v2'

const OAUTH_WINDOW_SECONDS = 10 * 60
const CLOCK_SKEW_SECONDS = 60

function signState(payload: string, adminSession: string, secret: string) {
  const sessionHash = crypto.createHash('sha256').update(adminSession).digest('hex')
  return crypto.createHmac('sha256', secret).update(`google-drive-oauth:${payload}:${sessionHash}`).digest('hex')
}

export function createGoogleOAuthState(adminSession: string, secret: string) {
  const nonce = crypto.randomBytes(24).toString('hex')
  const issuedAt = String(Math.floor(Date.now() / 1000))
  const payload = `${nonce}.${issuedAt}`
  return `${payload}.${signState(payload, adminSession, secret)}`
}

export function verifyGoogleOAuthState(state: string, adminSession: string, secret: string) {
  if (!adminSession || !secret) return false
  const parts = state.split('.')
  if (parts.length !== 3) return false

  const [nonce, issuedAt, signature] = parts
  if (!/^[a-f0-9]{48}$/.test(nonce) || !/^\d{10}$/.test(issuedAt) || !/^[a-f0-9]{64}$/.test(signature)) return false

  const now = Math.floor(Date.now() / 1000)
  const issued = Number(issuedAt)
  if (issued > now + CLOCK_SKEW_SECONDS || now - issued > OAUTH_WINDOW_SECONDS) return false

  const expected = signState(`${nonce}.${issuedAt}`, adminSession, secret)
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}
