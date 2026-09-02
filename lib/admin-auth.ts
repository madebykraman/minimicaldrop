import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE = 'minimical_drop_admin_v2'
const TTL_SECONDS = 60 * 60 * 12

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value) throw new Error('SESSION_SECRET is not configured')
  return value
}

function sign(value: string) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex')
}

export async function isAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value || ''
  const [expires, signature] = raw.split('.')
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false
  const expected = sign(expires)
  if (signature.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function validAdminPassword(password: string) {
  if (!password) return false
  const plain = process.env.ADMIN_PASSWORD
  if (plain) {
    const a = Buffer.from(password); const b = Buffer.from(plain)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  }
  const hash = process.env.ADMIN_PASSWORD_HASH || ''
  if (!/^[a-f0-9]{64}$/i.test(hash)) return false
  const actual = crypto.createHash('sha256').update(password).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(hash))
}

export async function setAdminCookie() {
  if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL is not configured')
  const expires = String(Date.now() + TTL_SECONDS * 1000)
  ;(await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: TTL_SECONDS, path: '/' })
}

export async function clearAdminCookie() {
  ;(await cookies()).delete(COOKIE)
  ;(await cookies()).delete('minimical_drop_admin')
}
