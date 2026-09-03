import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { isAdmin } from '@/lib/admin-auth'
import { accessTokenFromRefreshToken, hashToken, renameDriveFile } from '@/lib/google-drive'
import { supabase } from '@/lib/supabase'

function bytes(value: unknown) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null }
function cleanText(value: string, max: number) { const trimmed = value.trim(); return trimmed && trimmed.length <= max && !/[\u0000-\u001f\u007f]/.test(trimmed) ? trimmed : null }

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { projectId } = await params
  if (!projectId) return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 })
  const projects = await supabase<Array<{ id: string; name: string; client_name: string; client_email: string | null; drive_account_id: string; drive_folder_id: string; storage_limit_bytes: number | null; expires_at: string; disabled_at: string | null; created_at: string }>>(`projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,client_name,client_email,drive_account_id,drive_folder_id,storage_limit_bytes,expires_at,disabled_at,created_at&limit=1`)
  const project = projects[0]
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const [accounts, completeRows, pendingRows, activity] = await Promise.all([
    supabase<Array<{ id: string; label: string; google_email: string; root_folder_id: string | null }>>(`drive_accounts?id=eq.${encodeURIComponent(project.drive_account_id)}&select=id,label,google_email,root_folder_id&limit=1`),
    supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.complete&select=size_bytes`),
    supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.uploading&select=size_bytes`),
    supabase<Array<{ id: string; event_type: string; file_name: string | null; metadata: unknown; created_at: string }>>(`audit_events?project_id=eq.${project.id}&select=id,event_type,file_name,metadata,created_at&order=created_at.desc&limit=100`),
  ])
  const usedBytes = completeRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)
  const pendingBytes = pendingRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)
  const limitBytes = project.storage_limit_bytes
  return NextResponse.json({ project, account: accounts[0] || null, storage: { usedBytes, pendingBytes, limitBytes, availableBytes: limitBytes == null ? null : Math.max(0, Number(limitBytes) - usedBytes - pendingBytes) }, clientAccess: { path: '/u/••••••••••••••••', tokenStoredAsHash: true, active: !project.disabled_at && new Date(project.expires_at).getTime() > Date.now() }, activity })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { projectId } = await params
  if (!projectId) return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 })
  const existing = await supabase<Array<{ id: string; name: string; client_name: string; client_email: string | null; storage_limit_bytes: number | null; expires_at: string; disabled_at: string | null; drive_account_id: string; drive_folder_id: string }>>(`projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,client_name,client_email,storage_limit_bytes,expires_at,disabled_at,drive_account_id,drive_folder_id&limit=1`)
  const project = existing[0]
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  const body = await request.json().catch(() => null) as { name?: string; clientName?: string; clientEmail?: string | null; expiresAt?: string; storageLimitBytes?: number | null; disabled?: boolean; regenerateToken?: boolean } | null
  const patch: Record<string, unknown> = {}
  const audit: Array<{ event_type: string; metadata?: Record<string, unknown> }> = []

  let nextName = project.name
  if (body?.name !== undefined) { const name = cleanText(body.name, 160); if (!name) return NextResponse.json({ error: 'Invalid project name.' }, { status: 400 }); nextName = name; patch.name = name }
  if (body?.clientName !== undefined) { const clientName = cleanText(body.clientName, 160); if (!clientName) return NextResponse.json({ error: 'Invalid client name.' }, { status: 400 }); patch.client_name = clientName }
  if (body?.clientEmail !== undefined) { const email = body.clientEmail?.trim() || null; if (email && (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return NextResponse.json({ error: 'Invalid client email.' }, { status: 400 }); patch.client_email = email }

  let nextExpiresAt = project.expires_at
  if (body?.expiresAt !== undefined) { const expires = new Date(body.expiresAt); if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) return NextResponse.json({ error: 'A future expiry date is required.' }, { status: 400 }); nextExpiresAt = expires.toISOString(); patch.expires_at = nextExpiresAt }
  if (body?.storageLimitBytes !== undefined) {
    const limit = body.storageLimitBytes == null ? null : bytes(body.storageLimitBytes)
    if (body.storageLimitBytes != null && !limit) return NextResponse.json({ error: 'Invalid storage limit.' }, { status: 400 })
    if (limit) { const rows = await supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.complete&select=size_bytes`); const used = rows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0); if (limit < used) return NextResponse.json({ error: 'Storage limit cannot be lower than current usage.' }, { status: 409 }) }
    patch.storage_limit_bytes = limit
  }
  if (body?.disabled !== undefined) { if (!body.disabled && new Date(nextExpiresAt).getTime() <= Date.now()) return NextResponse.json({ error: 'Extend the project expiry before enabling this project.' }, { status: 409 }); patch.disabled_at = body.disabled ? new Date().toISOString() : null; audit.push({ event_type: body.disabled ? 'project.disabled' : 'project.enabled' }) }

  let token: string | null = null
  if (body?.regenerateToken) { token = crypto.randomBytes(32).toString('base64url'); patch.access_token_hash = hashToken(token); audit.push({ event_type: 'project.token_regenerated' }) }

  if (nextName !== project.name) {
    const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${encodeURIComponent(project.drive_account_id)}&select=refresh_token&limit=1`)
    if (!accounts[0]) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
    await renameDriveFile((await accessTokenFromRefreshToken(accounts[0].refresh_token)).access_token, project.drive_folder_id, nextName)
    audit.push({ event_type: 'project.renamed', metadata: { name: nextName } })
  }

  if (Object.keys(patch).length) await supabase(`projects?id=eq.${encodeURIComponent(projectId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) })
  if (body?.expiresAt !== undefined || body?.storageLimitBytes !== undefined || body?.clientName !== undefined || body?.clientEmail !== undefined) audit.push({ event_type: 'project.updated', metadata: { fields: Object.keys(patch).filter(field => field !== 'access_token_hash' && field !== 'disabled_at') } })
  for (const event of audit) await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: projectId, event_type: event.event_type, metadata: event.metadata || null }) })
  return NextResponse.json({ ok: true, token, url: token ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/u/${token}` : null })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { projectId } = await params
  const projects = await supabase<Array<{ id: string }>>(`projects?id=eq.${encodeURIComponent(projectId)}&select=id&limit=1`)
  if (!projects[0]) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })
  await supabase(`projects?id=eq.${encodeURIComponent(projectId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ disabled_at: new Date().toISOString() }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: projectId, event_type: 'project.archived' }) })
  return NextResponse.json({ ok: true })
}
