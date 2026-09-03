import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { exchangeGoogleCode, getGoogleAccountEmail } from '@/lib/google-drive'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state') || ''
  const stored = request.cookies.get('google_oauth_state')?.value
  const secret = process.env.SESSION_SECRET
  if (!code || !stored || !secret) return NextResponse.json({ error: 'Invalid OAuth callback' }, { status: 400 })

  const [value, signature] = state.split('.')
  const expected = crypto.createHmac('sha256', secret).update(value || '').digest('hex')
  const validSignature = Boolean(signature) && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))
  if (value !== stored || !validSignature) return NextResponse.json({ error: 'OAuth state validation failed' }, { status: 400 })

  const tokens = await exchangeGoogleCode(code)
  if (!tokens.refresh_token) return NextResponse.json({ error: 'Google did not return a refresh token. Reconnect with consent.' }, { status: 400 })

  const email = await getGoogleAccountEmail(tokens.access_token)
  await supabase('drive_accounts', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ label: email, google_email: email, refresh_token: tokens.refresh_token }) })

  const response = NextResponse.redirect(new URL('/admin?drive=connected', request.url))
  response.cookies.delete('google_oauth_state')
  return response
}
