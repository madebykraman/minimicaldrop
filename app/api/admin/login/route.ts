import { NextResponse } from 'next/server'
import { setAdminCookie, validAdminPassword } from '@/lib/admin-auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const limited = rateLimit(request, 'admin-login', 8)
  if (limited) return limited
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null
  if (!body?.email || body.email !== process.env.ADMIN_EMAIL || !validAdminPassword(body.password || '')) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }
  await setAdminCookie()
  return NextResponse.json({ ok: true })
}
