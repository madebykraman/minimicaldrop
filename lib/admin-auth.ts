import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE = 'minimical_drop_admin'
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
  const [email, expires, signature] = raw.split('.')
  if (!email || !expires || !signature || Number(expires) < Date.now()) return false
  const expected = sign(`${email}.${expires}`)
  if (signature.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) && email === (process.env.ADMIN_EMAIL || '')
}

export function validAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || !password) return false
  const a = Buffer.from(password)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function setAdminCookie() {
  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL is not configured')
  const expires = String(Date.now() + TTL_SECONDS * 1000)
  const value = `${email}.${expires}`
  ;(await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: TTL_SECONDS,
    path: '/',
  })
}

export async function clearAdminCookie() {
  ;(await cookies()).delete(COOKIE)
}
