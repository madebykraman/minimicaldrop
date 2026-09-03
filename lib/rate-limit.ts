import 'server-only'
import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

const WINDOW_MS = 60_000
const buckets = new Map<string, { started: number; count: number }>()

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'unknown'
}

function digest(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32)
}

export function rateLimit(request: Request, scope: string, limit: number, token?: string) {
  const key = `${scope}:${digest(clientIp(request))}${token ? `:${digest(token)}` : ''}`
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || now - current.started >= WINDOW_MS) {
    buckets.set(key, { started: now, count: 1 })
    if (buckets.size > 5000) {
      for (const [entryKey, entry] of buckets) {
        if (now - entry.started >= WINDOW_MS) buckets.delete(entryKey)
      }
    }
    return null
  }

  current.count += 1
  if (current.count <= limit) return null

  const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - current.started)) / 1000))
  return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, {
    status: 429,
    headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' },
  })
}
