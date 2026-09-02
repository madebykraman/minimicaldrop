import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { googleAuthUrl } from '@/lib/google-drive'

export async function GET(request: Request) {
  const secret = process.env.SESSION_SECRET
  if (!secret) return NextResponse.json({ error: 'SESSION_SECRET is not configured' }, { status: 500 })
  const state = crypto.randomBytes(32).toString('hex')
  const signature = crypto.createHmac('sha256', secret).update(state).digest('hex')
  const response = NextResponse.redirect(googleAuthUrl(`${state}.${signature}`))
  response.cookies.set('google_oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
  return response
}
