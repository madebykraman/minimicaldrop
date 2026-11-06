import { NextRequest, NextResponse } from 'next/server'
import { googleAuthUrl } from '@/lib/google-drive'
import { isAdmin } from '@/lib/admin-auth'
import { ADMIN_SESSION_COOKIE, createGoogleOAuthState } from '@/lib/google-oauth-state'

export async function GET(request: NextRequest) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!redirectUri) return NextResponse.json({ error: 'GOOGLE_REDIRECT_URI is not configured' }, { status: 500 })

  let callbackUrl: URL
  try {
    callbackUrl = new URL(redirectUri)
    if (callbackUrl.protocol !== 'https:' || callbackUrl.pathname !== '/api/google/callback') throw new Error('Invalid callback URL')
  } catch {
    return NextResponse.json({ error: 'Google callback URL is not configured correctly' }, { status: 500 })
  }

  // The admin cookie is host-only. Always begin OAuth on the host Google will return to.
  if (request.nextUrl.origin !== callbackUrl.origin) {
    return NextResponse.redirect(new URL('/api/google/connect', callbackUrl.origin))
  }

  if (!(await isAdmin())) return NextResponse.redirect(new URL('/admin', callbackUrl.origin))
  const secret = process.env.SESSION_SECRET
  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  if (!secret || !adminSession) return NextResponse.json({ error: 'Admin session is not configured' }, { status: 500 })

  const state = createGoogleOAuthState(adminSession, secret)
  return NextResponse.redirect(googleAuthUrl(state))
}
