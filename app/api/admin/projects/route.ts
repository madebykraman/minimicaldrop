import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { isAdmin } from '@/lib/admin-auth'
import { accessTokenFromRefreshToken, createDriveFolder, getGoogleAccountEmail, hashToken } from '@/lib/google-drive'
import { supabase } from '@/lib/supabase'

function bytes(value: unknown) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null }
function text(value: unknown, max: number) { if (typeof value !== 'string') return null; const v = value.trim(); return v && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v) ? v : null }

async function consolidateAccounts(accounts: Array<{ id: string; label: string; google_email: string; refresh_token: string; root_folder_id: string | null; created_at: string }>) {
  const repaired = await Promise.all(accounts.map(async account => {
    if (account.google_email && account.google_email !== 'unknown') return account
    try {
      const access = await accessTokenFromRefreshToken(account.refresh_token); const email = await getGoogleAccountEmail(access.access_token)
      await supabase(`drive_accounts?id=eq.${encodeURIComponent(account.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ label: email, google_email: email }) })
      return { ...account, label: email, google_email: email }
    } catch { return account }
  }))
  const grouped = new Map<string, typeof repaired>()
  for (const account of repaired) { if (!account.google_email || account.google_email === 'unknown') continue; const key = account.google_email.trim().toLowerCase(); grouped.set(key, [...(grouped.get(key) || []), account]) }
  const duplicateIds = new Set<string>()
  for (const group of grouped.values()) {
    group.sort((a, b) => b.created_at.localeCompare(a.created_at)); const canonical = group[0]
    for (const duplicate of group.slice(1)) {
      duplicateIds.add(duplicate.id)
      await supabase(`projects?drive_account_id=eq.${encodeURIComponent(duplicate.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ drive_account_id: canonical.id }) })
      await supabase(`drive_accounts?id=eq.${encodeURIComponent(duplicate.id)}`, { method: 'DELETE' })
    }
  }
  return repaired.filter(account => !duplicateIds.has(account.id))
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const projects = await supabase<Array<{ id: string; name: string; client_name: string; client_email: string | null; drive_account_id: string; drive_folder_id: string; storage_limit_bytes: number | null; expires_at: string; disabled_at: string | null; delivery_status: string; client_message: string | null; created_at: string }>>('projects?select=id,name,client_name,client_email,drive_account_id,drive_folder_id,storage_limit_bytes,expires_at,disabled_at,delivery_status,client_message,created_at&order=created_at.desc')
  const accounts = await supabase<Array<{ id: string; label: string; google_email: string; refresh_token: string; root_folder_id: string | null; created_at: string }>>('drive_accounts?select=id,label,google_email,refresh_token,root_folder_id,created_at&order=created_at.desc')
  const reconciledAccounts = await consolidateAccounts(accounts)
  const safeAccounts = reconciledAccounts.map(({ refresh_token: _refreshToken, created_at: _createdAt, ...account }) => account)
  return NextResponse.json({ projects, accounts: safeAccounts })
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const body = await request.json().catch(() => null) as { name?: string; clientName?: string; clientEmail?: string; expiresAt?: string; storageLimitBytes?: number; driveAccountId?: string } | null
  const name = text(body?.name, 160); const clientName = text(body?.clientName, 160)
  if (!name || !clientName) return NextResponse.json({ error: 'Project name and client name are required.' }, { status: 400 })
  const clientEmail = body?.clientEmail?.trim() || null
  if (clientEmail && (clientEmail.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail))) return NextResponse.json({ error: 'Invalid client email.' }, { status: 400 })
  const expires = body?.expiresAt ? new Date(body.expiresAt) : null
  if (!expires || Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) return NextResponse.json({ error: 'A future expiry date is required.' }, { status: 400 })
  const limit = body?.storageLimitBytes == null ? null : bytes(body.storageLimitBytes)
  if (body?.storageLimitBytes != null && !limit) return NextResponse.json({ error: 'Invalid storage limit.' }, { status: 400 })

  const accounts = await supabase<Array<{ id: string; refresh_token: string; root_folder_id: string | null }>>(`drive_accounts?select=id,refresh_token,root_folder_id${body?.driveAccountId ? `&id=eq.${encodeURIComponent(body.driveAccountId)}` : ''}&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Connect a Google Drive account first.' }, { status: 400 })
  const root = account.root_folder_id || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root'
  const token = crypto.randomBytes(32).toString('base64url')
  const access = await accessTokenFromRefreshToken(account.refresh_token)
  const folder = await createDriveFolder(access.access_token, name, root)
  const rows = await supabase<Array<{ id: string }>>('projects', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name, client_name: clientName, client_email: clientEmail, access_token_hash: hashToken(token), drive_account_id: account.id, drive_folder_id: folder.id, storage_limit_bytes: limit, expires_at: expires.toISOString(), delivery_status: 'in_progress' }) })
  const projectId = rows[0]?.id
  if (!projectId) return NextResponse.json({ error: 'Project could not be created.' }, { status: 500 })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: projectId, event_type: 'project.created', metadata: { clientName } }) })
  return NextResponse.json({ id: projectId, token, url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/u/${token}` }, { status: 201 })
}
