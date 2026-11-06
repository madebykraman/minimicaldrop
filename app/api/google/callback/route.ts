import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { ADMIN_SESSION_COOKIE, verifyGoogleOAuthState } from '@/lib/google-oauth-state'
import { exchangeGoogleCode, getGoogleAccountEmail } from '@/lib/google-drive'
import { supabase } from '@/lib/supabase'

async function consolidateDriveAccounts(email: string, refreshToken: string) {
  const accounts = await supabase<Array<{ id: string; created_at: string }>>(`drive_accounts?select=id,created_at&google_email=eq.${encodeURIComponent(email)}&order=created_at.desc`)
  const canonical = accounts[0]
  if (!canonical) {
    await supabase('drive_accounts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ label: email, google_email: email, refresh_token: refreshToken }),
    })
    return
  }

  await supabase(`drive_accounts?id=eq.${encodeURIComponent(canonical.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ label: email, google_email: email, refresh_token: refreshToken }),
  })

  for (const duplicate of accounts.slice(1)) {
    await supabase(`projects?drive_account_id=eq.${encodeURIComponent(duplicate.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ drive_account_id: canonical.id }),
    })
    await supabase(`drive_accounts?id=eq.${encodeURIComponent(duplicate.id)}`, { method: 'DELETE' })
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state') || ''
  const secret = process.env.SESSION_SECRET
  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || ''

  if (!code || !secret || !adminSession || !(await isAdmin())) {
    return NextResponse.json({ error: 'Google connection session expired. Sign in on the custom domain and try Connect Drive again.' }, { status: 400 })
  }
  if (!verifyGoogleOAuthState(state, adminSession, secret)) {
    return NextResponse.json({ error: 'Google connection state expired or invalid. Start a new connection from the admin dashboard.' }, { status: 400 })
  }

  const tokens = await exchangeGoogleCode(code)
  if (!tokens.refresh_token) return NextResponse.json({ error: 'Google did not return a refresh token. Reconnect with consent.' }, { status: 400 })

  const email = await getGoogleAccountEmail(tokens.access_token)
  await consolidateDriveAccounts(email, tokens.refresh_token)

  const response = NextResponse.redirect(new URL('/admin?drive=connected', request.url))
  return response
}
